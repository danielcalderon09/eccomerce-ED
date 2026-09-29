import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _usuario;
  bool _cargando = false;

  String? get token => _token;
  Map<String, dynamic>? get usuario => _usuario;
  bool get cargando => _cargando;
  bool get esAdmin => _usuario?['rol'] == 'admin';

  Future<void> restaurarSesion() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final usuarioRaw = prefs.getString('usuario');
    if (token != null && token.isNotEmpty && usuarioRaw != null) {
      _token = token;
      _usuario = json.decode(usuarioRaw) as Map<String, dynamic>;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    _cargando = true;
    notifyListeners();
    try {
      final r = await ApiService.login(email, password);
      _token = r['token'] as String;
      _usuario = r['usuario'] as Map<String, dynamic>;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', _token!);
      await prefs.setString('usuario', json.encode(_usuario!));
    } finally {
      _cargando = false;
      notifyListeners();
    }
  }

  Future<void> registrar(Map<String, dynamic> datos) async {
    await ApiService.registrar(datos);
  }

  Future<void> logout() async {
    _token = null;
    _usuario = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('usuario');
    notifyListeners();
  }
}