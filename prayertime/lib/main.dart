import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:adhan/adhan.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:geolocator/geolocator.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize timezone database
  tz.initializeTimeZones();

  // Catch any unhandled Flutter framework errors
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('Flutter error: ${details.exception}');
  };

  runApp(const PrayerTimeApp());
}

class Location {
  final String name;
  final double latitude;
  final double longitude;
  final String timezone;

  Location(this.name, this.latitude, this.longitude, this.timezone);
}

class PrayerTimeApp extends StatelessWidget {
  const PrayerTimeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Prayer Time',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF010101),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: Colors.white),
          bodyMedium: TextStyle(color: Colors.white),
          bodySmall: TextStyle(color: Colors.white),
        ),
      ),
      home: const LocationCheckScreen(),
    );
  }
}

/// Gets the device's local IANA timezone name (e.g. "America/New_York")
String _getDeviceTimezone() {
  final now = DateTime.now();
  final offset = now.timeZoneOffset;

  // Try to find a matching timezone in the tz database
  // First, check the device's timezone name from DateTime
  final deviceTzName = now.timeZoneName;

  // Map common abbreviations to IANA names
  final abbrMap = {
    'EST': 'America/New_York',
    'EDT': 'America/New_York',
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'AKST': 'America/Anchorage',
    'AKDT': 'America/Anchorage',
    'HST': 'Pacific/Honolulu',
    'GMT': 'Europe/London',
    'BST': 'Europe/London',
    'CET': 'Europe/Paris',
    'CEST': 'Europe/Paris',
    'EET': 'Europe/Athens',
    'EEST': 'Europe/Athens',
    'IST': 'Asia/Kolkata',
    'PKT': 'Asia/Karachi',
    'AST': 'Asia/Riyadh',
    'GST': 'Asia/Dubai',
    'JST': 'Asia/Tokyo',
    'KST': 'Asia/Seoul',
    'CST_CHINA': 'Asia/Shanghai',
    'SGT': 'Asia/Singapore',
    'AEST': 'Australia/Sydney',
    'AEDT': 'Australia/Sydney',
    'NZST': 'Pacific/Auckland',
    'NZDT': 'Pacific/Auckland',
  };

  if (abbrMap.containsKey(deviceTzName)) {
    return abbrMap[deviceTzName]!;
  }

  // If the device returns an IANA name directly (common on iOS/newer Android)
  try {
    tz.getLocation(deviceTzName);
    return deviceTzName;
  } catch (_) {
    // Not a valid IANA name
  }

  // Last resort: find timezone by offset
  final hours = offset.inHours;
  final offsetMap = {
    -12: 'Pacific/Kwajalein',
    -11: 'Pacific/Pago_Pago',
    -10: 'Pacific/Honolulu',
    -9: 'America/Anchorage',
    -8: 'America/Los_Angeles',
    -7: 'America/Denver',
    -6: 'America/Chicago',
    -5: 'America/New_York',
    -4: 'America/Halifax',
    -3: 'America/Sao_Paulo',
    -2: 'Atlantic/South_Georgia',
    -1: 'Atlantic/Azores',
    0: 'Europe/London',
    1: 'Europe/Paris',
    2: 'Europe/Athens',
    3: 'Asia/Riyadh',
    4: 'Asia/Dubai',
    5: 'Asia/Karachi',
    6: 'Asia/Dhaka',
    7: 'Asia/Bangkok',
    8: 'Asia/Shanghai',
    9: 'Asia/Tokyo',
    10: 'Australia/Sydney',
    11: 'Pacific/Noumea',
    12: 'Pacific/Auckland',
  };

  return offsetMap[hours] ?? 'UTC';
}

// Preset locations
final List<Location> presetLocations = [
  Location('San Francisco, CA', 37.7749, -122.4194, 'America/Los_Angeles'),
  Location('Boston, MA', 42.3601, -71.0589, 'America/New_York'),
  Location('New York, NY', 40.7128, -74.0060, 'America/New_York'),
  Location('Columbus, OH', 39.9612, -82.9988, 'America/New_York'),
  Location('Hanover, NH', 43.7022, -72.2896, 'America/New_York'),
];

const String kCurrentLocationKey = '__current_location__';

class LocationCheckScreen extends StatefulWidget {
  const LocationCheckScreen({super.key});

