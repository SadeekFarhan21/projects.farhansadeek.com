import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';
import '../../models/session_record.dart';
import 'session_card.dart';

class SessionTimeline extends StatelessWidget {
  final List<SessionRecord> sessions;
  final Map<String, double> vividnessMap;
  final String? expandedId;
  final ValueChanged<String> onToggle;

  const SessionTimeline({
    super.key,
    required this.sessions,
    required this.vividnessMap,
    this.expandedId,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Vertical timeline line
        Positioned(
          left: 16,
          top: 8,
          bottom: 8,
          child: Container(
            width: 1,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  LiberaColors.primary.withValues(alpha: 0.25),
                  LiberaColors.primary.withValues(alpha: 0.1),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
        // Session cards
        Padding(
          padding: const EdgeInsets.only(left: 40),
          child: Column(
            children: sessions.map((session) {
              final vividness = vividnessMap[session.id] ?? 0.5;
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    // Timeline dot
                    Positioned(
                      left: -32,
                      top: 16,
                      child: _TimelineDot(
                        packageId: session.packageId,
                        vividness: vividness,
                      ),
                    ),
                    SessionCard(
                      session: session,
                      vividness: vividness,
                      expanded: expandedId == session.id,
                      onToggle: () => onToggle(session.id),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _TimelineDot extends StatelessWidget {
  final PackageId packageId;
  final double vividness;

  const _TimelineDot({required this.packageId, required this.vividness});

  Color _color() {
    switch (packageId) {
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
    final c = _color();
    final opacity = 0.18 + vividness * 0.82;

    return Container(
      width: 12, height: 12,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: LiberaColors.surface,
        border: Border.all(color: c.withValues(alpha: 0.3 * opacity), width: 2),
        boxShadow: vividness > 0.65
            ? [BoxShadow(color: LiberaColors.primary.withValues(alpha: 0.35), blurRadius: 8)]
            : null,
      ),
    );
  }
}
