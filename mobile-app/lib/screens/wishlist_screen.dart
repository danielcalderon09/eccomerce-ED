import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/carrito_provider.dart';
import '../services/api_service.dart';
import '../utils/formato.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  List<dynamic> _items = [];
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
      final r = await ApiService.wishlist(token);
      if (mounted) setState(() => _items = (r as List<dynamic>));
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  void _msg(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _eliminar(int id) async {
    final token = context.read<AuthProvider>().token ?? '';
    try {
      await ApiService.eliminarWishlist(id, token);
      _cargar();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  Future<void> _moverACarrito(int productoId) async {
    final token = context.read<AuthProvider>().token ?? '';
    try {
      await ApiService.moverWishlistACarrito(productoId, token);
      if (!mounted) return;
      await context.read<CarritoProvider>().cargar(token);
      _msg('Movido al carrito');
      _cargar();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mi Wishlist')),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('Tu wishlist esta vacia'))
              : RefreshIndicator(
                  onRefresh: _cargar,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    itemBuilder: (context, i) {
                      final w = _items[i];
                      return Card(
                        child: ListTile(
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              w['imagen_url'] as String? ?? '',
                              width: 56,
                              height: 56,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                width: 56,
                                height: 56,
                                color: Colors.grey[200],
                                child: const Icon(Icons.image_not_supported),
                              ),
                            ),
                          ),
                          title: Text('${w['nombre']}', maxLines: 2, overflow: TextOverflow.ellipsis),
                          subtitle: Text('${w['marca'] ?? ''} - ${w['categoria'] ?? ''}\n${formatoPesos(w['precio'])}'),
                          isThreeLine: true,
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: 'Mover al carrito',
                                onPressed: () => _moverACarrito(w['producto_id'] as int),
                                icon: const Icon(Icons.add_shopping_cart, color: Colors.indigo),
                              ),
                              IconButton(
                                onPressed: () => _eliminar(w['id'] as int),
                                icon: const Icon(Icons.delete_outline, color: Colors.red),
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