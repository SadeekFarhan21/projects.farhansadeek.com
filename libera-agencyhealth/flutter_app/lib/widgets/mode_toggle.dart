import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/colors.dart';
import '../providers/mode_provider.dart';

class ModeToggle extends StatelessWidget {
  const ModeToggle({super.key});

  @override
  Widget build(BuildContext context) {
    final mode = context.watch<ModeProvider>();
    final isSanctuary = mode.mode == ViewMode.sanctuary;

    return GestureDetector(
      onTap: mode.toggle,
      child: Container(
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: LiberaColors.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: LiberaColors.outlineVariant.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Pill(
              label: 'Path',
              active: isSanctuary,
              icon: Icons.route,
            ),
            _Pill(
              label: 'Open',
              active: !isSanctuary,
              icon: Icons.grid_view_rounded,
            ),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final bool active;
  final IconData icon;

  const _Pill({required this.label, required this.active, required this.icon});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutQuart,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: active ? LiberaColors.primary.withValues(alpha: 0.15) : Colors.transparent,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: active ? LiberaColors.primary : LiberaColors.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: active ? FontWeight.w700 : FontWeight.w500,
              color: active ? LiberaColors.primary : LiberaColors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