  @override
  State<LocationCheckScreen> createState() => _LocationCheckScreenState();
}

class _LocationCheckScreenState extends State<LocationCheckScreen> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkSavedLocation();
  }

  Future<void> _checkSavedLocation() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedLocation = prefs.getString('selected_location');

      if (savedLocation != null && mounted) {
        if (savedLocation == kCurrentLocationKey) {
          // Restore GPS-based location
          final lat = prefs.getDouble('custom_latitude');
          final lng = prefs.getDouble('custom_longitude');
          final tzName = prefs.getString('custom_timezone');
          if (lat != null && lng != null && tzName != null) {
            final location = Location('Current Location', lat, lng, tzName);
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => PrayerTimePage(
                  locationName: kCurrentLocationKey,
                  customLocation: location,
                ),
              ),
            );
            return;
          }
        } else {
          // Verify the saved preset location still exists
          final exists = presetLocations.any((loc) => loc.name == savedLocation);
          if (exists) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) =>
                    PrayerTimePage(locationName: savedLocation),
              ),
            );
            return;
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading saved location: $e');
    }

    // No valid location found or error occurred, show selection screen
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF010101),
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }
    return const LocationSelectionScreen();
  }
}

class LocationSelectionScreen extends StatefulWidget {
  const LocationSelectionScreen({super.key});

  @override
  State<LocationSelectionScreen> createState() =>
      _LocationSelectionScreenState();
}

class _LocationSelectionScreenState extends State<LocationSelectionScreen> {
  bool _isLocating = false;

