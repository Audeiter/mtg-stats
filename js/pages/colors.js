/**
 * Módulo Colors Tab
 * Estatísticas por combinação de cor (color_identity)
 */

import { createTable, createEliminationBar } from '../modules/statsComponents.js';
import { fetchMatches } from '../modules/supabaseClient.js';
import { el, show, hide, setHTML } from '../modules/domUtils.js';
import { processMatches } from '../modules/dataProcessor.js';

class ColorsTab {
  constructor() {
    this.colorStats = {};
    this.currentSort = { key: 'games_total', order: 'desc' };
    this.colorNames = {
      'W': 'Mono White',
      'U': 'Mono Blue',
      'B': 'Mono Black',
      'R': 'Mono Red',
      'G': 'Mono Green',
      'WU': 'Azorius',
      'WB': 'Orzhov',
      'WR': 'Boros',
      'WG': 'Selesnya',
      'UB': 'Dimir',
      'UR': 'Izzet',
      'UG': 'Simic',
      'BR': 'Rakdos',
      'BG': 'Golgari',
      'RG': 'Gruul',
      'WUB': 'Esper',
      'WUR': 'Jeskai',
      'WUG': 'Bant',
      'WBR': 'Mardu',
      'WBG': 'Abzan',
      'WRG': 'Naya',
      'UBR': 'Grixis',
      'UBG': 'Sultai',
      'URG': 'Temur',
      'BRG': 'Jund',
      'WUBR': 'Not Green',
      'WUBG': 'Not Red',
      'WURG': 'Not Black',
      'WBRG': 'Not Blue',
      'UBRG': 'Not White',
      'WUBRG': '5 Color',
      'C': 'Colorless'
    };
  }

  normalizeColorIdentity(colors) {
    if (!colors) return 'C';
    
    // Se for vazio ou null, retorna incolor
    if (colors.trim() === '') return 'C';
    
    // Ordem padrão: WUBRG
    const colorOrder = { 'W': 0, 'U': 1, 'B': 2, 'R': 3, 'G': 4 };
    
    // Converter para array, filtrar apenas cores válidas, ordenar
    const sortedColors = colors
      .toUpperCase()
      .split('')
      .filter(c => colorOrder.hasOwnProperty(c))
      .sort((a, b) => colorOrder[a] - colorOrder[b])
      .join('');
    
    return sortedColors || 'C';
  }

  async init() {
    try {
      const matches = await fetchMatches();
      const processed = processMatches(matches);
      
      this.processColorStats(processed.decks);
      this.render();
    } catch (e) {
      console.error('Erro ao carregar estatísticas de cores:', e);
      const container = el('colors-container');
      if (container) {
        setHTML(container, 
          `<div style="color: #ef4444; font-weight: bold;">Erro ao carregar dados de cores</div>`
        );
      }
    }
  }

