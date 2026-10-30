import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/session_store_provider.dart';
import '../theme/colors.dart';
import 'bottom_nav.dart';
import 'top_bar.dart';

class ShellScaffold extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ShellScaffold({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<SessionStoreProvider>();
    // Simple streak: count of sessions as proxy
    final streak = store.sessions.length;

    return Scaffold(
      backgroundColor: LiberaColors.surface,
      body: Column(
        children: [
          TopBar(
            streak: streak,
            onSettingsTap: () => navigationShell.goBranch(2),
          ),
          Expanded(child: navigationShell),
        ],
      ),
      bottomNavigationBar: BottomNav(
        currentIndex: navigationShell.currentIndex,
        onTap: (i) => navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex),
      ),
    );
  }
}
