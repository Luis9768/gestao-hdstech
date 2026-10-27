import hdstecLogo from './assets/hdstec-logo.png';
import { useState, useEffect, useMemo, useRef } from 'react'
import Login from './Login'
import RoomsManager from './RoomsManager'
import CpuInventory from './CpuInventory'
import History from './History'
import Settings from './Settings'
import UsersManager from './UsersManager'
import HeadsetsManager from './HeadsetsManager'
import api from './api'
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'
import './index.css'

// Minimalist vector icons for App navigation and KPI badges (No emojis, Vercel/Linear style)
const NavIcons = {
  LineChart: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  BarChart: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  ),

  Dashboard: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  Rooms: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </svg>
  ),
  Inventory: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  ),
  Headsets: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  History: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Users: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Settings: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Monitor: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  ),
  Alert: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
  ChevronDown: ({ size = 13, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Check: ({ size = 13, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Menu: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  ),
  Close: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
};

// Seletor Dropdown Elegante estilo Shadcn UI / Radix
function ChartFilterDropdown({ category, subTab, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentValue = `${category}:${subTab}`;

  const groups = [
    {
      label: 'Máquinas / Operação',
      items: [
        { id: 'machines:rooms', label: 'Salas & PAs', prefix: 'Máquinas', icon: NavIcons.Monitor },
        { id: 'machines:distribution', label: 'Distribuição (Estoque vs Salas)', prefix: 'Máquinas', icon: NavIcons.Monitor },
        { id: 'machines:timeline', label: 'Histórico de Movimentações', prefix: 'Máquinas', icon: NavIcons.Monitor }
      ]
    },
    {
      label: 'Headsets / Áudio',
      items: [
        { id: 'headsets:defects', label: 'Defeitos por Marca', prefix: 'Headsets', icon: NavIcons.Headsets },
        { id: 'headsets:stock', label: 'Estoque Disponível', prefix: 'Headsets', icon: NavIcons.Headsets }
      ]
    }
  ];

  let activeItem = null;
  for (const g of groups) {
    const found = g.items.find(i => i.id === currentValue);
    if (found) {
      activeItem = found;
      break;
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const ActiveIcon = activeItem?.icon || NavIcons.Monitor;

  return (
    <div className="shadcn-custom-select-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`shadcn-custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="select-trigger-icon">
          <ActiveIcon size={14} />
        </span>
        <span className="select-trigger-label">
          <span className="select-prefix">{activeItem?.prefix || 'Métricas'}</span>
          <span className="select-dot">·</span>
          <span className="select-main">{activeItem?.label || 'Selecione'}</span>
        </span>
        <NavIcons.ChevronDown size={13} className={`select-trigger-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="shadcn-custom-select-menu" role="listbox">
          {groups.map((group, gIdx) => (
            <div key={group.label} className="select-group">
              {gIdx > 0 && <div className="select-group-divider" />}
              <div className="select-group-header">{group.label}</div>
              {group.items.map(item => {
                const isSelected = item.id === currentValue;
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`select-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      const [cat, sub] = item.id.split(':');
                      onSelect(cat, sub);
                      setIsOpen(false);
                    }}
                  >
                    <div className="select-option-left">
                      <ItemIcon size={14} className="select-option-icon" />
                      <span className="select-option-text">{item.label}</span>
                    </div>
                    {isSelected && (
                      <NavIcons.Check size={13} className="select-check-icon" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Tooltip moderno estilo shadcn com glassmorphism e badges com indicador brilhante
function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="shadcn-chart-tooltip">
      <div className="shadcn-tooltip-title">{label}</div>
      <div className="shadcn-tooltip-rows">
        {payload.map((entry, idx) => (
          <div key={`tip-${idx}`} className="shadcn-tooltip-row">
            <div className="shadcn-tooltip-label-group">
              <span 
                className="shadcn-tooltip-dot" 
                style={{ backgroundColor: entry.color || entry.stroke, color: entry.color || entry.stroke }} 
              />
              <span>{entry.name}:</span>
            </div>
            <span className="shadcn-tooltip-val">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('gestao-cpus-user');
  })
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gestao-cpus-user');
    return saved ? JSON.parse(saved) : null;
  })
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  
  // Data state
  const [cpus, setCpus] = useState([])
  const [rooms, setRooms] = useState([])
  const [history, setHistory] = useState([])
  const [usersList, setUsersList] = useState([])
  const [headsetStock, setHeadsetStock] = useState([])
  const [headsetDefects, setHeadsetDefects] = useState([])
  const [headsetHistory, setHeadsetHistory] = useState([])
  
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('gestao-cpus-active-tab');
      const validTabs = ['dashboard', 'rooms', 'inventory', 'history', 'headsets', 'users', 'settings'];
      if (savedTab && validTabs.includes(savedTab)) {
        return savedTab;
      }
    } catch (e) {
      console.warn('Falha ao restaurar aba persistida:', e);
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      if (activeTab) {
        localStorage.setItem('gestao-cpus-active-tab', activeTab);
      }
    } catch (e) {
      console.warn('Falha ao persistir aba ativa:', e);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user && user.role !== 'admin' && (activeTab === 'users' || activeTab === 'settings')) {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);
  const [chartCategory, setChartCategory] = useState('machines') // 'machines' | 'headsets'
  const [chartSubTab, setChartSubTab] = useState('rooms') // if machines: 'rooms' | 'distribution' | 'timeline'. if headsets: 'defects' | 'stock'
  const [chartType, setChartType] = useState('area') // 'area' | 'bar'

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
  };

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await api.get('/all');
      if (response.data) {
        applyDataState(response.data);
      }
    } catch (err) {
      console.error("Erro ao buscar dados da API", err);
      setFetchError(err.response?.data?.error || err.message || "Erro de conexão com o servidor PostgreSQL.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadData();
  }, [isAuthenticated]);

  const updateData = async (newData) => {
    if (!newData) return;
    
    if (newData.cpus) setCpus(newData.cpus);
    if (newData.rooms) setRooms(newData.rooms);
    if (newData.history) setHistory(newData.history);
    if (newData.users) setUsersList(newData.users);
    if (newData.headsetStock) setHeadsetStock(newData.headsetStock);
    if (newData.headsetDefects) setHeadsetDefects(newData.headsetDefects);
    if (newData.headsetHistory) setHeadsetHistory(newData.headsetHistory);

    const payload = {
      cpus: newData.cpus || cpus,
      rooms: newData.rooms || rooms,
      history: newData.history || history,
      users: newData.users || usersList,
      headsetStock: newData.headsetStock || headsetStock,
      headsetDefects: newData.headsetDefects || headsetDefects,
      headsetHistory: newData.headsetHistory || headsetHistory
    };

    setSaveStatus('saving');

    const sendWithRetry = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          await api.post('/sync', payload);
          setSaveStatus('saved');
          setTimeout(() => {
            setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
          }, 3000);
          return true;
        } catch (err) {
          console.warn(`Tentativa ${attempt} de salvamento falhou:`, err.message);
          if (attempt === retries) {
            setSaveStatus('error');
            return false;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
      return false;
    };

    await sendWithRetry();
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
    localStorage.removeItem('gestao-cpus-active-tab');
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // Métricas calculadas para os KPI Cards shadcn
  const totalCpus = cpus.length;
  const inStockCpus = cpus.filter(c => c.location === 'estoque').length;
  const inUseCpus = totalCpus - inStockCpus;
  
  const totalCapacity = rooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);
  const occupancyRate = totalCapacity > 0 ? ((inUseCpus / totalCapacity) * 100).toFixed(1) : 0;
  const freePas = Math.max(0, totalCapacity - inUseCpus);

  const awaitingDefects = headsetDefects.filter(d => d.status === 'Aguardando').length;
  const sentDefects = headsetDefects.filter(d => d.status === 'Enviada').length;

  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  // 1.1 Estoque de Headsets por Marca
  const headsetStockData = useMemo(() => {
    if (!headsetStock || !headsetStock.length) {
      return [
        { brand: 'Intelbras', quantidade: 0 },
        { brand: 'Top Use', quantidade: 0 },
        { brand: 'Unixtron', quantidade: 0 }
      ];
    }
    return headsetStock.map(s => ({
      brand: s.brand ? s.brand.charAt(0).toUpperCase() + s.brand.slice(1) : 'Outros',
      quantidade: Number(s.quantity) || 0
    }));
  }, [headsetStock]);

  // 1. Agrupamento de Headsets por Marca com status para o gráfico de linhas animadas
  const headsetBrandData = useMemo(() => {
    const counts = {};
    headsetDefects.forEach(d => {
      const raw = (d.brand || 'Outros').trim();
      const key = raw.toLowerCase();
      if (!counts[key]) {
        counts[key] = {
          brand: raw.charAt(0).toUpperCase() + raw.slice(1),
          aguardando: 0,
          resolvidos: 0,
          total: 0
        };
      }
      if (d.status === 'Resolvido') {
        counts[key].resolvidos += 1;
      } else {
        counts[key].aguardando += 1;
      }
      counts[key].total += 1;
    });

    const list = Object.values(counts);
    if (!list.length) {
      return [
        { brand: 'Intelbras', aguardando: 0, resolvidos: 0, total: 0 },
        { brand: 'Top Use', aguardando: 0, resolvidos: 0, total: 0 },
        { brand: 'Unixtron', aguardando: 0, resolvidos: 0, total: 0 }
      ];
    }
    return list.sort((a, b) => b.total - a.total);
  }, [headsetDefects]);

  // 2. Tendência Temporal de Atividades (Histórico de Movimentações diárias)
  const timelineTrendData = useMemo(() => {
    const dateMap = {};
    history.forEach(h => {
      if (!h.date) return;
      const d = new Date(h.date);
      if (isNaN(d.getTime())) return;
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!dateMap[key]) {
        dateMap[key] = { date: key, timestamp: d.getTime(), movimentacoes: 0 };
      }
      dateMap[key].movimentacoes += 1;
    });

    const sorted = Object.values(dateMap).sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length < 2) {
      return [
        { date: '18/10', movimentacoes: 4 },
        { date: '20/10', movimentacoes: 8 },
        { date: '22/10', movimentacoes: 6 },
        { date: '24/10', movimentacoes: 12 },
        { date: '26/10', movimentacoes: 10 }
      ];
    }
    return sorted.slice(-7);
  }, [history]);

  // 3. Ocupação e Capacidade por Sala
  const roomsChartData = useMemo(() => {
    return rooms.map(r => {
      const occupied = (r.paStatus || []).filter(p => p && p.cpuId).length;
      const total = Number(r.capacity) || 0;
      return {
        name: r.name,
        capacidade: total,
        ocupadas: occupied,
        livres: Math.max(0, total - occupied)
      };
    });
  }, [rooms]);

  if (loading) {
    return (
      <div className="login-container flex items-center justify-center text-center">
        <div className="glass-card" style={{ padding: '2.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary-color)', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Gestão de CPUs & Headsets</h3>
          <p className="text-muted mt-2">Conectando ao banco de dados PostgreSQL...</p>
        </div>
      </div>
    );
  }

  if (fetchError && !cpus.length && !rooms.length) {
    return (
      <div className="login-container flex items-center justify-center text-center">
        <div className="glass-card" style={{ maxWidth: '460px', padding: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: 800 }}>Falha de Conexão com o Servidor</h3>
          <p className="text-muted mt-2 mb-4" style={{ fontSize: '0.9rem' }}>
            Não foi possível carregar as informações do banco PostgreSQL.<br/>
            <small style={{ color: 'var(--text-faint)' }}>{fetchError}</small>
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="primary"
            style={{ width: '100%', padding: '12px' }}
          >
            🔄 Tentar Reconectar
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const getBreadcrumbTitle = () => {
    switch(activeTab) {
      case 'dashboard': return 'Dashboard Executivo';
      case 'rooms': return 'Gestão de Salas & PAs';
      case 'inventory': return 'Estoque de Máquinas';
      case 'headsets': return 'Gestão de Headsets';
      case 'history': return 'Histórico de Movimentações';
      case 'users': return 'Gestão de Usuários';
      case 'settings': return 'Configurações do Sistema';
      default: return 'Visão Geral';
    }
  };

  return (
    <div className="app-container">
      {/* Backdrop Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)} 
          aria-hidden="true"
        />
      )}

      {/* Sidebar estilo shadcn / print anexado */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-box">
          <div className="sidebar-brand-logo-container">
            <img src={hdstecLogo} alt="HDSTEC" className="sidebar-brand-logo-img" />
            <span className="sidebar-brand-subtitle">Gestão TI</span>
          </div>
          <button 
            type="button" 
            className="sidebar-mobile-close" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <NavIcons.Close size={18} />
          </button>
        </div>

        {/* Indicador de Salvamento Ativo */}
        {saveStatus !== 'idle' && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: '700',
            marginTop: '0.75rem',
            marginBottom: '1rem',
            background: saveStatus === 'saving' ? 'var(--accent-amber-bg)' : saveStatus === 'saved' ? 'var(--accent-green-bg)' : 'rgba(239, 68, 68, 0.15)',
            color: saveStatus === 'saving' ? 'var(--accent-amber)' : saveStatus === 'saved' ? 'var(--accent-green)' : '#ef4444',
            border: `1px solid ${saveStatus === 'saving' ? 'var(--accent-amber-border)' : saveStatus === 'saved' ? 'var(--accent-green-border)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
            {saveStatus === 'saving' && 'Salvando no banco...'}
            {saveStatus === 'saved' && 'Salvo no PostgreSQL'}
            {saveStatus === 'error' && 'Erro de conexão'}
          </div>
        )}

        {/* Grupo 1: Visão Geral */}
        <div className="nav-group">
          <div className="nav-group-title">Visão Geral</div>
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavClick('dashboard')}>
            <span className="nav-icon"><NavIcons.Dashboard /></span>
            <span>Dashboard</span>
          </div>
        </div>

        

        {/* Grupo 2: Operação & PAs */}
        <div className="nav-group">
          <div className="nav-group-title">Operação & PAs</div>
          <div className={`nav-item ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => handleNavClick('rooms')}>
            <span className="nav-icon"><NavIcons.Rooms /></span>
            <span>Gestão de Salas</span>
          </div>
          <div className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => handleNavClick('inventory')}>
            <span className="nav-icon"><NavIcons.Inventory /></span>
            <span>Estoque de CPUs</span>
          </div>
        </div>

        {/* Grupo 3: Suporte & Estoque */}
        <div className="nav-group">
          <div className="nav-group-title">Equipamentos</div>
          <div className={`nav-item ${activeTab === 'headsets' ? 'active' : ''}`} onClick={() => handleNavClick('headsets')}>
            <span className="nav-icon"><NavIcons.Headsets /></span>
            <span>Gestão de Headsets</span>
          </div>
          <div className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => handleNavClick('history')}>
            <span className="nav-icon"><NavIcons.History /></span>
            <span>Histórico de Logs</span>
          </div>
        </div>

        {/* Grupo 4: Administração */}
        {user?.role === 'admin' && (
          <div className="nav-group">
            <div className="nav-group-title">Administração</div>
            <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleNavClick('users')}>
              <span className="nav-icon"><NavIcons.Users /></span>
              <span>Equipe & Usuários</span>
            </div>
            <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleNavClick('settings')}>
              <span className="nav-icon"><NavIcons.Settings /></span>
              <span>Configurações</span>
            </div>
          </div>
        )}

        {/* User Card no Rodapé da Sidebar */}
        <div className="sidebar-user-footer">
          <div className="user-profile-summary">
            <div className="user-avatar-circle">{userInitials}</div>
            <div className="user-details">
              <h5>{user?.name || user?.email}</h5>
              <span>{user?.role === 'admin' ? 'Administrador' : 'Operador'}</span>
            </div>
          </div>
          <button className="logout-icon-btn" onClick={handleLogout} title="Sair do Sistema">
            ↪
          </button>
        </div>
      </aside>

      {/* Main Wrapper com Top Bar e Viewport */}
      <div className="main-wrapper">
        {/* Top Header Bar (Breadcrumbs e Controles Globais) */}
        <header className="top-nav-bar">
          <div className="top-nav-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              aria-label="Abrir menu de navegação"
            >
              <NavIcons.Menu size={18} />
            </button>
            <div className="breadcrumb-trail">
              <span>HDSTEC</span>
              <span className="breadcrumb-sep">/</span>
              <span className="active">{getBreadcrumbTitle()}</span>
            </div>
          </div>

          <div className="top-nav-right">
            <div className="top-user-badge-mobile" title={user?.name || user?.email}>
              <div className="user-avatar-circle small">{userInitials}</div>
            </div>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="main-content">
          {activeTab === 'dashboard' && (
            <div className="dashboard-container">
              {/* Banner Topo estilo shadcn (Igual ao print) */}
              <div className="dash-banner">
                <div>
                  <h1>Dashboard TI — Controle de CPUs & Operação</h1>
                </div>

                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => setActiveTab('rooms')}>
                    Ver PAs & Salas
                  </button>
                  <button className="primary" onClick={() => setActiveTab('inventory')}>
                    + Nova CPU
                  </button>
                </div>
              </div>

              {/* 4 KPI Metric Cards (Visual Idêntico ao Print) */}
              <div className="kpi-grid">
                {/* Card 1: CPUs em Operação */}
                <div className="kpi-card">
                  <div className="kpi-top-row">
                    <span className="kpi-title">CPUs EM OPERAÇÃO</span>
                    <div className="kpi-icon-badge kpi-icon-purple"><NavIcons.Monitor size={16} /></div>
                  </div>
                  <div className="kpi-middle-row">
                    <span className="kpi-stat-number">{inUseCpus}</span>
                    <span className="kpi-pill-tag kpi-pill-green">Alocadas</span>
                  </div>
                  <span className="kpi-bottom-text">em {rooms.length} salas operacionais ativas</span>
                </div>

                {/* Card 2: CPUs no Estoque */}
                <div className="kpi-card">
                  <div className="kpi-top-row">
                    <span className="kpi-title">CPUs NO ESTOQUE</span>
                    <div className="kpi-icon-badge kpi-icon-blue"><NavIcons.Inventory size={16} /></div>
                  </div>
                  <div className="kpi-middle-row">
                    <span className="kpi-stat-number">{inStockCpus}</span>
                    <span className="kpi-pill-tag kpi-pill-blue">Prontas</span>
                  </div>
                  <span className="kpi-bottom-text">disponíveis para alocação imediata</span>
                </div>

                {/* Card 3: Taxa de Ocupação das PAs */}
                <div className="kpi-card">
                  <div className="kpi-top-row">
                    <span className="kpi-title">OCUPAÇÃO DAS VAGAS</span>
                    <div className="kpi-icon-badge kpi-icon-purple"><NavIcons.Dashboard size={16} /></div>
                  </div>
                  <div className="kpi-middle-row">
                    <span className="kpi-stat-number">{occupancyRate}%</span>
                    <span className="kpi-pill-tag kpi-pill-purple">{freePas} PAs livres</span>
                  </div>
                  <div className="kpi-progress-track">
                    <div className="kpi-progress-fill" style={{ width: `${Math.min(100, occupancyRate)}%` }} />
                  </div>
                  <span className="kpi-bottom-text mt-2">{inUseCpus} ocupadas de {totalCapacity} totais</span>
                </div>

                {/* Card 4: Alertas de Headsets */}
                <div className="kpi-card">
                  <div className="kpi-top-row">
                    <span className="kpi-title">HEADSETS EM ATENÇÃO</span>
                    <div className="kpi-icon-badge kpi-icon-amber"><NavIcons.Alert size={16} /></div>
                  </div>
                  <div className="kpi-middle-row">
                    <span className="kpi-stat-number">{awaitingDefects + sentDefects}</span>
                    <span className="kpi-pill-tag kpi-pill-amber">Atenção</span>
                  </div>
                  <span className="kpi-bottom-text">{awaitingDefects} aguardando e {sentDefects} em conserto</span>
                </div>
              </div>

              {/* Seção Dividida: Gráficos (2/3) + Movimentações Recentes (1/3) */}
              <div className="dash-split-grid">
                {/* Lado Esquerdo: Analytics Card com Tabs & Linhas Animadas shadcn */}
                <div className="card shadcn-chart-card">
                  <div className="shadcn-chart-header">
                    <div className="shadcn-chart-title-area">
                      <h3>
                        Desempenho & Monitoramento
                      </h3>
                      <p className="shadcn-chart-subtitle">
                        {chartCategory === 'machines' && chartSubTab === 'rooms' && 'Comparativo de ocupação versus capacidade total por sala operacional.'}
                        {chartCategory === 'machines' && chartSubTab === 'distribution' && 'Distribuição consolidada entre máquinas alocadas em PAs e estoque.'}
                        {chartCategory === 'machines' && chartSubTab === 'timeline' && 'Tendência temporal de movimentações e trocas realizadas no parque.'}
                        {chartCategory === 'headsets' && chartSubTab === 'defects' && 'Curvas dinâmicas de defeitos e resoluções por marca com gradiente e animação suave.'}
                        {chartCategory === 'headsets' && chartSubTab === 'stock' && 'Estoque disponível de headsets novos por marca fabricante.'}
                      </p>
                    </div>

                    <div className="shadcn-chart-actions">
                      {/* Filtro Unificado e Clean estilo Radix / Shadcn */}
                      <ChartFilterDropdown
                        category={chartCategory}
                        subTab={chartSubTab}
                        onSelect={(cat, sub) => {
                          setChartCategory(cat);
                          setChartSubTab(sub);
                        }}
                      />

                      {/* Alternador de Tipo de Gráfico (Linhas vs Barras) */}
                      {chartSubTab !== 'distribution' && (
                        <div className="shadcn-type-toggle">
                          <button 
                            className={`shadcn-toggle-btn ${chartType === 'area' ? 'active' : ''}`}
                            onClick={() => setChartType('area')}
                            title="Visualizar em Linhas com Área Suave"
                          >
                            <NavIcons.LineChart size={13} />
                            <span>Linhas</span>
                          </button>
                          <button 
                            className={`shadcn-toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
                            onClick={() => setChartType('bar')}
                            title="Visualizar em Barras"
                          >
                            <NavIcons.BarChart size={13} />
                            <span>Barras</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 1, minHeight: '330px', width: '100%', position: 'relative' }}>
                    {/* GRÁFICOS DE MÁQUINAS: 1. SALAS & PAs */}
                    {chartCategory === 'machines' && chartSubTab === 'rooms' && (
                      chartType === 'area' ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={roomsChartData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorOccupied" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.55}/>
                                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0}/>
                              </linearGradient>
                              <linearGradient id="colorCapacity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="capacidade" 
                              name="Capacidade Total" 
                              stroke="#3b82f6" 
                              strokeWidth={2} 
                              fillOpacity={1} 
                              fill="url(#colorCapacity)" 
                              isAnimationActive={true}
                              animationDuration={1400}
                              dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#09090b' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="ocupadas" 
                              name="PAs Ocupadas" 
                              stroke="#7c3aed" 
                              strokeWidth={2.5} 
                              fillOpacity={1} 
                              fill="url(#colorOccupied)" 
                              isAnimationActive={true}
                              animationDuration={1500}
                              dot={{ r: 5, stroke: '#7c3aed', strokeWidth: 2, fill: '#09090b' }}
                              activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3, fill: '#7c3aed' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={roomsChartData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Bar dataKey="ocupadas" fill="#7c3aed" radius={[6, 6, 0, 0]} name="PAs Ocupadas" isAnimationActive={true} animationDuration={1200} />
                            <Bar dataKey="capacidade" fill="rgba(255, 255, 255, 0.12)" radius={[6, 6, 0, 0]} name="Capacidade Total" isAnimationActive={true} animationDuration={1200} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    )}

                    {/* GRÁFICOS DE MÁQUINAS: 2. DISTRIBUIÇÃO */}
                    {chartCategory === 'machines' && chartSubTab === 'distribution' && (
                      <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={[
                                { name: 'Em Uso (Salas)', value: inUseCpus },
                                { name: 'No Estoque', value: inStockCpus }
                              ]}
                              cx="50%" cy="50%" innerRadius={85} outerRadius={115} paddingAngle={5} dataKey="value"
                              isAnimationActive={true}
                              animationDuration={1200}
                            >
                              <Cell fill="#7c3aed" stroke="#121217" strokeWidth={3} />
                              <Cell fill="#22c55e" stroke="#121217" strokeWidth={3} />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#ffffff' }} itemStyle={{ color: '#ffffff' }} />
                            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="donut-center-overlay">
                          <div className="donut-center-value">{totalCpus}</div>
                          <div className="donut-center-label">CPUs Totais</div>
                        </div>
                      </div>
                    )}

                    {/* GRÁFICOS DE MÁQUINAS: 3. MOVIMENTAÇÕES (TIMELINE) */}
                    {chartCategory === 'machines' && chartSubTab === 'timeline' && (
                      chartType === 'area' ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={timelineTrendData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.65}/>
                                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="movimentacoes" 
                              name="Movimentações / Trocas" 
                              stroke="#7c3aed" 
                              strokeWidth={3} 
                              fillOpacity={1} 
                              fill="url(#colorTimeline)" 
                              isAnimationActive={true}
                              animationDuration={1500}
                              animationEasing="ease-in-out"
                              dot={{ r: 5, stroke: '#7c3aed', strokeWidth: 2, fill: '#09090b' }}
                              activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3, fill: '#7c3aed' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={timelineTrendData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Bar dataKey="movimentacoes" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Movimentações / Trocas" isAnimationActive={true} animationDuration={1200} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    )}

                    {/* GRÁFICOS DE HEADSETS: 1. DEFEITOS POR MARCA */}
                    {chartCategory === 'headsets' && chartSubTab === 'defects' && (
                      chartType === 'area' ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={headsetBrandData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorAmber" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.55}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                              </linearGradient>
                              <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.55}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                              </linearGradient>
                              <linearGradient id="colorViolet" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis 
                              dataKey="brand" 
                              stroke="var(--text-muted)" 
                              fontSize={12} 
                              tickLine={false} 
                              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }} 
                            />
                            <YAxis 
                              stroke="var(--text-muted)" 
                              fontSize={12} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="total" 
                              name="Total de Chamados" 
                              stroke="#8b5cf6" 
                              strokeWidth={2} 
                              fillOpacity={1} 
                              fill="url(#colorViolet)" 
                              isAnimationActive={true}
                              animationDuration={1500}
                              animationEasing="ease-in-out"
                              dot={{ r: 4, stroke: '#8b5cf6', strokeWidth: 2, fill: '#09090b' }}
                              activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2, fill: '#8b5cf6' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="aguardando" 
                              name="Aguardando Reparo" 
                              stroke="#f59e0b" 
                              strokeWidth={2.5} 
                              fillOpacity={1} 
                              fill="url(#colorAmber)" 
                              isAnimationActive={true}
                              animationDuration={1500}
                              animationEasing="ease-in-out"
                              dot={{ r: 4, stroke: '#f59e0b', strokeWidth: 2, fill: '#09090b' }}
                              activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2, fill: '#f59e0b' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="resolvidos" 
                              name="Resolvidos" 
                              stroke="#10b981" 
                              strokeWidth={2.5} 
                              fillOpacity={1} 
                              fill="url(#colorEmerald)" 
                              isAnimationActive={true}
                              animationDuration={1500}
                              animationEasing="ease-in-out"
                              dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#09090b' }}
                              activeDot={{ r: 7, stroke: '#ffffff', strokeWidth: 2, fill: '#10b981' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={headsetBrandData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis dataKey="brand" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Bar dataKey="aguardando" name="Aguardando Reparo" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1200} />
                            <Bar dataKey="resolvidos" name="Resolvidos" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1200} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    )}

                    {/* GRÁFICOS DE HEADSETS: 2. ESTOQUE DISPONÍVEL POR MARCA */}
                    {chartCategory === 'headsets' && chartSubTab === 'stock' && (
                      chartType === 'area' ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={headsetStockData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                            <defs>
                              <linearGradient id="colorStockGreen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis dataKey="brand" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Area 
                              type="monotone" 
                              dataKey="quantidade" 
                              name="Unidades Disponíveis" 
                              stroke="#22c55e" 
                              strokeWidth={2.5} 
                              fillOpacity={1} 
                              fill="url(#colorStockGreen)" 
                              isAnimationActive={true}
                              animationDuration={1500}
                              dot={{ r: 5, stroke: '#22c55e', strokeWidth: 2, fill: '#09090b' }}
                              activeDot={{ r: 8, stroke: '#ffffff', strokeWidth: 3, fill: '#22c55e' }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={headsetStockData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                            <XAxis dataKey="brand" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip content={<CustomChartTooltip />} />
                            <Bar dataKey="quantidade" fill="#22c55e" radius={[6, 6, 0, 0]} name="Unidades Disponíveis" isAnimationActive={true} animationDuration={1200} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    )}
                  </div>

                  {/* Legenda Estilo shadcn com Indicadores com Glow */}
                  {chartCategory === 'headsets' && chartSubTab === 'defects' && (
                    <div className="shadcn-chart-legend">
                      <div className="shadcn-legend-item">
                        <span className="shadcn-legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                        <span className="shadcn-legend-name">Aguardando: {awaitingDefects}</span>
                      </div>
                      <div className="shadcn-legend-item">
                        <span className="shadcn-legend-dot" style={{ backgroundColor: '#10b981' }} />
                        <span className="shadcn-legend-name">Resolvidos: {headsetDefects.filter(d => d.status === 'Resolvido').length}</span>
                      </div>
                      <div className="shadcn-legend-item">
                        <span className="shadcn-legend-dot" style={{ backgroundColor: '#8b5cf6' }} />
                        <span className="shadcn-legend-name">Total Chamados: {headsetDefects.length}</span>
                      </div>
                    </div>
                  )}

                  {chartCategory === 'headsets' && chartSubTab === 'stock' && (
                    <div className="shadcn-chart-legend">
                      <div className="shadcn-legend-item">
                        <span className="shadcn-legend-dot" style={{ backgroundColor: '#22c55e' }} />
                        <span className="shadcn-legend-name">Total em Estoque: {headsetStock.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0)} unidades</span>
                      </div>
                    </div>
                  )}

                  {chartCategory === 'machines' && chartSubTab === 'timeline' && (
                    <div className="shadcn-chart-legend">
                      <div className="shadcn-legend-item">
                        <span className="shadcn-legend-dot" style={{ backgroundColor: '#7c3aed' }} />
                        <span className="shadcn-legend-name">Atividades Registradas: {history.length} eventos</span>
                      </div>
                    </div>
                  )}

                  {chartCategory === 'machines' && chartSubTab === 'rooms' && (
                    <div className="shadcn-chart-legend">
                      <div className="shadcn-legend-item">
                        <span className="shadcn-legend-dot" style={{ backgroundColor: '#7c3aed' }} />
                        <span className="shadcn-legend-name">PAs Ocupadas: {inUseCpus}</span>
                      </div>
                      <div className="shadcn-legend-item">
                        <span className="shadcn-legend-dot" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="shadcn-legend-name">Capacidade Total: {totalCapacity} postos</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <NavIcons.History size={16} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Atividades Recentes</h3>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontWeight: 700 }}>
                      {history.length} eventos
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '340px', paddingRight: '4px' }}>
                    {history.slice(0, 6).map((item, idx) => (
                      <div 
                        key={item.id || idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px'
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: item.action?.includes('Swap') ? 'var(--primary-light)' : 'rgba(34, 197, 94, 0.12)', color: item.action?.includes('Swap') ? '#c084fc' : '#4ade80' }}>
                            {item.action || 'Movimentação'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                        <strong style={{ fontSize: '0.85rem', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {item.cpuCode || 'Equipamento'}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {item.from || 'Estoque'} → {item.to || 'Destino'}
                        </span>
                      </div>
                    ))}
                    {history.length === 0 && (
                      <p className="text-muted text-sm text-center" style={{ marginTop: '2rem' }}>Nenhum log registrado ainda.</p>
                    )}
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

          {activeTab === 'history' && (
            <History history={history} setHistory={setHistory} updateData={updateData} />
          )}

          {activeTab === 'headsets' && (
            <HeadsetsManager 
              stock={headsetStock} 
              setStock={setHeadsetStock} 
              defects={headsetDefects} 
              setDefects={setHeadsetDefects}
              history={history}
              setHistory={setHistory}
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
    </div>
  )
}

export default App
