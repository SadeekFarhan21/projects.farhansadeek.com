import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';
import '../../providers/session_store_provider.dart';
import 'sanctuary_painter.dart';
import 'level_node.dart';
import '../session/break_modal.dart';

class PathView extends StatefulWidget {
  const PathView({super.key});

  @override
  State<PathView> createState() => _PathViewState();
}

class _PathViewState extends State<PathView> {
  final _scrollController = ScrollController();
  final List<GlobalKey> _nodeKeys = List.generate(30, (_) => GlobalKey());

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToCurrent());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToCurrent() {
    final store = context.read<SessionStoreProvider>();
    final currentIndex = store.completedCount.clamp(0, 29);
    final key = _nodeKeys[currentIndex];
    final ctx = key.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx, alignment: 0.4, duration: const Duration(milliseconds: 600), curve: Curves.easeOutQuart);
    }
  }

  void _openBreakModal(PackageId packageId, int level) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BreakModal(packageId: packageId, level: level),
    );
  }

  // Zigzag offsets: center ± horizontal shift
  static const _offsets = [0.0, -36.0, 0.0, 36.0, 0.0];
  // Vertical gap between nodes (between edges, not centers)
  static const _gap = 20.0;

  @override
  Widget build(BuildContext context) {
    final store = context.watch<SessionStoreProvider>();
    final levels = generateLevels(store.completedCount);
    final screenWidth = MediaQuery.of(context).size.width;
    final centerX = screenWidth / 2;

    // Compute Y positions for painter (center of each node)
    var y = 40.0;
    final nodePositions = <Offset>[];
    final nodeYStarts = <double>[];
    for (var i = 0; i < levels.length; i++) {
      final h = _nodeHeight(levels[i].state);
      nodeYStarts.add(y);
      nodePositions.add(Offset(centerX + _offsets[i % _offsets.length], y + h / 2));
      y += h + _gap;
      // Add space for week headers
      if (i + 1 < levels.length && (i + 1) % 3 == 0) {
        y += 24;
      }
    }
    final totalHeight = y + 40;

    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: SizedBox(
        width: screenWidth,
        height: totalHeight,
        child: Stack(
          children: [
            // Connector lines
            CustomPaint(
              size: Size(screenWidth, totalHeight),
              painter: SanctuaryPainter(
                nodePositions: nodePositions,
                completedCount: store.completedCount,
              ),
            ),
            // Nodes + week headers
            for (var i = 0; i < levels.length; i++) ...[
              // Week header
              if (i > 0 && i % 3 == 0)
                Positioned(
                  left: 0,
                  right: 0,
                  top: nodeYStarts[i] - 22,
                  child: Center(
                    child: Text(
                      'WEEK ${(i ~/ 3) + 1}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.3),
                        letterSpacing: 2,
                      ),
                    ),
                  ),
                ),
              // Node
              Positioned(
                left: centerX + _offsets[i % _offsets.length] - _nodeWidth(levels[i].state) / 2,
                top: nodeYStarts[i],
                child: LevelNodeWidget(
                  key: _nodeKeys[i],
                  node: levels[i],
                  onTap: levels[i].state == LevelState.current
                      ? () => _openBreakModal(levels[i].packageId, levels[i].level)
                      : null,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  double _nodeHeight(LevelState state) {
    switch (state) {
      case LevelState.completed: return 80;
      case LevelState.current: return 112;
      case LevelState.locked: return 64;
    }
  }

  double _nodeWidth(LevelState state) {
    switch (state) {
      case LevelState.completed: return 80;
      case LevelState.current: return 112;
      case LevelState.locked: return 64;
    }
  }
}
