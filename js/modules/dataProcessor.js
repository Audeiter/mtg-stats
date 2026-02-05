/**
 * Módulo Data Processor
 * Funções para processar dados de partidas
 */

/**
 * Cria um objeto de estatística vazio
 */
export function createEmptyStat() {
  return {
    games_total: 0,
    wins_total: 0,
    games_2026: 0,
    wins_2026: 0,
    games_2025: 0,
    wins_2025: 0,
    games_2024: 0,
    wins_2024: 0,
    games_2023: 0,
    wins_2023: 0,
    games_2022: 0,
    wins_2022: 0,
    games_2021: 0,
    wins_2021: 0,
    games_2020: 0,
    wins_2020: 0,
    games_2019: 0,
    wins_2019: 0,
    games_2018: 0,
    wins_2018: 0,
    games_2017: 0,
    wins_2017: 0,
    games_2023_plus: 0,
    wins_2023_plus: 0,
    win_turns: [],
    first_elim_turns: [],
    elim_turns: [],
    elims_made: { 'Combat Damage': 0, 'Commander Damage': 0, 'Non-Combat Damage': 0, 'Other': 0 },
    elims_taken: { 'Combat Damage': 0, 'Commander Damage': 0, 'Non-Combat Damage': 0, 'Other': 0 }
  };
}

/**
 * Processa dados de partidas com participantes (nova estrutura)
 */
