import 'dart:ui';
import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';
import '../../models/session_record.dart';
import '../../models/eft_config.dart';
import '../../utils/formatters.dart';
import '../common/glass_panel.dart';

class SessionCard extends StatelessWidget {
  final SessionRecord session;
  final double vividness;
  final bool expanded;
  final VoidCallback onToggle;

  const SessionCard({
    super.key,
    required this.session,
    required this.vividness,
    required this.expanded,
    required this.onToggle,
  });

  Color _packageColor() {
    switch (session.packageId) {
      case PackageId.anchor:
        return LiberaColors.primary;
      case PackageId.earnedMoment:
        return LiberaColors.tertiary;
      case PackageId.lighterYou:
        return LiberaColors.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final pkg = packages[session.packageId]!;
    final config = eftConfigs[session.packageId]!;
    final narrative = config.buildNarrative(session.eftAnswers);
    final firstParagraph = narrative.split('\n\n').first;
    final opacity = 0.18 + vividness * 0.82;
    final blurAmount = (1 - vividness) * 1.8;
    final color = _packageColor();

    return GestureDetector(
      onTap: onToggle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Main card
          Opacity(
            opacity: opacity,
            child: GlassPanel(
              padding: const EdgeInsets.all(20),
              borderColor: expanded ? color.withValues(alpha: 0.3) : LiberaColors.outlineVariant.withValues(alpha: 0.1),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(_packageIcon(), size: 16, color: color),
                          const SizedBox(width: 8),
                          Text(
                            pkg.label.toUpperCase(),
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color, letterSpacing: 1),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            vividLabel(vividness).toUpperCase(),
                            style: TextStyle(fontSize: 9, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4), letterSpacing: 1),
                          ),
                          Text(
                            formatDate(session.date),
                            style: TextStyle(fontSize: 11, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4)),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Narrative preview with blur
                  ImageFiltered(
                    imageFilter: ImageFilter.blur(sigmaX: blurAmount, sigmaY: blurAmount),
                    child: Text(
                      firstParagraph,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.6,
                        color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.8),
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(
                        expanded ? Icons.expand_less : Icons.expand_more,
                        size: 14,
                        color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.3),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        expanded ? 'LESS' : 'FULL ENTRY',
                        style: TextStyle(fontSize: 9, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.3), letterSpacing: 1),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Expanded content
          if (expanded)
            Opacity(
              opacity: opacity,
              child: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: GlassPanel(
                  padding: const EdgeInsets.all(20),
                  borderColor: color.withValues(alpha: 0.3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Full narrative
                      Text('FULL NARRATIVE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4), letterSpacing: 1)),
                      const SizedBox(height: 8),
                      ImageFiltered(
                        imageFilter: ImageFilter.blur(sigmaX: blurAmount, sigmaY: blurAmount),
                        child: Text(
                          narrative,
                          style: TextStyle(fontSize: 13, height: 1.6, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.8), fontStyle: FontStyle.italic),
                        ),
                      ),
                      const SizedBox(height: 16),
                      _divider(),
                      // Answers
                      if (session.eftAnswers.any((a) => a.isNotEmpty)) ...[
                        const SizedBox(height: 12),
                        Text('YOUR ANSWERS', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4), letterSpacing: 1)),
                        const SizedBox(height: 8),
                        _answerRow(config.labelA, [session.eftAnswers.isNotEmpty ? session.eftAnswers[0] : '']),
                        _answerRow(config.labelB, _getSecondaryAnswers(config)),
                        const SizedBox(height: 8),
                        _divider(),
                      ],
                      // Journal
                      const SizedBox(height: 12),
                      Text('JOURNAL', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4), letterSpacing: 1)),
                      const SizedBox(height: 8),
                      _journalRow('Feeling', session.journal.q1),
                      _journalRow('Good thing', session.journal.q2),
                      _journalRow('Note', session.journal.q3),
                      const SizedBox(height: 8),
                      _divider(),
                      // Mood bar
                      const SizedBox(height: 12),
                      Text('MOOD ON ENTRY', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4), letterSpacing: 1)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(3),
                              child: SizedBox(
                                height: 6,
                                child: Stack(
                                  children: [
                                    Container(color: LiberaColors.surfaceVariant),
                                    FractionallySizedBox(
                                      widthFactor: session.mood / 100,
                                      child: Container(
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(3),
                                          gradient: LinearGradient(
                                            colors: [LiberaColors.secondaryDim, LiberaColors.primaryDim, LiberaColors.primary],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(getMoodLabel(session.mood), style: TextStyle(fontSize: 11, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.6))),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  List<String> _getSecondaryAnswers(EftConfig config) {
    if (config.inputType == EftInputType.twoSingles) {
      return [session.eftAnswers.length > 1 ? session.eftAnswers[1] : ''];
    }
    return session.eftAnswers.skip(1).where((a) => a.isNotEmpty).toList();
  }

  Widget _answerRow(String label, List<String> answers) {
    final text = answers.where((a) => a.isNotEmpty).join(', ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: TextStyle(fontSize: 12, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.7)),
          children: [
            TextSpan(text: '$label: ', style: TextStyle(color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4))),
            TextSpan(text: text.isEmpty ? '\u2014' : text),
          ],
        ),
      ),
    );
  }

  Widget _journalRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: TextStyle(fontSize: 12, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.7)),
          children: [
            TextSpan(text: '$label: ', style: TextStyle(color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4))),
            TextSpan(text: value.isEmpty ? '\u2014' : value),
          ],
        ),
      ),
    );
  }

  Widget _divider() => Divider(color: LiberaColors.outlineVariant.withValues(alpha: 0.1), height: 1);

  IconData _packageIcon() {
    switch (session.packageId) {
      case PackageId.anchor:
        return Icons.anchor;
      case PackageId.earnedMoment:
        return Icons.emoji_events;
      case PackageId.lighterYou:
        return Icons.wb_sunny;
    }
  }
}
