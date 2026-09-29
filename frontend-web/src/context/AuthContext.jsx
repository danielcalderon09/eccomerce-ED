import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUsuario = localStorage.getItem('usuario');

        if (storedToken && storedUsuario) {
            setToken(storedToken);
            setUsuario(JSON.parse(storedUsuario));
        }
    }, []);

    const login = (tokenData, usuarioData) => {
        localStorage.setItem('token', tokenData);
        localStorage.setItem('usuario', JSON.stringify(usuarioData));
        setToken(tokenData);
        setUsuario(usuarioData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setToken(null);
        setUsuario(null);
    };

    return (
        <AuthContext.Provider value={{ usuario, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};
