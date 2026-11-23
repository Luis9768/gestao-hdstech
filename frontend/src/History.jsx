import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { exportToExcel } from './utils/excelExporter';
import './History.css';

const formatDate = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('pt-BR');
  } catch {
    return String(dateVal);
  }
};

const getActionClass = (action) => {
  if (!action) return 'action-move';
  const a = action.toLowerCase();
  if (a.includes('swap') || a.includes('troca')) return 'action-swap';
  if (a.includes('código') || a.includes('codigo') || a.includes('nome')) return 'action-edit-code';
  if (a.includes('pertence')) return 'action-edit-acq';
  if (a.includes('estoque') || a.includes('devolução') || a.includes('devolucao')) return 'action-stock';
  return 'action-move';
};

export default function History({ history, setHistory, updateData, rooms }) {
  // Estados dos Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPa, setFilterPa] = useState('todas');
  const [filterAction, setFilterAction] = useState('todas');

  // Filtrar apenas histórico de movimentações e alterações de CPUs
  const cpuHistory = useMemo(() => {
    return (history || []).filter(entry => entry.cpuCode || entry.from || entry.to);
  }, [history]);

  // Lista dinâmica de PAs agrupadas por sala
  const paListByRoom = useMemo(() => {
    const map = new Map();

    // 1. Extrai das salas configuradas
    if (rooms && Array.isArray(rooms)) {
      rooms.forEach(r => {
        const roomName = r.name || 'Outras';
        if (!map.has(roomName)) map.set(roomName, new Set());
      });
    }

    // 2. Extrai de todas as entradas de histórico
    (history || []).forEach(entry => {
      [entry.from, entry.to].forEach(loc => {
        if (!loc || loc.toLowerCase() === 'estoque' || loc === 'N/A' || loc === '-') return;
        const parts = loc.split(' - ');
        if (parts.length >= 2) {
          const rName = parts[0].trim();
          const paName = parts.slice(1).join(' - ').trim();
          if (!map.has(rName)) map.set(rName, new Set());
          map.get(rName).add(paName);
        } else {
          if (!map.has('Outros')) map.set('Outros', new Set());
          map.get('Outros').add(loc.trim());
        }
      });
    });

    const result = {};
    for (const [rName, paSet] of map.entries()) {
      result[rName] = Array.from(paSet).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
    return result;
  }, [rooms, history]);

  // Filtragem inteligente de logs
  const filteredHistory = useMemo(() => {
    return cpuHistory.filter(entry => {
      const fromStr = (entry.from || '').toLowerCase();
      const toStr = (entry.to || '').toLowerCase();
      const detailsStr = (entry.details || '').toLowerCase();
      const actionStr = (entry.action || '').toLowerCase();
      const cpuStr = (entry.cpuCode || '').toLowerCase();

      // 1. Filtro por Seletor de PA / Sala
      if (filterPa !== 'todas') {
        if (filterPa.startsWith('sala:')) {
          const roomQuery = filterPa.replace('sala:', '').toLowerCase();
          const inFrom = fromStr.includes(roomQuery);
          const inTo = toStr.includes(roomQuery);
          if (!inFrom && !inTo) return false;
        } else {
          const targetPa = filterPa.toLowerCase();
          const inFrom = fromStr.includes(targetPa);
          const inTo = toStr.includes(targetPa);
          const inDetails = detailsStr.includes(targetPa);
          if (!inFrom && !inTo && !inDetails) return false;
        }
      }

      // 2. Filtro por Tipo de Ação
      if (filterAction !== 'todas') {
        const targetAction = filterAction.toLowerCase();
        if (!actionStr.includes(targetAction) && !targetAction.includes(actionStr)) {
          return false;
        }
      }

      // 3. Busca livre (PA, CPU, Ação, Detalhes)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const cpuMatch = cpuStr.includes(q);
        const fromMatch = fromStr.includes(q);
        const toMatch = toStr.includes(q);
        const actionMatch = actionStr.includes(q);
        const detailsMatch = detailsStr.includes(q);

        // Se o usuário digitou número puro (ex: "76"), checa se corresponde a "PA 76" ou "PA 076"
        const isNumeric = /^\d+$/.test(q);
        const paNumberMatch = isNumeric && (
          fromStr.includes(`pa ${q}`) ||
          toStr.includes(`pa ${q}`) ||
          fromStr.includes(`pa 0${q}`) ||
          toStr.includes(`pa 0${q}`)
        );

        if (!cpuMatch && !fromMatch && !toMatch && !actionMatch && !detailsMatch && !paNumberMatch) {
          return false;
        }
      }

      return true;
    });
  }, [cpuHistory, filterPa, filterAction, searchQuery]);

  const hasActiveFilters = searchQuery.trim() !== '' || filterPa !== 'todas' || filterAction !== 'todas';

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterPa('todas');
    setFilterAction('todas');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newEntries = data.map((row, index) => ({
          id: Date.now() + index,
          date: row.data || row.Date || row.Data || row['Data/Hora'] || row['DATA/HORA'] || new Date().toISOString(),
          cpuCode: row.cpuCode || row.cpu || row.CPU || row.EQUIPAMENTO || row['CÓDIGO DA CPU'] || 'Desconhecido',
          action: row.action || row.Ação || row.acao || row.AÇÃO || row.Evento || 'Movimentação PA',
          details: row.details || row.Detalhes || row.detalhes || null,
          from: row.from || row.Origem || row.origem || row.ORIGEM || 'N/A',
          to: row.to || row.Destino || row.destino || row.DESTINO || 'N/A'
        }));

        const mergedHistory = [...newEntries, ...history];
        setHistory(mergedHistory);
        if (updateData) {
          updateData({ history: mergedHistory });
        }
        alert(`Foram importados ${newEntries.length} registros com sucesso!`);
      } catch (err) {
        console.error(err);
        alert('Erro ao ler o arquivo Excel. Verifique o formato.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const dataToExport = filteredHistory.map(entry => ({
      'Data/Hora': formatDate(entry.date),
      'CPU': entry.cpuCode || '-',
      'Ação': entry.action || 'Movimentação',
      'Detalhes': entry.details || '-',
      'Origem': entry.from || '-',
      'Destino': entry.to || '-'
    }));

    exportToExcel(dataToExport, "Historico_Movimentacoes_CPUs.xlsx", "Histórico");
  };

  return (
    <div className="history-manager">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3 history-header">
        <div>
          <h2>Histórico de Movimentações</h2>
          <p className="text-muted">Veja o registro de todas as alterações de localidade, nomes e configurações das CPUs.</p>
        </div>
        <div className="flex gap-2 flex-wrap history-actions">
          <label className="primary badge cursor-pointer" style={{padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', margin: 0}}>
            Importar Excel
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              style={{display: 'none'}} 
            />
          </label>
          <button onClick={handleExport} className="primary badge" style={{padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', border: 'none'}}>
            Exportar Excel ({filteredHistory.length})
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Auditoria & PAs */}
      <div className="card history-filters-card mb-4">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: 'var(--text-color)' }}>
              Filtros de Auditoria & PAs
            </h3>
            <span className="text-muted text-xs" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              {filteredHistory.length} de {cpuHistory.length} logs
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-sm btn-secondary"
              style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '4px' }}
              title="Restaurar visualização completa"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="flex gap-3 items-center flex-wrap history-filter-controls">
          {/* Busca por PA ou CPU */}
          <input
            type="text"
            placeholder="Pesquisar por PA (ex: PA 76), CPU ou detalhe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="premium-input"
            style={{ flex: '1.4 1 210px', minWidth: '200px' }}
          />

          {/* Seletor de PA / Sala */}
          <select
            value={filterPa}
            onChange={(e) => setFilterPa(e.target.value)}
            className="premium-input"
            style={{ flex: '1.2 1 180px', minWidth: '170px' }}
            title="Filtrar por PA ou Sala específica"
          >
            <option value="todas">Todas as PAs e Salas</option>
            {Object.entries(paListByRoom).map(([roomName, pas]) => (
              <optgroup key={roomName} label={`Sala ${roomName}`}>
                <option value={`sala:${roomName}`}>Toda a Sala {roomName}</option>
                {pas.map(pa => (
                  <option key={`${roomName} - ${pa}`} value={`${roomName} - ${pa}`}>
                    {roomName} - {pa}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Seletor de Tipo de Ação */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="premium-input"
            style={{ flex: '1 1 160px', minWidth: '150px' }}
            title="Filtrar por tipo de ação/evento"
          >
            <option value="todas">Todos os Tipos de Log</option>
            <option value="Movimentação PA">Movimentações de PA</option>
            <option value="Troca de PA (Swap)">Trocas de PA (Swap)</option>
            <option value="Alteração de Código">Alterações de Código (Nome)</option>
            <option value="Alteração de Pertence">Alterações de Pertence</option>
            <option value="Devolução ao Estoque">Devoluções ao Estoque</option>
          </select>
        </div>
      </div>
      
      <div className="card">
        <div className="table-responsive">
          <table className="history-table w-full">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>CPU</th>
                <th>Ação / Evento</th>
                <th>Origem</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map(entry => (
                  <tr key={entry.id}>
                    <td style={{whiteSpace: 'nowrap'}}>{formatDate(entry.date)}</td>
                    <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{entry.cpuCode || '-'}</strong></td>
                    <td>
                      <span className={`history-action-badge ${getActionClass(entry.action)}`}>
                        {entry.action || 'Movimentação'}
                      </span>
                      {entry.details && (
                        <span className="history-details-text">
                          {entry.details}
                        </span>
                      )}
                    </td>
                    <td><span className="badge badge-outline">{entry.from || '-'}</span></td>
                    <td><span className="badge badge-outline">{entry.to || '-'}</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted" style={{padding: '2rem'}}>
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
