/**
 * Módulo Stats Page (Refatorado com Componentes Padrão)
 * Controla a lógica da página de estatísticas
 * 
 * ✅ Usa componentes padronizados de statsComponents.js
 * ✅ Reduz duplicação de código
 * ✅ Facilita manutenção centralizada
 */

import { fetchMatches } from '../modules/supabaseClient.js';
import { el, show, hide, setHTML, on, getValue } from '../modules/domUtils.js';
import { processMatches, calculateMedals, filterData, sortData, getWinrateColor } from '../modules/dataProcessor.js';
import { createEliminationBar, createTable, createTabs, createStateContainer } from '../modules/statsComponents.js';
import { ColorsTab, setColorsTabInstance } from './colors.js';
import { StrategyTab } from './strategy.js';
import { RetrospectiveTab } from './retrospective.js';

class StatsPage {
  constructor() {
    this.allPlayerData = [];
    this.allDeckData = [];
    this.currentView = 'players';
    this.currentSort = { key: 'winrate_2026', order: 'desc' };
    this.showRetired = false;
    this.medalData = { players: {}, decks: {} };
    
    // Instâncias das abas
    this.colorsTab = new ColorsTab();
    this.strategyTab = new StrategyTab();
    this.retrospectiveTab = new RetrospectiveTab();
    
    this.initDOM();
    this.attachListeners();
  }

  initDOM() {
    this.loadingMsg = el('loading-msg');
    this.tableContainer = el('table-container');
    this.tableHeader = el('table-header');
    this.tableBody = el('table-body');
    this.yearSelect = el('year-select');
    this.searchPlayerInput = el('search-player');
    this.searchDeckInput = el('search-deck');
    this.showRetiredCheckbox = el('show-retired');
    this.minGamesType = el('min-games-type');
    this.minGamesCount = el('min-games-count');
    this.tabPlayers = el('tab-players');
    this.tabDecks = el('tab-decks');
    this.tabColors = el('tab-colors');
    this.tabStrategy = el('tab-strategy');
    this.tabRetrospective = el('tab-retrospective');
    this.filtersSection = el('filters-section');
  }

  attachListeners() {
    on(this.tabPlayers, 'click', () => this.switchView('players'));
    on(this.tabDecks, 'click', () => this.switchView('decks'));
    on(this.tabColors, 'click', () => this.switchView('colors'));
    on(this.tabStrategy, 'click', () => this.switchView('strategy'));
    on(this.tabRetrospective, 'click', () => this.switchView('retrospective'));
    on(this.yearSelect, 'change', () => this.renderTable());
    on(this.searchPlayerInput, 'input', () => this.renderTable());
    on(this.searchDeckInput, 'input', () => this.renderTable());
    on(this.showRetiredCheckbox, 'change', () => {
      this.showRetired = this.showRetiredCheckbox.checked;
      this.renderTable();
    });
    on(this.minGamesType, 'change', () => this.renderTable());
    on(this.minGamesCount, 'change', () => this.renderTable());
    on(this.minGamesCount, 'input', () => this.renderTable());
  }

  switchView(view) {
    this.currentView = view;
    
    // Resetar todos os tabs
    this.tabPlayers.className = 'tab';
    this.tabDecks.className = 'tab';
    this.tabColors.className = 'tab';
    this.tabStrategy.className = 'tab';
    this.tabRetrospective.className = 'tab';
    
    // Esconder todos os containers
    const tableContainer = el('table-container');
    const colorsContainer = el('colors-container');
    const strategyContainer = el('strategy-container');
    const retrospectiveContainer = el('retrospective-container');
    
    if (tableContainer) hide(tableContainer);
    if (colorsContainer) hide(colorsContainer);
    if (strategyContainer) hide(strategyContainer);
    if (retrospectiveContainer) hide(retrospectiveContainer);
    
    // Esconder seção de filtros por padrão
    if (this.filtersSection) hide(this.filtersSection);
    
    // Ativar aba e mostrar container apropriado
    switch(view) {
      case 'players':
      case 'decks':
        this.currentView = view;
        this.tabPlayers.className = view === 'players' ? 'tab active' : 'tab';
        this.tabDecks.className = view === 'decks' ? 'tab active' : 'tab';
        if (tableContainer) show(tableContainer);
        if (this.filtersSection) show(this.filtersSection);
        this.renderTable();
        break;
      case 'colors':
        this.tabColors.className = 'tab active';
        if (colorsContainer) show(colorsContainer);
        break;
      case 'strategy':
        this.tabStrategy.className = 'tab active';
        if (strategyContainer) show(strategyContainer);
        break;
      case 'retrospective':
        this.tabRetrospective.className = 'tab active';
        if (retrospectiveContainer) show(retrospectiveContainer);
        break;
    }
  }

