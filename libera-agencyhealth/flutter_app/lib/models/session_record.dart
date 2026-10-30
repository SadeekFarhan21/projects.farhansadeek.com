import 'session_data.dart';

class JournalEntry {
  final String q1;
  final String q2;
  final String q3;

  const JournalEntry({this.q1 = '', this.q2 = '', this.q3 = ''});
}

class SessionRecord {
  final String id;
  final DateTime date;
  final PackageId packageId;
  final int mood; // 0-100
  final List<String> eftAnswers; // up to 4 slots
  final JournalEntry journal;

  const SessionRecord({
    required this.id,
    required this.date,
    required this.packageId,
    required this.mood,
    required this.eftAnswers,
    required this.journal,
  });
}
