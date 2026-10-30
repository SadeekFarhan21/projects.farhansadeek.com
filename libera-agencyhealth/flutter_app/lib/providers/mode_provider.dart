import 'package:flutter/foundation.dart';

enum ViewMode { sanctuary, open }

class ModeProvider extends ChangeNotifier {
  ViewMode _mode = ViewMode.sanctuary;

  ViewMode get mode => _mode;

  void toggle() {
    _mode = _mode == ViewMode.sanctuary ? ViewMode.open : ViewMode.sanctuary;
    notifyListeners();
  }

  void setMode(ViewMode m) {
    if (_mode != m) {
      _mode = m;
      notifyListeners();
    }
  }
}
