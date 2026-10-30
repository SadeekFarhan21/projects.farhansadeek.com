import 'package:flutter/material.dart';
import '../models/product.dart';

class ProductDetailsScreen extends StatefulWidget {
  final Product product;

  const ProductDetailsScreen({super.key, required this.product});

  @override
  State<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends State<ProductDetailsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E1E1E),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(),
            
            // Tab Bar
            _buildTabBar(),
            
            // Scrollable Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  SingleChildScrollView(child: _buildHealthTab()),
                  const Center(child: Text('Environment Tab', style: TextStyle(color: Colors.white))),
                  const Center(child: Text('Report Tab', style: TextStyle(color: Colors.white))),
                ],
              ),
            ),
            
            // Bottom Action Bar
            _buildBottomBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      color: const Color(0xFF4CAF50),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Back button
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: const Icon(Icons.keyboard_arrow_down, color: Colors.white),
            ),
          ),
          
          const SizedBox(width: 12),
          
          // Center: Product Name
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.product.productName ?? 'Unknown Product',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  widget.product.brand ?? 'Unknown Brand',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 14,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          
          const SizedBox(width: 8),
          
          // Right: Compatibility Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.3),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '56%',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                    Text(
                      'Compatible',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      color: const Color(0xFF2C2C2C),
      child: TabBar(
        controller: _tabController,
        indicatorColor: const Color(0xFF4CAF50),
        indicatorWeight: 3,
        indicatorSize: TabBarIndicatorSize.tab,
        labelColor: Colors.black,
        unselectedLabelColor: Colors.grey,
        labelStyle: const TextStyle(fontWeight: FontWeight.bold),
        
        // Custom indicator logic to mimic "white selected tab with rounded top" is hard
        // Standard TabBar is close enough or use custom
        // Using simpler style for now: White text on selected
        
        indicator: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(8)),
        ),
        
        tabs: const [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.circle, color: Color(0xFF4CAF50), size: 12),
                SizedBox(width: 8),
                Text('Health'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.circle, color: Colors.grey, size: 12),
                SizedBox(width: 8),
                Text('Environment'),
              ],
            ),
          ),
          Tab(child: Text('Report a problem', style: TextStyle(fontSize: 10), textAlign: TextAlign.center)),
        ],
      ),
    );
  }

  Widget _buildHealthTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Nutrition Facts Row
        _buildListRow(
          icon: Icons.scale_outlined,
          title: 'Nutrition facts',
        ),
        
        // Serving Size Text
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            'Serving size: ${widget.product.quantity ?? 'Unknown'}',
            style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
          ),
        ),
        
        // Ingredients Header
        _buildSectionHeader('Ingredients'),
        
        // Ingredients Count Row
        _buildListRow(
          icon: Icons.soup_kitchen_outlined, // Bowl icon roughly
          title: '${widget.product.ingredients?.length ?? 0} ingredients',
        ),
        
        // Food Processing Header
        _buildSectionHeader('Food processing'),
        
        // NOVA Row
        _buildNovaRow(),
        
        // Ingredients Analysis Header
        _buildSectionHeader('Ingredients analysis'),
        
        // Palm Oil Free
        _buildAttributeRow(
          icon: Icons.spa, // Palm-like
          title: 'Palm oil free',
          isGreen: _hasTag('en:palm-oil-free'),
        ),
        
        // Vegan
        _buildAttributeRow(
          icon: Icons.eco, // Leaf
          title: 'Vegan',
          isGreen: _hasTag('en:vegan'),
        ),
        
        // Vegetarian
        _buildAttributeRow(
          icon: Icons.emoji_nature, // Person/Nature
          title: 'Vegetarian',
          isGreen: _hasTag('en:vegetarian'),
        ),
        
        const SizedBox(height: 20),
        
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            'The analysis is based solely on the ingredients listed and does not take into account processing methods.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }

  bool _hasTag(String tag) {
    if (widget.product.ingredientsAnalysisTags == null) return false;
    return widget.product.ingredientsAnalysisTags!.contains(tag);
  }

  Widget _buildSectionHeader(String title) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF1E1E1E), // Match background
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          const Icon(Icons.circle, color: Colors.white, size: 8),
          const SizedBox(width: 12),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListRow({required IconData icon, required String title}) {
    return Container(
      color: const Color(0xFF333333), // Lighter grey for rows
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      margin: const EdgeInsets.only(bottom: 1), // Separator
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.black, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.white),
        ],
      ),
    );
  }

  Widget _buildNovaRow() {
    // Determine NOVA group color/text
    // Usually 1-4. 
    int group = widget.product.novaGroup ?? 4; // Default to 4 (Processed) if unknown
    
    // Logic for demo (NOVA 1 is green)
    Color novaColor = Colors.grey;
    String novaText = 'Unknown processing level';
    
    if (group == 1) {
      novaColor = const Color(0xFF4CAF50);
      novaText = 'Unprocessed or minimally processed foods';
    } else if (group == 2) {
      novaColor = Colors.yellow.shade700;
      novaText = 'Processed culinary ingredients';
    } else if (group == 3) {
      novaColor = Colors.orange;
      novaText = 'Processed foods';
    } else if (group == 4) {
      novaColor = Colors.red;
      novaText = 'Ultra-processed food and drink products';
    }

    return Container(
      color: const Color(0xFF333333),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      margin: const EdgeInsets.only(bottom: 1),
      child: Row(
        children: [
          // NOVA Badge
          Container(
            width: 40,
            height: 60,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Column(
              children: [
                const SizedBox(height: 2),
                const Text('NOVA', style: TextStyle(color: Colors.grey, fontSize: 8)),
                Expanded(
                  child: Center(
                    child: Text(
                      group.toString(),
                      style: TextStyle(
                        color: novaColor, // Match text
                        fontWeight: FontWeight.bold,
                        fontSize: 24,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              novaText,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.white),
        ],
      ),
    );
  }

  Widget _buildAttributeRow({required IconData icon, required String title, required bool isGreen}) {
    // If we don't have analysis tags (null), we assume grey/unknown
    // Or we could hide.
    // For demo "Palm oil free", "Vegan", etc.
    
    final Color iconBgColor = isGreen ? const Color(0xFF4CAF50) : Colors.grey;
    
    return Container(
      color: const Color(0xFF333333),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      margin: const EdgeInsets.only(bottom: 1),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title, // In real app, adjust title based on status (e.g., "Contains Palm Oil" vs "Palm Oil Free")
              style: TextStyle(
                color: isGreen ? const Color(0xFF4CAF50) : Colors.grey, // Green text if true
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const Icon(Icons.chevron_right, color: Colors.white),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      color: const Color(0xFF2C2C2C),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.edit, size: 18),
              label: const Text('Edit'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4CAF50),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.attach_money, size: 18),
              label: const Text('Add a price'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Colors.grey),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.compare_arrows, size: 18),
              label: const Text('Compare'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Colors.grey),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