export function processMatches(matches) {
  const playersMap = {};
  const decksMap = {};
  const currentYear = new Date().getFullYear();

  matches.forEach(match => {
    if (!match.date) return;
    
    const participants = Array.isArray(match.match_participants) 
      ? match.match_participants 
      : [];
    
    if (participants.length === 0) return;

    const year = match.date.substring(0, 4);
    const winner = participants.find(p => p.is_winner === true);

    // Calcular o turno máximo de eliminação (quando a partida terminou)
    const eliminationTurns = participants
      .filter(p => p.turn_eliminated && parseInt(p.turn_eliminated) > 0)
      .map(p => parseInt(p.turn_eliminated));
    const maxEliminationTurn = eliminationTurns.length > 0 ? Math.max(...eliminationTurns) : 0;

    // Rastrear quem já fez eliminação nesta partida
    const playersWhoEliminated = new Set();

    const updateStat = (obj, isWinner, turn) => {
      obj.games_total++;
      if (year === '2026') obj.games_2026++;
      if (year === '2025') obj.games_2025++;
      if (year === '2024') obj.games_2024++;
      if (year === '2023') obj.games_2023++;
      if (year === '2022') obj.games_2022++;
      if (year === '2021') obj.games_2021++;
      if (year === '2020') obj.games_2020++;
      if (year === '2019') obj.games_2019++;
      if (year === '2018') obj.games_2018++;
      if (year === '2017') obj.games_2017++;
      if (parseInt(year) >= 2023) obj.games_2023_plus++;
      
      if (isWinner) {
        obj.wins_total++;
        if (year === '2026') obj.wins_2026++;
        if (year === '2025') obj.wins_2025++;
        if (year === '2024') obj.wins_2024++;
        if (year === '2023') obj.wins_2023++;
        if (year === '2022') obj.wins_2022++;
        if (year === '2021') obj.wins_2021++;
        if (year === '2020') obj.wins_2020++;
        if (year === '2019') obj.wins_2019++;
        if (year === '2018') obj.wins_2018++;
        if (year === '2017') obj.wins_2017++;
        if (parseInt(year) >= 2023) obj.wins_2023_plus++;
        // Registrar o turno máximo de eliminação como o turno de vitória
        if (turn > 0) obj.win_turns.push(turn);
      } else {
        // Para quem foi eliminado: registrar o turno da eliminação
        if (turn > 0) {
          obj.elim_turns.push(turn);
        }
      }
    };

    const updateElims = (obj, type, isMade) => {
      // Só contar se o tipo foi realmente registrado
      if (type && type !== 'Winner') {
        const target = isMade ? obj.elims_made : obj.elims_taken;
        if (target[type] !== undefined) target[type]++;
      }
    };

    participants.forEach(p => {
      if (!p.players || !p.decks) return;
      
      const pName = p.players.name;
      const dName = p.decks.deck_name;
      const dKey = `${dName} (${pName})`; 

      // Usar status do Supabase para determinar se está ativo
      const playerStatus = p.players.status === true || p.players.status === 'true' || p.players.status === 1 || p.players.status === '1';
      const deckStatus = p.decks.status === true || p.decks.status === 'true' || p.decks.status === 1 || p.decks.status === '1';

      if (!playersMap[pName]) {
        playersMap[pName] = { name: pName, is_active: playerStatus, ...createEmptyStat() };
      } else {
        // Atualizar o status sempre (usar o mais recente)
        playersMap[pName].is_active = playerStatus;
      }

      if (!decksMap[dKey]) {
        decksMap[dKey] = { 
          key: dKey, 
          deckName: dName, 
          playerName: pName, 
          is_active: deckStatus, 
          color_identity: p.decks.color_identity || 'C',
          ...createEmptyStat() 
        };
      } else {
        // Atualizar o status sempre (usar o mais recente)
        decksMap[dKey].is_active = deckStatus;
        // Atualizar color_identity se disponível
        if (p.decks.color_identity) {
          decksMap[dKey].color_identity = p.decks.color_identity;
        }
      }

      const isWinner = (winner && p.id === winner.id);
      const turn = parseInt(p.turn_eliminated || 0);
      
      // Se é vencedor, usar o turno máximo de eliminação; senão usar o turno em que foi eliminado
      const statTurn = isWinner ? maxEliminationTurn : turn;
      
      updateStat(playersMap[pName], isWinner, statTurn);
      updateStat(decksMap[dKey], isWinner, statTurn);

      // Registrar eliminações APENAS se o tipo foi registrado (não-nulo e não 'Winner')
      if (!isWinner && p.elimination_type && p.elimination_type !== 'Winner') {
        updateElims(playersMap[pName], p.elimination_type, false);
        updateElims(decksMap[dKey], p.elimination_type, false);
      }

      // Quem eliminou registra as eliminações e o turno da primeira eliminação
      if (p.eliminated_by && !isWinner && p.elimination_type && p.elimination_type !== 'Winner') {
        if (!playersMap[p.eliminated_by]) {
          playersMap[p.eliminated_by] = { name: p.eliminated_by, is_active: false, ...createEmptyStat() };
        }
        updateElims(playersMap[p.eliminated_by], p.elimination_type, true);
        
        // Registrar o turno de PRIMEIRA eliminação para cada jogador por partida
        const killerTurn = parseInt(p.turn_eliminated || 0);
        if (killerTurn > 0 && !playersWhoEliminated.has(p.eliminated_by)) {
          playersMap[p.eliminated_by].first_elim_turns.push(killerTurn);
          playersWhoEliminated.add(p.eliminated_by);
        }

        const killerParticipant = participants.find(k => k.players.name === p.eliminated_by);
        if (killerParticipant && killerParticipant.decks) {
          const killerDKey = `${killerParticipant.decks.deck_name} (${p.eliminated_by})`;
          if (!decksMap[killerDKey]) {
            decksMap[killerDKey] = { 
              key: killerDKey, 
              deckName: killerParticipant.decks.deck_name, 
              playerName: p.eliminated_by,
              color_identity: killerParticipant.decks.color_identity || 'C',
              is_active: false,
              ...createEmptyStat() 
            };
          }
          updateElims(decksMap[killerDKey], p.elimination_type, true);
          
          // Registrar turno de PRIMEIRA eliminação para o deck também
          if (killerTurn > 0 && !playersWhoEliminated.has(killerDKey)) {
            decksMap[killerDKey].first_elim_turns.push(killerTurn);
            playersWhoEliminated.add(killerDKey);
          }
        }
      }
    });
  });

  return finalizeData(playersMap, decksMap);
}

/**
 * Finaliza dados processados com cálculos
 */
