import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast debe usarse dentro de ToastProvider');
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((mensaje, tipo = 'success') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-2), { id, mensaje, tipo }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 2000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = (msg) => addToast(msg, 'success');
    const error = (msg) => addToast(msg, 'error');
    const warning = (msg) => addToast(msg, 'warning');
    const info = (msg) => addToast(msg, 'info');

    return (
        <ToastContext.Provider value={{ success, error, warning, info }}>
            {children}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 animate-slide-in ${
                            toast.tipo === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
                            toast.tipo === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                            toast.tipo === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                            'bg-blue-50 border-blue-500 text-blue-800'
                        }`}
                    >
                        <span className="text-lg flex-shrink-0">
                            {toast.tipo === 'success' ? '✓' :
                             toast.tipo === 'error' ? '✕' :
                             toast.tipo === 'warning' ? '⚠' : ''}
                        </span>
                        <p className="text-sm font-medium flex-1">{toast.mensaje}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
