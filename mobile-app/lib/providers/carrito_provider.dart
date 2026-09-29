import 'package:flutter/foundation.dart';

import '../services/api_service.dart';

class CarritoProvider extends ChangeNotifier {
  List<dynamic> _items = [];
  num _subtotal = 0;
  num _descuento = 0;
  num _total = 0;
  bool _cargando = false;

  List<dynamic> get items => _items;
  num get subtotal => _subtotal;
  num get descuento => _descuento;
  num get total => _total;
  bool get cargando => _cargando;
  int get cantidadItems => _items.fold(0, (sum, i) => sum + (i['cantidad'] as int? ?? 0));

  Future<void> cargar(String token) async {
    _cargando = true;
    notifyListeners();
    try {
      final r = await ApiService.getCarrito(token);
      _items = (r['items'] as List<dynamic>? ?? []);
      _subtotal = num.tryParse('${r['subtotal']}') ?? 0;
      _descuento = num.tryParse('${r['descuento']}') ?? 0;
      _total = num.tryParse('${r['total']}') ?? 0;
    } finally {
      _cargando = false;
      notifyListeners();
    }
  }

  Future<void> agregar(String token, int productoId, int cantidad) async {
    await ApiService.agregarCarrito(productoId, cantidad, token);
    await cargar(token);
  }

  Future<void> actualizarCantidad(String token, int itemId, int cantidad) async {
    await ApiService.actualizarCantidadCarrito(itemId, cantidad, token);
    await cargar(token);
  }

  Future<void> eliminarItem(String token, int itemId) async {
    await ApiService.eliminarItemCarrito(itemId, token);
    await cargar(token);
  }

  Future<void> limpiar(String token) async {
    await ApiService.limpiarCarrito(token);
    await cargar(token);
  }

  Future<String> aplicarCupon(String token, String codigo) async {
    final r = await ApiService.aplicarCuponCarrito(codigo, token);
    await cargar(token);
    return r['mensaje']?.toString() ?? 'Cupon aplicado';
  }
}