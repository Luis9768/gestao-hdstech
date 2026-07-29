import { useState, useEffect } from 'react';
import api, { sanitizeInput } from './api';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Removido o carregamento de usuários aqui por segurança!
  useEffect(() => {
    // Agora fazemos login via API, não precisamos puxar todos os usuários.
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = sanitizeInput(email);
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Por favor, preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      // Chama a nova rota de login segura
      const response = await api.post('/login', {
        email: cleanEmail,
        password: cleanPassword
      });
      
      if (response.data && response.data.user) {
        if (response.data.token) {
          localStorage.setItem('gestao-cpus-token', response.data.token);
        }
        onLogin(response.data.user, response.data.token);
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Erro de conexão com o servidor.');
      }
    } finally {
      setLoading(false);
    }
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
