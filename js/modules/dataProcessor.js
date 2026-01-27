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
    games_2025: 0,
    wins_2025: 0,
    games_2024: 0,
    wins_2024: 0,
    win_turns: [],
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

  matches.forEach(match => {
    if (!match.date) return;
    
    const participants = Array.isArray(match.match_participants) 
      ? match.match_participants 
      : [];
    
    if (participants.length === 0) return;

    const year = match.date.substring(0, 4);
    const winner = participants.find(p => p.is_winner === true);

    const updateStat = (obj, isWinner, turn) => {
      obj.games_total++;
      if (year === '2025') obj.games_2025++;
      if (year === '2024') obj.games_2024++;
      
      if (isWinner) {
        obj.wins_total++;
        if (year === '2025') obj.wins_2025++;
        if (year === '2024') obj.wins_2024++;
        if (turn > 0) obj.win_turns.push(turn);
      }
    };

    const updateElims = (obj, type, isMade) => {
      const target = isMade ? obj.elims_made : obj.elims_taken;
      if (target[type] !== undefined) target[type]++;
    };

    participants.forEach(p => {
      if (!p.players || !p.decks) return;
      
      const pName = p.players.name;
      const dName = p.decks.deck_name;
      const dKey = `${dName} (${pName})`; 

      if (!playersMap[pName]) playersMap[pName] = { name: pName, ...createEmptyStat() };
      if (!decksMap[dKey]) decksMap[dKey] = { key: dKey, deckName: dName, playerName: pName, ...createEmptyStat() };

      const isWinner = (winner && p.id === winner.id);
      const turn = parseInt(p.turn_eliminated || 0);
      
      updateStat(playersMap[pName], isWinner, turn);
      updateStat(decksMap[dKey], isWinner, turn);

      if (!isWinner && p.elimination_type && p.elimination_type !== 'Winner') {
        updateElims(playersMap[pName], p.elimination_type, false);
        updateElims(decksMap[dKey], p.elimination_type, false);
      }

      if (p.eliminated_by && !isWinner) {
        if (!playersMap[p.eliminated_by]) {
          playersMap[p.eliminated_by] = { name: p.eliminated_by, ...createEmptyStat() };
        }
        updateElims(playersMap[p.eliminated_by], p.elimination_type, true);

        const killerParticipant = participants.find(k => k.players.name === p.eliminated_by);
        if (killerParticipant && killerParticipant.decks) {
          const killerDKey = `${killerParticipant.decks.deck_name} (${p.eliminated_by})`;
          if (!decksMap[killerDKey]) {
            decksMap[killerDKey] = { 
              key: killerDKey, 
              deckName: killerParticipant.decks.deck_name, 
              playerName: p.eliminated_by, 
              ...createEmptyStat() 
            };
          }
          updateElims(decksMap[killerDKey], p.elimination_type, true);
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
    const wr25 = item.games_2025 > 0 ? (item.wins_2025 / item.games_2025 * 100) : 0;
    const avgTurn = item.win_turns.length > 0 ? (item.win_turns.reduce((a, b) => a + b, 0) / item.win_turns.length).toFixed(1) : '-';
    
    const calcPct = (elims) => {
      const total = Object.values(elims).reduce((a, b) => a + b, 0);
      if (total === 0) return { C: 0, D: 0, N: 0, O: 0 };
      return {
        C: elims['Combat Damage'] / total * 100,
        D: elims['Commander Damage'] / total * 100,
        N: elims['Non-Combat Damage'] / total * 100,
        O: elims['Other'] / total * 100
      };
    };

    return {
      ...item,
      winrate_total: wrTotal,
      winrate_2025: wr25,
      avg_win_turn: avgTurn,
      elims_made_pct: calcPct(item.elims_made),
      elims_taken_pct: calcPct(item.elims_taken)
    };
  });

  return {
    players: finalize(playersMap),
    decks: finalize(decksMap)
  };
}

/**
 * Calcula medalhas (ouro, prata, bronze)
 */
export function calculateMedals(list, targetObj) {
  ['games_total', 'wins_total', 'winrate_total'].forEach(k => {
    [...list]
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
 * Filtra dados baseado em ano e busca
 */
export function filterData(data, year, searchTerm) {
  const search = searchTerm.toLowerCase();
  return data.filter(item => {
    if (search && !(item.name || item.key).toLowerCase().includes(search)) return false;
    if (year !== 'total' && item[`games_${year}`] === 0) return false;
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
    
    if (year !== 'total' && ['games_total', 'wins_total', 'winrate_total'].includes(sortKey)) {
      const suffix = sortKey.split('_')[0];
      valA = a[`${suffix}_${year}`] || 0;
      valB = b[`${suffix}_${year}`] || 0;
    }

    if (sortKey === 'avg_win_turn') {
      valA = valA === '-' ? 0 : parseFloat(valA);
      valB = valB === '-' ? 0 : parseFloat(valB);
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
