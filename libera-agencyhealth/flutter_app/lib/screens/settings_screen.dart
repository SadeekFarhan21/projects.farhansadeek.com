import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/colors.dart';
import '../providers/settings_provider.dart';
import '../widgets/common/glow_edge_container.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = context.watch<SettingsProvider>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
      children: [
        // Hero
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [LiberaColors.primary, LiberaColors.tertiary],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ).createShader(bounds),
          child: Text(
            'Celestial\nSettings',
            style: TextStyle(
              fontSize: 40,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.15,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Fine-tune your environment to maintain focus and preserve the sanctuary of your digital life.',
          style: TextStyle(
            fontSize: 15,
            color: LiberaColors.onSurfaceVariant,
            height: 1.6,
          ),
        ),
        const SizedBox(height: 32),

        // Profile + Connected Services
        // Zen Identity
        GlowEdgeContainer(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('USER IDENTITY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant, letterSpacing: 2)),
              const SizedBox(height: 8),
              Text(settings.userName, style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: LiberaColors.onSurface)),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${settings.totalStreak} Days',
                        style: TextStyle(fontSize: 40, fontWeight: FontWeight.w800, color: LiberaColors.tertiary),
                      ),
                      Text('Total Streak', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant)),
                    ],
                  ),
                  Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: LiberaColors.tertiary.withValues(alpha: 0.08),
                      boxShadow: [BoxShadow(color: LiberaColors.tertiary.withValues(alpha: 0.25), blurRadius: 20)],
                    ),
                    child: Icon(Icons.spa, color: LiberaColors.tertiary, size: 28),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Connected Ecosystem
        GlowEdgeContainer(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('CONNECTED ECOSYSTEM', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant, letterSpacing: 2)),
              const SizedBox(height: 20),
              _ServiceRow(
                icon: Icons.directions_run,
                iconColor: LiberaColors.strava,
                name: 'Strava',
                status: 'Synced',
              ),
              const SizedBox(height: 16),
              _ServiceRow(
                icon: Icons.favorite,
                iconColor: LiberaColors.appleHealth,
                name: 'Apple Health',
                status: 'Synced',
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {},
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: LiberaColors.outlineVariant.withValues(alpha: 0.15)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text(
                    'MANAGE INTEGRATION',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: LiberaColors.onSurfaceVariant, letterSpacing: 1.5),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),

        // Focus Filter
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Focus Filter', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: LiberaColors.onSurface)),
                const SizedBox(height: 4),
                Text('Modify device behavior to reduce dopamine loops.', style: TextStyle(fontSize: 13, color: LiberaColors.onSurfaceVariant)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: LiberaColors.surfaceContainer.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: LiberaColors.tertiary.withValues(alpha: 0.08)),
            boxShadow: [BoxShadow(color: LiberaColors.tertiary.withValues(alpha: 0.04), blurRadius: 20)],
          ),
          child: Text('ACTIVE PROTECTION', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: LiberaColors.tertiary, letterSpacing: 1.5)),
        ),
        const SizedBox(height: 16),

        _FilterToggle(
          label: 'Black & White Mode',
          subtitle: 'Desaturate screen colors',
          value: settings.blackAndWhite,
          onChanged: settings.setBlackAndWhite,
        ),
        _FilterToggle(
          label: 'Half-Speed Scroll',
          subtitle: 'Slow down infinite feeds',
          value: settings.halfSpeedScroll,
          onChanged: settings.setHalfSpeedScroll,
        ),
        _FilterToggle(
          label: 'Restrict Notifications',
          subtitle: 'Block non-essential alerts',
          value: settings.restrictNotifications,
          onChanged: settings.setRestrictNotifications,
        ),
        const SizedBox(height: 32),

        // Deep Stillness Algorithm
        GlowEdgeContainer(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Deep Stillness Algorithm', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: LiberaColors.onSurface)),
              const SizedBox(height: 12),
              RichText(
                text: TextSpan(
                  style: TextStyle(fontSize: 14, color: LiberaColors.onSurfaceVariant, height: 1.6),
                  children: [
                    const TextSpan(text: 'Your current filter configuration is projected to reduce screen time by '),
                    TextSpan(text: '42 minutes daily', style: TextStyle(color: LiberaColors.tertiary, fontWeight: FontWeight.w700)),
                    const TextSpan(text: '. These barriers are not restrictions — they are the walls of your digital sanctuary.'),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: LiberaColors.primary,
                        foregroundColor: LiberaColors.onPrimaryFixed,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        elevation: 0,
                      ),
                      child: Text('Update Profile', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {},
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: LiberaColors.outlineVariant.withValues(alpha: 0.2)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: Text('View Analytics', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: LiberaColors.onSurface)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ServiceRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String name;
  final String status;

  const _ServiceRow({required this.icon, required this.iconColor, required this.name, required this.status});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 22),
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LiberaColors.onSurface)),
            Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: LiberaColors.tertiary)),
          ],
        ),
        const Spacer(),
        Icon(Icons.check_circle, size: 18, color: LiberaColors.onSurfaceVariant),
      ],
    );
  }
}

class _FilterToggle extends StatelessWidget {
  final String label;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _FilterToggle({required this.label, required this.subtitle, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: LiberaColors.surfaceContainer,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: LiberaColors.outlineVariant.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LiberaColors.onSurface)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 12, color: LiberaColors.onSurfaceVariant)),
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeTrackColor: LiberaColors.primary.withValues(alpha: 0.5),
            thumbColor: WidgetStatePropertyAll(LiberaColors.primary),
          ),
        ],
      ),
    );
  }
}
