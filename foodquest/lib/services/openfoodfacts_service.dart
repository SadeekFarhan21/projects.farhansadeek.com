import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/product.dart';

class OpenFoodFactsService {
  static const String baseUrl = 'https://world.openfoodfacts.org/api/v0/product';

  /// Fetch product information by barcode/UPC
  /// 
  /// [barcode] - The barcode/UPC code to look up
  /// Returns [Product] if found, null otherwise
  static Future<Product?> getProductByBarcode(String barcode) async {
    try {
      final url = Uri.parse('$baseUrl/$barcode.json');
      print('Fetching product from: $url'); // Add logging
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final jsonData = json.decode(response.body);
        print('OFF API Response Status: ${jsonData['status']}');
        
        // Check if product was found
        // API can return status as 1 (found) or 0 (not found)
        // Check loosely for 1 or "1" or verbose status
        final status = jsonData['status'];
        final isFound = status == 1 || status == '1' || jsonData['status_verbose'] == 'product found';
        
        if (isFound && jsonData['product'] != null) {
          return Product.fromJson(jsonData);
        } else {
          print('Product not found. Status: $status, Verbose: ${jsonData['status_verbose']}');
          return null;
        }
      } else {
        throw Exception('Failed to load product: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching product: $e');
    }
  }
}

