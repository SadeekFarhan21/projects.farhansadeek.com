import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/mode_provider.dart';
import '../widgets/sanctuary/path_view.dart';
import '../widgets/library/open_mode_view.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final mode = context.watch<ModeProvider>();

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 400),
      switchInCurve: Curves.easeOutQuart,
      switchOutCurve: Curves.easeInQuart,
      child: mode.mode == ViewMode.sanctuary
          ? const PathView(key: ValueKey('path'))
          : const OpenModeView(key: ValueKey('open')),
    );
  }
}
