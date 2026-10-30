import 'package:flutter/material.dart';
import '../theme/colors.dart';

class BreathworkCard {
  final String tag;
  final Color tagColor;
  final String title;
  final String description;
  final String duration;
  final int inhale;
  final int holdIn;
  final int exhale;
  final int holdOut;
  final String? instruction;

  const BreathworkCard({
    required this.tag,
    required this.tagColor,
    required this.title,
    required this.description,
    required this.duration,
    required this.inhale,
    required this.holdIn,
    required this.exhale,
    required this.holdOut,
    this.instruction,
  });
}

class MeditationCard {
  final IconData icon;
  final String title;
  final String subtitle;
  final String duration;
  final String script;

  const MeditationCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.duration,
    required this.script,
  });
}

class SuggestionCard {
  final IconData icon;
  final String title;
  final String reason;
  final String duration;

  const SuggestionCard({
    required this.icon,
    required this.title,
    required this.reason,
    required this.duration,
  });
}

// ── Breathwork cards ──
const breathworkCards = [
  BreathworkCard(
    tag: 'ANCHOR', tagColor: LiberaColors.primary,
    title: 'Cyclic Sighing',
    description: 'Double inhale through the nose, long exhale through the mouth. Proven to lower cortisol.',
    duration: '5 min', inhale: 4, holdIn: 0, exhale: 6, holdOut: 2,
  ),
  BreathworkCard(
    tag: 'FOCUS', tagColor: LiberaColors.tertiary,
    title: 'Box Breathing',
    description: 'Equal parts inhale, hold, exhale, hold. Used by Navy SEALs for calm under pressure.',
    duration: '5 min', inhale: 4, holdIn: 4, exhale: 4, holdOut: 4,
  ),
  BreathworkCard(
    tag: 'RELEASE', tagColor: LiberaColors.secondary,
    title: 'Diaphragmatic Breathing',
    description: 'Belly breathing — hand on chest stays still, belly rises and falls. Deep parasympathetic activation.',
    duration: '5 min', inhale: 4, holdIn: 0, exhale: 7, holdOut: 2,
    instruction: 'Keep one hand on your chest and the other on your belly.',
  ),
  BreathworkCard(
    tag: 'ENERGY', tagColor: LiberaColors.tertiary,
    title: '4-7-8 Breathing',
    description: 'Inhale 4, hold 7, exhale 8. Dr. Andrew Weil\'s natural tranquilizer for the nervous system.',
    duration: '4 min', inhale: 4, holdIn: 7, exhale: 8, holdOut: 0,
  ),
  BreathworkCard(
    tag: 'GROUND', tagColor: LiberaColors.primary,
    title: 'Resonance Breathing',
    description: '5.5 breaths per minute — the resonance frequency of the human cardiovascular system.',
    duration: '6 min', inhale: 5, holdIn: 0, exhale: 5, holdOut: 1,
  ),
];

// ── Meditation cards ──
const meditationCards = [
  MeditationCard(
    icon: Icons.self_improvement,
    title: 'Body Scan',
    subtitle: 'Progressive awareness',
    duration: '10 min',
    script: 'Begin by bringing your attention to the top of your head. Notice any sensations — warmth, tingling, pressure. Slowly move your attention downward through your forehead, your eyes, your jaw. Let each area soften as you notice it...',
  ),
  MeditationCard(
    icon: Icons.favorite_outline,
    title: 'Loving Kindness',
    subtitle: 'Compassion meditation',
    duration: '8 min',
    script: 'Bring to mind someone you care about. Picture them clearly. Now silently repeat: May you be happy. May you be healthy. May you be safe. May you live with ease. Feel the warmth of these wishes as you send them outward...',
  ),
  MeditationCard(
    icon: Icons.nature,
    title: 'Open Awareness',
    subtitle: 'Non-directive presence',
    duration: '12 min',
    script: 'Let your attention be wide and open. Don\'t focus on any one thing. Instead, notice whatever arises — sounds, sensations, thoughts — and let each one pass without following it. You are the sky, not the weather...',
  ),
  MeditationCard(
    icon: Icons.nightlight_round,
    title: 'Sleep Preparation',
    subtitle: 'Wind-down practice',
    duration: '15 min',
    script: 'Lie down comfortably. Take three slow breaths. With each exhale, feel yourself sinking deeper into the surface beneath you. Release the day — thought by thought, sensation by sensation. There is nothing left to do...',
  ),
];

// ── Suggestion cards ──
const suggestionCards = [
  SuggestionCard(
    icon: Icons.air,
    title: 'Cyclic Sighing',
    reason: 'Heart rate elevated — calming breath pattern recommended',
    duration: '5 min',
  ),
  SuggestionCard(
    icon: Icons.self_improvement,
    title: 'Body Scan',
    reason: 'Low movement detected — reconnect with physical awareness',
    duration: '10 min',
  ),
  SuggestionCard(
    icon: Icons.favorite_outline,
    title: 'Loving Kindness',
    reason: 'Social activity low — compassion practice suggested',
    duration: '8 min',
  ),
  SuggestionCard(
    icon: Icons.nightlight_round,
    title: 'Sleep Preparation',
    reason: 'Late evening — wind-down practice for better rest',
    duration: '15 min',
  ),
];
