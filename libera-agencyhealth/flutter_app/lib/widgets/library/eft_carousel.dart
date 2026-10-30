import 'package:flutter/material.dart';
import '../../theme/colors.dart';
import '../../models/session_data.dart';
import '../../models/eft_config.dart';
import '../common/glass_panel.dart';

class EftCarousel extends StatefulWidget {
  const EftCarousel({super.key});

  @override
  State<EftCarousel> createState() => _EftCarouselState();
}

class _EftCarouselState extends State<EftCarousel> {
  int? _expandedIndex;
  final _controllers = <int, List<TextEditingController>>{};
  String? _playbackNarrative;
  int? _playbackIndex;

  List<TextEditingController> _getControllers(int index) {
    return _controllers.putIfAbsent(index, () => List.generate(4, (_) => TextEditingController()));
  }

  @override
  void dispose() {
    for (final list in _controllers.values) {
      for (final c in list) {
        c.dispose();
      }
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entries = eftConfigs.entries.toList();

    return SizedBox(
      height: _expandedIndex != null ? 380 : 160,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: entries.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, i) {
          final pkg = entries[i].key;
          final config = entries[i].value;
          final pkgDef = packages[pkg]!;
          final isExpanded = _expandedIndex == i;
          final controllers = _getControllers(i);

          Color color;
          switch (pkgDef.color) {
            case PackageColor.primary: color = LiberaColors.primary;
            case PackageColor.secondary: color = LiberaColors.secondary;
            case PackageColor.tertiary: color = LiberaColors.tertiary;
          }

          return AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutQuart,
            width: isExpanded ? 300 : 220,
            child: GlassPanel(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tag
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      pkgDef.label.toUpperCase(),
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: color, letterSpacing: 1),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(config.prompt, maxLines: 3, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: LiberaColors.onSurfaceVariant, height: 1.4)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => setState(() {
                      _expandedIndex = isExpanded ? null : i;
                      _playbackNarrative = null;
                      _playbackIndex = null;
                    }),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        isExpanded ? 'Close' : 'Try It',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
                      ),
                    ),
                  ),
                  if (isExpanded) ...[
                    const SizedBox(height: 12),
                    if (_playbackIndex == i && _playbackNarrative != null)
                      Text(
                        _playbackNarrative!,
                        style: TextStyle(fontSize: 12, color: LiberaColors.onSurfaceVariant.withValues(alpha: 0.85), height: 1.6, fontStyle: FontStyle.italic),
                      )
                    else ...[
                      Text(config.labelA, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant)),
                      const SizedBox(height: 4),
                      _SmallField(controller: controllers[0]),
                      const SizedBox(height: 8),
                      Text(config.labelB, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: LiberaColors.onSurfaceVariant)),
                      const SizedBox(height: 4),
                      if (config.inputType == EftInputType.twoSingles)
                        _SmallField(controller: controllers[1])
                      else
                        ...List.generate(3, (j) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: _SmallField(controller: controllers[j + 1], hint: '${j + 1}...'),
                        )),
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: () {
                          final answers = controllers.map((c) => c.text).toList();
                          setState(() {
                            _playbackNarrative = config.buildNarrative(answers);
                            _playbackIndex = i;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Text('Build Playback', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SmallField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;

  const _SmallField({required this.controller, this.hint = 'Your answer...'});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: TextField(
        controller: controller,
        style: TextStyle(fontSize: 12, color: LiberaColors.onSurface),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(fontSize: 12),
          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          isDense: true,
        ),
      ),
    );
  }
}
