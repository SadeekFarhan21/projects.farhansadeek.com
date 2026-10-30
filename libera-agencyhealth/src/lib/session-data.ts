// ── Session Data: types, packages, steps, moods, level generation ──

export type PackageId = 'anchor' | 'earned-moment' | 'lighter-you';
export type StepId = 'mood' | 'breathwork' | 'breath-watching' | 'eft' | 'journal';

export interface BreathPattern {
  name: string;
  inhale: number;   // seconds
  holdIn: number;
  exhale: number;
  holdOut: number;
  cycles: number;
}

export interface PackageDef {
  id: PackageId;
  label: string;
  icon: string;
  color: string;
  breath: BreathPattern;
  breathInstruction?: string;
  eftPrompt: string;
  eftFirstPerson: string;
  eftSensory: string[];
  journalQ3: string;
}

export interface LevelNode {
  level: number;
  packageId: PackageId;
  state: 'completed' | 'current' | 'locked';
}

export interface StepDef {
  id: StepId;
  label: string;
  icon: string;
  duration: number; // seconds
}

// ── 5-step session flow ──
export const STEPS: StepDef[] = [
  { id: 'mood',            label: 'Mood Check-in',    icon: 'mood',              duration: 10 },
  { id: 'breathwork',      label: 'Breathwork',       icon: 'air',               duration: 80 },
  { id: 'breath-watching', label: 'Breath Watching',  icon: 'self_improvement',  duration: 80 },
  { id: 'eft',             label: 'EFT Visualization',icon: 'visibility',        duration: 90 },
  { id: 'journal',         label: 'Micro-Journal',    icon: 'edit_note',         duration: 60 },
];

