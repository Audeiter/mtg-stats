/**
 * Módulo Retrospective Tab
 * Dashboard interativo para destaques de um ano selecionado
 */

import { createStatsCards, createCard, createTable } from '../modules/statsComponents.js';
import { fetchMatches } from '../modules/supabaseClient.js';
import { el, show, hide, setHTML, on, getValue } from '../modules/domUtils.js';
import { processMatches, calculateMedals, sortData } from '../modules/dataProcessor.js';

class RetrospectiveTab {
  constructor() {
    this.allPlayerData = [];
    this.allDeckData = [];
    this.selectedYear = '2025';
    this.dashboardData = {};
    
    this.initDOM();
    this.attachListeners();
  }

  initDOM() {
    this.loadingMsg = el('retrospective-loading');
    this.container = el('retrospective-container');
    this.yearSelect = el('retrospective-year-select');
  }

  attachListeners() {
    if (this.yearSelect) {
      on(this.yearSelect, 'change', () => {
        this.selectedYear = getValue(this.yearSelect);
        this.renderDashboard();
      });
    }
  }

  async init() {
    show(this.loadingMsg);
    hide(this.container);

    try {
      const matches = await fetchMatches();
      const processed = processMatches(matches);
      
      this.allPlayerData = processed.players;
      this.allDeckData = processed.decks;
      
      hide(this.loadingMsg);
      show(this.container);
      this.renderDashboard();

    } catch (e) {
      console.error('Erro ao carregar dados retrospectivos:', e);
      setHTML(this.loadingMsg, 
        `<div style="color: #ef4444; font-weight: bold;">Erro ao carregar dados</div>`
      );
    }
  }

  processYearData(year) {
    const gameKey = `games_${year}`;
    const winKey = `wins_${year}`;
    const wrKey = `winrate_${year}`;

    // Filtrar players ativos com dados do ano
    const activePlayers = this.allPlayerData.filter(p => p.is_active && (p[gameKey] || 0) > 0);
    const sorted = sortData(activePlayers, wrKey, 'desc', year);

    // Filtrar decks com dados do ano
    const activeDecks = this.allDeckData.filter(d => (d[gameKey] || 0) > 0);
    const sortedDecks = sortData(activeDecks, wrKey, 'desc', year);

    return {
      year,
      gameKey,
      winKey,
      wrKey,
      topPlayers: sorted.slice(0, 5),
      topDecks: sortedDecks.slice(0, 5),
      totalMatches: activePlayers.reduce((sum, p) => sum + (p[gameKey] || 0), 0) / 4,
      totalPlayers: activePlayers.length,
      avgWinrate: activePlayers.length > 0
        ? (activePlayers.reduce((sum, p) => sum + parseFloat(p[wrKey] || 0), 0) / activePlayers.length).toFixed(1)
        : 0
    };
  }

  renderDashboard() {
    if (!this.container) return;

    const data = this.processYearData(this.selectedYear);

    let html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <!-- Cards de Resumo -->
        <div style="
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 1rem;
          text-align: center;
        ">
          <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Total de Partidas</div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--accent);">${Math.round(data.totalMatches)}</div>
        </div>
        
        <div style="
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 1rem;
          text-align: center;
        ">
          <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Jogadores Ativos</div>
          <div style="font-size: 2rem; font-weight: bold; color: var(--accent);">${data.totalPlayers}</div>
        </div>
        
        <div style="
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.5rem;
          padding: 1rem;
          text-align: center;
        ">
          <div style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Winrate Médio</div>
          <div style="font-size: 2rem; font-weight: bold; color: #cba353;">${data.avgWinrate}%</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- Top Players -->
        <div>
          <h3 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem;">
            🏆 Melhores Jogadores
          </h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Posição</th>
                  <th>Jogos</th>
                  <th>Winrate</th>
                </tr>
              </thead>
              <tbody>
    `;

    data.topPlayers.forEach((player, idx) => {
      const games = player[data.gameKey] || 0;
      const wr = player[data.wrKey] || 0;
      const medals = ['🥇', '🥈', '🥉', '4º', '5º'];
      
      html += `
        <tr>
          <td style="text-align: left; font-weight: 500;">
            <span style="margin-right: 0.5rem;">${medals[idx]}</span>${player.name}
          </td>
          <td style="text-align: center; color: var(--text-secondary);">${games}</td>
          <td style="text-align: center; color: #cba353; font-weight: 500;">${wr}%</td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top Decks -->
        <div>
          <h3 style="margin: 0 0 1rem 0; color: var(--text-primary); font-size: 1.1rem;">
            ⚔️ Melhores Decks
          </h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Posição</th>
                  <th>Jogos</th>
                  <th>Winrate</th>
                </tr>
              </thead>
              <tbody>
    `;

    data.topDecks.forEach((deck, idx) => {
      const games = deck[data.gameKey] || 0;
      const wr = deck[data.wrKey] || 0;
      const medals = ['🥇', '🥈', '🥉', '4º', '5º'];
      
      html += `
        <tr>
          <td style="text-align: left; font-weight: 500;">
            <span style="margin-right: 0.5rem;">${medals[idx]}</span>
            <div>${deck.deckName}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${deck.playerName}</div>
          </td>
          <td style="text-align: center; color: var(--text-secondary);">${games}</td>
          <td style="text-align: center; color: #cba353; font-weight: 500;">${wr}%</td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    setHTML(this.container, html);
  }
}

// Instancia quando a tab for ativada
export { RetrospectiveTab };