  processColorStats(decks) {
    const stats = {};

    decks.forEach(deck => {
      // Normalizar a color_identity para ordem padrão WUBRG
      const normalizedColors = this.normalizeColorIdentity(deck.color_identity);
      
      if (!stats[normalizedColors]) {
        stats[normalizedColors] = {
          colors: normalizedColors,
          name: this.colorNames[normalizedColors] || normalizedColors,
          games_total: 0,
          wins_total: 0,
          games_2023_plus: 0,
          wins_2023_plus: 0,
          games_2026: 0,
          wins_2026: 0,
          decks_count: 0,
          active_decks_count: 0,
          win_turns: [],
          first_elim_turns: [],
          elim_turns: [],
          elims_made: { 'Combat Damage': 0, 'Commander Damage': 0, 'Non-Combat Damage': 0, 'Other': 0 },
          elims_taken: { 'Combat Damage': 0, 'Commander Damage': 0, 'Non-Combat Damage': 0, 'Other': 0 }
        };
      }

      stats[normalizedColors].games_total += deck.games_total || 0;
      stats[normalizedColors].wins_total += deck.wins_total || 0;
      stats[normalizedColors].games_2023_plus += deck.games_2023_plus || 0;
      stats[normalizedColors].wins_2023_plus += deck.wins_2023_plus || 0;
      stats[normalizedColors].games_2026 += deck.games_2026 || 0;
      stats[normalizedColors].wins_2026 += deck.wins_2026 || 0;
      stats[normalizedColors].decks_count += 1;
      
      // Contar apenas decks ativos (status = TRUE, não aposentados)
      if (deck.is_active) {
        stats[normalizedColors].active_decks_count += 1;
      }
      
      // Agregar turnos
      if (deck.win_turns && deck.win_turns.length > 0) {
        stats[normalizedColors].win_turns.push(...deck.win_turns);
      }
      if (deck.first_elim_turns && deck.first_elim_turns.length > 0) {
        stats[normalizedColors].first_elim_turns.push(...deck.first_elim_turns);
      }
      if (deck.elim_turns && deck.elim_turns.length > 0) {
        stats[normalizedColors].elim_turns.push(...deck.elim_turns);
      }
      
      // Agregar eliminações
      if (deck.elims_made) {
        Object.keys(deck.elims_made).forEach(key => {
          stats[normalizedColors].elims_made[key] = (stats[normalizedColors].elims_made[key] || 0) + (deck.elims_made[key] || 0);
        });
      }
      if (deck.elims_taken) {
        Object.keys(deck.elims_taken).forEach(key => {
          stats[normalizedColors].elims_taken[key] = (stats[normalizedColors].elims_taken[key] || 0) + (deck.elims_taken[key] || 0);
        });
      }
    });

    // Calcular winrates e médias
    Object.values(stats).forEach(stat => {
      stat.winrate_total = stat.games_total > 0 
        ? (stat.wins_total / stat.games_total * 100).toFixed(1)
        : 0;
      stat.winrate_2023_plus = stat.games_2023_plus > 0
        ? (stat.wins_2023_plus / stat.games_2023_plus * 100).toFixed(1)
        : 0;
      stat.winrate_2026 = stat.games_2026 > 0
        ? (stat.wins_2026 / stat.games_2026 * 100).toFixed(1)
        : 0;
      
      // Calcular médias de turno
      stat.avg_win_turn = stat.win_turns.length > 0 
        ? (stat.win_turns.reduce((a, b) => a + b, 0) / stat.win_turns.length).toFixed(1)
        : '-';
      
      stat.avg_first_elim_turn = stat.first_elim_turns.length > 0
        ? (stat.first_elim_turns.reduce((a, b) => a + b, 0) / stat.first_elim_turns.length).toFixed(1)
        : '-';
      
      stat.avg_elim_turn = stat.elim_turns.length > 0
        ? (stat.elim_turns.reduce((a, b) => a + b, 0) / stat.elim_turns.length).toFixed(1)
        : '-';
      
      // Calcular percentuais de eliminação
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
      
      stat.elims_made_pct = calcPct(stat.elims_made);
      stat.elims_taken_pct = calcPct(stat.elims_taken);
    });

    this.colorStats = stats;
  }

