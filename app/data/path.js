/* ══════════════════════════════════════════════════════════════════════
   THE SELF-MASTERY SYSTEM — THE FIRST SEVEN

   Seven day-long SOPs and every prompt in them. Single source of truth:
   no page hardcodes prompt text, so changing a prompt is one edit here.

   ── WHAT THIS IS OPTIMISED FOR ──────────────────────────────────────
   Base44 measures day-zero and week-one activation: prompts sent on the
   day somebody joins, and again across their first week. So:

     Day 1 ....... 6 prompts   (one sitting, ends in a published app)
     Days 2-7 .... 23 prompts  (a real SOP each, not a single message)
     Every day ... a check-in, which is itself a message to Base44
                   because the app is READ ONLY

   Twenty-nine prompts across seven days. An earlier version ran one
   prompt a day after day one and it was not a build, it was a reminder.

   ── SHAPE OF A DAY ──────────────────────────────────────────────────
   Every day is modules, numbered N.1, N.2, N.3 like a workshop. Each
   module carries: why it exists, ordered steps, one prompt assembled
   from the member's own answers, and a checkpoint list of what they
   should be able to see before moving on. Nobody is ever asked to
   invent prompt text.

   ── THE READ-ONLY RULE IS LOAD-BEARING ──────────────────────────────
   Every prompt forbids forms, input fields and edit buttons. The moment
   a member can tap a number in silently they stop talking to the
   builder, week-one activation goes to zero, and the subscription is
   the first thing cancelled. Do not relax it.
══════════════════════════════════════════════════════════════════════ */

