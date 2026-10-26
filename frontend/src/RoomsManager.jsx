import { useState, useEffect, useMemo, useRef } from 'react';
import { moveCpuToPa, swapCpusBetweenPas, removeCpuToStock } from './services/cpuMovementService';
import './RoomsManager.css';

// Minimalist vector icons (SVG - sem emojis, estética Vercel / Linear)
function IconMonitor({ size = 14, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

function IconShield({ size = 14, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}

function IconSearch({ size = 13, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
  );
}

function IconPlus({ size = 12, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flexShrink: 0 }}>
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  );
}


export default function RoomsManager({ cpus, setCpus, rooms, setRooms, history, setHistory, updateData }) {
  const [selectedRoom, setSelectedRoom] = useState(() => {
    try {
      const savedRoomId = localStorage.getItem('gestao-cpus-selected-room-id');
      if (savedRoomId && rooms && rooms.length > 0) {
        const found = rooms.find(r => String(r.id) === String(savedRoomId));
        if (found) return found;
      }
    } catch (e) {
      console.warn('Falha ao restaurar sala persistida:', e);
    }
    return rooms?.[0] || null;
  });
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(24);

  // Modais de Operação
  const [viewingCpuModal, setViewingCpuModal] = useState(null);
  const [swapModalData, setSwapModalData] = useState(null);
  const [pertenceModalData, setPertenceModalData] = useState(null);
  const [replaceModalData, setReplaceModalData] = useState(null);

  // Feedback de Drag
  const [dragOverPa, setDragOverPa] = useState(null); // 'pa-0' ou 'sup-0'
  const [dragOverRoomId, setDragOverRoomId] = useState(null);
  const roomHoverTimerRef = useRef(null);

  // Auto-scroll durante o Drag and Drop (Faz a tela subir/descer suavemente ao arrastar perto das bordas)
  const scrollAnimRef = useRef(null);
  const scrollSpeedRef = useRef(0);

  useEffect(() => {
    const container = document.querySelector('.main-content');
    if (!container) return;

    const startScrollLoop = () => {
      if (scrollAnimRef.current) return;
      const step = () => {
        if (scrollSpeedRef.current !== 0) {
          container.scrollTop += scrollSpeedRef.current;
          scrollAnimRef.current = requestAnimationFrame(step);
        } else {
          scrollAnimRef.current = null;
        }
      };
      scrollAnimRef.current = requestAnimationFrame(step);
    };

    const stopScrollLoop = () => {
      scrollSpeedRef.current = 0;
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
    };

    const handleWindowDragOver = (e) => {
      const rect = container.getBoundingClientRect();
      const topThreshold = rect.top + 130;
      const bottomThreshold = rect.bottom - 130;

      if (e.clientY < topThreshold) {
        // Perto do topo: rola para cima suavemente
        const intensity = Math.min(1, Math.max(0.15, (topThreshold - e.clientY) / 130));
        scrollSpeedRef.current = -Math.round(4 + intensity * 22);
        startScrollLoop();
      } else if (e.clientY > bottomThreshold) {
        // Perto do rodapé: rola para baixo suavemente
        const intensity = Math.min(1, Math.max(0.15, (e.clientY - bottomThreshold) / 130));
        scrollSpeedRef.current = Math.round(4 + intensity * 22);
        startScrollLoop();
      } else {
        stopScrollLoop();
      }
    };

    const handleWindowDragEnd = () => {
      stopScrollLoop();
    };

    window.addEventListener('dragover', handleWindowDragOver, { passive: true });
    window.addEventListener('dragend', handleWindowDragEnd);
    window.addEventListener('drop', handleWindowDragEnd);

    return () => {
      stopScrollLoop();
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragend', handleWindowDragEnd);
      window.removeEventListener('drop', handleWindowDragEnd);
    };
  }, []);

  // Busca e Filtros Rápidos na Sala
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!rooms || rooms.length === 0) return;
    try {
      const savedRoomId = localStorage.getItem('gestao-cpus-selected-room-id');
      setSelectedRoom(prev => {
        if (!prev) {
          const found = savedRoomId ? rooms.find(r => String(r.id) === String(savedRoomId)) : null;
          return found || rooms[0];
        }
        const refreshed = rooms.find(r => r.id === prev.id);
        return refreshed || prev;
      });
    } catch {
      setSelectedRoom(prev => prev || rooms[0]);
    }
  }, [rooms]);

  useEffect(() => {
    if (selectedRoom?.id) {
      try {
        localStorage.setItem('gestao-cpus-selected-room-id', String(selectedRoom.id));
      } catch {
        // Ignora erros de quota de localStorage
      }
    }
  }, [selectedRoom?.id]);

  const getStartingPaNumber = (roomId) => {
    let count = 1;
    for (let r of rooms) {
      if (r.id === roomId) break;
      count += r.capacity;
    }
    return count;
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return alert("O nome da sala é obrigatório.");
    if (rooms.some(r => r.name.toLowerCase() === newRoomName.toLowerCase().trim())) {
      return alert("Já existe uma sala com este nome.");
    }
    
    const maxId = rooms.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
    const newRoom = {
      id: maxId + 1,
      name: newRoomName.trim(),
      capacity: Number(newRoomCapacity),
      paStatus: []
    };

    const updatedRooms = [...rooms, newRoom];
    setRooms(updatedRooms);
    updateData({ rooms: updatedRooms });
    setSelectedRoom(newRoom);
    
    setNewRoomName('');
    setNewRoomCapacity(24);
    setIsAddingRoom(false);
  };

  const handleDeleteRoom = () => {
    if (!selectedRoom) return;
    const activeCpus = (selectedRoom.paStatus || []).filter(p => p && p.cpuId);
    if (activeCpus.length > 0) {
      return alert("Você não pode excluir uma sala que contém CPUs. Remova as máquinas primeiro.");
    }
    if (confirm(`Tem certeza que deseja excluir a sala "${selectedRoom.name}"?`)) {
      const updatedRooms = rooms.filter(r => r.id !== selectedRoom.id);
      setRooms(updatedRooms);
      updateData({ rooms: updatedRooms });
      setSelectedRoom(updatedRooms[0] || null);
    }
  };

  const getSupervisionCount = (room) => {
    if (!room || !room.paStatus || !Array.isArray(room.paStatus)) return 0;
    const meta = room.paStatus.find(p => p && p.isMeta);
    if (meta && typeof meta.supervisionCount === 'number') {
      return meta.supervisionCount;
    }
    const supEntries = room.paStatus.filter(p => p && p.isSupervision);
    if (supEntries.length === 0) return 0;
    return Math.max(...supEntries.map(p => p.index)) + 1;
  };

  const addPa = () => {
    if (!selectedRoom) return;
    const newRooms = rooms.map(r => {
      if (r.id === selectedRoom.id) {
        return { ...r, capacity: r.capacity + 1 };
      }
      return r;
    });
    setRooms(newRooms);
    updateData({ rooms: newRooms });
    setSelectedRoom(newRooms.find(r => r.id === selectedRoom.id));
  };

  const removePa = () => {
    if (!selectedRoom) return;
    if (selectedRoom.capacity <= 1) return;
    
    const isOccupied = (selectedRoom.paStatus || []).some(
      p => p && !p.isSupervision && !p.isMeta && p.index === selectedRoom.capacity - 1 && p.cpuId
    );
    if (isOccupied) {
      alert("A última PA está ocupada. Mova a CPU antes de remover a PA.");
      return;
    }

    const newRooms = rooms.map(r => {
      if (r.id === selectedRoom.id) {
        return { ...r, capacity: r.capacity - 1 };
      }
      return r;
    });
    setRooms(newRooms);
    updateData({ rooms: newRooms });
    setSelectedRoom(newRooms.find(r => r.id === selectedRoom.id));
  };

  const addSupervisionPa = () => {
    if (!selectedRoom) return;
    const currentCount = getSupervisionCount(selectedRoom);
    const newCount = currentCount + 1;

    const updatedPaStatus = [
      ...(selectedRoom.paStatus || []).filter(p => p && !p.isMeta),
      { isMeta: true, supervisionCount: newCount }
    ];

    const newRooms = rooms.map(r => r.id === selectedRoom.id ? { ...r, paStatus: updatedPaStatus } : r);
    setRooms(newRooms);
    updateData({ rooms: newRooms });
    setSelectedRoom(newRooms.find(r => r.id === selectedRoom.id));
  };

  const removeSupervisionPa = () => {
    if (!selectedRoom) return;
    const currentCount = getSupervisionCount(selectedRoom);
    if (currentCount <= 0) return;

    const isLastOccupied = (selectedRoom.paStatus || []).some(
      p => p && p.isSupervision && p.index === currentCount - 1 && p.cpuId
    );
    if (isLastOccupied) {
      alert("A última PA de Supervisão está ocupada. Remova a máquina antes de excluir a PA.");
      return;
    }

    const newCount = currentCount - 1;
    const updatedPaStatus = (selectedRoom.paStatus || [])
      .filter(p => p && !p.isMeta && !(p.isSupervision && p.index >= newCount));
    
    if (newCount > 0) {
      updatedPaStatus.push({ isMeta: true, supervisionCount: newCount });
    }

    const newRooms = rooms.map(r => r.id === selectedRoom.id ? { ...r, paStatus: updatedPaStatus } : r);
    setRooms(newRooms);
    updateData({ rooms: newRooms });
    setSelectedRoom(newRooms.find(r => r.id === selectedRoom.id));
  };

  // Remoção rápida de máquina para o estoque
  const handleRemoveCpuFromPa = (cpuId) => {
    const res = removeCpuToStock({ cpus, rooms, history, cpuId });
    if (!res) return;

    setCpus(res.cpus);
    setRooms(res.rooms);
    setHistory(res.history);
    updateData(res);
  };

  // Drag and Drop Avançado (Suporta PA -> PA e Estoque -> PA)
  const handleDragStart = (e, cpuId, sourcePaIndex = null, sourceIsSupervision = false) => {
    e.dataTransfer.setData("cpuId", String(cpuId));
    if (sourcePaIndex !== null) {
      e.dataTransfer.setData("sourcePaIndex", String(sourcePaIndex));
      e.dataTransfer.setData("sourceRoomId", String(selectedRoom.id));
      e.dataTransfer.setData("sourceIsSupervision", String(sourceIsSupervision));
    }
  };

  const handleDragOver = (e, slotKey) => {
    e.preventDefault();
    if (dragOverPa !== slotKey) {
      setDragOverPa(slotKey);
    }
  };

  
  const handleDragOverRoom = (e, roomId) => {
    e.preventDefault();
    if (dragOverRoomId !== roomId) {
      setDragOverRoomId(roomId);
    }
    // Hover por 500ms troca a sala ativa durante o drag
    if (!roomHoverTimerRef.current && selectedRoom?.id !== roomId) {
      roomHoverTimerRef.current = setTimeout(() => {
        const target = rooms.find(r => r.id === roomId);
        if (target) setSelectedRoom(target);
        roomHoverTimerRef.current = null;
      }, 500);
    }
  };

  const handleDragLeaveRoom = () => {
    setDragOverRoomId(null);
    if (roomHoverTimerRef.current) {
      clearTimeout(roomHoverTimerRef.current);
      roomHoverTimerRef.current = null;
    }
  };

  const handleDropOnRoom = (e, targetRoom) => {
    e.preventDefault();
    setDragOverRoomId(null);
    if (roomHoverTimerRef.current) {
      clearTimeout(roomHoverTimerRef.current);
      roomHoverTimerRef.current = null;
    }

    const rawCpuId = e.dataTransfer.getData("cpuId");
    if (!rawCpuId) return;

    const sourceCpu = cpus.find(c => String(c.id) === String(rawCpuId));
    if (!sourceCpu || !targetRoom) return;

    // Se já estiver nesta mesma sala, apenas seleciona
    if (selectedRoom?.id === targetRoom.id) {
      return;
    }

    // Encontrar primeiro posto livre na sala de destino (operacional primeiro, depois supervisão)
    const occupiedIndices = new Set(
      (targetRoom.paStatus || [])
        .filter(p => p && !p.isSupervision && !p.isMeta && p.cpuId)
        .map(p => p.index)
    );

    let targetPaIndex = -1;
    let targetIsSupervision = false;

    for (let i = 0; i < (targetRoom.capacity || 0); i++) {
      if (!occupiedIndices.has(i)) {
        targetPaIndex = i;
        break;
      }
    }

    // Se todos os operacionais estiverem ocupados, checar supervisão
    if (targetPaIndex === -1) {
      const supCount = getSupervisionCount(targetRoom);
      const occupiedSup = new Set(
        (targetRoom.paStatus || [])
          .filter(p => p && p.isSupervision && p.cpuId)
          .map(p => p.index)
      );
      for (let i = 0; i < supCount; i++) {
        if (!occupiedSup.has(i)) {
          targetPaIndex = i;
          targetIsSupervision = true;
          break;
        }
      }
    }

    // Se a sala de destino estiver completamente lotada
    if (targetPaIndex === -1) {
      alert(`A sala "${targetRoom.name}" está cheia (todas as PAs estão ocupadas).`);
      return;
    }

    // Se o pertence da CPU for diferente da sala de destino, abre o modal de confirmação de pertence
    if (sourceCpu.acquisition && sourceCpu.acquisition.toLowerCase() !== targetRoom.name.toLowerCase()) {
      setPertenceModalData({
        sourceCpu,
        targetRoomId: targetRoom.id,
        targetPaIndex,
        targetIsSupervision,
        currentAcq: sourceCpu.acquisition,
        destRoomName: targetRoom.name
      });
      setSelectedRoom(targetRoom);
      return;
    }

    // Caso contrário, transfere diretamente para a sala de destino
    const res = moveCpuToPa({
      cpus,
      rooms,
      history,
      cpuId: sourceCpu.id,
      targetRoomId: targetRoom.id,
      targetPaIndex,
      isSupervision: targetIsSupervision,
      newAcquisition: targetRoom.name
    });

    if (res) {
      setCpus(res.cpus);
      setRooms(res.rooms);
      setHistory(res.history);
      updateData(res);
      const updated = res.rooms.find(r => r.id === targetRoom.id);
      if (updated) setSelectedRoom(updated);
    }
  };

  const handleDragLeave = () => {
    setDragOverPa(null);
  };

  const handleDrop = (e, targetPaIndex, targetIsSupervision = false) => {
    e.preventDefault();
    setDragOverPa(null);

    const rawCpuId = e.dataTransfer.getData("cpuId");
    if (!rawCpuId) return;

    const sourcePaIndexRaw = e.dataTransfer.getData("sourcePaIndex");
    const sourceRoomIdRaw = e.dataTransfer.getData("sourceRoomId");
    const sourceIsSupervision = e.dataTransfer.getData("sourceIsSupervision") === "true";

    const isFromPa = sourcePaIndexRaw !== "" && sourcePaIndexRaw !== undefined && sourcePaIndexRaw !== null;
    const sourcePaIndex = isFromPa ? Number(sourcePaIndexRaw) : null;
    const sourceRoomId = sourceRoomIdRaw ? Number(sourceRoomIdRaw) : null;

    const sourceCpu = cpus.find(c => String(c.id) === String(rawCpuId));
    if (!sourceCpu || !selectedRoom) return;

    // Verificar se a PA de destino já está ocupada
    const targetOccupantEntry = (selectedRoom.paStatus || []).find(
      p => p && p.index === targetPaIndex && Boolean(p.isSupervision) === Boolean(targetIsSupervision) && p.cpuId
    );
    const targetOccupantCpu = targetOccupantEntry
      ? cpus.find(c => String(c.id) === String(targetOccupantEntry.cpuId))
      : null;

    // CENÁRIO 1: PA de destino ocupada
    if (targetOccupantCpu) {
      if (isFromPa) {
        // Se soltou sobre si mesmo na mesma PA, não faz nada
        if (sourceRoomId === selectedRoom.id && sourcePaIndex === targetPaIndex && sourceIsSupervision === targetIsSupervision) {
          return;
        }
        // ABRIR AVISO / MODAL DE SWAP (SEMPRE PERGUNTA)
        setSwapModalData({
          sourceCpu,
          targetCpu: targetOccupantCpu,
          sourceRoomId,
          targetRoomId: selectedRoom.id,
          sourcePaIndex,
          targetPaIndex,
          sourceIsSupervision,
          targetIsSupervision
        });
        return;
      } else {
        // Veio do estoque para uma PA ocupada: ABRIR AVISO DE SUBSTITUIÇÃO
        setReplaceModalData({
          sourceCpu,
          targetCpu: targetOccupantCpu,
          targetPaIndex,
          targetIsSupervision
        });
        return;
      }
    }

    // CENÁRIO 2: PA de destino está VAZIA
    // Verificar se o pertence da CPU coincide com a sala de destino
    const cpuAcq = (sourceCpu.acquisition || '').toLowerCase().trim();
    const roomName = (selectedRoom.name || '').toLowerCase().trim();

    if (cpuAcq && roomName && cpuAcq !== roomName && cpuAcq !== 'estoque') {
      // ABRIR AVISO DE TRANSFERÊNCIA DE PERTENCE (SEMPRE PERGUNTA)
      setPertenceModalData({
        sourceCpu,
        targetPaIndex,
        targetIsSupervision,
        targetRoomId: selectedRoom.id,
        currentAcq: sourceCpu.acquisition,
        destRoomName: selectedRoom.name
      });
      return;
    }

    // Pertence coincide ou não requer confirmação: move direto
    const res = moveCpuToPa({
      cpus,
      rooms,
      history,
      cpuId: sourceCpu.id,
      targetRoomId: selectedRoom.id,
      targetPaIndex,
      isSupervision: targetIsSupervision
    });

    if (res) {
      setCpus(res.cpus);
      setRooms(res.rooms);
      setHistory(res.history);
      updateData(res);
      const updated = res.rooms.find(r => r.id === selectedRoom.id);
      if (updated) setSelectedRoom(updated);
    }
  };

  // Confirmar SWAP entre duas PAs
  const confirmSwap = () => {
    if (!swapModalData) return;
    const res = swapCpusBetweenPas({
      cpus,
      rooms,
      history,
      sourceCpuId: swapModalData.sourceCpu.id,
      targetCpuId: swapModalData.targetCpu.id,
      sourceRoomId: swapModalData.sourceRoomId,
      targetRoomId: swapModalData.targetRoomId,
      sourcePaIndex: swapModalData.sourcePaIndex,
      targetPaIndex: swapModalData.targetPaIndex,
      sourceIsSupervision: swapModalData.sourceIsSupervision,
      targetIsSupervision: swapModalData.targetIsSupervision
    });

    if (res) {
      setCpus(res.cpus);
      setRooms(res.rooms);
      setHistory(res.history);
      updateData(res);
    }
    setSwapModalData(null);
  };

  // Confirmar Substituição de máquina vinda do estoque
  const confirmReplaceFromStock = () => {
    if (!replaceModalData) return;
    const { sourceCpu, targetCpu, targetPaIndex, targetIsSupervision } = replaceModalData;

    // 1. Devolver a máquina anterior ao estoque
    const step1 = removeCpuToStock({ cpus, rooms, history, cpuId: targetCpu.id });
    if (!step1) return;

    // 2. Alocar a nova máquina na PA
    const step2 = moveCpuToPa({
      cpus: step1.cpus,
      rooms: step1.rooms,
      history: step1.history,
      cpuId: sourceCpu.id,
      targetRoomId: selectedRoom.id,
      targetPaIndex,
      isSupervision: targetIsSupervision
    });

    if (step2) {
      setCpus(step2.cpus);
      setRooms(step2.rooms);
      setHistory(step2.history);
      updateData(step2);
    }
    setReplaceModalData(null);
  };

  // Confirmar Transferência de Pertence
  const handlePertenceDecision = (shouldTransfer) => {
    if (!pertenceModalData) return;
    const { sourceCpu, targetRoomId, targetPaIndex, targetIsSupervision, destRoomName } = pertenceModalData;

    const res = moveCpuToPa({
      cpus,
      rooms,
      history,
      cpuId: sourceCpu.id,
      targetRoomId: targetRoomId || selectedRoom.id,
      targetPaIndex,
      isSupervision: targetIsSupervision,
      newAcquisition: shouldTransfer ? destRoomName : null
    });

    if (res) {
      setCpus(res.cpus);
      setRooms(res.rooms);
      setHistory(res.history);
      updateData(res);
    }
    setPertenceModalData(null);
  };

  // Alterar Pertence da máquina diretamente no Modal de Detalhes com 1 clique
    // Lista dinâmica de todas as operações conhecidas
  const availableAcquisitions = useMemo(() => {
    const set = new Set();
    rooms.forEach(r => { if (r.name) set.add(r.name.trim()); });
    cpus.forEach(c => { if (c.acquisition) set.add(c.acquisition.trim()); });
    set.add('Estoque');
    return Array.from(set).filter(Boolean);
  }, [rooms, cpus]);

  // Alterar Pertence de uma CPU de forma rápida (1 clique)
  const handleUpdateCpuAcquisition = (cpuId, newAcq) => {
    if (!cpuId || !newAcq) return;
    const targetCpu = cpus.find(c => String(c.id) === String(cpuId));
    if (!targetCpu) return;

    const cleanAcq = newAcq.trim();
    if (targetCpu.acquisition === cleanAcq) return;

    const updatedCpus = cpus.map(c => 
      String(c.id) === String(cpuId) ? { ...c, acquisition: cleanAcq } : c
    );

    const historyEntry = {
      id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
      date: new Date().toISOString(),
      cpuCode: targetCpu.code,
      from: targetCpu.location,
      to: targetCpu.location,
      action: 'Alteração de Pertence',
      details: `Pertence alterado de [${targetCpu.acquisition || 'N/A'}] para [${cleanAcq}]`
    };

    const newHistory = [historyEntry, ...history];
    setCpus(updatedCpus);
    setHistory(newHistory);
    updateData({ cpus: updatedCpus, history: newHistory });

    setViewingCpuModal(prev => prev && String(prev.cpu?.id) === String(cpuId) 
      ? { ...prev, cpu: { ...prev.cpu, acquisition: cleanAcq } } 
      : null
    );
  };

  return (
    <div className="rooms-manager flex flex-col gap-4">
      {/* Top Header com Tabs das Salas */}
      <div className="flex justify-between items-center flex-wrap gap-4 rooms-header">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
            Gestão de Salas & Posições
          </h2>
          <p className="text-muted text-sm">Monitore a ocupação e movimente máquinas livremente entre as PAs.</p>
        </div>

        <div className="room-buttons-scroll">
          {rooms.map(r => (
            <button 
              key={r.id} 
              className={`room-tab-btn ${selectedRoom?.id === r.id ? 'active' : ''} ${dragOverRoomId === r.id ? 'drag-target-room' : ''}`}
              onClick={() => setSelectedRoom(r)}
              onDragOver={(e) => handleDragOverRoom(e, r.id)}
              onDragLeave={handleDragLeaveRoom}
              onDrop={(e) => handleDropOnRoom(e, r)}
              title={`Clique para ver a sala ou arraste uma CPU aqui para transferir para ${r.name}`}
            >
              {r.name}
            </button>
          ))}
          <button 
            onClick={() => setIsAddingRoom(true)} 
            className="room-tab-btn"
            style={{ border: '1px dashed rgba(124, 58, 237, 0.5)', color: '#c084fc' }}
          >
            + Nova Sala
          </button>
        </div>
      </div>

      {/* Formulário para Adicionar Nova Sala */}
      {isAddingRoom && (
        <div className="card mb-4" style={{ border: '1px solid var(--border-active)' }}>
          <h3 className="mb-4" style={{ fontSize: '1.1rem', color: '#ffffff' }}>Adicionar Nova Sala</h3>
          <form onSubmit={handleAddRoom} className="flex gap-4 flex-wrap items-end">
            <div className="input-group" style={{ flex: 2, minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Nome da Sala
              </label>
              <input 
                required 
                type="text" 
                className="premium-input" 
                placeholder="Ex: Baby, Sala 3, etc." 
                value={newRoomName} 
                onChange={e => setNewRoomName(e.target.value)} 
              />
            </div>
            <div className="input-group" style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Capacidade de PAs
              </label>
              <input 
                required 
                type="number" 
                className="premium-input" 
                min="1" 
                max="100" 
                value={newRoomCapacity} 
                onChange={e => setNewRoomCapacity(e.target.value)} 
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setIsAddingRoom(false)}>
                Cancelar
              </button>
              <button type="submit" className="primary">
                Salvar Sala
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visão da Sala Selecionada */}
      {selectedRoom && (() => {
        const supervisionCount = getSupervisionCount(selectedRoom);
        const totalCapacity = selectedRoom.capacity || 0;
        const totalSlotsCount = totalCapacity + supervisionCount;
        const roomOccupiedCpus = (selectedRoom.paStatus || []).filter(p => p && p.cpuId);
        const occupiedCount = roomOccupiedCpus.length;
        const freeCount = Math.max(0, totalSlotsCount - occupiedCount);
        const occupancyRate = totalSlotsCount > 0 ? Math.round((occupiedCount / totalSlotsCount) * 100) : 0;

        return (
          <div className="card room-view">
            {/* Toolbar Unificada Estilo Linear / Vercel */}
            <div className="room-toolbar-container">
              <div className="room-title-area">
                <div className="room-title-badge">
                  
                  <h3 className="room-name-text">{selectedRoom.name}</h3>
                </div>
                <span className="room-meta-pill">
                  {selectedRoom.capacity} PAs Operacionais
                </span>
                {supervisionCount > 0 && (
                  <span className="room-meta-pill sup">
                    {supervisionCount} Supervisão
                  </span>
                )}
                <span 
                  className="room-meta-pill" 
                  style={{ 
                    color: occupancyRate >= 80 ? '#fbbf24' : '#c084fc',
                    borderColor: occupancyRate >= 80 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(124, 58, 237, 0.3)' 
                  }}
                >
                  {occupancyRate}% Ocupado ({occupiedCount}/{totalSlotsCount})
                </span>
              </div>

              <div className="room-action-toolbars">
                {/* Grupo 1: Postos Operacionais */}
                <div className="segmented-btn-group" title="Gerenciar Quantidade de PAs Operacionais">
                  <button onClick={removePa} className="segmented-btn" title="Remover última PA">
                    <span>−</span> PA
                  </button>
                  <button onClick={addPa} className="segmented-btn" title="Adicionar nova PA">
                    <span>+</span> PA
                  </button>
                </div>

                {/* Grupo 2: Postos de Supervisão */}
                <div className="segmented-btn-group" title="Gerenciar PAs de Gestão / Supervisão">
                  {supervisionCount > 0 && (
                    <button onClick={removeSupervisionPa} className="segmented-btn btn-sup" title="Remover PA de Supervisão">
                      <span>−</span> Sup
                    </button>
                  )}
                  <button onClick={addSupervisionPa} className="segmented-btn btn-sup" title="Adicionar PA de Supervisão">
                    <span>+</span> Supervisão
                  </button>
                </div>


                {/* Grupo 3: Ação de Exclusão da Sala */}
                <div className="segmented-btn-group">
                  <button onClick={handleDeleteRoom} className="segmented-btn danger-action" title="Excluir Sala Vazia">
                    Excluir Sala
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-toolbar: Filtros Rápidos & Busca Instantânea de Máquina */}
            <div className="room-filter-bar">
              <div className="room-filter-tabs">
                <button 
                  className={`room-filter-pill ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  Todas ({totalSlotsCount})
                </button>
                <button 
                  className={`room-filter-pill ${filterType === 'occupied' ? 'active' : ''}`}
                  onClick={() => setFilterType('occupied')}
                >
                  Ocupadas ({occupiedCount})
                </button>
                <button 
                  className={`room-filter-pill ${filterType === 'free' ? 'active' : ''}`}
                  onClick={() => setFilterType('free')}
                >
                  Livres ({freeCount})
                </button>
              </div>

              <div className="room-search-input-wrapper">
                <IconSearch size={13} className="room-search-icon" />
                <input 
                  type="text"
                  placeholder="Buscar CPU por código..."
                  className="room-search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Grid de PAs Operacionais */}
            <div className="pa-grid">
              {Array.from({ length: selectedRoom.capacity }).map((_, i) => {
                const globalPaNumber = getStartingPaNumber(selectedRoom.id) + i;
                const paItem = (selectedRoom.paStatus || []).find(p => p && !p.isSupervision && !p.isMeta && p.index === i);
                let cpuInfo = paItem ? cpus.find(c => String(c.id) === String(paItem.cpuId)) : null;

                // Fallback de resiliência: caso paStatus não contenha o slot, localiza pela location da CPU
                if (!cpuInfo) {
                  const padNum = String(globalPaNumber).padStart(2, '0');
                  cpuInfo = cpus.find(c => {
                    if (!c.location || c.location.toLowerCase() === 'estoque') return false;
                    const loc = c.location.toLowerCase();
                    const rName = (selectedRoom.name || '').toLowerCase();
                    return loc.includes(rName) && !loc.includes('sup') && (
                      loc.includes(`pa ${padNum}`) || loc.includes(`pa ${globalPaNumber}`)
                    );
                  }) || null;
                }
                const isLoan = cpuInfo && cpuInfo.acquisition && cpuInfo.acquisition.toLowerCase() !== selectedRoom.name.toLowerCase();

                // Regras de Filtro e Busca
                const matchesFilter = filterType === 'all' 
                  ? true 
                  : filterType === 'occupied' 
                    ? Boolean(cpuInfo) 
                    : !cpuInfo;

                const q = searchQuery.toLowerCase().trim();
                const matchesSearch = !q || (
                  cpuInfo && (
                    (cpuInfo.code && cpuInfo.code.toLowerCase().includes(q)) ||
                    (cpuInfo.acquisition && cpuInfo.acquisition.toLowerCase().includes(q)) ||
                    `pa ${globalPaNumber}`.includes(q)
                  )
                );

                const isDimmed = !matchesFilter || !matchesSearch;
                const slotKey = `pa-${i}`;
                const isOver = dragOverPa === slotKey;

                const isUnidentified = cpuInfo && (
                  !cpuInfo.code ||
                  cpuInfo.code.trim() === '' ||
                  cpuInfo.code.toLowerCase().includes('sem identi') ||
                  cpuInfo.code.toLowerCase().includes('sem id')
                );

                return (
                  <div 
                    key={i} 
                    className={`pa-slot ${cpuInfo ? 'occupied' : 'free'} ${isOver ? 'drag-over' : ''} ${isDimmed ? 'dimmed' : ''}`}
                    onDragOver={(e) => handleDragOver(e, slotKey)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, i, false)}
                    onClick={() => {
                      if (cpuInfo) {
                        setViewingCpuModal({ cpu: cpuInfo, paNumber: globalPaNumber, roomName: selectedRoom.name });
                      }
                    }}
                    style={{ cursor: cpuInfo ? 'pointer' : 'default' }}
                  >
                    <div className="pa-header">
                      <div className="pa-title-group">
                        <span className="pa-title">PA {String(globalPaNumber).padStart(2, '0')}</span>
                      </div>
                      {cpuInfo && (
                        <button 
                          className="pa-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCpuFromPa(cpuInfo.id);
                          }}
                          title="Devolver ao Estoque"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {cpuInfo ? (
                      <div 
                        className="cpu-drag-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, cpuInfo.id, i, false)}
                      >
                        <div className="cpu-code-row">
                          <IconMonitor size={14} className="cpu-icon-svg" />
                          <span 
                            className={`cpu-code ${isUnidentified ? 'unidentified' : ''}`} 
                            title={isUnidentified ? 'CPU sem identificação' : cpuInfo.code}
                          >
                            {isUnidentified ? 'CPU sem identificação' : cpuInfo.code}
                          </span>
                        </div>

                        {isLoan ? (
                          <span className="cpu-tag loan-badge" title={`Pertence original: ${cpuInfo.acquisition} (Empréstimo em ${selectedRoom.name})`}>
                            {cpuInfo.acquisition} → {selectedRoom.name}
                          </span>
                        ) : (
                          <span className="cpu-tag">{cpuInfo.acquisition || selectedRoom.name}</span>
                        )}
                      </div>
                    ) : (
                      <div className="pa-free-body">
                        <div className="pa-free-icon">
                          <IconPlus size={11} />
                        </div>
                        <span className="pa-empty-text">Livre</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid de PAs de Supervisão (Verde Esmeralda) */}
            {supervisionCount > 0 && (
              <div className="supervision-section-wrapper">
                <div className="supervision-header-row">
                  
                  <h4 className="supervision-header-title">
                    Posições de Gestão & Supervisão
                  </h4>
                  <span className="room-meta-pill sup">
                    {supervisionCount} {supervisionCount === 1 ? 'Posto' : 'Postos'}
                  </span>
                </div>

                <div className="pa-grid">
                  {Array.from({ length: supervisionCount }).map((_, i) => {
                    const supNumber = i + 1;
                    const paItem = (selectedRoom.paStatus || []).find(p => p && p.isSupervision && p.index === i);
                    let cpuInfo = paItem ? cpus.find(c => String(c.id) === String(paItem.cpuId)) : null;

                    // Fallback de resiliência: caso paStatus não contenha o posto de supervisão
                    if (!cpuInfo) {
                      const padSup = String(supNumber).padStart(2, '0');
                      cpuInfo = cpus.find(c => {
                        if (!c.location || c.location.toLowerCase() === 'estoque') return false;
                        const loc = c.location.toLowerCase();
                        const rName = (selectedRoom.name || '').toLowerCase();
                        return loc.includes(rName) && loc.includes('sup') && (
                          loc.includes(`sup ${padSup}`) || loc.includes(`sup ${supNumber}`)
                        );
                      }) || null;
                    }

                    const matchesFilter = filterType === 'all' 
                      ? true 
                      : filterType === 'occupied' 
                        ? Boolean(cpuInfo) 
                        : !cpuInfo;

                    const q = searchQuery.toLowerCase().trim();
                    const matchesSearch = !q || (
                      cpuInfo && (
                        (cpuInfo.code && cpuInfo.code.toLowerCase().includes(q)) ||
                        (cpuInfo.acquisition && cpuInfo.acquisition.toLowerCase().includes(q)) ||
                        `sup ${supNumber}`.includes(q)
                      )
                    );

                    const isDimmed = !matchesFilter || !matchesSearch;
                    const slotKey = `sup-${i}`;
                    const isOver = dragOverPa === slotKey;

                    const isUnidentified = cpuInfo && (
                  !cpuInfo.code ||
                  cpuInfo.code.trim() === '' ||
                  cpuInfo.code.toLowerCase().includes('sem identi') ||
                  cpuInfo.code.toLowerCase().includes('sem id')
                );

                    return (
                      <div 
                        key={`sup-${i}`}
                        className={`pa-slot supervision ${cpuInfo ? 'occupied' : 'free'} ${isOver ? 'drag-over' : ''} ${isDimmed ? 'dimmed' : ''}`}
                        onDragOver={(e) => handleDragOver(e, slotKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, i, true)}
                        onClick={() => {
                          if (cpuInfo) {
                            setViewingCpuModal({ cpu: cpuInfo, paNumber: `SUP ${String(supNumber).padStart(2, '0')}`, roomName: selectedRoom.name });
                          }
                        }}
                        style={{ cursor: cpuInfo ? 'pointer' : 'default' }}
                      >
                        <div className="pa-header">
                          <div className="pa-title-group">
                            <span className="pa-title sup-title">SUP {String(supNumber).padStart(2, '0')}</span>
                          </div>
                          {cpuInfo && (
                            <button 
                              className="pa-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCpuFromPa(cpuInfo.id);
                              }}
                              title="Devolver ao Estoque"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {cpuInfo ? (
                          <div 
                            className="cpu-drag-item"
                            draggable
                            onDragStart={(e) => handleDragStart(e, cpuInfo.id, i, true)}
                          >
                            <div className="cpu-code-row">
                              <IconShield size={14} className="cpu-icon-svg sup" />
                              <span 
                                className={`cpu-code ${isUnidentified ? 'unidentified' : ''}`} 
                                title={isUnidentified ? 'CPU sem identificação' : cpuInfo.code}
                              >
                                {isUnidentified ? 'CPU sem identificação' : cpuInfo.code}
                              </span>
                            </div>

                            <span className="cpu-tag sup-tag">{cpuInfo.acquisition || 'SUPERVISÃO'}</span>
                          </div>
                        ) : (
                          <div className="pa-free-body">
                            <div className="pa-free-icon sup">
                              <IconPlus size={11} />
                            </div>
                            <span className="pa-empty-text sup">Disponível</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* CPUs Disponíveis no Estoque */}
      <div className="card mt-2">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>CPUs Disponíveis no Estoque</h3>
            <p className="text-muted text-sm">Arraste uma máquina para alocar ou substituir em uma PA.</p>
          </div>
          <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-text)', fontWeight: 700 }}>
            {cpus.filter(c => c.location === 'estoque').length} livres
          </span>
        </div>

        <div className="flex gap-2" style={{ flexWrap: 'wrap', minHeight: '44px', alignItems: 'center' }}>
          {cpus.filter(c => c.location === 'estoque').map(cpu => (
            <div 
              key={cpu.id} 
              className="cpu-drag-item"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '8px',
                cursor: 'grab'
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, cpu.id)}
            >
              <strong style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>{(!cpu.code || cpu.code.trim() === '' || cpu.code.toLowerCase().includes('sem id') || cpu.code.toLowerCase().includes('sem identi')) ? 'CPU sem identificação' : cpu.code}</strong>
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(124, 58, 237, 0.2)', color: '#d8b4fe' }}>
                {cpu.acquisition}
              </span>
            </div>
          ))}
          {cpus.filter(c => c.location === 'estoque').length === 0 && (
            <span className="text-muted text-sm">Nenhuma CPU disponível no estoque no momento.</span>
          )}
        </div>
      </div>

      {/* =========================================================
       * MODAIS OBJETIVOS E DIRETOS (SEM TEXTOS PROLIXOS)
       * ========================================================= */}

      {/* 1. Modal de Confirmação de Troca (SWAP) */}
      {swapModalData && (
        <div className="modal-overlay" onClick={() => setSwapModalData(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Trocar Posições
            </h3>

            <div className="swap-preview-box">
              <div className="swap-side">
                <strong>{swapModalData.sourceCpu.code}</strong>
                <span>PA Origem</span>
              </div>
              <div className="swap-arrow-icon">⇄</div>
              <div className="swap-side">
                <strong>{swapModalData.targetCpu.code}</strong>
                <span>PA Destino</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center mt-4">
              <button className="btn-secondary" onClick={() => setSwapModalData(null)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button className="primary" onClick={confirmSwap} style={{ flex: 1 }}>
                Trocar CPUs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal de Confirmação de Transferência de Pertence */}
      {pertenceModalData && (
        <div className="modal-overlay" onClick={() => setPertenceModalData(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Definir Pertence
            </h3>
            <p className="text-muted text-sm mb-4">
              A CPU <strong>{pertenceModalData.sourceCpu.code}</strong> pertence a <strong style={{ color: '#f59e0b' }}>{pertenceModalData.currentAcq}</strong> e está indo para <strong style={{ color: '#c084fc' }}>{pertenceModalData.destRoomName}</strong>.
            </p>

            <div className="flex flex-col gap-2">
              <button 
                className="primary"
                onClick={() => handlePertenceDecision(true)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Transferir para {pertenceModalData.destRoomName}
              </button>
              <button 
                className="btn-secondary"
                onClick={() => handlePertenceDecision(false)}
                style={{ width: '100%', justifyContent: 'center', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
              >
                Manter {pertenceModalData.currentAcq} (Empréstimo)
              </button>
              <button 
                onClick={() => setPertenceModalData(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal de Substituição de Máquina do Estoque */}
      {replaceModalData && (
        <div className="modal-overlay" onClick={() => setReplaceModalData(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Substituir CPU na PA
            </h3>

            <div className="swap-preview-box">
              <div className="swap-side">
                <strong>{replaceModalData.sourceCpu.code}</strong>
                <span>Entra na PA</span>
              </div>
              <div className="swap-arrow-icon">→</div>
              <div className="swap-side">
                <strong>{replaceModalData.targetCpu.code}</strong>
                <span>Vai p/ Estoque</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center mt-4">
              <button className="btn-secondary" onClick={() => setReplaceModalData(null)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button className="primary" onClick={confirmReplaceFromStock} style={{ flex: 1 }}>
                Substituir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal de Detalhes da CPU com Edição Rápida de Pertence */}
      {viewingCpuModal && (
        <div className="modal-overlay" onClick={() => setViewingCpuModal(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Detalhes do Equipamento</h3>
              <button 
                onClick={() => setViewingCpuModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <div style={{ padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: '2px' }}>Código da CPU</span>
                <strong style={{ fontSize: '1.15rem', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                  {viewingCpuModal.cpu.code}
                </strong>
              </div>

              <div style={{ padding: '14px', background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div className="flex justify-between items-center mb-2">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pertence Oficial</label>
                  
                </div>

                <div className="flex gap-2">
                  <select
                    value={viewingCpuModal.cpu.acquisition || ''}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        const custom = prompt('Digite o novo nome de pertence:');
                        if (custom && custom.trim()) {
                          handleUpdateCpuAcquisition(viewingCpuModal.cpu.id, custom.trim());
                        }
                      } else if (e.target.value) {
                        handleUpdateCpuAcquisition(viewingCpuModal.cpu.id, e.target.value);
                      }
                    }}
                    className="premium-input"
                    style={{ fontWeight: 600, fontSize: '0.875rem' }}
                  >
                    {availableAcquisitions.map(acq => (
                      <option key={acq} value={acq}>
                        {acq} {acq === viewingCpuModal.roomName ? '(Sala Atual)' : ''}
                      </option>
                    ))}
                    <option value="__custom__">+ Outro / Novo Pertence...</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: '2px' }}>Localização na Planta</span>
                <strong style={{ color: '#22c55e' }}>
                  {viewingCpuModal.roomName} - {typeof viewingCpuModal.paNumber === 'string' ? viewingCpuModal.paNumber : `PA ${String(viewingCpuModal.paNumber).padStart(2, '0')}`}
                </strong>
              </div>
            </div>

            <button 
              className="btn-secondary" 
              onClick={() => setViewingCpuModal(null)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
