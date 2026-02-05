/**
 * Módulo Supabase Client
 * Inicializa e exporta a instância do cliente Supabase
 */

const SUPABASE_URL = 'https://nfzbrowqkvotvegsfdmc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5memJyb3dxa3ZvdHZlZ3NmZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzAzMzcsImV4cCI6MjA4MzMwNjMzN30.J9cIhVfdKM0msEuk0IpbhZrJl9vNsKY1MUbKMNv8C44';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Busca todas as partidas com participantes (com nomes) do Supabase
 */
export async function fetchMatches() {
  // Busca matches com match_participants
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select(`
      *,
      match_participants(
        id,
        match_id,
        player_id,
        deck_id,
        rank,
        is_winner,
        turn_eliminated,
        elimination_type,
        eliminated_by
      )
    `);
  
  if (matchError) throw matchError;
  if (!matches) throw new Error("Nenhum dado retornado do Supabase.");
  
  // Busca todos os players e decks de forma separada
  const { data: players, error: playerError } = await supabase
    .from('players')
    .select('player_id, name, status');
  
  const { data: decks, error: deckError } = await supabase
    .from('decks')
    .select('deck_id, deck_name, status, color_identity');
  
  if (playerError) throw playerError;
  if (deckError) throw deckError;
  
  // Cria mapas de ID -> info para busca rápida
  const playersMap = Object.fromEntries((players || []).map(p => [p.player_id, p]));
  const decksMap = Object.fromEntries((decks || []).map(d => [d.deck_id, d]));
  
  // Enriquece match_participants com informações de players e decks
  matches.forEach(match => {
    if (Array.isArray(match.match_participants)) {
      match.match_participants.forEach(p => {
        p.players = playersMap[p.player_id] || { id: p.player_id, name: 'Desconhecido' };
        p.decks = decksMap[p.deck_id] || { id: p.deck_id, name: 'Sem deck' };
      });
    }
  });
  
  return matches;
}

/**
 * Busca apenas as partidas sem participantes (para histórico paginado)
 */
export async function fetchMatchesSimple(from, to) {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false })
    .range(from, to);
  
  if (error) throw error;
  return matches || [];
}

/**
 * Busca participantes de uma partida específica com nomes
 */
export async function fetchMatchParticipants(matchId) {
  const { data: participants, error: partError } = await supabase
    .from('match_participants')
    .select(`
      id,
      match_id,
      player_id,
      deck_id,
      rank,
      is_winner,
      turn_eliminated,
      elimination_type,
      eliminated_by
    `)
    .eq('match_id', matchId);
  
  if (partError) throw partError;
  
  const participantList = participants || [];
  
  if (participantList.length === 0) return participantList;
  
  // Busca players e decks
  const playerIds = [...new Set(participantList.map(p => p.player_id))];
  const deckIds = [...new Set(participantList.map(p => p.deck_id))];
  
  const { data: players } = await supabase
    .from('players')
    .select('player_id, name')
    .in('player_id', playerIds.length > 0 ? playerIds : ['0']);
  
  const { data: decks } = await supabase
    .from('decks')
    .select('deck_id, deck_name, color_identity')
    .in('deck_id', deckIds.length > 0 ? deckIds : ['0']);
  
  const playersMap = Object.fromEntries((players || []).map(p => [p.player_id, p]));
  const decksMap = Object.fromEntries((decks || []).map(d => [d.deck_id, d]));
  
  participantList.forEach(p => {
    p.players = playersMap[p.player_id] || { player_id: p.player_id, name: 'Desconhecido' };
    p.decks = decksMap[p.deck_id] || { deck_id: p.deck_id, deck_name: 'Sem deck' };
  });
  
  return participantList;
}

/**
 * Cria um novo jogador na base de dados
 */
