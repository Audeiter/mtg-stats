/**
 * Módulo de Componentes Padronizados para Estatísticas
 * Centraliza elementos reutilizáveis: filtros, tabelas, visualizações, etc.
 * Permite alteração simultânea em todas as páginas de estatísticas
 */

/**
 * Cria seção de filtros padronizada
 * @param {Array} filterConfig - Array de configurações de filtros
 * @returns {string} HTML da seção de filtros
 * 
 * Exemplo:
 * createFiltersSection([
 *   { type: 'text', id: 'search', label: 'Buscar', placeholder: 'Digite...' },
 *   { type: 'select', id: 'player', label: 'Jogador', options: ['Todos', 'Player1', 'Player2'] },
 *   { type: 'date', id: 'dateFrom', label: 'Data De' }
 * ])
 */
export function createFiltersSection(filterConfig = []) {
  const filterHTML = filterConfig.map(filter => {
    let inputHTML = '';

    switch (filter.type) {
      case 'text':
        inputHTML = `<input type="text" id="${filter.id}" placeholder="${filter.placeholder || ''}" />`;
        break;
      case 'select':
        const options = (filter.options || []).map(opt => 
          `<option value="${opt}">${opt}</option>`
        ).join('');
        inputHTML = `<select id="${filter.id}">${options}</select>`;
        break;
      case 'date':
        inputHTML = `<input type="date" id="${filter.id}" />`;
        break;
      case 'checkbox':
        inputHTML = `<label class="checkbox-label">
          <input type="checkbox" id="${filter.id}" />
          <span>${filter.label}</span>
        </label>`;
        break;
    }

    const label = filter.type !== 'checkbox' ? `<label>${filter.label || ''}</label>` : '';

    return `<div class="filter-group ${filter.type === 'text' && filter.isSearchField ? 'search-field' : ''}">
      ${label}
      ${inputHTML}
    </div>`;
  }).join('');

  return `<div class="filters-section">
    <div class="filter-row">
      ${filterHTML}
    </div>
  </div>`;
}

/**
 * Cria tabela padronizada com dados
 * @param {Array} columns - Configuração das colunas
 * @param {Array} data - Dados da tabela
 * @param {Object} options - Opções da tabela
 * @returns {string} HTML da tabela
 * 
 * Exemplo:
 * createTable(
 *   [
 *     { key: 'name', label: 'Nome', type: 'text' },
 *     { key: 'wins', label: 'Vitórias', type: 'number' },
 *     { key: 'eliminations', label: 'Eliminações', type: 'chart' }
 *   ],
 *   [{ name: 'Player1', wins: 10, eliminations: {...} }],
 *   { sortable: true, className: 'stats-table' }
 * )
 */
export function createTable(columns = [], data = [], options = {}) {
  const { sortable = true, className = '' } = options;

  const thead = `<thead>
    <tr>
      ${columns.map(col => `<th class="column-${col.key}" ${sortable ? 'data-sortable="true"' : ''}>${col.label}</th>`).join('')}
    </tr>
  </thead>`;

  const tbody = `<tbody>
    ${data.map((row, idx) => {
      const isOthersRow = row.isOthersRow || false;
      return `<tr class="${isOthersRow ? 'others-row' : ''}">
        ${columns.map(col => {
          let cellContent = row[col.key] || '';
          
          // Diferentes tipos de células
          if (col.type === 'chart' && typeof cellContent === 'object') {
            cellContent = createEliminationBar(cellContent, row.chartColor);
          } else if (col.type === 'number') {
            cellContent = `<span class="number-cell">${cellContent}</span>`;
          } else if (col.type === 'percentage') {
            cellContent = `<span class="percentage-cell">${cellContent}%</span>`;
          } else if (col.type === 'text') {
            cellContent = `<span class="text-cell">${cellContent}</span>`;
          }

          return `<td class="cell-${col.key}">${cellContent}</td>`;
        }).join('')}
      </tr>`;
    }).join('')}
  </tbody>`;

  return `<div class="table-wrapper">
    <table class="stats-table ${className}">
      ${thead}
      ${tbody}
    </table>
  </div>`;
}

/**
 * Cria barra horizontal de eliminações (CDNO)
 * @param {Object} percentages - Percentuais { C: number, D: number, N: number, O: number }
 * @param {string} color - Cor da barra ('green', 'red', 'accent', 'custom#hexColor')
 * @returns {string} HTML da barra
 */
export function createEliminationBar(percentages = {}, color = 'green') {
  const data = [
    { key: 'C', label: 'Combat', pct: parseFloat(percentages.C) || 0 },
    { key: 'D', label: 'Commander', pct: parseFloat(percentages.D) || 0 },
    { key: 'N', label: 'Non-Combat', pct: parseFloat(percentages.N) || 0 },
    { key: 'O', label: 'Other', pct: parseFloat(percentages.O) || 0 }
  ];

  let bgColor = '#10b981'; // verde padrão
  if (color === 'red') bgColor = '#ef4444';
  else if (color === 'accent') bgColor = 'var(--accent)';
  else if (color.startsWith('#')) bgColor = color;

  const barsHTML = data.map(item => {
    const pct = Math.max(0, Math.min(100, item.pct));
    return `<div class="elimination-bar-row" title="${item.label}">
      <div class="elimination-bar-key">${item.key}</div>
      <div class="elimination-bar-container">
        <div class="elimination-bar-fill" style="width: ${pct}%; background-color: ${bgColor};"></div>
      </div>
      <span class="elimination-bar-percentage">${pct.toFixed(0)}%</span>
    </div>`;
  }).join('');

  return `<div class="elimination-bar-wrapper">
    ${barsHTML}
  </div>`;
}

