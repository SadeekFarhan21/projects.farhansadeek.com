# API Keys Setup

This project uses environment variables to securely store API keys.

## Setup Instructions

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** and add your actual API keys:
   ```
   API_KEY=your_actual_api_key_here
   BARCODE_API_KEY=your_actual_barcode_api_key_here
   FOOD_API_KEY=your_actual_food_api_key_here
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. **The `.env` file is gitignored** - it will NOT be committed to version control.

## Using API Keys in Code

Import the `Env` class and use it to access your API keys:

```dart
import 'config/env.dart';

// Get an API key
String apiKey = Env.apiKey;
String barcodeKey = Env.barcodeApiKey;
String geminiKey = Env.geminiApiKey;

// Or use the generic getter
String? customKey = Env.get('CUSTOM_API_KEY');

// For required keys (throws error if not found)
String requiredKey = Env.getRequiredApiKey('REQUIRED_KEY');
```

## Security Notes

- ✅ `.env` is in `.gitignore` - your keys are safe
- ✅ `.env.example` is committed as a template
- ❌ Never commit `.env` to version control
- ❌ Never share your `.env` file
- ✅ Add new keys to both `.env` and `.env.example` (without values)

## Adding New API Keys

1. Add the key to `.env.example`:
   ```
   NEW_SERVICE_KEY=your_new_service_key_here
   ```

2. Add the key to your `.env` file with the actual value

3. Optionally add a getter in `lib/config/env.dart`:
   ```dart
   static String get newServiceKey => dotenv.env['NEW_SERVICE_KEY'] ?? '';
   ```

