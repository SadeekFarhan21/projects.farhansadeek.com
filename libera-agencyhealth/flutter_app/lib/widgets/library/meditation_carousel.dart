import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/library_data.dart';
import '../common/glass_panel.dart';

class MeditationCarousel extends StatefulWidget {
  const MeditationCarousel({super.key});

  @override
  State<MeditationCarousel> createState() => _MeditationCarouselState();
}

class _MeditationCarouselState extends State<MeditationCarousel> {
  int? _expandedIndex;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _expandedIndex != null ? 320 : 160,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: meditationCards.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final card = meditationCards[i];
          final isExpanded = _expandedIndex == i;

          return AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutQuart,
            width: isExpanded ? 300 : 200,
            child: GlassPanel(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(card.icon, size: 20, color: LiberaColors.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(card.title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: LiberaColors.onSurface)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(card.subtitle, style: TextStyle(fontSize: 11, color: LiberaColors.onSurfaceVariant)),
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
                            color: LiberaColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text(
                            isExpanded ? 'Close' : 'Open',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: LiberaColors.primary),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (isExpanded) ...[
                    const SizedBox(height: 12),
                    Text(
                      card.script,
                      maxLines: 6,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.8), height: 1.6, fontStyle: FontStyle.italic),
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