  async init() {
    show(this.loadingMsg);
    hide(this.tableContainer);
    setHTML(this.loadingMsg, `<div class="loading-spinner"></div><p>Processando estatísticas...</p>`);

    try {
      const matches = await fetchMatches();
      const processed = processMatches(matches);
      
      this.allPlayerData = processed.players;
      this.allDeckData = processed.decks;
      
      calculateMedals(this.allPlayerData, this.medalData.players);
      calculateMedals(
        this.allDeckData.filter(d => d.games_total > 10),
        this.medalData.decks
      );

      hide(this.loadingMsg);
      show(this.tableContainer);
      this.renderTable();
      
      // Inicializar as outras abas
      await this.colorsTab.init();
      setColorsTabInstance(this.colorsTab);
      this.strategyTab.init();
      await this.retrospectiveTab.init();

    } catch (e) {
      console.error(e);
      setHTML(this.loadingMsg, 
        `<div style="color: #ef4444; font-weight: bold; margin-bottom: 0.5rem;">Erro ao carregar:</div>
         <div style="font-size: 0.875rem; color: #fca5a5;">${e.message}</div>`);
    }
  }

  renderTable() {
    const year = getValue(this.yearSelect);
    const searchPlayer = getValue(this.searchPlayerInput);
    const searchDeck = getValue(this.searchDeckInput);
    const minGamesType = getValue(this.minGamesType);
    const minGamesCount = parseInt(getValue(this.minGamesCount)) || 0;
    
    const source = this.currentView === 'players' ? this.allPlayerData : this.allDeckData;

    let rows = this.filterDataWithSearches(source, searchPlayer, searchDeck, this.showRetired);
    rows = this.filterByMinGames(rows, minGamesType, minGamesCount, year);
    rows = sortData(rows, this.currentSort.key, this.currentSort.order, year);

    // Recalcular medalhas baseado nos dados filtrados
    const currentMedals = {};
    calculateMedals(rows, currentMedals, year);

    // Para jogadores, criar linha "Outros" e adicionar ao final
    if (this.currentView === 'players' && !this.showRetired) {
      const othersRow = this.createOthersRow(source, year, searchPlayer, searchDeck);
      if (othersRow) {
        rows = rows.filter(r => !r.is_others); // Remover qualquer linha "Outros" anterior
        rows.push(othersRow);
      }
    }

    this.renderHeaders(year);
    this.renderRows(rows, currentMedals, year);
  }

  filterDataWithSearches(data, searchPlayer, searchDeck, showRetired = false) {
    const searchPlayerLower = searchPlayer.toLowerCase();
    const searchDeckLower = searchDeck.toLowerCase();
    
    return data.filter(item => {
      // Filtrar por termo de busca (jogador ou deck)
      if (searchPlayerLower && !((item.name || item.playerName || '')).toLowerCase().includes(searchPlayerLower)) {
        // Se não encontrou no nome do jogador, verifica se é um jogador direto
        if (!item.name) return false;
      }
      
      if (searchDeckLower && !((item.deckName || item.key || '')).toLowerCase().includes(searchDeckLower)) return false;
      
      // Filtrar por ativo/aposentado
      if (!showRetired && !item.is_active) return false;
      
      return true;
    });
  }