export async function createPlayer(playerName) {
  const { data, error } = await supabase
    .from('players')
    .insert([{ name: playerName, status: true }])
    .select();
  
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

/**
 * Cria um novo deck na base de dados
 * O deck_id segue o padrão XXYYY onde:
 * XX = ID do jogador (2 dígitos)
 * YYY = ID sequencial do deck do jogador (3 dígitos)
 */
export async function createDeck(playerId, deckName) {
  try {
    // Busca o maior deck_id para este jogador
    const { data: existingDecks, error: fetchError } = await supabase
      .from('decks')
      .select('deck_id')
      .eq('player_id', playerId)
      .order('deck_id', { ascending: false })
      .limit(1);
    
    if (fetchError) throw fetchError;
    
    // Calcula o próximo YYY
    let nextDeckNumber = 1;
    if (existingDecks && existingDecks.length > 0) {
      // Extrai YYY do deck_id anterior (últimos 3 dígitos)
      const lastDeckId = existingDecks[0].deck_id;
      const lastNumber = parseInt(String(lastDeckId).slice(-3));
      nextDeckNumber = lastNumber + 1;
    }
    
    // Constrói o novo deck_id (XXYYY)
    const playerIdStr = String(playerId).padStart(2, '0');
    const deckNumberStr = String(nextDeckNumber).padStart(3, '0');
    const newDeckId = parseInt(playerIdStr + deckNumberStr);
    
    const { data, error } = await supabase
      .from('decks')
      .insert([{ deck_id: newDeckId, player_id: playerId, deck_name: deckName, status: true }])
      .select();
    
    if (error) throw error;
    return data && data[0] ? data[0] : null;
  } catch (err) {
    console.error('Erro ao criar deck:', err);
    throw err;
  }
}

/**
 * Atualiza uma partida no Supabase
 */
export async function updateMatch(matchId, data) {
  const { error } = await supabase
    .from('matches')
    .update(data)
    .eq('match_id', matchId);
  
  if (error) throw error;
}

/**
 * Deleta uma partida do Supabase (e seus participantes)
 */
export async function deleteMatch(matchId) {
  // Deleta participantes primeiro (foreign key)
  const { error: partError } = await supabase
    .from('match_participants')
    .delete()
    .eq('match_id', matchId);
  
  if (partError) throw partError;

  // Depois deleta a partida
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('match_id', matchId);
  
  if (error) throw error;
}

/**
 * Busca todas as partidas para o manage (sem paginação)
 */
export async function fetchAllMatches() {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return matches || [];
}

/**
 * Busca todos os participantes de várias partidas com nomes
 */
export async function fetchAllMatchParticipants(matchIds) {
  if (matchIds.length === 0) return [];
  
  const { data: participants, error: partError } = await supabase
    .from('match_participants')
    .select(`
      id,
      match_id,
      player_id,
      deck_id,
      rank,
      is_winner,
      turn_eliminated,
      elimination_type,
      eliminated_by
    `)
    .in('match_id', matchIds);
  
  if (partError) throw partError;
  
  const participantList = participants || [];
  
  if (participantList.length === 0) return participantList;
  
  // Busca players e decks
  const playerIds = [...new Set(participantList.map(p => p.player_id))];
  const deckIds = [...new Set(participantList.map(p => p.deck_id))];
  
  const { data: players } = await supabase
    .from('players')
    .select('player_id, name')
    .in('player_id', playerIds.length > 0 ? playerIds : ['0']);
  
  const { data: decks } = await supabase
    .from('decks')
    .select('deck_id, deck_name, color_identity')
    .in('deck_id', deckIds.length > 0 ? deckIds : ['0']);
  
  const playersMap = Object.fromEntries((players || []).map(p => [p.player_id, p]));
  const decksMap = Object.fromEntries((decks || []).map(d => [d.deck_id, d]));
  
  participantList.forEach(p => {
    p.players = playersMap[p.player_id] || { player_id: p.player_id, name: 'Desconhecido' };
    p.decks = decksMap[p.deck_id] || { deck_id: p.deck_id, deck_name: 'Sem deck' };
  });
  
  return participantList;
}
