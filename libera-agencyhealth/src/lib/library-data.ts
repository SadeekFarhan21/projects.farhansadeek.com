// ── Library section static data ──

// Strip guided-script annotations like [10 sec], [pause] before TTS
export function stripAnnotations(text: string): string {
  return text.replace(/\[[\w\s/]+\]/g, '').replace(/  +/g, ' ').trim();
}

// Lowercase first char — answers slot mid-sentence
const lc = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// ── Suggestion cards (mock biometric) ──
export interface SuggestionCard {
  icon: string;
  tint: string;
  title: string;
  reason: string;
  duration: string;
  sectionId: string; // scrolls to this section id
}

export const SUGGESTION_CARDS: SuggestionCard[] = [
  {
    icon: 'air',
    tint: 'text-secondary',
    title: 'Physiological Sigh',
    reason: 'Your HRV dropped 12% in the last hour.',
    duration: '2 min',
    sectionId: 'breathwork',
  },
  {
    icon: 'self_improvement',
    tint: 'text-primary',
    title: 'Breath-Watching',
    reason: "You've been screen-on for 90 minutes.",
    duration: '7 min',
    sectionId: 'meditation',
  },
  {
    icon: 'visibility',
    tint: 'text-tertiary',
    title: 'The Earned Moment',
    reason: 'Confidence score below baseline today.',
    duration: '5 min',
    sectionId: 'eft',
  },
  {
    icon: 'directions_walk',
    tint: 'text-tertiary',
    title: 'Step Outside',
    reason: 'Natural light resets cortisol patterns.',
    duration: '10 min',
    sectionId: '',
  },
];

// ── Breathwork cards ──
export interface BreathworkCard {
  id: string;
  tag: string;
  tagColor: string;
  duration: string;
  title: string;
  description: string;
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
  cycles: number;
  instruction: string;
  doubleInhale?: boolean;
}

export const BREATHWORK_CARDS: BreathworkCard[] = [
  {
    id: 'cyclic-sighing',
    tag: 'MOOD BOOST',
    tagColor: 'text-secondary',
    duration: '2 min',
    title: 'Cyclic / Physiological Sighing',
    description:
      'Cyclic sighing (double inhale through nose + long slow exhale through mouth) outperformed mindfulness meditation and two other breathing techniques for improving mood and reducing respiratory rate. It is the single most evidence-backed technique for rapid mood improvement.',
    inhale: 3,
    holdIn: 0,
    exhale: 8,
    holdOut: 0,
    cycles: 8,
    instruction: 'Double inhale through the nose (sniff, then fill), then one long, slow exhale through the mouth.',
    doubleInhale: true,
  },
  {
    id: '4-7-8',
    tag: 'CALMING',
    tagColor: 'text-primary',
    duration: '2 min',
    title: '4:7:8 Ratio Breathing',
    description:
      'Extended exhale ratio (exhale is twice the inhale) produces a strong parasympathetic response. The long hold after inhale adds a hypoxic component that deepens the calming effect.',
    inhale: 4,
    holdIn: 7,
    exhale: 8,
    holdOut: 0,
    cycles: 4,
    instruction: 'Inhale for 4 counts. Hold for 7. Exhale slowly for 8.',
  },
  {
    id: '2-1-ratio',
    tag: 'ENERGIZING',
    tagColor: 'text-tertiary',
    duration: '2 min',
    title: '2:1 Inhale Ratio',
    description:
      'Breathing with an inhale twice as long as the exhale (e.g. 6 seconds in, 3 seconds out) is the physiological inverse of the calming long-exhale pattern.',
    inhale: 6,
    holdIn: 0,
    exhale: 3,
    holdOut: 0,
    cycles: 8,
    instruction: 'Inhale for 6 counts. Exhale for 3. Keep it rhythmic.',
  },
  {
    id: 'belly',
    tag: 'CALM-ALERT',
    tagColor: 'text-primary',
    duration: '2 min',
    title: 'Belly Breathing',
    description:
      'By placing one hand on the chest and another on the stomach, you can practice by inhaling deeply through the nose, making your belly rise, and exhaling slowly through pursed lips, causing the belly to sink.',
    inhale: 4,
    holdIn: 0,
    exhale: 6,
    holdOut: 0,
    cycles: 8,
    instruction: 'One hand on chest, one on belly. Breathe into the belly — chest stays still.',
  },
  {
    id: '5-per-min',
    tag: 'CALM-ALERT',
    tagColor: 'text-primary',
    duration: '7 min',
    title: '5 Breaths per Minute',
    description:
      'Breathing at a rate of 5 breaths per minute (roughly 6 seconds in, 6 seconds out) maximises HRV by synchronising breath with the Mayer wave of blood pressure. It produces a calm-alert state.',
    inhale: 6,
    holdIn: 0,
    exhale: 6,
    holdOut: 0,
    cycles: 35,
    instruction: '6 seconds in through the nose, 6 seconds out through the mouth. Steady and even.',
  },
];

