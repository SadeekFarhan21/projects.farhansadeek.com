import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/library_data.dart';
import '../common/glass_panel.dart';

class SuggestionsCarousel extends StatelessWidget {
  const SuggestionsCarousel({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 140,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: suggestionCards.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final card = suggestionCards[i];
          return SizedBox(
            width: 240,
            child: GlassPanel(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(card.icon, size: 18, color: LiberaColors.tertiary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          card.title,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: LiberaColors.onSurface),
                        ),
                      ),
                      Text(card.duration, style: TextStyle(fontSize: 10, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.5))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    card.reason,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: LiberaColors.onSurfaceVariant, height: 1.4),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: LiberaColors.tertiary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'SUGGESTED',
                      style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: LiberaColors.tertiary, letterSpacing: 1),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
