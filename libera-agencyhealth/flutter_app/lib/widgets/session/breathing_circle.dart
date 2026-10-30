import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';

/// Multi-phase breathing animation: 3 concentric circles scaling per breath phase.
class BreathingCircle extends StatefulWidget {
  final BreathPattern pattern;
  final Color color;
  final VoidCallback? onCycleComplete;

  const BreathingCircle({
    super.key,
    required this.pattern,
    required this.color,
    this.onCycleComplete,
  });

  @override
  State<BreathingCircle> createState() => _BreathingCircleState();
}

class _BreathingCircleState extends State<BreathingCircle>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  String _phaseLabel = 'Inhale';
  int _completedCycles = 0;

  @override
  void initState() {
    super.initState();
    final p = widget.pattern;
    final totalDuration = p.inhale + p.holdIn + p.exhale + p.holdOut;

    _controller = AnimationController(
      vsync: this,
      duration: Duration(seconds: totalDuration),
    );

    // Build TweenSequence for breath phases
    final items = <TweenSequenceItem<double>>[];

    // Inhale: scale from 0.4 → 1.0
    if (p.inhale > 0) {
      items.add(TweenSequenceItem(
        tween: Tween(begin: 0.4, end: 1.0).chain(CurveTween(curve: Curves.easeOutQuart)),
        weight: p.inhale.toDouble(),
      ));
    }
    // Hold in: stay at 1.0
    if (p.holdIn > 0) {
      items.add(TweenSequenceItem(
        tween: ConstantTween(1.0),
        weight: p.holdIn.toDouble(),
      ));
    }
    // Exhale: scale from 1.0 → 0.4
    if (p.exhale > 0) {
      items.add(TweenSequenceItem(
        tween: Tween(begin: 1.0, end: 0.4).chain(CurveTween(curve: Curves.easeOutQuart)),
        weight: p.exhale.toDouble(),
      ));
    }
    // Hold out: stay at 0.4
    if (p.holdOut > 0) {
      items.add(TweenSequenceItem(
        tween: ConstantTween(0.4),
        weight: p.holdOut.toDouble(),
      ));
    }

    _scaleAnimation = TweenSequence(items).animate(_controller);

    _controller.addListener(_updatePhaseLabel);
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _completedCycles++;
        if (_completedCycles < widget.pattern.cycles) {
          _controller.forward(from: 0);
        } else {
          widget.onCycleComplete?.call();
        }
      }
    });

    _controller.forward();
  }

  void _updatePhaseLabel() {
    final p = widget.pattern;
    final total = p.inhale + p.holdIn + p.exhale + p.holdOut;
    final progress = _controller.value * total;

    String newLabel;
    if (progress < p.inhale) {
      newLabel = 'Inhale';
    } else if (progress < p.inhale + p.holdIn) {
      newLabel = 'Hold';
    } else if (progress < p.inhale + p.holdIn + p.exhale) {
      newLabel = 'Exhale';
    } else {
      newLabel = 'Hold';
    }

    if (newLabel != _phaseLabel) {
      setState(() => _phaseLabel = newLabel);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) {
        final scale = _scaleAnimation.value;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 200,
              height: 200,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Outer ring
                  Transform.scale(
                    scale: 0.5 + scale * 0.5,
                    child: Container(
                      width: 200, height: 200,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: widget.color.withValues(alpha: 0.08),
                          width: 1,
                        ),
                      ),
                    ),
                  ),
                  // Middle ring
                  Transform.scale(
                    scale: 0.4 + scale * 0.6,
                    child: Container(
                      width: 150, height: 150,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: widget.color.withValues(alpha: 0.06),
                        border: Border.all(
                          color: widget.color.withValues(alpha: 0.12),
                          width: 1,
                        ),
                      ),
                    ),
                  ),
                  // Inner circle
                  Transform.scale(
                    scale: scale,
                    child: Container(
                      width: 100, height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            widget.color.withValues(alpha: 0.3),
                            widget.color.withValues(alpha: 0.1),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: widget.color.withValues(alpha: 0.2),
                            blurRadius: 30,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              _phaseLabel,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: widget.color,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Cycle ${_completedCycles + 1} of ${widget.pattern.cycles}',
              style: TextStyle(
                fontSize: 12,
                color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.5),
              ),
            ),
          ],
        );
      },
    );
  }
}
