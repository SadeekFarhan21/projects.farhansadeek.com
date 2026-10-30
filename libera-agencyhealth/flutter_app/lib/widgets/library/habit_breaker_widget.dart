import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../common/glass_panel.dart';

enum _HBStep { setup, anchor, breathe, urge, done }

class HabitBreakerWidget extends StatefulWidget {
  const HabitBreakerWidget({super.key});

  @override
  State<HabitBreakerWidget> createState() => _HabitBreakerWidgetState();
}

class _HabitBreakerWidgetState extends State<HabitBreakerWidget> {
  _HBStep _step = _HBStep.setup;
  final _anchorController = TextEditingController(text: 'calm');
  int _urgeTimer = 120; // 2 minutes
  Timer? _timer;

  @override
  void dispose() {
    _anchorController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startBreathing() {
    setState(() => _step = _HBStep.anchor);
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) setState(() => _step = _HBStep.breathe);
      Future.delayed(const Duration(seconds: 30), () {
        if (mounted) {
          setState(() => _step = _HBStep.urge);
          _startUrgeTimer();
        }
      });
    });
  }

  void _startUrgeTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_urgeTimer <= 1) {
        _timer?.cancel();
        setState(() => _step = _HBStep.done);
      } else {
        setState(() => _urgeTimer--);
      }
    });
  }

  void _reset() {
    _timer?.cancel();
    setState(() {
      _step = _HBStep.setup;
      _urgeTimer = 120;
    });
  }

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      padding: const EdgeInsets.all(20),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 400),
        child: _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    switch (_step) {
      case _HBStep.setup:
        return Column(
          key: const ValueKey('setup'),
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Break the loop', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: LiberaColors.onSurface)),
            const SizedBox(height: 4),
            Text('Interrupt a craving with anchored breathing', style: TextStyle(fontSize: 12, color: LiberaColors.onSurfaceVariant)),
            const SizedBox(height: 16),
            Text('Anchor word', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant)),
            const SizedBox(height: 6),
            TextField(
              controller: _anchorController,
              style: TextStyle(color: LiberaColors.onSurface, fontSize: 14),
            ),
            const SizedBox(height: 16),
            Center(
              child: ElevatedButton(
                onPressed: _startBreathing,
                style: ElevatedButton.styleFrom(
                  backgroundColor: LiberaColors.secondary,
                  foregroundColor: LiberaColors.surface,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                ),
                child: Text('Start', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        );

      case _HBStep.anchor:
        return Column(
          key: const ValueKey('anchor'),
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Your anchor word:', style: TextStyle(fontSize: 14, color: LiberaColors.onSurfaceVariant)),
            const SizedBox(height: 12),
            Text(
              _anchorController.text.toUpperCase(),
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: LiberaColors.secondary, letterSpacing: 3),
            ),
            const SizedBox(height: 12),
            Text('Hold this word in your mind...', style: TextStyle(fontSize: 13, color: LiberaColors.onSurfaceVariant, fontStyle: FontStyle.italic)),
          ],
        );

      case _HBStep.breathe:
        return Column(
          key: const ValueKey('breathe'),
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Breathe deeply', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: LiberaColors.onSurface)),
            const SizedBox(height: 8),
            Text('Cyclic Sighing: inhale 4s, exhale 6s', style: TextStyle(fontSize: 13, color: LiberaColors.onSurfaceVariant)),
            const SizedBox(height: 20),
            Container(
              width: 60, height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(colors: [LiberaColors.secondary.withValues(alpha: 0.3), LiberaColors.secondary.withValues(alpha: 0.05)]),
                boxShadow: [BoxShadow(color: LiberaColors.secondary.withValues(alpha: 0.2), blurRadius: 30)],
              ),
            ),
          ],
        );

      case _HBStep.urge:
        final mins = _urgeTimer ~/ 60;
        final secs = _urgeTimer % 60;
        return Column(
          key: const ValueKey('urge'),
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('The urge will pass', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: LiberaColors.onSurface)),
            const SizedBox(height: 8),
            Text('Stay with it. It fades.', style: TextStyle(fontSize: 13, color: LiberaColors.onSurfaceVariant)),
            const SizedBox(height: 20),
            Text(
              '$mins:${secs.toString().padLeft(2, '0')}',
              style: TextStyle(fontSize: 40, fontWeight: FontWeight.w300, color: LiberaColors.secondary, fontFamily: 'monospace'),
            ),
          ],
        );

      case _HBStep.done:
        return Column(
          key: const ValueKey('done'),
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 48, color: LiberaColors.secondary),
            const SizedBox(height: 12),
            Text('You made it through', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: LiberaColors.onSurface)),
            const SizedBox(height: 8),
            Text('The craving has passed. You chose differently.', style: TextStyle(fontSize: 13, color: LiberaColors.onSurfaceVariant)),
            const SizedBox(height: 16),
            TextButton(onPressed: _reset, child: Text('Reset', style: TextStyle(color: LiberaColors.secondary))),
          ],
        );
    }
  }
}
