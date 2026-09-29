import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../utils/formato.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  int _tab = 0;
  Map<String, dynamic>? _dashboard;
  List<dynamic> _usuarios = [];
  List<dynamic> _alertas = [];
  List<dynamic> _productos = [];
  Map<String, dynamic>? _estadisticas;
  List<dynamic> _reporteVentas = [];
  List<dynamic> _topProductos = [];
  List<dynamic> _reporteCategorias = [];

  final _productoNombre = TextEditingController();
  final _productoDesc = TextEditingController();
  final _productoPrecio = TextEditingController();
  final _productoStock = TextEditingController();
  final _productoCategoria = TextEditingController();
  final _productoMarca = TextEditingController();
  final _productoImagen = TextEditingController();
  int? _editandoId;

  final _ajusteProductoId = TextEditingController();
  final _ajusteCantidad = TextEditingController();
  String _ajusteTipo = 'entrada';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _cargarTodo());
  }

  String get _token => context.read<AuthProvider>().token ?? '';

  void _msg(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _cargarTodo() async {
    try {
      final results = await Future.wait([
        ApiService.dashboard(_token),
        ApiService.usuarios(_token),
        ApiService.alertasStock(_token),
        ApiService.productos(token: _token),
        ApiService.estadisticasInventario(_token),
        ApiService.reporteVentas(_token),
        ApiService.reporteTopProductos(_token),
        ApiService.reporteCategorias(_token),
      ]);
      if (!mounted) return;
      setState(() {
        _dashboard = (results[0] as Map<String, dynamic>);
        _usuarios = (results[1] as List<dynamic>);
        _alertas = (results[2] as List<dynamic>);
        _productos = (results[3] as List<dynamic>);
        _estadisticas = (results[4] as Map<String, dynamic>);
        _reporteVentas = (results[5] as List<dynamic>);
        _topProductos = (results[6] as List<dynamic>);
        _reporteCategorias = (results[7] as List<dynamic>);
      });
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    } catch (_) {
      if (mounted) _msg('Error cargando datos de administracion');
    }
  }

  // ===== PRODUCTOS CRUD =====
  void _abrirFormularioProducto([Map<String, dynamic>? p]) {
    _editandoId = p?['id'];
    _productoNombre.text = p?['nombre'] ?? '';
    _productoDesc.text = p?['descripcion'] ?? '';
    _productoPrecio.text = '${p?['precio'] ?? ''}';
    _productoStock.text = '${p?['stock'] ?? ''}';
    _productoCategoria.text = p?['categoria'] ?? '';
    _productoMarca.text = p?['marca'] ?? '';
    _productoImagen.text = p?['imagen_url'] ?? '';
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(_editandoId == null ? 'Crear Producto' : 'Editar Producto'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _productoNombre,
                decoration: const InputDecoration(labelText: 'Nombre *', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _productoDesc,
                decoration: const InputDecoration(labelText: 'Descripcion', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _productoPrecio,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Precio *', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _productoStock,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Stock *', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _productoCategoria,
                      decoration: const InputDecoration(labelText: 'Categoria', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _productoMarca,
                      decoration: const InputDecoration(labelText: 'Marca', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _productoImagen,
                decoration: const InputDecoration(labelText: 'URL de imagen', border: OutlineInputBorder()),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => _guardarProducto(),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  Future<void> _guardarProducto() async {
    final precio = num.tryParse(_productoPrecio.text.replaceAll(',', '.'));
    final stock = int.tryParse(_productoStock.text);
    if (_productoNombre.text.trim().isEmpty || precio == null || stock == null) {
      _msg('Nombre, precio y stock validos son requeridos');
      return;
    }
    Navigator.pop(context);
    try {
      final datos = {
        'nombre': _productoNombre.text.trim(),
        'descripcion': _productoDesc.text.trim(),
        'precio': precio,
        'stock': stock,
        'categoria': _productoCategoria.text.trim(),
        'marca': _productoMarca.text.trim(),
        'imagen_url': _productoImagen.text.trim(),
      };
      if (_editandoId == null) {
        await ApiService.crearProducto(datos, _token);
        _msg('Producto creado');
      } else {
        await ApiService.actualizarProducto(_editandoId!, datos, _token);
        _msg('Producto actualizado');
      }
      _cargarTodo();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  Future<void> _desactivarProducto(int id) async {
    try {
      await ApiService.actualizarProducto(id, {'activo': false}, _token);
      _msg('Producto desactivado');
      _cargarTodo();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  // ===== INVENTARIO =====
  void _abrirAjuste() {
    _ajusteProductoId.clear();
    _ajusteCantidad.clear();
    _ajusteTipo = 'entrada';
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Ajustar Inventario'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _ajusteTipo,
              decoration: const InputDecoration(labelText: 'Tipo', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'entrada', child: Text('Entrada')),
                DropdownMenuItem(value: 'salida', child: Text('Salida')),
                DropdownMenuItem(value: 'ajuste', child: Text('Ajuste')),
              ],
              onChanged: (v) => _ajusteTipo = v ?? 'entrada',
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _ajusteProductoId,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'ID del producto *', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _ajusteCantidad,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Cantidad *', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(onPressed: () => _guardarAjuste(), child: const Text('Ajustar')),
        ],
      ),
    );
  }

  Future<void> _guardarAjuste() async {
    final id = int.tryParse(_ajusteProductoId.text);
    final cantidad = int.tryParse(_ajusteCantidad.text);
    if (id == null || cantidad == null) {
      _msg('ID y cantidad validos son requeridos');
      return;
    }
    Navigator.pop(context);
    try {
      await ApiService.ajustarInventario({
        'producto_id': id,
        'tipo': _ajusteTipo,
        'cantidad': cantidad,
        'motivo': 'Ajuste desde app movil',
      }, _token);
      _msg('Inventario ajustado');
      _cargarTodo();
    } on ApiException catch (e) {
      if (mounted) _msg(e.mensaje);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Administracion')),
      body: Column(
        children: [
          TabBar(
            isScrollable: true,
            tabs: const [
              Tab(text: 'Dashboard'),
              Tab(text: 'Productos'),
              Tab(text: 'Inventario'),
              Tab(text: 'Usuarios'),
              Tab(text: 'Reportes'),
            ],
            onTap: (i) => setState(() => _tab = i),
          ),
          Expanded(child: _contenido()),
        ],
      ),
    );
  }

  Widget _contenido() {
    switch (_tab) {
      case 0:
        return _dashboardView();
      case 1:
        return _productosView();
      case 2:
        return _inventarioView();
      case 3:
        return _usuariosView();
      default:
        return _reportesView();
    }
  }

  Widget _cardKpi(String label, String valor, {IconData? icono, Color? color}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icono ?? Icons.monitor_heart, color: color ?? Colors.indigo),
            const SizedBox(height: 8),
            Text(valor, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _dashboardView() {
    final d = _dashboard;
    if (d == null) return const Center(child: CircularProgressIndicator());
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        if (_alertas.isNotEmpty)
          Card(
            color: Colors.red[50],
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Alertas de stock bajo (${_alertas.length})',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                  const SizedBox(height: 4),
                  ..._alertas.map((a) => Text('${a['nombre']}: ${a['stock']} unidades')),
                ],
              ),
            ),
          ),
        const SizedBox(height: 8),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          childAspectRatio: 1.6,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          children: [
            _cardKpi('Productos', '${d['productos'] ?? 0}', icono: Icons.inventory_2),
            _cardKpi('Pedidos', '${d['pedidos'] ?? 0}', icono: Icons.receipt_long, color: Colors.blue),
            _cardKpi('Clientes', '${d['clientes'] ?? 0}', icono: Icons.people, color: Colors.green),
            _cardKpi('Ingresos', formatoPesos(d['ingresos_totales']), icono: Icons.payments, color: Colors.purple),
          ],
        ),
        const SizedBox(height: 8),
        _cardKpi('Ventas Hoy', formatoPesos(d['ventas_hoy']), icono: Icons.today, color: Colors.green),
        _cardKpi('Ventas del Mes', formatoPesos(d['ventas_mes']), icono: Icons.calendar_month, color: Colors.blue),
      ],
    );
  }

  Widget _productosView() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: Text('Gestion de Productos (${_productos.length})',
                    style: Theme.of(context).textTheme.titleMedium),
              ),
              FilledButton.icon(
                onPressed: () => _abrirFormularioProducto(),
                icon: const Icon(Icons.add),
                label: const Text('Crear'),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _cargarTodo,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: _productos.length,
              itemBuilder: (context, i) {
                final p = _productos[i];
                return Card(
                  child: ListTile(
                    title: Text('${p['nombre']}'),
                    subtitle: Text(
                        '${p['categoria'] ?? '-'} | ${p['marca'] ?? '-'}\n${formatoPesos(p['precio'])} | Stock: ${p['stock']}'),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          onPressed: () => _abrirFormularioProducto(p),
                          icon: const Icon(Icons.edit_outlined, color: Colors.blue),
                        ),
                        IconButton(
                          onPressed: () => _desactivarProducto(p['id'] as int),
                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _inventarioView() {
    final e = _estadisticas;
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        if (e != null)
          Row(
            children: [
              Expanded(child: _cardKpi('Productos', '${e['total_productos'] ?? 0}', icono: Icons.inventory_2)),
              const SizedBox(width: 8),
              Expanded(child: _cardKpi('Stock total', '${e['stock_total'] ?? 0}', icono: Icons.all_inbox)),
            ],
          ),
        if (e != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: _cardKpi('Valor inventario', formatoPesos(e['valor_inventario']), icono: Icons.payments, color: Colors.purple),
          ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _abrirAjuste,
          icon: const Icon(Icons.tune),
          label: const Text('Ajustar Inventario'),
        ),
        const SizedBox(height: 12),
        Text('Productos con stock bajo', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_alertas.isEmpty)
          const Padding(
            padding: EdgeInsets.all(8),
            child: Text('Sin alertas', style: TextStyle(color: Colors.grey)),
          )
        else
          ..._alertas.map(
            (a) => Card(
              color: Colors.red[50],
              child: ListTile(
                title: Text('${a['nombre']}'),
                subtitle: Text('Stock: ${a['stock']}'),
                leading: const Icon(Icons.warning_amber, color: Colors.red),
              ),
            ),
          ),
      ],
    );
  }

  Widget _usuariosView() {
    return RefreshIndicator(
      onRefresh: _cargarTodo,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _usuarios.length,
        itemBuilder: (context, i) {
          final u = _usuarios[i];
          return Card(
            child: ListTile(
              leading: CircleAvatar(child: Text(iniciales('${u['nombre']}'))),
              title: Text('${u['nombre']}'),
              subtitle: Text('${u['email']}\nTel: ${u['telefono'] ?? '-'}'),
              isThreeLine: true,
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Chip(
                    label: Text('${u['rol']}', style: const TextStyle(fontSize: 11)),
                    visualDensity: VisualDensity.compact,
                    backgroundColor: u['rol'] == 'admin' ? Colors.purple[100] : Colors.blue[100],
                  ),
                  Text(
                    u['activo'] == true ? 'Activo' : 'Inactivo',
                    style: TextStyle(fontSize: 11, color: u['activo'] == true ? Colors.green : Colors.red),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _reportesView() {
    return RefreshIndicator(
      onRefresh: _cargarTodo,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Text('Ventas por periodo', style: Theme.of(context).textTheme.titleMedium),
          if (_reporteVentas.isEmpty)
            const Padding(
              padding: EdgeInsets.all(8),
              child: Text('Sin ventas registradas', style: TextStyle(color: Colors.grey)),
            )
          else
            ..._reporteVentas.map(
              (v) => Card(
                child: ListTile(
                  leading: const Icon(Icons.date_range),
                  title: Text('${v['fecha']}'),
                  subtitle: Text('${v['total_pedidos']} pedidos'),
                  trailing: Text(formatoPesos(v['ingresos']), style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          const Divider(height: 32),
          Text('Top productos', style: Theme.of(context).textTheme.titleMedium),
          if (_topProductos.isEmpty)
            const Padding(
              padding: EdgeInsets.all(8),
              child: Text('Sin datos', style: TextStyle(color: Colors.grey)),
            )
          else
            ..._topProductos.map(
              (p) => Card(
                child: ListTile(
                  leading: const Icon(Icons.star, color: Colors.amber),
                  title: Text('${p['nombre']}'),
                  subtitle: Text('${p['unidades_vendidas']} unidades vendidas'),
                  trailing: Text(formatoPesos(p['ingresos']), style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          const Divider(height: 32),
          Text('Ingresos por categoria', style: Theme.of(context).textTheme.titleMedium),
          if (_reporteCategorias.isEmpty)
            const Padding(
              padding: EdgeInsets.all(8),
              child: Text('Sin datos', style: TextStyle(color: Colors.grey)),
            )
          else
            ..._reporteCategorias.map(
              (c) => Card(
                child: ListTile(
                  leading: const Icon(Icons.category),
                  title: Text('${c['categoria'] ?? 'Sin categoria'}'),
                  subtitle: Text('${c['num_pedidos']} pedidos'),
                  trailing: Text(formatoPesos(c['ingresos']), style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ),
        ],
      ),
    );
  }
}