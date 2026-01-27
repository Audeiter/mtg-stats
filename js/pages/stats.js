/**
 * Módulo Stats Page
 * Controla a lógica da página de estatísticas
 */

import { fetchMatches } from '../modules/supabaseClient.js';
import { el, show, hide, setHTML, on, getValue } from '../modules/domUtils.js';
import { processMatches, calculateMedals, filterData, sortData, getWinrateColor } from '../modules/dataProcessor.js';
import { createEliminationBar } from '../modules/barChart.js';

class StatsPage {
  constructor() {
    this.allPlayerData = [];
    this.allDeckData = [];
    this.currentView = 'players';
    this.currentSort = { key: 'winrate_total', order: 'desc' };
    this.medalData = { players: {}, decks: {} };
    
    this.initDOM();
    this.attachListeners();
  }

  initDOM() {
    this.loadingMsg = el('loading-msg');
    this.tableContainer = el('table-container');
    this.tableHeader = el('table-header');
    this.tableBody = el('table-body');
    this.yearSelect = el('year-select');
    this.searchInput = el('search-input');
    this.btnRefresh = el('btn-refresh');
    this.tabPlayers = el('tab-players');
    this.tabDecks = el('tab-decks');
  }

  attachListeners() {
    on(this.btnRefresh, 'click', () => this.init());
    on(this.tabPlayers, 'click', () => this.switchView('players'));
    on(this.tabDecks, 'click', () => this.switchView('decks'));
    on(this.yearSelect, 'change', () => this.renderTable());
    on(this.searchInput, 'input', () => this.renderTable());
  }

  switchView(view) {
    this.currentView = view;
    const isPlayers = view === 'players';
    
    setHTML(this.tabPlayers, 'Jogadores');
    setHTML(this.tabDecks, 'Decks');
    
    if (isPlayers) {
      this.tabPlayers.className = 'tab active';
      this.tabDecks.className = 'tab';
    } else {
      this.tabDecks.className = 'tab active';
      this.tabPlayers.className = 'tab';
    }
    
    this.renderTable();
  }

  async init() {
    show(this.loadingMsg);
    hide(this.tableContainer);
    setHTML(this.loadingMsg, `<div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>Processando estatísticas...`);

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

    } catch (e) {
      console.error(e);
      setHTML(this.loadingMsg, 
        `<div class="text-red-500 font-bold mb-2">Erro ao carregar:</div>
         <div class="text-sm text-red-300">${e.message}</div>`);
    }
  }

  renderTable() {
    const year = getValue(this.yearSelect);
    const search = getValue(this.searchInput);
    const source = this.currentView === 'players' ? this.allPlayerData : this.allDeckData;
    const medals = this.currentView === 'players' ? this.medalData.players : this.medalData.decks;

    let rows = filterData(source, year, search);
    rows = sortData(rows, this.currentSort.key, this.currentSort.order, year);

    this.renderHeaders();
    this.renderRows(rows, medals, year);
  }

  renderHeaders() {
    const headers = [
      { k: 'name', l: this.currentView === 'players' ? 'Nome' : 'Deck (Dono)' },
      { k: 'games_total', l: 'Jogos' },
      { k: 'wins_total', l: 'Vitórias' },
      { k: 'winrate_total', l: 'Win Rate' },
      { k: 'avg_win_turn', l: 'Turno Méd.' },
      { k: null, l: 'Eliminações (Feitas / Sofridas)' }
    ];

    const headerHTML = headers.map(h => {
      if (!h.k) return `<th>${h.l}</th>`;
      const arrow = this.currentSort.key === h.k 
        ? (this.currentSort.order === 'asc' ? '▲' : '▼')
        : '⇅';
      return `<th onclick="window.changeSort('${h.k}')" class="cursor-pointer hover:bg-gray-700 p-2">
        ${h.l} <span class="text-xs text-gray-500">${arrow}</span>
      </th>`;
    }).join('');

    setHTML(this.tableHeader, headerHTML);
  }

  renderRows(rows, medals, year) {
    const tbody = this.tableBody;
    tbody.innerHTML = rows.map((r, i) => {
      const k = r.name || r.key;
      const m = medals[k] || {};
      
      const g = year === 'total' ? r.games_total : r[`games_${year}`] || 0;
      const w = year === 'total' ? r.wins_total : r[`wins_${year}`] || 0;
      const wr = year === 'total' ? r.winrate_total : r[`winrate_${year}`] || 0;

      const nameHTML = r.name 
        ? r.name
        : `<span class="font-bold text-white">${r.deckName}</span><span class="text-xs text-gray-400 block">${r.playerName}</span>`;

      return `
        <tr>
          <td class="font-medium text-white">
            <span class="text-gray-500 text-xs mr-2">${i + 1}.</span>
            ${nameHTML}
          </td>
          <td class="font-mono text-gray-300 text-center">
            ${g} ${year === 'total' && m.games_total === 1 ? '🥇' : ''}
          </td>
          <td class="font-mono text-yellow-500 font-bold text-center">
            ${w} ${year === 'total' && m.wins_total === 1 ? '🏆' : ''}
          </td>
          <td class="font-mono ${getWinrateColor(wr)} text-center">
            ${wr.toFixed(1)}%
          </td>
          <td class="font-mono text-blue-400 text-center">
            ${r.avg_win_turn}
          </td>
          <td>
            <div class="grid grid-cols-2 gap-4 w-64">
              <div>${createEliminationBar(r.elims_made_pct, 'green')}</div>
              <div>${createEliminationBar(r.elims_taken_pct, 'red')}</div>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  changeSort(key) {
    if (this.currentSort.key === key) {
      this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort = { key, order: 'desc' };
    }
    this.renderTable();
  }
}

// Instancia a página quando DOM estiver pronto
let statsPage;
document.addEventListener('DOMContentLoaded', () => {
  statsPage = new StatsPage();
  statsPage.init();
});

// Expõe função para onclick
window.changeSort = (key) => {
  if (statsPage) statsPage.changeSort(key);
};
