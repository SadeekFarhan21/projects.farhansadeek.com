import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/product.dart';

class HistoryService {
  static const String _historyKey = 'search_history';
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Add a product to history
  Future<void> addToHistory(Product product) async {
    if (product.code == null) return;

    // 1. Save locally first (always available)
    await _addToLocalHistory(product);

    // 2. If logged in, save to Firestore
    final user = _auth.currentUser;
    if (user != null) {
      await _addToFirestoreHistory(user.uid, product);
    }
  }

  Future<void> _addToLocalHistory(Product product) async {
    final prefs = await SharedPreferences.getInstance();
    final historyJson = prefs.getStringList(_historyKey) ?? [];
    
    List<String> updatedHistory = List.from(historyJson);

    updatedHistory.removeWhere((item) {
      try {
        final Map<String, dynamic> jsonMap = json.decode(item);
        final String? existingCode = jsonMap['code'] as String? ?? 
            (jsonMap['product'] != null ? jsonMap['product']['code'] as String? : null);
        return existingCode == product.code;
      } catch (e) {
        return false;
      }
    });

    final Map<String, dynamic> productWrapper = {
      'product': product.toJson(),
      'status': 1
    };
    
    updatedHistory.insert(0, json.encode(productWrapper));

    if (updatedHistory.length > 50) {
      updatedHistory = updatedHistory.sublist(0, 50);
    }

    await prefs.setStringList(_historyKey, updatedHistory);
  }

  Future<void> _addToFirestoreHistory(String uid, Product product) async {
    try {
      // Use set with merge to avoid overwriting if other fields existed, 
      // but here we just want to add it. 
      // Using code as document ID avoids duplicates easily.
      await _firestore
          .collection('users')
          .doc(uid)
          .collection('history')
          .doc(product.code)
          .set({
        'product': product.toJson(),
        'timestamp': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      print('Error saving to Firestore: $e');
    }
  }

  // Get list of products from history
  Future<List<Product>> getHistory() async {
    final user = _auth.currentUser;
    
    if (user != null) {
      // If logged in, try fetching from Firestore first
      try {
        final snapshot = await _firestore
            .collection('users')
            .doc(user.uid)
            .collection('history')
            .orderBy('timestamp', descending: true)
            .get();

        if (snapshot.docs.isNotEmpty) {
          return snapshot.docs.map((doc) {
            final data = doc.data();
            // Wrap in 'product' key to match our Product.fromJson expectation if needed,
            // OR construct Product directly if stored structure differs.
            // We stored it as {'product': ...data...} in _addToFirestoreHistory
            // Actually wait, in _addToFirestoreHistory I did: 'product': product.toJson()
            // So doc.data() is {'product': {...}, 'timestamp': ...}
            // Product.fromJson expects {'product': {...}, 'status': 1} (roughly)
            
            // We can reconstruct the wrapper
            final Map<String, dynamic> wrapper = {
              'product': data['product'],
              'status': 1
            };
            return Product.fromJson(wrapper);
          }).toList();
        }
      } catch (e) {
        print('Error fetching from Firestore: $e');
        // Fallback to local
      }
    }

    // Fallback or guest: return local history
    return _getLocalHistory();
  }

  Future<List<Product>> _getLocalHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final historyJson = prefs.getStringList(_historyKey) ?? [];

    return historyJson
        .map((item) {
          try {
            return Product.fromJson(json.decode(item));
          } catch (e) {
            print('Error parsing history item: $e');
            return null;
          }
        })
        .whereType<Product>()
        .toList();
  }

  // Clear all history
  Future<void> clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_historyKey);
    
    final user = _auth.currentUser;
    if (user != null) {
       final batch = _firestore.batch();
       final snapshot = await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('history')
          .get();
       
       for (var doc in snapshot.docs) {
         batch.delete(doc.reference);
       }
       await batch.commit();
    }
  }
}
