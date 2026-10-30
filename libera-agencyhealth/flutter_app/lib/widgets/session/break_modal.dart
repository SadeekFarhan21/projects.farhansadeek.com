import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';
import '../../models/session_record.dart';
import '../../providers/session_store_provider.dart';
import '../../utils/formatters.dart';
import 'mood_step.dart';
import 'breathwork_step.dart';
import 'breath_watching_step.dart';
import 'eft_step.dart';
import 'journal_step.dart';
import 'completion_screen.dart';
import 'ambient_audio_controls.dart';

class BreakModal extends StatefulWidget {
  final PackageId packageId;
  final int level;

  const BreakModal({super.key, required this.packageId, required this.level});

  @override
  State<BreakModal> createState() => _BreakModalState();
}

class _BreakModalState extends State<BreakModal> {
  int _stepIndex = 0;
  late int _secondsRemaining;
  double _moodValue = 50;
  final _journal = {'q1': '', 'q2': '', 'q3': ''};
  List<String> _eftAnswers = ['', '', '', ''];
  bool _completed = false;
  Timer? _timer;

  PackageDef get _package => packages[widget.packageId]!;

  @override
  void initState() {
    super.initState();
    _secondsRemaining = steps[0].duration;
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        // Auto-advance for timed steps (breathwork, breath-watching)
        final currentStep = steps[_stepIndex];
        if (currentStep.id == StepId.breathwork || currentStep.id == StepId.breathWatching) {
          _nextStep();
        }
      }
    });
  }

  void _nextStep() {
    if (_stepIndex + 1 >= steps.length) {
      _completeSession();
      return;
    }
    setState(() {
      _stepIndex++;
      _secondsRemaining = steps[_stepIndex].duration;
    });
  }

  void _prevStep() {
    if (_stepIndex > 0) {
      setState(() {
        _stepIndex--;
        _secondsRemaining = steps[_stepIndex].duration;
      });
    }
  }

  void _completeSession() {
    _timer?.cancel();
    final store = context.read<SessionStoreProvider>();
    store.saveSession(SessionRecord(
      id: 'session-${DateTime.now().millisecondsSinceEpoch}',
      date: DateTime.now(),
      packageId: widget.packageId,
      mood: _moodValue.round(),
      eftAnswers: _eftAnswers,
      journal: JournalEntry(q1: _journal['q1']!, q2: _journal['q2']!, q3: _journal['q3']!),
    ));
    setState(() => _completed = true);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            LiberaColors.surface,
            LiberaColors.surfaceDim,
          ],
        ),
      ),
      child: SafeArea(
        child: _completed
            ? CompletionScreen(
                level: widget.level,
                package: _package,
                onClose: () => Navigator.of(context).pop(),
              )
            : Column(
                children: [
                  _buildHeader(),
                  // Progress bar
                  _buildProgressBar(),
                  // Step content
                  Expanded(child: _buildStep()),
                  // Navigation
                  _buildNavigation(),
                ],
              ),
      ),
    );
  }

  Widget _buildHeader() {
    final color = _stepPackageColor();
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _package.label.toUpperCase(),
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color, letterSpacing: 1.5),
              ),
              Text(
                steps[_stepIndex].label,
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: LiberaColors.onSurface),
              ),
            ],
          ),
          Row(
            children: [
              const AmbientAudioControls(),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: Icon(Icons.close, color: LiberaColors.onSurfaceVariant, size: 22),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProgressBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Column(
        children: [
          // Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: (_stepIndex + 1) / steps.length,
              backgroundColor: LiberaColors.surfaceContainerHigh,
              valueColor: AlwaysStoppedAnimation(_stepPackageColor().withValues(alpha: 0.6)),
              minHeight: 3,
            ),
          ),
          const SizedBox(height: 8),
          // Step dots
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(steps.length, (i) {
              final active = i == _stepIndex;
              final done = i < _stepIndex;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: active ? 10 : 6,
                height: active ? 10 : 6,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done
                      ? _stepPackageColor().withValues(alpha: 0.6)
                      : active
                          ? _stepPackageColor()
                          : LiberaColors.outlineVariant.withValues(alpha: 0.3),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildStep() {
    switch (steps[_stepIndex].id) {
      case StepId.mood:
        return MoodStep(
          value: _moodValue,
          onChanged: (v) => setState(() => _moodValue = v),
        );
      case StepId.breathwork:
        return BreathworkStep(
          package: _package,
          secondsRemaining: _secondsRemaining,
          onComplete: _nextStep,
        );
      case StepId.breathWatching:
        return BreathWatchingStep(secondsRemaining: _secondsRemaining);
      case StepId.eft:
        return EftStep(
          packageId: widget.packageId,
          answers: _eftAnswers,
          onAnswersChanged: (a) => setState(() => _eftAnswers = a),
          secondsRemaining: _secondsRemaining,
        );
      case StepId.journal:
        return JournalStep(
          package: _package,
          q1: _journal['q1']!,
          q2: _journal['q2']!,
          q3: _journal['q3']!,
          onQ1Changed: (v) => _journal['q1'] = v,
          onQ2Changed: (v) => _journal['q2'] = v,
          onQ3Changed: (v) => _journal['q3'] = v,
        );
    }
  }

  Widget _buildNavigation() {
    final isFirst = _stepIndex == 0;
    final isLast = _stepIndex == steps.length - 1;
    final isTimed = steps[_stepIndex].id == StepId.breathwork || steps[_stepIndex].id == StepId.breathWatching;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (!isFirst)
            TextButton(
              onPressed: _prevStep,
              child: Text('Back', style: TextStyle(color: LiberaColors.onSurfaceVariant)),
            )
          else
            const SizedBox(width: 60),
          if (isTimed)
            Text(
              formatTime(_secondsRemaining),
              style: TextStyle(
                fontSize: 13,
                fontFamily: 'monospace',
                color: _secondsRemaining <= 10
                    ? LiberaColors.secondary
                    : LiberaColors.onSurfaceVariant.withValues(alpha: 0.4),
              ),
            ),
          ElevatedButton(
            onPressed: isLast ? _completeSession : _nextStep,
            style: ElevatedButton.styleFrom(
              backgroundColor: _stepPackageColor(),
              foregroundColor: LiberaColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              elevation: 0,
            ),
            child: Text(
              isLast ? 'Complete' : 'Next',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Color _stepPackageColor() {
    switch (_package.color) {
      case PackageColor.primary:
        return LiberaColors.primary;
      case PackageColor.secondary:
        return LiberaColors.secondary;
      case PackageColor.tertiary:
        return LiberaColors.tertiary;
    }
  }
}
