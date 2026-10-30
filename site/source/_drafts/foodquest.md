---
layout: post
title: "FoodQuest Reads Grocery Barcodes on the Phone and Looks Up the Rest"
tab_title: FoodQuest
code: https://github.com/SadeekFarhan21/projects.farhansadeek.com/tree/main/foodquest
date: 2025-12-04 22:05:20
tags:
  - barcode-scanning
  - food-labels
  - mobile-apps
description: >-
  FoodQuest is a solo Flutter app built for Dartmouth's DALI Lab that scans a
  grocery barcode and shows the product's ingredients, Nutri-Score and NOVA
  processing group, after a Python prototype needed four decoding strategies
  to read one barcode from a webcam photo.
---

FoodQuest scans the barcode on a grocery item and tells you what's in it: the ingredients, the Nutri-Score grade, how processed the food is, and whether it's vegan or palm-oil free. I started it as a Python script that photographed a barcode with my laptop webcam, and getting a number out of that photo took four decoding strategies and 334 lines of code. The Flutter version decodes the barcode live on the phone's camera, and that one change turned the project from an image-processing problem into a lookup. **Once the barcode is read where the camera is, a food scanner is mostly a database query and a good screen.**

I built FoodQuest on my own as a project for Dartmouth's DALI Lab over about two and a half weeks in December 2025. The Python prototype read barcodes, looked up ingredients and checked allergies, and the Flutter app grew out of it. The app is about 2,700 lines of Dart, with product data from the Open Food Facts database and sign-in and synced history through Firebase.

## Why It Matters