  render() {
    const container = el('colors-container');
    if (!container) return;

    let sorted = Object.values(this.colorStats)
      .sort((a, b) => {
        let aVal, bVal;
        
        if (this.currentSort.key === 'games_total') {
          aVal = b.games_total - a.games_total;
        } else if (this.currentSort.key === 'winrate_total') {
          aVal = parseFloat(b.winrate_total) - parseFloat(a.winrate_total);
        } else if (this.currentSort.key === 'games_2023_plus') {
          aVal = b.games_2023_plus - a.games_2023_plus;
        } else if (this.currentSort.key === 'winrate_2023_plus') {
          aVal = parseFloat(b.winrate_2023_plus) - parseFloat(a.winrate_2023_plus);
        } else if (this.currentSort.key === 'games_2026') {
          aVal = b.games_2026 - a.games_2026;
        } else if (this.currentSort.key === 'winrate_2026') {
          aVal = parseFloat(b.winrate_2026) - parseFloat(a.winrate_2026);
        } else if (this.currentSort.key === 'decks_count') {
          aVal = b.decks_count - a.decks_count;
        } else if (this.currentSort.key === 'active_decks_count') {
          aVal = b.active_decks_count - a.active_decks_count;
        } else if (this.currentSort.key === 'avg_win_turn') {
          aVal = (parseFloat(b.avg_win_turn) || 0) - (parseFloat(a.avg_win_turn) || 0);
        } else if (this.currentSort.key === 'avg_first_elim_turn') {
          aVal = (parseFloat(b.avg_first_elim_turn) || 0) - (parseFloat(a.avg_first_elim_turn) || 0);
        } else if (this.currentSort.key === 'avg_elim_turn') {
          aVal = (parseFloat(b.avg_elim_turn) || 0) - (parseFloat(a.avg_elim_turn) || 0);
        } else if (this.currentSort.key.startsWith('elims_made_')) {
          const type = this.currentSort.key.replace('elims_made_', '');
          aVal = (parseFloat(b.elims_made_pct?.[type]) || 0) - (parseFloat(a.elims_made_pct?.[type]) || 0);
        } else if (this.currentSort.key.startsWith('elims_taken_')) {
          const type = this.currentSort.key.replace('elims_taken_', '');
          aVal = (parseFloat(b.elims_taken_pct?.[type]) || 0) - (parseFloat(a.elims_taken_pct?.[type]) || 0);
        } else {
          aVal = 0;
        }
        
        return this.currentSort.order === 'desc' ? aVal : -aVal;
      });

    if (sorted.length === 0) {
      setHTML(container, '<p class="text-center">Nenhum dado de cores disponível</p>');
      return;
    }

    const headers = [
      { key: null, label: 'CORES', colspan: 2, width: '120px' },
      { key: 'decks', label: 'DECKS', width: '100px', isMultiSort: true, sortGroup: 'decks' },
      { key: 'games_total', label: 'NºJ<sub style="font-size: 0.7rem; font-weight: 300;">HIST</sub>', width: '100px' },
      { key: 'winrate_total', label: 'W%<sub style="font-size: 0.7rem; font-weight: 300;">HIST</sub>', width: '100px' },
      { key: 'games_2023_plus', label: 'NºJ<sub style="font-size: 0.7rem; font-weight: 300;">PRM</sub>', width: '100px' },
      { key: 'winrate_2023_plus', label: 'W%<sub style="font-size: 0.7rem; font-weight: 300;">PRM</sub>', width: '100px' },
      { key: 'games_2026', label: 'NºJ<sub style="font-size: 0.7rem; font-weight: 300;">2026</sub>', width: '100px' },
      { key: 'winrate_2026', label: 'W%<sub style="font-size: 0.7rem; font-weight: 300;">2026</sub>', width: '100px' },
      { key: 'turnos', label: 'TURNOS', width: '110px', isMultiSort: true, sortGroup: 'turnos' },
      { key: 'elims_made', label: 'ELIM. FEITAS', width: '250px', isMultiSort: true, sortGroup: 'elims_made' },
      { key: 'elims_taken', label: 'ELIM. SOFRIDAS', width: '250px', isMultiSort: true, sortGroup: 'elims_taken' }
    ];

    let html = `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
    `;

    headers.forEach(h => {
      if (!h.key) {
        const colspan = h.colspan ? `colspan="${h.colspan}"` : '';
        html += `<th ${colspan} style="text-align: left;">${h.label}</th>`;
      } else {
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
        } else if (this.currentSort.key === h.key) {
          arrow = this.currentSort.order === 'asc' ? '▲' : '▼';
        }
        
        let sortCall = `window.colorsSort('${h.key}')`;
        if (isMultiSort) {
          if (h.key === 'decks') {
            sortCall = `window.colorsDecksSort()`;
          } else if (h.key === 'elims_made') {
            sortCall = `window.colorsElimsMadeSort()`;
          } else if (h.key === 'elims_taken') {
            sortCall = `window.colorsElimsTakenSort()`;
          } else {
            sortCall = `window.colorsTurnosSort()`;
          }
        }
        
        html += `<th onclick="${sortCall}" class="cursor-pointer" style="text-align: center; ${h.width ? `width: ${h.width};` : ''}">
          ${h.label}<span class="sort-indicator">${arrow}${label}</span>
        </th>`;
      }
    });

    html += `
            </tr>
          </thead>
          <tbody>
    `;

