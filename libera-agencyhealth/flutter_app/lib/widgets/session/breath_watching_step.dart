import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../utils/formatters.dart';

class BreathWatchingStep extends StatefulWidget {
  final int secondsRemaining;

  const BreathWatchingStep({super.key, required this.secondsRemaining});

  @override
  State<BreathWatchingStep> createState() => _BreathWatchingStepState();
}

class _BreathWatchingStepState extends State<BreathWatchingStep>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Breath Watching',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: LiberaColors.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Simply observe your natural breath.\nDon\'t try to change it.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: LiberaColors.onSurfaceVariant, height: 1.5),
        ),
        const SizedBox(height: 60),
        // Pulsing dot
        AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: _pulseAnimation.value,
              child: Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      LiberaColors.primary.withValues(alpha: 0.4),
                      LiberaColors.primary.withValues(alpha: 0.1),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: LiberaColors.primary.withValues(alpha: 0.2),
                      blurRadius: 40,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 60),
        // Countdown
        Text(
          formatTime(widget.secondsRemaining),
          style: TextStyle(
            fontSize: 48,
            fontWeight: FontWeight.w300,
            color: LiberaColors.onSurface.withValues(alpha: 0.6),
            fontFamily: 'monospace',
          ),
        ),
      ],
    );
  }
}
