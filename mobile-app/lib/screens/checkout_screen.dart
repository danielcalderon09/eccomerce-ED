import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/carrito_provider.dart';
import '../services/api_service.dart';
import '../utils/formato.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _direccion = TextEditingController();
  final _ciudad = TextEditingController();
  final _departamento = TextEditingController();
  final _celular = TextEditingController();
  bool _procesando = false;

  @override
  void dispose() {
    _direccion.dispose();
    _ciudad.dispose();
    _departamento.dispose();
    _celular.dispose();
    super.dispose();
  }

  Future<void> _confirmar() async {
    if (_direccion.text.trim().isEmpty || _ciudad.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ingresa direccion y ciudad para el envio')),
      );
      return;
    }

    setState(() => _procesando = true);
    final auth = context.read<AuthProvider>();
    final carrito = context.read<CarritoProvider>();
    try {
      final direccionCompleta =
          '${_direccion.text.trim()}, ${_ciudad.text.trim()}${_departamento.text.trim().isNotEmpty ? ', ${_departamento.text.trim()}' : ''}';
      final r = await ApiService.checkout({
        'direccion_envio': direccionCompleta,
        'telefono': _celular.text.trim(),
        'metodo_pago': 'tarjeta_credito',
      }, auth.token ?? '');
      await carrito.cargar(auth.token ?? '');
      if (!mounted) return;
      final total = r['total'] ?? r['pedido']?['total'];
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Pedido creado'),
          content: Text(
            'Pedido #${r['pedido']?['id']} creado exitosamente.\nTotal: ${formatoPesos(total)}\n\nAhora puedes pagarlo desde la pestana Pedidos.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.mensaje)));
      }
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final carrito = context.watch<CarritoProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmar Pedido')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Productos (${carrito.items.length})', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...carrito.items.map(
            (i) => ListTile(
              dense: true,
              leading: const Icon(Icons.shopping_bag_outlined),
              title: Text('${i['nombre']}'),
              subtitle: Text('${i['cantidad']} x ${formatoPesos(i['precio_unitario'])}'),
              trailing: Text(
                formatoPesos((num.tryParse('${i['precio_unitario']}') ?? 0) * (i['cantidad'] as int? ?? 1)),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const Divider(height: 32),
          Text('Direccion de Envio', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          TextField(
            controller: _direccion,
            decoration: const InputDecoration(
              labelText: 'Direccion *',
              hintText: 'Calle, carrera, numero...',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _ciudad,
            decoration: const InputDecoration(
              labelText: 'Ciudad *',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _departamento,
            decoration: const InputDecoration(
              labelText: 'Departamento',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _celular,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Celular',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal:'),
                      Text(formatoPesos(carrito.subtotal)),
                    ],
                  ),
                  if (carrito.descuento > 0)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Descuento:', style: TextStyle(color: Colors.green)),
                        Text(
                          '-${formatoPesos(carrito.descuento)}',
                          style: const TextStyle(color: Colors.green),
                        ),
                      ],
                    ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      Text(
                        formatoPesos(carrito.total),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.indigo,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _procesando ? null : _confirmar,
            icon: _procesando
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_circle),
            label: const Text('Confirmar Pedido'),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.green,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ],
      ),
    );
  }
}