  Future<void> _selectPresetLocation(Location location) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('selected_location', location.name);
      // Clear any custom location data
      await prefs.remove('custom_latitude');
      await prefs.remove('custom_longitude');
      await prefs.remove('custom_timezone');
    } catch (e) {
      debugPrint('Error saving location: $e');
    }

    if (mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => PrayerTimePage(locationName: location.name),
        ),
      );
    }
  }

  Future<void> _useMyLocation() async {
    setState(() {
      _isLocating = true;
    });

    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          _showError('Location services are disabled. Please enable them in your device settings.');
        }
        return;
      }

      // Check / request permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            _showError('Location permission denied. Please allow location access to use this feature.');
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          _showError('Location permission permanently denied. Please enable it in your device settings.');
        }
        return;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );

      final deviceTz = _getDeviceTimezone();
      final location = Location(
        'Current Location',
        position.latitude,
        position.longitude,
        deviceTz,
      );

      // Save custom location
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('selected_location', kCurrentLocationKey);
        await prefs.setDouble('custom_latitude', position.latitude);
        await prefs.setDouble('custom_longitude', position.longitude);
        await prefs.setString('custom_timezone', deviceTz);
      } catch (e) {
        debugPrint('Error saving GPS location: $e');
      }

      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => PrayerTimePage(
              locationName: kCurrentLocationKey,
              customLocation: location,
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
      if (mounted) {
        _showError('Could not get your location. Please try again or select a city manually.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLocating = false;
        });
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFF171719),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      child: Scaffold(
        backgroundColor: const Color(0xFF010101),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 40),
                const Text(
                  'Select Your Location',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Choose your city to see accurate prayer times',
                  style: TextStyle(color: Color(0xFF727176), fontSize: 16),
                ),
                const SizedBox(height: 40),

                // "Use My Location" button
                Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: InkWell(
                    onTap: _isLocating ? null : _useMyLocation,
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF171719),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF2C2C2E),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.my_location,
                            color: _isLocating
                                ? const Color(0xFF8E8E93)
                                : Colors.white,
                            size: 24,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _isLocating
                                      ? 'Getting your location...'
                                      : 'Use My Location',
                                  style: TextStyle(
                                    color: _isLocating
                                        ? const Color(0xFF8E8E93)
                                        : Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Automatically detect using GPS',
                                  style: TextStyle(
                                    color: Color(0xFF727176),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_isLocating)
                            const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Color(0xFF8E8E93),
                              ),
                            )
                          else
                            const Icon(
                              Icons.arrow_forward_ios,
                              color: Color(0xFF8E8E93),
                              size: 16,
                            ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Divider
                const Padding(
                  padding: EdgeInsets.only(bottom: 16.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Divider(color: Color(0xFF2C2C2E), height: 1),
                      ),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12.0),
                        child: Text(
                          'or choose a city',
                          style:
                              TextStyle(color: Color(0xFF727176), fontSize: 13),
                        ),
                      ),
                      Expanded(
                        child: Divider(color: Color(0xFF2C2C2E), height: 1),
                      ),
                    ],
                  ),
                ),

                // Preset locations
                Expanded(
                  child: ListView.builder(
                    itemCount: presetLocations.length,
                    itemBuilder: (context, index) {
                      final location = presetLocations[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16.0),
                        child: InkWell(
                          onTap: () => _selectPresetLocation(location),
                          child: Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: const Color(0xFF171719),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFF171719),
                                width: 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.location_on,
                                  color: Colors.white,
                                  size: 24,
                                ),
                                const SizedBox(width: 16),
                                Text(
                                  location.name,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const Spacer(),
                                const Icon(
                                  Icons.arrow_forward_ios,
                                  color: Color(0xFF8E8E93),
                                  size: 16,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class PrayerTimePage extends StatefulWidget {
  final String locationName;
  final Location? customLocation;

  const PrayerTimePage({
    super.key,
    required this.locationName,
    this.customLocation,
  });

  @override
  State<PrayerTimePage> createState() => _PrayerTimePageState();
}

class _PrayerTimePageState extends State<PrayerTimePage> {
  Location? _selectedLocation;

  @override
  void initState() {
    super.initState();
    _loadLocation();
  }

  void _loadLocation() {
    if (widget.customLocation != null) {
      // GPS-based custom location passed directly
      setState(() {
        _selectedLocation = widget.customLocation;
      });
      return;
    }

    // Find the preset location by name
    final location = presetLocations.firstWhere(
      (loc) => loc.name == widget.locationName,
      orElse: () => presetLocations[4], // Default to Hanover
    );
    setState(() {
      _selectedLocation = location;
    });
  }

  Future<void> _changeLocation() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('selected_location');
      await prefs.remove('custom_latitude');
      await prefs.remove('custom_longitude');
      await prefs.remove('custom_timezone');
    } catch (e) {
      debugPrint('Error clearing location: $e');
    }

    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  String? _calculationError;

  Map<String, String> calculatePrayerTimes() {
    if (_selectedLocation == null) {
      return {};
    }

    try {
      final coordinates = Coordinates(
        _selectedLocation!.latitude,
        _selectedLocation!.longitude,
      );

      final params = CalculationMethod.north_america.getParameters();
      params.madhab = Madhab.shafi;

      final now = DateTime.now();

      // Create DateComponents from the local date
      final dateComponents = DateComponents(now.year, now.month, now.day);
      final prayerTimes = PrayerTimes(coordinates, dateComponents, params);

      final DateFormat timeFormat = DateFormat('HH:mm');

      // Get the timezone location for the selected city
      final locationTimezone = tz.getLocation(_selectedLocation!.timezone);

      // Convert UTC times to the city's local timezone
      String formatTime(DateTime utcTime) {
        final cityLocalTime = tz.TZDateTime.from(utcTime, locationTimezone);
        return timeFormat.format(cityLocalTime);
      }

      _calculationError = null;
      return {
        'Fajr': formatTime(prayerTimes.fajr),
        'Sunrise': formatTime(prayerTimes.sunrise),
        'Dhuhr': formatTime(prayerTimes.dhuhr),
        'Asr': formatTime(prayerTimes.asr),
        'Maghrib': formatTime(prayerTimes.maghrib),
        'Isha': formatTime(prayerTimes.isha),
        'Sunset': formatTime(prayerTimes.maghrib),
      };
    } catch (e) {
      debugPrint('Error calculating prayer times: $e');
      _calculationError =
          'Unable to calculate prayer times. Please try selecting your location again.';
      return {};
    }
  }

  Widget _buildTimeCard(String label, String time) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF171719),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF171719), width: 1),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(color: Color(0xFF8E8E93), fontSize: 18),
            ),
            Text(
              time,
              style: const TextStyle(
                color: Color(0xFF8E8E93),
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedLocation == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF010101),
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    final now = DateTime.now();
    final dayOfWeek = DateFormat('EEEE').format(now);
    final date = DateFormat('d MMMM, yyyy').format(now);
    final prayerTimesMap = calculatePrayerTimes();

    // Show error state if prayer times failed to calculate
    if (prayerTimesMap.isEmpty || _calculationError != null) {
      return Scaffold(
        backgroundColor: const Color(0xFF010101),
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline,
                      color: Color(0xFF8E8E93), size: 48),
                  const SizedBox(height: 16),
                  Text(
                    _calculationError ?? 'Unable to load prayer times.',
                    textAlign: TextAlign.center,
                    style:
                        const TextStyle(color: Color(0xFF8E8E93), fontSize: 16),
                  ),
                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: _changeLocation,
                    child: const Text(
                      'Change Location',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // Get current time in the selected timezone (with fallback)
    String timeString;
    String tzAbbr;
    try {
      final locationTimezone = tz.getLocation(_selectedLocation!.timezone);
      final currentTime = tz.TZDateTime.from(now, locationTimezone);
      timeString = DateFormat('HH:mm').format(currentTime);

      // Determine if it's daylight saving time
      final isDST = currentTime.timeZoneOffset.inHours >
          tz.TZDateTime(locationTimezone, currentTime.year, 1, 1)
              .timeZoneOffset
              .inHours;

      // Get timezone abbreviation based on location and DST
      final tzAbbrMap = {
        'America/Los_Angeles': isDST ? 'PDT' : 'PST',
        'America/New_York': isDST ? 'EDT' : 'EST',
        'America/Chicago': isDST ? 'CDT' : 'CST',
        'America/Denver': isDST ? 'MDT' : 'MST',
        'America/Anchorage': isDST ? 'AKDT' : 'AKST',
        'Pacific/Honolulu': 'HST',
        'Europe/London': isDST ? 'BST' : 'GMT',
        'Europe/Paris': isDST ? 'CEST' : 'CET',
        'Asia/Kolkata': 'IST',
        'Asia/Karachi': 'PKT',
        'Asia/Riyadh': 'AST',
        'Asia/Dubai': 'GST',
        'Asia/Tokyo': 'JST',
        'Asia/Shanghai': 'CST',
      };

      tzAbbr = tzAbbrMap[_selectedLocation!.timezone] ??
          (() {
            final offset = currentTime.timeZoneOffset.inHours;
            return offset >= 0 ? 'GMT+$offset' : 'GMT$offset';
          })();
    } catch (e) {
      debugPrint('Error getting timezone info: $e');
      timeString = DateFormat('HH:mm').format(now);
      tzAbbr = '';
    }

    final List<Map<String, String>> prayerTimes = [
      {'label': 'Fajr', 'time': prayerTimesMap['Fajr'] ?? '--:--'},
      {'label': 'Dhuhr', 'time': prayerTimesMap['Dhuhr'] ?? '--:--'},
      {'label': 'Asr', 'time': prayerTimesMap['Asr'] ?? '--:--'},
      {'label': 'Maghrib', 'time': prayerTimesMap['Maghrib'] ?? '--:--'},
      {'label': 'Isha', 'time': prayerTimesMap['Isha'] ?? '--:--'},
    ];

    final List<Map<String, String>> otherInfo = [
      {'label': 'Sunrise', 'time': prayerTimesMap['Sunrise'] ?? '--:--'},
      {'label': 'Sunset', 'time': prayerTimesMap['Sunset'] ?? '--:--'},
    ];

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) {
          try {
            final prefs = await SharedPreferences.getInstance();
            await prefs.remove('selected_location');
            await prefs.remove('custom_latitude');
            await prefs.remove('custom_longitude');
            await prefs.remove('custom_timezone');
          } catch (e) {
            debugPrint('Error clearing location on pop: $e');
          }
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF010101),
        body: SafeArea(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dayOfWeek,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    date,
                    style: const TextStyle(
                      color: Color(0xFFD0D0D0),
                      fontSize: 24,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: _changeLocation,
                        child: Row(
                          children: [
                            const Icon(
                              Icons.location_on,
                              color: Color(0xFFD0D0D0),
                              size: 16,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _selectedLocation!.name,
                              style: const TextStyle(
                                color: Color(0xFFD0D0D0),
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        '$timeString $tzAbbr',
                        style: const TextStyle(
                          color: Color(0xFFD0D0D0),
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),
                  const Text(
                    'Prayer Times',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...prayerTimes.map(
                    (prayer) =>
                        _buildTimeCard(prayer['label']!, prayer['time']!),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Other Information',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...otherInfo.map(
                    (info) => _buildTimeCard(info['label']!, info['time']!),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
