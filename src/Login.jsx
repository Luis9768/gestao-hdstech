import { useState, useEffect } from 'react';
import api, { sanitizeInput } from './api';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await api.get('/all');
        if (response.data && response.data.users && response.data.users.length > 0) {
          setUsers(response.data.users);
        } else {
          // Fallback default admin if first time
          setUsers([
            {
              id: 1,
              name: 'Luis Miguel',
              email: 'luis.miguel@headsetbrasil.com',
              password: 'Headset@2021#$!',
              role: 'admin'
            }
          ]);
        }
      } catch (err) {
        console.error("Erro ao carregar usuarios", err);
        // Fallback default admin if first time
        setUsers([
          {
            id: 1,
            name: 'Luis Miguel',
            email: 'luis.miguel@headsetbrasil.com',
            password: 'Headset@2021#$!',
            role: 'admin'
          }
        ]);
      }
      setLoading(false);
    };
    loadUsers();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = sanitizeInput(email);
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Por favor, preencha e-mail e senha.');
      return;
    }

    const foundUser = users.find(
      u => u.email.toLowerCase() === cleanEmail.toLowerCase() && u.password === cleanPassword
    );

    if (!foundUser) {
      setError('E-mail ou senha incorretos.');
      return;
    }

    onLogin(foundUser);
  };

  return (
    <div className="login-container flex flex-col items-center justify-center">
      <div className="glass-card login-card">
        <h2 className="login-title">Gestão de CPUs</h2>
        <p className="login-subtitle">Bem-vindo(a) de volta</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="input-group">
            <label>E-mail Corporativo</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@headsetbrasil.com" 
              className="premium-input"
              required
              disabled={loading}
            />
          </div>
          
          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="premium-input"
              required
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="primary btn-glow mt-2 w-full" disabled={loading}>
            {loading ? 'Carregando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
      
      {/* Background decoration */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
    </div>
  );
}
