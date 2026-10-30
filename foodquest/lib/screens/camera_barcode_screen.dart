import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../models/product.dart';
import '../services/openfoodfacts_service.dart';
import '../services/history_service.dart';
import 'history_screen.dart';
import 'login_screen.dart';
import 'product_details_screen.dart'; // Import the new screen

class CameraBarcodeScreen extends StatefulWidget {
  const CameraBarcodeScreen({super.key});

  @override
  State<CameraBarcodeScreen> createState() => _CameraBarcodeScreenState();
}

class _CameraBarcodeScreenState extends State<CameraBarcodeScreen>
    with SingleTickerProviderStateMixin {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );

  final TextEditingController _searchController = TextEditingController();
  final HistoryService _historyService = HistoryService();
  String? _scannedBarcode;
  bool _isFlashOn = false;
  Product? _product;
  bool _isLoading = false;
  String? _errorMessage;
  int _selectedIndex = 1; // Default to 'Scan' tab

  late AnimationController _slideAnimationController;
  late Animation<double> _slideAnimation;
  double _dragStartValue = 0.0;
  bool _isDragging = false;
  double _dragStartX = 0.0;
  double _dragStartY = 0.0;
  double _totalDragDelta = 0.0;

  @override
  void initState() {
    super.initState();
    _slideAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _slideAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _slideAnimationController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _scannerController.dispose();
    _searchController.dispose();
    _slideAnimationController.dispose();
    super.dispose();
  }

  void _onBarcodeDetect(BarcodeCapture barcodeCapture) async {
    final List<Barcode> barcodes = barcodeCapture.barcodes;
    if (barcodes.isNotEmpty) {
      final String barcodeValue = barcodes.first.rawValue ?? '';
      if (barcodeValue != _scannedBarcode) {
        setState(() {
          _scannedBarcode = barcodeValue;
          _isLoading = true;
          _errorMessage = null;
          _product = null;
        });
        _slideAnimationController.reset(); // Reset animation for new scan

        _lookupProduct(barcodeValue);
      }
    }
  }

  Future<void> _lookupProduct(String barcode) async {
    try {
      print('Scanning barcode: $barcode');
      final product = await OpenFoodFactsService.getProductByBarcode(barcode);
      setState(() {
        _isLoading = false;
        if (product != null) {
          if (product.isValid) {
            _product = product;
            _historyService.addToHistory(product);
            _slideAnimationController
                .forward(); // Slide to show product panel on the right
          } else {
            _errorMessage = 'Product found but missing details (Name/Brand).';
            print('Product found but invalid: ${product.toJson()}');
          }
        } else {
          _errorMessage = 'Product not found in database (Barcode: $barcode)';
        }
      });
    } catch (e) {
      print('Error in UI: $e');
      setState(() {
        _isLoading = false;
        _errorMessage = 'Error fetching product: ${e.toString()}';
      });
    }
  }

  void _toggleFlash() {
    setState(() {
      _isFlashOn = !_isFlashOn;
      _scannerController.toggleTorch();
    });
  }

  void _handlePanStart(DragStartDetails details) {
    _dragStartX = details.globalPosition.dx;
    _dragStartY = details.globalPosition.dy;
    _dragStartValue = _slideAnimationController.value;
    _totalDragDelta = 0.0;
    _isDragging = false; // Reset dragging state
    _slideAnimationController.stop();
  }

  void _handlePanUpdate(DragUpdateDetails details, double screenWidth) {
    final currentX = details.globalPosition.dx;
    final currentY = details.globalPosition.dy;
    final deltaX = currentX - _dragStartX;
    final deltaY = currentY - _dragStartY;

    // Start dragging if horizontal movement is significant
    // Threshold must be high enough to not interfere with taps
    if (!_isDragging) {
      // Start dragging if horizontal movement is at least 8px and clearly more horizontal
      // This works for both left and right swipes, but won't interfere with taps
      if (deltaX.abs() > 8 &&
          (deltaX.abs() > deltaY.abs() * 1.2 || deltaX.abs() > 15)) {
        _isDragging = true;
      }
    }

    if (_isDragging) {
      // Accumulate total drag delta
      _totalDragDelta -= details
          .delta
          .dx; // Negative because swiping left should increase value

      // Update animation value based on total drag from start
      // Swiping LEFT (negative delta.dx) should INCREASE value (show right panel)
      // Swiping RIGHT (positive delta.dx) should DECREASE value (show left panel)
      final delta = _totalDragDelta / screenWidth;
      final newValue = (_dragStartValue + delta).clamp(0.0, 1.0);
      _slideAnimationController.value = newValue;
    }
  }

  void _handlePanEnd(DragEndDetails details, double screenWidth) {
    if (!_isDragging) {
      _isDragging = false;
      _totalDragDelta = 0.0;
      return;
    }

    _isDragging = false;
    _totalDragDelta = 0.0;
    final currentValue = _slideAnimationController.value;

    // Snap to nearest position (0 or 1) based on velocity or position
    final velocity = details.velocity.pixelsPerSecond.dx;
    if (velocity.abs() > 500) {
      // Fast swipe - follow the direction
      // Negative velocity = swiping left = show right panel (forward)
      // Positive velocity = swiping right = show left panel (reverse)
      if (velocity < 0) {
        // Swiping left - show product panel
        _slideAnimationController.forward();
      } else {
        // Swiping right - show search panel
        _slideAnimationController.reverse();
        setState(() {
          _product = null;
        });
      }
    } else {
      // Slow drag - snap to nearest position
      if (currentValue < 0.5) {
        // Closer to left panel - snap to search panel
        _slideAnimationController.reverse();
        setState(() {
          _product = null;
        });
      } else {
        // Closer to right panel - snap to product panel
        _slideAnimationController.forward();
      }
    }
  }

  void _showProductDialog(Product product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Stack(
        alignment: Alignment.center,
        children: [
          // Semi-transparent background tap to dismiss
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(color: Colors.transparent),
          ),

          // The Match Card
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Spacer(),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1E1E),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Header
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: const BoxDecoration(
                          color: Color(0xFF4CAF50), // Green
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(20),
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Good match (56%)',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const Spacer(),
                            GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: const Icon(
                                Icons.close,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Product Content
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            // Product Info Row
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Image
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    width: 80,
                                    height: 80,
                                    color: Colors.white,
                                    child: product.imageUrl != null
                                        ? Image.network(
                                            product.imageUrl!,
                                            fit: BoxFit.contain,
                                          )
                                        : const Icon(
                                            Icons.image_not_supported,
                                            color: Colors.grey,
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                // Text Details
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        product.productName ??
                                            'Unknown Product',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        product.brand ?? 'Unknown Brand',
                                        style: TextStyle(
                                          color: Colors.grey.shade400,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      if (product.quantity != null)
                                        Text(
                                          product.quantity!,
                                          style: TextStyle(
                                            color: Colors.grey.shade400,
                                            fontSize: 14,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 16),

                            // Nutri-Score Row
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF2C2C2C),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  // Mock Nutri-Score Graphic
                                  _buildNutriScoreBadge(product.nutritionGrade),
                                  const SizedBox(width: 16),
                                  const Expanded(
                                    child: Text(
                                      'Good nutritional quality', // Logic could be added here based on grade
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 12),

                            // Eco-Score Row
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFF2C2C2C),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                children: [
                                  // Mock Eco-Score Graphic
                                  Container(
                                    width: 60,
                                    height: 30,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.eco,
                                          color: Colors.green.shade700,
                                          size: 16,
                                        ),
                                        Text(
                                          'score',
                                          style: TextStyle(
                                            color: Colors.green.shade700,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Text(
                                      product.ecoscoreGrade != null
                                          ? 'Eco-score: ${product.ecoscoreGrade!.toUpperCase()}'
                                          : 'Not yet applicable for the category',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Footer Action
                      GestureDetector(
                        onTap: () {
                          // Expand to full details
                          Navigator.pop(context);
                          _showFullDetails(product);
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: const BoxDecoration(
                            color: Color(0xFF3E3E3E), // Slightly lighter
                            borderRadius: BorderRadius.vertical(
                              bottom: Radius.circular(20),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Tap to see more info...',
                                style: TextStyle(
                                  color: Colors.grey.shade300,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(
                                Icons.arrow_forward,
                                color: Colors.orange.shade400,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Add some spacing from bottom (tab bar height approx)
                const SizedBox(height: 100),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showFullDetails(Product product) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProductDetailsScreen(product: product),
      ),
    );
  }

  Widget _buildNutriScoreBadge(String? grade) {
    // Simplified Nutri-Score badge
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: ['a', 'b', 'c', 'd', 'e'].map((l) {
          final isSelected = grade?.toLowerCase() == l;
          final colorMap = {
            'a': Colors.green.shade800,
            'b': Colors.lightGreen,
            'c': Colors.yellow,
            'd': Colors.orange,
            'e': Colors.red,
          };

          return Container(
            width: 14,
            height: 14,
            margin: const EdgeInsets.symmetric(horizontal: 1),
            decoration: BoxDecoration(
              color: isSelected ? colorMap[l] : colorMap[l]!.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                l.toUpperCase(),
                style: TextStyle(
                  color: isSelected
                      ? Colors.white
                      : Colors.white.withOpacity(0.5),
                  fontSize: 8,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  void _onItemTapped(int index) {
    if (index == 0) {
      // Community/Profile/Login
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    } else if (index == 1) {
      // Scan (Stay here)
    } else if (index == 2) {
      // Lists/History
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const HistoryScreen()),
      );
    }

    // We don't actually change the tab index visually since this screen IS the scan tab.
    // The other "tabs" are separate screens in this flow.
  }

  @override
  Widget build(BuildContext context) {
    // Determine height of camera area (approx 45% of screen)
    final double cameraHeight = MediaQuery.of(context).size.height * 0.45;

    return Scaffold(
      backgroundColor: const Color(0xFF1E1E1E), // Dark background for bottom
      body: Stack(
        children: [
          // Top Part: Camera
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: cameraHeight,
            child: Stack(
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: _onBarcodeDetect,
                ),
                // Camera Overlay (Brackets & Icons)
                CustomPaint(
                  painter: ScannerOverlayPainter(),
                  child: Container(),
                ),
                // Top Buttons
                Positioned(
                  top: 50,
                  left: 16,
                  child: _buildPillButton(
                    icon: Icons.sort,
                    label: 'Clear',
                    onTap: () {
                      setState(() {
                        _scannedBarcode = null;
                        _product = null;
                        _errorMessage = null;
                      });
                      _slideAnimationController
                          .reverse(); // Slide back to original position
                    },
                  ),
                ),
                Positioned(
                  top: 50,
                  right: 16,
                  child: _buildPillButton(
                    icon: Icons.add_to_photos_outlined,
                    label: 'Compare one Product',
                    onTap: () {},
                  ),
                ),
                // Flash Light
                Positioned(
                  bottom: 16,
                  right: 16,
                  child: IconButton(
                    icon: Icon(
                      _isFlashOn ? Icons.flash_on : Icons.flash_off,
                      color: Colors.white,
                      size: 28,
                    ),
                    onPressed: _toggleFlash,
                  ),
                ),
                // Manual Entry Icon (Bottom Left)
                Positioned(
                  bottom: 16,
                  left: 16,
                  child: IconButton(
                    icon: const Icon(
                      Icons.keyboard_alt_outlined,
                      color: Colors.white,
                      size: 28,
                    ),
                    onPressed: () {
                      // Show manual entry dialog
                      _showManualEntryDialog();
                    },
                  ),
                ),
              ],
            ),
          ),

          // Bottom Part: Content Sheet
          Positioned(
            top: cameraHeight - 20, // Overlap slightly
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xFF1E1E1E), // Dark grey
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
                child: GestureDetector(
                  behavior: HitTestBehavior.translucent,
                  onPanStart: _handlePanStart,
                  onPanUpdate: (details) {
                    final screenWidth = MediaQuery.of(context).size.width;
                    _handlePanUpdate(details, screenWidth);
                  },
                  onPanEnd: (details) {
                    final screenWidth = MediaQuery.of(context).size.width;
                    _handlePanEnd(details, screenWidth);
                  },
                  child: AnimatedBuilder(
                    animation: _slideAnimation,
                    builder: (context, child) {
                      final screenWidth = MediaQuery.of(context).size.width;
                      final translateX = -_slideAnimation.value * screenWidth;
                      return Transform.translate(
                        offset: Offset(translateX, 0),
                        child: Row(
                          children: [
                            // Left Panel: Search Interface
                            SizedBox(
                              width: screenWidth,
                              child: SingleChildScrollView(
                                child: Padding(
                                  padding: const EdgeInsets.all(20.0),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      const SizedBox(height: 10),
                                      // Handle Bar
                                      Center(
                                        child: Container(
                                          width: 40,
                                          height: 4,
                                          decoration: BoxDecoration(
                                            color: Colors.grey.shade600,
                                            borderRadius: BorderRadius.circular(
                                              2,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 20),

                                      // Logo Text
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          const Icon(
                                            Icons.apple,
                                            color: Colors.orange,
                                            size: 28,
                                          ), // Placeholder for logo icon
                                          const SizedBox(width: 8),
                                          RichText(
                                            text: const TextSpan(
                                              style: TextStyle(
                                                fontSize: 24,
                                                fontWeight: FontWeight.bold,
                                              ),
                                              children: [
                                                TextSpan(
                                                  text: 'open ',
                                                  style: TextStyle(
                                                    color: Colors.white,
                                                  ),
                                                ),
                                                TextSpan(
                                                  text: 'FOOD ',
                                                  style: TextStyle(
                                                    color: Colors.white,
                                                    backgroundColor:
                                                        Colors.orange,
                                                  ),
                                                ),
                                                TextSpan(
                                                  text: ' facts',
                                                  style: TextStyle(
                                                    color: Colors.white,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),

                                      const SizedBox(height: 16),
                                      const Text(
                                        'Scan a barcode or\nsearch for a product',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),

                                      const SizedBox(height: 24),

                                      // Search Bar
                                      TextField(
                                        controller: _searchController,
                                        style: const TextStyle(
                                          color: Colors.black,
                                        ),
                                        decoration: InputDecoration(
                                          hintText: 'Search for a product',
                                          hintStyle: TextStyle(
                                            color: Colors.grey.shade500,
                                          ),
                                          fillColor: Colors.white,
                                          filled: true,
                                          prefixIcon: const Icon(
                                            Icons.soap,
                                            color: Colors.blue,
                                          ), // Placeholder icon
                                          suffixIcon: IconButton(
                                            icon: const Icon(
                                              Icons.search,
                                              color: Colors.black,
                                            ),
                                            onPressed: () {
                                              // Implement search
                                            },
                                          ),
                                          border: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(
                                              30,
                                            ),
                                            borderSide: BorderSide.none,
                                          ),
                                          contentPadding:
                                              const EdgeInsets.symmetric(
                                                horizontal: 20,
                                                vertical: 16,
                                              ),
                                        ),
                                      ),

                                      const SizedBox(height: 24),

                                      // Feedback Card
                                      Container(
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF2C2C2C),
                                          borderRadius: BorderRadius.circular(
                                            16,
                                          ),
                                        ),
                                        child: Column(
                                          children: [
                                            Container(
                                              width: double.infinity,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 8,
                                                    horizontal: 16,
                                                  ),
                                              decoration: const BoxDecoration(
                                                color: Colors.orange,
                                                borderRadius:
                                                    BorderRadius.vertical(
                                                      top: Radius.circular(16),
                                                    ),
                                              ),
                                              child: Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  const Text(
                                                    'Are you enjoying this app?',
                                                    style: TextStyle(
                                                      color: Colors.white,
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                  GestureDetector(
                                                    onTap: () {}, // Dismiss
                                                    child: const Icon(
                                                      Icons.close,
                                                      color: Colors.white,
                                                      size: 20,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Padding(
                                              padding: const EdgeInsets.all(
                                                16.0,
                                              ),
                                              child: Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceAround,
                                                children: [
                                                  _buildFeedbackEmoji(
                                                    Icons
                                                        .sentiment_dissatisfied,
                                                    'Could do\nbetter',
                                                    Colors.redAccent,
                                                  ),
                                                  _buildFeedbackEmoji(
                                                    Icons.sentiment_neutral,
                                                    'Not bad',
                                                    Colors.orangeAccent,
                                                  ),
                                                  _buildFeedbackEmoji(
                                                    Icons
                                                        .sentiment_very_satisfied,
                                                    'I love it!',
                                                    Colors.green,
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),

                                      if (_isLoading)
                                        const Padding(
                                          padding: EdgeInsets.only(top: 20),
                                          child: Center(
                                            child: CircularProgressIndicator(
                                              color: Colors.orange,
                                            ),
                                          ),
                                        ),

                                      if (_errorMessage != null)
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            top: 20,
                                          ),
                                          child: Container(
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: Colors.red.shade900
                                                  .withOpacity(0.5),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              _errorMessage!,
                                              style: const TextStyle(
                                                color: Colors.white,
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            // Right Panel: Product Details
                            SizedBox(
                              width: screenWidth,
                              child: _product != null
                                  ? SingleChildScrollView(
                                      child: Padding(
                                        padding: const EdgeInsets.all(20.0),
                                        child: _buildProductMatchPanel(
                                          _product!,
                                        ),
                                      ),
                                    )
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF1E1E1E),
        selectedItemColor: Colors.white,
        unselectedItemColor: Colors.grey,
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Community'),
          BottomNavigationBarItem(
            icon: Icon(Icons.search_rounded), // Using search/scan icon
            label: 'Scan',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.list), label: 'Lists'),
        ],
      ),
    );
  }

  Widget _buildPillButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.8),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: Colors.black),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductMatchPanel(Product product) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 10),
        // Match Indicator Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: const BoxDecoration(
            color: Color(0xFF4CAF50), // Green
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Good match (56%)',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _product = null;
                  });
                  _slideAnimationController.reverse();
                },
                child: const Icon(Icons.close, color: Colors.white),
              ),
            ],
          ),
        ),
        // Product Content
        Container(
          decoration: const BoxDecoration(
            color: Color(0xFF1E1E1E),
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Product Info Row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Image
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 80,
                        height: 80,
                        color: Colors.white,
                        child: product.imageUrl != null
                            ? Image.network(
                                product.imageUrl!,
                                fit: BoxFit.contain,
                              )
                            : const Icon(
                                Icons.image_not_supported,
                                color: Colors.grey,
                              ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Text Details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.productName ?? 'Unknown Product',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            product.brand ?? 'Unknown Brand',
                            style: TextStyle(
                              color: Colors.grey.shade400,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          if (product.quantity != null)
                            Text(
                              product.quantity!,
                              style: TextStyle(
                                color: Colors.grey.shade400,
                                fontSize: 14,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Nutri-Score Row
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2C2C2C),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      _buildNutriScoreBadge(product.nutritionGrade),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Text(
                          'Good nutritional quality',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                // Eco-Score Row
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2C2C2C),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 60,
                        height: 30,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.eco,
                              color: Colors.green.shade700,
                              size: 16,
                            ),
                            Text(
                              'score',
                              style: TextStyle(
                                color: Colors.green.shade700,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          product.ecoscoreGrade != null
                              ? 'Eco-score: ${product.ecoscoreGrade!.toUpperCase()}'
                              : 'Not yet applicable for the category',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // Tap to see more info button
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      _showFullDetails(product);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: const BoxDecoration(
                        color: Color(0xFF3E3E3E),
                        borderRadius: BorderRadius.all(Radius.circular(12)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Tap to see more info...',
                            style: TextStyle(
                              color: Colors.grey.shade300,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            Icons.arrow_forward,
                            color: Colors.orange.shade400,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFeedbackEmoji(IconData icon, String label, Color color) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: color, size: 32),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
      ],
    );
  }

  void _showManualEntryDialog() {
    showDialog(
      context: context,
      builder: (context) {
        final TextEditingController manualController = TextEditingController();
        return AlertDialog(
          title: const Text('Enter Barcode'),
          content: TextField(
            controller: manualController,
            keyboardType: TextInputType.number,
            autofocus: true,
            decoration: const InputDecoration(hintText: 'Barcode number'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                if (manualController.text.isNotEmpty) {
                  Navigator.pop(context);
                  _lookupProduct(manualController.text);
                }
              },
              child: const Text('Search'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildProductInfo(Product product) {
    // Reusing the product info widget but adapting for the modal sheet
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          if (product.imageUrl != null)
            Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  product.imageUrl!,
                  height: 200,
                  fit: BoxFit.cover,
                ),
              ),
            ),
          const SizedBox(height: 20),

          Text(
            product.productName ?? 'Unknown Product',
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            product.brand ?? 'Unknown Brand',
            style: TextStyle(fontSize: 18, color: Colors.grey.shade700),
          ),

          const SizedBox(height: 24),

          // Nutrition Grade
          if (product.nutritionGrade != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.green.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Nutri-Score: ',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    product.nutritionGrade!.toUpperCase(),
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Colors.green.shade800,
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 24),
          const Text(
            'Nutrition Facts',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const Divider(),
          // ... Add more nutrition details here if needed
          if (product.nutriments != null)
            ...product.nutriments!.entries
                .where(
                  (e) => [
                    'energy-kcal_100g',
                    'fat_100g',
                    'sugars_100g',
                    'salt_100g',
                  ].contains(e.key),
                )
                .map(
                  (e) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          e.key.replaceAll('_100g', ''),
                          style: const TextStyle(fontSize: 16),
                        ),
                        Text(
                          e.value.toString(),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        ],
      ),
    );
  }
}

class ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke;

    final double cornerSize = 30;
    final double padding = 40; // Padding from edges

    // We want a square-ish scanner area in the middle-ish
    final double scanSize = size.width - (padding * 2);
    final double topOffset = (size.height - scanSize) / 2;

    final rect = Rect.fromLTWH(padding, topOffset, scanSize, scanSize);

    // Draw corners
    // Top Left
    canvas.drawLine(rect.topLeft, rect.topLeft + Offset(0, cornerSize), paint);
    canvas.drawLine(rect.topLeft, rect.topLeft + Offset(cornerSize, 0), paint);

    // Top Right
    canvas.drawLine(
      rect.topRight,
      rect.topRight + Offset(0, cornerSize),
      paint,
    );
    canvas.drawLine(
      rect.topRight,
      rect.topRight - Offset(cornerSize, 0),
      paint,
    );

    // Bottom Left
    canvas.drawLine(
      rect.bottomLeft,
      rect.bottomLeft - Offset(0, cornerSize),
      paint,
    );
    canvas.drawLine(
      rect.bottomLeft,
      rect.bottomLeft + Offset(cornerSize, 0),
      paint,
    );

    // Bottom Right
    canvas.drawLine(
      rect.bottomRight,
      rect.bottomRight - Offset(0, cornerSize),
      paint,
    );
    canvas.drawLine(
      rect.bottomRight,
      rect.bottomRight - Offset(cornerSize, 0),
      paint,
    );

    // Draw Center Icon (Barcode)
    // Simplified barcode lines
    final barPaint = Paint()
      ..color = Colors.white.withOpacity(0.8)
      ..style = PaintingStyle.fill;

    final center = rect.center;
    final iconSize = 60.0;

    // Draw a circle background for the icon
    final circlePaint = Paint()
      ..color = Colors.white.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    canvas.drawCircle(center, 50, circlePaint);

    // Draw barcode bars inside
    double startX = center.dx - (iconSize / 2);
    double startY = center.dy - (iconSize / 2 * 0.6);
    double barHeight = iconSize * 0.6;

    // Random-ish widths
    List<double> widths = [4, 2, 6, 3, 2, 5, 3, 4, 2];
    double currentX = startX;

    for (double w in widths) {
      canvas.drawRect(Rect.fromLTWH(currentX, startY, w, barHeight), barPaint);
      currentX += w + 4; // gap
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
