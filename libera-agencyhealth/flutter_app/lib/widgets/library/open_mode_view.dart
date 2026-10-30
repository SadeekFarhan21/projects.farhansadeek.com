import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import 'breathwork_carousel.dart';
import 'meditation_carousel.dart';
import 'eft_carousel.dart';
import 'habit_breaker_widget.dart';
import 'suggestions_carousel.dart';

class OpenModeView extends StatelessWidget {
  const OpenModeView({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(0, 16, 0, 40),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'OPEN EXERCISES',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: LiberaColors.tertiary,
                  letterSpacing: 3,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Explore freely',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: LiberaColors.onSurface,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Choose any practice that calls to you',
                style: TextStyle(
                  fontSize: 14,
                  color: LiberaColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Breathwork
        _SectionHeader(title: 'Breathwork', icon: Icons.air),
        const SizedBox(height: 12),
        const BreathworkCarousel(),
        const SizedBox(height: 28),

        // Meditation
        _SectionHeader(title: 'Meditation', icon: Icons.self_improvement),
        const SizedBox(height: 12),
        const MeditationCarousel(),
        const SizedBox(height: 28),

        // EFT
        _SectionHeader(title: 'EFT Visualization', icon: Icons.visibility),
        const SizedBox(height: 12),
        const EftCarousel(),
        const SizedBox(height: 28),

        // Habit Breaker
        _SectionHeader(title: 'Habit Breaker', icon: Icons.flash_on),
        const SizedBox(height: 12),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: HabitBreakerWidget(),
        ),
        const SizedBox(height: 28),

        // Suggestions
        _SectionHeader(title: 'Suggested For You', icon: Icons.auto_awesome),
        const SizedBox(height: 12),
        const SuggestionsCarousel(),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;

  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Icon(icon, size: 18, color: LiberaColors.primary.withValues(alpha: 0.6)),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: LiberaColors.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}
