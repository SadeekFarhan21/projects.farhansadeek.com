import 'package:just_audio/just_audio.dart';

/// Manages ambient audio loops for meditation sessions.
class AudioService {
  AudioService._();
  static final instance = AudioService._();

  final _player = AudioPlayer();
  String? _currentTrack;

  // Asset paths for ambient sounds
  static const _trackAssets = {
    'rain': 'assets/audio/rain.mp3',
    'white-noise': 'assets/audio/white_noise.mp3',
    'cello': 'assets/audio/cello.mp3',
    'singing-bowl': 'assets/audio/singing_bowl.mp3',
  };

  Future<void> play(String trackId) async {
    if (_currentTrack == trackId && _player.playing) return;

    final asset = _trackAssets[trackId];
    if (asset == null) return;

    try {
      _currentTrack = trackId;
      await _player.setAsset(asset);
      await _player.setLoopMode(LoopMode.one);
      await _player.setVolume(0.5);
      await _player.play();
    } catch (_) {
      // Audio asset may not exist yet — fail silently
    }
  }

  Future<void> stop() async {
    _currentTrack = null;
    await _player.stop();
  }

  Future<void> setVolume(double volume) async {
    await _player.setVolume(volume.clamp(0.0, 1.0));
  }

  void dispose() {
    _player.dispose();
  }
}
