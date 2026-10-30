import 'package:flutter/material.dart';
import '../../theme/colors.dart';

class GlowEdgeContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final bool warm;

  const GlowEdgeContainer({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = 16,
    this.warm = false,
  });

  @override
  Widget build(BuildContext context) {
    final glowColor = warm ? LiberaColors.tertiary : LiberaColors.primary;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: LiberaColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: glowColor.withValues(alpha: warm ? 0.08 : 0.06)),
        boxShadow: [
          BoxShadow(
            color: glowColor.withValues(alpha: warm ? 0.04 : 0.03),
            blurRadius: 20,
          ),
          BoxShadow(
            color: glowColor.withValues(alpha: warm ? 0.02 : 0.015),
            blurRadius: 20,
            spreadRadius: -5,
          ),
        ],
      ),
      child: child,
    );
  }
}
