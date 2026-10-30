import 'package:flutter/material.dart';
import '../../theme/colors.dart';

/// Draws dashed gradient Bezier connector lines between sanctuary path nodes.
class SanctuaryPainter extends CustomPainter {
  final List<Offset> nodePositions;
  final int completedCount;

  SanctuaryPainter({required this.nodePositions, required this.completedCount});

  @override
  void paint(Canvas canvas, Size size) {
    if (nodePositions.length < 2) return;

    for (var i = 0; i < nodePositions.length - 1; i++) {
      final start = nodePositions[i];
      final end = nodePositions[i + 1];

      // Control points for smooth S-curve
      final midY = (start.dy + end.dy) / 2;
      final cp1 = Offset(start.dx, midY);
      final cp2 = Offset(end.dx, midY);

      final path = Path()
        ..moveTo(start.dx, start.dy)
        ..cubicTo(cp1.dx, cp1.dy, cp2.dx, cp2.dy, end.dx, end.dy);

      // Determine color based on completion
      final Color startColor;
      final Color endColor;
      if (i < completedCount) {
        startColor = LiberaColors.primary.withValues(alpha: 0.6);
        endColor = LiberaColors.tertiary.withValues(alpha: 0.6);
      } else if (i == completedCount) {
        startColor = LiberaColors.primary.withValues(alpha: 0.4);
        endColor = LiberaColors.tertiary.withValues(alpha: 0.2);
      } else {
        startColor = LiberaColors.outlineVariant.withValues(alpha: 0.15);
        endColor = LiberaColors.outlineVariant.withValues(alpha: 0.1);
      }

      // Draw dashed path with gradient
      _drawDashedPath(canvas, path, startColor, endColor, start, end);
    }
  }

  void _drawDashedPath(Canvas canvas, Path path, Color startColor, Color endColor, Offset start, Offset end) {
    final metrics = path.computeMetrics();
    for (final metric in metrics) {
      final totalLength = metric.length;
      const dashLength = 8.0;
      const gapLength = 6.0;
      var distance = 0.0;

      while (distance < totalLength) {
        final dashEnd = (distance + dashLength).clamp(0.0, totalLength);
        final extractPath = metric.extractPath(distance, dashEnd);

        final progress = distance / totalLength;
        final color = Color.lerp(startColor, endColor, progress)!;

        final paint = Paint()
          ..color = color
          ..strokeWidth = 2.0
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round;

        canvas.drawPath(extractPath, paint);
        distance += dashLength + gapLength;
      }
    }
  }

  @override
  bool shouldRepaint(covariant SanctuaryPainter oldDelegate) {
    return oldDelegate.nodePositions != nodePositions ||
        oldDelegate.completedCount != completedCount;
  }
}
