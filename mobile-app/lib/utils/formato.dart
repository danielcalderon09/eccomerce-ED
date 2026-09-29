import 'package:intl/intl.dart';

final NumberFormat _pesos = NumberFormat('#,##0');

String formatoPesos(Object? valor) {
  final num n = num.tryParse('$valor') ?? 0;
  return '\$${_pesos.format(n)}';
}

String formatoFecha(Object? valor) {
  if (valor == null) return '';
  final dt = DateTime.tryParse('$valor');
  if (dt == null) return '$valor';
  return DateFormat('dd/MM/yyyy').format(dt);
}

String iniciales(String nombre) {
  final partes = nombre.trim().split(RegExp(r'\s+'));
  if (partes.isEmpty || partes.first.isEmpty) return '?';
  if (partes.length == 1) return partes.first[0].toUpperCase();
  return (partes.first[0] + partes.last[0]).toUpperCase();
}