// ── Meditation scripts ──
export interface MeditationScript {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  durations: number[];
  script: string;
}

export const MEDITATION_SCRIPTS: MeditationScript[] = [
  {
    id: 'breath-watching',
    title: 'Breath-Watching',
    subtitle: 'Foundational awareness',
    icon: 'air',
    durations: [7, 12, 15],
    script: `Find a comfortable position — sitting with your back reasonably upright, or lying down if that works better. Let your eyes close. Take a moment just to arrive. There's no particular state you're aiming for. Just this room, this body, this moment.

Now, gently let your awareness rest on the breath. Not changing it — just noticing it. It might be most present at the nostrils, where the air comes in and goes out. Or in the chest, or the belly. Wherever you feel it most naturally — let your awareness settle there.

Just watching the breath as it is. Each inhale. Each exhale. The natural pause in between.

There's nothing to do here except stay with this. When you can feel the breath, you're doing it exactly right.

At some point — maybe soon, maybe you already have — the mind will wander. A thought, a feeling, a memory, a plan. This is completely normal. This is what minds do. When you notice you've drifted, just gently return to the breath. No frustration, no hurry. Just — here, the breath, again.

That moment of noticing and coming back — that is the whole practice. Not a failure. The exercise itself.

Each breath is slightly different from the last. The depth. The temperature of the air. You don't need to analyse any of it. Just staying close.

Nothing to achieve. Nowhere to get to.

When you're ready, let your awareness widen gently. A slightly deeper breath. Feel the weight of your body in the room. And open your eyes whenever it feels right.`,
  },
  {
    id: 'nsdr',
    title: 'NSDR / Body Scan',
    subtitle: 'Deep rest protocol',
    icon: 'bedtime',
    durations: [7, 12, 15],
    script: `This is a practice of deep rest — not necessarily sleep, though sleep may come. The intention is simply to allow the body to rest completely while awareness stays gently present. Lie down if you can. Arms a little away from the body. Let everything go heavy.

Close your eyes. Take a moment to let go of what came before, and what comes after. Just here.

Become aware of your body as a whole — the full weight and warmth of it, resting here. You don't need to do anything. The surface is holding you.

We'll move slowly through the body. There's nothing to do except let your awareness rest briefly in each place. Not trying to relax anything — just noticing.

The feet. Both feet at once — toes, soles, heels. Whatever is there.

The lower legs. Calves, shins.

The knees. The upper legs, front and back. The full length of both legs, heavy.

The hips. The lower back resting against the surface. The belly, rising and falling.

The chest. The slow movement of breathing. The heart beating, somewhere inside.

The hands — each finger, the palms. The arms all the way up to the shoulders. Letting the shoulders rest heavy.

The throat. The jaw — letting it be loose. The tongue resting. The eyes behind closed lids, soft.

The forehead. The back of the head, heavy against the surface.

Now the whole body at once. Heavy, warm, resting.

You don't need to do anything. The body knows how to rest. Let it.

If thoughts come through, let them pass without following them. You're not asleep — just resting, deeply, while something in you stays quietly aware.

When you're ready to return, deepen the breath a little. Move the fingers and toes. Take your time. There's no hurry. And open your eyes when it feels right.`,
  },
  {
    id: 'gratitude',
    title: 'Gratitude Cultivation',
    subtitle: 'Warmth and appreciation',
    icon: 'favorite',
    durations: [7, 12, 15],
    script: `Find a comfortable position. Let your eyes close. Take a breath or two, just to arrive.

This practice moves slowly — starting very close to where you are right now, and widening outward. There's no right way to feel. Whatever is genuinely here is enough.

What is immediately here: Begin close in. Right now, in this moment — what is okay? Not looking for anything grand. The smallest things. Perhaps the air in the room. The fact of breathing. The temperature — warmth or coolness, whatever it is. The surface holding you.

Don't just note these things — let yourself actually feel something for them. Even a faint warmth or appreciation.

Perhaps the fact of this moment of quiet. That you've set this time aside.

The body: Turn a moment of appreciation toward the body. Not what it looks like — just that it's here, carrying you. That it breathes without being asked. That the heart keeps going. That it holds everything you've ever experienced.

If any warmth arises in the chest, let it settle there.

A person: Let someone come to mind — someone who has been kind to you, in a large way or a small one. It might be someone close to you now, or someone from long ago. A teacher, a friend, someone who said the right thing once.

Let their face or presence come into your awareness. Let something specific come — a moment, something they did or said.

Let yourself feel the gratitude for that. Not performing it — just allowing it. Warm it gently, the way you'd warm your hands.

A place: Now let a place come to mind. Somewhere that has held you in some way — a home, a landscape, somewhere in nature, a room. Somewhere that meant something.

Let yourself be there for a moment. What does it look, feel, smell like? What did it give you? Places hold us in ways we rarely acknowledge.

Opening out: Let the feeling of gratitude widen now, without needing to attach it to any one thing. Just a quality of warmth. The fact of being alive. Of having had moments that mattered. Of there being kindness in the world.

A quiet recognition. Yes. This.

When you're ready, take a slightly deeper breath. Let the awareness return to the room. Open your eyes whenever it feels right.`,
  },
  {
    id: 'noticing',
    title: 'Noticing',
    subtitle: 'Open awareness practice',
    icon: 'visibility',
    durations: [7, 12, 15],
    script: `Find a position that's comfortable — sitting or lying down. Let your eyes close gently. Take a moment to arrive. You don't need to do anything just yet. Just let the body settle where it is.

Sound: Let your awareness open to whatever sounds are here — near or far, loud or faint. You don't need to identify them. Just let them arrive. Notice how sounds come to you without any effort on your part. You're not reaching out — they're just here.

If you find yourself lost in thought, that's fine — just come back to listening.

Touch: Now let your awareness settle into the physical body. The feeling of your weight. Pressure. Heaviness. Lightness. The temperature of the air on your skin. Any areas of warmth or coolness. The texture of clothing, or a surface. Just noticing. Nothing to change.

Smell and taste: A gentle check — is there any scent in the air? Perhaps something faint, perhaps nothing at all. And in the mouth — any trace of taste? Just a moment of noticing, whatever is or isn't there.

The body: Now let your awareness move inward. Not looking for anything specific — just seeing what's there. Perhaps a sense of your heartbeat. Warmth or movement in the chest or belly. Any subtle pulses, tinglings, sensations that are usually too quiet to notice. These are always here. You just rarely have the stillness to feel them.

Thoughts and feelings: Now open your awareness to the mind itself. Thoughts arising — words, images, plans, memories. You don't need to follow them or push them away. Just notice them appear and pass, the way you'd watch clouds. You might notice an emotional quality — a mood or feeling underneath everything. Just acknowledging it's there.

And if you've been carried away by a thought and only just noticed — welcome back. That moment of noticing is the whole practice.

Open awareness: Now let go of moving your attention from one thing to another. Just open awareness — the space in which all of this has been happening. Sounds, sensations, thoughts — all arising and passing in the same quiet space. You don't need to hold on to anything, or let anything go. Nothing to do. Nowhere to go.

Just this.

Coming back: When you're ready, let your awareness return gently to the room. Take a slightly deeper breath. Feel your hands and feet. And when it feels right, open your eyes.`,
  },
];