window.PATH = (function () {

  /* Shared tails, so Base44 never invents accounts or a settings page. */
  var STYLE =
    'STYLE\nDark theme, near black background, high contrast, generous spacing, minimal. ' +
    'Big numbers, small quiet labels. It must read on a phone in about five seconds, ' +
    'and hold up on a laptop.\n\n';

  var NEVER =
    'WHAT NOT TO ADD\n' +
    '- No forms and no input fields anywhere. No add, edit or delete buttons. ' +
    'Every piece of data enters by me telling you in this chat.\n' +
    '- No accounts, sign ups, profiles or sharing. Just me.\n' +
    '- No notifications, badges, points, levels or confetti.\n' +
    '- No motivational messages and no advice. It keeps the record, I do the judging.\n' +
    '- No extra pages, settings screens or features beyond this spec.\n\n' +
    'Build it.';

  var KEEP = 'Change nothing else about the app and keep the existing design exactly as it is.\n\n';

  var DAYS = [

  /* ══ DAY 1 ═══════════════════════════════════════════════════════ */
  {
    n: 1, eyebrow: 'Day One', title: 'The Standard', theme: 'Foundations',
    accent: '#E8825C', mark: 'grid', minutes: 45, minMinutes: 15, submit: true,
    builds: '1 published app, 5 rooms, your real numbers',
    summary: 'Build the dashboard that runs the five areas you actually control.',
    why: 'Not a demo and not a template. One private app with a room for your body, your mind, your appearance, your character and your money. By the end of today it is published, it has your real numbers in it, and everything else this week hangs off it.',
    parts: [
      {
        id: '1.1', title: 'Set up and spec the app', mins: 12,
        blurb: 'One long message that describes the whole thing, so Base44 has almost nothing left to ask and every member’s app comes out the same shape.',
        steps: [
          { b: 'Go to base44.com and sign in', s: 'Use the same email you joined with.' },
          { b: 'Start a new app and find the Plan / Build toggle', s: 'It sits next to the send button. You will use both.' },
          { b: 'Switch to Plan mode, then send the message below', s: 'It is long on purpose. Send it whole.' },
          { b: 'Read the plan, then hit Start Building', s: 'Check it says read only and no notifications. If no plan appears, hit Skip Plan and carry on.' },
        ],
        check: ['I am signed in to Base44', 'I sent the spec in Plan mode', 'The build finished without errors'],
        message: {
          mode: 'PLAN', label: 'The spec',
          note: 'Switch to Plan mode before sending this one. If no plan comes back, hit Skip Plan and continue.',
          text:
'I am building my Self-Mastery System. A private dashboard that runs the areas of my life I actually control. This message is the full spec. Plan it with me before you build anything, and treat every decision below as final so you only ask me about real gaps.\n\n' +
'WHAT IT IS\nOne private app. Single user, just me. A home dashboard plus five rooms: Body, Mind, Appearance, Character, Wealth.\n\n' +
'WHAT IT STORES\n' +
'- DailyLog: date, which of my daily promises I kept, one line about the day\n' +
'- Standard: the area, what I am holding myself to in one line, the number or target attached\n' +
'- Record: the area, the date, the thing measured, the value\n' +
'- WhyItem: who or what this is for, one line about them\n\n' +
'LAYOUT\n' +
'- Home, top to bottom: a 30 day streak grid built from DailyLogs, my current streak as one large number, one freshness badge per room, then a Why panel at the bottom.\n' +
'- A freshness badge shows days since that room last got a record: 0 to 1 green, 2 to 3 amber, 4 or more red.\n' +
'- Each room shows its standards and recent records as a card grid. Big numbers, small labels.\n' +
'- A room with no data yet says: Tell me in chat. Never an empty form.\n\n' +
'THE RULE THAT MATTERS MOST\n' +
'- NO forms and NO input fields anywhere. No add, edit or delete buttons. The app is read only. Every piece of data enters by me telling you in this chat.\n\n' +
'WHAT NOT TO ADD\n' +
'- No accounts, sign ups, profiles or sharing. Just me.\n' +
'- No notifications, no automatic summaries, no insight messages, no advice.\n' +
'- No badges, points, levels or confetti.\n' +
'- No extra pages, settings screens or features beyond this spec.\n\n' +
'If you ask me planning questions, assume whichever answer matches this spec. Ask me only about genuine gaps. Then show me the plan.',
        },
      },
      {
        id: '1.2', title: 'Publish it empty', mins: 4,
        blurb: 'Live and imperfect beats perfect and imaginary. You are publishing a shell and that is exactly the point.',
        steps: [
          { b: 'Hit Publish, top right of the builder', s: 'It takes a few seconds.' },
          { b: 'Open app settings and set visibility to private', s: 'This is about to hold your real numbers.' },
          { b: 'Open it on your phone and add it to your home screen', s: 'If it is three taps away you will not open it.' },
        ],
        check: ['My app is published', 'Visibility is private', 'I can see five rooms saying Tell me in chat'],
        message: {
          mode: 'BUILD', label: 'Tidy the shell',
          note: 'Send this after publishing. Base44 often seeds fake sample numbers; this clears them.',
          text:
'Two small fixes to my Self-Mastery System before I put real data in it.\n\n' +
'1. Delete every sample, demo or placeholder record you created. I want all five rooms genuinely empty, each saying "Tell me in chat" rather than showing invented numbers. A dashboard that lies to me on day one is worse than an empty one.\n\n' +
'2. Make sure the home screen works on a phone: the streak grid, the streak number, the five freshness badges and the Why panel should all be readable without zooming or scrolling sideways.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '1.3', title: 'The Body room', mins: 7,
        blurb: 'Your training, your sleep, and the food rule you actually break. Rough numbers beat no numbers.',
        steps: [{ b: 'Answer the five questions', s: 'Honestly. Nobody sees this app but you.' },
                { b: 'Send the prompt in Build mode', s: 'Open your app in the builder first.' }],
        check: ['The Body room shows my real numbers', 'Its freshness badge is green'],
        message: {
          mode: 'BUILD', label: 'Body',
          questions: [
            { id: 'trained', label: 'Days you actually trained in the last 7', hint: 'Not the plan. The number.', ph: '2' },
            { id: 'target', label: 'Your training target per week', ph: '4' },
            { id: 'counts', label: 'What counts as training for you', ph: 'Gym, or a run over 3km' },
            { id: 'sleep', label: 'Hours of sleep you average right now', ph: '6' },
            { id: 'foodrule', label: 'The food rule you break most', ph: 'Nothing until 3pm, then everything after 10' },
          ],
          text:
'Fill in the Body room of my Self-Mastery System. Same rules as the spec: read only, no forms, chat is the only way data enters.\n\n' +
'MY NUMBERS\n' +
'- Trained {{trained}} of the last 7 days, against a target of {{target}} per week\n' +
'- What counts as training for me: {{counts}}\n' +
'- I average {{sleep}} hours of sleep\n' +
'- The food rule I break most: {{foodrule}}\n\n' +
'SHOW ME\nTraining days this week against my target as the big number. Sleep average underneath. My food rule written plainly where I have to read it. A seven day strip showing which days I trained.\n\n' + STYLE + NEVER,
        },
      },
      {
        id: '1.4', title: 'The Mind room', mins: 7,
        blurb: 'The promise you break most, where your hours actually go, and the block you are claiming back.',
        steps: [{ b: 'Answer the four questions', s: 'The leak question is the one people lie about. Do not.' },
                { b: 'Send it in Build mode', s: 'One message.' }],
        check: ['My focused block has a real time on it', 'My leak is priced in hours per week'],
        message: {
          mode: 'BUILD', label: 'Mind',
          questions: [
            { id: 'broken', label: 'The promise to yourself you break most often', ph: 'Getting up at 6' },
            { id: 'leak', label: 'Your biggest time leak, and roughly how many hours a week it eats', ph: 'Short video, about 20 hours a week' },
            { id: 'block', label: 'When your focused hour will happen, every day', ph: '7pm, phone in the kitchen' },
            { id: 'killing', label: 'The habit you are killing this month', ph: 'Scrolling in bed' },
          ],
          text:
'Fill in the Mind room of my Self-Mastery System. Same rules: read only, no forms, chat only.\n\n' +
'MY ANSWERS\n' +
'- The promise I break most: {{broken}}\n' +
'- My biggest time leak: {{leak}}\n' +
'- My daily focused block: {{block}}\n' +
'- The habit I am killing this month: {{killing}}\n\n' +
'SHOW ME\nMy focused block with its time, large, at the top of the room. The leak priced next to it in hours per week so I can see the trade. The habit I am killing with a count of days since I last did it.\n\n' + STYLE + NEVER,
        },
      },
      {
        id: '1.5', title: 'Appearance and Character', mins: 9,
        blurb: 'Two rooms in one message: the routines you repeat, and the people all of this is actually for.',
        steps: [{ b: 'Answer both sets', s: 'The routines should be things you will do on a bad day.' },
                { b: 'Send it in Build mode', s: 'One message covers both rooms.' }],
        check: ['Both routines are listed', 'The people this is for are named'],
        message: {
          mode: 'BUILD', label: 'Appearance + Character',
          questions: [
            { id: 'morning', label: 'Your morning routine, one step per line', area: true, ph: 'Wash face\nMoisturise\nSPF\nBrush and floss' },
            { id: 'evening', label: 'Your evening routine, one step per line', area: true, ph: 'Wash face\nMoisturise\nLay out tomorrow’s clothes' },
            { id: 'overdue', label: 'The appearance job most overdue right now', ph: 'Haircut, about 5 weeks' },
            { id: 'who', label: 'Who this is actually for', hint: 'Mum, your brother, your kids someday, you at 40.', ph: 'My mum and my younger brother' },
            { id: 'changes', label: 'What changes for them when this works', ph: 'She stops doing night shifts' },
          ],
          text:
'Fill in two rooms of my Self-Mastery System: Appearance and Character. Same rules: read only, no forms, chat only.\n\n' +
'APPEARANCE — MY MORNING ROUTINE\n{{morning}}\n\n' +
'APPEARANCE — MY EVENING ROUTINE\n{{evening}}\n\n' +
'APPEARANCE — OVERDUE\n{{overdue}}\n\n' +
'CHARACTER\n- Who this is for: {{who}}\n- What changes for them when it works: {{changes}}\n\n' +
'SHOW ME\nIn Appearance: both routines as lists with a count of steps completed today, a 30 day grid lit on days I completed both, and the overdue job in red at the top until I say it is done.\n' +
'In Character: a count of deeds recorded this month as the big number, a 30 day grid, and the names of the people this is for underneath. Never publish any of this anywhere.\n\n' + STYLE + NEVER,
        },
      },
      {
        id: '1.6', title: 'The Wealth room', mins: 6,
        blurb: 'Your number, what it unlocks, and the one direction you are committing to.',
        steps: [{ b: 'Answer the four questions', s: 'If you have not chosen a direction, write undecided and a date you will decide by.' },
                { b: 'Send it, then publish again', s: 'Then come back and paste your link at the bottom of this page.' }],
        check: ['My 90 day target has a progress bar', 'All five rooms are alive', 'I published after the last change'],
        message: {
          mode: 'BUILD', label: 'Wealth',
          questions: [
            { id: 'income', label: 'Your income right now, per month', hint: 'A range is fine. Rough beats blank.', ph: 'About 1,400' },
            { id: 'target', label: 'The number that would change something in the next 90 days', ph: '3,000 a month' },
            { id: 'unlocks', label: 'What hitting it actually unlocks', ph: 'Move out' },
            { id: 'direction', label: 'The one direction you are committing to', ph: 'Video editing for local gyms' },
          ],
          text:
'Fill in the Wealth room of my Self-Mastery System. Same rules: read only, no forms, chat only.\n\n' +
'MY NUMBERS\n- Income right now: {{income}} per month\n- My 90 day target: {{target}}\n' +
'- What hitting it unlocks: {{unlocks}}\n- The direction I am committed to: {{direction}}\n\n' +
'SHOW ME\nMy 90 day target as the big number with a progress bar against it, and what it unlocks written right beside it. My committed direction at the top of the room with a count of days since I committed. If I ever change that direction, keep a record of the old one and how long I stayed on it, and show me that history. I want to see my own pattern of switching.\n\n' + STYLE + NEVER,
        },
      },
    ],
  },

  /* ══ DAY 2 ═══════════════════════════════════════════════════════ */
  {
    n: 2, eyebrow: 'Day Two', title: 'The Promises', theme: 'Discipline',
    accent: '#D94F6E', mark: 'flame', minutes: 25, minMinutes: 6, checkin: true,
    builds: 'A daily scoreboard with teeth',
    summary: 'Five promises, checked once a day, on a grid that goes honest when you miss.',
    why: 'Yesterday you built a scoreboard. Today it gets something to score. Pick five promises small enough to keep on a bad day, because the version of you that matters here is the tired one. The motivated one was never the problem.',
    parts: [
      {
        id: '2.1', title: 'Set your five promises', mins: 8,
        blurb: 'One per area. Small enough that a terrible day does not break them.',
        steps: [{ b: 'Write each one as a thing you either did or did not do', s: 'No "try to". No "more". A yes or a no.' },
                { b: 'Send it in Build mode', s: 'Open your app in the builder first.' }],
        check: ['All five promises show on the home screen', 'It reads X of 5 kept for today'],
        message: {
          mode: 'BUILD', label: 'The five',
          questions: [
            { id: 'body', label: 'Body promise', ph: 'Train, or walk 8,000 steps' },
            { id: 'mind', label: 'Mind promise', ph: 'One hour focused, phone in another room' },
            { id: 'appearance', label: 'Appearance promise', ph: 'Full evening routine' },
            { id: 'character', label: 'Character promise', ph: 'One thing for someone else' },
            { id: 'wealth', label: 'Wealth promise', ph: 'One income-producing action' },
          ],
          text:
'Add the promises engine to my Self-Mastery System.\n\n' +
'MY FIVE DAILY PROMISES\n- Body: {{body}}\n- Mind: {{mind}}\n- Appearance: {{appearance}}\n' +
'- Character: {{character}}\n- Wealth: {{wealth}}\n\n' +
'HOW IT WORKS\nOn the home screen, above the streak grid, show my five promises as large rows grouped by area, with one line reading "X of 5 kept" for today. I mark them by telling you in chat, the same as everything else.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '2.2', title: 'Teach the grid to be honest', mins: 6,
        blurb: 'One missed day a week is life. Two in a row is a decision, and the grid should say so.',
        steps: [{ b: 'No questions on this one', s: 'Copy it as it is.' },
                { b: 'Send it in Build mode', s: 'It only changes the grid rules.' }],
        check: ['A full day lights green', 'A partial day goes amber', 'Two dark days in a row are marked differently'],
        message: {
          mode: 'BUILD', label: 'Streak rules',
          note: 'No questions on this one. Copy it as it is.',
          text:
'Change how the streak grid scores days in my Self-Mastery System, and nothing else.\n\n' +
'- A day lights green when I kept all five promises.\n' +
'- Amber when I kept some but not all.\n' +
'- Dark when I kept none, or when I said nothing at all.\n' +
'- One amber or dark day inside a rolling seven days does NOT break my streak. Life happens weekly.\n' +
'- Two dark days in a row DOES break it, and the grid should mark that break visibly. That is not life any more, it is a decision, and I want the board honest about it.\n\n' +
'Show my current streak as one large number, and my longest streak ever in small text underneath it.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '2.3', title: 'The daily log', mins: 6,
        blurb: 'One line a day about what actually happened. This is what the weekly review reads later.',
        steps: [{ b: 'Answer the two questions', s: 'The time is when you will actually have thirty seconds.' },
                { b: 'Send it in Build mode', s: 'One message.' }],
        check: ['I can add a one-line note to today', 'Past notes are browsable'],
        message: {
          mode: 'BUILD', label: 'Daily log',
          questions: [
            { id: 'time', label: 'What time you will log each day', hint: 'When you actually have thirty seconds. Not when you wish you would.', ph: '9pm' },
            { id: 'extra', label: 'Anything else you want recorded daily, one per line', hint: 'Optional. Leave blank if five promises is enough.', area: true, ph: 'Hours slept\nMood out of 10' },
          ],
          text:
'Add a daily log to my Self-Mastery System.\n\n' +
'WHAT IT RECORDS\nFor each day: which promises I kept, and one short line from me about the day in my own words.\n{{extra}}\n\n' +
'MY LOGGING TIME\nI will report at {{time}}. Do not send me anything at that time, I am not asking for a notification. Just make the day’s entry the first thing I see when I open the app before then, and the last thing after.\n\n' +
'A HISTORY SCREEN\nA reverse chronological list of the last 60 days. Each row: the date, how many promises I kept, and my note. Tapping a row shows exactly which promises I kept that day.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '2.4', title: 'Mark today, honestly', mins: 5,
        blurb: 'Even if today was bad. A red first day beats a blank one.',
        steps: [{ b: 'Open your app and tell it about today', s: 'Type it in plain English: "kept body and mind, missed the rest".' },
                { b: 'Check the grid lit correctly', s: 'If it did not, tell the builder to fix that one thing.' }],
        check: ['Today has a colour on the grid', 'My streak number is correct'],
        message: {
          mode: 'BUILD', label: 'Test it',
          note: 'Send this, then reply to it in plain English with what you actually did today.',
          text:
'Ask me now, in this chat, which of my five promises I kept today. Then write my answer into today’s daily log, colour today on the streak grid according to the rules, and tell me plainly what the grid now shows and what my current streak is.\n\n' +
'Accept my answer in plain English in any order, in one message. Something like "trained, did my hour, missed the rest" should parse correctly without me using any particular format.\n\n' + KEEP,
        },
      },
    ],
  },

  /* ══ DAY 3 ═══════════════════════════════════════════════════════ */
  {
    n: 3, eyebrow: 'Day Three', title: 'Your Why', theme: 'Meaning',
    accent: '#8B6FD4', mark: 'heart', minutes: 20, minMinutes: 5, checkin: true,
    builds: 'The panel that gets you through week seven',
    summary: 'Who this is for, what it costs if you fold, and the line you want thrown at you.',
    why: 'Discipline gets you through week one. It does not get you through week seven, when the grid has an ugly gap and none of this feels like it is working. What gets you through is remembering who loses if you fold. Write it like nobody is grading it, because nobody is.',
    parts: [
      {
        id: '3.1', title: 'Name the people', mins: 7,
        blurb: 'Not a concept. Names.',
        steps: [{ b: 'Answer honestly', s: 'This is private. One reader: you, on a bad morning.' },
                { b: 'Send it in Build mode', s: 'It goes on your home screen where you cannot avoid it.' }],
        check: ['The Why panel is on my home screen', 'It has actual names in it'],
        message: {
          mode: 'BUILD', label: 'The Why panel',
          questions: [
            { id: 'people', label: 'The people this is for', ph: 'My mum, my brother, me at 40' },
            { id: 'text', label: 'The message you would send them the day it works, word for word', area: true, ph: 'Mum, you can hand your notice in.' },
            { id: 'cost', label: 'If you quit this like you have quit things before, the honest cost is', area: true, ph: 'Another year exactly like the last one.' },
          ],
          text:
'Add a Why panel to the home screen of my Self-Mastery System.\n\n' +
'WHAT GOES IN IT\n- The people this is for: {{people}}\n' +
'- The message I would send them the day it works: {{text}}\n- The honest cost if I quit: {{cost}}\n\n' +
'HOW IT SHOWS\nThe panel sits at the bottom of my home screen, always visible, quiet and readable rather than loud. Do not soften anything I wrote, do not rewrite it, and do not add anything of your own to it.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '3.2', title: 'Write the line', mins: 7,
        blurb: 'The sentence your app is allowed to use on you when you go quiet. You are writing your own retention copy here, and that is the point.',
        steps: [{ b: 'Write the one that would actually move you', s: 'Not the one that sounds good. You will hear it again.' },
                { b: 'Send it in Build mode', s: 'One message.' }],
        check: ['The line is saved', 'It surfaces when I have two dark days'],
        message: {
          mode: 'BUILD', label: 'The line',
          questions: [
            { id: 'line', label: 'When you go quiet for days, the line you want thrown at you', hint: 'In your own words. Write the one that would actually move you.', ph: 'You said this time was different.' },
            { id: 'quit', label: 'The last thing you quit, and how long you lasted', hint: 'Optional, but it makes the line land harder.', ph: 'The gym in January. Three weeks.' },
          ],
          text:
'Add one rule to the Why panel in my Self-Mastery System.\n\n' +
'THE LINE\n{{line}}\n\n' +
'WHAT I QUIT BEFORE\n{{quit}}\n\n' +
'WHEN TO USE IT\nWhen my streak grid shows two or more dark days in a row, move that line to the top of the Why panel instead of the bottom, and show it in full. The rest of the time keep it quiet at the bottom.\n\n' +
'Use it exactly as I wrote it. Do not soften it, do not add encouragement around it, and never generate a motivational line of your own.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '3.3', title: 'Make the rooms decay', mins: 6,
        blurb: 'The freshness badges start counting from today. The only way one turns green again is you, talking to your builder.',
        steps: [{ b: 'No questions', s: 'Copy it as it is.' },
                { b: 'Send it, then check the badges', s: 'They should all be green today.' }],
        check: ['Every room shows a freshness badge', 'Badges are green today'],
        message: {
          mode: 'BUILD', label: 'Freshness',
          note: 'No questions on this one.',
          text:
'Make the freshness badges in my Self-Mastery System work properly, and change nothing else.\n\n' +
'Each of the five rooms shows a badge with the number of days since that room last received a record from me. Green at 0 to 1 days, amber at 2 to 3, red at 4 or more. Show the badges on the home screen and at the top of each room.\n\n' +
'On the home screen, if any room is red, say plainly at the top how many rooms have gone quiet and which ones. One short factual line. No guilt, no encouragement, no advice.\n\n' + KEEP + NEVER,
        },
      },
    ],
  },

  /* ══ DAY 4 ═══════════════════════════════════════════════════════ */
  {
    n: 4, eyebrow: 'Day Four', title: 'The Review', theme: 'Truth',
    accent: '#4A7FD4', mark: 'chart', minutes: 25, minMinutes: 6, checkin: true,
    builds: 'An app that reads itself and tells you the truth',
    summary: 'Teach it to compile your week and name the date you land on at this pace.',
    why: 'Until now your dashboard shows what you told it. Today it learns to read its own records and hand you the honest version of your week, including where your current pace actually lands you. That last line is the app doing what nobody else in your life will do for free.',
    parts: [
      {
        id: '4.1', title: 'The review button', mins: 8,
        blurb: 'One button, pressed by you, never automatic.',
        steps: [{ b: 'No questions', s: 'The prompt is ready.' },
                { b: 'Send it and let it cook', s: 'This one takes a few minutes. Do not resend and do not refresh.' },
                { b: 'If it asks for tool permissions, grant them', s: 'It needs them to read its own data.' }],
        check: ['A Weekly Review button is on the home screen', 'Pressing it produces a card'],
        message: {
          mode: 'BUILD', label: 'Weekly Review',
          note: 'No questions. This build takes a few minutes — let it think.',
          text:
'Add ONE feature to my Self-Mastery System and nothing else: a WEEKLY REVIEW button on the home dashboard.\n\n' +
'When I press it, compile my last 7 days into one review card:\n' +
'- Promises kept, out of the total possible\n- Training days against my target\n- Sleep average\n' +
'- Which of the five rooms went a full week with no record\n- One honest sentence about the week I actually had\n\n' +
'Triggered only by me pressing the button. Nothing automatic, no scheduled summaries, no messages pushed at me.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '4.2', title: 'The reality check', mins: 6,
        blurb: 'The line that does the work: where this pace actually lands you.',
        steps: [{ b: 'Answer the one question', s: 'Your 90 day target from Day 1.' },
                { b: 'Send it in Build mode', s: 'It adds one line to the review card.' }],
        check: ['The review card ends with a date', 'It is not sugarcoated'],
        message: {
          mode: 'BUILD', label: 'Reality check',
          questions: [
            { id: 'target', label: 'The 90 day target you set on Day 1', ph: '3,000 a month' },
            { id: 'measure', label: 'What you will count as progress toward it', hint: 'The thing you can actually record each week.', ph: 'Clients signed, and income received' },
          ],
          text:
'Add a REALITY CHECK line to the bottom of my Weekly Review card in my Self-Mastery System.\n\n' +
'MY TARGET\n{{target}}\n\nWHAT COUNTS AS PROGRESS\n{{measure}}\n\n' +
'WHAT THE LINE DOES\nCompare my actual pace over the last 7 days against that target, and state plainly the date I land on if I continue at exactly this pace. If the pace is zero, say so and say that the date is never. No sugarcoating, no encouragement, no suggestions. One factual sentence and a date.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '4.3', title: 'The pattern screen', mins: 6,
        blurb: 'Which day of the week you actually fall over. Most people are wrong about this.',
        steps: [{ b: 'No questions', s: 'It reads what you have already logged.' },
                { b: 'Send it in Build mode', s: 'One message.' }],
        check: ['I can see which weekday I miss most', 'It shows facts, not advice'],
        message: {
          mode: 'BUILD', label: 'Patterns',
          note: 'No questions on this one.',
          text:
'Add a PATTERNS section to my Self-Mastery System, reachable from the home screen.\n\n' +
'From my daily logs, show me plainly:\n' +
'- Which day of the week I miss promises most often, and how often\n' +
'- Which single promise I break most\n- Which promise I keep most reliably\n' +
'- My longest run of complete days, and when it was\n- Whether my complete-day rate is rising or falling over the last four weeks\n\n' +
'State each as a fact with a number. Do not interpret them for me, do not tell me what to do about them, and do not congratulate or warn me. I will draw my own conclusions.\n\nIf I do not have enough data yet, say exactly how many more days you need.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '4.4', title: 'Run it', mins: 5,
        blurb: 'Press the button. Read the sentence. That is the whole exercise.',
        steps: [{ b: 'Press Weekly Review in your app', s: 'Read the whole card.' },
                { b: 'Read the honest sentence out loud', s: 'Sounds stupid. Works.' }],
        check: ['I pressed it', 'I read the reality check date'],
        message: {
          mode: 'BUILD', label: 'First run',
          note: 'Send this, then actually press the button.',
          text:
'Run my Weekly Review now and show me the card in this chat as well as in the app. Include the honest sentence and the reality check date.\n\n' +
'If I have fewer than seven days of data, say so plainly and show me what you do have rather than padding it out or estimating.\n\n' + KEEP,
        },
      },
    ],
  },

  /* ══ DAY 5 ═══════════════════════════════════════════════════════ */
  {
    n: 5, eyebrow: 'Day Five', title: 'The Coach', theme: 'Connection',
    accent: '#3FA5B8', mark: 'chat', minutes: 30, minMinutes: 8, checkin: true,
    builds: 'An agent in your pocket that writes the board for you',
    summary: 'Text it one line a day and everything updates. This is the one that decides whether any of this survives.',
    why: 'Every day so far has been you opening a builder. That will not last, and it should not have to. Today the app gets a voice, a phone number and your standards, so the daily check-in happens in the chat app you already open forty times a day.',
    parts: [
      {
        id: '5.1', title: 'Build the agent', mins: 8,
        blurb: 'It knows your promises, your Why, and your check-in time.',
        steps: [{ b: 'Answer the two questions', s: 'Your time, and who you are doing this for.' },
                { b: 'Send it in Build mode', s: 'Takes a few minutes. Let it think.' }],
        check: ['An agent exists in my app', 'It knows my five promises'],
        message: {
          mode: 'BUILD', label: 'The Coach',
          questions: [
            { id: 'time', label: 'Your daily check-in time', ph: '9pm' },
            { id: 'people', label: 'Who you are doing this for, as you want to be reminded of them', ph: 'My mum and my brother' },
          ],
          text:
'Add an agent to my Self-Mastery System called The Coach.\n\n' +
'WHAT IT DOES\nAt {{time}} every day it messages me and asks for my five promises in one line. It writes my answer into today’s daily log, colours today on the streak grid, and replies with my day number and a three word verdict. Nothing longer.\n\n' +
'I must be able to reply in plain English, in any order, in one message. "trained, hour done, no porn, called my nan, sent 5 messages" should parse correctly.\n\n' +
'IF I GO QUIET\nAfter two days with no reply, its next message opens with who I am doing this for: {{people}}. Then the line I wrote in my Why panel, exactly as I wrote it. Then it asks for my numbers as normal. No lecture, no guilt, and no motivational writing of its own.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '5.2', title: 'Teach it to parse you', mins: 6,
        blurb: 'It has to understand how you actually talk, not a format you will forget.',
        steps: [{ b: 'Write three examples of how you would report', s: 'In your own words, lazily, like you would at 11pm.' },
                { b: 'Send it in Build mode', s: 'This is what makes it survive the first bad week.' }],
        check: ['It parses my lazy version correctly', 'It handles a voice note'],
        message: {
          mode: 'BUILD', label: 'Parsing',
          questions: [
            { id: 'ex1', label: 'How you would report a good day, in your own words', ph: 'all done' },
            { id: 'ex2', label: 'How you would report a half day', ph: 'trained and did my hour, nothing else' },
            { id: 'ex3', label: 'How you would report a bad day', ph: 'nothing today, write it off' },
          ],
          text:
'Improve how The Coach in my Self-Mastery System understands my replies.\n\n' +
'THESE ARE REAL EXAMPLES OF HOW I WILL ACTUALLY REPORT\n- "{{ex1}}"\n- "{{ex2}}"\n- "{{ex3}}"\n\n' +
'All three must parse correctly into the right promises without me using any format, any keywords or any particular order. A voice note must work the same way as text.\n\n' +
'If a reply is genuinely ambiguous, ask me exactly one short clarifying question. Never ask two, and never make me start again.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '5.3', title: 'Sunday', mins: 5,
        blurb: 'One word, and the week compiles itself.',
        steps: [{ b: 'No questions', s: 'Copy it as it is.' },
                { b: 'Send it in Build mode', s: 'One message.' }],
        check: ['Texting Sunday returns my week', 'It names my people first'],
        message: {
          mode: 'BUILD', label: 'Sunday',
          note: 'No questions on this one.',
          text:
'Add one behaviour to The Coach in my Self-Mastery System.\n\n' +
'If I send it the single word "Sunday" on any day, it replies with, in this order:\n' +
'1. Who I am doing this for, their names, from my Why panel. Not a quote, the names.\n' +
'2. My week compiled: promises kept out of possible, training days, and which rooms went quiet.\n' +
'3. The days I said nothing, marked as missed rather than skipped over.\n' +
'4. One honest sentence about the week I actually had.\n\nNothing else, and nothing encouraging.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '5.4', title: 'Put it in your pocket', mins: 6,
        blurb: 'An agent inside a builder nobody opens is not an agent.',
        steps: [{ b: 'Send the prompt', s: 'It will walk you through connecting a channel.' },
                { b: 'Open agent settings and find Channels', s: 'Connect WhatsApp or Telegram and follow the steps.' },
                { b: 'Pin the chat to the top of WhatsApp', s: 'An unanswered pinned chat stares at you forty times a day.' },
                { b: 'Set a repeating phone reminder at your check-in time', s: 'Call it TEXT YOUR NUMBERS. It feels dumb. It is the machine.' }],
        check: ['The Coach messaged me outside the builder', 'The chat is pinned', 'My phone reminder is set and repeating'],
        message: {
          mode: 'BUILD', label: 'Connect it',
          text:
'Make The Coach reachable from my phone.\n\n' +
'Set the agent up so I can message it from an outside chat app rather than only inside the builder. Walk me through connecting a channel step by step, and tell me exactly where to find it in the agent settings.\n\n' +
'Once it is connected, send me a test message so I know it works, then confirm that my reply landed in today’s daily log and coloured today on the streak grid.\n\n' + KEEP,
        },
      },
      {
        id: '5.5', title: 'Send the test', mins: 5,
        blurb: 'Report today from your phone, not the builder. If that works, the system is real.',
        steps: [{ b: 'Message The Coach from WhatsApp', s: 'Your actual numbers for today.' },
                { b: 'Open the app and check it landed', s: 'Today should be coloured and you never opened the builder.' }],
        check: ['I replied from my phone', 'Today updated without opening Base44’s builder'],
        message: {
          mode: 'BUILD', label: 'Verify',
          note: 'Send this last, after the channel is connected.',
          text:
'Confirm The Coach is working end to end in my Self-Mastery System.\n\n' +
'Check and tell me plainly: is the agent connected to an outside channel, does it have my five promises, does it have my check-in time, does it have my Why panel line, and did my most recent reply write correctly into the daily log and the streak grid?\n\n' +
'If any of those five is not true, tell me which one and exactly what to do about it. Do not tell me it is fine if it is not.\n\n' + KEEP,
        },
      },
    ],
  },

  /* ══ DAY 6 ═══════════════════════════════════════════════════════ */
  {
    n: 6, eyebrow: 'Day Six', title: 'Go Deep', theme: 'Depth',
    accent: '#4FA97A', mark: 'depth', minutes: 25, minMinutes: 6, checkin: true,
    builds: 'One room built out properly',
    summary: 'Pick the area actually holding you back and give it the detail it deserves.',
    why: 'Five rooms at equal depth is a compromise. One of these is the thing genuinely in the way this month, and a single card does not cut it. Build that one out properly. You can do this again for any other room later.',
    parts: [
      {
        id: '6.1', title: 'Pick the room and expand it', mins: 8,
        blurb: 'The one that is in the way, not the one that sounds best.',
        steps: [{ b: 'Choose honestly', s: 'If you are not sure, it is the one you avoided answering on Day 1.' },
                { b: 'Send it in Build mode', s: 'Every other room stays exactly as it is.' }],
        check: ['That room has its own big number', 'It has its own 30 day grid'],
        message: {
          mode: 'BUILD', label: 'Expand',
          questions: [
            { id: 'area', label: 'Which area', hint: 'Body, Mind, Appearance, Character or Wealth.', ph: 'Mind' },
            { id: 'track', label: 'What it needs to track in detail, one per line', area: true, ph: 'Clean days\nUrge strength out of 10\nWhat I was feeling before a slip' },
            { id: 'number', label: 'The one number you want big at the top of that room', ph: 'Current clean days' },
          ],
          text:
'Expand the {{area}} room of my Self-Mastery System. Every other room stays exactly as it is.\n\n' +
'WHAT THIS ROOM NEEDS TO TRACK\n{{track}}\n\n' +
'THE NUMBER THAT MATTERS\n{{number}}, large, at the top of the room.\n\n' +
'ALSO SHOW\nA 30 day grid for this room specifically, and a history list in reverse date order so I can look back at what actually happened.\n\n' + STYLE + NEVER,
        },
      },
      {
        id: '6.2', title: 'Find the trigger', mins: 6,
        blurb: 'Not to fix it. To see it. Knowing your own pattern is most of the work.',
        steps: [{ b: 'Answer the two questions', s: 'Be specific about what you want recorded when it goes wrong.' },
                { b: 'Send it in Build mode', s: 'One message.' }],
        check: ['It records what happened before a slip', 'It shows me my most common trigger'],
        message: {
          mode: 'BUILD', label: 'Triggers',
          questions: [
            { id: 'area', label: 'The same area you picked above', ph: 'Mind' },
            { id: 'before', label: 'What you want recorded when it goes wrong, one per line', area: true, ph: 'What I was feeling\nWhat time it was\nWhere I was\nWhat I will do differently' },
          ],
          text:
'Add trigger tracking to the {{area}} room of my Self-Mastery System.\n\n' +
'WHEN I TELL YOU IT WENT WRONG, RECORD\n{{before}}\n\n' +
'THEN SHOW ME, AS PLAIN FACTS WITH NUMBERS\nMy most common feeling beforehand. My most common time of day. My most common day of the week. My average run length between slips, and whether those runs are getting longer or shorter.\n\n' +
'TONE, AND THIS MATTERS\nWhen I record a slip, do not congratulate me and do not scold me. No shame language, no disappointment, no encouragement, no confetti. State the reset, ask what happened, save it, and move on. It keeps the record. I do the judging.\n\n' + STYLE + NEVER,
        },
      },
      {
        id: '6.3', title: 'One rule you cannot break', mins: 5,
        blurb: 'A single bright line for this area, written by you, enforced by the board.',
        steps: [{ b: 'Write one rule', s: 'Something binary. You either held it or you did not.' },
                { b: 'Send it in Build mode', s: 'One message.' }],
        check: ['The rule is visible at the top of the room', 'Days since I last broke it is showing'],
        message: {
          mode: 'BUILD', label: 'The bright line',
          questions: [
            { id: 'area', label: 'The same area again', ph: 'Mind' },
            { id: 'rule', label: 'The one rule, written as a thing you either did or did not do', ph: 'Phone does not come into the bedroom' },
            { id: 'cost', label: 'What breaking it actually costs you', ph: 'An hour of sleep and a wasted morning' },
          ],
          text:
'Add one bright line rule to the {{area}} room of my Self-Mastery System.\n\n' +
'MY RULE\n{{rule}}\n\nWHAT BREAKING IT COSTS ME\n{{cost}}\n\n' +
'HOW IT SHOWS\nAt the top of the room: the rule written out in full, and underneath it the number of days since I last broke it, large. When I break it, reset that number to zero and show me what I wrote about what it costs. Once. Plainly. Then stop.\n\n' + KEEP + NEVER,
        },
      },
      {
        id: '6.4', title: 'Tell it about today', mins: 5,
        blurb: 'The room is built. Now feed it.',
        steps: [{ b: 'Message The Coach with today’s detail', s: 'Including the new things this room tracks.' }],
        check: ['The expanded room has at least one real record'],
        message: {
          mode: 'BUILD', label: 'First record',
          note: 'Send this, then answer it honestly.',
          text:
'Ask me now for today’s numbers for the room I just expanded, including everything new it tracks. Then write them in, and show me what the room looks like with one real day in it.\n\n' + KEEP,
        },
      },
    ],
  },

  /* ══ DAY 7 ═══════════════════════════════════════════════════════ */
  {
    n: 7, eyebrow: 'Day Seven', title: 'The Week', theme: 'Completion',
    accent: '#D9A441', mark: 'crown', minutes: 25, minMinutes: 6, checkin: true, review: true,
    builds: 'A finished system and one decision',
    summary: 'Lock it down, run the review, and decide the one thing that changes.',
    why: 'You have a working system, seven days of real records, and an app that will tell you the truth about them. Today you make it permanent and then you sit with what it says for ten minutes, which is the part almost nobody does.',
    parts: [
      {
        id: '7.1', title: 'Lock it down', mins: 6,
        blurb: 'Real numbers about your life should not be readable by anyone but you.',
        steps: [{ b: 'No questions', s: 'Copy it as it is.' },
                { b: 'Send it, then test it', s: 'Open your app link in a private window. You should see nothing.' }],
        check: ['My app is private', 'A logged-out window shows me nothing'],
        message: {
          mode: 'BUILD', label: 'Permissions',
          note: 'Test this one afterwards in a private browser window.',
          text:
'Lock down my Self-Mastery System so only I can read it.\n\n' +
'Set permissions so that every record in this app is visible only to the account that created it, and so that a signed-out visitor sees nothing at all. Then verify it yourself and tell me plainly whether it passed.\n\n' +
'Tell me exactly how to test it myself in a private browser window, and what I should expect to see if it is working.\n\n' + KEEP,
        },
      },
      {
        id: '7.2', title: 'The month view', mins: 7,
        blurb: 'Seven days is a week. This is the thing you will open in March.',
        steps: [{ b: 'No questions', s: 'It builds from what you already have.' },
                { b: 'Send it in Build mode', s: 'Last build of the week.' }],
        check: ['I can see a full month at once', 'My best and worst weeks are visible'],
        message: {
          mode: 'BUILD', label: 'The long view',
          note: 'The last build of the week.',
          text:
'Add a MONTH view to my Self-Mastery System, reachable from the home screen.\n\n' +
'Show me, for the last 90 days: complete days per week as a simple bar per week, my longest run of complete days, my best week and my worst week by promises kept, and a count of how many days I said nothing at all.\n\n' +
'State them as facts with numbers. No interpretation, no advice, no encouragement. If there is not enough data yet, say exactly how many more days you need.\n\n' + STYLE + NEVER,
        },
      },
      {
        id: '7.3', title: 'Run the review, decide one thing', mins: 12,
        blurb: 'Press it. Read it out loud. Then write down the single thing that changes next week.',
        steps: [{ b: 'Press Weekly Review in your app', s: 'Read the whole card, especially the reality check date.' },
                { b: 'Text The Coach the word Sunday', s: 'Whichever day it actually is. See what comes back.' },
                { b: 'Read your Why panel', s: 'Out loud. Yes, really.' },
                { b: 'Write the one thing below', s: 'One. Not five. It is the only output of the week that matters.' }],
        check: ['I ran the Weekly Review', 'I texted Sunday and read what came back', 'I wrote down one change'],
        message: {
          mode: 'BUILD', label: 'The week, compiled',
          text:
'Compile my full first week in my Self-Mastery System and show it to me in this chat.\n\n' +
'Include: promises kept out of possible, my complete days, which rooms I kept alive and which went quiet, my longest run, the honest sentence about the week, and the reality check date against my 90 day target.\n\n' +
'Then ask me one question and wait for my answer: what is the single thing I am changing next week? Save my answer, put it on the home screen where I will see it every day, and show it back to me next Sunday.\n\n' + KEEP,
        },
      },
    ],
  },
  ];

  /* ────────────────────────────────────────────────────────────────
     PHASES. The shelf the days sit on.
     ──────────────────────────────────────────────────────────────── */
  var PHASES = [
    {
      n: 1, id: 'start', title: 'Start Here', accent: '#E8825C', mark: 'play',
      blurb: 'What this is, how it works, and exactly where to begin. Watch this before anything else.',
      lessons: [{ id: 'welcome', title: 'Welcome from Baby', mins: 4, kind: 'intro' }],
    },
    {
      n: 2, id: 'seven', title: 'The First Seven', accent: '#D94F6E', mark: 'flame',
      blurb: 'Seven days, seven SOPs, twenty-nine prompts. At the end you have a system that runs what you actually control.',
      lessons: DAYS.map(function (d) {
        return { id: 'd' + d.n, day: d.n, title: d.title, mins: d.minutes, kind: 'day', parts: d.parts.length };
      }),
    },
    {
      n: 3, id: 'library', title: 'The Library', accent: '#D9A441', mark: 'grid',
      blurb: 'Twenty-four more tools you can add to your system. Opens when the seven are done.',
      gated: true, lessons: [],
    },
  ];

  function day(n) { n = parseInt(n, 10); return DAYS.filter(function (d) { return d.n === n; })[0] || null; }
  function phase(id) { return PHASES.filter(function (p) { return p.id === id || String(p.n) === String(id); })[0] || null; }
  function parts(n) { var d = day(n); return d ? d.parts : []; }
  function totalPrompts() { return DAYS.reduce(function (t, d) { return t + d.parts.length; }, 0); }
  function totalLessons() { return PHASES.reduce(function (t, p) { return t + p.lessons.length; }, 0); }

  var UNLOCKS = [
    { id: 'community', accent: '#3FA5B8', mark: 'chat',  title: 'The Community',         sub: 'Private chat with everyone else doing this' },
    { id: 'calls',     accent: '#8B6FD4', mark: 'live',  title: 'Weekly call with Baby',  sub: 'Live, every week, questions answered' },
    { id: 'library',   accent: '#E8825C', mark: 'grid',  title: 'The Build Library',      sub: 'Twenty-four more tools for your system' },
    { id: 'protocol',  accent: '#4FA97A', mark: 'depth', title: "Baby's Protocol",        sub: 'What he actually does right now' },
  ];

  return { days: DAYS, day: day, parts: parts, totalPrompts: totalPrompts,
           phases: PHASES, phase: phase, totalLessons: totalLessons, unlocks: UNLOCKS };
})();
