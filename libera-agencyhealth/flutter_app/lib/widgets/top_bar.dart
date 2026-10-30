import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/colors.dart';
import 'mode_toggle.dart';

class TopBar extends StatelessWidget {
  final int streak;
  final VoidCallback onSettingsTap;

  const TopBar({
    super.key,
    required this.streak,
    required this.onSettingsTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 20,
        right: 20,
        bottom: 12,
      ),
      decoration: BoxDecoration(
        color: LiberaColors.surface.withValues(alpha: 0.9),
        border: Border(
          bottom: BorderSide(color: LiberaColors.outlineVariant.withValues(alpha: 0.15)),
        ),
      ),
      child: Row(
        children: [
          // Logo
          Text(
            'Libera',
            style: GoogleFonts.nunito(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: LiberaColors.primary,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(width: 12),
          // Streak pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: LiberaColors.tertiary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: LiberaColors.tertiary.withValues(alpha: 0.2)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.local_fire_department, size: 14, color: LiberaColors.tertiary),
                const SizedBox(width: 4),
                Text(
                  '$streak Days',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: LiberaColors.tertiary,
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          // Mode toggle
          const ModeToggle(),
          const SizedBox(width: 12),
          // Settings
          GestureDetector(
            onTap: onSettingsTap,
            child: Icon(
              Icons.settings_outlined,
              color: LiberaColors.onSurfaceVariant,
              size: 22,
            ),
          ),
        ],
      ),
    );
  }
}
