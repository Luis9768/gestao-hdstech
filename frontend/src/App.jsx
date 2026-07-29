import { useState, useEffect } from 'react'
import Login from './Login'
import RoomsManager from './RoomsManager'
import CpuInventory from './CpuInventory'
import History from './History'
import Settings from './Settings'
import UsersManager from './UsersManager'
import HeadsetsManager from './HeadsetsManager'
import api from './api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts'
import './index.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('gestao-cpus-user');
  })
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gestao-cpus-user');
    return saved ? JSON.parse(saved) : null;
  })
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('gestao-cpus-theme') || 'dark';
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Data state
  const [cpus, setCpus] = useState([])
  const [rooms, setRooms] = useState([])
  const [history, setHistory] = useState([])
  const [usersList, setUsersList] = useState([])
  const [headsetStock, setHeadsetStock] = useState([])
  const [headsetDefects, setHeadsetDefects] = useState([])
  const [headsetHistory, setHeadsetHistory] = useState([])
  
  const [activeTab, setActiveTab] = useState('dashboard')

  const applyDataState = (data) => {
    if (!data) return;
    let loadedRooms = data.rooms || [];
    
    loadedRooms.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA === 'tim') return -1;
      if (nameB === 'tim') return 1;
      if (nameA === 'affix') return -1;
      if (nameB === 'affix') return 1;
      return 0;
    });

    setCpus(data.cpus || []);
    setRooms(loadedRooms);
    setHistory(data.history || []);
    setUsersList(data.users || []);
    setHeadsetStock(data.headsetStock || []);
    setHeadsetDefects(data.headsetDefects || []);
    setHeadsetHistory(data.headsetHistory || []);
    if (data.settings?.theme) {
      setTheme(data.settings.theme);
      document.documentElement.setAttribute('data-theme', data.settings.theme);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const initData = async () => {
      setLoading(true);
      try {
        const response = await api.get('/all');
        if (response.data) {
          applyDataState(response.data);
        }
      } catch (err) {
        console.error("Erro ao buscar dados da API", err);
      }
      setLoading(false);
    };

    initData();
  }, [isAuthenticated]);

  const updateData = async (newData) => {
    const payload = {
      cpus,
      rooms,
      history,
      users: usersList,
      headsetStock,
      headsetDefects,
      headsetHistory,
      settings: { theme },
      ...newData
    };

    // Salvar na nuvem (PostgreSQL via API)
    try {
      await api.post('/sync', payload);
    } catch (err) {
      console.error("Erro ao sincronizar com o banco de dados", err);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('gestao-cpus-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    updateData({ settings: { theme: newTheme } });
  };

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
    setIsAuthenticated(true);
    localStorage.setItem('gestao-cpus-user', JSON.stringify(loggedUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('gestao-cpus-user');
    localStorage.removeItem('gestao-cpus-token');
  };

  if (loading) {
    return (
      <div className="login-container flex items-center justify-center text-center">
        <div className="glass-card">
          <h3 className="login-title">Gestão de CPUs</h3>
          <p className="text-muted mt-2">Conectando ao banco de dados na nuvem...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Gestão de CPUs</h2>
        <div className="user-info text-sm text-muted mb-4">
          Logado como:<br/><strong>{user?.name || user?.email}</strong><br/>
          <span style={{fontSize: '0.75rem', color: 'var(--primary-color)'}}>{user?.role === 'admin' ? 'Administrador' : 'Usuário Comum'}</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => setActiveTab('rooms')}>
            Gestão de Salas
          </div>
          <div className={`nav-item ${activeTab === 'headsets' ? 'active' : ''}`} onClick={() => setActiveTab('headsets')}>
            Gestão de Headsets
          </div>
          <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            Histórico
          </div>
          {user?.role === 'admin' && (
            <>
              <div className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
                Estoque de CPUs
              </div>
              <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                Gestão de Usuários
              </div>
              <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                Configurações
              </div>
            </>
          )}
        </nav>

        <button className="theme-toggle mt-auto" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Modo Escuro' : '☀️ Modo Claro'}
        </button>
        <button onClick={handleLogout} className="mt-2" style={{background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)'}}>
          Sair
        </button>
      </aside>
      
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-container">
            <h2>Dashboard Executivo</h2>
            
            <h3 className="mt-4 mb-2 text-muted">Métricas de CPUs</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
              <div className="card">
                <h3>Total de Salas</h3>
                <p style={{fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)'}}>{rooms.length}</p>
              </div>
              <div className="card">
                <h3>CPUs no Estoque</h3>
                <p style={{fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)'}}>{cpus.filter(c => c.location === 'estoque').length}</p>
              </div>
              <div className="card">
                <h3>Total de CPUs</h3>
                <p style={{fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)'}}>{cpus.length}</p>
              </div>
            </div>

            <h3 className="mb-2 text-muted">Métricas de Headsets</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
              <div className="card" style={{borderLeft: '4px solid #22c55e'}}>
                <h3>Estoque Funcional</h3>
                <p style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#22c55e'}}>
                  {headsetStock.reduce((acc, curr) => acc + curr.quantity, 0)}
                </p>
              </div>
              <div className="card" style={{borderLeft: '4px solid #f59e0b'}}>
                <h3>Aguardando Envio</h3>
                <p style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b'}}>
                  {headsetDefects.filter(d => d.status === 'Aguardando').length}
                </p>
              </div>
              <div className="card" style={{borderLeft: '4px solid #3b82f6'}}>
                <h3>Em Conserto (Enviadas)</h3>
                <p style={{fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6'}}>
                  {headsetDefects.filter(d => d.status === 'Enviada').length}
                </p>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem'}}>
              <div className="card" style={{height: '380px', display: 'flex', flexDirection: 'column'}}>
                <h3 className="mb-2 text-center">Distribuição de CPUs</h3>
                <div style={{flex: 1, minHeight: 0}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={[
                          { name: 'No Estoque', value: cpus.filter(c => c.location === 'estoque').length },
                          { name: 'Em Uso (Salas)', value: cpus.filter(c => c.location !== 'estoque').length }
                        ]}
                        cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                        <Cell fill="#14b8a6" />
                        <Cell fill="#ec4899" />
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)', borderRadius: '8px'}} itemStyle={{color: 'var(--text-color)'}} />
                      <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card" style={{height: '380px', display: 'flex', flexDirection: 'column'}}>
                <h3 className="mb-2 text-center">Headsets Danificados</h3>
                <div style={{flex: 1, minHeight: 0}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={[
                          { name: 'Aguardando', value: headsetDefects.filter(d => d.status === 'Aguardando').length },
                          { name: 'Em Conserto', value: headsetDefects.filter(d => d.status === 'Enviada').length },
                          { name: 'Resolvidos', value: headsetDefects.filter(d => d.status === 'Resolvido').length }
                        ]}
                        cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                      >
                        <Cell fill="#f59e0b" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#22c55e" />
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', color: 'var(--text-color)', borderRadius: '8px'}} itemStyle={{color: 'var(--text-color)'}} />
                      <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'rooms' && (
          <RoomsManager 
            cpus={cpus} setCpus={setCpus} 
            rooms={rooms} setRooms={setRooms} 
            history={history} setHistory={setHistory} 
            updateData={updateData} 
          />
        )}
        {activeTab === 'inventory' && (
          <CpuInventory 
            cpus={cpus} setCpus={setCpus} 
            rooms={rooms}
            updateData={updateData} 
          />
        )}
        {activeTab === 'history' && <History history={history} setHistory={setHistory} updateData={updateData} />}
        {activeTab === 'headsets' && (
          <HeadsetsManager 
            stock={headsetStock} 
            setStock={setHeadsetStock} 
            defects={headsetDefects} 
            setDefects={setHeadsetDefects}
            history={headsetHistory}
            setHistory={setHeadsetHistory}
            updateData={updateData}
          />
        )}
        {activeTab === 'users' && user?.role === 'admin' && (
          <UsersManager usersList={usersList} setUsersList={setUsersList} updateData={updateData} currentUser={user} />
        )}
        {activeTab === 'settings' && user?.role === 'admin' && (
          <Settings 
            cpus={cpus} 
            rooms={rooms} 
            history={history} 
            usersList={usersList}
            headsetStock={headsetStock}
            headsetDefects={headsetDefects}
            headsetHistory={headsetHistory}
            updateData={updateData} 
          />
        )}
      </main>
    </div>
  )
}

export default App
