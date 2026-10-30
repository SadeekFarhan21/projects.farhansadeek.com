import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';
import '../../models/eft_config.dart';

enum _EftPhase { countdown, input, playback }

class EftStep extends StatefulWidget {
  final PackageId packageId;
  final List<String> answers;
  final ValueChanged<List<String>> onAnswersChanged;
  final int secondsRemaining;

  const EftStep({
    super.key,
    required this.packageId,
    required this.answers,
    required this.onAnswersChanged,
    required this.secondsRemaining,
  });

  @override
  State<EftStep> createState() => _EftStepState();
}

class _EftStepState extends State<EftStep> with SingleTickerProviderStateMixin {
  _EftPhase _phase = _EftPhase.countdown;
  int _countdownValue = 10;
  late final List<TextEditingController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(4, (i) =>
      TextEditingController(text: i < widget.answers.length ? widget.answers[i] : ''));
    _startCountdown();
  }

  void _startCountdown() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      if (_countdownValue <= 1) {
        setState(() => _phase = _EftPhase.input);
        return false;
      }
      setState(() => _countdownValue--);
      return true;
    });
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  void _submitAnswers() {
    final answers = _controllers.map((c) => c.text).toList();
    widget.onAnswersChanged(answers);
    setState(() => _phase = _EftPhase.playback);
  }

  @override
  Widget build(BuildContext context) {
    final config = eftConfigs[widget.packageId]!;

    switch (_phase) {
      case _EftPhase.countdown:
        return _buildCountdown(config);
      case _EftPhase.input:
        return _buildInput(config);
      case _EftPhase.playback:
        return _buildPlayback(config);
    }
  }

  Widget _buildCountdown(EftConfig config) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'EFT Visualization',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: LiberaColors.onSurface),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              config.prompt,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: LiberaColors.onSurfaceVariant, height: 1.6, fontStyle: FontStyle.italic),
            ),
          ),
          const SizedBox(height: 40),
          // Countdown ring
          SizedBox(
            width: 100, height: 100,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: _countdownValue / 10,
                  strokeWidth: 3,
                  backgroundColor: LiberaColors.surfaceContainerHigh,
                  valueColor: AlwaysStoppedAnimation(LiberaColors.primary.withValues(alpha: 0.5)),
                ),
                Text(
                  '$_countdownValue',
                  style: TextStyle(fontSize: 36, fontWeight: FontWeight.w300, color: LiberaColors.onSurface),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput(EftConfig config) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      children: [
        Text(
          'EFT Visualization',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: LiberaColors.onSurface),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        // Input A
        Text(config.labelA, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant)),
        const SizedBox(height: 8),
        TextField(
          controller: _controllers[0],
          style: TextStyle(color: LiberaColors.onSurface),
          decoration: InputDecoration(hintText: 'Your answer...'),
        ),
        const SizedBox(height: 20),
        // Input B (or carousel inputs)
        Text(config.labelB, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant)),
        const SizedBox(height: 8),
        if (config.inputType == EftInputType.twoSingles)
          TextField(
            controller: _controllers[1],
            style: TextStyle(color: LiberaColors.onSurface),
            decoration: InputDecoration(hintText: 'Your answer...'),
          )
        else
          ...List.generate(3, (i) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: TextField(
              controller: _controllers[i + 1],
              style: TextStyle(color: LiberaColors.onSurface),
              decoration: InputDecoration(hintText: '${i + 1}...'),
            ),
          )),
        const SizedBox(height: 24),
        Center(
          child: ElevatedButton(
            onPressed: _submitAnswers,
            style: ElevatedButton.styleFrom(
              backgroundColor: LiberaColors.primary,
              foregroundColor: LiberaColors.onPrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 14),
            ),
            child: Text('Build Narrative', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }

  Widget _buildPlayback(EftConfig config) {
    final narrative = config.buildNarrative(widget.answers);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Column(
        children: [
          Text(
            'Your Narrative',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: LiberaColors.onSurface),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: LiberaColors.surfaceContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: LiberaColors.outlineVariant.withValues(alpha: 0.15)),
            ),
            child: Text(
              narrative,
              style: TextStyle(
                fontSize: 15,
                color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.85),
                height: 1.7,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
