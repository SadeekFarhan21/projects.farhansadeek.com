import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';

class CompletionScreen extends StatelessWidget {
  final int level;
  final PackageDef package;
  final VoidCallback onClose;

  const CompletionScreen({
    super.key,
    required this.level,
    required this.package,
    required this.onClose,
  });

  Color _color() {
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
    final color = _color();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Level badge
          Container(
            width: 120, height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  color.withValues(alpha: 0.3),
                  color.withValues(alpha: 0.05),
                ],
              ),
              boxShadow: [
                BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 40),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_rounded, color: color, size: 40),
                Text(
                  'L$level',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          Text(
            'Session Complete',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: LiberaColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            package.label,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'You\'ve taken another step forward.\nEvery practice makes the vision clearer.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: LiberaColors.onSurfaceVariant,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 48),
          ElevatedButton(
            onPressed: onClose,
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: LiberaColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
              elevation: 0,
            ),
            child: Text('Return', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ],
      ),
    );
  }
}
