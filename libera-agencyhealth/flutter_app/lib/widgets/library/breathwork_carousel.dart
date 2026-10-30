import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/library_data.dart';
import '../common/glass_panel.dart';
import '../session/breathing_circle.dart';
import '../../models/session_data.dart';

class BreathworkCarousel extends StatefulWidget {
  const BreathworkCarousel({super.key});

  @override
  State<BreathworkCarousel> createState() => _BreathworkCarouselState();
}

class _BreathworkCarouselState extends State<BreathworkCarousel> {
  int? _expandedIndex;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _expandedIndex != null ? 420 : 180,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: breathworkCards.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final card = breathworkCards[i];
          final isExpanded = _expandedIndex == i;

          return AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutQuart,
            width: isExpanded ? 280 : 220,
            child: GlassPanel(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tag
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: card.tagColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      card.tag,
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: card.tagColor, letterSpacing: 1),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(card.title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: LiberaColors.onSurface)),
                  const SizedBox(height: 4),
                  Text(
                    card.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: LiberaColors.onSurfaceVariant, height: 1.4),
                  ),
                  const Spacer(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(card.duration, style: TextStyle(fontSize: 11, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.5))),
                      GestureDetector(
                        onTap: () => setState(() => _expandedIndex = isExpanded ? null : i),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: card.tagColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text(
                            isExpanded ? 'Close' : 'Practice',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: card.tagColor),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (isExpanded) ...[
                    const SizedBox(height: 16),
                    Center(
                      child: BreathingCircle(
                        pattern: BreathPattern(
                          name: card.title,
                          inhale: card.inhale,
                          holdIn: card.holdIn,
                          exhale: card.exhale,
                          holdOut: card.holdOut,
                          cycles: 3,
                        ),
                        color: card.tagColor,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
