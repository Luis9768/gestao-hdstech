import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import './History.css';

export default function HeadsetsManager({ stock, setStock, defects, setDefects, history = [], setHistory, updateData }) {
  const [activeSubTab, setActiveSubTab] = useState('stock'); // 'stock', 'defects', 'history'

  // Stock Form State
  const [newBrand, setNewBrand] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  // Defect Form State
  const [defectBrand, setDefectBrand] = useState('');
  const [defectDesc, setDefectDesc] = useState('');
  const [defectBox, setDefectBox] = useState('');
  const [fromOperation, setFromOperation] = useState(false);

  const [filterBox, setFilterBox] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const logEvent = (action, brand, qty, details) => {
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    const newEntry = {
      id: Date.now() + Math.random(),
      date: formattedDate,
      action,
      brand,
      qty,
      details
    };
    const newHistory = [newEntry, ...history];
    setHistory(newHistory);
    return newHistory;
  };

  const handleAddStock = (e) => {
    e.preventDefault();
    if (!newBrand.trim() || !newQuantity) return;

    const qty = parseInt(newQuantity);
    const existing = stock.find(s => s.brand.toLowerCase() === newBrand.toLowerCase().trim());
    
    let newStock;
    if (existing) {
      newStock = stock.map(s => s.id === existing.id ? { ...s, quantity: s.quantity + qty } : s);
    } else {
      newStock = [...stock, { id: Date.now(), brand: newBrand.trim(), quantity: qty }];
    }

    setStock(newStock);
    const newHist = logEvent('Entrada Manual', newBrand.trim(), qty, 'Adicionado ao estoque');
    updateData({ headsetStock: newStock, headsetHistory: newHist });
    setNewBrand('');
    setNewQuantity('');
  };

  const handleUpdateQuantity = (id, delta) => {
    const newStock = stock.map(s => {
      if (s.id === id) {
        const newQty = Math.max(0, s.quantity + delta);
        return { ...s, quantity: newQty };
      }
      return s;
    });
    setStock(newStock);
    const newHist = logEvent(delta > 0 ? 'Ajuste Manual (+)' : 'Ajuste Manual (-)', stock.find(s => s.id === id).brand, Math.abs(delta), 'Ajuste via botões rápidos');
    updateData({ headsetStock: newStock, headsetHistory: newHist });
  };

  const handleAddDefect = (e) => {
    e.preventDefault();
    if (!defectBrand || !defectDesc.trim() || !defectBox.trim()) return;

    // Check if we have stock for this brand to deduct, only if it didn't come from operations
    let currentStock = null;
    if (!fromOperation) {
      currentStock = stock.find(s => s.brand.toLowerCase() === defectBrand.toLowerCase().trim());
      if (!currentStock || currentStock.quantity <= 0) {
        if (!confirm(`Atenção: Você não tem nenhum headset da marca ${defectBrand} em estoque para substituir o quebrado. Deseja registrar o defeito mesmo assim?`)) {
          return;
        }
      }
    }
    
    // Format BR Date
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newDefect = {
      id: Date.now(),
      date: formattedDate,
      brand: defectBrand,
      defect: defectDesc.trim(),
      status: 'Aguardando',
      box: defectBox.trim()
    };

    const newDefectsList = [newDefect, ...defects];
    
    // Deduct from stock if available and not from operations
    let newStock = [...stock];
    if (!fromOperation && currentStock && currentStock.quantity > 0) {
      newStock = stock.map(s => s.brand.toLowerCase() === defectBrand.toLowerCase().trim() ? { ...s, quantity: s.quantity - 1 } : s);
      setStock(newStock);
    }

    setDefects(newDefectsList);
    const newHist = logEvent('Defeito Registrado', defectBrand, 1, fromOperation ? 'Veio da operação (Sem baixa no estoque)' : 'Baixa no estoque funcional');
    updateData({ headsetStock: newStock, headsetDefects: newDefectsList, headsetHistory: newHist });
    
    setDefectDesc('');
    // Keep brand and box to facilitate multiple entries
  };

  const handleSendBox = (boxName) => {
    if (!confirm(`Confirmar envio da caixa ${boxName}? Os status mudarão para 'Enviada'.`)) return;

    const newDefects = defects.map(d => {
      if (d.box === boxName && d.status === 'Aguardando') {
        return { ...d, status: 'Enviada' };
      }
      return d;
    });

    setDefects(newDefects);
    updateData({ headsetDefects: newDefects });
  };

  const handleReceiveBox = (boxName) => {
    if (!confirm(`Confirmar recebimento da caixa ${boxName}? Os headsets retornarão ao estoque funcional.`)) return;

    const headsetsToReturn = defects.filter(d => d.box === boxName && d.status === 'Enviada');
    if (headsetsToReturn.length === 0) {
      alert('Nenhum headset com status "Enviada" encontrado nesta caixa.');
      return;
    }

    // Format BR Date
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Update defects status
    const newDefects = defects.map(d => {
      if (d.box === boxName && d.status === 'Enviada') {
        return { ...d, status: 'Resolvido', returnDate: formattedDate };
      }
      return d;
    });

    // Update stock
    let newStock = [...stock];
    headsetsToReturn.forEach(item => {
      const existing = newStock.find(s => s.brand.toLowerCase() === item.brand.toLowerCase().trim());
      if (existing) {
        existing.quantity += 1;
      } else {
        newStock.push({ id: Date.now() + Math.random(), brand: item.brand.trim(), quantity: 1 });
      }
    });

    setStock(newStock);
    setDefects(newDefects);
    const newHist = logEvent('Retorno de Conserto', 'Múltiplos', headsetsToReturn.length, `Caixa ${boxName} recebida`);
    updateData({ headsetStock: newStock, headsetDefects: newDefects, headsetHistory: newHist });
    alert(`${headsetsToReturn.length} headsets devolvidos ao estoque!`);
  };

  const handleExportCSV = () => {
    if (filteredDefects.length === 0) return alert('Não há dados visíveis para exportar com os filtros atuais.');
    
    const dataToExport = filteredDefects.map(d => ({
      'DATA REGISTRO': d.date,
      'DATA RETORNO': d.returnDate || '-',
      'MODELO': d.brand,
      'DEFEITO': d.defect,
      'STATUS': d.status,
      'CAIXA': d.box
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Headsets Danificados");

    XLSX.writeFile(workbook, "headsets_danificados.xlsx");
  };

  const filteredDefects = useMemo(() => {
    let result = defects;
    if (filterBox) {
      result = result.filter(d => d.box.toLowerCase().includes(filterBox.toLowerCase()));
    }
    if (filterDate) {
      result = result.filter(d => d.date.includes(filterDate));
    }
    if (filterStatus) {
      result = result.filter(d => d.status === filterStatus);
    }
    return result;
  }, [defects, filterBox, filterDate, filterStatus]);

  const uniqueBoxes = useMemo(() => {
    const boxes = new Set(defects.map(d => d.box));
    return Array.from(boxes).sort();
  }, [defects]);

  const waitingBoxes = useMemo(() => {
    const boxes = new Set(defects.filter(d => d.status === 'Aguardando').map(d => d.box));
    return Array.from(boxes).sort();
  }, [defects]);

  const sentBoxes = useMemo(() => {
    const boxes = new Set(defects.filter(d => d.status === 'Enviada').map(d => d.box));
    return Array.from(boxes).sort();
  }, [defects]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2>Gestão de Headsets</h2>
        <div className="flex gap-2">
          <button 
            className={activeSubTab === 'stock' ? 'primary btn-glow' : ''}
            onClick={() => setActiveSubTab('stock')}
            style={activeSubTab !== 'stock' ? {background: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)'} : {}}
          >
            Estoque Funcional
          </button>
          <button 
            className={activeSubTab === 'defects' ? 'primary btn-glow' : ''}
            onClick={() => setActiveSubTab('defects')}
            style={activeSubTab !== 'defects' ? {background: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)'} : {}}
          >
            Caixas e Danificados
          </button>
          <button 
            className={activeSubTab === 'history' ? 'primary btn-glow' : ''}
            onClick={() => setActiveSubTab('history')}
            style={activeSubTab !== 'history' ? {background: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)'} : {}}
          >
            Histórico de Headsets
          </button>
        </div>
      </div>

      {activeSubTab === 'stock' && (
        <div className="card">
          <h3 className="mb-4">Estoque de Headsets</h3>
          
          <form onSubmit={handleAddStock} className="flex gap-4 mb-6 flex-wrap items-end">
            <div className="input-group flex-1">
              <label>Marca / Modelo</label>
              <input required type="text" className="premium-input" placeholder="Ex: Intelbras, Zox" value={newBrand} onChange={e => setNewBrand(e.target.value)} />
            </div>
            <div className="input-group w-32">
              <label>Quantidade</label>
              <input required type="number" min="1" className="premium-input" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} />
            </div>
            <button type="submit" className="primary btn-glow" style={{height: '42px'}}>Adicionar ao Estoque</button>
          </form>

          <div className="table-responsive">
            <table className="history-table w-full">
              <thead>
                <tr>
                  <th>Marca / Modelo</th>
                  <th>Quantidade Disponível</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {stock.length === 0 ? (
                  <tr><td colSpan="3" className="text-center text-muted py-4">Nenhum headset no estoque</td></tr>
                ) : stock.map(s => (
                  <tr key={s.id}>
                    <td style={{textTransform: 'capitalize'}}>{s.brand}</td>
                    <td>
                      <span className="badge" style={{fontSize: '1rem'}}>{s.quantity}</span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateQuantity(s.id, 1)} className="btn-sm" style={{background: 'var(--primary-color)', color: '#fff'}}>+</button>
                        <button onClick={() => handleUpdateQuantity(s.id, -1)} className="btn-sm" style={{background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)'}}>-</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'defects' && (
        <div className="flex flex-col gap-4">
          <div className="card">
            <h3 className="mb-4">Registrar Headset Danificado</h3>
            <p className="text-sm text-muted mb-4">Ao registrar um defeito, o sistema reduzirá automaticamente 1 unidade do estoque funcional para reposição, a menos que ele tenha vindo direto da operação.</p>
            
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer" style={{userSelect: 'none', width: 'fit-content', color: 'var(--text-color)'}}>
                <input 
                  type="checkbox" 
                  checked={fromOperation} 
                  onChange={e => setFromOperation(e.target.checked)} 
                  style={{width: '16px', height: '16px'}}
                />
                Veio direto da Operação (Não descontar do meu estoque funcional)
              </label>
            </div>

            <form onSubmit={handleAddDefect} className="flex gap-4 flex-wrap items-end">
              <div className="input-group flex-1">
                <label>Marca / Modelo</label>
                <input 
                  required 
                  type="text" 
                  className="premium-input" 
                  placeholder="Ex: Intelbras" 
                  value={defectBrand} 
                  onChange={e => setDefectBrand(e.target.value)}
                  list="brandsList"
                />
                <datalist id="brandsList">
                  {stock.map(s => (
                    <option key={s.id} value={s.brand}>{s.brand} ({s.quantity} em estoque)</option>
                  ))}
                </datalist>
              </div>
              <div className="input-group flex-1">
                <label>Defeito</label>
                <input required type="text" className="premium-input" placeholder="Ex: mau contato, microfone" value={defectDesc} onChange={e => setDefectDesc(e.target.value)} />
              </div>
              <div className="input-group w-32">
                <label>Caixa</label>
                <input required type="text" className="premium-input" placeholder="Ex: N° 06" value={defectBox} onChange={e => setDefectBox(e.target.value)} />
              </div>
              <div className="input-group">
                <label>&nbsp;</label>
                <button type="submit" className="primary btn-glow btn-danger" style={{height: '42px', padding: '0 24px'}}>Registrar Defeito</button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h3>Lista de Danificados e Caixas</h3>
                <div className="flex gap-2 flex-wrap">
                  <div className="input-group m-0">
                    <select className="premium-input" style={{padding: '4px 12px', height: '32px'}} value={filterBox} onChange={e => setFilterBox(e.target.value)}>
                      <option value="">Todas as caixas</option>
                      {uniqueBoxes.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="input-group m-0">
                    <input 
                      type="text" 
                      className="premium-input" 
                      placeholder="Filtrar por data..." 
                      style={{padding: '4px 12px', height: '32px', width: '130px'}} 
                      value={filterDate} 
                      onChange={e => setFilterDate(e.target.value)} 
                    />
                  </div>
                  <div className="input-group m-0">
                    <select className="premium-input" style={{padding: '4px 12px', height: '32px'}} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="">Todos os status</option>
                      <option value="Aguardando">Aguardando</option>
                      <option value="Enviada">Enviada</option>
                      <option value="Resolvido">Resolvido</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExportCSV} className="btn-sm" style={{border: '1px solid var(--primary-color)', color: 'var(--primary-color)', background: 'transparent'}}>
                  📥 Exportar Planilha
                </button>
                <button 
                  onClick={() => setShowSendModal(true)} 
                  className="btn-sm" 
                  style={{background: 'var(--surface-color)', border: '1px solid #f59e0b', color: '#f59e0b'}}
                >
                  📦 Enviar Caixa
                </button>
                <button 
                  onClick={() => setShowReceiveModal(true)} 
                  className="btn-sm" 
                  style={{background: 'var(--surface-color)', border: '1px solid #22c55e', color: '#22c55e'}}
                >
                  ✅ Receber Retorno
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="history-table w-full">
                <thead>
                  <tr>
                    <th>Data Registro</th>
                    <th>Data Retorno</th>
                    <th>Modelo</th>
                    <th>Defeito</th>
                    <th>Status</th>
                    <th>Caixa</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefects.length === 0 ? (
                    <tr><td colSpan="5" className="text-center text-muted py-4">Nenhum registro encontrado</td></tr>
                  ) : filteredDefects.map(d => (
                    <tr key={d.id}>
                      <td style={{whiteSpace: 'nowrap'}}>{d.date}</td>
                      <td style={{whiteSpace: 'nowrap'}} className="text-muted">{d.returnDate || '-'}</td>
                      <td style={{textTransform: 'capitalize'}}>{d.brand}</td>
                      <td>{d.defect}</td>
                      <td>
                        <span className={`badge ${d.status === 'Resolvido' ? 'bg-green' : d.status === 'Enviada' ? 'bg-yellow' : 'bg-red'}`} 
                              style={{
                                background: d.status === 'Resolvido' ? 'rgba(34,197,94,0.2)' : d.status === 'Enviada' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                                color: d.status === 'Resolvido' ? '#22c55e' : d.status === 'Enviada' ? '#f59e0b' : '#ef4444',
                                border: 'none'
                              }}>
                          {d.status}
                        </span>
                      </td>
                      <td className="font-bold">{d.box}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="card">
          <h3 className="mb-4">Histórico de Movimentações (Headsets)</h3>
          <div className="table-responsive">
            <table className="history-table w-full">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Ação</th>
                  <th>Marca / Modelo</th>
                  <th>Qtd</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-muted py-4">Nenhum histórico registrado ainda.</td></tr>
                ) : history.map(h => (
                  <tr key={h.id}>
                    <td style={{whiteSpace: 'nowrap'}}>{h.date}</td>
                    <td><span className="badge badge-outline">{h.action}</span></td>
                    <td style={{textTransform: 'capitalize'}}><strong>{h.brand}</strong></td>
                    <td><span className="badge" style={{background: 'var(--text-muted)'}}>{h.qty}</span></td>
                    <td className="text-muted">{h.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals for Send / Receive Box */}
      {showSendModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)'}}>
          <div className="card max-w-md w-full" style={{margin: '20px', border: '1px solid #f59e0b', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'}}>
            <h3 className="mb-4 text-center" style={{color: '#f59e0b'}}>📦 Enviar Caixa para Conserto</h3>
            {waitingBoxes.length === 0 ? (
              <p className="text-center text-muted mb-6">Não há nenhuma caixa com status "Aguardando".</p>
            ) : (
              <div className="flex flex-col gap-3 mb-6 max-h-60" style={{overflowY: 'auto', paddingRight: '4px'}}>
                {waitingBoxes.map(b => {
                  const qtd = defects.filter(d => d.box === b && d.status === 'Aguardando').length;
                  return (
                    <button key={b} onClick={() => { handleSendBox(b); setShowSendModal(false); }} className="btn-sm flex justify-between items-center" style={{background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '16px'}}>
                      <span className="font-bold text-lg">{b}</span>
                      <span className="badge bg-yellow" style={{background: 'rgba(245,158,11,0.2)', color: '#f59e0b'}}>{qtd} headset(s)</span>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => setShowSendModal(false)} className="w-full btn-sm" style={{background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)'}}>Cancelar</button>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)'}}>
          <div className="card max-w-md w-full" style={{margin: '20px', border: '1px solid #22c55e', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'}}>
            <h3 className="mb-4 text-center" style={{color: '#22c55e'}}>✅ Receber Caixa do Conserto</h3>
            {sentBoxes.length === 0 ? (
              <p className="text-center text-muted mb-6">Não há nenhuma caixa enviada para conserto no momento.</p>
            ) : (
              <div className="flex flex-col gap-3 mb-6 max-h-60" style={{overflowY: 'auto', paddingRight: '4px'}}>
                {sentBoxes.map(b => {
                  const qtd = defects.filter(d => d.box === b && d.status === 'Enviada').length;
                  return (
                    <button key={b} onClick={() => { handleReceiveBox(b); setShowReceiveModal(false); }} className="btn-sm flex justify-between items-center" style={{background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '16px'}}>
                      <span className="font-bold text-lg">{b}</span>
                      <span className="badge bg-green" style={{background: 'rgba(34,197,94,0.2)', color: '#22c55e'}}>{qtd} headset(s)</span>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => setShowReceiveModal(false)} className="w-full btn-sm" style={{background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)'}}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
