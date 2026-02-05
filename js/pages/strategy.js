/**
 * Módulo Strategy Tab
 * Estatísticas por tags/estratégia dos decks
 * Atualmente vazio - aguardando dados de tags
 */

import { createTable } from '../modules/statsComponents.js';
import { el, setHTML } from '../modules/domUtils.js';

class StrategyTab {
  constructor() {
    this.strategyStats = {};
  }

  init() {
    this.renderPlaceholder();
  }

  renderPlaceholder() {
    const container = el('strategy-container');
    if (!container) return;

    const html = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        text-align: center;
        background-color: var(--bg-secondary);
        border-radius: 0.5rem;
        border: 1px dashed var(--border-color);
      ">
        <div style="font-size: 2.5rem; margin-bottom: 1rem;">🔄</div>
        <h3 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">Dados de Estratégia</h3>
        <p style="margin: 0 0 1rem 0; color: var(--text-secondary); max-width: 400px;">
          Os dados de estratégia (tags dos decks) ainda não foram preenchidos no banco de dados. 
          Esta aba será atualizada assim que os dados estiverem disponíveis.
        </p>
        <div style="
          padding: 0.75rem 1rem;
          background-color: rgba(62, 102, 120, 0.2);
          border: 1px solid var(--border-color);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        ">
          Aguardando preenchimento das tags no SUPABASE
        </div>
      </div>
    `;

    setHTML(container, html);
  }
}

// Instancia quando a tab for ativada
export { StrategyTab };