Ingredient lists are printed in tiny type, and the things people actually want to know (does this contain peanuts, is this ultra-processed, is it vegan) take a careful read to work out. The barcode on the package already identifies the product exactly, and Open Food Facts, a crowdsourced database of packaged food, has the ingredients, allergens, nutrition grades and processing level for each product it knows, keyed by barcode<sup>[[1]](#ref-1)</sup>. So the useful app is short to describe. Point the camera at the barcode and get the answer on screen.

The hard part I expected was the camera. The hard part I found was where to read the barcode.

## Technical Details

### A Barcode Is a Product Key

A UPC or EAN barcode on food encodes 12 or 13 digits, and those digits are the whole identity of the product. Nothing about the food itself is in the barcode. That's why the pipeline has two stages that have nothing to do with each other: turn pixels into digits, then turn digits into a product record. Open Food Facts serves the second stage as a plain JSON endpoint keyed by the barcode, so the second stage is one HTTP request.

### What the Product Record Carries

The record has more than the ingredient text. The fields FoodQuest uses are the Nutri-Score grade (A to E, a front-of-pack nutrition rating), the NOVA group (1 to 4, from unprocessed food to ultra-processed products), and a list of ingredient analysis tags such as `en:vegan` and `en:palm-oil-free`. Each one is already computed by the database, so the app's job is to fetch them and present them clearly.

### Reading Digits From a Photo Is the Fragile Part

A webcam photo of a barcode is blurry, unevenly lit and taken at an angle. Barcode decoders want a sharp, high-contrast image of thin black bars, so the prototype spent most of its code making the photo look more like that.

## Implementation

### The Webcam Prototype

The first version ran on my laptop. It opened the webcam with OpenCV, saved a frame when I pressed space, decoded it, looked the barcode up, and printed the product and an allergy report to the terminal. Decoding a still photo failed often enough that I ended up with four strategies tried in order. First the original image goes to the Google Cloud Vision barcode detector. Then the same image again after preprocessing, then after a gentler preprocessing pass, and finally the open-source `pyzbar` decoder on all of the above. The main preprocessing pass looks like this.

```python
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
enhanced = clahe.apply(gray)
kernel = np.array([[-1, -1, -1],
                   [-1,  9, -1],
                   [-1, -1, -1]])
sharpened = cv2.filter2D(enhanced, -1, kernel)
if sharpened.shape[1] < 800:            # upscale small captures
    ...
_, thresh = cv2.threshold(sharpened, 0, 255,
                          cv2.THRESH_BINARY + cv2.THRESH_OTSU)
```

CLAHE evens out the lighting tile by tile, the kernel sharpens the edges of the bars, and Otsu's threshold turns the result into pure black and white. The second pass is a gentler version of the same idea. It skips the threshold, uses a stronger CLAHE clip limit and upscales to 1,000 pixels wide. The script also measures brightness and contrast before trying anything, so a failed scan could say "too dark" instead of just "no barcode".

The allergy checker was the other half of the prototype. It maps 14 allergen categories to the words that signal them, in both English and French, because Open Food Facts started in France and a lot of its ingredient text is French.

```python
COMMON_ALLERGENS = {
    "milk": ["milk", "lait", "dairy", "lactose", "whey", "lactosérum",
             "cream", "butter", "cheese", "yogurt"],
    "peanuts": ["peanut", "arachide", "groundnut"],
    "gluten": ["gluten", "wheat", "barley", "orge", "rye", "seigle", "malt"],
    ...
}
```

For each allergen in the user's profile, it lowercases the ingredient text and looks for any of the category's words. It's simple, and it's the right level for a first pass. The ingredient text is the only place this information lives for many products.

### Moving the Camera Onto the Phone

The Flutter app replaced all four strategies with the `mobile_scanner` package, which runs the platform's native barcode detector on the live camera feed. The camera keeps looking until it has a clean read, so there's no single bad photo to rescue. The whole decoding step became a controller and a callback.

```dart
final MobileScannerController _scannerController = MobileScannerController(
  detectionSpeed: DetectionSpeed.noDuplicates,
  facing: CameraFacing.back,
);

void _onBarcodeDetect(BarcodeCapture barcodeCapture) async {
  final barcodes = barcodeCapture.barcodes;
  if (barcodes.isNotEmpty) {
    final barcodeValue = barcodes.first.rawValue ?? '';
    if (barcodeValue != _scannedBarcode) {
      setState(() { _scannedBarcode = barcodeValue; _isLoading = true; });
      _lookupProduct(barcodeValue);
    }
  }
}
```

`DetectionSpeed.noDuplicates` stops the detector from firing again for the same code, and the comparison against `_scannedBarcode` keeps a product on screen from reloading while the camera is still pointed at it. **The 334-line decoding module from the prototype has no counterpart in the app.** That's the main thing the project taught me. Preprocessing a single frame is a workaround for not having more frames, and a live camera feed gives you as many as you need.

### Looking the Product Up

The lookup is one GET request to `world.openfoodfacts.org/api/v0/product/{barcode}.json`. The response wraps the record in a `status` field, and I check it loosely because it isn't always the same type.

```dart
final status = jsonData['status'];
final isFound = status == 1 || status == '1' ||
    jsonData['status_verbose'] == 'product found';
```

The `Product` model pulls out the name, brand, image, nutriments, ingredients, Nutri-Score, NOVA group and analysis tags, and the details screen turns them into a Nutri-Score badge, a color-coded NOVA row (green for group 1 through red for group 4), and yes-or-no rows for vegan and palm-oil free.

### History That Works Signed In or Not

Every successful scan goes into a history list. I wanted that list to work without an account and to follow you across devices with one, so the history service writes in two places. It always saves locally to `SharedPreferences`, removing any earlier entry with the same barcode, putting the new one first and keeping the newest 50. If the user is signed in with Firebase Auth, it also writes to Firestore.

```dart
await _firestore
    .collection('users')
    .doc(uid)
    .collection('history')
    .doc(product.code)
    .set({
  'product': product.toJson(),
  'timestamp': FieldValue.serverTimestamp(),
});
```

Using the barcode as the document ID means scanning the same cereal twice updates one document instead of adding a second one, so Firestore deduplicates for free. Reading the history tries Firestore first, ordered by timestamp, and falls back to the local list if the user is signed out or the request fails.

### One Screen, Two Panels

The main screen holds the camera on the left and the product panel on the right, and a scan slides the product panel in. You can also swipe between them. The gesture handler had to tell a swipe from a tap on a button inside the panel, so it only starts dragging after at least 8 pixels of horizontal movement that is also clearly more horizontal than vertical (1.2 times the vertical movement, or more than 15 pixels outright). When you let go, a flick faster than 500 pixels per second follows its direction, and a slower drag snaps to whichever panel is closer.

## Problems

### 1. One Photo Is a Bad Input

Most of the prototype's work went into making a single webcam frame decodable: contrast equalization, sharpening, thresholding, upscaling, two different decoders, and a quality report for when all of it failed. **Every one of those steps was compensating for having one frame instead of a stream.** Switching to a live scanner on the phone made them unnecessary.

### 2. Telling a Swipe From a Tap

The product panel is full of tappable rows, and it also has to respond to a sideways swipe. If the pan handler claims every touch, a tap on a row nudges the panel instead of opening the row. **The answer was a dead zone plus a direction test**, so a drag only starts once the finger has moved at least 8 pixels and clearly sideways. The handler then tracks the total horizontal distance since the touch began and maps it onto the panel's position as a fraction of the screen width, so the panel follows the finger exactly and the release logic only has to pick a side.

## What I Would Change

### Bring the Allergy Check Into the App

The allergy checker lived in the Python prototype and printed its report to a terminal. It belongs on the product screen. Open Food Facts also publishes structured `allergens_tags` and `traces_tags` for many products, which would let the app combine the database's own allergen list with the keyword match on the ingredient text.

### A Profile That Drives the Screen

Right now every user sees the same details screen. A short profile (allergies, vegan, avoiding ultra-processed food) could decide which rows appear first and turn the result into a single yes or no.

## References

<a id="ref-1"></a>[1] Open Food Facts, "Open Food Facts API documentation," openfoodfacts.github.io/openfoodfacts-server/api/.
