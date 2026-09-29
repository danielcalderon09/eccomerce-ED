import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _nombre = TextEditingController();
  final _telefono = TextEditingController();
  bool _esRegistro = false;
  bool _procesando = false;
  bool _ocultarPassword = true;
  String? _error;
  String? _exito;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _nombre.dispose();
    _telefono.dispose();
    super.dispose();
  }

  void _cambiarModo(bool registro) {
    setState(() {
      _esRegistro = registro;
      _error = null;
      _exito = null;
    });
  }

  Future<void> _enviar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _procesando = true;
      _error = null;
      _exito = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      if (_esRegistro) {
        await auth.registrar({
          'nombre': _nombre.text.trim(),
          'email': _email.text.trim(),
          'password': _password.text,
          'telefono': _telefono.text.trim(),
        });
        if (!mounted) return;
        setState(() {
          _esRegistro = false;
          _password.clear();
          _exito = 'Registro exitoso. Ya puedes iniciar sesion.';
        });
      } else {
        await auth.login(_email.text.trim(), _password.text);
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.mensaje);
    } catch (_) {
      if (mounted) setState(() => _error = 'Error inesperado. Intenta de nuevo.');
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  Widget _campo({
    required TextEditingController controller,
    required String label,
    required IconData icono,
    TextInputType teclado = TextInputType.text,
    bool password = false,
    TextInputAction accion = TextInputAction.next,
    String? Function(String?)? validador,
    VoidCallback? onEnviado,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: teclado,
      obscureText: password && _ocultarPassword,
      textInputAction: accion,
      validator: validador,
      onFieldSubmitted: (_) => onEnviado,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icono),
        suffixIcon: password
            ? IconButton(
                onPressed: () => setState(() => _ocultarPassword = !_ocultarPassword),
                icon: Icon(_ocultarPassword ? Icons.visibility_off : Icons.visibility),
              )
            : null,
        filled: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [colorScheme.primary, colorScheme.tertiary],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                elevation: 12,
                shadowColor: Colors.black38,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(28),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: CircleAvatar(
                            radius: 36,
                            backgroundColor: colorScheme.primaryContainer,
                            child: Icon(
                              Icons.shopping_bag,
                              size: 36,
                              color: colorScheme.primary,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'E-Commerce',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                        Text(
                          _esRegistro ? 'Crea tu cuenta nueva' : 'Bienvenido de nuevo',
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 14, color: Colors.grey),
                        ),
                        const SizedBox(height: 20),
                        SegmentedButton<bool>(
                          segments: const [
                            ButtonSegment(value: false, label: Text('Iniciar Sesion')),
                            ButtonSegment(value: true, label: Text('Registrarse')),
                          ],
                          selected: {_esRegistro},
                          onSelectionChanged: (s) => _cambiarModo(s.first),
                          style: SegmentedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                        ),
                        const SizedBox(height: 20),
                        if (_error != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red[50],
                              border: Border.all(color: Colors.red.shade300),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline, color: Colors.red[700], size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _error!,
                                    style: TextStyle(color: Colors.red[800], fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        if (_exito != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.green[50],
                              border: Border.all(color: Colors.green.shade300),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.check_circle_outline, color: Colors.green[700], size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _exito!,
                                    style: TextStyle(color: Colors.green[800], fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        if (_esRegistro) ...[
                          _campo(
                            controller: _nombre,
                            label: 'Nombre completo',
                            icono: Icons.person,
                            validador: (v) =>
                                (v == null || v.trim().isEmpty) ? 'Ingresa tu nombre' : null,
                          ),
                          const SizedBox(height: 14),
                        ],
                        _campo(
                          controller: _email,
                          label: 'Email',
                          icono: Icons.email,
                          teclado: TextInputType.emailAddress,
                          validador: (v) {
                            final valor = v?.trim() ?? '';
                            if (valor.isEmpty) return 'Ingresa tu email';
                            if (!valor.contains('@')) return 'Email invalido';
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        if (_esRegistro) ...[
                          _campo(
                            controller: _telefono,
                            label: 'Telefono (opcional)',
                            icono: Icons.phone,
                            teclado: TextInputType.phone,
                          ),
                          const SizedBox(height: 14),
                        ],
                        _campo(
                          controller: _password,
                          label: 'Password',
                          icono: Icons.lock,
                          password: true,
                          accion: TextInputAction.done,
                          validador: (v) => (v == null || v.isEmpty)
                              ? 'Ingresa tu password'
                              : (v.length < 6 ? 'Minimo 6 caracteres' : null),
                          onEnviado: _procesando ? null : () => _enviar(),
                        ),
                        const SizedBox(height: 22),
                        FilledButton.icon(
                          onPressed: _procesando ? null : _enviar,
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          icon: _procesando
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Icon(_esRegistro ? Icons.person_add : Icons.login),
                          label: Text(
                            _procesando
                                ? 'Procesando...'
                                : (_esRegistro ? 'Crear Cuenta' : 'Iniciar Sesion'),
                            style: const TextStyle(fontSize: 16),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.info_outline, size: 16, color: Colors.grey),
                                  SizedBox(width: 6),
                                  Text(
                                    'Usuarios de prueba',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 4),
                              Text(
                                'admin@tienda.com  /  juan@cliente.com\npassword: password123',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}