/**
 * Cria cards de estatísticas individuais
 * @param {Array} stats - Array de stats { label, value, subtitle, color }
 * @returns {string} HTML dos cards
 * 
 * Exemplo:
 * createStatsCards([
 *   { label: 'Vitórias', value: '42', subtitle: 'No total', color: 'success' },
 *   { label: 'Taxa Vitória', value: '65%', color: 'accent' }
 * ])
 */
export function createStatsCards(stats = []) {
  const cardsHTML = stats.map(stat => {
    const colorClass = stat.color ? `stat-card-${stat.color}` : '';
    return `<div class="stat-card ${colorClass}">
      <div class="stat-value">${stat.value}</div>
      <div class="stat-label">${stat.label}</div>
      ${stat.subtitle ? `<div class="stat-subtitle">${stat.subtitle}</div>` : ''}
    </div>`;
  }).join('');

  return `<div class="stats-grid">
    ${cardsHTML}
  </div>`;
}

/**
 * Cria tabs padronizado
 * @param {Array} tabs - Array de configuração de tabs
 * @param {string} activeTab - ID da tab ativa por padrão
 * @returns {string} HTML dos tabs
 * 
 * Exemplo:
 * createTabs([
 *   { id: 'overall', label: 'Geral' },
 *   { id: 'by-player', label: 'Por Jogador' }
 * ], 'overall')
 */
export function createTabs(tabs = [], activeTab = null) {
  const activeTabId = activeTab || (tabs[0]?.id || '');
  
  const tabsHTML = tabs.map(tab => 
    `<button class="tab ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
      ${tab.label}
    </button>`
  ).join('');

  return `<div class="tabs">
    ${tabsHTML}
  </div>`;
}

/**
 * Cria painel de informações (key-value)
 * @param {Object} data - Dados a exibir { chave: valor }
 * @param {Object} options - Opções de layout
 * @returns {string} HTML do painel
 */
export function createInfoPanel(data = {}, options = {}) {
  const { columns = 2, layout = 'grid' } = options;
  const gridClass = layout === 'grid' ? `info-panel-grid-${columns}` : 'info-panel-list';

  const itemsHTML = Object.entries(data).map(([key, value]) => 
    `<div class="info-item">
      <div class="info-label">${key}</div>
      <div class="info-value">${value}</div>
    </div>`
  ).join('');

  return `<div class="info-panel ${gridClass}">
    ${itemsHTML}
  </div>`;
}

/**
 * Cria um card padronizado para envolver conteúdo
 * @param {Object} config - { title, subtitle, content, footer, className }
 * @returns {string} HTML do card
 */
export function createCard(config = {}) {
  const { title, subtitle, content = '', footer = '', className = '' } = config;

  let headerHTML = '';
  if (title || subtitle) {
    headerHTML = `<div class="card-header">
      ${title ? `<div><div class="card-title">${title}</div>${subtitle ? `<div class="card-subtitle">${subtitle}</div>` : ''}</div>` : ''}
    </div>`;
  }

  let footerHTML = '';
  if (footer) {
    footerHTML = `<div class="card-footer">${footer}</div>`;
  }

  return `<div class="card ${className}">
    ${headerHTML}
    <div class="card-content">
      ${content}
    </div>
    ${footerHTML}
  </div>`;
}

/**
 * Cria um container com validação e estados de carregamento
 * @param {Object} config - { isLoading, isEmpty, error, content }
 * @returns {string} HTML com estado apropriado
 */
export function createStateContainer(config = {}) {
  const { isLoading = false, isEmpty = false, error = null, content = '' } = config;

  if (isLoading) {
    return `<div class="state-container loading">
      <div class="loading-spinner"></div>
      <p>Carregando...</p>
    </div>`;
  }

  if (error) {
    return `<div class="state-container error">
      <p class="error-message">⚠️ ${error}</p>
    </div>`;
  }

  if (isEmpty) {
    return `<div class="state-container empty">
      <p class="empty-message">Nenhum resultado encontrado</p>
    </div>`;
  }

  return content;
}

/**
 * Cria um painel de legenda/informações
 * @param {Array} items - Array de itens { label, color, icon }
 * @returns {string} HTML da legenda
 */
export function createLegend(items = []) {
  const itemsHTML = items.map(item => 
    `<div class="legend-item">
      <div class="legend-color" style="background-color: ${item.color}; ${item.icon ? `background-image: url(${item.icon})` : ''};"></div>
      <span class="legend-label">${item.label}</span>
    </div>`
  ).join('');

  return `<div class="legend">
    ${itemsHTML}
  </div>`;
}

/**
 * Cria um selector/dropdown padronizado
 * @param {Object} config - { id, label, options, selected, onChange }
 * @returns {string} HTML do selector
 */
export function createSelector(config = {}) {
  const { id, label, options = [], selected = '', multiple = false } = config;

  const optionsHTML = options.map(opt => {
    const value = typeof opt === 'string' ? opt : opt.value;
    const text = typeof opt === 'string' ? opt : opt.label;
    const isSelected = value === selected ? 'selected' : '';
    return `<option value="${value}" ${isSelected}>${text}</option>`;
  }).join('');

  return `<div class="selector-group">
    ${label ? `<label for="${id}">${label}</label>` : ''}
    <select id="${id}" ${multiple ? 'multiple' : ''}>
      ${optionsHTML}
    </select>
  </div>`;
}
