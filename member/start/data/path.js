/* ══════════════════════════════════════════════════════════════════════
   THE SELF-MASTERY SYSTEM — THE FIRST SEVEN

   The seven-day path, and every prompt in it. Single source of truth:
   no page hardcodes prompt text.

   WHAT THIS IS OPTIMISED FOR, ABOVE EVERYTHING ELSE.
   Base44 measures day-zero and week-one activation: prompts sent on the
   day somebody joins, and again across their first week. So the shape
   is front-loaded and then daily.

     Day 1 ....... 6 prompts   (day zero: one long sitting, real app)
     Days 2-7 .... 6 prompts   (one small build per day)
     Every day ... 1 check-in  (and the app is READ ONLY, so a check-in
                                is itself a message sent to Base44)

   Twelve prompts in seven days, six of them on the first day, plus a
   daily interaction that cannot happen anywhere but inside Base44.

   THE READ-ONLY RULE IS LOAD-BEARING, NOT A SIMPLIFICATION.
   Every prompt forbids forms, input fields and edit buttons. The moment
   a member can tap a number in silently, they stop talking to the
   builder, week-one activation goes to zero, and the subscription is
   the first thing cancelled. Do not relax it.

   PROMPT HOUSE STYLE. One message, sent whole. State the data, state
   the layout, state what NOT to add. A prompt that leaves decisions
   open comes back as ten clarifying questions, and the member quits.

   Questions carry {{id}} into the template. Anything the member does
   not answer is dropped from the message rather than sent as an empty
   line, so a half-filled form still produces a clean prompt.
══════════════════════════════════════════════════════════════════════ */

