import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';

export default function ChatbotWidget() {
    const [abierto, setAbierto] = useState(false);
    const [mensajes, setMensajes] = useState([
        {
            remitente: 'bot',
            texto: '¡Hola! 👋 Soy tu asistente virtual de la tienda.\n¿En qué puedo ayudarte hoy? Puedes preguntarme sobre productos, precios, inventario, pedidos o formas de pago.',
            hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sugerencias: ['¿Qué productos tienen?', '¿Cuáles son los medios de pago?', '¿Tienen cupones?', 'Rastrear mi pedido']
        }
    ]);
    const [entrada, setEntrada] = useState('');
    const [cargando, setCargando] = useState(false);
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll al final del chat al recibir mensajes
    useEffect(() => {
        if (abierto) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [mensajes, abierto, cargando]);

    // Enfocar input al abrir
    useEffect(() => {
        if (abierto) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [abierto]);

    const enviarMensaje = async (textoAEnviar) => {
        const mensajeFinal = (textoAEnviar || entrada).trim();
        if (!mensajeFinal || cargando) return;

        const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Agregar mensaje del usuario
        const nuevoMensajeUsuario = {
            remitente: 'usuario',
            texto: mensajeFinal,
            hora: horaActual
        };

        setMensajes(prev => [...prev, nuevoMensajeUsuario]);
        setEntrada('');
        setCargando(true);

        try {
            const data = await apiClient.post('/chatbot/mensaje', { mensaje: mensajeFinal });
            const respuestaBot = {
                remitente: 'bot',
                texto: data?.respuesta || 'Disculpa, no pude procesar la respuesta.',
                hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sugerencias: data?.sugerencias || ['Ver catálogo', 'Formas de pago', 'Hablar con un asesor']
            };
            setMensajes(prev => [...prev, respuestaBot]);
        } catch (error) {
            setMensajes(prev => [
                ...prev,
                {
                    remitente: 'bot',
                    texto: '⚠️ Ocurrió un error al contactar el servicio del chatbot. Por favor intenta de nuevo en unos segundos.',
                    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    sugerencias: ['Reintentar', 'Hablar con un asesor']
                }
            ]);
        } finally {
            setCargando(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensaje();
        }
    };

    const limpiarChat = () => {
        setMensajes([
            {
                remitente: 'bot',
                texto: 'Chat reiniciado. ¿En qué más puedo colaborarte?',
                hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sugerencias: ['Ver productos', 'Cupones disponibles', 'Medios de pago', 'Rastrear pedido']
            }
        ]);
    };

    // Formateador simple de texto con negritas y saltos de línea
    const formatearTexto = (texto) => {
        if (!texto) return '';
        const lineas = texto.split('\n');
        return lineas.map((linea, index) => {
            // Reemplazo básico de **texto**
            const partes = linea.split(/(\*\*.*?\*\*)/g);
            return (
                <div key={index} className="min-h-[1.2rem]">
                    {partes.map((parte, pIndex) => {
                        if (parte.startsWith('**') && parte.endsWith('**')) {
                            return <strong key={pIndex} className="font-semibold">{parte.slice(2, -2)}</strong>;
                        }
                        return parte;
                    })}
                </div>
            );
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* Ventana de Chat */}
            {abierto && (
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-88 sm:w-96 flex flex-col h-[520px] max-h-[80vh] overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right mb-3">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 text-white flex items-center justify-between shadow-md">
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold backdrop-blur-sm">
                                    🤖
                                </div>
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-indigo-700 rounded-full"></span>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm tracking-wide">Asistente Virtual ED</h3>
                                <p className="text-xs text-indigo-200">En línea • Soporte 24/7</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={limpiarChat}
                                title="Limpiar historial"
                                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors text-xs"
                            >
                                🗑️
                            </button>
                            <button
                                onClick={() => setAbierto(false)}
                                title="Minimizar"
                                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/60 text-sm">
                        {mensajes.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.remitente === 'usuario' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm leading-relaxed ${
                                        msg.remitente === 'usuario'
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                    }`}
                                >
                                    {formatearTexto(msg.texto)}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 px-1">
                                    {msg.hora}
                                </span>

                                {/* Chips de Sugerencias */}
                                {msg.remitente === 'bot' && msg.sugerencias && idx === mensajes.length - 1 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                                        {msg.sugerencias.map((sug, sIdx) => (
                                            <button
                                                key={sIdx}
                                                onClick={() => enviarMensaje(sug)}
                                                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-full px-2.5 py-1 transition-all duration-150 text-left cursor-pointer active:scale-95"
                                            >
                                                {sug}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Indicador de escritura */}
                        {cargando && (
                            <div className="flex items-center space-x-2 text-gray-400 text-xs py-1">
                                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm shadow-sm">
                                    🤖
                                </div>
                                <div className="bg-white border border-gray-100 px-3 py-2 rounded-2xl rounded-bl-none shadow-sm flex space-x-1 items-center">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input y Enviar */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                enviarMensaje();
                            }}
                            className="flex items-center space-x-2"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={entrada}
                                onChange={(e) => setEntrada(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe tu consulta aquí..."
                                className="flex-1 border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2 text-sm outline-none transition-all placeholder:text-gray-400"
                                disabled={cargando}
                            />
                            <button
                                type="submit"
                                disabled={!entrada.trim() || cargando}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl p-2.5 transition-colors shadow-sm flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                title="Enviar mensaje"
                            >
                                <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>
                        <div className="text-[10px] text-gray-400 text-center mt-1.5">
                            Chatbot inteligente integrado con el catálogo de la tienda
                        </div>
                    </div>
                </div>
            )}

            {/* Botón flotante para abrir el chat */}
            <button
                onClick={() => setAbierto(!abierto)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center transform hover:scale-105 active:scale-95 group relative cursor-pointer"
                aria-label="Abrir asistente virtual"
                title="Chatbot de Atención al Cliente"
            >
                {abierto ? (
                    <svg className="w-6 h-6 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <>
                        <div className="relative">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 border-2 border-indigo-600"></span>
                            </span>
                        </div>
                        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out font-medium text-sm pl-0 group-hover:pl-2">
                            Asistente Virtual
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}
