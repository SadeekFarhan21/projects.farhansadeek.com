import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../common/glass_panel.dart';

class StatsRow extends StatelessWidget {
  final int trainings;
  final int streak;
  final int daysActive;

  const StatsRow({
    super.key,
    required this.trainings,
    required this.streak,
    required this.daysActive,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _StatCard(icon: Icons.fitness_center, value: trainings, label: 'Trainings'),
        const SizedBox(width: 10),
        _StatCard(icon: Icons.local_fire_department, value: streak, label: 'Day Streak'),
        const SizedBox(width: 10),
        _StatCard(icon: Icons.calendar_today, value: daysActive, label: 'Days Active'),
      ].map((w) => w is SizedBox ? w : Expanded(child: w)).toList(),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final int value;
  final String label;

  const _StatCard({required this.icon, required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      child: Column(
        children: [
          Icon(icon, size: 20, color: LiberaColors.primary.withValues(alpha: 0.6)),
          const SizedBox(height: 8),
          Text(
            '$value',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: LiberaColors.primary),
          ),
          const SizedBox(height: 4),
          Text(
            label.toUpperCase(),
            style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.6), letterSpacing: 1),
          ),
        ],
      ),
    );
  }
}
