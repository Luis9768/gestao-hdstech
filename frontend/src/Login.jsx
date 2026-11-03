import { useState, useEffect } from 'react';
import api, { sanitizeInput } from './api';
import './Login.css';

export default function Login({ onLogin, theme = 'dark', onToggleTheme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [localTheme, setLocalTheme] = useState(() => {
    return theme || (typeof window !== 'undefined' ? localStorage.getItem('gestao-cpus-theme') : 'dark') || 'dark';
  });

  const activeTheme = onToggleTheme ? theme : localTheme;

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = activeTheme === 'light' ? 'dark' : 'light';
      setLocalTheme(next);
      try {
        localStorage.setItem('gestao-cpus-theme', next);
      } catch (e) {}
      document.documentElement.setAttribute('data-theme', next);
    }
  };

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
      {/* Botão de Alternar Modo Claro / Escuro no Login */}
      <div className="login-theme-toggle-wrapper">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={handleToggleTheme}
          title={activeTheme === 'light' ? "Alternar para Modo Escuro" : "Alternar para Modo Claro"}
          aria-label="Alternar tema claro ou escuro"
        >
          {activeTheme === 'light' ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span className="theme-toggle-label">Modo Escuro</span>
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span className="theme-toggle-label">Modo Claro</span>
            </>
          )}
        </button>
      </div>

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
