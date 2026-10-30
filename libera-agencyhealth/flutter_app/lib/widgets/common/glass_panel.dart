import 'package:flutter/material.dart';
import '../../theme/colors.dart';

class GlassPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final bool glowEdge;
  final Color? borderColor;

  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = 16,
    this.glowEdge = true,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBorder = borderColor ?? LiberaColors.outlineVariant.withValues(alpha: 0.15);

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: LiberaColors.surfaceContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: effectiveBorder),
        boxShadow: glowEdge
            ? [
                BoxShadow(
                  color: LiberaColors.primary.withValues(alpha: 0.03),
                  blurRadius: 20,
                ),
                BoxShadow(
                  color: LiberaColors.primary.withValues(alpha: 0.015),
                  blurRadius: 20,
                  spreadRadius: -5,
                ),
              ]
            : null,
      ),
      child: child,
    );
  }
}
