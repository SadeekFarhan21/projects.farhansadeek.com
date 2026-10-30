import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';
import '../../utils/formatters.dart';
import 'breathing_circle.dart';

class BreathworkStep extends StatelessWidget {
  final PackageDef package;
  final int secondsRemaining;
  final VoidCallback onComplete;

  const BreathworkStep({
    super.key,
    required this.package,
    required this.secondsRemaining,
    required this.onComplete,
  });

  Color _packageColor() {
    switch (package.color) {
      case PackageColor.primary:
        return LiberaColors.primary;
      case PackageColor.secondary:
        return LiberaColors.secondary;
      case PackageColor.tertiary:
        return LiberaColors.tertiary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          package.breath.name,
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: LiberaColors.onSurface,
          ),
        ),
        if (package.breathInstruction != null) ...[
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              package.breathInstruction!,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: LiberaColors.onSurfaceVariant, height: 1.5),
            ),
          ),
        ],
        const SizedBox(height: 40),
        BreathingCircle(
          pattern: package.breath,
          color: _packageColor(),
          onCycleComplete: onComplete,
        ),
        const SizedBox(height: 24),
        Text(
          formatTime(secondsRemaining),
          style: TextStyle(
            fontSize: 14,
            fontFamily: 'monospace',
            color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4),
          ),
        ),
      ],
    );
  }
}
