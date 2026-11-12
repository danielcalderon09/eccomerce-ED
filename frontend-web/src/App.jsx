import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ChatbotWidget from './components/ChatbotWidget';

function PrivateRoute({ children }) {
    const { usuario } = useAuth();
    return usuario ? children : <Navigate to="/login" />;
}

function AppRoutes() {
    const { usuario } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={usuario ? <Navigate to="/" /> : <Login />} />
            <Route
                path="/"
                element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <AppRoutes />
                    <ChatbotWidget />
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