  createOthersRow(source, year, searchPlayer, searchDeck) {
    // Filtrar jogadores inativos
    const searchPlayerLower = searchPlayer.toLowerCase();
    const searchDeckLower = searchDeck.toLowerCase();
    
    const inactiveRows = source.filter(item => {
      // Deve ser inativo
      if (item.is_active) return false;
      
      // Deve corresponder à busca de jogador (se houver)
      if (searchPlayerLower && !(item.name || '').toLowerCase().includes(searchPlayerLower)) return false;
      
      // Deve corresponder à busca de deck (se houver)
      if (searchDeckLower && !(item.key || '').toLowerCase().includes(searchDeckLower)) return false;
      
      return true;
    });
    
    if (inactiveRows.length === 0) return null;

    const othersData = {
      name: 'Outros',
      is_others: true,
      is_active: false,
      games_total: inactiveRows.reduce((a, b) => a + (b.games_total || 0), 0),
      wins_total: inactiveRows.reduce((a, b) => a + (b.wins_total || 0), 0),
      games_2026: inactiveRows.reduce((a, b) => a + (b.games_2026 || 0), 0),
      wins_2026: inactiveRows.reduce((a, b) => a + (b.wins_2026 || 0), 0),
      games_2025: inactiveRows.reduce((a, b) => a + (b.games_2025 || 0), 0),
      wins_2025: inactiveRows.reduce((a, b) => a + (b.wins_2025 || 0), 0),
      games_2024: inactiveRows.reduce((a, b) => a + (b.games_2024 || 0), 0),
      wins_2024: inactiveRows.reduce((a, b) => a + (b.wins_2024 || 0), 0),
      games_2023: inactiveRows.reduce((a, b) => a + (b.games_2023 || 0), 0),
      wins_2023: inactiveRows.reduce((a, b) => a + (b.wins_2023 || 0), 0),
      games_2022: inactiveRows.reduce((a, b) => a + (b.games_2022 || 0), 0),
      wins_2022: inactiveRows.reduce((a, b) => a + (b.wins_2022 || 0), 0),
      games_2021: inactiveRows.reduce((a, b) => a + (b.games_2021 || 0), 0),
      wins_2021: inactiveRows.reduce((a, b) => a + (b.wins_2021 || 0), 0),
      games_2020: inactiveRows.reduce((a, b) => a + (b.games_2020 || 0), 0),
      wins_2020: inactiveRows.reduce((a, b) => a + (b.wins_2020 || 0), 0),
      games_2019: inactiveRows.reduce((a, b) => a + (b.games_2019 || 0), 0),
      wins_2019: inactiveRows.reduce((a, b) => a + (b.wins_2019 || 0), 0),
      games_2018: inactiveRows.reduce((a, b) => a + (b.games_2018 || 0), 0),
      wins_2018: inactiveRows.reduce((a, b) => a + (b.wins_2018 || 0), 0),
      games_2017: inactiveRows.reduce((a, b) => a + (b.games_2017 || 0), 0),
      wins_2017: inactiveRows.reduce((a, b) => a + (b.wins_2017 || 0), 0),
      games_2023_plus: inactiveRows.reduce((a, b) => a + (b.games_2023_plus || 0), 0),
      wins_2023_plus: inactiveRows.reduce((a, b) => a + (b.wins_2023_plus || 0), 0),
      elims_made_pct: this.aggregateElimsPct(inactiveRows, true),
      elims_taken_pct: this.aggregateElimsPct(inactiveRows, false)
    };

    // Calcular win rates para todos os anos
    const years = ['total', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2023_plus'];
    years.forEach(y => {
      const gamesKey = `games_${y}`;
      const winsKey = `wins_${y}`;
      const wrKey = `winrate_${y}`;
      
      if (othersData[gamesKey] > 0) {
        othersData[wrKey] = (othersData[winsKey] / othersData[gamesKey] * 100).toFixed(1);
      } else {
        othersData[wrKey] = 0;
      }
    });

    othersData.avg_win_turn = '-';
    othersData.avg_first_elim_turn = '-';
    othersData.avg_elim_turn = '-';

    return othersData;
  }

  aggregateElimsPct(rows, isMade) {
    const result = { C: 0, D: 0, N: 0, O: 0 };
    let totalElims = 0;

    rows.forEach(row => {
      const elims = isMade ? row.elims_made : row.elims_taken;
      result.C += elims['Combat Damage'] || 0;
      result.D += elims['Commander Damage'] || 0;
      result.N += elims['Non-Combat Damage'] || 0;
      result.O += elims['Other'] || 0;
    });

    totalElims = result.C + result.D + result.N + result.O;
    if (totalElims > 0) {
      result.C = (result.C / totalElims * 100).toFixed(1);
      result.D = (result.D / totalElims * 100).toFixed(1);
      result.N = (result.N / totalElims * 100).toFixed(1);
      result.O = (result.O / totalElims * 100).toFixed(1);
    }

    return result;
  }

  filterByMinGames(rows, minGamesType, minGamesCount, year) {
    return rows.filter(item => {
      let gameCount = 0;
      
      if (minGamesType === 'total') {
        gameCount = item.games_total || 0;
      } else if (minGamesType === '2023_plus') {
        gameCount = item.games_2023_plus || 0;
      } else if (minGamesType === 'year') {
        gameCount = item[`games_${year}`] || 0;
      }
      
      return gameCount >= minGamesCount;
    });
  }

  renderHeaders(year) {
    let headers = [
      { 
        k: 'name', 
        l: this.currentView === 'players' ? 'Nome' : 'Deck (Dono)', 
        width: 'flex'
      }
    ];

    // Coluna HIST (Total)
    headers.push(
      { k: 'games_total', l: 'Nº J<sub style="font-size: 0.7rem; font-weight: 300;">HIST</sub>', width: '100px' },
      { k: 'winrate_total', l: 'W%<sub style="font-size: 0.7rem; font-weight: 300;">HIST</sub>', width: '100px' }
    );

    // Coluna PRM (2023+)
    headers.push(
      { k: 'games_2023_plus', l: 'Nº J<sub style="font-size: 0.7rem; font-weight: 300;">PRM</sub>', width: '100px' },
      { k: 'winrate_2023_plus', l: 'W%<sub style="font-size: 0.7rem; font-weight: 300;">PRM</sub>', width: '100px' }
    );

    // Coluna dinâmica baseada no ano selecionado
    const gameKey = `games_${year}`;
    const wrKey = `winrate_${year}`;
    
    headers.push(
      { k: gameKey, l: `Nº J<sub style="font-size: 0.7rem; font-weight: 300;">${year}</sub>`, width: '100px' },
      { k: wrKey, l: `W%<sub style="font-size: 0.7rem; font-weight: 300;">${year}</sub>`, width: '100px' }
    );

    // Turnos (coluna única com 3 valores empilhados)
    headers.push(
      { k: 'turnos', l: 'TURNOS', width: '110px', isMultiSort: true, sortGroup: 'turnos' }
    );

    // Eliminações - coluna com largura variável por view
    const elimWidth = this.currentView === 'players' ? '250px' : '200px';
    headers.push({ k: 'elims_made', l: 'ELIM. FEITAS', width: elimWidth, isMultiSort: true, sortGroup: 'elims_made' });
    headers.push({ k: 'elims_taken', l: 'ELIM. SOFRIDAS', width: elimWidth, isMultiSort: true, sortGroup: 'elims_taken' });

    // Colunas de DECKS (apenas para view de jogadores) - coluna única com dados empilhados
    if (this.currentView === 'players') {
      headers.push(
        { k: 'decks', l: 'DECKS', width: '100px', isMultiSort: true, sortGroup: 'decks' }
      );
    }

    const headerHTML = headers.map((h, idx) => {
      if (!h.k) return `<th style="width: ${h.width || 'auto'};">${h.l}</th>`;
      const isMultiSort = h.isMultiSort || false;
      const sortGroup = h.sortGroup || null;
      let arrow = '⇅';
      let label = '';
      
      if (isMultiSort && sortGroup) {
        // Mostrar label apenas se esta coluna é a ativa
        if (sortGroup === 'turnos' && ['avg_win_turn', 'avg_first_elim_turn', 'avg_elim_turn'].includes(this.currentSort.key)) {
          arrow = this.currentSort.order === 'asc' ? '▲' : '▼';
          if (this.currentSort.key === 'avg_win_turn') label = ' VIT';
          else if (this.currentSort.key === 'avg_first_elim_turn') label = ' ELIM';
          else if (this.currentSort.key === 'avg_elim_turn') label = ' DER';
        }
        // Mostrar label apenas se esta coluna é a ativa
        else if (sortGroup === 'decks' && ['active_decks_count', 'decks_count'].includes(this.currentSort.key)) {
          arrow = this.currentSort.order === 'asc' ? '▲' : '▼';
          if (this.currentSort.key === 'active_decks_count') label = ' ATU';
          else if (this.currentSort.key === 'decks_count') label = ' TOT';
        }
        // Mostrar label apenas se esta coluna é a ativa
        else if (sortGroup === 'elims_made' && ['elims_made_C', 'elims_made_D', 'elims_made_N', 'elims_made_O'].includes(this.currentSort.key)) {
          arrow = '▼';
          label = ' ' + this.currentSort.key.replace('elims_made_', '');
        }
        // Mostrar label apenas se esta coluna é a ativa
        else if (sortGroup === 'elims_taken' && ['elims_taken_C', 'elims_taken_D', 'elims_taken_N', 'elims_taken_O'].includes(this.currentSort.key)) {
          arrow = '▼';
          label = ' ' + this.currentSort.key.replace('elims_taken_', '');
        }
      } else if (this.currentSort.key === h.k) {
        arrow = this.currentSort.order === 'asc' ? '▲' : '▼';
      }
      
      let sortCall = `window.changeSort('${h.k}')`;
      if (isMultiSort) {
        if (h.k === 'decks') {
          sortCall = `window.changeDecksSort()`;
        } else if (h.k === 'elims_made') {
          sortCall = `window.changeElimsMadeSort()`;
        } else if (h.k === 'elims_taken') {
          sortCall = `window.changeElimsTakenSort()`;
        } else {
          sortCall = `window.changeTurnosSort()`;
        }
      }
      
      const widthStyle = h.width ? `width: ${h.width};` : '';
      return `<th onclick="${sortCall}" class="cursor-pointer" style="text-align: center; ${widthStyle}">
        ${h.l}<span class="sort-indicator">${arrow}${label}</span>
      </th>`;
    }).join('');

    setHTML(this.tableHeader, headerHTML);
  }

  renderRows(rows, medals, year) {
    const tbody = this.tableBody;
    tbody.innerHTML = rows.map((r, i) => {
      const isOthers = r.is_others;
      const rowClass = isOthers ? 'others-row' : '';
      const k = r.name || r.key;
      const m = medals[k] || {};

      const nameHTML = r.name 
        ? r.name
        : `<span style="font-weight: bold; color: #f4f4f5;">${r.deckName}</span><span style="font-size: 0.8rem; color: #a1a1aa; display: block;">${r.playerName}</span>`;

      let rowHTML = `<tr class="${rowClass}">
        <td style="font-weight: 500; color: #f4f4f5;">
          <span style="color: #a1a1aa; font-size: 0.8rem; margin-right: 0.5rem;">${i + 1}.</span>
          ${nameHTML}
        </td>`;

      // Coluna HIST (Total) - medalhas apenas com 20+ jogos
      const gamesTotal = r.games_total || 0;
      const wrTotal = r.winrate_total || 0;
      const medalHistGames = gamesTotal >= 20 ? m.games_total : null;
      const medalHistWr = gamesTotal >= 20 ? m.winrate_total : null;
      rowHTML += `<td style="text-align: center; color: #a1a1aa;">
        ${gamesTotal}${this.getMedalHTML(medalHistGames)}
      </td>
      <td style="text-align: center; color: #cba353; font-weight: 500;">
        ${wrTotal}%${this.getMedalHTML(medalHistWr)}
      </td>`;

      // Coluna PRM (2023+) - medalhas apenas com 10+ jogos
      const games2023Plus = r.games_2023_plus || 0;
      const wr2023Plus = r.winrate_2023_plus || 0;
      const medalPrmGames = games2023Plus >= 10 ? m.games_2023_plus : null;
      const medalPrmWr = games2023Plus >= 10 ? m.winrate_2023_plus : null;
      rowHTML += `<td style="text-align: center; color: #a1a1aa;">
        ${games2023Plus}${this.getMedalHTML(medalPrmGames)}
      </td>
      <td style="text-align: center; color: #cba353; font-weight: 500;">
        ${wr2023Plus}%${this.getMedalHTML(medalPrmWr)}
      </td>`;

      // Coluna dinâmica do ano selecionado - medalhas apenas com 10+ jogos
      const gamesKey = `games_${year}`;
      const wrKey = `winrate_${year}`;
      const gameCount = r[gamesKey] || 0;
      const winrate = r[wrKey] || 0;
      const medalYearGames = gameCount >= 10 ? m[gamesKey] : null;
      const medalYearWr = gameCount >= 10 ? m[wrKey] : null;
      
      rowHTML += `<td style="text-align: center; color: #a1a1aa;">
        ${gameCount}${this.getMedalHTML(medalYearGames)}
      </td>
      <td style="text-align: center; color: #cba353; font-weight: 500;">
        ${winrate}%${this.getMedalHTML(medalYearWr)}
      </td>`;

      // Turnos (coluna única com valores em linha e separadores)
      rowHTML += `<td style="text-align: center; color: #a1a1aa; font-size: 0.8rem; line-height: 1.6;">
        <div>VIT. ${r.avg_win_turn}</div>
        <div style="margin: 0.25rem 0; padding: 0.25rem 0; border-top: 1px solid #52525b;">1ª ELIM. ${r.avg_first_elim_turn}</div>
        <div style="margin: 0.25rem 0; padding-top: 0.25rem; border-top: 1px solid #52525b;">DER. ${r.avg_elim_turn}</div>
      </td>`;

      // Eliminações Feitas
      const madeBar = createEliminationBar(r.elims_made_pct, 'green');
      rowHTML += `<td>${madeBar}</td>`;

      // Eliminações Sofridas
      const takenBar = createEliminationBar(r.elims_taken_pct, 'red');
      rowHTML += `<td>${takenBar}</td>`;

      // Colunas de DECKS (apenas para view de jogadores) - coluna única com dados empilhados
      if (this.currentView === 'players') {
        const decksTotal = r.decks_count || 0;
        const decksAtuais = r.active_decks_count || 0;
        rowHTML += `<td style="text-align: center; color: #a1a1aa; font-size: 0.8rem; line-height: 1.6;">
          <div>ATUAIS: ${decksAtuais}</div>
          <div style="margin: 0.25rem 0; padding: 0.25rem 0; border-top: 1px solid #52525b;">TOTAIS: ${decksTotal}</div>
        </td>`;
      }

      rowHTML += '</tr>';
      return rowHTML;
    }).join('');
  }

  getWinrateColor(wr) {
    const wrVal = parseFloat(wr);
    if (wrVal >= 30) return 'var(--rank-gold)'; // Ouro
    if (wrVal >= 25) return '#a1a1aa'; // Cinza
    if (wrVal >= 15) return '#a1a1aa'; // Cinza
    return '#a1a1aa'; // Cinza
  }

  getMedalHTML(position) {
    if (!position) return '';
    const colors = { 1: 'var(--rank-gold)', 2: 'var(--rank-silver)', 3: 'var(--rank-bronze)' };
    const color = colors[position] || '';
    return `<span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; margin-left: 0.35rem; vertical-align: middle;"></span>`;
  }

  changeSort(key) {
    if (this.currentSort.key === key) {
      this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort = { key, order: 'desc' };
      delete this.currentSort.turnosSortMode;
    }
    this.renderTable();
  }

  changeTurnosSort() {
    const mode = (this.currentSort.turnosSortMode || 0) + 1;
    this.currentSort.turnosSortMode = mode % 6;
    
    const configs = [
      { key: 'avg_win_turn', order: 'desc' },        // 0: ▼ VIT
      { key: 'avg_win_turn', order: 'asc' },         // 1: ▲ VIT
      { key: 'avg_first_elim_turn', order: 'desc' }, // 2: ▼ ELIM
      { key: 'avg_first_elim_turn', order: 'asc' },  // 3: ▲ ELIM
      { key: 'avg_elim_turn', order: 'desc' },       // 4: ▼ DER
      { key: 'avg_elim_turn', order: 'asc' }         // 5: ▲ DER
    ];
    
    const config = configs[mode % 6];
    this.currentSort.key = config.key;
    this.currentSort.order = config.order;
    this.renderTable();
  }

  changeDecksSort() {
    const mode = (this.currentSort.decksSortMode || 0) + 1;
    this.currentSort.decksSortMode = mode % 4;
    
    const configs = [
      { key: 'active_decks_count', order: 'desc' }, // 0: ▼ ATU
      { key: 'active_decks_count', order: 'asc' },  // 1: ▲ ATU
      { key: 'decks_count', order: 'desc' },        // 2: ▼ TOT
      { key: 'decks_count', order: 'asc' }          // 3: ▲ TOT
    ];
    
    const config = configs[mode % 4];
    this.currentSort.key = config.key;
    this.currentSort.order = config.order;
    this.renderTable();
  }

  changeElimsMadeSort() {
    const mode = (this.currentSort.elimsMadeSortMode || 0) + 1;
    this.currentSort.elimsMadeSortMode = mode % 4;
    
    const configs = [
      { key: 'elims_made_C', order: 'desc' }, // 0: C (Combat)
      { key: 'elims_made_D', order: 'desc' }, // 1: D (Commander)
      { key: 'elims_made_N', order: 'desc' }, // 2: N (Non-Combat)
      { key: 'elims_made_O', order: 'desc' }  // 3: O (Other)
    ];
    
    const config = configs[mode % 4];
    this.currentSort.key = config.key;
    this.currentSort.order = config.order;
    this.renderTable();
  }

  changeElimsTakenSort() {
    const mode = (this.currentSort.elimsTakenSortMode || 0) + 1;
    this.currentSort.elimsTakenSortMode = mode % 4;
    
    const configs = [
      { key: 'elims_taken_C', order: 'desc' }, // 0: C (Combat)
      { key: 'elims_taken_D', order: 'desc' }, // 1: D (Commander)
      { key: 'elims_taken_N', order: 'desc' }, // 2: N (Non-Combat)
      { key: 'elims_taken_O', order: 'desc' }  // 3: O (Other)
    ];
    
    const config = configs[mode % 4];
    this.currentSort.key = config.key;
    this.currentSort.order = config.order;
    this.renderTable();
  }
}

// Instancia a página quando DOM estiver pronto
let statsPage;
document.addEventListener('DOMContentLoaded', () => {
  statsPage = new StatsPage();
  statsPage.init();
});

// Expõe funções para onclick
window.changeSort = (key) => {
  if (statsPage) statsPage.changeSort(key);
};

window.changeTurnosSort = () => {
  if (statsPage) statsPage.changeTurnosSort();
};

window.changeDecksSort = () => {
  if (statsPage) statsPage.changeDecksSort();
};

window.changeElimsMadeSort = () => {
  if (statsPage) statsPage.changeElimsMadeSort();
};

window.changeElimsTakenSort = () => {
  if (statsPage) statsPage.changeElimsTakenSort();
};

window.colorsSort = (key) => {
  if (statsPage && statsPage.colorsTab) statsPage.colorsTab.changeSort(key);
};
