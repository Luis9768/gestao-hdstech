import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function Settings({ cpus, rooms, history, usersList, headsetStock, headsetDefects, headsetHistory }) {
  
  const handleMasterBackup = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // 1. CPUs
      const cpusSheet = XLSX.utils.json_to_sheet((cpus || []).map(c => ({
        'ID PATRIMÔNIO': c.id,
        'NOME (ANYDESK)': c.name,
        'LOCALIZAÇÃO': c.location === 'estoque' ? 'Estoque' : c.location,
        'DATA REGISTRO': c.date
      })));
      XLSX.utils.book_append_sheet(workbook, cpusSheet, "CPUs e Equipamentos");

      // 2. Salas
      const roomsSheet = XLSX.utils.json_to_sheet((rooms || []).map(r => ({
        'NOME DA SALA': r.name,
        'Nº PA(s) LIGADAS': r.pas.length
      })));
      XLSX.utils.book_append_sheet(workbook, roomsSheet, "Salas");

      // 3. Estoque Headsets
      const headsetStockSheet = XLSX.utils.json_to_sheet((headsetStock || []).map(s => ({
        'MARCA / MODELO': s.brand,
        'QUANTIDADE FUNCIONAL': s.quantity
      })));
      XLSX.utils.book_append_sheet(workbook, headsetStockSheet, "Estoque de Headsets");

      // 4. Headsets Danificados (Caixas)
      const headsetDefectsSheet = XLSX.utils.json_to_sheet((headsetDefects || []).map(d => ({
        'DATA REGISTRO': d.date,
        'DATA RETORNO': d.returnDate || '-',
        'MODELO': d.brand,
        'DEFEITO': d.defect,
        'STATUS': d.status,
        'CAIXA': d.box
      })));
      XLSX.utils.book_append_sheet(workbook, headsetDefectsSheet, "Headsets Danificados");

      // 5. Histórico CPUs
      const histCpusSheet = XLSX.utils.json_to_sheet((history || []).map(h => ({
        'DATA/HORA': h.date,
        'AÇÃO': h.action,
        'EQUIPAMENTO': h.cpu,
        'ORIGEM': h.from,
        'DESTINO': h.to
      })));
      XLSX.utils.book_append_sheet(workbook, histCpusSheet, "Histórico CPUs");

      // 6. Histórico Headsets
      const histHeadsetsSheet = XLSX.utils.json_to_sheet((headsetHistory || []).map(h => ({
        'DATA/HORA': h.date,
        'AÇÃO': h.action,
        'MARCA / MODELO': h.brand,
        'QUANTIDADE': h.qty,
        'DETALHES': h.details
      })));
      XLSX.utils.book_append_sheet(workbook, histHeadsetsSheet, "Histórico Headsets");

      // 7. Usuários
      const usersSheet = XLSX.utils.json_to_sheet((usersList || []).map(u => ({
        'NOME': u.name,
        'EMAIL': u.email,
        'NÍVEL DE ACESSO': u.role === 'admin' ? 'Administrador' : 'Comum'
      })));
      XLSX.utils.book_append_sheet(workbook, usersSheet, "Usuários do Sistema");

      // Generate File Name with Date
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
      
      XLSX.writeFile(workbook, `Backup_Master_GestaoCPUs_${dateStr}.xlsx`);
      alert("✅ Backup Mestre exportado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("❌ Ocorreu um erro ao gerar o backup master.");
    }
  };

  return (
    <div className="settings-manager">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2>Configurações do Sistema</h2>
          <p className="text-muted">Ajustes gerais, backup e status da conexão.</p>
        </div>
      </div>
      
      <div className="flex gap-6 flex-wrap">
        {/* Connection Status */}
        <div className="glass-card flex-1" style={{minWidth: '350px'}}>
          <h3 className="mb-4">Conexão e Nuvem</h3>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4" style={{padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px'}}>
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%', 
                background: '#22c55e', boxShadow: '0 0 10px #22c55e',
                animation: 'pulse 2s infinite'
              }}></div>
              <div>
                <strong style={{color: '#22c55e', display: 'block'}}>Conexão em Tempo Real Ativa</strong>
                <span className="text-sm text-muted">Todos os dados são salvos instantaneamente na nuvem. O banco de dados está operando em tempo real.</span>
              </div>
            </div>
            <div style={{padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-color)'}}>
              <h4 style={{marginBottom: '8px', color: 'var(--primary-color)'}}>Como funciona?</h4>
              <ul style={{marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <li>Toda vez que você realizar uma ação, a nuvem é atualizada na mesma hora.</li>
                <li>Sua equipe inteira pode acessar simultaneamente e ver as mudanças ao vivo.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Master Backup */}
        <div className="glass-card flex-1" style={{minWidth: '350px'}}>
          <h3 className="mb-4">Backup Mestre (Exportação)</h3>
          <p className="text-muted mb-6">
            Gere uma planilha Excel completa contendo <strong>todas as informações</strong> do sistema divididas por abas (CPUs, Salas, Headsets, Histórico de Movimentações, etc.).
          </p>
          <div style={{padding: '24px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', textAlign: 'center'}}>
            <button 
              onClick={handleMasterBackup}
              className="primary btn-glow" 
              style={{padding: '16px 32px', fontSize: '1.1rem', width: '100%'}}
            >
              📥 Baixar Master Backup (.xlsx)
            </button>
            <p className="text-sm text-muted mt-4">
              Recomendamos fazer o download deste backup uma vez por mês como segurança extra offline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
