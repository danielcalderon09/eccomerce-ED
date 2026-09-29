import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/formato.dart';

class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  List<dynamic> _direcciones = [];
  bool _cargando = true;

  final _dirCtrl = TextEditingController();
  final _ciudadCtrl = TextEditingController();
  final _deptoCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _cargar());
  }

  Future<void> _cargar() async {
    final token = context.read<AuthProvider>().token ?? '';
    setState(() => _cargando = true);
    try {
      final r = await ApiService.direcciones(token);
      if (mounted) setState(() => _direcciones = (r as List<dynamic>));
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  void _msg(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _crearDireccion() async {
    if (_dirCtrl.text.trim().isEmpty) {
      _msg('La direccion es requerida');
      return;
    }
    final token = context.read<AuthProvider>().token ?? '';
    try {
      await ApiService.crearDireccion({
        'direccion': _dirCtrl.text.trim(),
        'ciudad': _ciudadCtrl.text.trim(),
        'departamento': _deptoCtrl.text.trim(),
      }, token);
      _dirCtrl.clear();
      _ciudadCtrl.clear();
      _deptoCtrl.clear();
      _msg('Direccion creada');
      _cargar();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  Future<void> _eliminarDireccion(int id) async {
    final token = context.read<AuthProvider>().token ?? '';
    try {
      await ApiService.eliminarDireccion(id, token);
      _cargar();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final u = auth.usuario;

    return Scaffold(
      appBar: AppBar(title: const Text('Perfil')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    child: Text(iniciales('${u?['nombre'] ?? '?'}'), style: const TextStyle(fontSize: 20)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${u?['nombre'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        Text('${u?['email'] ?? ''}'),
                        Text(
                          u?['rol'] == 'admin' ? 'Administrador' : 'Cliente',
                          style: const TextStyle(color: Colors.indigo, fontWeight: FontWeight.w600),
                        ),
                        if (u?['telefono'] != null) Text('Tel: ${u?['telefono']}'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Mis Direcciones', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_cargando)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_direcciones.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: Text('No tienes direcciones guardadas', style: TextStyle(color: Colors.grey))),
            )
          else
            ..._direcciones.map(
              (d) => Card(
                child: ListTile(
                  leading: const Icon(Icons.location_on_outlined),
                  title: Text('${d['direccion']}'),
                  subtitle: Text('${d['ciudad'] ?? ''} ${d['departamento'] ?? ''}'),
                  trailing: IconButton(
                    onPressed: () => _eliminarDireccion(d['id'] as int),
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  TextField(
                    controller: _dirCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Nueva direccion',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _ciudadCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Ciudad',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _deptoCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Departamento',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _crearDireccion,
                      icon: const Icon(Icons.add_location_alt_outlined),
                      label: const Text('Guardar Direccion'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () async {
              await context.read<AuthProvider>().logout();
            },
            icon: const Icon(Icons.logout),
            label: const Text('Cerrar Sesion'),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
          ),
        ],
      ),
    );
  }
}