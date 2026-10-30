import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';

class LevelNodeWidget extends StatefulWidget {
  final LevelNode node;
  final VoidCallback? onTap;

  const LevelNodeWidget({super.key, required this.node, this.onTap});

  @override
  State<LevelNodeWidget> createState() => _LevelNodeWidgetState();
}

class _LevelNodeWidgetState extends State<LevelNodeWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );
    _pulseAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    if (widget.node.state == LevelState.current) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Color _packageColor(PackageId id) {
    switch (id) {
      case PackageId.anchor:
        return LiberaColors.primary;
      case PackageId.earnedMoment:
        return LiberaColors.tertiary;
      case PackageId.lighterYou:
        return LiberaColors.secondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _packageColor(widget.node.packageId);

    switch (widget.node.state) {
      case LevelState.completed:
        return _CompletedNode(color: color, level: widget.node.level);
      case LevelState.current:
        return _CurrentNode(
          color: color,
          level: widget.node.level,
          pulseAnimation: _pulseAnimation,
          onTap: widget.onTap,
        );
      case LevelState.locked:
        return _LockedNode(color: color, level: widget.node.level);
    }
  }
}

class _CompletedNode extends StatelessWidget {
  final Color color;
  final int level;

  const _CompletedNode({required this.color, required this.level});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 80, height: 80,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.12),
              border: Border.all(color: color.withValues(alpha: 0.3), width: 2),
            ),
            child: Icon(Icons.check_rounded, color: color, size: 24),
          ),
          Positioned(
            bottom: 4,
            child: Text(
              '$level',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color.withValues(alpha: 0.6)),
            ),
          ),
        ],
      ),
    );
  }
}

class _CurrentNode extends StatelessWidget {
  final Color color;
  final int level;
  final Animation<double> pulseAnimation;
  final VoidCallback? onTap;

  const _CurrentNode({
    required this.color,
    required this.level,
    required this.pulseAnimation,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 112, height: 112,
        child: AnimatedBuilder(
          animation: pulseAnimation,
          builder: (context, child) {
            final pulseValue = pulseAnimation.value;
            return Stack(
              alignment: Alignment.center,
              children: [
                // Outer glow
                Container(
                  width: 90 + pulseValue * 12,
                  height: 90 + pulseValue * 12,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: color.withValues(alpha: 0.15 + pulseValue * 0.1),
                        blurRadius: 30 + pulseValue * 15,
                      ),
                    ],
                  ),
                ),
                // Main circle
                Container(
                  width: 72, height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [color, color.withValues(alpha: 0.7)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    border: Border.all(color: color.withValues(alpha: 0.5), width: 2),
                    boxShadow: [
                      BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 20),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.play_arrow_rounded, color: LiberaColors.surface, size: 28),
                      Text(
                        '$level',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: LiberaColors.surface),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _LockedNode extends StatelessWidget {
  final Color color;
  final int level;

  const _LockedNode({required this.color, required this.level});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 64, height: 64,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: LiberaColors.surfaceContainerHigh,
              border: Border.all(color: LiberaColors.outlineVariant.withValues(alpha: 0.2), width: 1.5),
            ),
            child: Icon(Icons.lock_outline, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.3), size: 16),
          ),
          Positioned(
            bottom: 2,
            child: Text(
              '$level',
              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.25)),
            ),
          ),
        ],
      ),
    );
  }
}
