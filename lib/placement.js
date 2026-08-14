/* ══════════════════════════════════════════════════════════════════════
   Which board someone belongs on, and which column.

   THE PROBLEM THIS SOLVES
   -----------------------
   The pipelines were filled once by a script and nothing maintained them.
   Someone who bought got the right tags and no card. Someone who
   cancelled kept their card in TSM Members. Within weeks the boards look
   authoritative and are wrong, which is worse than not having them.

   TWO RULES, AND BOTH MATTER
   --------------------------
   1. PLACEMENT IS DERIVED, NEVER STORED. Recomputed from the person's
      state every run, exactly like the tags. Store the fact, recompute
      the conclusion. This is what made the churn bands self-correcting.

   2. THE SYNC NEVER TOUCHES A STAGE A HUMAN OWNS. Some columns are set
      by a person: a setter dragging someone to "Call held" knows
      something no API does. Each board declares which stages the machine
      may move between, and everything else is untouchable. Without this
      you spend your week fighting your own team.

   Server-only. CommonJS: no package.json in this repo.
═══════════════════════════════════════════════════════════════════════ */

const has = (tags, t) => tags.includes(t)

/**
 * Board definitions.
 *
 *   belongs   does this person get a card here at all
 *   stage     which column, from their state. null means "leave it"
 *   machine   stages the sync may create, move between and remove from.
 *             Anything not listed is human-owned and never touched.
 */
const BOARDS = [
  {
    name: 'TSM Members',
    belongs: (p, tags) => has(tags, 'customer-active'),
    machine: ['1 Month', '3 Months', '6 Months', 'Coaching', 'Fanbasis legacy', 'Cancelled, access still active'],
    stage: (p, tags) => {
      /* Cancelled but still inside the paid period. Checked first: they
         are still a member, and the message to them is "resume" rather
         than anything about their plan. */
      if (has(tags, 'cancelling')) return 'Cancelled, access still active'
      if (has(tags, 'plan-3-month')) return '3 Months'
      if (has(tags, 'plan-6-month')) return '6 Months'
      if (has(tags, 'plan-coaching')) return 'Coaching'
      if (has(tags, 'plan-fanbasis-legacy')) return 'Fanbasis legacy'
      return '1 Month'
    },
  },
  {
    name: 'TSM Win-back',
    /* Nightfall clients are deliberately excluded. Someone who paid for
       the coaching ladder is not TSM churn, and pitching them $39 to come
       back would be the wrong conversation entirely. */
    belongs: (p, tags) => has(tags, 'customer-churned') && !has(tags, 'has-nightfall-legacy'),
    machine: ['Just cancelled (0-30d)', '31-90 days', '91-180 days', '181-365 days', '1-2 years'],
    /* "Won back" is human-owned. Anyone who actually resubscribes stops
       being customer-churned and leaves this board on their own. */
    stage: (p, tags) => {
      if (has(tags, 'churn-0-30d')) return 'Just cancelled (0-30d)'
      if (has(tags, 'churn-31-90d')) return '31-90 days'
      if (has(tags, 'churn-91-180d')) return '91-180 days'
      if (has(tags, 'churn-181-365d')) return '181-365 days'
      if (has(tags, 'churn-1-2y')) return '1-2 years'
      return null
    },
  },
  {
    name: 'Nightfall',
    belongs: (p, tags) => has(tags, 'has-nightfall-97') || has(tags, 'has-nightfall-legacy') ||
                          has(tags, 'nightfall-applied') || has(tags, 'nightfall-budget-2500-plus'),
    machine: ['Owns $97 lifetime', 'Legacy buyer ($927-$9,997)', 'Applied, budget $2.5k+', 'Applied'],
    /* Furthest step reached wins, so nobody slides backwards down the
       ladder because a tag was added out of order. */
    stage: (p, tags) => {
      if (has(tags, 'has-nightfall-97')) return 'Owns $97 lifetime'
      if (has(tags, 'has-nightfall-legacy')) return 'Legacy buyer ($927-$9,997)'
      if (has(tags, 'nightfall-budget-2500-plus')) return 'Applied, budget $2.5k+'
      if (has(tags, 'nightfall-applied')) return 'Applied'
      return null
    },
  },
  {
    name: 'Baby AI',
    belongs: (p, tags) => has(tags, 'has-baby-ai'),
    machine: ['Active', 'Cancelled'],
    stage: (p, tags) => (has(tags, 'customer-active') ? 'Active' : 'Cancelled'),
  },
]

/**
 * Every board and stage this person should be on.
 * @returns {Array<{board:string, stage:string}>}
 */
function desiredPlacement(person, tags) {
  const t = tags || []
  const out = []
  for (const b of BOARDS) {
    if (!b.belongs(person, t)) continue
    const stage = b.stage(person, t)
    if (stage) out.push({ board: b.name, stage })
  }
  return out
}

const boardByName = name => BOARDS.find(b => b.name === name)

/**
 * Work out the card changes for one contact.
 *
 * @param want   from desiredPlacement()
 * @param cards  their existing opportunities: [{id, pipelineId, pipelineStageId}]
 * @param meta   { pipelinesByName, stageNameById }
 * @returns { create:[], move:[], remove:[] }
 */
function planCards(want, cards, meta) {
  const { pipelinesByName, stageNameById } = meta
  const create = [], move = [], remove = []
  const wantByBoard = new Map(want.map(w => [w.board, w.stage]))

  for (const c of cards) {
    const pl = [...pipelinesByName.values()].find(p => p.id === c.pipelineId)
    if (!pl) continue
    const def = boardByName(pl.name)
    if (!def) continue                       // a board we do not manage, e.g. IMPACT
    const currentStage = stageNameById.get(c.pipelineStageId)

    /* A human put them here. Leave the card exactly where it is, and
       treat this board as already satisfied so we do not helpfully add a
       SECOND card next to the one they placed. */
    if (currentStage && !def.machine.includes(currentStage)) {
      wantByBoard.delete(pl.name)
      continue
    }

    const target = wantByBoard.get(pl.name)
    if (!target) { remove.push({ id: c.id, board: pl.name, from: currentStage }); continue }
    if (target !== currentStage) {
      const sid = (pl.stages || []).find(s => s.name === target)?.id
      if (sid) move.push({ id: c.id, board: pl.name, pipelineId: pl.id, stageId: sid, from: currentStage, to: target })
    }
    wantByBoard.delete(pl.name)              // satisfied
  }

  for (const [board, stage] of wantByBoard) {
    const pl = pipelinesByName.get(board)
    if (!pl) continue
    const sid = (pl.stages || []).find(s => s.name === stage)?.id
    if (sid) create.push({ board, pipelineId: pl.id, stageId: sid, stage })
  }

  return { create, move, remove }
}

module.exports = { BOARDS, desiredPlacement, planCards, boardByName }
