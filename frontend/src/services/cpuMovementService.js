/**
 * cpuMovementService.js
 * 
 * Serviço com funções puras para gerenciamento seguro de movimentações,
 * alocações, substituições e trocas (swap) de CPUs entre Posições de Atendimento (PAs).
 */

/**
 * Calcula o número global da PA para a sala dada a ordem de salas
 */
export function calculateGlobalPaNumber(rooms, targetRoomId, paIndex) {
  let count = 1;
  for (const r of rooms) {
    if (r.id === targetRoomId) break;
    count += Number(r.capacity) || 0;
  }
  return count + paIndex;
}

/**
 * Move uma CPU para uma PA vazia (comum ou supervisão)
 */
export function moveCpuToPa({
  cpus,
  rooms,
  history,
  cpuId,
  targetRoomId,
  targetPaIndex,
  isSupervision = false,
  newAcquisition = null
}) {
  const targetRoom = rooms.find(r => r.id === targetRoomId);
  const cpu = cpus.find(c => String(c.id) === String(cpuId));
  if (!targetRoom || !cpu) return null;

  const oldLocation = cpu.location || 'estoque';
  let targetLocation;

  if (isSupervision) {
    targetLocation = `${targetRoom.name} - SUP ${String(targetPaIndex + 1).padStart(2, '0')}`;
  } else {
    const globalPaNumber = calculateGlobalPaNumber(rooms, targetRoomId, targetPaIndex);
    targetLocation = `${targetRoom.name} - PA ${String(globalPaNumber).padStart(2, '0')}`;
  }

  // Atualizar CPU
  const updatedCpus = cpus.map(c => {
    if (String(c.id) === String(cpuId)) {
      return {
        ...c,
        location: targetLocation,
        ...(newAcquisition ? { acquisition: newAcquisition } : {})
      };
    }
    return c;
  });

  // Atualizar Salas (remover da antiga se estiver alocada, e adicionar na nova)
  const updatedRooms = rooms.map(r => {
    // Remove qualquer ocorrência desta CPU em qualquer sala
    let newPaStatus = (r.paStatus || []).filter(p => p && String(p.cpuId) !== String(cpuId));

    // Se for a sala de destino, insere a nova alocação
    if (r.id === targetRoomId) {
      newPaStatus = [
        ...newPaStatus,
        {
          index: targetPaIndex,
          cpuId: cpu.id,
          isSupervision: Boolean(isSupervision)
        }
      ];
    }

    return { ...r, paStatus: newPaStatus };
  });

  // Criar registro de histórico
  const historyEntry = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    date: new Date().toISOString(),
    cpuCode: cpu.code,
    from: oldLocation,
    to: targetLocation,
    action: 'Movimentação PA',
    details: newAcquisition && newAcquisition !== cpu.acquisition
      ? `Pertence alterado de [${cpu.acquisition}] para [${newAcquisition}]`
      : null
  };

  return {
    cpus: updatedCpus,
    rooms: updatedRooms,
    history: [historyEntry, ...history]
  };
}

/**
 * Realiza a troca (SWAP) entre duas CPUs que já estão em PAs
 */
export function swapCpusBetweenPas({
  cpus,
  rooms,
  history,
  sourceCpuId,
  targetCpuId,
  sourceRoomId,
  targetRoomId,
  sourcePaIndex,
  targetPaIndex,
  sourceIsSupervision = false,
  targetIsSupervision = false
}) {
  const sourceCpu = cpus.find(c => String(c.id) === String(sourceCpuId));
  const targetCpu = cpus.find(c => String(c.id) === String(targetCpuId));
  const sourceRoom = rooms.find(r => r.id === sourceRoomId);
  const targetRoom = rooms.find(r => r.id === targetRoomId);

  if (!sourceCpu || !targetCpu || !sourceRoom || !targetRoom) return null;

  // Calcular novos nomes de localização invertidos
  const sourceNewLocation = targetIsSupervision
    ? `${targetRoom.name} - SUP ${String(targetPaIndex + 1).padStart(2, '0')}`
    : `${targetRoom.name} - PA ${String(calculateGlobalPaNumber(rooms, targetRoomId, targetPaIndex)).padStart(2, '0')}`;

  const targetNewLocation = sourceIsSupervision
    ? `${sourceRoom.name} - SUP ${String(sourcePaIndex + 1).padStart(2, '0')}`
    : `${sourceRoom.name} - PA ${String(calculateGlobalPaNumber(rooms, sourceRoomId, sourcePaIndex)).padStart(2, '0')}`;

  // Atualizar CPUs
  const updatedCpus = cpus.map(c => {
    if (String(c.id) === String(sourceCpuId)) {
      return { ...c, location: sourceNewLocation };
    }
    if (String(c.id) === String(targetCpuId)) {
      return { ...c, location: targetNewLocation };
    }
    return c;
  });

  // Atualizar salas
  const updatedRooms = rooms.map(r => {
    let paStatus = (r.paStatus || []).filter(
      p => p && String(p.cpuId) !== String(sourceCpuId) && String(p.cpuId) !== String(targetCpuId)
    );

    if (r.id === targetRoomId) {
      paStatus.push({
        index: targetPaIndex,
        cpuId: sourceCpu.id,
        isSupervision: Boolean(targetIsSupervision)
      });
    }

    if (r.id === sourceRoomId) {
      paStatus.push({
        index: sourcePaIndex,
        cpuId: targetCpu.id,
        isSupervision: Boolean(sourceIsSupervision)
      });
    }

    return { ...r, paStatus };
  });

  const timestamp = Date.now();
  const historyEntries = [
    {
      id: timestamp * 1000 + 1,
      date: new Date().toISOString(),
      cpuCode: sourceCpu.code,
      from: sourceCpu.location,
      to: sourceNewLocation,
      action: 'Troca de PA (Swap)',
      details: `Trocada de posição com CPU ${targetCpu.code}`
    },
    {
      id: timestamp * 1000 + 2,
      date: new Date().toISOString(),
      cpuCode: targetCpu.code,
      from: targetCpu.location,
      to: targetNewLocation,
      action: 'Troca de PA (Swap)',
      details: `Trocada de posição com CPU ${sourceCpu.code}`
    }
  ];

  return {
    cpus: updatedCpus,
    rooms: updatedRooms,
    history: [...historyEntries, ...history]
  };
}

/**
 * Remove uma CPU de uma PA e envia de volta ao estoque
 */
export function removeCpuToStock({ cpus, rooms, history, cpuId }) {
  const cpu = cpus.find(c => String(c.id) === String(cpuId));
  if (!cpu) return null;

  const oldLocation = cpu.location;
  const newLocation = 'estoque';

  const updatedCpus = cpus.map(c => 
    String(c.id) === String(cpuId) ? { ...c, location: newLocation } : c
  );

  const updatedRooms = rooms.map(r => ({
    ...r,
    paStatus: (r.paStatus || []).filter(p => p && String(p.cpuId) !== String(cpuId))
  }));

  const historyEntry = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    date: new Date().toISOString(),
    cpuCode: cpu.code,
    from: oldLocation,
    to: newLocation,
    action: 'Devolução ao Estoque',
    details: 'Removida da posição de atendimento'
  };

  return {
    cpus: updatedCpus,
    rooms: updatedRooms,
    history: [historyEntry, ...history]
  };
}
