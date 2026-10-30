import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';

class JournalStep extends StatelessWidget {
  final PackageDef package;
  final String q1;
  final String q2;
  final String q3;
  final ValueChanged<String> onQ1Changed;
  final ValueChanged<String> onQ2Changed;
  final ValueChanged<String> onQ3Changed;

  const JournalStep({
    super.key,
    required this.package,
    required this.q1,
    required this.q2,
    required this.q3,
    required this.onQ1Changed,
    required this.onQ2Changed,
    required this.onQ3Changed,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      children: [
        Text(
          'Micro-Journal',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: LiberaColors.onSurface),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Take a moment to reflect',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14, color: LiberaColors.onSurfaceVariant),
        ),
        const SizedBox(height: 32),
        _JournalField(
          label: 'In one word, how do you feel right now?',
          value: q1,
          onChanged: onQ1Changed,
        ),
        const SizedBox(height: 16),
        _JournalField(
          label: 'What is one good thing from today?',
          value: q2,
          onChanged: onQ2Changed,
          maxLines: 2,
        ),
        const SizedBox(height: 16),
        _JournalField(
          label: package.journalQ3,
          value: q3,
          onChanged: onQ3Changed,
          maxLines: 3,
        ),
      ],
    );
  }
}

class _JournalField extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final int maxLines;

  const _JournalField({
    required this.label,
    required this.value,
    required this.onChanged,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: LiberaColors.onSurfaceVariant,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          onChanged: onChanged,
          maxLines: maxLines,
          style: TextStyle(color: LiberaColors.onSurface),
          decoration: InputDecoration(
            hintText: 'Write here...',
          ),
          controller: TextEditingController(text: value)
            ..selection = TextSelection.fromPosition(TextPosition(offset: value.length)),
        ),
      ],
    );
  }
}
