import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [loading, setLoading] = useState(false);
    const [vista, setVista] = useState('login');
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await apiClient.post('/auth/login', { email, password });
            login(data.token, data.usuario);
        } catch (err) { setError(err.message || 'Error al iniciar sesion'); }
        finally { setLoading(false); }
    };

    const handleRegistro = async (e) => {
        e.preventDefault();
        setError('');
        setExito('');
        setLoading(true);
        try {
            await apiClient.post('/auth/registro', { nombre, email, password, telefono });
            setExito('Registro exitoso. Ya puedes iniciar sesion.');
            setVista('login');
            setNombre('');
            setTelefono('');
        } catch (err) { setError(err.message || 'Error al registrarse'); }
        finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">E-Commerce</h1>
                <p className="text-gray-600 text-center mb-6">Tienda Online</p>

                <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => { setVista('login'); setError(''); setExito(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${vista === 'login' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:text-gray-800'}`}>Iniciar Sesion</button>
                    <button onClick={() => { setVista('registro'); setError(''); setExito(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${vista === 'registro' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600 hover:text-gray-800'}`}>Registrarse</button>
                </div>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
                {exito && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">{exito}</div>}

                {vista === 'login' && (
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="usuario@tienda.com" required />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="password123" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium">{loading ? 'Iniciando...' : 'Iniciar Sesion'}</button>
                    </form>
                )}

                {vista === 'registro' && (
                    <form onSubmit={handleRegistro}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Nombre completo</label>
                            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Tu nombre" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="tu@email.com" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Telefono</label>
                            <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="3001234567" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Minimo 6 caracteres" required minLength={6} />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium">{loading ? 'Registrando...' : 'Crear Cuenta'}</button>
                    </form>
                )}


            </div>
        </div>
    );
}
