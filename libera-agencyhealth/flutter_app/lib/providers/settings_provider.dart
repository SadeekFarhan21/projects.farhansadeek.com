import 'package:flutter/foundation.dart';

class SettingsProvider extends ChangeNotifier {
  // Focus filter toggles
  bool _blackAndWhite = true;
  bool _halfSpeedScroll = false;
  bool _restrictNotifications = true;

  // Profile
  String _userName = 'Alex Rivera';
  int _totalStreak = 120;

  bool get blackAndWhite => _blackAndWhite;
  bool get halfSpeedScroll => _halfSpeedScroll;
  bool get restrictNotifications => _restrictNotifications;
  String get userName => _userName;
  int get totalStreak => _totalStreak;

  void setBlackAndWhite(bool v) {
    _blackAndWhite = v;
    notifyListeners();
  }

  void setHalfSpeedScroll(bool v) {
    _halfSpeedScroll = v;
    notifyListeners();
  }

  void setRestrictNotifications(bool v) {
    _restrictNotifications = v;
    notifyListeners();
  }

  void setUserName(String name) {
    _userName = name;
    notifyListeners();
  }

  void setTotalStreak(int streak) {
    _totalStreak = streak;
    notifyListeners();
  }
}
