import { useState } from 'react';
import { sanitizeInput } from './api';
import './CpuInventory.css';

export default function CpuInventory({ cpus, setCpus, updateData, rooms }) {
  const [newCode, setNewCode] = useState('');
  const [newAcq, setNewAcq] = useState('TIM');
  const [isAuditen, setIsAuditen] = useState(false);
  const [error, setError] = useState('');

  const getAcqOptions = () => {
    const fixed = ['TIM', 'Affix', 'Estoque'];
    const dynamic = rooms ? rooms.map(r => r.name) : [];
    
    const map = new Map();
    fixed.forEach(f => map.set(f.toLowerCase(), f));
    dynamic.forEach(d => map.set(d.toLowerCase(), d));
    
    return Array.from(map.values());
  };
  const acqOptions = getAcqOptions();

  // Estados de Edição
  const [editingCpu, setEditingCpu] = useState(null);
  const [editCode, setEditCode] = useState('');
  const [editAcq, setEditAcq] = useState('TIM');
  const [editAuditen, setEditAuditen] = useState(false);

  const handleAdd = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    let finalCode = sanitizeInput(newCode);
    if (!finalCode) {
      finalCode = 'Cpu sem identificação';
    }

    if (finalCode !== 'Cpu sem identificação' && cpus.some(c => c.code === finalCode)) {
      setError('Uma CPU com este código já existe.');
      return;
    }

    const newCpu = { 
      id: Date.now(), 
      code: finalCode, 
      acquisition: newAcq, 
      isAuditen,
      location: 'estoque' 
    };
    
    const newCpus = [...cpus, newCpu];
    setCpus(newCpus);
    updateData({ cpus: newCpus });
    setNewCode('');
    setIsAuditen(false);
    setError('');
  };

  const handleRemove = (id) => {
    const cpu = cpus.find(c => c.id === id);
    if (cpu && cpu.location !== 'estoque') {
      alert('Esta CPU está alocada em uma sala. Para excluí-la, remova-a da PA primeiro.');
      return;
    }
    if(confirm('Tem certeza que deseja excluir esta CPU?')) {
      const newCpus = cpus.filter(c => c.id !== id);
      setCpus(newCpus);
      updateData({ cpus: newCpus });
    }
  };

  const startEdit = (cpu) => {
    setEditingCpu(cpu.id);
    setEditCode(cpu.code);
    setEditAcq(cpu.acquisition);
    setEditAuditen(cpu.isAuditen || false);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    let finalCode = editCode.trim();
    if (!finalCode) {
      finalCode = 'Cpu sem identificação';
    }
    
    // Verificar duplicidade
    if (finalCode !== 'Cpu sem identificação' && cpus.some(c => c.code === finalCode && c.id !== editingCpu)) {
      return alert("Já existe outra CPU com este código.");
    }

    const updatedCpus = cpus.map(c => {
      if (c.id === editingCpu) {
        return { ...c, code: finalCode, acquisition: editAcq, isAuditen: editAuditen };
      }
      return c;
    });

    setCpus(updatedCpus);
    updateData({ cpus: updatedCpus });
    setEditingCpu(null);
  };

  return (
    <div className="cpu-inventory flex flex-col gap-4">
      <h2>Estoque de CPUs</h2>
      
      <div className="card add-cpu-card">
        <h3>Cadastrar Nova CPU</h3>
        {error && <div className="error-message" style={{marginBottom: '10px'}}>{error}</div>}
        <div className="flex gap-4 items-center flex-wrap">
          <input 
            type="text" 
            placeholder="Código da CPU (deixe em branco se não houver)" 
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(e)}
            className="premium-input"
            style={{flex: 1, minWidth: '200px'}}
          />
          <select value={newAcq} onChange={(e) => setNewAcq(e.target.value)} className="premium-input" style={{width: '150px'}}>
            {acqOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer" style={{background: 'var(--input-bg)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
            <input type="checkbox" checked={isAuditen} onChange={e => setIsAuditen(e.target.checked)} />
            Auditen
          </label>
          <button onClick={handleAdd} className="primary btn-glow">Adicionar CPU</button>
        </div>
      </div>

      <div className="card list-cpu-card mt-4">
        <h3>CPUs Cadastradas ({cpus.length})</h3>
        <div className="cpu-grid mt-4">
          {[...cpus].reverse().map(cpu => (
            <div key={cpu.id} className="cpu-item flex flex-col justify-between" style={{padding: '16px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px'}}>
              <div className="flex items-center justify-between mb-2">
                <strong style={{fontSize: '1.2rem'}}>{cpu.code}</strong>
                <span className={`acq-badge acq-${cpu.acquisition.toLowerCase()}`}>{cpu.acquisition}</span>
              </div>
              
              <div className="flex gap-2 mb-4 text-sm text-muted">
                <span>{cpu.isAuditen ? '✅ Auditen' : '❌ Não Auditen'}</span>
                <span>•</span>
                <span>{cpu.location === 'estoque' ? 'No Estoque' : `Em Uso`}</span>
              </div>

              <div className="flex items-center gap-2 mt-auto pt-4" style={{borderTop: '1px solid var(--border-color)'}}>
                <button 
                  onClick={() => startEdit(cpu)} 
                  style={{flex: 1, background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)'}}
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleRemove(cpu.id)} 
                  style={{flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {cpus.length === 0 && <p className="text-muted">Nenhuma CPU cadastrada ainda.</p>}
        </div>
      </div>

      {/* Modal de Edição */}
      {editingCpu && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card" style={{padding: '2rem', maxWidth: '400px', width: '100%', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px'}}>
            <h3 style={{marginBottom: '1rem'}}>Editar CPU</h3>
            <form onSubmit={saveEdit} className="flex flex-col gap-4">
              <div className="input-group">
                <label>Código da CPU</label>
                <input required type="text" className="premium-input" value={editCode} onChange={e => setEditCode(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Aquisição</label>
                <select className="premium-input" value={editAcq} onChange={e => setEditAcq(e.target.value)}>
                  {acqOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={editAuditen} onChange={e => setEditAuditen(e.target.checked)} />
                  Máquina Auditen
                </label>
              </div>
              
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setEditingCpu(null)} style={{flex: 1, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)'}}>Cancelar</button>
                <button type="submit" className="primary" style={{flex: 1}}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
