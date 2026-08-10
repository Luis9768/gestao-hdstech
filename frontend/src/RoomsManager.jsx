import { useState, useEffect } from 'react';
import './RoomsManager.css';

export default function RoomsManager({ cpus, setCpus, rooms, setRooms, history, setHistory, updateData }) {
  const [selectedRoom, setSelectedRoom] = useState(rooms[0] || null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(24);

  const [viewingCpuModal, setViewingCpuModal] = useState(null);

  useEffect(() => {
    if (!selectedRoom && rooms && rooms.length > 0) {
      setSelectedRoom(rooms[0]);
    }
  }, [rooms, selectedRoom]);

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
    if (rooms.some(r => r.name.toLowerCase() === newRoomName.toLowerCase())) {
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
    if (selectedRoom.paStatus.length > 0) {
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
    
    // Check if the last PA is occupied
    const isOccupied = (selectedRoom.paStatus || []).some(p => p && !p.isSupervision && !p.isMeta && p.index === selectedRoom.capacity - 1);
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

    const lastIndex = currentCount - 1;
    const isOccupied = (selectedRoom.paStatus || []).some(p => p && p.isSupervision && p.index === lastIndex);
    if (isOccupied) {
      alert("A última PA de Supervisão está ocupada. Mova a CPU antes de remover a PA.");
      return;
    }

    const newCount = currentCount - 1;
    const updatedPaStatus = [
      ...(selectedRoom.paStatus || []).filter(p => p && !p.isMeta && !(p.isSupervision && p.index === lastIndex)),
      { isMeta: true, supervisionCount: newCount }
    ];

    const newRooms = rooms.map(r => r.id === selectedRoom.id ? { ...r, paStatus: updatedPaStatus } : r);
    setRooms(newRooms);
    updateData({ rooms: newRooms });
    setSelectedRoom(newRooms.find(r => r.id === selectedRoom.id));
  };

  const buildHistoryList = (cpuCode, fromLoc, toLoc) => ([
    {
      id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
      date: new Date().toISOString(),
      cpuCode,
      from: fromLoc,
      to: toLoc
    },
    ...history
  ]);

  const handleCpuDrop = (cpuId, paIndex, isSupervision = false) => {
    const cpu = cpus.find(c => String(c.id) === String(cpuId));
    if (!cpu || !selectedRoom) return;

    // Check if PA is already occupied
    const isOccupied = (selectedRoom.paStatus || []).some(p => 
      isSupervision 
        ? (p && p.isSupervision && p.index === paIndex)
        : (p && !p.isSupervision && !p.isMeta && p.index === paIndex)
    );

    if (isOccupied) {
      alert("Esta PA já está ocupada!");
      return;
    }

    const oldLocation = cpu.location;
    let newLocation = '';

    if (isSupervision) {
      const supNumber = paIndex + 1;
      newLocation = `${selectedRoom.name} - SUP ${String(supNumber).padStart(2, '0')}`;
    } else {
      const globalPaNumber = getStartingPaNumber(selectedRoom.id) + paIndex;
      newLocation = `${selectedRoom.name} - PA ${String(globalPaNumber).padStart(2, '0')}`;
    }

    // Update CPU location
    const newCpus = cpus.map(c => String(c.id) === String(cpuId) ? { ...c, location: newLocation } : c);
    
    // Update Rooms
    let newRooms = [...rooms];
    
    // Remove from old room if applicable
    if (oldLocation !== 'estoque') {
       newRooms = newRooms.map(r => ({
           ...r,
           paStatus: (r.paStatus || []).filter(p => p && String(p.cpuId) !== String(cpuId))
       }));
    }

    // Add to new room
    newRooms = newRooms.map(r => {
       if (r.id === selectedRoom.id) {
           const currentPaStatus = (r.paStatus || []).filter(p => p && String(p.cpuId) !== String(cpuId));
           return { 
             ...r, 
             paStatus: [
               ...currentPaStatus, 
               { index: paIndex, isSupervision: Boolean(isSupervision), cpuId }
             ] 
           };
       }
       return r;
    });

    const newHistoryList = buildHistoryList(cpu.code, oldLocation, newLocation);

    setCpus(newCpus);
    setRooms(newRooms);
    setHistory(newHistoryList);
    setSelectedRoom(newRooms.find(r => r.id === selectedRoom.id));
    
    updateData({ cpus: newCpus, rooms: newRooms, history: newHistoryList });
  };

  const handleRemoveCpuFromPa = (cpuId) => {
    const cpu = cpus.find(c => String(c.id) === String(cpuId));
    if (!cpu || !selectedRoom) return;

    const oldLocation = cpu.location;
    const newLocation = 'estoque';

    const newCpus = cpus.map(c => String(c.id) === String(cpuId) ? { ...c, location: newLocation } : c);
    
    const newRooms = rooms.map(r => ({
        ...r,
        paStatus: (r.paStatus || []).filter(p => p && String(p.cpuId) !== String(cpuId))
    }));

    const newHistoryList = buildHistoryList(cpu.code, oldLocation, newLocation);

    setCpus(newCpus);
    setRooms(newRooms);
    setHistory(newHistoryList);
    setSelectedRoom(newRooms.find(r => r.id === selectedRoom.id));
    
    updateData({ cpus: newCpus, rooms: newRooms, history: newHistoryList });
  };

  const handleDragStart = (e, cpuId) => {
    e.dataTransfer.setData("cpuId", cpuId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, paIndex, isSupervision = false) => {
    e.preventDefault();
    const rawCpuId = e.dataTransfer.getData("cpuId");
    if (!rawCpuId) return;
    const cpuId = rawCpuId;
    handleCpuDrop(cpuId, paIndex, isSupervision);
  };

  const supervisionCount = selectedRoom ? getSupervisionCount(selectedRoom) : 0;

  return (
    <div className="rooms-manager flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-4 rooms-header">
        <h2>Gestão de Salas</h2>
        <div className="room-buttons-scroll">
          {rooms.map(r => (
            <button 
              key={r.id} 
              className={selectedRoom?.id === r.id ? 'primary btn-glow' : ''}
              onClick={() => setSelectedRoom(r)}
              style={selectedRoom?.id !== r.id ? {background: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)'} : {}}
            >
              {r.name}
            </button>
          ))}
          <button 
            onClick={() => setIsAddingRoom(true)} 
            style={{background: 'transparent', color: 'var(--primary-color)', border: '1px dashed var(--primary-color)'}}
          >
            + Nova Sala
          </button>
        </div>
      </div>

      {isAddingRoom && (
        <div className="card mb-4">
          <h3 className="mb-4">Adicionar Nova Sala</h3>
          <form onSubmit={handleAddRoom} className="flex gap-4 flex-wrap items-end">
            <div className="input-group" style={{flex: 2}}>
              <label>Nome da Sala</label>
              <input required type="text" className="premium-input" placeholder="Ex: Sala 3" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} />
            </div>
            <div className="input-group" style={{flex: 1}}>
              <label>Quantidade de PAs Iniciais</label>
              <input required type="number" min="1" max="100" className="premium-input" value={newRoomCapacity} onChange={e => setNewRoomCapacity(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsAddingRoom(false)} style={{background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)'}}>Cancelar</button>
              <button type="submit" className="primary btn-glow">Salvar Sala</button>
            </div>
          </form>
        </div>
      )}

      {selectedRoom && (
        <div className="card room-view">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h3>
                {selectedRoom.name} - ({selectedRoom.capacity} PAs Operação
                {supervisionCount > 0 ? ` + ${supervisionCount} Supervisão` : ''})
              </h3>
              <button onClick={handleDeleteRoom} className="btn-sm" style={{background: 'transparent', color: '#ef4444', border: '1px dashed #ef4444'}}>Excluir Sala</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={addPa} className="btn-sm" style={{border: '1px solid var(--border-color)'}}>+ Adicionar PA</button>
              <button onClick={removePa} className="btn-sm btn-danger">- Remover PA</button>
              <button onClick={addSupervisionPa} className="btn-sm" style={{background: '#22c55e', color: '#ffffff', border: 'none', fontWeight: 'bold'}}>+ PA Supervisão</button>
              {supervisionCount > 0 && (
                <button onClick={removeSupervisionPa} className="btn-sm" style={{background: 'transparent', border: '1px dashed #22c55e', color: '#22c55e'}}>- PA Supervisão</button>
              )}
            </div>
          </div>

          <div className="pa-grid">
            {/* PAs Operacionais (PA 01, PA 02...) */}
            {Array.from({ length: selectedRoom.capacity }).map((_, i) => {
              const globalPaNumber = getStartingPaNumber(selectedRoom.id) + i;
              const currentPaName = `${selectedRoom.name} - PA ${String(globalPaNumber).padStart(2, '0')}`;
              const occupancy = (selectedRoom.paStatus || []).find(p => p && !p.isSupervision && !p.isMeta && p.index === i);
              
              const cpuInfo = (occupancy ? cpus.find(c => String(c.id) === String(occupancy.cpuId)) : null) || cpus.find(c => c.location === currentPaName);
              const isOccupied = Boolean(cpuInfo);

              return (
                <div 
                  key={`op-${i}`} 
                  className={`pa-slot ${isOccupied ? 'occupied' : 'free'}`}
                  onDragOver={handleDragOver}
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
                      <span className="pa-status-dot"></span>
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
                      onDragStart={(e) => handleDragStart(e, cpuInfo.id)}
                    >
                      <span className="cpu-code">{cpuInfo.code}</span>
                      {cpuInfo.acquisition && (
                        <span className="cpu-tag">{cpuInfo.acquisition}</span>
                      )}
                    </div>
                  ) : (
                    <div className="pa-empty-text">Vazio</div>
                  )}
                </div>
              );
            })}

            {/* PAs de Supervisão (SUP 01, SUP 02...) */}
            {Array.from({ length: supervisionCount }).map((_, s) => {
              const supNumber = s + 1;
              const currentSupPaName = `${selectedRoom.name} - SUP ${String(supNumber).padStart(2, '0')}`;
              const occupancy = (selectedRoom.paStatus || []).find(p => p && p.isSupervision && p.index === s);
              
              const cpuInfo = (occupancy ? cpus.find(c => String(c.id) === String(occupancy.cpuId)) : null) || cpus.find(c => c.location === currentSupPaName);
              const isOccupied = Boolean(cpuInfo);

              return (
                <div 
                  key={`sup-${s}`} 
                  className={`pa-slot supervision ${isOccupied ? 'occupied' : 'free'}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, s, true)}
                  onClick={() => {
                    if (cpuInfo) {
                      setViewingCpuModal({ cpu: cpuInfo, paNumber: `SUP ${String(supNumber).padStart(2, '0')}`, roomName: selectedRoom.name });
                    }
                  }}
                  style={{ cursor: cpuInfo ? 'pointer' : 'default' }}
                >
                  <div className="pa-header">
                    <div className="pa-title-group">
                      <span className="pa-status-dot sup-dot"></span>
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
                      className="cpu-drag-item sup-drag-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, cpuInfo.id)}
                    >
                      <span className="cpu-code">{cpuInfo.code}</span>
                      <span className="cpu-tag sup-tag">{cpuInfo.acquisition || 'SUPERVISÃO'}</span>
                    </div>
                  ) : (
                    <div className="pa-empty-text" style={{color: '#c084fc'}}>Vazio (SUP)</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card mt-4">
        <h3>CPUs Disponíveis no Estoque</h3>
        <p className="text-muted mb-2 text-sm">Arraste uma CPU para uma PA vazia.</p>
        <div className="flex gap-2" style={{flexWrap: 'wrap'}}>
          {cpus.filter(c => c.location === 'estoque').map(cpu => (
            <div 
              key={cpu.id} 
              className="cpu-drag-item badge"
              draggable
              onDragStart={(e) => handleDragStart(e, cpu.id)}
            >
              {cpu.code} ({cpu.acquisition})
            </div>
          ))}
          {cpus.filter(c => c.location === 'estoque').length === 0 && (
            <span className="text-muted">O estoque está vazio.</span>
          )}
        </div>
      </div>

      {/* Modal de Detalhes da CPU na PA */}
      {viewingCpuModal && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
          }} 
          onClick={() => setViewingCpuModal(null)}
        >
          <div 
            className="card" 
            style={{
              padding: '2rem', maxWidth: '420px', width: '90%', 
              background: 'var(--surface-color)', border: '1px solid var(--border-color)', 
              borderRadius: '16px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Detalhes da CPU</h3>
              <button 
                onClick={() => setViewingCpuModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <div style={{ padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: '4px' }}>Código da CPU / Identificação</span>
                <strong style={{ fontSize: '1.2rem', color: viewingCpuModal.cpu.code === 'Cpu sem identificação' ? '#f59e0b' : 'var(--text-color)' }}>
                  {viewingCpuModal.cpu.code}
                </strong>
              </div>

              <div className="flex gap-3">
                <div style={{ flex: 1, padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span className="text-muted text-sm" style={{ display: 'block', marginBottom: '4px' }}>Pertence a (Aquisição)</span>
                  <span style={{
                    display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold',
                    background: viewingCpuModal.cpu.acquisition?.toLowerCase() === 'tim' ? '#1e3a8a' : viewingCpuModal.cpu.acquisition?.toLowerCase() === 'affix' ? '#831843' : 'var(--primary-color)',
                    color: '#fff'
                  }}>
                    {viewingCpuModal.cpu.acquisition}
                  </span>
                </div>

                <div style={{ flex: 1, padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span className="text-muted text-sm" style={{ display: 'block', marginBottom: '4px' }}>Flag Auditen</span>
                  <strong style={{ color: viewingCpuModal.cpu.isAuditen ? '#22c55e' : '#ef4444' }}>
                    {viewingCpuModal.cpu.isAuditen ? '✅ Auditen' : '❌ Não Auditen'}
                  </strong>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span className="text-muted text-sm" style={{ display: 'block', marginBottom: '4px' }}>Localização Atual</span>
                <strong>{viewingCpuModal.roomName} - {typeof viewingCpuModal.paNumber === 'string' ? viewingCpuModal.paNumber : `PA ${String(viewingCpuModal.paNumber).padStart(2, '0')}`}</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  handleRemoveCpuFromPa(viewingCpuModal.cpu.id);
                  setViewingCpuModal(null);
                }}
                style={{
                  flex: 1, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', 
                  borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                Devolver ao Estoque
              </button>
              <button 
                onClick={() => setViewingCpuModal(null)}
                className="primary btn-glow"
                style={{ flex: 1, padding: '10px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
