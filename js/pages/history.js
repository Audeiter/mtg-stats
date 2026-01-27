/**
 * Módulo History Page (Histórico de Partidas)
 * Controla a lógica da página de histórico com filtragem em toda a base
 */

import { supabase, fetchAllMatchParticipants } from '../modules/supabaseClient.js';
import { el, show, hide } from '../modules/domUtils.js';

class HistoryPage {
  constructor() {
    this.currentPage = 0;
    this.pageSize = 20;
    this.sortConfig = { column: 'date', direction: 'desc' }; // Ordenação padrão
    this.allFilteredMatches = []; // Armazena TODOS os resultados filtrados
    this.allParticipantsByMatchId = {}; // Armazena mapa de participantes para ordenação
    
    // Estados de ordenação para posições (cicla entre 4 estados)
    this.positionSortStates = {
      'winner': 0, // 0=deck-asc, 1=deck-desc, 2=player-asc, 3=player-desc
      '2nd': 0,
      '3rd': 0,
      '4th': 0
    };
    
    this.tbody = el('history-body');
    this.btnLoadMore = el('btn-load-more');
    this.loadingDiv = el('loading');
    this.endMsg = el('end-msg');
    this.tooltip = el('notes-tooltip');

    // Filtros
    this.filterDateFrom = el('filter-date-from');
    this.filterDateTo = el('filter-date-to');
    this.filterTurn = el('filter-turn');
    this.filterTurnType = el('filter-turn-type');
    this.filterSearchPlayer = el('filter-search-player');
    this.filterSearchDeck = el('filter-search-deck');
    this.btnClearFilters = el('btn-clear-filters');
    this.btnAdvancedFilters = el('btn-advanced-filters');
    this.advancedFiltersDiv = el('advanced-filters');
    this.sortSelect = el('sort-select');
    
    // Checkboxes de posição
    this.filterPos1 = el('filter-pos-1');
    this.filterPos2 = el('filter-pos-2');
    this.filterPos3 = el('filter-pos-3');
    this.filterPos4 = el('filter-pos-4');

    // Debounce para pesquisa
    this.searchTimeout = null;
  }

