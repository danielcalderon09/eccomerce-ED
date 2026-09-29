import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/carrito_provider.dart';
import '../services/api_service.dart';
import '../utils/formato.dart';

class PedidosScreen extends StatefulWidget {
  const PedidosScreen({super.key});

  @override
  State<PedidosScreen> createState() => _PedidosScreenState();
}

class _PedidosScreenState extends State<PedidosScreen> {
  List<dynamic> _pedidos = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _cargar());
  }

  Future<void> _cargar() async {
    final token = context.read<AuthProvider>().token ?? '';
    setState(() => _cargando = true);
    try {
      final r = await ApiService.pedidos(token);
      if (mounted) setState(() => _pedidos = (r as List<dynamic>));
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  void _msg(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _pagar(int pedidoId) async {
    final token = context.read<AuthProvider>().token ?? '';
    try {
      final r = await ApiService.procesarPago(pedidoId, 'tarjeta_credito', token);
      if (!mounted) return;
      final estado = r['pago']?['estado'];
      _msg('${r['mensaje'] ?? ''} (${estado ?? ''})');
      await context.read<CarritoProvider>().cargar(token);
      _cargar();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  Future<void> _cambiarEstado(int pedidoId) async {
    const estados = ['pendiente_pago', 'pagado', 'enviado', 'entregado', 'cancelado'];
    final nuevo = await showDialog<String>(
      context: context,
      builder: (_) => SimpleDialog(
        title: const Text('Nuevo estado'),
        children: estados
            .map((e) => SimpleDialogOption(
                  onPressed: () => Navigator.pop(context, e),
                  child: Text(e.replaceAll('_', ' ').toUpperCase()),
                ))
            .toList(),
      ),
    );
    if (nuevo == null) return;
    if (!mounted) return;
    final token = context.read<AuthProvider>().token ?? '';
    try {
      await ApiService.cambiarEstadoPedido(pedidoId, nuevo, token);
      _msg('Estado actualizado');
      _cargar();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  Color _colorEstado(String estado) {
    switch (estado) {
      case 'pagado':
        return Colors.green;
      case 'pendiente_pago':
        return Colors.orange;
      case 'enviado':
        return Colors.blue;
      case 'entregado':
        return Colors.indigo;
      default:
        return Colors.red;
    }
  }

  @override
  Widget build(BuildContext context) {
    final esAdmin = context.watch<AuthProvider>().esAdmin;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Pedidos'),
        actions: [
          IconButton(onPressed: _cargar, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _pedidos.isEmpty
              ? const Center(child: Text('No tienes pedidos'))
              : RefreshIndicator(
                  onRefresh: _cargar,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _pedidos.length,
                    itemBuilder: (context, i) {
                      final p = _pedidos[i];
                      final estado = '${p['estado']}';
                      final total = num.tryParse('${p['total']}') ?? 0;
                      final descuento = num.tryParse('${p['descuento']}') ?? 0;

                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Pedido #${p['id']}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  Chip(
                                    label: Text(
                                      estado.replaceAll('_', ' ').toUpperCase(),
                                      style: const TextStyle(color: Colors.white, fontSize: 11),
                                    ),
                                    backgroundColor: _colorEstado(estado),
                                    padding: EdgeInsets.zero,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('Creado: ${formatoFecha(p['creado_en'])}',
                                  style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                              if (p['direccion_envio'] != null)
                                Text('Envio: ${p['direccion_envio']}',
                                    style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                              if (p['cliente_nombre'] != null)
                                Text('Cliente: ${p['cliente_nombre']}',
                                    style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                              const SizedBox(height: 8),
                              Text('Total: ${formatoPesos(total)}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                              if (descuento > 0)
                                Text('Descuento: -${formatoPesos(descuento)}',
                                    style: const TextStyle(color: Colors.green, fontSize: 12)),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  if (estado == 'pendiente_pago')
                                    FilledButton(
                                      onPressed: () => _pagar(p['id'] as int),
                                      child: const Text('Pagar Ahora'),
                                    ),
                                  if (esAdmin && estado != 'cancelado') ...[
                                    const SizedBox(width: 8),
                                    OutlinedButton(
                                      onPressed: () => _cambiarEstado(p['id'] as int),
                                      child: const Text('Cambiar Estado'),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}