    sorted.forEach((stat, idx) => {
      const colorBadge = this.getColorBadgeInline(stat.colors);
      
      // Usar componentes padronizados de eliminações
      const madeBar = createEliminationBar(stat.elims_made_pct, 'green');
      const takenBar = createEliminationBar(stat.elims_taken_pct, 'red');
      
      html += `
        <tr>
          <td style="text-align: right; padding-right: 0.75rem; width: 60px;">
            ${colorBadge}
          </td>
          <td style="text-align: left; font-weight: 500;">
            ${stat.name}
          </td>
          <td style="text-align: center; color: #a1a1aa; font-size: 0.8rem; line-height: 1.6;">
            <div>ATUAIS: ${stat.active_decks_count}</div>
            <div style="margin: 0.25rem 0; padding: 0.25rem 0; border-top: 1px solid #52525b;">TOTAIS: ${stat.decks_count}</div>
          </td>
          <td style="text-align: center; color: var(--text-secondary);">${stat.games_total}</td>
          <td style="text-align: center; color: #cba353; font-weight: 500;">${stat.winrate_total}%</td>
          <td style="text-align: center; color: var(--text-secondary);">${stat.games_2023_plus}</td>
          <td style="text-align: center; color: #cba353; font-weight: 500;">${stat.winrate_2023_plus}%</td>
          <td style="text-align: center; color: var(--text-secondary);">${stat.games_2026}</td>
          <td style="text-align: center; color: #cba353; font-weight: 500;">${stat.winrate_2026}%</td>
          <td style="text-align: center; color: #a1a1aa; font-size: 0.8rem; line-height: 1.6;">
            <div>VIT. ${stat.avg_win_turn}</div>
            <div style="margin: 0.25rem 0; padding: 0.25rem 0; border-top: 1px solid #52525b;">1ª ELIM. ${stat.avg_first_elim_turn}</div>
            <div style="margin: 0.25rem 0; padding-top: 0.25rem; border-top: 1px solid #52525b;">DER. ${stat.avg_elim_turn}</div>
          </td>
          <td>${madeBar}</td>
          <td>${takenBar}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    setHTML(container, html);
  }

  changeSort(key) {
    if (this.currentSort.key === key) {
      this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort = { key, order: 'desc' };
      delete this.currentSort.turnosSortMode;
    }
    this.render();
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
    this.render();
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
    this.render();
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
    this.render();
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
    this.render();
  }

  getColorBadgeInline(colors) {
    let badge = '<span style="display: inline-flex; gap: 3px;">';
    colors.split('').forEach(color => {
      const svg = this.getColorSVG(color);
      badge += svg;
    });
    badge += '</span>';
    return badge;
  }

  getColorSVG(color) {
    const svgs = {
      'W': '<svg version="1.1" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="height: 20px; width: 20px; display: inline-block;"><circle cx="300" cy="300" fill="#fffbd5" r="300"></circle><path d="m586.2 342.4c-39.4-22.2-64.6-33.3-75.7-33.3-8.1 0-14.4 6.2-18.9 18.6s-13.6 18.5-27.2 18.5c-5.6 0-16.9-2-34.1-6-9.6 14.6-14.4 24-14.4 28 0 5.6 4.1 12.1 12.4 19.7s15.2 11.3 20.9 11.3c3.6 0 8.5-0.7 14.7-2.3 6.2-1.5 10.3-2.3 12.4-2.3 6.2 0 9.3 11.4 9.3 34.1 0 21.7-5 55-15.1 99.9-13.1-51.5-27-77.2-41.6-77.2-2 0-6.2 1.5-12.5 4.6-6.3 3-11 4.5-14 4.5-14.6 0-27.7-13.4-39.4-40.1-23.2 3.5-34.8 15.4-34.8 35.6 0 10.1 4.7 18.2 14 24.2 9.3 6.1 14 10.4 14 12.9 0 13.6-19.9 34.6-59.8 62.8-21.2 15.1-35.8 25.7-43.9 31.8 7-9.1 14.1-20.9 21.2-35.6 8.1-16.6 12.1-29.5 12.1-38.6 0-5-5.8-12.1-17.4-21.2s-17.4-18.7-17.4-28.8c0-8.6 3-19.2 9.1-31.8-6.6-7.6-14.4-11.4-23.5-11.4-20.2 0-30.3 6.6-30.3 19.7v20.4c0.5 16.7-12.1 25-37.9 25-19.7 0-52.7-4.6-99.2-13.6 52.5-13.1 78.7-28.3 78.7-45.4 0 2-1-4-3-18.2-2-15.6 9.1-29.8 33.3-42.4-4.5-23.2-16.6-34.8-36.3-34.8-3 0-8.6 5.3-16.6 15.9-8.1 10.6-15.6 15.9-22.7 15.9-12.1 0-27.8-13.1-46.9-39.4-9.1-13.1-23-32.5-41.6-58.3 11.6 6.1 23.2 12.1 34.8 18.2 15.1 7.1 27.3 10.6 36.3 10.6 7.1 0 14-6.2 20.8-18.6s15.8-18.6 26.9-18.6c1.5 0 11.6 3 30.3 9.1 9.6-14.6 14.4-25.5 14.4-32.6 0-6.1-3.7-13-11-20.8s-14-11.7-20.1-11.7c-2.5 0-6.4 0.8-11.7 2.3s-9.2 2.3-11.7 2.3c-9.1 0-13.6-11.4-13.6-34.1 0-6.1 5.8-40.6 17.4-103.7-0.5 7.6 2.8 21.7 9.8 42.4 8.6 25.2 18.7 37.9 30.3 37.9 2 0 6.1-1.5 12.1-4.5 6.1-3 10.8-4.5 14.4-4.5 11.6 0 21.2 6.6 28.8 19.7l11.4 20.4c10.6 0 19.4-3.8 26.5-11.3 7.1-7.6 10.6-16.7 10.6-27.3 0-11.1-4.7-19.6-14-25.4-9.4-5.8-14-10.2-14-13.2 0-10.6 16.7-28.5 50-53.7 26.7-20.2 44.2-32 52.2-35.6-21.7 29.3-32.6 50.7-32.6 64.3 0 7.1 4.3 14.6 12.9 22.7 10.6 9.6 16.7 16.4 18.2 20.4 5 11.6 4.5 27.5-1.5 47.7 13.6 9.6 24 14.4 31 14.4 14.6 0 21.9-7.6 21.9-22.7 0-1.5-0.6-6.3-1.9-14.4s-1.6-12.6-1.1-13.6c2-7.1 15.9-10.6 41.6-10.6 16.2 0 49.7 4.5 100.7 13.6-11.1 3-27.8 7.6-50 13.6-20.2 6.1-30.3 12.9-30.3 20.4 0 3.5 1.3 9.6 3.8 18.2s3.8 14.9 3.8 18.9c0 7.1-4.5 13.6-13.6 19.7l-25.7 18.2c6.1 11.1 10.1 17.7 12.1 19.7 5 6.1 11.9 9.1 20.4 9.1 6.1 0 11.6-5.3 16.7-15.9 5-10.6 13.1-15.9 24.2-15.9 13.6 0 29 12.6 46.2 37.9 9.6 14.2 24.5 35.6 44.6 64.4m-168-43.9c0-32.3-11.9-60.3-35.6-84s-51.7-35.6-84-35.6c-32.8 0-61.1 11.7-84.8 35.2s-35.8 51.6-36.3 84.4c-0.5 32.3 11.5 60.2 36 83.6 24.5 23.5 52.9 35.2 85.2 35.2 34.3 0 63-11.2 85.9-33.7 23-22.4 34.2-50.8 33.7-85.1m-11.4 0c0 30.8-10.3 56.3-31 76.4-20.7 20.2-46.4 30.3-77.2 30.3-29.8 0-55.3-10.3-76.4-31-21.2-20.7-31.8-45.9-31.8-75.7 0-29.3 10.7-54.4 32.2-75.3s46.8-31.4 76.1-31.4 54.6 10.6 76.1 31.8c21.4 21.2 32.2 46.2 32.2 74.9" fill="#211d15"></path></svg>',
      'U': '<svg version="1.1" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="height: 20px; width: 20px; display: inline-block;"><circle cx="300" cy="300" fill="#aae0fa" r="300"></circle><path d="m546.93 375.53c-28.722 29.23-64.1 43.842-106.13 43.842-47.17 0-84.59-16.14-112.27-48.44-26.15-30.762-39.22-69.972-39.22-117.64 0-51.26 22.302-109.72 66.9-175.34 36.38-53.814 79.19-100.98 128.41-141.48-7.182 32.814-10.758 56.13-10.758 69.972 0 31.794 9.984 62.802 29.976 93.05 24.612 35.88 43.31 62.56 56.14 79.968 19.992 30.26 29.988 59.73 29.988 88.42.001 42.558-14.346 78.44-43.04 107.65m-.774-164.17c-7.686-17.17-16.662-28.572-26.916-34.22 1.536 3.084 2.31 7.44 2.31 13.08 0 10.77-3.072 26.14-9.234 46.13l-9.984 30.762c0 17.94 8.952 26.916 26.904 26.916 18.96 0 28.452-12.57 28.452-37.686 0-12.804-3.84-27.792-11.532-44.988" fill="#061922" transform="translate(-142.01 126.79)"></path></svg>',
      'B': '<svg version="1.1" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="height: 20px; width: 20px; display: inline-block;"><circle cx="300" cy="300" fill="#cbc2bf" r="300"></circle><path d="m544.2 291.7c0 33.1-12 55.7-36.1 67.7-7 3.5-29.1 8.3-66.2 14.3-24.1 4-36.1 13.3-36.1 27.8v60.9c0 2.5 0.8 10.3 2.3 23.3l2.3 24.1c0 7.5-1.8 19.8-5.3 36.9-9.5 2-20.6 4.3-33.1 6.8-4-15.1-6-25.3-6-30.9 0-2.5 0.6-6.3 1.9-11.3 1.2-5 1.9-8.8 1.9-11.3 0-3.5-3.1-13.3-9.4-29.3h-11.7c-1.5 2.5-2.1 5.8-1.6 9.8 2 8.5 2.8 15.8 2.3 21.8-8.5 6-20.3 14.1-35.4 24.1-3.5-1-4.8-1.5-3.8-1.5v-53.4c-1-2.5-3.5-3.5-7.5-3h-9l-9 70.7c-7 0.5-15.6 0.5-25.6 0-3.5-16.5-9.8-41.1-18.8-73.7h-6c-5.5 17.6-8.5 27.1-9 28.6 0 2 0.6 5.9 1.9 11.7 1.2 5.8 1.9 9.7 1.9 11.7 0 1.5-0.5 5.3-1.5 11.3l-2.3 18.1c-1 1-2.3 1.5-3.8 1.5-15 0-25.1-3.8-30.1-11.3s-7-18.1-6-31.6l6-90.3c0-1.5 0.5-3.5 1.5-6s1.5-4.3 1.5-5.3c0-4-4.3-12-12.8-24.1-1.5-0.5-9.3-2.3-23.3-5.3-8.5-2-25.3-5.5-50.4-10.5-34.6-6.5-51.9-34.3-51.9-83.5 0-73.2 30.1-134.2 90.3-182.8 2.5 13.5 6.8 31.6 12.8 54.2 4.5 1 14.3 3.3 29.3 6.8 3 1 18.3 6.5 45.9 16.6-14.1-8.5-32.4-22.3-54.9-41.4-8.5-10-12.8-26.8-12.8-50.4 0-5.5 9.5-12 28.6-19.6 17-7 29.9-11 38.4-12 27.1-3.5 47.9-5.3 62.5-5.3 62.7 0 113.4 16.1 152 48.2-12.5 14.6-34.1 30.1-64.7 46.6 12.1 0.5 29.6-4.2 52.7-14.3 23.1-10 32.9-15 29.3-15 4 0 12.1 8 24.1 24.1 9 12 16.3 22.8 21.8 32.4 16 28.6 26.8 59.5 32.4 92.6 0 11.6 0.2 19.8 0.8 24.8v6zm-288.2 13.5c0-21.6-9.4-42-28.2-61.3s-39-29-60.6-29c-19.1 0-35.9 8.1-50.4 24.2-14.6 16.2-21.8 34.1-21.8 53.8 0 17.2 8.3 28.3 24.8 33.3 10.5 3 25.3 4.8 44.4 5.3h41.4c33.6 0.5 50.4-8.3 50.4-26.3m82 93.3v-23.3c-3.5-6.5-7-13.3-10.5-20.3-3-10-8.5-24.1-16.6-42.1l-8.3 88c0 7-1.5 10.5-4.5 10.5-2 0-3.5-0.5-4.5-1.5-3.5-53.2-5.3-76.2-5.3-69.2v-26.3c-1-1.5-2.2-2.3-3.7-2.3-17.1 17.6-25.6 45.9-25.6 85 0 21.6 2 34.9 6 39.9 4-1 8.5-2.8 13.5-5.3 2-1 7.8-1.5 17.3-1.5s21.1 3 34.6 9c5 0 7.5-13.5 7.5-40.6m170.1-104.8c0-20.2-7.5-38.2-22.6-54.1s-32.4-23.8-51.9-23.8c-21.1 0-40.8 9.6-59.1 29-18.3 19.3-27.5 39.5-27.5 60.6 0 17.6 8.5 26.3 25.6 26.3h86.5c32.6-0.5 48.9-13.1 48.9-37.9" fill="#130c0e"></path></svg>',
      'R': '<svg version="1.1" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="height: 20px; width: 20px; display: inline-block;"><circle cx="300" cy="300" fill="#f9aa8f" r="300"></circle><path d="m551.8 399.7c-22.4 53.5-67 80.2-133.6 80.2-12.2 0-25.5 1.5-39.7 4.6-21.4 4.6-32.1 11-32.1 19.1 0 2.5 1.8 5.5 5.3 8.8 3.6 3.3 6.6 5 9.2 5-12.7 0-4.1 0.4 26 1.1 30.1 0.8 48.9 1.1 56.5 1.1-44.3 26-118.4 37.9-222.3 35.9-34.1-0.5-63.4-15.5-87.8-45.1-24-28-35.9-59.3-35.9-93.9 0-36.6 12.3-67.8 37.1-93.6 24.7-25.7 55.4-38.6 92-38.6 8.1 0 19 1.8 32.5 5.3 13.5 3.6 22.5 5.3 27.1 5.3 18.8 0 42.3-7.8 70.3-23.3s41.3-23.3 39.7-23.3c-5.1 53.5-22.9 89.4-53.5 107.7-21.9 12.7-32.8 25.2-32.8 37.4 0 7.6 4.6 13.8 13.7 18.3 7.1 3.6 15 5.4 23.7 5.4 13.2 0 26.2-8.1 39-24.4 12.7-16.3 18.3-31.1 16.8-44.3-1.5-15.3-0.5-33.6 3.1-55 1-6.1 4.7-13.6 11.1-22.5s12.1-14.4 17.2-16.4c0 4.6-1.6 12.2-5 22.9-3.3 10.7-5 18.6-5 23.7 0 11.2 3 19.9 9.2 26 9.2-3.6 17.3-15 24.4-34.4 6.1-14.8 9.7-29 10.7-42.8-21.4-1-41.9-10.7-61.5-29s-29.4-38.2-29.4-59.6c0-3.6 0.5-7.1 1.5-10.7 3 4.6 7.6 11.7 13.7 21.4 8.7 12.7 15.3 19.1 19.9 19.1 6.1 0 9.2-6.4 9.2-19.1 0-16.3-4.3-31.1-13-44.3-9.7-15.8-22.2-23.7-37.4-23.7-7.1 0-17.8 3.8-32.1 11.5-14.3 7.6-27.3 11.5-39 11.5-3.6 0-19.4-4.6-47.4-13.8 49.4-8.1 74.1-15.5 74.1-22.1 0-17.3-33.9-29-101.6-35.1-6.6-0.5-18.8-1.5-36.7-3.1 2-2.5 16.5-5.3 43.5-8.4 22.9-2.5 39-3.8 48.1-3.8 121.2 0 198.1 58.8 230.7 176.5 5.6-4.6 8.4-12.4 8.4-23.2 0-13.9-4.1-31.5-12.2-52.7-3.1-8.2-7.9-20.6-14.5-37.2 41.7 53.2 62.6 103.6 62.6 151.2 0 25.1-5.9 47.8-17.6 68.3-7.6 13.8-21.9 31.5-42.8 53s-35.1 38.1-42.8 49.9c28-7.6 46.4-13.5 55-17.6 19.3-8.6 36.9-21.6 52.7-39 0 6.6-2.8 16.6-8.4 29.8m-332.9-300.2c0 9.2-5.1 15-15.3 17.6l-19.9 3.1c-7.1 3.6-17.6 17.6-31.3 42-1.5-7.6-3.8-18.3-6.9-32.1-4.6 0.5-12.2 4.6-22.9 12.2-4.6 3.6-12 8.9-22.2 16 3.1-18.3 13.2-36.9 30.6-55.8 18.3-20.9 36.2-31.3 53.5-31.3 22.9 0 34.4 9.4 34.4 28.3m132.9 70.3c0 8.7-4.7 15.9-14.1 21.8s-18.7 8.8-27.9 8.8c-12.2 0-23.2-6.9-32.8-20.6-11.7-16.8-23.7-27.7-35.9-32.9 2.5-2.5 5.6-3.8 9.2-3.8 4.6 0 12.3 3.6 23.3 10.7 10.9 7.1 17.9 10.7 21 10.7 2.5 0 6.7-3.6 12.6-10.7s12.3-10.7 19.5-10.7c16.8 0 25.2 8.9 25.2 26.7" fill="#200000"></path></svg>',
      'G': '<svg version="1.1" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="height: 20px; width: 20px; display: inline-block;"><circle cx="300" cy="300" fill="#9bd3ae" r="300"></circle><path d="m562.6 337.4c0 10-3.9 19-11.6 27s-16.6 12-26.6 12c-16 0-27.7-7.5-35.2-22.5l-35.2-1.5c-7.5 0-22.3 3.3-44.2 9.8-23.5 6.5-37 11.7-40.5 15.7-5.5 6-10 20-13.5 42-3 18-4.5 31.2-4.5 39.7 0 13.5 2.1 23.4 6.4 29.6s13 11.5 26.2 15.7s21.4 6.6 24.4 7.1c2 0 5.2-0.2 9.8-0.7h9c6.5 0 13.2 1 20.2 3 10 3 14.3 7 12.8 12-7-1-19.2 0.5-36.7 4.5l21 10.5c0 6-8.5 9-25.5 9-4.5 0-10.6-1-18.4-3-7.7-2-12.9-3-15.4-3h-9.7c-0.5 5-2 12.5-4.5 22.5-8.5-0.5-18.5-5.5-30-15s-18.7-14.2-21.7-14.2-7.3 4.8-12.7 14.2c-5.5 9.5-8.2 16-8.2 19.5-6.5-3.5-12-10-16.5-19.5-2-6.5-4.2-13-6.7-19.5-5 0.5-14.2 11-27.7 31.5h-3.8c-1-1.5-4.8-12-11.2-31.5-15.5-5-30-7.5-43.5-7.5-6.5 0-16.5 1.5-30 4.5l-21-1.5c3-3 11.7-8.7 26.2-17.2 17-10 30-15 39-15 1.5 0 3.5 0.3 6 0.8s4.5 0.8 6 0.8c3.5 0 9.1-1.9 16.9-5.6 7.7-3.7 12.2-7.1 13.5-10.1s1.9-10.8 1.9-23.2c0-28.5-7.5-49.7-22.5-63.7-13-12.5-34.5-21.5-64.5-27-8 28.5-30.5 42.7-67.4 42.7-12 0-24-7.2-36-21.7-12.3-14.8-18.3-28-18.3-40 0-18.5 7.7-33.7 23.2-45.7-12.5-13-18.7-26.2-18.7-39.7 0-12.5 3.9-23.5 11.6-33s17.9-15 30.4-16.5c-1-16 4.2-27 15.7-33-5.5-5.5-8.2-15.2-8.2-29.2 0-16.5 5.5-30.2 16.5-41.2s24.7-16.5 41.2-16.5c18 0 32.7 6.3 44.2 18.8 14.5-49.5 45.7-74.2 93.7-74.2 25 0 47 10 66 30 7 7.5 10.5 11.5 10.5 12-6 0-3-1.1 9-3.4 12-2.2 20.7-3.4 26.2-3.4 19.5 0 36.7 7.2 51.7 21.7 13 13 22 29.5 27 49.5 3.5 0.5 9 2 16.5 4.5 11 5.5 16.5 15 16.5 28.5 0 2.5-2 7.3-6 14.2 32 18 48 43 48 75 0 9-3.5 21.5-10.5 37.5 13 7.5 19.5 18.5 19.5 33m-308.8 33v-9.7c0-11.5-5.6-22-16.9-31.5-11.2-9.5-22.6-14.2-34.1-14.2-14 0-27 3.2-39 9.7 26.5-1.5 56.5 13.8 89.9 45.7m-13.5-92.9c-7.5-8.5-14-17.2-19.5-26.2-21 5.5-31.5 11.7-31.5 18.7 6-0.5 14.7 0.6 26.2 3.4s19.7 4.1 24.8 4.1m45.7-23.2v-33c-12-2-19.3-3-21.7-3v11.2l21.7 24.7m97.4-21c-6-2.5-17.2-7.5-33.7-15v64.5c23.5-13.5 34.7-30 33.7-49.5m41.2 88.5-16.5-20.2c-10 7-20.1 14.1-30.4 21.4-10.3 7.2-19.1 15.4-26.6 24.4 22.5-12 47-20.5 73.4-25.5" fill="#00160b"></path></svg>',
      'C': '<svg version="1.1" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="height: 20px; width: 20px; display: inline-block;"><circle cx="300" cy="300" fill="#ccc2c0" r="300"></circle><path d="M300 60A500 500 0 0 0 540 300 500 500 0 0 0 300 540 500 500 0 0 0 60 300 500 500 0 0 0 300 60m0 90A300 300 0 0 1 150 300 300 300 0 0 1 300 450 300 300 0 0 1 450 300 300 300 0 0 1 300 150" fill="#130c0e"></path></svg>'
    };
    
    return svgs[color] || svgs['C'];
  }
}

// Instancia quando a tab for ativada
export { ColorsTab };

// Expõe funções para onclick
let colorsTabInstance;

window.colorsSort = (key) => {
  if (colorsTabInstance) colorsTabInstance.changeSort(key);
};

window.colorsTurnosSort = () => {
  if (colorsTabInstance) colorsTabInstance.changeTurnosSort();
};

window.colorsDecksSort = () => {
  if (colorsTabInstance) colorsTabInstance.changeDecksSort();
};

window.colorsElimsMadeSort = () => {
  if (colorsTabInstance) colorsTabInstance.changeElimsMadeSort();
};

window.colorsElimsTakenSort = () => {
  if (colorsTabInstance) colorsTabInstance.changeElimsTakenSort();
};

// Setter para referência da instância
export function setColorsTabInstance(instance) {
  colorsTabInstance = instance;
}
