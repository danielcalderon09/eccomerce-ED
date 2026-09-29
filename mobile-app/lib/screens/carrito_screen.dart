import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/carrito_provider.dart';
import '../services/api_service.dart';
import '../utils/formato.dart';
import 'checkout_screen.dart';

class CarritoScreen extends StatefulWidget {
  const CarritoScreen({super.key});

  @override
  State<CarritoScreen> createState() => _CarritoScreenState();
}

class _CarritoScreenState extends State<CarritoScreen> {
  final _cuponCtrl = TextEditingController();
  bool _aplicandoCupon = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _cargar());
  }

  Future<void> _cargar() async {
    final token = context.read<AuthProvider>().token ?? '';
    try {
      await context.read<CarritoProvider>().cargar(token);
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  void _msg(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _aplicarCupon() async {
    final codigo = _cuponCtrl.text.trim();
    if (codigo.isEmpty) return;
    setState(() => _aplicandoCupon = true);
    try {
      final msg = await context.read<CarritoProvider>().aplicarCupon(
            context.read<AuthProvider>().token ?? '',
            codigo,
          );
      if (mounted) _msg(msg);
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    } finally {
      if (mounted) setState(() => _aplicandoCupon = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final carrito = context.watch<CarritoProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Carrito de Compras')),
      body: RefreshIndicator(
        onRefresh: _cargar,
        child: carrito.items.isEmpty
            ? ListView(
                children: const [
                  SizedBox(height: 120),
                  Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Center(
                    child: Text('Tu carrito esta vacio', style: TextStyle(color: Colors.grey, fontSize: 16)),
                  ),
                ],
              )
            : ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  ...carrito.items.map((i) => _item(i, carrito, context)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _cuponCtrl,
                          decoration: const InputDecoration(
                            hintText: 'Codigo de cupon',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: _aplicandoCupon ? null : _aplicarCupon,
                        child: _aplicandoCupon
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Aplicar'),
                      ),
                    ],
                  ),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _fila('Subtotal:', formatoPesos(carrito.subtotal)),
                          if (carrito.descuento > 0)
                            _fila(
                              'Descuento:',
                              '-${formatoPesos(carrito.descuento)}',
                              color: Colors.green,
                            ),
                          const Divider(),
                          _fila(
                            'Total:',
                            formatoPesos(carrito.total),
                            grande: true,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                    ),
                    icon: const Icon(Icons.payment),
                    label: const Text('Realizar Pedido'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.green,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _fila(String label, String valor, {Color? color, bool grande = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: grande ? 18 : 14, color: Colors.grey[700])),
          Text(
            valor,
            style: TextStyle(
              fontSize: grande ? 20 : 14,
              fontWeight: FontWeight.bold,
              color: color ?? (grande ? Colors.indigo : Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  Widget _item(Map<String, dynamic> item, CarritoProvider carrito, BuildContext context) {
    final token = context.read<AuthProvider>().token ?? '';
    final cantidad = item['cantidad'] as int? ?? 1;
    final precio = num.tryParse('${item['precio_unitario']}') ?? 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                item['imagen_url'] as String? ?? '',
                width: 60,
                height: 60,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  width: 60,
                  height: 60,
                  color: Colors.grey[200],
                  child: const Icon(Icons.image_not_supported),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${item['nombre']}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text('${formatoPesos(precio)} c/u'),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: () => carrito.actualizarCantidad(token, item['id'] as int, cantidad > 1 ? cantidad - 1 : 1),
                        icon: const Icon(Icons.remove_circle_outline),
                      ),
                      Text('$cantidad', style: const TextStyle(fontWeight: FontWeight.bold)),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: () => carrito.actualizarCantidad(token, item['id'] as int, cantidad + 1),
                        icon: const Icon(Icons.add_circle_outline),
                      ),
                      const Spacer(),
                      Text(
                        formatoPesos(cantidad * precio),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: () => carrito.eliminarItem(token, item['id'] as int),
              icon: const Icon(Icons.delete_outline, color: Colors.red),
            ),
          ],
        ),
      ),
    );
  }
}