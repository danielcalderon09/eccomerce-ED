import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/formato.dart';
import 'producto_detalle_screen.dart';

class TiendaScreen extends StatefulWidget {
  const TiendaScreen({super.key});

  @override
  State<TiendaScreen> createState() => _TiendaScreenState();
}

class _TiendaScreenState extends State<TiendaScreen> {
  List<dynamic> _productos = [];
  List<dynamic> _categorias = [];
  List<dynamic> _marcas = [];
  List<dynamic> _wishlist = [];
  bool _cargando = true;
  String _busqueda = '';
  String? _categoria;
  String? _marca;
  String _orden = '';

  @override
  void initState() {
    super.initState();
    _cargarTodo();
  }

  Future<void> _cargarTodo() async {
    final token = context.read<AuthProvider>().token ?? '';
    setState(() => _cargando = true);
    try {
      final results = await Future.wait([
        ApiService.productos(token: token),
        ApiService.categorias(token),
        ApiService.marcas(token),
        ApiService.wishlist(token),
      ]);
      if (!mounted) return;
      setState(() {
        _productos = (results[0] as List<dynamic>);
        _categorias = (results[1] as List<dynamic>);
        _marcas = (results[2] as List<dynamic>);
        _wishlist = (results[3] as List<dynamic>);
      });
    } on ApiException catch (e) {
      if (mounted) _mostrarError(e.mensaje);
    } catch (_) {
      if (mounted) _mostrarError('Error al cargar productos');
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  void _mostrarError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  List<dynamic> get _filtrados {
    final lista = _productos.where((p) {
      final matchCat = _categoria == null || p['categoria'] == _categoria;
      final matchMarca = _marca == null || p['marca'] == _marca;
      final nombre = (p['nombre'] as String? ?? '').toLowerCase();
      final desc = (p['descripcion'] as String? ?? '').toLowerCase();
      final matchBusq = _busqueda.isEmpty ||
          nombre.contains(_busqueda.toLowerCase()) ||
          desc.contains(_busqueda.toLowerCase());
      return matchCat && matchMarca && matchBusq;
    }).toList();

    switch (_orden) {
      case 'precio_asc':
        lista.sort((a, b) => (num.tryParse('${a['precio']}') ?? 0)
            .compareTo(num.tryParse('${b['precio']}') ?? 0));
        break;
      case 'precio_desc':
        lista.sort((a, b) => (num.tryParse('${b['precio']}') ?? 0)
            .compareTo(num.tryParse('${a['precio']}') ?? 0));
        break;
      case 'rating':
        lista.sort((a, b) => (num.tryParse('${b['calificacion_promedio']}') ?? 0)
            .compareTo(num.tryParse('${a['calificacion_promedio']}') ?? 0));
        break;
    }
    return lista;
  }

  bool _enWishlist(int productoId) =>
      _wishlist.any((w) => w['producto_id'] == productoId);

  Future<void> _toggleWishlist(int productoId) async {
    final token = context.read<AuthProvider>().token ?? '';
    try {
      final item = _wishlist.where((w) => w['producto_id'] == productoId).firstOrNull;
      if (item != null) {
        await ApiService.eliminarWishlist(item['id'] as int, token);
      } else {
        await ApiService.agregarWishlist(productoId, token);
      }
      final nueva = await ApiService.wishlist(token);
      if (mounted) setState(() => _wishlist = (nueva as List<dynamic>));
    } on ApiException catch (e) {
      _mostrarError(e.mensaje);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tienda')),
      body: RefreshIndicator(
        onRefresh: _cargarTodo,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
              child: TextField(
                onChanged: (v) => setState(() => _busqueda = v),
                decoration: InputDecoration(
                  hintText: 'Buscar productos...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  isDense: true,
                ),
              ),
            ),
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _filtroCategoria(),
                  const SizedBox(width: 8),
                  _filtroMarca(),
                  const SizedBox(width: 8),
                  _filtroOrden(),
                ],
              ),
            ),
            Expanded(
              child: _cargando
                  ? const Center(child: CircularProgressIndicator())
                  : _filtrados.isEmpty
                      ? const Center(child: Text('No hay productos disponibles'))
                      : GridView.builder(
                          padding: const EdgeInsets.all(12),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 0.62,
                          ),
                          itemCount: _filtrados.length,
                          itemBuilder: (context, i) => _cardProducto(_filtrados[i]),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filtroCategoria() {
    return PopupMenuButton<String>(
      tooltip: 'Categoria',
      initialValue: _categoria,
      onSelected: (v) => setState(() => _categoria = v),
      itemBuilder: (_) => [
        const PopupMenuItem(value: '', child: Text('Todas las categorias')),
        ..._categorias.map((c) => PopupMenuItem(value: '$c', child: Text('$c'))),
      ],
      child: InputChip(
        label: Text(_categoria ?? 'Categoria'),
        avatar: const Icon(Icons.category, size: 18),
        onPressed: null,
      ),
    );
  }

  Widget _filtroMarca() {
    return PopupMenuButton<String>(
      tooltip: 'Marca',
      initialValue: _marca,
      onSelected: (v) => setState(() => _marca = v),
      itemBuilder: (_) => [
        const PopupMenuItem(value: '', child: Text('Todas las marcas')),
        ..._marcas.map((m) => PopupMenuItem(value: '$m', child: Text('$m'))),
      ],
      child: InputChip(
        label: Text(_marca ?? 'Marca'),
        avatar: const Icon(Icons.branding_watermark, size: 18),
        onPressed: null,
      ),
    );
  }

  Widget _filtroOrden() {
    return PopupMenuButton<String>(
      tooltip: 'Ordenar',
      initialValue: _orden,
      onSelected: (v) => setState(() => _orden = v),
      itemBuilder: (_) => const [
        PopupMenuItem(value: '', child: Text('Sin orden')),
        PopupMenuItem(value: 'precio_asc', child: Text('Precio: menor a mayor')),
        PopupMenuItem(value: 'precio_desc', child: Text('Precio: mayor a menor')),
        PopupMenuItem(value: 'rating', child: Text('Mejor calificados')),
      ],
      child: const InputChip(
        label: Text('Ordenar'),
        avatar: Icon(Icons.sort, size: 18),
        onPressed: null,
      ),
    );
  }

  Widget _cardProducto(Map<String, dynamic> p) {
    final precio = num.tryParse('${p['precio']}') ?? 0;
    final stock = p['stock'] as int? ?? 0;
    final enWish = _enWishlist(p['id'] as int);

    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () async {
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ProductoDetalleScreen(producto: p)),
          );
          _cargarTodo();
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                SizedBox(
                  height: 110,
                  width: double.infinity,
                  child: Image.network(
                    p['imagen_url'] as String? ?? '',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: Colors.grey[200],
                      child: const Icon(Icons.image_not_supported, size: 40),
                    ),
                  ),
                ),
                Positioned(
                  top: 4,
                  right: 4,
                  child: IconButton.filledTonal(
                    visualDensity: VisualDensity.compact,
                    onPressed: () => _toggleWishlist(p['id'] as int),
                    icon: Icon(
                      enWish ? Icons.favorite : Icons.favorite_border,
                      color: enWish ? Colors.red : null,
                      size: 20,
                    ),
                  ),
                ),
              ],
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p['nombre'] as String? ?? '',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const Spacer(),
                    Text(
                      formatoPesos(precio),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.indigo,
                      ),
                    ),
                    Text(
                      stock <= 10
                          ? 'Stock: $stock (poco)'
                          : 'Stock: $stock',
                      style: TextStyle(
                        fontSize: 11,
                        color: stock <= 10 ? Colors.red : Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}