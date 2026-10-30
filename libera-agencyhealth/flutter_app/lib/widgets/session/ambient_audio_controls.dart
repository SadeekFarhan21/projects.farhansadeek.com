import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../services/audio_service.dart';

class AmbientAudioControls extends StatefulWidget {
  const AmbientAudioControls({super.key});

  @override
  State<AmbientAudioControls> createState() => _AmbientAudioControlsState();
}

class _AmbientAudioControlsState extends State<AmbientAudioControls> {
  String? _selectedTrack;
  bool _isPlaying = false;

  static const _tracks = [
    ('rain', 'Rain', Icons.water_drop),
    ('white-noise', 'White Noise', Icons.graphic_eq),
    ('cello', 'Cello', Icons.music_note),
    ('singing-bowl', 'Singing Bowl', Icons.notifications),
  ];

  void _toggleTrack(String trackId) {
    if (_selectedTrack == trackId && _isPlaying) {
      AudioService.instance.stop();
      setState(() {
        _isPlaying = false;
        _selectedTrack = null;
      });
    } else {
      AudioService.instance.play(trackId);
      setState(() {
        _selectedTrack = trackId;
        _isPlaying = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      onSelected: _toggleTrack,
      icon: Icon(
        _isPlaying ? Icons.volume_up : Icons.volume_off,
        color: _isPlaying ? LiberaColors.primary : LiberaColors.onSurfaceVariant,
        size: 20,
      ),
      color: LiberaColors.surfaceContainerHigh,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      itemBuilder: (_) => _tracks.map((t) => PopupMenuItem(
        value: t.$1,
        child: Row(
          children: [
            Icon(t.$3, size: 18, color: _selectedTrack == t.$1 ? LiberaColors.primary : LiberaColors.onSurfaceVariant),
            const SizedBox(width: 10),
            Text(
              t.$2,
              style: TextStyle(
                color: _selectedTrack == t.$1 ? LiberaColors.primary : LiberaColors.onSurface,
                fontWeight: _selectedTrack == t.$1 ? FontWeight.w700 : FontWeight.w400,
                fontSize: 13,
              ),
            ),
          ],
        ),
      )).toList(),
    );
  }
}
