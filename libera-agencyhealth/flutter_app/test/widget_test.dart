import 'package:flutter_test/flutter_test.dart';
import 'package:libera/main.dart';

void main() {
  testWidgets('App launches', (WidgetTester tester) async {
    await tester.pumpWidget(const LiberaApp());
    expect(find.text('Libera'), findsOneWidget);
  });
}