  init() {
    // Listeners para filtros
    this.filterDateFrom.addEventListener('change', () => this.onFilterChange());
    this.filterDateTo.addEventListener('change', () => this.onFilterChange());
    this.filterTurn.addEventListener('input', () => {
      this.syncTurnInputColor();
      this.onFilterChange();
    });
    this.filterTurnType.addEventListener('change', () => this.onFilterChange());
    
    // Pesquisa instantânea (sem debounce)
    this.filterSearchPlayer.addEventListener('input', () => this.onFilterChange());
    this.filterSearchDeck.addEventListener('input', () => this.onFilterChange());
    
    this.filterPos1.addEventListener('change', () => this.onFilterChange());
    this.filterPos2.addEventListener('change', () => this.onFilterChange());
    this.filterPos3.addEventListener('change', () => this.onFilterChange());
    this.filterPos4.addEventListener('change', () => this.onFilterChange());

    this.btnClearFilters.addEventListener('click', () => this.clearFilters());
    this.btnAdvancedFilters.addEventListener('click', () => this.toggleAdvancedFilters());
    this.sortSelect.addEventListener('change', () => this.applySort());

    // Listeners para cliques nos cabeçalhos de ordenação
    document.querySelectorAll('table thead th[data-sort]').forEach(th => {
      th.addEventListener('click', (e) => this.handleHeaderSort(e));
    });

    // Listeners para navegação e tooltip
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-load-more')) {
        this.loadMore();
      }
    });

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('.notes-icon')) {
        const note = e.target.closest('.notes-icon').dataset.note;
        if (note) {
          this.tooltip.innerHTML = note;
          this.tooltip.classList.add('visible');
        }
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('.notes-icon')) {
        this.tooltip.classList.remove('visible');
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.tooltip.classList.contains('visible')) {
        this.tooltip.style.left = (e.clientX - 150) + 'px';
        this.tooltip.style.top = (e.clientY + 20) + 'px';
      }
    });
    // Carrega primeira página
    this.currentPage = 0;
    show(this.loadingDiv);
    this.loadMore();
  }

  onFilterChange() {
    // Reset para a primeira página quando filtro muda
    this.currentPage = 0;
    this.tbody.innerHTML = '';
    show(this.loadingDiv);
    this.loadMore();
  }

  async loadMore() {
    show(this.loadingDiv);
    hide(this.btnLoadMore);
    hide(this.endMsg);

    try {
      const filters = this.getActiveFilters();
      
      // Se é a primeira página, busca TODOS os resultados filtrados
      if (this.currentPage === 0) {
        this.allFilteredMatches = await this.fetchAllFilteredMatches(filters);
        
        // Buscar TODOS os participantes de TODOS os matches filtrados
        if (this.allFilteredMatches.length > 0) {
          const allMatchIds = this.allFilteredMatches.map(m => m.match_id);
          const allParticipants = await fetchAllMatchParticipants(allMatchIds);
          
          // Mapear participantes por match_id
          this.allParticipantsByMatchId = {};
          allParticipants.forEach(p => {
            if (!this.allParticipantsByMatchId[p.match_id]) {
              this.allParticipantsByMatchId[p.match_id] = [];
            }
            this.allParticipantsByMatchId[p.match_id].push(p);
          });
        }
        
        // Aplicar ordenação em TODOS os resultados COM dados de participantes
        this.applySortToAllMatches();
      }

      // Calcular range de paginação
      const from = this.currentPage * this.pageSize;
      const to = from + this.pageSize;
      
      // Pegar apenas a página atual
      const paginatedMatches = this.allFilteredMatches.slice(from, to);

      if (!paginatedMatches || paginatedMatches.length === 0) {
        if (this.currentPage === 0) {
          this.tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">Nenhuma partida encontrada.</td></tr>';
        }
        show(this.endMsg);
        hide(this.btnLoadMore);
        hide(this.loadingDiv);
        return;
      }

      // Usar participantes já carregados (não precisa fazer nova busca)
      const participantsByMatchId = {};
      paginatedMatches.forEach(m => {
        participantsByMatchId[m.match_id] = this.allParticipantsByMatchId[m.match_id] || [];
      });

      // Se é a primeira página, limpa a tabela
      if (this.currentPage === 0) {
        this.tbody.innerHTML = '';
      }

      // Renderiza as partidas
      this.renderRows(paginatedMatches, participantsByMatchId);
      
      // Atualizar setas de ordenação na primeira página
      if (this.currentPage === 0) {
        this.updateHeaderArrows();
      }
      
      this.currentPage++;

      // Verifica se há mais resultados
      if (paginatedMatches.length < this.pageSize) {
        show(this.endMsg);
      } else {
        show(this.btnLoadMore);
      }

    } catch (e) {
      console.error("Erro no loadMore:", e);
      alert("Erro ao carregar: " + e.message);
    } finally {
      hide(this.loadingDiv);
    }
  }

  async fetchAllFilteredMatches(filters) {
    try {
      // Se há filtro de pesquisa, turno ou posição, busca TODOS os resultados com filtro de data
      if (filters.searchPlayer || filters.searchDeck || filters.turn !== null || filters.positions.length > 0) {
        return await this.fetchWithSearchFilter(filters);
      }

      // Construir query base para filtros simples (apenas data)
      let query = supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });

      // Aplicar filtro de data
      if (filters.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      // Buscar TODOS sem range
      const { data: matches, error } = await query;

      if (error) throw error;

      return matches || [];
    } catch (e) {
      console.error("Erro em fetchAllFilteredMatches:", e);
      throw e;
    }
  }

  applySortToAllMatches() {
    if (this.allFilteredMatches.length === 0) return;

    this.allFilteredMatches.sort((matchA, matchB) => {
      let comparison = 0;

      if (this.sortConfig.column === 'date') {
        // Comparar datas diretas do banco
        comparison = matchA.date.localeCompare(matchB.date);
        // Data: desc é padrão (mais recentes primeiro)
        return this.sortConfig.direction === 'desc' ? -comparison : comparison;
      } 
      else if (this.sortConfig.column === 'turn') {
        // Turno - buscar max turn dos participantes de cada match
        const maxTurnA = Math.max(...(this.allParticipantsByMatchId[matchA.match_id] || []).map(p => parseInt(p.turn_eliminated || 0)), 0);
        const maxTurnB = Math.max(...(this.allParticipantsByMatchId[matchB.match_id] || []).map(p => parseInt(p.turn_eliminated || 0)), 0);
        
        // Se um é 0 (nulo) e outro não, o nulo vai por último
        if (maxTurnA === 0 && maxTurnB !== 0) return 1;
        if (maxTurnB === 0 && maxTurnA !== 0) return -1;
        if (maxTurnA === 0 && maxTurnB === 0) return 0;
        
        comparison = maxTurnA - maxTurnB;
        return this.sortConfig.direction === 'asc' ? comparison : -comparison;
      } 
      else {
        // Para posições (winner, 2nd, 3rd, 4th) - 4 estados
        const rankMap = { 'winner': 1, '2nd': 2, '3rd': 3, '4th': 4 };
        const targetRank = rankMap[this.sortConfig.column];
        
        const getParticipantData = (match) => {
          const participants = this.allParticipantsByMatchId[match.match_id] || [];
          return participants.find(p => parseInt(p.rank || 999) === targetRank);
        };
        
        const participantA = getParticipantData(matchA);
        const participantB = getParticipantData(matchB);
        
        // Nulos por último
        if (!participantA && participantB) return 1;
        if (participantB && !participantA) return -1;
        if (!participantA && !participantB) return 0;
        
        // Estados: 0=deck asc, 1=deck desc, 2=player asc, 3=player desc
        const state = this.positionSortStates[this.sortConfig.column];
        
        if (state === 0) {
          // A-Z por nome do deck
          const deckA = (participantA?.decks?.deck_name || '').trim();
          const deckB = (participantB?.decks?.deck_name || '').trim();
          comparison = deckA.localeCompare(deckB, 'pt-BR');
          return comparison;
        } else if (state === 1) {
          // Z-A por nome do deck
          const deckA = (participantA?.decks?.deck_name || '').trim();
          const deckB = (participantB?.decks?.deck_name || '').trim();
          comparison = deckB.localeCompare(deckA, 'pt-BR');
          return comparison;
        } else if (state === 2) {
          // A-Z por nome do jogador
          const playerA = (participantA?.players?.name || '').trim();
          const playerB = (participantB?.players?.name || '').trim();
          comparison = playerA.localeCompare(playerB, 'pt-BR');
          return comparison;
        } else {
          // Z-A por nome do jogador
          const playerA = (participantA?.players?.name || '').trim();
          const playerB = (participantB?.players?.name || '').trim();
          comparison = playerB.localeCompare(playerA, 'pt-BR');
          return comparison;
        }
      }
    });
  }

  getActiveFilters() {
    return {
      dateFrom: this.filterDateFrom.value,
      dateTo: this.filterDateTo.value,
      turn: this.filterTurn.value ? parseInt(this.filterTurn.value) : null,
      turnType: this.filterTurnType.value, // 'equals', 'greater', 'less'
      searchPlayer: this.filterSearchPlayer.value.toLowerCase(),
      searchDeck: this.filterSearchDeck.value.toLowerCase(),
      positions: [
        this.filterPos1.checked ? 1 : null,
        this.filterPos2.checked ? 2 : null,
        this.filterPos3.checked ? 3 : null,
        this.filterPos4.checked ? 4 : null,
      ].filter(p => p !== null)
    };
  }

  async fetchWithSearchFilter(filters) {
    try {
      // Buscar todos os participantes (sem paginação)
      let query = supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });

      // Aplicar filtro de data
      if (filters.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      // Busca todos os matches com filtro de data (sem range)
      const { data: allMatches, error } = await query;

      if (error) throw error;
      if (!allMatches) return [];

      // Busca todos os participantes para essas partidas
      const matchIds = allMatches.map(m => m.match_id);
      const allParticipants = await fetchAllMatchParticipants(matchIds);

      // Mapeia participantes por match_id
      const participantsByMatchId = {};
      allParticipants.forEach(p => {
        if (!participantsByMatchId[p.match_id]) {
          participantsByMatchId[p.match_id] = [];
        }
        participantsByMatchId[p.match_id].push(p);
      });

      // Função auxiliar para word-boundary search
      const wordBoundaryMatch = (text, query) => {
        if (!query) return true;
        const words = text.split(/[\s,\-_./]+/);
        return words.some(word => word.toLowerCase().startsWith(query.toLowerCase()));
      };

      // Filtra as partidas com base nos critérios
      const filtered = allMatches.filter(match => {
        const participants = participantsByMatchId[match.match_id] || [];
        
        // Filtro por turno
        if (filters.turn !== null) {
          const maxTurn = Math.max(...participants.map(p => parseInt(p.turn_eliminated || 0)));
          let turnMatches = false;
          
          if (filters.turnType === 'equals') {
            turnMatches = maxTurn === filters.turn;
          } else if (filters.turnType === 'greater') {
            turnMatches = maxTurn > filters.turn;
          } else if (filters.turnType === 'less') {
            turnMatches = maxTurn < filters.turn;
          }
          
          if (!turnMatches) return false;
        }

        // Filtro por pesquisa (jogador ou deck) com word-boundary
        if (filters.searchPlayer || filters.searchDeck) {
          const hasMatch = participants.some(p => {
            const playerName = p.players?.name || '';
            const deckName = p.decks?.deck_name || '';
            const playerMatch = filters.searchPlayer ? wordBoundaryMatch(playerName, filters.searchPlayer) : false;
            const deckMatch = filters.searchDeck ? wordBoundaryMatch(deckName, filters.searchDeck) : false;
            return playerMatch || deckMatch || (filters.searchPlayer && !filters.searchDeck ? playerMatch : false) || (filters.searchDeck && !filters.searchPlayer ? deckMatch : false);
          });
          if (!hasMatch) return false;
        }

        // Filtro por posição - DEPOIS de encontrar o nome
        // Se há filtro de pesquisa E filtro de posição, só mostra se o jogador pesquisado está naquela posição
        if ((filters.searchPlayer || filters.searchDeck) && filters.positions.length > 0) {
          const hasPositionMatch = participants.some(p => {
            const playerName = p.players?.name || '';
            const deckName = p.decks?.deck_name || '';
            const playerMatch = filters.searchPlayer ? wordBoundaryMatch(playerName, filters.searchPlayer) : true;
            const deckMatch = filters.searchDeck ? wordBoundaryMatch(deckName, filters.searchDeck) : true;
            const isSearchMatch = playerMatch && deckMatch;
            const rank = parseInt(p.rank || 999);
            return isSearchMatch && filters.positions.includes(rank);
          });
          if (!hasPositionMatch) return false;
        } else if (filters.positions.length > 0) {
          // Se há apenas filtro de posição (sem pesquisa), mostra qualquer um naquela posição
          const hasPositionMatch = participants.some(p => {
            const rank = parseInt(p.rank || 999);
            return filters.positions.includes(rank);
          });
          if (!hasPositionMatch) return false;
        }

        return true;
      });

      // Retornar TODOS os resultados filtrados (paginação é feita depois)
      return filtered;
    } catch (e) {
      console.error("Erro em fetchWithSearchFilter:", e);
      throw e;
    }
  }

  clearFilters() {
    this.filterDateFrom.value = '';
    this.filterDateTo.value = '';
    this.filterTurn.value = '';
    this.filterTurnType.value = 'equals';
    this.filterSearchPlayer.value = '';
    this.filterSearchDeck.value = '';
    this.filterPos1.checked = false;
    this.filterPos2.checked = false;
    this.filterPos3.checked = false;
    this.filterPos4.checked = false;
    this.sortConfig = { column: 'date', direction: 'desc' };
    this.positionSortStates = { 'winner': 0, '2nd': 0, '3rd': 0, '4th': 0 };
    this.updateHeaderArrows();
    this.syncTurnInputColor();
    this.currentPage = 0;
    this.loadMore();
  }

  toggleAdvancedFilters() {
    this.advancedFiltersDiv.classList.toggle('open');
    if (this.advancedFiltersDiv.classList.contains('open')) {
      this.btnAdvancedFilters.innerHTML = '▲ Filtros avançados';
    } else {
      this.btnAdvancedFilters.innerHTML = '▼ Filtros avançados';
    }
  }

  syncTurnInputColor() {
    // Se o input de turno tem valor, adiciona classe 'active' para mudar a cor
    if (this.filterTurn.value) {
      this.filterTurn.classList.add('active');
      this.filterTurnType.classList.add('active');
    } else {
      this.filterTurn.classList.remove('active');
      this.filterTurnType.classList.remove('active');
    }
  }

  handleHeaderSort(e) {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;

    const column = th.dataset.sort;
    const isPositionColumn = ['winner', '2nd', '3rd', '4th'].includes(column);

    if (isPositionColumn) {
      // Para posições, ciclar entre 4 estados APENAS se já está ordenando por essa posição
      if (this.sortConfig.column === column) {
        // Já está ordenando por essa posição - incrementar estado
        this.positionSortStates[column] = (this.positionSortStates[column] + 1) % 4;
      } else {
        // Primeira vez clicando nessa posição - começar do estado 0 (não incrementar)
        this.sortConfig.column = column;
        // positionSortStates[column] já começa em 0 no constructor
      }
    } else if (this.sortConfig.column === column) {
      // Se já está ordenando por essa coluna (date/turn), alternar direção
      if (column === 'date') {
        this.sortConfig.direction = this.sortConfig.direction === 'desc' ? 'asc' : 'desc';
      } else if (column === 'turn') {
        this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
      }
    } else {
      // Primeira vez clicando em date ou turn
      this.sortConfig.column = column;
      if (column === 'date') {
        this.sortConfig.direction = 'desc'; // Data começa descendente
      } else if (column === 'turn') {
        this.sortConfig.direction = 'asc'; // Turno começa ascendente
      }
    }

    // Atualizar visual das setas
    this.updateHeaderArrows();
    
    // Re-buscar e renderizar com nova ordenação
    this.currentPage = 0;
    show(this.loadingDiv);
    this.tbody.innerHTML = '';
    this.loadMore();
  }

  updateHeaderArrows() {
    const headers = document.querySelectorAll('table thead th[data-sort]');
    headers.forEach(th => {
      th.classList.remove('sorted');
      const arrow = th.querySelector('.sort-arrow');
      const column = th.dataset.sort;
      
      if (arrow) {
        if (column === this.sortConfig.column) {
          th.classList.add('sorted');
          
          // Mostrar seta apropriada baseado no tipo de coluna
          if (column === 'date') {
            arrow.textContent = this.sortConfig.direction === 'desc' ? '↓' : '↑';
          } else if (column === 'turn') {
            arrow.textContent = this.sortConfig.direction === 'asc' ? '↑' : '↓';
          } else {
            // Posições - mostrar estado (estado 0 = A-Z deck, estado 1 = Z-A deck, estado 2 = A-Z jogador, estado 3 = Z-A jogador)
            const state = this.positionSortStates[column];
            const stateSymbols = ['A-Z ▲ Deck', 'Z-A ▼ Deck', 'A-Z ▲ Jogador', 'Z-A ▼ Jogador'];
            arrow.textContent = stateSymbols[state];
          }
        } else {
          arrow.textContent = column === 'date' ? '↓' : '↕';
        }
      }
    });
  }

  applySortByHeader() {
    // Método descontinuado - ordenação agora é feita em applySortToAllMatches()
  }

  getColumnIndex(column) {
    const mapping = {
      'date': 0,
      'turn': 1,
      'winner': 2,
      '2nd': 3,
      '3rd': 4,
      '4th': 5
    };
    return mapping[column] || 0;
  }

  applySort() {
    // Método mantido para compatibilidade, mas não faz mais nada
    // A ordenação agora é feita pelos cliques nos cabeçalhos
  }

  createCell(participant, isWinner = false) {
    if (!participant) return '<span class="text-muted">-</span>';
    
    const playerName = participant.players?.name || 'Unknown';
    const deckName = participant.decks?.deck_name || 'Unknown';
    const turnElim = parseInt(participant.turn_eliminated || 0);
    
    let elimInfo = '';
    if (!isWinner && participant.elimination_type) {
      if (participant.elimination_type !== 'Unknown' && participant.elimination_type !== 'Legacy (Unknown)' && participant.elimination_type !== 'Winner') {
        const turnStr = turnElim > 0 ? ` <span class="elimination-turn">T${turnElim}</span>` : '';
        elimInfo = `<div class="text-xs mt-0.5"><span class="elimination-name">${participant.eliminated_by || '?'}</span> <span class="elimination-type">(${participant.elimination_type})</span>${turnStr}</div>`;
      }
    } else if (isWinner) {
      elimInfo = `<div class="winner-badge">Vencedor</div>`;
    }

    return `
      <div class="font-bold text-white leading-tight">${deckName}</div>
      <div class="text-sm text-gray-400">${playerName}</div>
      ${elimInfo}
    `;
  }

  renderRows(matches, participantsByMatchId) {
    matches.forEach(m => {
      const participants = participantsByMatchId[m.match_id] || [];
      
      if (!Array.isArray(participants) || participants.length === 0) return;

      // Ordena por rank (1 = vencedor)
      const sorted = [...participants].sort((a, b) => (a.rank || 999) - (b.rank || 999));
      const winner = sorted[0];
      const losers = sorted.slice(1);
      
      // Calcula o turno máximo (última eliminação)
      const maxTurn = Math.max(...participants.map(p => parseInt(p.turn_eliminated || 0)));

      const row = document.createElement('tr');
      
      let dateStr = m.date;
      try {
        const [y, mm, d] = m.date.split('-');
        dateStr = `${d}/${mm}/${y}`;
      } catch(e) {}

      row.innerHTML = `
        <td class="font-mono text-gray-400">${dateStr}</td>
        <td class="font-mono text-center text-gray-400">${maxTurn > 0 ? maxTurn : '-'}</td>
        <td>
          ${this.createCell(winner, true)}
        </td>
        <td>${this.createCell(losers[0], false)}</td>
        <td>${this.createCell(losers[1], false)}</td>
        <td>${this.createCell(losers[2], false)}</td>
        <td class="text-center">
          <svg data-note="${m.notes ? m.notes.replace(/"/g, '&quot;') : 'Sem comentários.'}" class="w-5 h-5 ${m.notes ? 'text-gray-500 hover:text-white' : 'text-gray-600'} mx-auto notes-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="cursor: pointer; opacity: ${m.notes ? '1' : '0.4'};">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </td>
      `;
      this.tbody.appendChild(row);
    });
  }
}

// Instancia a página quando DOM estiver pronto
let historyPage;
document.addEventListener('DOMContentLoaded', () => {
  historyPage = new HistoryPage();
  historyPage.init();
});
