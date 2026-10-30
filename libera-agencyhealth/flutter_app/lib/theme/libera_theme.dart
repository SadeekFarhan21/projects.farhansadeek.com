import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class LiberaTheme {
  LiberaTheme._();

  /// Motion easing — closest to web's cubic-bezier(0.22, 1, 0.36, 1)
  static const curve = Curves.easeOutQuart;
  static const duration = Duration(milliseconds: 500);

  static ThemeData get dark {
    final nunito = GoogleFonts.nunitoTextTheme(ThemeData.dark().textTheme);

    return ThemeData.dark().copyWith(
      scaffoldBackgroundColor: LiberaColors.surface,
      colorScheme: const ColorScheme.dark(
        surface: LiberaColors.surface,
        primary: LiberaColors.primary,
        onPrimary: LiberaColors.onPrimary,
        primaryContainer: LiberaColors.primaryContainer,
        onPrimaryContainer: LiberaColors.onPrimaryContainer,
        secondary: LiberaColors.secondary,
        onSecondary: LiberaColors.onSecondary,
        secondaryContainer: LiberaColors.secondaryContainer,
        onSecondaryContainer: LiberaColors.onSecondaryContainer,
        tertiary: LiberaColors.tertiary,
        onTertiary: LiberaColors.onTertiary,
        tertiaryContainer: LiberaColors.tertiaryContainer,
        onTertiaryContainer: LiberaColors.onTertiaryContainer,
        error: LiberaColors.error,
        onError: LiberaColors.onError,
        errorContainer: LiberaColors.errorContainer,
        onErrorContainer: LiberaColors.onErrorContainer,
        onSurface: LiberaColors.onSurface,
        onSurfaceVariant: LiberaColors.onSurfaceVariant,
        outline: LiberaColors.outline,
        outlineVariant: LiberaColors.outlineVariant,
        inverseSurface: LiberaColors.inverseSurface,
        onInverseSurface: LiberaColors.inverseOnSurface,
        inversePrimary: LiberaColors.inversePrimary,
        surfaceContainerLowest: LiberaColors.surfaceContainerLowest,
        surfaceContainerLow: LiberaColors.surfaceContainerLow,
        surfaceContainer: LiberaColors.surfaceContainer,
        surfaceContainerHigh: LiberaColors.surfaceContainerHigh,
        surfaceContainerHighest: LiberaColors.surfaceContainerHighest,
      ),
      textTheme: nunito.apply(
        bodyColor: LiberaColors.onSurface,
        displayColor: LiberaColors.onSurface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.transparent,
        selectedItemColor: LiberaColors.primary,
        unselectedItemColor: LiberaColors.onSurfaceVariant,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: LiberaColors.surfaceContainer,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: LiberaColors.outlineVariant.withValues(alpha: 0.3)),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: LiberaColors.outlineVariant,
        thickness: 0.5,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: LiberaColors.surfaceContainerLow,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: LiberaColors.outlineVariant.withValues(alpha: 0.3)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: LiberaColors.outlineVariant.withValues(alpha: 0.3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: LiberaColors.primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: LiberaColors.onSurfaceVariant),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
