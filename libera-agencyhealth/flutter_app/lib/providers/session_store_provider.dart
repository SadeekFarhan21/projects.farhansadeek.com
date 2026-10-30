import 'package:flutter/foundation.dart';
import '../models/session_data.dart';
import '../models/session_record.dart';

class SessionStoreProvider extends ChangeNotifier {
  final List<SessionRecord> _sessions = List.from(_mockSessions);

  List<SessionRecord> get sessions => List.unmodifiable(_sessions);

  int get completedCount => _sessions.length;

  void saveSession(SessionRecord record) {
    _sessions.add(record);
    notifyListeners();
  }
}

// ── Mock historical data (8 sessions, ~3 weeks) ──
final _now = DateTime.now();

final _mockSessions = <SessionRecord>[
  SessionRecord(
    id: 'mock-0', packageId: PackageId.anchor,
    date: _now.subtract(const Duration(days: 21)), mood: 52,
    eftAnswers: ['my bedroom, early light', 'birds outside', 'coffee brewing downstairs', 'the city waking up'],
    journal: JournalEntry(q1: 'quiet', q2: 'sunlight through the curtain', q3: 'choose one small thing'),
  ),
  SessionRecord(
    id: 'mock-1', packageId: PackageId.earnedMoment,
    date: _now.subtract(const Duration(days: 18)), mood: 58,
    eftAnswers: ['finished writing my first draft', 'a steady warmth, like something settled'],
    journal: JournalEntry(q1: 'curious', q2: 'good coffee', q3: 'trust the work'),
  ),
  SessionRecord(
    id: 'mock-2', packageId: PackageId.lighterYou,
    date: _now.subtract(const Duration(days: 15)), mood: 64,
    eftAnswers: ['speak up without rehearsing', 'free', 'open', 'light'],
    journal: JournalEntry(q1: 'present', q2: 'a clear morning', q3: 'let something go'),
  ),
  SessionRecord(
    id: 'mock-3', packageId: PackageId.anchor,
    date: _now.subtract(const Duration(days: 11)), mood: 62,
    eftAnswers: ['my kitchen, late afternoon', 'rain on the glass', "a neighbour's dog", 'my own breathing'],
    journal: JournalEntry(q1: 'calm', q2: 'a text from a friend', q3: 'stay present'),
  ),
  SessionRecord(
    id: 'mock-4', packageId: PackageId.earnedMoment,
    date: _now.subtract(const Duration(days: 8)), mood: 70,
    eftAnswers: ['built something that helped people', 'quiet pride, deep in the chest'],
    journal: JournalEntry(q1: 'grounded', q2: 'my health', q3: 'keep going'),
  ),
  SessionRecord(
    id: 'mock-5', packageId: PackageId.lighterYou,
    date: _now.subtract(const Duration(days: 5)), mood: 72,
    eftAnswers: ['say no without explaining', 'steady', 'clear', 'free'],
    journal: JournalEntry(q1: 'open', q2: 'the smell of rain', q3: 'choose the lighter thing'),
  ),
  SessionRecord(
    id: 'mock-6', packageId: PackageId.anchor,
    date: _now.subtract(const Duration(days: 2)), mood: 78,
    eftAnswers: ['a small flat with good light', 'the sea somewhere close', 'coffee', 'a silence that feels full'],
    journal: JournalEntry(q1: 'hopeful', q2: 'this practice', q3: 'wake up like this more often'),
  ),
  SessionRecord(
    id: 'mock-7', packageId: PackageId.earnedMoment,
    date: _now, mood: 82,
    eftAnswers: ["launched something I'd been afraid to start", 'a fullness — not relief, completion'],
    journal: JournalEntry(q1: 'alive', q2: 'the sun is out', q3: 'celebrate what you finish'),
  ),
];
