import 'package:flutter_tts/flutter_tts.dart';

/// Text-to-speech service for EFT narration.
class TtsService {
  TtsService._();
  static final instance = TtsService._();

  final _tts = FlutterTts();
  bool _initialized = false;

  Future<void> _init() async {
    if (_initialized) return;
    _initialized = true;
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.44); // 0.88 on web scale ≈ 0.44 on Flutter's 0-1 scale
    await _tts.setVolume(0.9);
    await _tts.setPitch(1.0);
  }

  Future<void> speak(String text) async {
    await _init();
    await _tts.speak(text);
  }

  Future<void> stop() async {
    await _tts.stop();
  }

  void dispose() {
    _tts.stop();
  }
}
