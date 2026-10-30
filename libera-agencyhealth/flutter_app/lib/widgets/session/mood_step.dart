import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../utils/formatters.dart';

class MoodStep extends StatelessWidget {
  final double value; // 0-100
  final ValueChanged<double> onChanged;

  const MoodStep({super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'How are you feeling?',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: LiberaColors.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Slide to express your current mood',
            style: TextStyle(fontSize: 14, color: LiberaColors.onSurfaceVariant),
          ),
          const SizedBox(height: 48),
          // Large emoji
          Text(
            getMoodEmoji(value.round()),
            style: const TextStyle(fontSize: 80),
          ),
          const SizedBox(height: 16),
          Text(
            getMoodLabel(value.round()),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: LiberaColors.onSurface,
            ),
          ),
          const SizedBox(height: 32),
          // Slider
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: LiberaColors.primary,
              inactiveTrackColor: LiberaColors.surfaceContainerHigh,
              thumbColor: LiberaColors.primary,
              overlayColor: LiberaColors.primary.withValues(alpha: 0.1),
              trackHeight: 6,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 14),
            ),
            child: Slider(
              value: value,
              min: 0,
              max: 100,
              onChanged: onChanged,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('\u{1F622}', style: TextStyle(fontSize: 20)),
              Text('\u{1F61F}', style: TextStyle(fontSize: 20)),
              Text('\u{1F610}', style: TextStyle(fontSize: 20)),
              Text('\u{1F642}', style: TextStyle(fontSize: 20)),
              Text('\u{1F604}', style: TextStyle(fontSize: 20)),
            ],
          ),
        ],
      ),
    );
  }
}
