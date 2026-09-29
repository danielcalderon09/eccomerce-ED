import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import apiClient from '../api/client';

export default function Dashboard() {
    const { usuario, logout } = useAuth();
    const toast = useToast();
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState({ items: [], total: 0, subtotal: 0, descuento: 0 });
    const [pedidos, setPedidos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [marcas, setMarcas] = useState([]);
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroMarca, setFiltroMarca] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [ordenar, setOrdenar] = useState('');
    const [vista, setVista] = useState('tienda');
    const [loading, setLoading] = useState(true);
    const [wishlist, setWishlist] = useState([]);
    const [direcciones, setDirecciones] = useState([]);
    const [cupones, setCupones] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [alertasStock, setAlertasStock] = useState([]);
    const [showProductoModal, setShowProductoModal] = useState(false);
    const [editandoProducto, setEditandoProducto] = useState(null);
    const [productoForm, setProductoForm] = useState({ nombre: '', descripcion: '', precio: '', categoria: '', marca: '', imagen_url: '', stock: '' });
    const [productoImagen, setProductoImagen] = useState(null);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [direccionForm, setDireccionForm] = useState({ departamento: '', ciudad: '', direccion: '', celular: '' });
    const [codigoCupon, setCodigoCupon] = useState('');
    const [cuponAplicado, setCuponAplicado] = useState(null);
    const [descuentoCupon, setDescuentoCupon] = useState(0);

    useEffect(() => { cargarDatos(); }, [usuario]);

    const cargarDatos = async () => {
        try {
            const [productosData, carritoData, pedidosData, categoriasData, marcasData, wishlistData, direccionesData, cuponesData] = await Promise.all([
                apiClient.get('/productos'),
                apiClient.get('/carrito'),
                apiClient.get('/pedidos'),
                apiClient.get('/productos/categorias'),
                apiClient.get('/productos/marcas'),
                apiClient.get('/wishlist'),
                apiClient.get('/direcciones'),
                apiClient.get('/cupones'),
            ]);
            setProductos(productosData);
            setCarrito(carritoData);
            setPedidos(pedidosData);
            setCategorias(categoriasData);
            setMarcas(marcasData);
            setWishlist(wishlistData);
            setDirecciones(direccionesData);
            setCupones(cuponesData);
            if (usuario.rol === 'admin') {
                const [dashData, usuariosData, alertasData] = await Promise.all([
                    apiClient.get('/reportes/dashboard'),
                    apiClient.get('/usuarios'),
                    apiClient.get('/inventario/alertas?umbral=10'),
                ]);
                setDashboard(dashData);
                setUsuarios(usuariosData);
                setAlertasStock(alertasData);
            }
        } catch (error) { toast.error('Error cargando datos'); }
        finally { setLoading(false); }
    };

    const agregarAlCarrito = async (producto_id) => {
        try { await apiClient.post('/carrito/items', { producto_id, cantidad: 1 }); await cargarDatos(); toast.success('Producto agregado al carrito'); }
        catch (error) { toast.error(error.message); }
    };

    const actualizarCantidad = async (item_id, cantidad) => {
        const itemAnterior = carrito.items.find(i => i.id === item_id);
        setCarrito(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === item_id ? { ...i, cantidad } : i)
        }));
        try {
            await apiClient.put(`/carrito/items/${item_id}`, { cantidad });
            const carritoData = await apiClient.get('/carrito');
            setCarrito(carritoData);
        } catch (error) {
            setCarrito(prev => ({
                ...prev,
                items: prev.items.map(i => i.id === item_id ? itemAnterior : i)
            }));
            toast.error(error.message);
        }
    };

    const eliminarDelCarrito = async (item_id) => {
        try { await apiClient.delete(`/carrito/items/${item_id}`); await cargarDatos(); toast.success('Item eliminado del carrito'); }
        catch (error) { toast.error(error.message); }
    };

    const aplicarCupon = async (codigo) => {
        if (!codigo || !codigo.trim()) return;
        try {
            const result = await apiClient.post('/cupones/validar', { codigo: codigo.trim(), subtotal: carrito.subtotal });
            setCuponAplicado(result.cupon);
            setDescuentoCupon(result.descuento);
            toast.success(`Cupon "${codigo}" aplicado! Descuento: $${result.descuento.toLocaleString()}`);
        } catch (error) { toast.error(error.message); }
    };

    const quitarCupon = () => {
        setCuponAplicado(null);
        setDescuentoCupon(0);
        setCodigoCupon('');
    };

    const abrirCheckout = () => {
        setCodigoCupon('');
        setCuponAplicado(null);
        setDescuentoCupon(0);
        setDireccionForm({ departamento: '', ciudad: '', direccion: '', celular: '' });
        setShowCheckoutModal(true);
    };

    const confirmarPedido = async () => {
        if (!direccionForm.direccion.trim() || !direccionForm.ciudad.trim()) {
            toast.error('Ingresa direccion y ciudad para el envio');
            return;
        }
        try {
            const direccionCompleta = `${direccionForm.direccion}, ${direccionForm.ciudad}${direccionForm.departamento ? `, ${direccionForm.departamento}` : ''}`;
            const pedido = await apiClient.post('/pedidos/checkout', {
                direccion_envio: direccionCompleta,
                telefono: direccionForm.celular,
                metodo_pago: 'tarjeta_credito',
                cupon_codigo: cuponAplicado?.codigo || null
            });
            setShowCheckoutModal(false);
            toast.success(`Pedido #${pedido.pedido.id} creado exitosamente! Total: $${pedido.total.toLocaleString()}`);
            await cargarDatos();
        } catch (error) { toast.error(error.message); }
    };

    const procesarPago = async (pedido_id) => {
        try {
            const resultado = await apiClient.post('/pagos/procesar', { pedido_id, metodo_pago: 'tarjeta_credito' });
            toast[resultado.pago.estado === 'aprobado' ? 'success' : 'error'](resultado.mensaje);
            await cargarDatos();
        } catch (error) { toast.error(error.message); }
    };

    const toggleWishlist = async (producto_id) => {
        const enWishlist = wishlist.find(w => w.producto_id === producto_id);
        try {
            if (enWishlist) {
                await apiClient.delete(`/wishlist/${enWishlist.id}`);
                toast.success('Eliminado de wishlist');
            } else {
                await apiClient.post('/wishlist', { producto_id });
                toast.success('Agregado a wishlist');
            }
            await cargarDatos();
        } catch (error) { toast.error(error.message); }
    };

    const moverACarrito = async (producto_id) => {
        try { await apiClient.post('/wishlist/mover-carrito', { producto_id }); await cargarDatos(); toast.success('Movido al carrito'); }
        catch (error) { toast.error(error.message); }
    };

    const crearReseña = async (producto_id) => {
        const calificacion = prompt('Calificacion (1-5):');
        const comentario = prompt('Comentario:');
        if (!calificacion) return;
        try {
            await apiClient.post('/resenas', { producto_id, calificacion: parseInt(calificacion), comentario });
            toast.success('Reseña creada');
            await cargarDatos();
        } catch (error) { toast.error(error.message); }
    };

    const ajustarInventario = async (producto_id) => {
        const tipo = prompt('Tipo (entrada/salida/ajuste):');
        const cantidad = prompt('Cantidad:');
        const motivo = prompt('Motivo:');
        if (!tipo || !cantidad) return;
        try {
            await apiClient.post('/inventario/ajustar', { producto_id, tipo, cantidad: parseInt(cantidad), motivo });
            toast.success('Inventario ajustado');
            await cargarDatos();
        } catch (error) { toast.error(error.message); }
    };

    const actualizarEstadoPedido = async (pedido_id) => {
        const estado = prompt('Nuevo estado (pendiente_pago/pagado/enviado/entregado/cancelado):');
        if (!estado) return;
        try {
            await apiClient.put(`/pedidos/${pedido_id}/estado`, { estado });
            toast.success('Estado actualizado');
            await cargarDatos();
        } catch (error) { toast.error(error.message); }
    };

    const abrirCrearProducto = () => {
        setEditandoProducto(null);
        setProductoForm({ nombre: '', descripcion: '', precio: '', categoria: '', marca: '', imagen_url: '', stock: '' });
        setProductoImagen(null);
        setShowProductoModal(true);
    };

    const abrirEditarProducto = (producto) => {
        setEditandoProducto(producto);
        setProductoForm({
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            precio: producto.precio.toString(),
            categoria: producto.categoria || '',
            marca: producto.marca || '',
            imagen_url: producto.imagen_url || '',
            stock: producto.stock.toString()
        });
        setProductoImagen(null);
        setShowProductoModal(true);
    };

    const guardarProducto = async () => {
        if (!productoForm.nombre.trim()) { toast.error('El nombre es requerido'); return; }
        const precioNum = Number(productoForm.precio);
        if (productoForm.precio === '' || isNaN(precioNum) || precioNum < 0) { toast.error('Ingresa un precio valido (mayor o igual a 0)'); return; }
        const stockNum = Number(productoForm.stock);
        if (productoForm.stock === '' || !Number.isInteger(stockNum) || stockNum < 0) { toast.error('Ingresa un stock valido (numero entero mayor o igual a 0)'); return; }
        try {
            const formData = new FormData();
            formData.append('nombre', productoForm.nombre);
            formData.append('descripcion', productoForm.descripcion || '');
            formData.append('precio', productoForm.precio);
            formData.append('categoria', productoForm.categoria || '');
            formData.append('marca', productoForm.marca || '');
            formData.append('stock', productoForm.stock);
            if (productoImagen) {
                formData.append('imagen', productoImagen);
            }
            if (editandoProducto) {
                await apiClient.put(`/productos/${editandoProducto.id}`, formData);
                toast.success('Producto actualizado');
            } else {
                await apiClient.post('/productos', formData);
                toast.success('Producto creado');
            }
            setShowProductoModal(false);
            setProductoImagen(null);
            await cargarDatos();
        } catch (error) { toast.error(error.message); }
    };

    const eliminarProducto = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
        try {
            await apiClient.put(`/productos/${id}`, { activo: false });
            toast.success('Producto eliminado');
            await cargarDatos();
        } catch (error) { toast.error(error.message); }
    };

    if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="text-xl text-gray-600">Cargando...</div></div>;

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="sticky top-0 z-40 shadow-lg">
            <nav className="bg-indigo-600 text-white">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-bold whitespace-nowrap">E-Commerce</h1>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setVista('tienda')} className={`px-4 py-2 rounded-md capitalize transition-colors ${vista === 'tienda' ? 'bg-white text-indigo-600' : 'hover:bg-indigo-500'}`}>Tienda</button>
                            <button onClick={() => setVista('pedidos')} className={`px-4 py-2 rounded-md capitalize transition-colors ${vista === 'pedidos' ? 'bg-white text-indigo-600' : 'hover:bg-indigo-500'}`}>Pedidos</button>
                            {usuario.rol === 'admin' && (
                                <button onClick={() => setVista('admin')} className={`px-4 py-2 rounded-md capitalize transition-colors ${vista === 'admin' || ['productos','inventario','usuarios','reportes'].includes(vista) ? 'bg-white text-indigo-600' : 'hover:bg-indigo-500'}`}>Admin</button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setVista('wishlist')} className="relative p-2 rounded-full hover:bg-indigo-500 transition-colors" title="Wishlist">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={vista === 'wishlist' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {wishlist.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{wishlist.length}</span>}
                        </button>
                        <button onClick={() => setVista('carrito')} className="relative p-2 rounded-full hover:bg-indigo-500 transition-colors" title="Carrito de compras">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={vista === 'carrito' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6a1 1 0 00.9 1.4H18M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                            </svg>
                            {carrito.items.length > 0 && <span className="absolute -top-1 -right-1 bg-yellow-400 text-indigo-900 text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{carrito.items.length}</span>}
                        </button>
                        <div className="h-8 w-px bg-indigo-400/50" />
                        <span className="text-sm whitespace-nowrap">{usuario.rol === 'admin' ? 'Admin' : usuario.nombre}</span>
                        <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md text-sm whitespace-nowrap">Cerrar Sesion</button>
                    </div>
                </div>
            </nav>

            {usuario.rol === 'admin' && ['admin','productos','inventario','usuarios','reportes'].includes(vista) && (
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 py-2 flex gap-2">
                        {[{label:'Dashboard',v:'admin'},{label:'Productos',v:'productos'},{label:'Inventario',v:'inventario'},{label:'Usuarios',v:'usuarios'},{label:'Reportes',v:'reportes'}].map(tab => (
                            <button key={tab.v} onClick={() => setVista(tab.v)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${vista === tab.v ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{tab.label}</button>
                        ))}
                    </div>
                </div>
            )}
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {vista === 'tienda' && <Tienda productos={productos} categorias={categorias} marcas={marcas} filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria} filtroMarca={filtroMarca} setFiltroMarca={setFiltroMarca} busqueda={busqueda} setBusqueda={setBusqueda} ordenar={ordenar} setOrdenar={setOrdenar} agregarAlCarrito={agregarAlCarrito} toggleWishlist={toggleWishlist} wishlist={wishlist} crearReseña={crearReseña} />}
                {vista === 'carrito' && <Carrito carrito={carrito} actualizarCantidad={actualizarCantidad} eliminarDelCarrito={eliminarDelCarrito} abrirCheckout={abrirCheckout} />}
                {vista === 'pedidos' && <Pedidos pedidos={pedidos} procesarPago={procesarPago} actualizarEstadoPedido={actualizarEstadoPedido} esAdmin={usuario.rol === 'admin'} />}
                {vista === 'wishlist' && <Wishlist wishlist={wishlist} toggleWishlist={toggleWishlist} moverACarrito={moverACarrito} />}
                {vista === 'productos' && usuario.rol === 'admin' && <ProductosAdmin productos={productos} abrirCrearProducto={abrirCrearProducto} abrirEditarProducto={abrirEditarProducto} eliminarProducto={eliminarProducto} />}
                {vista === 'admin' && usuario.rol === 'admin' && <AdminPanel productos={productos} pedidos={pedidos} dashboard={dashboard} alertasStock={alertasStock} />}
                {vista === 'inventario' && usuario.rol === 'admin' && <InventarioPanel productos={productos} alertasStock={alertasStock} ajustarInventario={ajustarInventario} />}
                {vista === 'usuarios' && usuario.rol === 'admin' && <UsuariosPanel usuarios={usuarios} />}
                {vista === 'reportes' && usuario.rol === 'admin' && <ReportesPanel dashboard={dashboard} />}
            </div>

            {showProductoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <form className="p-6" onSubmit={(e) => { e.preventDefault(); guardarProducto(); }}>
                            <h2 className="text-2xl font-bold mb-4">{editandoProducto ? 'Editar Producto' : 'Crear Producto'}</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                    <input type="text" value={productoForm.nombre} onChange={(e) => setProductoForm({...productoForm, nombre: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                                    <textarea value={productoForm.descripcion} onChange={(e) => setProductoForm({...productoForm, descripcion: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows="3" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                                        <input type="number" step="0.01" value={productoForm.precio} onChange={(e) => setProductoForm({...productoForm, precio: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                                        <input type="number" value={productoForm.stock} onChange={(e) => setProductoForm({...productoForm, stock: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                                        <input type="text" value={productoForm.categoria} onChange={(e) => setProductoForm({...productoForm, categoria: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                                        <input type="text" value={productoForm.marca} onChange={(e) => setProductoForm({...productoForm, marca: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del Producto</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setProductoImagen(file);
                                                const reader = new FileReader();
                                                reader.onloadend = () => setProductoForm({...productoForm, imagen_url: reader.result});
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                    {productoForm.imagen_url && <img src={productoForm.imagen_url} alt="Preview" className="mt-2 max-h-40 rounded" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x300?text=Imagen+No+Disponible'; }} />}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowProductoModal(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{editandoProducto ? 'Actualizar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showCheckoutModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Confirmar Pedido</h2>
                                <button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-bold text-gray-700 mb-3">Productos ({carrito.items.length})</h3>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                                        {carrito.items.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-md">
                                                <img src={item.imagen_url} alt={item.nombre} className="w-12 h-12 object-cover rounded" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/48'; }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                                                    <p className="text-xs text-gray-500">{item.cantidad} x ${item.precio_unitario.toLocaleString()}</p>
                                                </div>
                                                <p className="text-sm font-bold text-gray-800 whitespace-nowrap">${(item.cantidad * item.precio_unitario).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-bold text-gray-700 mb-3">Direccion de Envio</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Direccion *</label>
                                                <input type="text" value={direccionForm.direccion} onChange={(e) => setDireccionForm({...direccionForm, direccion: e.target.value})} placeholder="Calle, carrera, numero..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" required />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                                                    <input type="text" value={direccionForm.ciudad} onChange={(e) => setDireccionForm({...direccionForm, ciudad: e.target.value})} placeholder="Ciudad" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" required />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                                                    <input type="text" value={direccionForm.departamento} onChange={(e) => setDireccionForm({...direccionForm, departamento: e.target.value})} placeholder="Departamento" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                                                <input type="tel" value={direccionForm.celular} onChange={(e) => setDireccionForm({...direccionForm, celular: e.target.value})} placeholder="3001234567" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Cupon Promocional</label>
                                        {cuponAplicado ? (
                                            <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-bold text-green-800">{cuponAplicado.codigo}</p>
                                                        <p className="text-xs text-green-600">{cuponAplicado.tipo === 'porcentaje' ? `${cuponAplicado.valor}%` : `$${cuponAplicado.valor.toLocaleString()}`}</p>
                                                    </div>
                                                    <button onClick={quitarCupon} className="text-red-600 text-sm hover:underline">Quitar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input type="text" value={codigoCupon} onChange={(e) => setCodigoCupon(e.target.value)} placeholder="Ingresa codigo" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                                                <button onClick={() => aplicarCupon(codigoCupon)} disabled={!codigoCupon.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 text-sm">Aplicar</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal:</span>
                                        <span>${carrito.subtotal?.toLocaleString()}</span>
                                    </div>
                                    {descuentoCupon > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Descuento:</span>
                                            <span>-${descuentoCupon.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-2xl font-bold border-t pt-2">
                                        <span>Total:</span>
                                        <span className="text-indigo-600">${((carrito.subtotal || 0) - descuentoCupon).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowCheckoutModal(false)} className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
                                <button onClick={confirmarPedido} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium">Confirmar Pedido</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Tienda({ productos, categorias, marcas, filtroCategoria, setFiltroCategoria, filtroMarca, setFiltroMarca, busqueda, setBusqueda, ordenar, setOrdenar, agregarAlCarrito, toggleWishlist, wishlist, crearReseña }) {
    const productosFiltrados = productos.filter(p => {
        const matchCat = !filtroCategoria || p.categoria === filtroCategoria;
        const matchMarca = !filtroMarca || p.marca === filtroMarca;
        const matchBusq = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
        return matchCat && matchMarca && matchBusq;
    }).sort((a, b) => {
        if (ordenar === 'precio_asc') return a.precio - b.precio;
        if (ordenar === 'precio_desc') return b.precio - a.precio;
        if (ordenar === 'rating') return b.calificacion_promedio - a.calificacion_promedio;
        return 0;
    });

    const enWishlist = (producto_id) => wishlist.find(w => w.producto_id === producto_id);

    if (productosFiltrados.length === 0) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">No hay productos disponibles</h2>
                <p className="text-gray-600">El administrador debe crear productos para que aparezcan aqui.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 flex gap-4 flex-wrap">
                <input type="text" placeholder="Buscar productos..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-md" />
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md"><option value="">Todas las categorias</option>{categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md"><option value="">Todas las marcas</option>{marcas.map(m => <option key={m} value={m}>{m}</option>)}</select>
                <select value={ordenar} onChange={(e) => setOrdenar(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md"><option value="">Ordenar por</option><option value="precio_asc">Precio: Menor a Mayor</option><option value="precio_desc">Precio: Mayor a Menor</option><option value="rating">Mejor calificados</option></select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                {productosFiltrados.map(producto => (
                    <div key={producto.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                        <div className="relative">
                            <img src={producto.imagen_url || 'https://via.placeholder.com/400x300?text=Sin+Imagen'} alt={producto.nombre} className="w-full h-48 object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x300?text=Sin+Imagen'; }} />
                            <button onClick={() => toggleWishlist(producto.id)} className={`absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${enWishlist(producto.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={enWishlist(producto.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-2 min-h-[56px]">{producto.nombre}</h3>
                            <p className="text-gray-500 text-xs mb-1">{producto.marca} - {producto.categoria}</p>
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2 min-h-[40px]">{producto.descripcion}</p>
                            <div className="flex items-center gap-1 mb-2 min-h-[20px]">{producto.num_reseñas > 0 && <><span className="text-yellow-500">{'★'.repeat(Math.round(producto.calificacion_promedio))}</span><span className="text-gray-400 text-xs">({producto.num_reseñas})</span></>}</div>
                            <div className="flex justify-between items-center">
                                <span className="text-2xl font-bold text-indigo-600">${producto.precio.toLocaleString()}</span>
                                <span className={`text-sm ${producto.stock <= 10 ? 'text-red-600 font-bold' : 'text-gray-500'}`}>Stock: {producto.stock}</span>
                            </div>
                            <div className="flex gap-2 mt-auto pt-3">
                                <button onClick={() => agregarAlCarrito(producto.id)} disabled={producto.stock === 0} className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 text-sm">{producto.stock === 0 ? 'Agotado' : 'Agregar'}</button>
                                <button onClick={() => crearReseña(producto.id)} className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm" title="Dejar reseña">★</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Carrito({ carrito, actualizarCantidad, eliminarDelCarrito, abrirCheckout }) {
    if (carrito.items.length === 0) return <div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-800 mb-4">Tu carrito esta vacio</h2></div>;
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Carrito de Compras</h2>
            <div className="bg-white rounded-lg shadow-md p-6">
                {carrito.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between border-b py-4 flex-wrap gap-2">
                        <img src={item.imagen_url} alt={item.nombre} className="w-20 h-20 object-cover rounded" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/80?text=Sin+Imagen'; }} />
                        <div className="flex-1 ml-4 min-w-[150px]"><h3 className="font-bold text-gray-800">{item.nombre}</h3><p className="text-gray-600">${item.precio_unitario.toLocaleString()}</p></div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => actualizarCantidad(item.id, Math.max(1, item.cantidad - 1))} className="px-3 py-1 bg-gray-200 rounded">-</button>
                            <span className="px-3">{item.cantidad}</span>
                            <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="px-3 py-1 bg-gray-200 rounded">+</button>
                        </div>
                        <div className="ml-4 text-right"><p className="font-bold text-lg">${(item.cantidad * item.precio_unitario).toLocaleString()}</p><button onClick={() => eliminarDelCarrito(item.id)} className="text-red-600 text-sm hover:underline">Eliminar</button></div>
                    </div>
                ))}
                <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>${carrito.subtotal?.toLocaleString()}</span></div>
                    {carrito.descuento > 0 && <div className="flex justify-between text-green-600"><span>Descuento:</span><span>-${carrito.descuento.toLocaleString()}</span></div>}
                    <div className="flex justify-between text-2xl font-bold"><span>Total:</span><span className="text-indigo-600">${carrito.total?.toLocaleString()}</span></div>
                </div>
                <div className="mt-4">
                    <button onClick={abrirCheckout} className="w-full bg-green-600 text-white px-8 py-3 rounded-md hover:bg-green-700 text-lg font-medium">Realizar Pedido</button>
                </div>
            </div>
        </div>
    );
}

function Pedidos({ pedidos, procesarPago, actualizarEstadoPedido, esAdmin }) {
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Mis Pedidos</h2>
            {pedidos.length === 0 ? <p className="text-gray-600">No tienes pedidos</p> : (
                <div className="space-y-4">
                    {pedidos.map(pedido => (
                        <div key={pedido.id} className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                                <div><h3 className="font-bold text-lg">Pedido #{pedido.id}</h3><p className="text-gray-600 text-sm">Creado: {new Date(pedido.creado_en).toLocaleDateString()}</p>{pedido.direccion_envio && <p className="text-gray-500 text-sm">Envio: {pedido.direccion_envio}</p>}</div>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${pedido.estado === 'pagado' ? 'bg-green-100 text-green-800' : pedido.estado === 'pendiente_pago' ? 'bg-yellow-100 text-yellow-800' : pedido.estado === 'enviado' ? 'bg-blue-100 text-blue-800' : pedido.estado === 'entregado' ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'}`}>{pedido.estado.replace('_', ' ').toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <div><p className="text-xl font-bold">Total: ${pedido.total.toLocaleString()}</p>{pedido.descuento > 0 && <p className="text-green-600 text-sm">Descuento: -${pedido.descuento.toLocaleString()}</p>}</div>
                                <div className="flex gap-2">
                                    {pedido.estado === 'pendiente_pago' && <button onClick={() => procesarPago(pedido.id)} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Pagar Ahora</button>}
                                    {esAdmin && pedido.estado !== 'cancelado' && <button onClick={() => actualizarEstadoPedido(pedido.id)} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm">Cambiar Estado</button>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Wishlist({ wishlist, toggleWishlist, moverACarrito }) {
    if (wishlist.length === 0) return <div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-800 mb-4">Tu wishlist esta vacia</h2></div>;
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Mi Wishlist ({wishlist.length})</h2>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                {wishlist.map(item => (
                    <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
                        <img src={item.imagen_url} alt={item.nombre} className="w-full h-48 object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x300?text=Sin+Imagen'; }} />
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-2 min-h-[56px]">{item.nombre}</h3>
                            <p className="text-gray-500 text-sm mb-2">{item.marca} - {item.categoria}</p>
                            <p className="text-2xl font-bold text-indigo-600 mt-auto pt-2">${item.precio.toLocaleString()}</p>
                            <div className="flex gap-2 pt-3">
                                <button onClick={() => moverACarrito(item.producto_id)} className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 text-sm">Mover al carrito</button>
                                <button onClick={() => toggleWishlist(item.producto_id)} className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 text-sm">✕</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProductosAdmin({ productos, abrirCrearProducto, abrirEditarProducto, eliminarProducto }) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Gestion de Productos</h2>
                <button onClick={abrirCrearProducto} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">+ Crear Producto</button>
            </div>
            {productos.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg">
                    <p className="text-gray-600 mb-4">No hay productos creados</p>
                    <button onClick={abrirCrearProducto} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Crear primer producto</button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Imagen</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Categoria</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Marca</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Precio</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Stock</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map(p => (
                                <tr key={p.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3"><img src={p.imagen_url || 'https://via.placeholder.com/50'} alt={p.nombre} className="w-12 h-12 object-cover rounded" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/50'; }} /></td>
                                    <td className="px-4 py-3 text-sm font-medium">{p.nombre}</td>
                                    <td className="px-4 py-3 text-sm">{p.categoria || '-'}</td>
                                    <td className="px-4 py-3 text-sm">{p.marca || '-'}</td>
                                    <td className="px-4 py-3 text-sm">${p.precio.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm"><span className={p.stock <= 10 ? 'text-red-600 font-bold' : ''}>{p.stock}</span></td>
                                    <td className="px-4 py-3 text-sm">
                                        <button onClick={() => abrirEditarProducto(p)} className="text-blue-600 hover:underline mr-3">Editar</button>
                                        <button onClick={() => eliminarProducto(p.id)} className="text-red-600 hover:underline">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function AdminPanel({ productos, pedidos, dashboard, alertasStock }) {
    if (!dashboard) return <div className="text-center py-12">Cargando dashboard...</div>;
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Panel de Administracion</h2>
            {alertasStock.length > 0 && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><h3 className="font-bold text-red-800 mb-2">Alertas de Stock Bajo ({alertasStock.length})</h3><div className="flex flex-wrap gap-2">{alertasStock.map(p => <span key={p.id} className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm">{p.nombre} (Stock: {p.stock})</span>)}</div></div>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[{label: 'Productos', value: dashboard.productos, color: 'indigo'}, {label: 'Pedidos', value: dashboard.pedidos, color: 'blue'}, {label: 'Clientes', value: dashboard.clientes, color: 'green'}, {label: 'Ingresos', value: `$${dashboard.ingresos_totales.toLocaleString()}`, color: 'purple'}].map(s => (
                    <div key={s.label} className="bg-white rounded-lg shadow-md p-6"><h3 className="text-gray-600 text-sm">{s.label}</h3><p className="text-3xl font-bold">{s.value}</p></div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6"><h3 className="font-bold text-gray-800 mb-2">Ventas Hoy</h3><p className="text-2xl font-bold text-green-600">${dashboard.ventas_hoy.toLocaleString()}</p></div>
                <div className="bg-white rounded-lg shadow-md p-6"><h3 className="font-bold text-gray-800 mb-2">Ventas del Mes</h3><p className="text-2xl font-bold text-blue-600">${dashboard.ventas_mes.toLocaleString()}</p></div>
            </div>
        </div>
    );
}

function InventarioPanel({ productos, alertasStock, ajustarInventario }) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Gestion de Inventario</h2>
            {alertasStock.length > 0 && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><h3 className="font-bold text-red-800 mb-2">Productos con stock bajo (≤10)</h3><div className="flex flex-wrap gap-2">{alertasStock.map(p => <span key={p.id} className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm">{p.nombre}: {p.stock} unidades</span>)}</div></div>}
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full"><thead className="bg-gray-100"><tr><th className="px-4 py-3 text-left text-sm font-semibold">Producto</th><th className="px-4 py-3 text-left text-sm font-semibold">Categoria</th><th className="px-4 py-3 text-left text-sm font-semibold">Precio</th><th className="px-4 py-3 text-left text-sm font-semibold">Stock</th><th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th></tr></thead><tbody>
                    {productos.map(p => (<tr key={p.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3 text-sm">{p.nombre}</td><td className="px-4 py-3 text-sm">{p.categoria}</td><td className="px-4 py-3 text-sm">${p.precio.toLocaleString()}</td><td className="px-4 py-3 text-sm"><span className={p.stock <= 10 ? 'text-red-600 font-bold' : ''}>{p.stock}</span></td><td className="px-4 py-3 text-sm"><button onClick={() => ajustarInventario(p.id)} className="text-indigo-600 hover:underline text-sm">Ajustar</button></td></tr>))}
                </tbody></table>
            </div>
        </div>
    );
}

function UsuariosPanel({ usuarios }) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Gestion de Usuarios</h2>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full"><thead className="bg-gray-100"><tr><th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th><th className="px-4 py-3 text-left text-sm font-semibold">Email</th><th className="px-4 py-3 text-left text-sm font-semibold">Rol</th><th className="px-4 py-3 text-left text-sm font-semibold">Telefono</th><th className="px-4 py-3 text-left text-sm font-semibold">Estado</th></tr></thead><tbody>
                    {usuarios.map(u => (<tr key={u.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3 text-sm">{u.nombre}</td><td className="px-4 py-3 text-sm">{u.email}</td><td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded text-xs font-semibold ${u.rol === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{u.rol}</span></td><td className="px-4 py-3 text-sm">{u.telefono || '-'}</td><td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded text-xs font-semibold ${u.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td></tr>))}
                </tbody></table>
            </div>
        </div>
    );
}

function ReportesPanel({ dashboard }) {
    if (!dashboard) return <div className="text-center py-12">Cargando...</div>;
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Reportes y Estadisticas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 rounded-lg p-6"><h3 className="text-gray-600 text-sm">Total Productos</h3><p className="text-3xl font-bold text-indigo-600">{dashboard.productos}</p></div>
                <div className="bg-blue-50 rounded-lg p-6"><h3 className="text-gray-600 text-sm">Total Pedidos</h3><p className="text-3xl font-bold text-blue-600">{dashboard.pedidos}</p></div>
                <div className="bg-green-50 rounded-lg p-6"><h3 className="text-gray-600 text-sm">Pedidos Pagados</h3><p className="text-3xl font-bold text-green-600">{dashboard.pedidos_pagados}</p></div>
                <div className="bg-purple-50 rounded-lg p-6"><h3 className="text-gray-600 text-sm">Ingresos Totales</h3><p className="text-3xl font-bold text-purple-600">${dashboard.ingresos_totales.toLocaleString()}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6"><h3 className="font-bold text-gray-800 mb-2">Clientes Activos</h3><p className="text-2xl font-bold text-blue-600">{dashboard.clientes}</p></div>
                <div className="bg-white rounded-lg shadow-md p-6"><h3 className="font-bold text-gray-800 mb-2">Pedidos Pendientes</h3><p className="text-2xl font-bold text-yellow-600">{dashboard.pedidos_pendientes}</p></div>
                <div className="bg-white rounded-lg shadow-md p-6"><h3 className="font-bold text-gray-800 mb-2">Ventas Hoy</h3><p className="text-2xl font-bold text-green-600">${dashboard.ventas_hoy.toLocaleString()}</p></div>
            </div>
        </div>
    );
}