function finalizeData(playersMap, decksMap) {
  const finalize = (map) => Object.values(map).map(item => {
    const wrTotal = item.games_total > 0 ? (item.wins_total / item.games_total * 100) : 0;
    const wr2026 = item.games_2026 > 0 ? (item.wins_2026 / item.games_2026 * 100) : 0;
    const wr2025 = item.games_2025 > 0 ? (item.wins_2025 / item.games_2025 * 100) : 0;
    const wr2024 = item.games_2024 > 0 ? (item.wins_2024 / item.games_2024 * 100) : 0;
    const wr2023 = item.games_2023 > 0 ? (item.wins_2023 / item.games_2023 * 100) : 0;
    const wr2022 = item.games_2022 > 0 ? (item.wins_2022 / item.games_2022 * 100) : 0;
    const wr2021 = item.games_2021 > 0 ? (item.wins_2021 / item.games_2021 * 100) : 0;
    const wr2020 = item.games_2020 > 0 ? (item.wins_2020 / item.games_2020 * 100) : 0;
    const wr2019 = item.games_2019 > 0 ? (item.wins_2019 / item.games_2019 * 100) : 0;
    const wr2018 = item.games_2018 > 0 ? (item.wins_2018 / item.games_2018 * 100) : 0;
    const wr2017 = item.games_2017 > 0 ? (item.wins_2017 / item.games_2017 * 100) : 0;
    const wr2023_plus = item.games_2023_plus > 0 ? (item.wins_2023_plus / item.games_2023_plus * 100) : 0;
    
    const avgWinTurn = item.win_turns.length > 0 
      ? (item.win_turns.reduce((a, b) => a + b, 0) / item.win_turns.length).toFixed(1) 
      : '-';
    
    const avgFirstElimTurn = item.first_elim_turns.length > 0 
      ? (item.first_elim_turns.reduce((a, b) => a + b, 0) / item.first_elim_turns.length).toFixed(1) 
      : '-';
    
    const avgElimTurn = item.elim_turns.length > 0 
      ? (item.elim_turns.reduce((a, b) => a + b, 0) / item.elim_turns.length).toFixed(1) 
      : '-';
    
    const calcPct = (elims) => {
      const total = Object.values(elims).reduce((a, b) => a + b, 0);
      if (total === 0) return { C: 0, D: 0, N: 0, O: 0 };
      return {
        C: (elims['Combat Damage'] / total * 100).toFixed(1),
        D: (elims['Commander Damage'] / total * 100).toFixed(1),
        N: (elims['Non-Combat Damage'] / total * 100).toFixed(1),
        O: (elims['Other'] / total * 100).toFixed(1)
      };
    };

    return {
      ...item,
      winrate_total: wrTotal.toFixed(1),
      winrate_2026: wr2026.toFixed(1),
      winrate_2025: wr2025.toFixed(1),
      winrate_2024: wr2024.toFixed(1),
      winrate_2023: wr2023.toFixed(1),
      winrate_2022: wr2022.toFixed(1),
      winrate_2021: wr2021.toFixed(1),
      winrate_2020: wr2020.toFixed(1),
      winrate_2019: wr2019.toFixed(1),
      winrate_2018: wr2018.toFixed(1),
      winrate_2017: wr2017.toFixed(1),
      winrate_2023_plus: wr2023_plus.toFixed(1),
      avg_win_turn: avgWinTurn,
      avg_first_elim_turn: avgFirstElimTurn,
      avg_elim_turn: avgElimTurn,
      elims_made_pct: calcPct(item.elims_made),
      elims_taken_pct: calcPct(item.elims_taken)
    };
  });

  const players = finalize(playersMap);
  const decks = finalize(decksMap);

  // Adicionar contagem de decks para cada jogador
  const playersWithDecks = players.map(player => {
    const totalDecks = Object.keys(decksMap).filter(deckKey => deckKey.endsWith(`(${player.name})`)).length;
    const activeDecks = Object.keys(decksMap).filter(
      deckKey => deckKey.endsWith(`(${player.name})`) && decksMap[deckKey].is_active
    ).length;
    
    return {
      ...player,
      decks_count: totalDecks,
      active_decks_count: activeDecks
    };
  });

  return {
    players: playersWithDecks,
    decks
  };
}

