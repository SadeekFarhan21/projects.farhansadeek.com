import 'session_data.dart';

/// Lowercase first char — for answers that slot mid-sentence
String _lc(String s) => s.isEmpty ? s : s[0].toLowerCase() + s.substring(1);

/// Uppercase first char — for answers that open a sentence fragment
String _uc(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

enum EftInputType { singlePlusCarousel, twoSingles }

class EftConfig {
  final String prompt;
  final String labelA;
  final EftInputType inputType;
  final String labelB;
  final String Function(List<String>) buildNarrative;

  const EftConfig({
    required this.prompt,
    required this.labelA,
    required this.inputType,
    required this.labelB,
    required this.buildNarrative,
  });
}

final Map<PackageId, EftConfig> eftConfigs = {
  PackageId.anchor: EftConfig(
    prompt:
      "Picture a morning, about a year from now. You've just woken up and something feels quietly right. Where are you? What do you hear first?",
    labelA: 'Where are you?',
    inputType: EftInputType.singlePlusCarousel,
    labelB: 'Three sounds that you hear',
    buildNarrative: (answers) {
      final a = answers.isNotEmpty ? answers[0] : '';
      final b = answers.length > 1 ? answers[1] : '';
      final c = answers.length > 2 ? answers[2] : '';
      final d = answers.length > 3 ? answers[3] : '';
      return "I wake up. I'm in ${a.isNotEmpty ? a : '...'}.\n\n"
          "The first thing I hear is ${b.isNotEmpty ? _lc(b) : '...'}. "
          "Then ${c.isNotEmpty ? _lc(c) : '...'}. "
          "Somewhere, ${d.isNotEmpty ? _lc(d) : '...'}.\n\n"
          "Something feels quietly right. I'm not rushing toward anything. "
          "I'm just here, in this morning, and it fits.\n\n"
          "This is my life. And it feels like mine.";
    },
  ),
  PackageId.earnedMoment: EftConfig(
    prompt:
      "A year from now, you've just finished something. You're sitting quietly afterwards, and there's a feeling in your chest. What did you do? What does the feeling feel like?",
    labelA: 'What did you do?',
    inputType: EftInputType.twoSingles,
    labelB: 'What does the feeling feel like?',
    buildNarrative: (answers) {
      final a = answers.isNotEmpty ? answers[0] : '';
      final b = answers.length > 1 ? answers[1] : '';
      return "I've just ${a.isNotEmpty ? _lc(a) : '...'}.\n\n"
          "I'm sitting quietly. I don't need to tell anyone right now. "
          "I just know what this took.\n\n"
          "In my chest there is ${b.isNotEmpty ? _lc(b) : '...'}.\n\n"
          "I did this. And I will carry that forward.";
    },
  ),
  PackageId.lighterYou: EftConfig(
    prompt:
      "A year from now, something that used to hold you back just... doesn't anymore. You're not sure when it shifted. How are you different now? How does it feel?",
    labelA: 'How are you different now?',
    inputType: EftInputType.singlePlusCarousel,
    labelB: 'Three words that describe how it feels',
    buildNarrative: (answers) {
      final a = answers.isNotEmpty ? answers[0] : '';
      final b = answers.length > 1 ? answers[1] : '';
      final c = answers.length > 2 ? answers[2] : '';
      final d = answers.length > 3 ? answers[3] : '';
      return "Something has shifted. I'm not sure exactly when.\n\n"
          "Now I'm ${a.isNotEmpty ? _lc(a) : '...'}.\n\n"
          "I feel ${b.isNotEmpty ? _lc(b) : '...'}. "
          "${c.isNotEmpty ? _uc(c) : '...'}. "
          "${d.isNotEmpty ? _uc(d) : '...'}.\n\n"
          "There's more room in me than there used to be. And I'm using it.";
    },
  ),
};

// ── Negativity screener ──
const _negativeWords = [
  'sad', 'sadness', 'anxious', 'anxiety', 'nervous', 'nervousness',
  'stressed', 'stress', 'afraid', 'fear', 'fearful', 'scared',
  'worried', 'worry', 'worrying', 'angry', 'anger', 'frustrated', 'frustration',
  'depressed', 'depression', 'hopeless', 'helpless', 'worthless', 'useless',
  'overwhelmed', 'exhausted', 'exhaustion', 'stuck', 'lost', 'empty', 'emptiness',
  'numb', 'numbness', 'lonely', 'loneliness', 'alone', 'isolated', 'isolation',
  'trapped', 'failing', 'failed', 'failure', 'broken', 'hurt', 'pain', 'painful',
  'miserable', 'terrible', 'horrible', 'awful', 'bad', 'worse', 'worst',
  'low', 'down', 'dark', 'heavy', 'weak', 'tired', 'drained', 'bleak', 'grim',
  'hate', 'hatred', 'shame', 'ashamed', 'guilty', 'guilt', 'regret',
];

bool screenForNegativity(String text) {
  if (text.trim().isEmpty) return false;
  final lower = text.toLowerCase();
  return _negativeWords.any((w) => RegExp('\\b$w\\b').hasMatch(lower));
}