window.PATH = (function () {

  /* Shared tail. Every build message ends with the same three blocks so
     Base44 never invents accounts, notifications or a settings page. */
  var STYLE =
    'STYLE\n' +
    'Dark theme, near black background, high contrast, generous spacing, minimal. ' +
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

  var DAYS = [

    /* ══ DAY 1 ═══════════════════════════════════════════════════════
       The whole point of day zero. Six messages, one sitting, and a
       published app at the end of it. Long on purpose: this is the only
       build most members will ever do while paying attention, and a
       failure here loses them for good.
       ═════════════════════════════════════════════════════════════ */
    {
      n: 1,
      eyebrow: 'Day One',
      title: 'The Standard',
      minutes: 45,
      summary: 'Build the dashboard that runs the five areas you actually control.',
      why: 'Not a demo and not a template. One private app with a room for your body, your mind, your appearance, your character and your money, and a grid that keeps score. By the end of today it is published, it has your real numbers in it, and it is the thing everything else in this system hangs off.',
      steps: [
        { b: 'Open Base44 and sign in', s: 'Use the same email you joined with. Find the Plan / Build toggle next to the send button.' },
        { b: 'Send message one in Plan mode', s: 'It is the entire spec. Read the plan it gives back, then hit Start Building.' },
        { b: 'Publish it, and set it to private', s: 'Top right of the builder. You are publishing an empty shell and that is the point.' },
        { b: 'Fill one room at a time', s: 'Five more messages, each in Build mode. Answer the questions here first and the prompt writes itself.' },
        { b: 'Paste your app link at the bottom', s: 'That is what opens Day Two.' },
      ],
      submit: true,
      messages: [
        {
          mode: 'PLAN',
          label: 'The spec',
          note: 'Switch to Plan mode before you send this one. If no plan comes back, hit Skip Plan and continue.',
          text:
'I am building my Self-Mastery System. A private dashboard that runs the areas of my life I actually control. This message is the full spec. Plan it with me before you build anything, and treat every decision below as final so you only ask me about real gaps.\n\n' +
'WHAT IT IS\n' +
'One private app. Single user, just me. A home dashboard plus five rooms: Body, Mind, Appearance, Character, Wealth.\n\n' +
'WHAT IT STORES\n' +
'- DailyLog: date, which of my daily promises I kept, one line about the day\n' +
'- Standard: the area (Body, Mind, Appearance, Character or Wealth), what I am holding myself to in one line, the number or target attached to it\n' +
'- Record: the area, the date, the thing measured, the value\n' +
'- WhyItem: who or what this is for, one line about them\n\n' +
'LAYOUT\n' +
'- Home, top to bottom: a 30 day streak grid built from DailyLogs, then my current streak as one large number, then one freshness badge per room, then a Why panel at the bottom.\n' +
'- A freshness badge shows days since that room last got a record: 0 to 1 green, 2 to 3 amber, 4 or more red.\n' +
'- Each room shows its standards and its recent records as a card grid. Big numbers, small labels.\n' +
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
        {
          mode: 'BUILD', label: 'Body',
          questions: [
            { id: 'trained', label: 'Days you actually trained in the last 7', hint: 'Not the plan. The number.', ph: '2' },
            { id: 'target', label: 'Your training target per week', ph: '4' },
            { id: 'counts', label: 'What counts as training for you', ph: 'Gym, or a run over 3km' },
            { id: 'sleep', label: 'Hours of sleep you average right now', ph: '6' },
            { id: 'foodrule', label: 'The food rule you break most', ph: 'Nothing until 3pm, then everything after 10' },
          ],
          text:
'Fill in the Body room of my Self-Mastery System. Same rules as before: read only, no forms, no input fields, chat is the only way data enters.\n\n' +
'MY NUMBERS\n' +
'- Trained {{trained}} of the last 7 days, against a target of {{target}} per week\n' +
'- What counts as training for me: {{counts}}\n' +
'- I average {{sleep}} hours of sleep\n' +
'- The food rule I break most: {{foodrule}}\n\n' +
'SHOW ME\n' +
'Training days this week against my target as the big number. Sleep average underneath. My food rule written plainly where I have to read it. A seven day strip showing which days I trained.\n\n' + STYLE + NEVER,
        },
        {
          mode: 'BUILD', label: 'Mind',
          questions: [
            { id: 'broken', label: 'The promise to yourself you break most often', ph: 'Getting up at 6' },
            { id: 'leak', label: 'Your biggest time leak', ph: 'Short video, about 3 hours a day' },
            { id: 'block', label: 'When your focused hour will happen, every day', ph: '7pm, phone in the kitchen' },
            { id: 'killing', label: 'The habit you are killing this month', ph: 'Scrolling in bed' },
          ],
          text:
'Fill in the Mind room of my Self-Mastery System. Same rules: read only, no forms, chat only.\n\n' +
'MY NUMBERS\n' +
'- The promise I break most: {{broken}}\n' +
'- My biggest time leak: {{leak}}\n' +
'- My daily focused block: {{block}}\n' +
'- The habit I am killing this month: {{killing}}\n\n' +
'SHOW ME\n' +
'My focused block with its time, large, at the top of the room. The leak priced next to it in hours per week so I can see the trade. The habit I am killing with a count of days since I last did it.\n\n' + STYLE + NEVER,
        },
        {
          mode: 'BUILD', label: 'Appearance',
          questions: [
            { id: 'morning', label: 'Your morning routine, one step per line', hint: 'Keep it to things you will do on a bad day.', ph: 'Wash face\nMoisturise\nSPF\nBrush and floss', area: true },
            { id: 'evening', label: 'Your evening routine, one step per line', ph: 'Wash face\nMoisturise\nLay out tomorrow\'s clothes', area: true },
            { id: 'overdue', label: 'The appearance job most overdue right now', ph: 'Haircut, about 5 weeks' },
          ],
          text:
'Fill in the Appearance room of my Self-Mastery System. Same rules: read only, no forms, chat only.\n\n' +
'MY MORNING ROUTINE\n{{morning}}\n\n' +
'MY EVENING ROUTINE\n{{evening}}\n\n' +
'OVERDUE\n{{overdue}}\n\n' +
'SHOW ME\n' +
'Both routines as lists with a count of how many steps I completed today. A 30 day grid lit on days I completed both. The overdue job in red at the top until I tell you it is done.\n\n' + STYLE + NEVER,
        },
        {
          mode: 'BUILD', label: 'Character',
          questions: [
            { id: 'who', label: 'Who this is actually for', hint: 'Mum, your brother, your kids someday, you at 40.', ph: 'My mum and my younger brother' },
            { id: 'changes', label: 'What changes for them when this works', ph: 'She stops doing night shifts' },
            { id: 'deed', label: 'One thing you could do this week for someone who cannot repay you', ph: 'Call my grandad properly, not a text' },
          ],
          text:
'Fill in the Character room of my Self-Mastery System. Same rules: read only, no forms, chat only.\n\n' +
'MY ANSWERS\n' +
'- Who this is for: {{who}}\n' +
'- What changes for them when it works: {{changes}}\n' +
'- One thing I can do for somebody who cannot repay me: {{deed}}\n\n' +
'SHOW ME\n' +
'A count of deeds recorded this month as the big number, and a 30 day grid lit on the days I recorded one. Underneath, the names of the people this is for. No scoring of how good a deed was, and never publish any of this anywhere.\n\n' + STYLE + NEVER,
        },
        {
          mode: 'BUILD', label: 'Wealth',
          questions: [
            { id: 'income', label: 'Your income right now, per month', hint: 'A range is fine. Rough beats blank.', ph: 'About 1,400' },
            { id: 'target', label: 'The number that would change something in the next 90 days', ph: '3,000 a month' },
            { id: 'unlocks', label: 'What hitting it actually unlocks', ph: 'Move out' },
            { id: 'direction', label: 'The one direction you are committing to', hint: 'If you genuinely have not chosen, write undecided and a date you will decide by.', ph: 'Video editing for local gyms' },
          ],
          text:
'Fill in the Wealth room of my Self-Mastery System. Same rules: read only, no forms, chat only.\n\n' +
'MY NUMBERS\n' +
'- Income right now: {{income}} per month\n' +
'- My 90 day target: {{target}}\n' +
'- What hitting it unlocks: {{unlocks}}\n' +
'- The direction I am committed to: {{direction}}\n\n' +
'SHOW ME\n' +
'My 90 day target as the big number with a progress bar against it, and what it unlocks written right beside it. My committed direction at the top of the room with a count of days since I committed. If I ever change that direction, keep a record of the old one and how long I stayed on it, and show me that history. I want to see my own pattern of switching.\n\n' + STYLE + NEVER,
        },
      ],
    },

    /* ══ DAYS 2-7 ═══════════════════════════════════════════════════
       One small build a day. Each one makes the app more useful and,
       more importantly, requires opening Base44 again.
       ═════════════════════════════════════════════════════════════ */
    {
      n: 2,
      eyebrow: 'Day Two',
      title: 'The Promises',
      minutes: 15,
      summary: 'Give the streak grid teeth. Five promises, checked once a day.',
      why: 'Yesterday you built a scoreboard. Today it gets something to score. Pick five promises small enough to keep on a bad day, because the version of you that matters here is the tired one. The motivated one was never the problem.',
      steps: [
        { b: 'Answer the five below', s: 'One per area. Small enough that a terrible day does not break them.' },
        { b: 'Send the prompt in Build mode', s: 'Open your app in the builder first.' },
        { b: 'Mark today honestly', s: 'Even if today was bad. A red first day beats a blank one.' },
      ],
      checkin: true,
      messages: [
        {
          mode: 'BUILD', label: 'The promises engine',
          questions: [
            { id: 'body', label: 'Body promise', ph: 'Train, or walk 8,000 steps' },
            { id: 'mind', label: 'Mind promise', ph: 'One hour focused, phone in another room' },
            { id: 'appearance', label: 'Appearance promise', ph: 'Full evening routine' },
            { id: 'character', label: 'Character promise', ph: 'One thing for someone else' },
            { id: 'wealth', label: 'Wealth promise', ph: 'One income-producing action' },
          ],
          text:
'Add the promises engine to my Self-Mastery System. Nothing else changes and the design stays as it is.\n\n' +
'MY FIVE DAILY PROMISES\n' +
'- Body: {{body}}\n' +
'- Mind: {{mind}}\n' +
'- Appearance: {{appearance}}\n' +
'- Character: {{character}}\n' +
'- Wealth: {{wealth}}\n\n' +
'HOW IT WORKS\n' +
'On the home screen, above the streak grid, show my five promises as large rows grouped by area, with one line reading "X of 5 kept" for today. A day on the streak grid lights when I kept all five, goes amber when I kept some, and stays dark when I kept none or said nothing.\n\n' +
'ONE KINDNESS: one missed day in a week marks amber, not dead. Two missed days in a row is not life any more, it is a decision, and the grid should be honest about that.\n\n' +
'I mark my promises by telling you in chat, the same as everything else.\n\n' + STYLE + NEVER,
        },
      ],
    },

    {
      n: 3,
      eyebrow: 'Day Three',
      title: 'Your Why',
      minutes: 15,
      summary: 'The shortest build. The one that gets you through week seven.',
      why: 'Discipline gets you through week one. It does not get you through week seven, when the grid has an ugly gap and none of this feels like it is working. What gets you through is remembering who loses if you fold. Write it like nobody is grading it, because nobody is.',
      steps: [
        { b: 'Answer honestly', s: 'This is private. One reader: you, on a bad morning.' },
        { b: 'Send it in Build mode', s: 'It goes on your home screen where you cannot avoid it.' },
      ],
      checkin: true,
      messages: [
        {
          mode: 'BUILD', label: 'The Why panel',
          questions: [
            { id: 'people', label: 'The people this is for', ph: 'My mum, my brother, me at 40' },
            { id: 'text', label: 'The message you would send them the day it works, word for word', area: true, ph: 'Mum, you can hand your notice in.' },
            { id: 'cost', label: 'If you quit this like you have quit things before, the honest cost is', area: true, ph: 'Another year exactly like the last one.' },
            { id: 'line', label: 'When you go quiet for days, the line you want thrown at you', hint: 'In your own words. Write the one that would actually move you — you will hear it again.', ph: 'You said this time was different.' },
          ],
          text:
'Add a Why panel to the home screen of my Self-Mastery System. Nothing else changes.\n\n' +
'WHAT GOES IN IT\n' +
'- The people this is for: {{people}}\n' +
'- The message I would send them the day it works: {{text}}\n' +
'- The honest cost if I quit: {{cost}}\n' +
'- The line I want thrown at me when I go quiet: {{line}}\n\n' +
'HOW IT SHOWS\n' +
'The panel sits at the bottom of my home screen, always visible, quiet and readable rather than loud. When my streak grid has two or more dark days in a row, show the line I wrote at the top of the panel instead of the bottom. Do not soften it, do not rewrite it, and do not add anything of your own to it.\n\n' + STYLE + NEVER,
        },
      ],
    },

    {
      n: 4,
      eyebrow: 'Day Four',
      title: 'The Weekly Review',
      minutes: 10,
      summary: 'Teach the app to read itself and tell you the truth.',
      why: 'Until now your dashboard shows what you told it. This makes it read its own records and hand you the honest version of your week, including the date you land on at your current pace. That last line is the app doing what nobody else in your life will do for free.',
      steps: [
        { b: 'Open your app in the builder, Build mode', s: 'No questions today. The prompt is ready.' },
        { b: 'Send it and let it cook', s: 'This one takes a few minutes. Do not resend and do not refresh.' },
        { b: 'If it asks for tool permissions, grant them', s: 'It needs them to read its own data. If it never asks, you are fine.' },
      ],
      checkin: true,
      messages: [
        {
          mode: 'BUILD', label: 'The review button',
          note: 'No questions on this one. Copy it as it is.',
          text:
'Add ONE feature to my Self-Mastery System and nothing else: a WEEKLY REVIEW button on the home dashboard.\n\n' +
'When I press it, compile my last 7 days into one review card:\n' +
'- Promises kept, out of the total possible\n' +
'- Training days against my target\n' +
'- Sleep average\n' +
'- Which of the five rooms went a full week with no record\n' +
'- One honest sentence about the week I actually had\n\n' +
'At the bottom of the card, a REALITY CHECK line: compare my actual pace this week against my 90 day target and state plainly the date I land on at this pace. No sugarcoating and no encouragement.\n\n' +
'Triggered only by me pressing the button. Nothing automatic, no scheduled summaries, no messages pushed at me. Keep the design exactly as it is and change nothing else.\n\n' + NEVER,
        },
      ],
    },

    {
      n: 5,
      eyebrow: 'Day Five',
      title: 'The Coach',
      minutes: 20,
      summary: 'Put the app in your pocket. Text it one line a day and the board writes itself.',
      why: 'This is the one that decides whether any of this survives past next Thursday. Two messages: one builds an agent that knows your standards, the second puts it in the chat app you already open forty times a day.',
      steps: [
        { b: 'Answer the two questions', s: 'Your check-in time, and who you are doing this for.' },
        { b: 'Send message one, then message two', s: 'Both in Build mode. Both take a few minutes.' },
        { b: 'Connect a channel', s: 'In the agent settings find Channels, connect WhatsApp or Telegram, follow the steps.' },
        { b: 'Then do two dumb things that matter', s: 'Pin the chat to the top of WhatsApp, and set a repeating phone reminder at your check-in time. They feel stupid. They are the machine.' },
      ],
      checkin: true,
      messages: [
        {
          mode: 'BUILD', label: 'Build the agent',
          questions: [
            { id: 'time', label: 'Your daily check-in time', hint: 'When you will actually have thirty seconds. Not when you wish you would.', ph: '9pm' },
            { id: 'people', label: 'Who you are doing this for, as you want to be reminded of them', ph: 'My mum and my brother' },
          ],
          text:
'Add an agent to my Self-Mastery System called The Coach.\n\n' +
'WHAT IT DOES\n' +
'At {{time}} every day it messages me and asks for my five promises in one line, plus anything else I want to log. It writes my answer into today\'s DailyLog, lights or marks today on the streak grid, and replies with my day number and a three word verdict. Nothing longer.\n\n' +
'I must be able to reply in plain English, in any order, in one message. "trained, hour done, no porn, called my nan, sent 5 messages" should parse correctly. A voice note should work the same way.\n\n' +
'IF I GO QUIET\n' +
'After two days with no reply, its next message opens with who I am doing this for: {{people}}. Then the line I wrote in my Why panel, exactly as I wrote it. Then it asks for my numbers as normal. No lecture, no guilt, no motivational writing of its own.\n\n' +
'ON SUNDAY\n' +
'If I text it the single word Sunday, it compiles my week, marks the silent days as missed, and hands me one honest sentence about it.\n\n' +
'Nothing else changes and the design stays as it is.\n\n' + NEVER,
        },
        {
          mode: 'BUILD', label: 'Put it in your pocket',
          note: 'Send this after the first one finishes.',
          text:
'Make The Coach reachable from my phone.\n\n' +
'Set the agent up so I can message it from an outside chat app rather than only inside the builder. Walk me through connecting a channel step by step, and tell me exactly where to find it in the agent settings.\n\n' +
'Once it is connected, send me a test message so I know it works, then confirm that my reply landed in today\'s DailyLog and lit today on the streak grid.\n\n' +
'Change nothing else about the app.',
        },
      ],
    },

    {
      n: 6,
      eyebrow: 'Day Six',
      title: 'Go Deep',
      minutes: 15,
      summary: 'Pick the one area that matters most right now and build it out properly.',
      why: 'Five rooms at equal depth is a compromise. One of these is the thing actually holding you back this month, and it deserves more than a card. Pick it and give it the detail it needs. You can do this again for any other room later.',
      steps: [
        { b: 'Pick one area', s: 'The one that is genuinely in the way, not the one that sounds best.' },
        { b: 'Say what you want it to track', s: 'Be specific. Vague input here produces a vague room.' },
        { b: 'Send it in Build mode', s: 'One message.' },
      ],
      checkin: true,
      messages: [
        {
          mode: 'BUILD', label: 'Expand one room',
          questions: [
            { id: 'area', label: 'Which area', hint: 'Body, Mind, Appearance, Character or Wealth.', ph: 'Mind' },
            { id: 'track', label: 'What it needs to track in detail, one per line', area: true, ph: 'Clean days\nUrge strength out of 10\nWhat I was feeling before a reset' },
            { id: 'number', label: 'The one number you want big at the top of that room', ph: 'Current clean days' },
          ],
          text:
'Expand the {{area}} room of my Self-Mastery System. Every other room stays exactly as it is.\n\n' +
'WHAT THIS ROOM NEEDS TO TRACK\n{{track}}\n\n' +
'THE NUMBER THAT MATTERS\n' +
'{{number}}, large, at the top of the room.\n\n' +
'ALSO SHOW\n' +
'A 30 day grid for this room specifically, and a history list in reverse date order so I can look back at what actually happened. If the records contain a pattern worth seeing, such as the same trigger or the same day of the week recurring, show me that plainly as a fact. Do not interpret it for me and do not give me advice about it.\n\n' + STYLE + NEVER,
        },
      ],
    },

    {
      n: 7,
      eyebrow: 'Day Seven',
      title: 'The First Review',
      minutes: 10,
      summary: 'Press the button. Read what it says. Decide what changes.',
      why: 'No build today. You have a working system, a week of real records, and an app that will tell you the truth about them. The only thing left is to sit with what it says for ten minutes, which is the part almost nobody does.',
      steps: [
        { b: 'Open your app and press Weekly Review', s: 'Read the whole card, especially the honest sentence and the reality check date.' },
        { b: 'Read it out loud', s: 'Sounds stupid. Works.' },
        { b: 'Write down what changes next week', s: 'One thing. Not five.' },
        { b: 'Text The Coach the word Sunday', s: 'Whichever day it actually is. See what comes back.' },
      ],
      checkin: true,
      review: true,
      messages: [],
    },
  ];

  function day(n) {
    n = parseInt(n, 10);
    return DAYS.filter(function (d) { return d.n === n; })[0] || null;
  }
  function totalPrompts() {
    return DAYS.reduce(function (t, d) { return t + d.messages.length; }, 0);
  }

  /* What finishing the week opens. Shown locked from the first screen:
     the ladder is the offer, so it is never hidden. */
  var UNLOCKS = [
    { id: 'community', title: 'The Community',        sub: 'Private chat with everyone else doing this' },
    { id: 'calls',     title: 'Weekly call with Baby', sub: 'Live, every week, questions answered' },
    { id: 'library',   title: 'The Build Library',     sub: 'Every other tool you can add to your system' },
    { id: 'protocol',  title: "Baby's Protocol",       sub: 'What he actually does right now' },
  ];

  return { days: DAYS, day: day, totalPrompts: totalPrompts, unlocks: UNLOCKS };
})();
