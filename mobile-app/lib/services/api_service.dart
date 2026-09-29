import 'dart:convert';

import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String mensaje;
  ApiException(this.mensaje);

  @override
  String toString() => mensaje;
}

class ApiService {
  // Android emulator -> 10.0.2.2 ; resto (web/desktop) -> localhost
  static String get baseUrl {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  static Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? token,
    bool formData = false,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{};
    if (!formData && body != null) {
      headers['Content-Type'] = 'application/json';
    }
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 30));
          break;
        case 'POST':
          response = await http
              .post(uri, headers: headers, body: formData ? body : json.encode(body))
              .timeout(const Duration(seconds: 30));
          break;
        case 'PUT':
          response = await http
              .put(uri, headers: headers, body: formData ? body : json.encode(body))
              .timeout(const Duration(seconds: 30));
          break;
        case 'DELETE':
          response = await http.delete(uri, headers: headers).timeout(const Duration(seconds: 30));
          break;
        default:
          throw ApiException('Metodo HTTP no soportado');
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('No se pudo conectar con el servidor');
    }

    if (response.statusCode == 401 || response.statusCode == 403) {
      throw ApiException('Sesion expirada o sin permisos');
    }

    dynamic data;
    try {
      data = response.body.isEmpty ? null : json.decode(response.body);
    } catch (_) {
      data = null;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final msg = (data is Map && data['mensaje'] != null)
          ? data['mensaje'].toString()
          : 'Error del servidor (${response.statusCode})';
      throw ApiException(msg);
    }

    return data;
  }

  // ===== AUTH =====
  static Future<Map<String, dynamic>> login(String email, String password) async =>
      (await _request('POST', '/auth/login', body: {'email': email, 'password': password}))
          as Map<String, dynamic>;

  static Future<Map<String, dynamic>> registrar(Map<String, dynamic> datos) async =>
      (await _request('POST', '/auth/registro', body: datos)) as Map<String, dynamic>;

  static Future<Map<String, dynamic>> perfil(String token) async =>
      (await _request('GET', '/auth/perfil', token: token)) as Map<String, dynamic>;

  // ===== PRODUCTOS =====
  static Future<dynamic> productos({String? busqueda, String? categoria, String? marca, String token = ''}) {
    final params = <String, String>{
      if (busqueda != null && busqueda.isNotEmpty) 'busqueda': busqueda,
      if (categoria != null && categoria.isNotEmpty) 'categoria': categoria,
      if (marca != null && marca.isNotEmpty) 'marca': marca,
    };
    final qs = params.isEmpty ? '' : '?${Uri(queryParameters: params).query}';
    return _request('GET', '/productos$qs', token: token);
  }

  static Future<dynamic> productoDetalle(int id, String token) =>
      _request('GET', '/productos/$id', token: token);

  static Future<dynamic> categorias(String token) =>
      _request('GET', '/productos/categorias', token: token);

  static Future<dynamic> marcas(String token) =>
      _request('GET', '/productos/marcas', token: token);

  static Future<dynamic> crearProducto(Map<String, dynamic> datos, String token) =>
      _request('POST', '/productos', body: datos, token: token);

  static Future<dynamic> actualizarProducto(int id, Map<String, dynamic> datos, String token) =>
      _request('PUT', '/productos/$id', body: datos, token: token);

  // ===== CARRITO =====
  static Future<Map<String, dynamic>> getCarrito(String token) async =>
      (await _request('GET', '/carrito', token: token)) as Map<String, dynamic>;

  static Future<dynamic> agregarCarrito(int productoId, int cantidad, String token) =>
      _request('POST', '/carrito/items', body: {'producto_id': productoId, 'cantidad': cantidad}, token: token);

  static Future<dynamic> actualizarCantidadCarrito(int itemId, int cantidad, String token) =>
      _request('PUT', '/carrito/items/$itemId', body: {'cantidad': cantidad}, token: token);

  static Future<dynamic> eliminarItemCarrito(int itemId, String token) =>
      _request('DELETE', '/carrito/items/$itemId', token: token);

  static Future<dynamic> limpiarCarrito(String token) =>
      _request('DELETE', '/carrito', token: token);

  static Future<dynamic> aplicarCuponCarrito(String codigo, String token) =>
      _request('POST', '/carrito/cupon', body: {'codigo': codigo}, token: token);

  // ===== CUPONES =====
  static Future<dynamic> cupones(String token) => _request('GET', '/cupones', token: token);

  static Future<dynamic> validarCupon(String codigo, num subtotal, String token) =>
      _request('POST', '/cupones/validar', body: {'codigo': codigo, 'subtotal': subtotal}, token: token);

  // ===== DIRECCIONES =====
  static Future<dynamic> direcciones(String token) => _request('GET', '/direcciones', token: token);

  static Future<dynamic> crearDireccion(Map<String, dynamic> datos, String token) =>
      _request('POST', '/direcciones', body: datos, token: token);

  static Future<dynamic> eliminarDireccion(int id, String token) =>
      _request('DELETE', '/direcciones/$id', token: token);

  // ===== PEDIDOS =====
  static Future<dynamic> pedidos(String token) => _request('GET', '/pedidos', token: token);

  static Future<dynamic> pedidoDetalle(int id, String token) =>
      _request('GET', '/pedidos/$id', token: token);

  static Future<dynamic> checkout(Map<String, dynamic> datos, String token) =>
      _request('POST', '/pedidos/checkout', body: datos, token: token);

  static Future<dynamic> cambiarEstadoPedido(int id, String estado, String token) =>
      _request('PUT', '/pedidos/$id/estado', body: {'estado': estado}, token: token);

  // ===== PAGOS =====
  static Future<dynamic> procesarPago(int pedidoId, String metodoPago, String token) =>
      _request('POST', '/pagos/procesar', body: {'pedido_id': pedidoId, 'metodo_pago': metodoPago}, token: token);

  static Future<dynamic> pagos(String token) => _request('GET', '/pagos', token: token);

  // ===== WISHLIST =====
  static Future<dynamic> wishlist(String token) => _request('GET', '/wishlist', token: token);

  static Future<dynamic> agregarWishlist(int productoId, String token) =>
      _request('POST', '/wishlist', body: {'producto_id': productoId}, token: token);

  static Future<dynamic> eliminarWishlist(int id, String token) =>
      _request('DELETE', '/wishlist/$id', token: token);

  static Future<dynamic> moverWishlistACarrito(int productoId, String token) =>
      _request('POST', '/wishlist/mover-carrito', body: {'producto_id': productoId}, token: token);

  // ===== RESENAS =====
  static Future<dynamic> crearResena(Map<String, dynamic> datos, String token) =>
      _request('POST', '/resenas', body: datos, token: token);

  // ===== ADMIN =====
  static Future<dynamic> dashboard(String token) => _request('GET', '/reportes/dashboard', token: token);

  static Future<dynamic> usuarios(String token) => _request('GET', '/usuarios', token: token);

  static Future<dynamic> alertasStock(String token, {int umbral = 10}) =>
      _request('GET', '/inventario/alertas?umbral=$umbral', token: token);

  static Future<dynamic> estadisticasInventario(String token) =>
      _request('GET', '/inventario/estadisticas', token: token);

  static Future<dynamic> ajustarInventario(Map<String, dynamic> datos, String token) =>
      _request('POST', '/inventario/ajustar', body: datos, token: token);

  static Future<dynamic> reporteVentas(String token) =>
      _request('GET', '/reportes/ventas', token: token);

  static Future<dynamic> reporteTopProductos(String token) =>
      _request('GET', '/reportes/top-productos', token: token);

  static Future<dynamic> reporteCategorias(String token) =>
      _request('GET', '/reportes/categorias', token: token);
}