String formatTime(int seconds) {
  final m = seconds ~/ 60;
  final s = seconds % 60;
  return '$m:${s.toString().padLeft(2, '0')}';
}

const _months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

String formatDate(DateTime date) {
  return '${date.day} ${_months[date.month - 1]} ${date.year}';
}

String getMoodLabel(int v) {
  if (v < 15) return 'Very Low';
  if (v < 35) return 'Low';
  if (v < 55) return 'Neutral';
  if (v < 75) return 'Good';
  return 'Great';
}

String getMoodEmoji(int v) {
  if (v < 15) return '\u{1F622}'; // 😢
  if (v < 35) return '\u{1F61F}'; // 😟
  if (v < 55) return '\u{1F610}'; // 😐
  if (v < 75) return '\u{1F642}'; // 🙂
  return '\u{1F604}'; // 😄
}

String vividLabel(double v) {
  if (v >= 0.9) return 'Crystal Clear';
  if (v >= 0.65) return 'Getting Vivid';
  if (v >= 0.35) return 'Coming Into Focus';
  return 'First Glimpse';
}