// ── 3 session packages with strict future-oriented EFT prompts ──
export const PACKAGES: Record<PackageId, PackageDef> = {
  anchor: {
    id: 'anchor',
    label: 'The Morning You Love',
    icon: 'anchor',
    color: 'primary',
    breath: {
      name: 'Cyclic Sighing',
      inhale: 4,
      holdIn: 0,
      exhale: 6,
      holdOut: 2,
      cycles: 7,
    },
    eftPrompt:
      'Close your eyes.\n\nThis one is quiet. We\'re going somewhere very ordinary — but ordinary in the best way.\n\nA morning, a year from now. You\'ve woken up. Nothing dramatic has happened. But something about this morning feels like yours. Like you\'re actually here, in your own life, and it fits.\n\nJust arrive there.\n\nWhere are you? Look around slowly — what do you see first? What\'s the light like?\n\nWhat do you do in the first hour? Not what you should do — what you actually do. What does this morning look like?\n\nWhat does your body feel like? Not energised necessarily — just present. At home in itself.\n\nWhat\'s underneath the morning? Not an emotion with a name, maybe — just a quality. A texture.\n\nAnd as you move through this morning — what do you know, quietly, about where your life is going? Not a plan. Just a sense. A direction that feels right.',
    eftFirstPerson:
      'A year from now, you wake up and something about the morning feels like yours. The light is soft. In the first hour, you move through your own life without rushing — doing what you actually want to do, not what you feel you should.\n\nYour body feels present. At home in itself.\n\nUnderneath it all, there\'s a quiet quality — something that doesn\'t need a name. And you know, without needing to say it, that something is okay. More than okay.\n\nThis is not a fantasy version of your life. This is your actual life, lived more fully. The version of you in this morning got here by choosing, again and again, to take up a little more space. To show up a little more honestly. To let things be good.\n\nThat morning is real. It belongs to you.',
    eftSensory: [
      'Where are you — and what is the light like?',
      'What do you do in your first hour?',
      'What quiet sense of direction do you feel about where your life is going?',
    ],
    journalQ3: 'What is one small thing I can do tomorrow morning to feel more at home in my own life?',
  },
  'earned-moment': {
    id: 'earned-moment',
    label: 'The Earned Moment',
    icon: 'emoji_events',
    color: 'tertiary',
    breath: {
      name: 'Box Breathing',
      inhale: 4,
      holdIn: 4,
      exhale: 4,
      holdOut: 4,
      cycles: 5,
    },
    eftPrompt:
      'Close your eyes. Take a breath.\n\nWe\'re going to visit a moment in your future — about a year from now. This isn\'t a fantasy. It\'s a real possibility that exists somewhere ahead of you.\n\nYou\'ve just finished something. Something that mattered. You\'re sitting quietly now — and there\'s a feeling in your chest. Not loud. Just there.\n\nBe there for a moment.\n\nNow let\'s look more closely. What did you do? Let something come — it doesn\'t have to be grand. What is it that you finished, or achieved, or finally did?\n\nAnd where are you right now, in this moment after? What\'s around you — what do you see?\n\nWhat does your body feel like? Not the achievement — the aftermath. The quiet after. Is there heaviness? Lightness? A warmth somewhere? Tiredness that feels good?\n\nIs there anyone else there — even in the background? Someone who knows what you did?\n\nNow go a little deeper into that feeling in the chest. Let it be as big or as small as it actually is.',
    eftFirstPerson:
      'A year from now, you\'ve just done something that mattered. You\'re sitting quietly in the aftermath — somewhere that feels like yours.\n\nYou don\'t need to tell anyone right now. You know what this took. You know what you had to move through to get here. And sitting in that quiet, what you feel isn\'t relief that it\'s over — it\'s something steadier than that. A kind of knowing. That you can do this. That you did.\n\nThat feeling is real. It exists. It\'s waiting for you.',
    eftSensory: [
      'What did you finish or achieve?',
      'Where are you, and what do you see around you?',
      'What does the feeling in your chest feel like — describe the physical sensation?',
    ],
    journalQ3: 'What is one thing I have earned that I have not fully acknowledged?',
  },
  'lighter-you': {
    id: 'lighter-you',
    label: 'The Lighter You',
    icon: 'wb_sunny',
    color: 'secondary',
    breath: {
      name: 'Diaphragmatic Breathing',
      inhale: 4,
      holdIn: 0,
      exhale: 7,
      holdOut: 2,
      cycles: 6,
    },
    breathInstruction:
      'Keep one hand on your chest and the other on your belly. The goal is to make your belly rise and fall with each breath while keeping your chest still.',
    eftPrompt:
      'Close your eyes.\n\nTake a breath — and on the exhale, let something go. Not anything specific. Just a little weight.\n\nA year from now, something has shifted. Something that used to take up space inside you — that used to sit on your chest, or follow you in the morning, or make you smaller in certain moments — it\'s no longer there in the same way. You\'re not sure exactly when it changed. But it has.\n\nJust arrive in that.\n\nWhat does it feel like to move through your day without that weight? What\'s different about how you move, how you speak, how you enter a room?\n\nThink of something specific you do differently now. Something small — a choice you make, a way you hold yourself, something you say yes or no to that used to be hard.\n\nWhat does your body feel like? Not emotionally — physically. Is there more space somewhere? In the chest, the shoulders, the throat?\n\nAnd now — here\'s the important question. What became possible because of this? What are you doing, or being, or allowing, that wasn\'t available before?',
    eftFirstPerson:
      'A year from now, something that used to sit on you is no longer there in the same way. You move differently. There\'s more space in your body — in the chest, the shoulders, somewhere you used to hold things tight.\n\nYou do things differently now. Small things that used to be hard are just choices. You say yes to things that used to feel too big. You say no to things that used to feel impossible to refuse.\n\nWhat became possible is real. That\'s not a small thing. That\'s the whole thing.\n\nThe path to that starts from exactly where you are now. And the version of you that got there didn\'t do anything magical — they just kept going, a little differently, one day at a time.\n\nThat lighter version of you is real.',
    eftSensory: [
      'What is it that no longer sits on you the way it used to?',
      'What do you do differently — something specific, even small?',
      'What became possible because of this shift?',
    ],
    journalQ3: 'What is one thing I can let go of today, even a little?',
  },
};

// ── Package cycle order ──
const PACKAGE_CYCLE: PackageId[] = ['anchor', 'earned-moment', 'lighter-you'];

// ── Generate 30 levels cycling through packages ──
export function generateLevels(completedCount: number): LevelNode[] {
  return Array.from({ length: 30 }, (_, i) => ({
    level: i + 1,
    packageId: PACKAGE_CYCLE[i % 3],
    state:
      i < completedCount
        ? 'completed' as const
        : i === completedCount
          ? 'current' as const
          : 'locked' as const,
  }));
}