// ── Library EFT configs ──
export interface LibraryEftConfig {
  id: string;
  title: string;
  target: string;
  tagColor: string;
  prompt: string;
  inputs: string[];
  buildPlayback: (answers: string[]) => string;
}

export const LIBRARY_EFT_CONFIGS: LibraryEftConfig[] = [
  {
    id: 'earned-moment',
    title: 'The Earned Moment',
    target: 'Confidence · Pride · Capability',
    tagColor: 'text-tertiary',
    prompt: `Close your eyes. Take a breath. We're going to visit a moment in your future — about a year from now. This isn't a fantasy. It's a real possibility that exists somewhere ahead of you.

You've just finished something. Something that mattered. You're sitting quietly now — or standing, or walking — and there's a feeling in your chest. Not loud. Just there.

Be there for a moment.`,
    inputs: [
      'What did you do?',
      'Where are you right now?',
      'What does your body feel like?',
      'What is the feeling in your chest?',
    ],
    buildPlayback: ([a = '', b = '', c = '', d = '']) =>
      `A year from now, you've just ${lc(a) || '…'}. You're ${lc(b) || '…'}.\n\nYour body — ${lc(c) || '…'}. And what you feel in your chest — ${lc(d) || '…'}.\n\nYou don't need to tell anyone right now. You know what this took. You know what you had to move through to get here. And sitting in that quiet, what you feel isn't relief that it's over — it's something steadier than that. A kind of knowing. That you can do this. That you did.\n\nThat feeling is real. It exists. It's waiting for you.`,
  },
  {
    id: 'lighter-you',
    title: 'The Lighter You',
    target: 'Freedom · Release · Agency',
    tagColor: 'text-secondary',
    prompt: `Close your eyes. Take a breath — and on the exhale, let something go. Not anything specific. Just a little weight.

A year from now, something has shifted. Something that used to take up space inside you — it's no longer there in the same way. You're not sure exactly when it changed. But it has.

Just arrive in that.`,
    inputs: [
      'What specific thing do you do differently now?',
      'What does your body feel like physically?',
      'What became possible because of this?',
    ],
    buildPlayback: ([a = '', b = '', c = '']) =>
      `A year from now, something has shifted. You move differently. You ${lc(a) || '…'}.\n\nAnd in your body, there's ${lc(b) || '…'}.\n\nWhat's become possible is ${lc(c) || '…'}.\n\nThat's not a small thing. That's the whole thing. The path to that starts from exactly where you are now. And the version of you that got there didn't do anything magical — they just kept going, a little differently, one day at a time.\n\nThat lighter version of you is real.`,
  },
  {
    id: 'truly-seen',
    title: 'Truly Seen',
    target: 'Belonging · Connection · Mattering',
    tagColor: 'text-primary',
    prompt: `Close your eyes. Take a moment to settle. This one is about connection. About being with someone — or people — who really see you. Not the version of you that performs or manages or holds things together. The actual you.

A year from now. You're with someone you care about. You're not doing anything dramatic. Just together.

Be there.`,
    inputs: [
      'Who is it?',
      'Where are you?',
      "What's the feeling underneath the conversation?",
      'What version of you do they see in this moment?',
    ],
    buildPlayback: ([a = '', b = '', c = '', d = '']) =>
      `A year from now, you're with ${a || '…'}, in ${lc(b) || '…'}.\n\nThe feeling between you is ${lc(c) || '…'}.\n\nAnd what they see — what's present in you in this moment — is ${lc(d) || '…'}.\n\nThat version of you — the one that can be seen, that doesn't need to hide, that feels genuinely met — that's not a different person. It's you, a little more arrived. A little more willing to be here.\n\nThat moment exists. It's ahead of you. And it starts with the small choices you make about how much of yourself you let through.`,
  },
  {
    id: 'morning-you-love',
    title: 'The Morning You Love',
    target: 'Daily Aliveness · Quiet Joy',
    tagColor: 'text-primary',
    prompt: `Close your eyes. This one is quiet. We're going somewhere very ordinary — but ordinary in the best way.

A year from now. You've woken up. Nothing dramatic has happened. But something about this morning feels like yours. Like you're actually here, in your own life, and it fits.

Just arrive there.`,
    inputs: [
      'Where are you?',
      'What do you do in the first hour?',
      'What does your body feel like?',
      "What's the quiet feeling underneath the morning?",
      'What direction feels right?',
    ],
    buildPlayback: ([a = '', b = '', c = '', d = '', e = '']) =>
      `A year from now, you wake up in ${a || '…'}.\n\nIn the first hour, you ${lc(b) || '…'}. Your body feels ${lc(c) || '…'}.\n\nAnd underneath all of it, there's ${lc(d) || '…'} — that quiet sense that something is okay. More than okay. You know, without needing to say it, that ${lc(e) || '…'}.\n\nThis is not a fantasy version of your life. This is your actual life, lived more fully. The version of you in this morning got here by choosing, again and again, to take up a little more space. To show up a little more honestly. To let things be good.\n\nThat morning is real. It belongs to you.`,
  },
];
