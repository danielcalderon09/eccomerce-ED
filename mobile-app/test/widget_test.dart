import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_academico/main.dart';

void main() {
  testWidgets('App se monta sin errores', (WidgetTester tester) async {
    await tester.pumpWidget(const GestionAcademicaApp());
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}