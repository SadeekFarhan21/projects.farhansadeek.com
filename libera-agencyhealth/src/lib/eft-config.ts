import { PackageId } from './session-data';

// Lowercase the first character — for answers that slot mid-sentence
const lc = (s: string) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
// Uppercase the first character — for answers that open a sentence fragment
const uc = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export type EftInputType = 'single-plus-carousel' | 'two-singles';

export interface EftConfig {
  prompt: string;
  labelA: string;
  inputType: EftInputType;
  /** For two-singles: label for second input. For carousel: section header. */
  labelB: string;
  buildNarrative: (answers: string[]) => string;
}

export const EFT_CONFIGS: Record<PackageId, EftConfig> = {
  anchor: {
    prompt:
      "Picture a morning, about a year from now. You've just woken up and something feels quietly right. Where are you? What do you hear first?",
    labelA: 'Where are you?',
    inputType: 'single-plus-carousel',
    labelB: 'Three sounds that you hear',
    buildNarrative: ([a = '', b = '', c = '', d = '']) =>
      `I wake up. I'm in ${a || '…'}.\n\nThe first thing I hear is ${lc(b) || '…'}. Then ${lc(c) || '…'}. Somewhere, ${lc(d) || '…'}.\n\nSomething feels quietly right. I'm not rushing toward anything. I'm just here, in this morning, and it fits.\n\nThis is my life. And it feels like mine.`,
  },

  'earned-moment': {
    prompt:
      "A year from now, you've just finished something. You're sitting quietly afterwards, and there's a feeling in your chest. What did you do? What does the feeling feel like?",
    labelA: 'What did you do?',
    inputType: 'two-singles',
    labelB: 'What does the feeling feel like?',
    buildNarrative: ([a = '', b = '']) =>
      `I've just ${lc(a) || '…'}.\n\nI'm sitting quietly. I don't need to tell anyone right now. I just know what this took.\n\nIn my chest there is ${lc(b) || '…'}.\n\nI did this. And I will carry that forward.`,
  },

  'lighter-you': {
    prompt:
      "A year from now, something that used to hold you back just… doesn't anymore. You're not sure when it shifted. How are you different now? How does it feel?",
    labelA: 'How are you different now?',
    inputType: 'single-plus-carousel',
    labelB: 'Three words that describe how it feels',
    buildNarrative: ([a = '', b = '', c = '', d = '']) =>
      `Something has shifted. I'm not sure exactly when.\n\nNow I'm ${lc(a) || '…'}.\n\nI feel ${lc(b) || '…'}. ${uc(c) || '…'}. ${uc(d) || '…'}.\n\nThere's more room in me than there used to be. And I'm using it.`,
  },
};

// ── Negativity screener ──
// Blocks both direct negative words and negations/diminutives that still
// centre a negative state ("not stressed", "less anxious", "no longer low").
const NEGATIVE_WORDS = [
  'sad','sadness','anxious','anxiety','nervous','nervousness',
  'stressed','stress','afraid','fear','fearful','scared',
  'worried','worry','worrying','angry','anger','frustrated','frustration',
  'depressed','depression','hopeless','helpless','worthless','useless',
  'overwhelmed','exhausted','exhaustion','stuck','lost','empty','emptiness',
  'numb','numbness','lonely','loneliness','alone','isolated','isolation',
  'trapped','failing','failed','failure','broken','hurt','pain','painful',
  'miserable','terrible','horrible','awful','bad','worse','worst',
  'low','down','dark','heavy','weak','tired','drained','bleak','grim',
  'hate','hatred','shame','ashamed','guilty','guilt','regret',
];

export function screenForNegativity(text: string): boolean {
  if (!text.trim()) return false;
  const lower = text.toLowerCase();
  return NEGATIVE_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower));
}