/**
 * Calcula medalhas (ouro, prata, bronze)
 * Respeita critérios de mínimo de jogos: 20 para HIST, 10 para PRM/Ano
 */
export function calculateMedals(list, targetObj, year = null) {
  // Filtrar apenas itens ativos
  const activeList = list.filter(item => item.is_active);
  
  const metricsToCalculate = [
    'games_total', 'winrate_total',
    'games_2026', 'winrate_2026',
    'games_2025', 'winrate_2025',
    'games_2024', 'winrate_2024',
    'games_2023', 'winrate_2023',
    'games_2022', 'winrate_2022',
    'games_2021', 'winrate_2021',
    'games_2020', 'winrate_2020',
    'games_2019', 'winrate_2019',
    'games_2018', 'winrate_2018',
    'games_2017', 'winrate_2017',
    'games_2023_plus', 'winrate_2023_plus'
  ];
  
  metricsToCalculate.forEach(k => {
    let filtered = [...activeList].filter(item => item[k] > 0);
    
    // Aplicar critério de mínimo de jogos baseado no tipo de métrica
    if (k.startsWith('games_') || k.startsWith('winrate_')) {
      const metricYear = k.replace('games_', '').replace('winrate_', '');
      
      if (metricYear === 'total') {
        // HIST: mínimo 20 jogos
        filtered = filtered.filter(item => item.games_total >= 20);
      } else if (metricYear === '2023_plus') {
        // PRM: mínimo 10 jogos
        filtered = filtered.filter(item => item.games_2023_plus >= 10);
      } else {
        // Anual: mínimo 10 jogos
        filtered = filtered.filter(item => item[`games_${metricYear}`] >= 10);
      }
    }
    
    filtered
      .sort((a, b) => b[k] - a[k])
      .slice(0, 3)
      .forEach((item, i) => {
        const key = item.name || item.key;
        if (!targetObj[key]) targetObj[key] = {};
        targetObj[key][k] = i + 1;
      });
  });
}

/**
 * Filtra dados baseado em busca e status ativo
 */
export function filterData(data, searchTerm, showRetired = false) {
  const search = searchTerm.toLowerCase();
  return data.filter(item => {
    // Filtrar por termos de busca
    if (search && !(item.name || item.key).toLowerCase().includes(search)) return false;
    
    // Filtrar por ativo/aposentado
    if (!showRetired && !item.is_active) return false;
    
    return true;
  });
}

/**
 * Ordena dados
 */
export function sortData(data, sortKey, sortOrder, year) {
  return [...data].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];
    
    if (sortKey === 'avg_win_turn' || sortKey === 'avg_first_elim_turn' || sortKey === 'avg_elim_turn') {
      valA = valA === '-' ? 0 : parseFloat(valA);
      valB = valB === '-' ? 0 : parseFloat(valB);
    } else if (sortKey.startsWith('elims_made_') || sortKey.startsWith('elims_taken_')) {
      // Para eliminações, extrair a letra (C, D, N, O) e buscar no objeto elims_pct
      const type = sortKey.replace(/^elims_(made|taken)_/, '');
      const isMade = sortKey.startsWith('elims_made_');
      const elimsKey = isMade ? 'elims_made_pct' : 'elims_taken_pct';
      
      valA = a[elimsKey] && a[elimsKey][type] ? parseFloat(a[elimsKey][type]) : 0;
      valB = b[elimsKey] && b[elimsKey][type] ? parseFloat(b[elimsKey][type]) : 0;
    } else {
      valA = parseFloat(valA) || valA;
      valB = parseFloat(valB) || valB;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Obtém cor baseada em win rate
 */
export function getWinrateColor(wr) {
  if (wr >= 30) return 'text-purple-400';
  if (wr >= 25) return 'text-green-400';
  if (wr >= 15) return 'text-gray-300';
  return 'text-red-400';
}
