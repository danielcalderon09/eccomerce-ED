import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/carrito_provider.dart';
import '../services/api_service.dart';
import '../utils/formato.dart';

class ProductoDetalleScreen extends StatefulWidget {
  final Map<String, dynamic> producto;
  const ProductoDetalleScreen({super.key, required this.producto});

  @override
  State<ProductoDetalleScreen> createState() => _ProductoDetalleScreenState();
}

class _ProductoDetalleScreenState extends State<ProductoDetalleScreen> {
  Map<String, dynamic>? _detalle;
  List<dynamic> _resenas = [];
  bool _cargando = true;
  int _cantidad = 1;
  int _calificacion = 5;
  final _comentarioCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final token = context.read<AuthProvider>().token ?? '';
    setState(() => _cargando = true);
    try {
      final d = await ApiService.productoDetalle(widget.producto['id'] as int, token);
      if (!mounted) return;
      setState(() {
        _detalle = d;
        _resenas = (d['reseñas'] as List<dynamic>? ?? []);
      });
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  void _msg(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _agregarCarrito() async {
    final auth = context.read<AuthProvider>();
    try {
      await context.read<CarritoProvider>().agregar(auth.token ?? '', widget.producto['id'] as int, _cantidad);
      if (mounted) _msg('Producto agregado al carrito');
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  Future<void> _crearResena() async {
    final token = context.read<AuthProvider>().token ?? '';
    try {
      await ApiService.crearResena({
        'producto_id': widget.producto['id'],
        'calificacion': _calificacion,
        'comentario': _comentarioCtrl.text.trim(),
      }, token);
      if (mounted) {
        _msg('Reseña creada');
        _comentarioCtrl.clear();
        _cargar();
      }
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _detalle ?? widget.producto;
    final precio = num.tryParse('${p['precio']}') ?? 0;
    final stock = p['stock'] as int? ?? 0;

    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del Producto')),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    p['imagen_url'] as String? ?? '',
                    height: 220,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 220,
                      color: Colors.grey[200],
                      child: const Icon(Icons.image_not_supported, size: 60),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('${p['nombre']}', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 4),
                Text(
                  '${p['marca'] ?? ''} - ${p['categoria'] ?? ''}',
                  style: TextStyle(color: Colors.grey[600]),
                ),
                const SizedBox(height: 8),
                Text(
                  formatoPesos(precio),
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.indigo),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      'Stock: $stock',
                      style: TextStyle(
                        color: stock <= 10 ? Colors.red : Colors.green,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => setState(() => _cantidad = _cantidad > 1 ? _cantidad - 1 : 1),
                      icon: const Icon(Icons.remove_circle_outline),
                    ),
                    Text('$_cantidad', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                      onPressed: () => setState(() => _cantidad = _cantidad + 1),
                      icon: const Icon(Icons.add_circle_outline),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text('${p['descripcion'] ?? ''}', style: TextStyle(color: Colors.grey[700])),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: stock == 0 ? null : _agregarCarrito,
                  icon: const Icon(Icons.add_shopping_cart),
                  label: Text(stock == 0 ? 'Agotado' : 'Agregar al Carrito'),
                  style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                ),
                const Divider(height: 40),
                Text('Reseñas (${_resenas.length})', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                _cardCrearResena(),
                const SizedBox(height: 8),
                if (_resenas.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text('No hay reseñas para este producto', style: TextStyle(color: Colors.grey)),
                  )
                else
                  ..._resenas.map((r) => _cardResena(r)),
              ],
            ),
    );
  }

  Widget _cardCrearResena() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Deja tu reseña', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: List.generate(5, (i) {
                final estrella = i + 1;
                return IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () => setState(() => _calificacion = estrella),
                  icon: Icon(
                    estrella <= _calificacion ? Icons.star : Icons.star_border,
                    color: Colors.amber,
                  ),
                );
              }),
            ),
            TextField(
              controller: _comentarioCtrl,
              decoration: const InputDecoration(
                hintText: 'Comentario (opcional)',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton(onPressed: _crearResena, child: const Text('Publicar')),
            ),
          ],
        ),
      ),
    );
  }

  Widget _cardResena(Map<String, dynamic> r) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          child: Text(iniciales('${r['usuario_nombre'] ?? '?'}')),
        ),
        title: Text('${r['usuario_nombre'] ?? 'Usuario'}'),
        subtitle: Text('${r['comentario'] ?? ''}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.star, color: Colors.amber, size: 18),
            Text('${r['calificacion']}'),
          ],
        ),
      ),
    );
  }
}