/* ══════════════════════════════════════════════════════════════════════
   THE SELF-MASTERY SYSTEM — CONTENT CATALOGUE

   THE SINGLE SOURCE OF TRUTH FOR EVERY PILLAR, BUILD AND PROMPT.
   Nothing in the HQ hardcodes a Base44 prompt. Every page reads from
   this file, so changing a prompt is one edit here and it is live
   everywhere it appears: the pillar page, the library card, the build
   detail, the onboarding recommendation.

   WHY A JS FILE AND NOT JSON. There is no bundler and no build step in
   this repo, and a fetch() would put a loading state on every page and
   break when opened from disk. A plain script assigning one global is
   the cheapest thing that works. When an admin UI arrives, swap the
   assignment for a fetch of /api/catalogue and nothing else changes:
   every consumer already reads window.SMS.

   PROMPT HOUSE STYLE. Each prompt is one message, sent in one go, and
   states the data, the layout and what NOT to add. Prompts that leave
   decisions open come back as ten clarifying questions and the member
   gives up. The read-only rule on the daily tools is deliberate and
   load-bearing, not a simplification: a tool you can silently tap
   numbers into stops being a conversation, and the member stops opening
   it. Keep it.
══════════════════════════════════════════════════════════════════════ */

window.SMS = (function () {

  /* ────────────────────────────────────────────────────────────────
     PILLARS. Order here is the order everywhere: sidebar, home, filters.
     starter is the one build an overwhelmed beginner is pointed at.
     ──────────────────────────────────────────────────────────────── */
  var pillars = [
    {
      id: 'body',
      name: 'Body Mastery',
      short: 'Body',
      tagline: 'Build the systems that make taking care of your body easier to execute consistently.',
      blurb: 'Training, food, sleep, recovery. Not a perfect programme — a way to keep showing up to the one you have.',
      starter: 'macro-tracker',
    },
    {
      id: 'appearance',
      name: 'Appearance Mastery',
      short: 'Appearance',
      tagline: 'Improve how you present yourself, on purpose, with a routine you can actually repeat.',
      blurb: 'Grooming, skin, hair, style, presentation. Small things done consistently, not a transformation weekend.',
      starter: 'appearance-routine',
    },
    {
      id: 'mind',
      name: 'Mind Mastery',
      short: 'Mind',
      tagline: 'Discipline and emotional control: the two things standing between knowing and doing.',
      blurb: 'Keeping promises to yourself, resisting cheap dopamine, focusing when motivation is gone, and responding instead of reacting.',
      starter: 'daily-promises',
    },
    {
      id: 'character',
      name: 'Character Mastery',
      short: 'Character',
      tagline: 'Become someone of substance, not just someone more impressive.',
      blurb: 'Confidence, courage, generosity, integrity, how you treat people. You cannot pour into somebody else’s glass when yours is empty.',
      starter: 'daily-good-deed',
    },
    {
      id: 'wealth',
      name: 'Wealth Mastery',
      short: 'Wealth',
      tagline: 'Pick a direction and build the consistency to actually pursue it.',
      blurb: 'There is no one correct way to make money. There is a correct way to stop switching every three weeks.',
      starter: 'daily-income-actions',
    },
  ];

  /* ────────────────────────────────────────────────────────────────
     BUILDS. Shape per the build object spec: id/slug, pillar, the two
     descriptions, the problem it solves, difficulty, minutes, prompt.
     `first` marks the universal onboarding build. `featured` surfaces
     it on pillar pages above the rest.
     ──────────────────────────────────────────────────────────────── */
  var builds = [

    /* ══ THE FIRST BUILD ══════════════════════════════════════════
       Deliberately the longest prompt in the catalogue. It is the only
       one most members will ever build under supervision, it teaches
       the whole Base44 motion, and a failure here loses the member for
       good. Every other prompt can afford to be terse. This one cannot.
       ══════════════════════════════════════════════════════════════ */
    {
      id: 'daily-promises',
      title: 'Daily Promises',
      pillar: 'mind',
      first: true,
      featured: true,
      difficulty: 'Easy',
      minutes: 10,
      short: 'Choose the handful of promises you intend to keep every day, then keep score honestly.',
      problem: 'You decide to change, you hold it for four days, and then it quietly stops. Nothing is written down, so nothing is broken.',
      long: 'This is the spine of the whole system. You pick a small number of promises you intend to keep daily, and every evening you tell the app which ones you kept. It does not nag you and it does not congratulate you. It keeps an honest record, which is the one thing nobody else in your life will do for you for free.\n\nBuild this first even if another pillar matters more to you. Everything else you build will hang off the habit of reporting honestly, once a day.',
      prompt: 'I am building a private app called Daily Promises. It is just for me, one user. This message is the full specification. Treat every decision below as final and only ask me about genuine gaps.\n\nWHAT IT IS\nA daily scoreboard for the promises I make to myself. One home screen and one history screen. Nothing else.\n\nWHAT IT STORES\n- Promise: the promise in one short line, the pillar it belongs to (Body, Appearance, Mind, Character or Wealth), whether it is currently active\n- DailyEntry: date, which promises I kept that day, which I did not, an optional one-line note\n\nHOME SCREEN\n- Today’s date at the top, and one line reading "X of Y promises kept" for today.\n- Below that, my active promises as a list of large tappable rows grouped by pillar, each showing kept or not kept for today.\n- Below that, a 30 day streak grid: one small square per day for the last 30 days. A day is lit when I kept every active promise, amber when I kept some, dark when I kept none or said nothing.\n- Below that, my current streak of complete days as one big number.\n\nHISTORY SCREEN\nA reverse chronological list of the last 60 days. Each row: the date, the count kept out of total, and my note if I left one. Tapping a row shows exactly which promises I kept that day.\n\nSTYLE\nDark theme, near black background, high contrast, generous spacing, minimal. Big numbers with small quiet labels. It must read on a phone in about five seconds. It must work on a phone, a tablet and a desktop.\n\nWHAT NOT TO ADD\n- No accounts, sign ups, profiles or sharing. Just me.\n- No notifications, no motivational messages, no badges, no confetti, no points, no levels.\n- No coaching copy and no automatic advice. It records, it does not talk.\n- No extra pages, settings screens or features beyond this spec.\n\nHOW DATA GOES IN\nI need to be able to add, edit and retire my promises, and I need to mark today’s promises kept or not kept. Keep that to the smallest possible interaction: tapping a promise row toggles it for today, and one clearly separated area lets me manage the list of promises themselves. Nothing else should be editable.\n\nStart by setting me up with these five promises, which I will edit afterwards:\n- Train today (Body)\n- Stay inside my food target (Body)\n- One hour of focused work, phone in another room (Mind)\n- No porn (Mind)\n- Do one thing for somebody who cannot repay me (Character)\n\nBuild it.',
      after: 'Open it tonight, not tomorrow. Mark today honestly, even if today was bad. A red first day is worth more than a blank one.',
    },

    /* ══ BODY MASTERY ══════════════════════════════════════════════ */
    {
      id: 'macro-tracker',
      title: 'Macro Tracker',
      pillar: 'body',
      featured: true,
      difficulty: 'Easy',
      minutes: 12,
      short: 'Calories and protein against a target you set, logged by talking to it rather than searching a database.',
      problem: 'Every food app turns into a part time job by day three, so you stop opening it and stop knowing where you are.',
      long: 'Most tracking apps fail because logging a meal takes ninety seconds and a barcode. This one takes a sentence. You tell it roughly what you ate and it estimates and records. Rough and daily beats precise and abandoned.',
      prompt: 'I am building a private app called Macro Tracker, just for me, one user. This message is the full specification. Treat every decision as final and only ask about genuine gaps.\n\nWHAT IT STORES\n- Target: daily calories, daily protein in grams\n- MealEntry: date, what I ate as free text, estimated calories, estimated protein\n\nHOME SCREEN\n- Two big rings or bars: calories eaten against target, protein eaten against target, for today.\n- Remaining calories and remaining protein as large numbers.\n- Today’s meals listed underneath, each showing the text I entered and its estimate.\n- A seven day strip showing whether I hit my protein target each day.\n\nHOW FOOD GOES IN\nOne text box. I type or dictate what I ate in plain English, for example "two chicken breasts, rice, and a banana". Estimate the calories and protein yourself and save it as a meal entry. Let me correct an estimate if it is badly wrong. Do not build a food database, a barcode scanner or a search.\n\nSETTINGS\nOne small screen where I set my daily calorie and protein targets.\n\nSTYLE\nDark theme, near black, high contrast, minimal, big numbers, small labels. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No micronutrients, no water tracking, no weight tracking, no exercise logging. No advice about what I should eat. No extra pages beyond home and settings.\n\nBuild it.',
      after: 'Log one meal before you close the tab. The first entry is the only one that is hard.',
    },
    {
      id: 'workout-tracker',
      title: 'Workout Tracker',
      pillar: 'body',
      difficulty: 'Easy',
      minutes: 12,
      short: 'What you lifted, when, and whether it went up.',
      problem: 'You train for months without progressive overload because you cannot remember what you did last time.',
      long: 'A training log that answers one question fast: what did I do last time, and can I beat it today. No programme builder, no exercise library, no video demonstrations.',
      prompt: 'I am building a private app called Workout Tracker, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Session: date, session name such as Push or Legs, optional note\n- SetEntry: the session it belongs to, exercise name, weight, reps\n\nHOME SCREEN\n- A button to start a session, and my last six sessions listed with date and name.\n- My current training streak in weeks, and sessions completed this week against a weekly target I set.\n\nINSIDE A SESSION\nI add exercises by name and log sets as weight and reps. Crucially: when I add an exercise, show me what I lifted for that same exercise last time, right there, before I log anything. That comparison is the entire point of the app.\n\nPROGRESS\nOne screen where I pick an exercise and see its top set over time as a simple line.\n\nSTYLE\nDark theme, near black, high contrast, minimal, large tap targets because this is used with one hand in a gym. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No exercise database, no demonstration videos, no programme templates, no rest timers, no notifications, no coaching advice.\n\nBuild it.',
    },
    {
      id: 'progress-photos',
      title: 'Progress Photos',
      pillar: 'body',
      difficulty: 'Easy',
      minutes: 10,
      short: 'The same three angles, same light, once a week, side by side over time.',
      problem: 'You look in the mirror daily and see nothing, then wonder in six months whether anything changed.',
      long: 'The mirror is the worst possible instrument for measuring slow change. A dated photo set taken the same way every week is the best one.',
      prompt: 'I am building a private app called Progress Photos, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- PhotoSet: date, front photo, side photo, back photo, optional bodyweight, optional note\n\nHOME SCREEN\n- My most recent set shown as three thumbnails with its date.\n- How many days since my last set, as a number, and my weekly capture streak.\n- A button to add a new set.\n\nCOMPARE SCREEN\nThis is the important one. Let me pick any two dates and show the same angle from both, side by side, at the same size. Let me switch angle between front, side and back while keeping both dates fixed.\n\nTIMELINE\nAll sets in reverse date order as a grid of thumbnails.\n\nSTYLE\nDark theme, near black, images given as much room as possible, minimal chrome. Phone first, since photos are taken and viewed on a phone.\n\nWHAT NOT TO ADD\nNo accounts, no sharing, no upload to anywhere public, no automatic body fat estimates, no measurements, no notifications, no AI analysis of my body.\n\nThis app is private and stays private.\n\nBuild it.',
      after: 'Take the first set today in whatever state you are in. The point of a before is that it is unflattering.',
    },
    {
      id: 'sleep-tracker',
      title: 'Sleep Tracker',
      pillar: 'body',
      difficulty: 'Easy',
      minutes: 8,
      short: 'When you actually went to bed, not when you meant to.',
      problem: 'Every other area you are trying to fix is downstream of sleep, and you have no idea what your real average is.',
      long: 'One number a day, and the average that number produces. The gap between your intended bedtime and your actual one is usually the whole story.',
      prompt: 'I am building a private app called Sleep Tracker, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- SleepEntry: date, time I actually went to bed, time I woke, hours slept calculated from those, energy score out of 10\n- Target: my intended bedtime, my target hours\n\nHOME SCREEN\n- Last night’s hours as one large number.\n- My seven day average hours and my thirty day average hours.\n- My average actual bedtime against my intended bedtime, shown as the gap in minutes. Make this prominent, it is the number that matters.\n- A 30 day grid, one square per night, lit when I hit my target hours.\n\nHOW DATA GOES IN\nOne short form: bed time, wake time, energy out of 10. Nothing else.\n\nSTYLE\nDark theme, near black, high contrast, big numbers, small labels, minimal. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing, no notifications, no sleep stage analysis, no wearable integrations, no advice about sleep hygiene.\n\nBuild it.',
    },
    {
      id: 'bodyweight-tracker',
      title: 'Bodyweight Tracker',
      pillar: 'body',
      difficulty: 'Easy',
      minutes: 8,
      short: 'Daily weigh-ins, a rolling average, and a trend line that ignores the noise.',
      problem: 'Your weight swings three pounds overnight and you read every swing as success or failure.',
      long: 'Daily weight is mostly water and timing. A seven day rolling average is the actual signal, and seeing the two plotted together stops the daily panic.',
      prompt: 'I am building a private app called Bodyweight Tracker, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- WeighIn: date, weight\n- Goal: target weight, direction (lose, gain or maintain)\n\nHOME SCREEN\n- Today’s weight if logged, and my seven day rolling average as the larger, more prominent number of the two.\n- Change in the rolling average over the last 14 and 30 days, with direction.\n- A line chart of the last 90 days showing daily weigh-ins as faint dots and the seven day rolling average as the solid line.\n- Distance to my goal weight.\n\nHOW DATA GOES IN\nOne number, once a day. Nothing else.\n\nSTYLE\nDark theme, near black, high contrast, the chart given real space, minimal. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing, no notifications, no body fat percentage, no BMI, no calorie estimates, no diet advice, no celebration messages when I lose weight.\n\nBuild it.',
    },

    /* ══ APPEARANCE MASTERY ════════════════════════════════════════ */
    {
      id: 'appearance-routine',
      title: 'Appearance Routine',
      pillar: 'appearance',
      featured: true,
      difficulty: 'Easy',
      minutes: 10,
      short: 'Your morning and evening presentation routine, as a checklist you actually complete.',
      problem: 'You know what you are supposed to do for your skin, hair and grooming. You do it properly for a week, then intermittently, then not at all.',
      long: 'Appearance improvement is almost never a knowledge problem. It is a repetition problem, and repetition needs a list and a record. This is the build that turns the things you already know into a routine that survives a bad week.',
      prompt: 'I am building a private app called Appearance Routine, just for me, one user. This message is the full specification. Treat every decision as final and only ask about genuine gaps.\n\nWHAT IT STORES\n- RoutineStep: the step in one short line, which routine it belongs to (Morning, Evening or Weekly), whether it is active\n- DayRecord: date, which steps I completed\n\nHOME SCREEN\n- Today’s date and one line reading "X of Y steps completed" for today.\n- My Morning routine as a list of tappable rows, then my Evening routine, then Weekly if anything is due.\n- A 30 day grid, one square per day, lit when I completed every active step that day and amber when I completed some.\n- My current streak of complete days as one large number.\n\nSETUP\nStart me with these steps, which I will edit afterwards.\nMorning: wash face, moisturise, SPF, brush and floss, hair, check fit of what I am wearing.\nEvening: wash face, moisturise, brush and floss, lay out tomorrow’s clothes.\nWeekly: haircut or trim check, nails, deep clean of shoes, wardrobe tidy.\n\nLet me add, edit and retire steps. Nothing else should be editable.\n\nSTYLE\nDark theme, near black, high contrast, generous spacing, large tap targets. It gets used half asleep, twice a day, on a phone. Phone first.\n\nWHAT NOT TO ADD\nNo accounts, sharing or profiles. No notifications. No product recommendations, no shopping links, no skin analysis, no photo uploads, no advice about what I should be doing. It records my routine, it does not design it.\n\nBuild it.',
      after: 'Tick tonight’s evening routine before you sleep. One day on the grid is the whole start.',
    },
    {
      id: 'skincare-tracker',
      title: 'Skincare Tracker',
      pillar: 'appearance',
      difficulty: 'Medium',
      minutes: 15,
      short: 'What you put on your face, and whether your skin actually got better.',
      problem: 'You change three products at once, your skin changes, and you have no idea which one did it.',
      long: 'Skin responds slowly and you change too many variables at once. This logs what you are using, when you started it, and a simple daily skin score, so a change over eight weeks becomes visible instead of imagined.',
      prompt: 'I am building a private app called Skincare Tracker, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Product: name, what it is for, when I started using it, whether it is currently in rotation\n- DailyLog: date, skin score out of 10, optional note about breakouts or irritation, which routine steps I did\n\nHOME SCREEN\n- Today’s skin score if logged, and my 30 day average score.\n- A line of the last 60 days of skin scores so a slow trend is visible.\n- My current products with how many weeks I have been using each. Anything under eight weeks is marked "too early to judge".\n\nLOGGING\nOne short daily entry: score out of 10, optional note. Nothing else.\n\nPRODUCTS\nA screen where I add a product, mark when I started it, and retire it when I stop.\n\nSTYLE\nDark theme, near black, high contrast, minimal, phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No product recommendations, no shopping links, no ingredient database, no photo analysis, and no medical or dermatological advice of any kind. If I log something that sounds like a medical problem, do not diagnose it.\n\nBuild it.',
    },
    {
      id: 'wardrobe-planner',
      title: 'Wardrobe Planner',
      pillar: 'appearance',
      difficulty: 'Medium',
      minutes: 15,
      short: 'What you own, what actually fits, and outfits decided before you are late.',
      problem: 'You own enough clothes and still default to the same two things because deciding at 7am is impossible.',
      long: 'Decisions made in advance are better than decisions made in a rush. This is a catalogue of what you own and a small set of outfits you have already approved, so getting dressed stops being a daily negotiation.',
      prompt: 'I am building a private app called Wardrobe Planner, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Item: name, category (top, bottom, outerwear, shoes, accessory), colour, photo, whether it fits me properly, whether it is in rotation\n- Outfit: name, the items in it, occasion (everyday, smart, gym, going out), photo optional\n\nHOME SCREEN\n- My saved outfits as cards, showing their items.\n- A prompt to build a new outfit.\n- A count of items I have marked as not fitting properly, as a quiet reminder to deal with them.\n\nWARDROBE SCREEN\nAll items as a grid with photos, filterable by category. Let me add items with a photo from my phone.\n\nOUTFIT BUILDER\nPick items from my wardrobe, name the outfit, tag an occasion, save.\n\nSTYLE\nDark theme, near black, photos given room, minimal chrome. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No shopping links, no product recommendations, no style scoring, no AI opinions on how I look, no notifications.\n\nBuild it.',
    },
    {
      id: 'appearance-checklist',
      title: 'Appearance Checklist',
      pillar: 'appearance',
      difficulty: 'Easy',
      minutes: 8,
      short: 'The standing list of appearance jobs with dates on them: haircut, dentist, resole, replace.',
      problem: 'The slow-cycle things quietly slip. Your haircut is three weeks overdue and your shoes have looked bad for a month.',
      long: 'Daily routines handle the daily things. This handles everything on a two week to six month cycle, which is where most people visibly slip without noticing.',
      prompt: 'I am building a private app called Appearance Checklist, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Task: name, how often it should happen in days, the date I last did it, notes\n\nHOME SCREEN\n- Anything overdue at the top, in red, with how many days overdue.\n- Anything due in the next seven days below that, in amber.\n- Everything else below that, in order of when it is next due, quiet and dark.\n- One tap on a task marks it done today and resets its clock.\n\nSETUP\nStart me with these, which I will edit: haircut every 21 days, beard tidy every 7, nails every 10, dentist every 180, dental hygienist every 180, replace razor blades every 14, deep clean shoes every 30, wash gym kit properly every 7, replace toothbrush head every 90, wardrobe cull every 90.\n\nLet me add, edit and remove tasks and change their intervals.\n\nSTYLE\nDark theme, near black, high contrast. Overdue must be impossible to miss. Minimal, phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing, no notifications, no shopping links, no recommendations, no streaks or scores.\n\nBuild it.',
    },

    /* ══ MIND MASTERY ══════════════════════════════════════════════ */
    {
      id: 'kill-lust-tracker',
      title: 'Kill Lust Tracker',
      pillar: 'mind',
      featured: true,
      difficulty: 'Medium',
      minutes: 15,
      short: 'A clean day counter, an honest record of relapses, and the pattern underneath them.',
      problem: 'You keep restarting from zero and never learn anything from the resets, so the next one arrives the same way.',
      long: 'The app builds itself under the name Clean Days, not this one. What it is called in this library is for finding it; what it is called on your phone is for living with. \n\nA counter alone does not change anything, and neither does shame. What changes it is knowing your own pattern: the time of day, the trigger, the state you were in. This records the relapse without theatre and shows you the pattern over time.\n\nThe tone of this build matters. It is a record, not a judge.',
      prompt: 'I am building a private app called Clean Days, just for me, one user. This message is the full specification. Treat every decision as final and only ask about genuine gaps.\n\nWHAT IT STORES\n- CleanDay: date, whether I stayed clean, urge intensity out of 10, optional note\n- Reset: date and time, what I was feeling beforehand chosen from a short list (bored, stressed, lonely, tired, angry, celebrating, no clear reason), where I was, what I will do differently, optional note\n- Streak records: current run of clean days, longest run ever\n\nHOME SCREEN\n- Current clean days as one very large number, and my longest run underneath it in small text.\n- Today’s check in: did I stay clean, and urge intensity out of 10.\n- A 90 day grid, one square per day, lit for clean days and dark for resets.\n\nTHE PATTERN SCREEN\nThis is the most important screen. From my reset history, show me plainly: the most common feeling beforehand, the most common time of day, the most common day of the week, and my average clean run length over time so I can see whether the runs are getting longer.\n\nWHEN I LOG A RESET\nDo not congratulate me and do not scold me. Show exactly this: "Streak reset." Then ask the two questions, what was I feeling beforehand and what will I do differently, and save the answers. Then return me to the home screen with the counter at zero and my longest run still displayed.\n\nTONE RULES, IMPORTANT\nNo shame language anywhere. No "you failed", no disappointed messaging, no guilt. Equally, no fake celebration, no confetti, no badges, no trophies, no motivational quotes. Neutral, factual, calm. It keeps the record. I do the judging.\n\nSTYLE\nDark theme, near black, high contrast, very minimal, generous space. Phone first. This is opened at bad moments, so it must load fast and feel calm.\n\nWHAT NOT TO ADD\nNo accounts, sharing, community, leaderboards or comparison to anyone else. No notifications. No blocking or filtering features. No advice, no therapy, no diagnosis. If I write something in a note that sounds like a crisis, do not attempt to counsel me.\n\nBuild it.',
      after: 'Set the counter honestly today, even if honest is zero. A real zero beats an invented forty.',
    },
    {
      id: 'dopamine-reset',
      title: 'Dopamine Reset',
      pillar: 'mind',
      difficulty: 'Easy',
      minutes: 12,
      short: 'A fixed-length reset from the cheap inputs, with the days visible and the rules written down.',
      problem: 'You vaguely intend to cut back on short video and games, never define what that means, and nothing changes.',
      long: 'A reset only works if it has an end date and explicit rules you wrote before you started. This holds you to the version of you that set the terms.',
      prompt: 'I am building a private app called Dopamine Reset, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Reset: start date, length in days, the list of things I am cutting out, the list of replacements I committed to\n- DayLog: date, whether I held every rule, which rules I broke, energy and mood out of 10, optional note\n\nHOME SCREEN\n- Day X of Y as one large number, with days remaining underneath.\n- My rules listed plainly, so I cannot pretend I set different ones.\n- A grid of the reset so far, one square per day, lit for a clean day, amber for a partial day, dark for a broken one.\n- My mood and energy scores across the reset as a simple line, so I can see the dip and the recovery.\n\nDAILY CHECK IN\nDid I hold every rule today, which did I break if not, and mood and energy out of 10.\n\nSETUP\nWhen I start a reset I choose a length in days and write my own rules, both what I am cutting and what I am replacing it with.\n\nSTYLE\nDark theme, near black, high contrast, minimal. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No app blocking or screen time integration. No motivational messaging, no badges, no advice.\n\nBuild it.',
    },
    {
      id: 'deep-work-tracker',
      title: 'Deep Work Tracker',
      pillar: 'mind',
      difficulty: 'Easy',
      minutes: 12,
      short: 'Hours of genuinely focused work, logged honestly, against a weekly target.',
      problem: 'You were at your desk for nine hours and could not name one thing you finished.',
      long: 'Time at a desk is not work. This counts only sessions where the phone was away and one thing had your attention, and it makes the weekly total impossible to inflate.',
      prompt: 'I am building a private app called Deep Work, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Session: date, what I worked on in one line, minutes, a focus quality score out of 5, whether my phone was in another room\n- Target: my weekly deep work hours target\n\nHOME SCREEN\n- Hours this week against my target, as one large number and a bar.\n- Today’s sessions listed with what I worked on and how long.\n- My current streak of days with at least one session.\n- A bar per day for the last 28 days showing deep hours, so I can see my real pattern.\n\nLOGGING A SESSION\nEither a timer I start and stop, or a manual entry after the fact. Both ask the same three things: what I worked on, focus quality out of 5, and whether my phone was in another room.\n\nSTYLE\nDark theme, near black, high contrast, big numbers, minimal. Works on desktop as well as phone since it is used at a desk.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No task management, no to-do lists, no project tracking, no integrations, no productivity advice.\n\nBuild it.',
    },
    {
      id: 'morning-routine',
      title: 'Morning Routine',
      pillar: 'mind',
      difficulty: 'Easy',
      minutes: 8,
      short: 'The first ninety minutes, decided in advance and ticked off in order.',
      problem: 'How your morning goes decides your day, and you improvise it every single time.',
      long: 'A sequence you wrote once, in order, that you follow while half awake. The order matters more than the contents.',
      prompt: 'I am building a private app called Morning Routine, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Step: the step in one short line, its order in the sequence, target minutes, whether it is active\n- Morning: date, which steps I completed, the time I actually started\n\nHOME SCREEN\n- My steps in order as large tappable rows. Completed steps go quiet, the next one stands out.\n- One line at the top: "X of Y done", and the time I started today.\n- A 30 day grid, lit when I completed the whole sequence.\n- My current streak of complete mornings.\n\nSETUP\nLet me add, reorder, retime and retire steps.\n\nSTYLE\nDark theme, near black, very high contrast, very large tap targets, almost no text. This is used half asleep with one hand. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing, no notifications, no alarms, no motivational quotes, no advice about what a morning routine should contain.\n\nBuild it.',
    },
    {
      id: 'evening-routine',
      title: 'Evening Routine',
      pillar: 'mind',
      difficulty: 'Easy',
      minutes: 8,
      short: 'The shutdown sequence: tomorrow decided, phone away, day closed.',
      problem: 'Your day never formally ends, so you drift into three hours of scrolling and a late bedtime.',
      long: 'A shutdown sequence draws a line under the day. Most of the benefit is in one step: deciding tomorrow’s first task tonight.',
      prompt: 'I am building a private app called Evening Routine, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Step: the step in one short line, its order, whether it is active\n- Evening: date, which steps I completed, tomorrow’s first task as one line, the time I finished\n\nHOME SCREEN\n- My steps in order as large tappable rows.\n- A required field: tomorrow’s first task, in one line. The sequence is not complete until it is filled in.\n- A 30 day grid lit for complete evenings, and my current streak.\n- On the following day, show me the first task I wrote last night, at the top, before anything else.\n\nSETUP\nStart me with: tidy the space, lay out tomorrow’s clothes, write tomorrow’s first task, phone on charge in another room, read ten pages, lights out. Let me edit, reorder and retire steps.\n\nSTYLE\nDark theme, near black, low glare, high contrast, large tap targets. Used late at night on a phone.\n\nWHAT NOT TO ADD\nNo accounts or sharing, no notifications, no sleep tracking, no motivational quotes, no advice.\n\nBuild it.',
    },

    /* ══ CHARACTER MASTERY ═════════════════════════════════════════ */
    {
      id: 'daily-good-deed',
      title: 'Daily Good Deed',
      pillar: 'character',
      featured: true,
      difficulty: 'Easy',
      minutes: 10,
      short: 'One thing a day for somebody who cannot repay you, written down.',
      problem: 'Self improvement quietly turns inward until the whole project is about you and nobody else benefits from it.',
      long: 'The point of getting stronger, richer and more capable is having more to give. This keeps that honest by asking for one act a day, recorded, for someone who can do nothing for you in return.\n\nIt is deliberately not a streak-first app. The record is the point, not the run.',
      prompt: 'I am building a private app called Daily Good Deed, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Deed: date, what I did in one or two lines, who it was for (a name or a description), whether they could do anything for me in return, optional note about how it went\n\nHOME SCREEN\n- Today’s prompt at the top, plainly stated: "Do something today that benefits somebody who can do nothing for you in return."\n- A single text field to record today’s deed, with a field for who it was for.\n- Deeds this month as a number, and a 30 day grid lit on days I recorded one.\n- Below that, one deed drawn at random from my own history, from more than a month ago, shown as a reminder of something I already did.\n\nHISTORY\nAll deeds in reverse date order, readable as a list. Let me search it.\n\nSTYLE\nDark theme, near black, calm, generous spacing, more editorial and less dashboard than a tracker. The writing area should feel like a page, not a form field. Phone first.\n\nWHAT NOT TO ADD\nNo accounts, sharing, posting or social features. This is never published anywhere. No notifications. No points, badges, levels or leaderboards. No suggestions of good deeds to perform, and no scoring of how good a deed was.\n\nBuild it.',
      after: 'Today’s counts even if it is small. Text the friend you have been meaning to check on.',
    },
    {
      id: 'gratitude-journal',
      title: 'Gratitude Journal',
      pillar: 'character',
      difficulty: 'Easy',
      minutes: 8,
      short: 'Three specific things, daily, with your own past entries resurfacing.',
      problem: 'You are aware you have a lot and you still spend most of the day irritated about what you do not have.',
      long: 'Generic gratitude lists stop working within a week because they get vague. This one demands specificity and shows you your own entries from months ago, which is the part that actually lands.',
      prompt: 'I am building a private app called Gratitude, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Entry: date, three separate things I am grateful for, each with a required one-line reason why\n\nHOME SCREEN\n- Three writing fields for today, each with a second smaller field asking why. The entry cannot be saved with the why fields blank. Specificity is the whole mechanism.\n- Below that, one entry drawn at random from my own history from at least 30 days ago, shown with its date.\n- Entries written this month as a number, and a 30 day grid.\n\nHISTORY\nAll entries in reverse date order, searchable.\n\nSTYLE\nDark theme, near black, calm and editorial, the writing area generous and page-like. Serif or a softer typeface for my own written entries when they are shown back to me. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No prompts or suggestions of what to be grateful for. No scoring, streako badges, points or levels. No AI commentary on what I wrote.\n\nBuild it.',
    },
    {
      id: 'stoic-reflection',
      title: 'Stoic Reflection',
      pillar: 'character',
      difficulty: 'Easy',
      minutes: 10,
      short: 'What was outside your control, what was inside it, and how you actually responded.',
      problem: 'Something goes wrong and you spend two days reacting to it instead of ten minutes separating what you could and could not affect.',
      long: 'A fixed five question structure applied to one event. Doing this regularly changes how you read the next event while it is happening.',
      prompt: 'I am building a private app called Stoic Reflection, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Reflection: date, the event in one line, then answers to five fixed questions\n\nTHE FIVE QUESTIONS, ALWAYS THESE, IN THIS ORDER\n1. What happened that was outside my control?\n2. What was inside my control?\n3. How did I respond?\n4. How could I have responded better?\n5. What can I learn from it?\n\nHOME SCREEN\n- A button to write a new reflection, which opens the five questions on one screen.\n- My last reflection shown underneath, with its date.\n- Reflections written this month as a number.\n\nHISTORY\nAll reflections in reverse date order. Tapping one shows all five answers. Searchable.\n\nSTYLE\nDark theme, near black, calm and editorial, very generous spacing, the questions in a quiet small type and my answers in a larger readable one. This should feel like a notebook, not a form. Phone first, but it must read well on a laptop too.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No quotes from Stoic philosophers, no daily wisdom, no AI analysis of my answers, no scoring, no streaks.\n\nBuild it.',
    },
    {
      id: 'courage-tracker',
      title: 'Courage Tracker',
      pillar: 'character',
      difficulty: 'Easy',
      minutes: 10,
      short: 'One uncomfortable thing a day, chosen and logged.',
      problem: 'Your life has quietly organised itself so that you never have to do anything that scares you.',
      long: 'Confidence is downstream of evidence. This collects evidence: small deliberate acts of discomfort, recorded, with what you expected to happen and what actually happened.',
      prompt: 'I am building a private app called Courage, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Act: date, what I did, category (social, physical, work, honesty, other), how uncomfortable I expected it to be out of 10, how bad it actually was out of 10, what happened\n\nHOME SCREEN\n- A field to log today’s act.\n- The number I have logged this month, and a 30 day grid.\n- The important one: my average expected discomfort against my average actual discomfort, side by side as two numbers. The gap between them is the point of the whole app.\n- One act drawn at random from my own history from over a month ago.\n\nHISTORY\nAll acts in reverse date order, filterable by category.\n\nSTYLE\nDark theme, near black, high contrast, minimal. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No suggestions of what I should do, no challenge library, no dares, no scoring of bravery, no badges or levels.\n\nBuild it.',
    },

    /* ══ WEALTH MASTERY ════════════════════════════════════════════ */
    {
      id: 'daily-income-actions',
      title: 'Daily Income Actions',
      pillar: 'wealth',
      featured: true,
      difficulty: 'Easy',
      minutes: 12,
      short: 'The small number of actions that actually move money, done daily and counted.',
      problem: 'You spend your building time learning, planning and researching, and almost none of it on the two or three things that could actually produce income.',
      long: 'Most people working on money are busy with everything except the thing that moves it. You define your income-producing actions once, and then the only question each day is how many you did.\n\nThis works with any route: content, freelancing, sales, ecommerce, a job. The actions differ, the discipline does not.',
      prompt: 'I am building a private app called Income Actions, just for me, one user. This message is the full specification. Treat every decision as final and only ask about genuine gaps.\n\nWHAT IT STORES\n- Action: the action in one short line, my daily target count for it, whether it is active\n- DayLog: date, how many of each action I completed, optional note\n- Direction: the one business route I am currently committed to, in one line, and the date I committed to it\n\nHOME SCREEN\n- At the very top, small and quiet: my committed direction and how many days I have been on it. This exists to make switching routes a visible act rather than a silent drift.\n- My actions as rows, each with a counter showing today’s count against its target, and a large plus button.\n- One line: "X of Y actions completed today".\n- A 30 day grid, lit when I hit every target that day, amber for partial.\n- Totals for the last 7 and 30 days per action, so I can see volume rather than just streaks.\n\nSETUP\nStart me with these, which I will replace with my own: send 10 outreach messages, make 5 calls, publish 1 piece of content, follow up with 5 previous contacts.\n\nLet me add, edit and retire actions and change their targets. Let me change my committed direction, but when I do, keep a record of the previous one and how long I stayed on it, and show me that history. I want to be able to see my own pattern of switching.\n\nSTYLE\nDark theme, near black, high contrast, big numbers, large tap targets so counting is one tap. Phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No CRM, no lead storage, no contact management, no revenue tracking, no business advice, no suggestions of what business to start.\n\nBuild it.',
      after: 'Set your direction line honestly. If you genuinely do not have one yet, write "undecided" and put a date on when you will choose.',
    },
    {
      id: 'income-tracker',
      title: 'Income Tracker',
      pillar: 'wealth',
      difficulty: 'Medium',
      minutes: 15,
      short: 'Every pound in, from every source, against a target you set.',
      problem: 'You have a vague sense of how you are doing financially and no number you could say out loud.',
      long: 'Track every pound from day one, whatever the amount and whatever stage you are at. The habit of recording is worth more early on than the figures are.',
      prompt: 'I am building a private app called Income Tracker, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Income: date, amount, source, category (job, freelance, content, product, service, other), optional note\n- Target: my monthly income target\n\nHOME SCREEN\n- This month’s total as one large number, against my monthly target as a bar.\n- Last month’s total next to it for comparison.\n- All time total, quietly.\n- A bar per month for the last 12 months.\n- A breakdown of this month by category, so I can see where it is actually coming from.\n- Recent entries listed.\n\nLOGGING\nA short form: amount, source, category, date. Nothing else.\n\nSTYLE\nDark theme, near black, high contrast, big numbers. Should work well on a laptop as well as a phone.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No expenses, no tax calculations, no invoicing, no bank integrations, no financial advice, no projections or forecasts presented as predictions.\n\nBuild it.',
    },
    {
      id: 'idea-vault',
      title: 'Idea Vault',
      pillar: 'wealth',
      difficulty: 'Easy',
      minutes: 10,
      short: 'Somewhere to put ideas so they stop derailing the one you committed to.',
      problem: 'Every new idea feels urgent and pulls you off the thing you started three weeks ago.',
      long: 'The value of this is not capturing ideas. It is having a place to put them so they leave you alone. Ideas get a mandatory cooling period before you are allowed to act on one.',
      prompt: 'I am building a private app called Idea Vault, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Idea: date captured, the idea in a few lines, category, excitement out of 10 at capture, status (parked, reviewing, actioned, discarded), a second excitement score out of 10 recorded later at review\n\nTHE RULE THAT MATTERS\nEvery new idea is captured as parked, and cannot be moved to actioned for 30 days. This is the entire point of the app. Show the days remaining on each parked idea.\n\nHOME SCREEN\n- A large, fast capture field at the top. Writing an idea should take five seconds.\n- Ideas that have passed their 30 day wait and are ready for review, at the top.\n- Parked ideas below, with days remaining.\n- A count of ideas captured, actioned and discarded, all time.\n\nREVIEW\nWhen an idea comes out of its 30 days, ask me for a fresh excitement score out of 10 and show it next to the score I gave at capture. Then let me action or discard it. Seeing excitement drop from 9 to 4 is the lesson.\n\nSTYLE\nDark theme, near black, minimal, the capture field prominent. Phone first, because ideas arrive away from a desk.\n\nWHAT NOT TO ADD\nNo accounts or sharing, no notifications, no AI evaluation of my ideas, no market research, no business advice, no scoring of whether an idea is good.\n\nBuild it.',
    },
    {
      id: 'side-hustle-system',
      title: 'Side Hustle System',
      pillar: 'wealth',
      difficulty: 'Medium',
      minutes: 18,
      short: 'One route, its next five steps, and the hours you are actually putting in.',
      problem: 'You are three weeks into something, unclear on the next step, and quietly considering starting something else.',
      long: 'Structure for whatever route you picked. It holds the direction, the next few concrete steps, the hours logged against it, and the date you started, so abandoning it requires looking at the number of hours you are about to throw away.',
      prompt: 'I am building a private app called Side Hustle System, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Venture: name, the route in one line, date started, current status (active, paused, ended), why I ended it if I did\n- Step: the venture it belongs to, the step in one line, order, done or not\n- WorkLog: date, venture, minutes, what I did\n\nHOME SCREEN\n- My active venture, with days since I started it and total hours logged against it. Make both prominent. They are the cost of quitting.\n- My next five steps, in order, with the next undone one highlighted. Only five are ever shown. When I finish one, I add another.\n- Hours logged this week against a weekly target.\n- Below, quietly: my previous ventures, how long each lasted, how many hours went into each, and why I ended it.\n\nLOGGING\nA short entry: minutes and what I did.\n\nSTYLE\nDark theme, near black, high contrast, minimal. Works on laptop and phone.\n\nWHAT NOT TO ADD\nNo accounts or sharing. No notifications. No business advice, no templates, no suggestions of what venture to start, no market research, no AI strategy.\n\nBuild it.',
    },
    {
      id: 'learning-tracker',
      title: 'Learning Tracker',
      pillar: 'wealth',
      difficulty: 'Easy',
      minutes: 10,
      short: 'What you are learning, and proof you applied it rather than just watched it.',
      problem: 'You consume an enormous amount of instruction and implement almost none of it.',
      long: 'Every piece of learning has to be paired with one thing you actually did with it. Anything you cannot name an application for is marked as consumed, not learned, and the ratio between the two is shown on the home screen.',
      prompt: 'I am building a private app called Learning Tracker, just for me, one user. This message is the full specification. Treat every decision as final.\n\nWHAT IT STORES\n- Item: date, what I learned from in one line (a course, video, book, article), the one thing I took from it, and the application field: one specific thing I did with it, plus the date I did it\n\nTHE MECHANIC THAT MATTERS\nAn item with no application recorded is counted as consumed. An item with an application recorded is counted as learned. On the home screen show both counts for the last 30 days, side by side, with the ratio between them. That ratio is the whole app.\n\nHOME SCREEN\n- Consumed against learned for the last 30 days, as two large numbers.\n- Items awaiting an application, listed, oldest first, as an open loop I can close.\n- Recent items with their applications.\n\nSTYLE\nDark theme, near black, high contrast, minimal, phone first.\n\nWHAT NOT TO ADD\nNo accounts or sharing, no notifications, no recommendations of what to learn, no course library, no note taking features, no AI summaries.\n\nBuild it.',
    },
  ];

  /* ────────────────────────────────────────────────────────────────
     INCLUDED PROGRAMMES. Surfaced by name so a member can see what
     they already own, and mapped to the pillars where their lessons
     belong. Lesson-level content is not modelled yet; when it is, a
     lesson carries a programme and one or more pillar ids rather than
     being duplicated per place it appears.
     ──────────────────────────────────────────────────────────────── */
  var programmes = [
    { id: 'tsm',       name: 'The Stickley Method', pillars: ['appearance'],          note: 'Full programme included.' },
    { id: 'nightfall', name: 'Nightfall',           pillars: ['mind', 'character'],   note: 'Full programme included.' },
    { id: 'impact',    name: 'IMPACT',              pillars: ['wealth'],              note: 'Full programme included.' },
  ];

  /* Lookups used by every page. */
  function pillar(id)     { return pillars.filter(function (p) { return p.id === id; })[0] || null; }
  function build(id)      { return builds.filter(function (b) { return b.id === id; })[0] || null; }
  function byPillar(id)   { return builds.filter(function (b) { return b.pillar === id; }); }
  function firstBuild()   { return builds.filter(function (b) { return b.first; })[0]; }

  return {
    pillars: pillars,
    builds: builds,
    programmes: programmes,
    pillar: pillar,
    build: build,
    byPillar: byPillar,
    firstBuild: firstBuild,
  };
})();
