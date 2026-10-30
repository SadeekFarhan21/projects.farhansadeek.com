import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../utils/formatters.dart';
import '../common/glass_panel.dart';

class VividnessMeter extends StatelessWidget {
  final double value; // 0.0 - 1.0
  final int sessionCount;

  const VividnessMeter({super.key, required this.value, required this.sessionCount});

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Overall Vividness', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LiberaColors.onSurface)),
              Text(vividLabel(value), style: TextStyle(fontSize: 12, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.5))),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: SizedBox(
              height: 8,
              child: Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: LiberaColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  FractionallySizedBox(
                    widthFactor: value.clamp(0.0, 1.0),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        gradient: LinearGradient(
                          colors: [
                            LiberaColors.primary.withValues(alpha: 0.4),
                            LiberaColors.primary,
                            LiberaColors.tertiary,
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Based on $sessionCount ${sessionCount == 1 ? 'training' : 'trainings'}',
            style: TextStyle(fontSize: 11, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.4)),
          ),
        ],
      ),
    );
  }
}
