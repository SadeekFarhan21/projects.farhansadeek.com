import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/colors.dart';
import '../models/session_data.dart';
import '../models/session_record.dart';
import '../providers/session_store_provider.dart';
import '../utils/formatters.dart';
import '../widgets/common/glass_panel.dart';
import '../widgets/insights/stats_row.dart';
import '../widgets/insights/vividness_meter.dart';
import '../widgets/insights/session_timeline.dart';

class InsightsScreen extends StatefulWidget {
  const InsightsScreen({super.key});

  @override
  State<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends State<InsightsScreen> {
  String _filter = 'all'; // 'all' | packageId name
  String? _expandedId;

  @override
  Widget build(BuildContext context) {
    final store = context.watch<SessionStoreProvider>();
    final sessions = store.sessions;

    // Compute vividness per session
    final vividnessMap = _computeVividness(sessions);

    // Stats
    final totalSessions = sessions.length;
    final uniqueDays = sessions.map((s) => _dateKey(s.date)).toSet().length;
    final streak = _computeStreak(sessions);
    final avgVividness = vividnessMap.isEmpty
        ? 0.0
        : vividnessMap.values.reduce((a, b) => a + b) / vividnessMap.length;

    // Filtered sessions (newest first)
    final sorted = List<SessionRecord>.from(sessions)
      ..sort((a, b) => b.date.compareTo(a.date));
    final visible = _filter == 'all'
        ? sorted
        : sorted.where((s) => s.packageId.name == _filter).toList();

    // Emoji buckets
    final emojiBuckets = [
      _EmojiBucket('\u{1F622}', 'Very Low', sessions.where((s) => s.mood < 15).length),
      _EmojiBucket('\u{1F61F}', 'Low', sessions.where((s) => s.mood >= 15 && s.mood < 35).length),
      _EmojiBucket('\u{1F610}', 'Neutral', sessions.where((s) => s.mood >= 35 && s.mood < 55).length),
      _EmojiBucket('\u{1F642}', 'Good', sessions.where((s) => s.mood >= 55 && s.mood < 75).length),
      _EmojiBucket('\u{1F604}', 'Great', sessions.where((s) => s.mood >= 75).length),
    ];

    final recentCheckins = sorted.take(8).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
      children: [
        // Header
        Text(
          'INSIGHTS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: LiberaColors.tertiary,
            letterSpacing: 3,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'The Vivid Storyline',
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w800,
            color: LiberaColors.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Each practice sharpens the image. The more you return to a vision, the more real it becomes.',
          style: TextStyle(
            fontSize: 15,
            color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.75),
            height: 1.6,
          ),
        ),
        const SizedBox(height: 32),

        // Stats
        StatsRow(
          trainings: totalSessions,
          streak: streak,
          daysActive: uniqueDays,
        ),
        const SizedBox(height: 32),

        // Vividness
        VividnessMeter(value: avgVividness, sessionCount: sessions.length),
        const SizedBox(height: 24),

        // Filters
        _buildFilters(),
        const SizedBox(height: 24),

        // Emoji check-ins
        _buildEmojiSection(emojiBuckets, recentCheckins),
        const SizedBox(height: 32),

        // Timeline
        if (visible.isNotEmpty)
          SessionTimeline(
            sessions: visible,
            vividnessMap: vividnessMap,
            expandedId: _expandedId,
            onToggle: (id) => setState(() {
              _expandedId = _expandedId == id ? null : id;
            }),
          )
        else
          _buildEmptyState(),
      ],
    );
  }

  Widget _buildFilters() {
    const filters = ['all', 'anchor', 'earnedMoment', 'lighterYou'];
    const labels = {'all': 'All', 'anchor': 'The Morning You Love', 'earnedMoment': 'The Earned Moment', 'lighterYou': 'The Lighter You'};

    return Wrap(
      spacing: 8,
      children: filters.map((f) {
        final selected = _filter == f;
        return GestureDetector(
          onTap: () => setState(() => _filter = f),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? LiberaColors.primary.withValues(alpha: 0.15) : LiberaColors.surfaceContainer,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: selected ? LiberaColors.primary.withValues(alpha: 0.25) : LiberaColors.outlineVariant.withValues(alpha: 0.15),
              ),
            ),
            child: Text(
              labels[f]!,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: selected ? LiberaColors.primary : LiberaColors.onSurfaceVariant.withValues(alpha: 0.6),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildEmojiSection(List<_EmojiBucket> buckets, List<SessionRecord> recent) {
    return GlassPanel(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Emoji Check-ins', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: LiberaColors.onSurface)),
              Text('MOOD SLIDER HISTORY', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.5), letterSpacing: 1.5)),
            ],
          ),
          const SizedBox(height: 16),
          // Buckets
          Row(
            children: buckets.map((b) => Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: LiberaColors.surfaceContainer,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: LiberaColors.outlineVariant.withValues(alpha: 0.1)),
                ),
                child: Column(
                  children: [
                    Text(b.emoji, style: const TextStyle(fontSize: 24)),
                    const SizedBox(height: 4),
                    Text(b.label, style: TextStyle(fontSize: 9, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.6))),
                    const SizedBox(height: 4),
                    Text('${b.count}', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: LiberaColors.onSurface)),
                  ],
                ),
              ),
            )).toList(),
          ),
          const SizedBox(height: 16),
          // Recent history
          ...recent.map((s) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: LiberaColors.surfaceContainerLow,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: LiberaColors.outlineVariant.withValues(alpha: 0.1)),
            ),
            child: Row(
              children: [
                Text(getMoodEmoji(s.mood), style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(getMoodLabel(s.mood), style: TextStyle(fontSize: 13, color: LiberaColors.onSurface)),
                    Text(formatDate(s.date), style: TextStyle(fontSize: 10, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.5))),
                  ],
                ),
                const Spacer(),
                Text(
                  packages[s.packageId]!.label,
                  style: TextStyle(fontSize: 10, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.45), letterSpacing: 0.5),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Column(
        children: [
          Icon(Icons.auto_stories, size: 48, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.2)),
          const SizedBox(height: 16),
          Text(
            'No entries yet for this practice.\nComplete a training to begin your storyline.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4)),
          ),
        ],
      ),
    );
  }

  // ── Helpers ──
  Map<String, double> _computeVividness(List<SessionRecord> sessions) {
    final byPkg = <PackageId, List<SessionRecord>>{};
    for (final s in sessions) {
      byPkg.putIfAbsent(s.packageId, () => []).add(s);
    }
    final map = <String, double>{};
    for (final pkgSessions in byPkg.values) {
      final sorted = List<SessionRecord>.from(pkgSessions)
        ..sort((a, b) => a.date.compareTo(b.date));
      for (var i = 0; i < sorted.length; i++) {
        map[sorted[i].id] = (i + 1) / sorted.length;
      }
    }
    return map;
  }

  int _computeStreak(List<SessionRecord> sessions) {
    final today = DateTime.now();
    final dates = sessions.map((s) => _dateKey(s.date)).toSet().toList()..sort();
    dates.reversed;
    var count = 0;
    for (var i = 0; i < dates.length; i++) {
      final expected = _dateKey(today.subtract(Duration(days: i)));
      if (dates.contains(expected)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  String _dateKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

class _EmojiBucket {
  final String emoji;
  final String label;
  final int count;
  const _EmojiBucket(this.emoji, this.label, this.count);
}
