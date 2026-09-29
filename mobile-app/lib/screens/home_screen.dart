import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/carrito_provider.dart';
import 'admin_screen.dart';
import 'carrito_screen.dart';
import 'pedidos_screen.dart';
import 'perfil_screen.dart';
import 'tienda_screen.dart';
import 'wishlist_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    final token = context.read<AuthProvider>().token;
    if (token != null) {
      context.read<CarritoProvider>().cargar(token);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final carrito = context.watch<CarritoProvider>();

    final screens = [
      const TiendaScreen(),
      const CarritoScreen(),
      const PedidosScreen(),
      const WishlistScreen(),
      const PerfilScreen(),
      if (auth.esAdmin) const AdminScreen(),
    ];

    final destinos = [
      const NavigationDestination(icon: Icon(Icons.storefront), label: 'Tienda'),
      NavigationDestination(
        icon: Badge(
          isLabelVisible: carrito.cantidadItems > 0,
          label: Text('${carrito.cantidadItems}'),
          child: const Icon(Icons.shopping_cart),
        ),
        label: 'Carrito',
      ),
      const NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Pedidos'),
      const NavigationDestination(icon: Icon(Icons.favorite), label: 'Wishlist'),
      const NavigationDestination(icon: Icon(Icons.person), label: 'Perfil'),
      if (auth.esAdmin)
        const NavigationDestination(icon: Icon(Icons.admin_panel_settings), label: 'Admin'),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: destinos,
      ),
    );
  }
}