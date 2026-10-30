import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  // Load environment variables from .env file
  static Future<void> load() async {
    try {
      // Try to load from file system first (for development)
      await dotenv.load(fileName: ".env");
    } catch (e) {
      // If .env file doesn't exist, try loading from assets (for production)
      try {
        await dotenv.load(fileName: ".env.example");
      } catch (e2) {
        // If both fail, continue without env file
        // You can set environment variables through other means
      }
    }
  }

  // Get API keys with fallback to empty string
  static String get apiKey => dotenv.env['API_KEY'] ?? '';
  static String get barcodeApiKey => dotenv.env['BARCODE_API_KEY'] ?? '';
  static String get foodApiKey => dotenv.env['FOOD_API_KEY'] ?? '';
  static String get geminiApiKey => dotenv.env['GEMINI_API_KEY'] ?? '';

  // Helper method to get any environment variable
  static String? get(String key) => dotenv.env[key];

  // Check if environment is loaded
  static bool get isLoaded => dotenv.isInitialized;

  // Get API key with required check (throws if not found)
  static String getRequiredApiKey(String key) {
    final value = dotenv.env[key];
    if (value == null || value.isEmpty) {
      throw Exception('Required API key "$key" is not set in .env file');
    }
    return value;
  }
}
