/**
 * Módulo Bar Chart
 * Cria visualizações de gráficos em barra para eliminações
 */

const SEGMENT_CONFIG = {
  'C': { label: 'Combat', opacity: 1 },
  'D': { label: 'Commander', opacity: 0.8 },
  'N': { label: 'Non-Combat', opacity: 0.6 },
  'O': { label: 'Other', opacity: 0.4 }
};

const COLORS = {
  green: 'rgb(16, 185, 129)',
  red: 'rgb(239, 68, 68)'
};

/**
 * Cria barra de eliminações com segmentos coloridos
 */
export function createEliminationBar(percentages = {}, isSuccess = true) {
  const color = isSuccess ? COLORS.green : COLORS.red;

  const segments = Object.entries(percentages)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => createSegment(key, value, color))
    .join('');

  return `<div style="display: flex; width: 100%; height: 6px; border-radius: 3px; overflow: hidden; background-color: rgba(75, 85, 99, 0.5);">
    ${segments}
  </div>`;
}

/**
 * Cria um segmento individual da barra
 */
function createSegment(key, value, color) {
  const config = SEGMENT_CONFIG[key] || { label: key, opacity: 0.5 };
  const pct = Math.max(0, Math.min(100, parseFloat(value)));
  
  if (pct <= 0) return '';

  return `<div style="position: relative; width: ${pct}%; height: 100%; background-color: ${color}; opacity: ${config.opacity}; transition: opacity 0.2s ease;">
    <div style="visibility: hidden; background-color: rgb(17, 24, 39); color: white; padding: 4px 8px; position: absolute; border-radius: 4px; font-size: 0.7rem; z-index: 20; bottom: 100%; left: 50%; transform: translateX(-50%); white-space: nowrap; pointer-events: none;">
      ${config.label}: ${pct.toFixed(0)}%
    </div>
  </div>`;
}

/**
 * Gera legenda para tipos de eliminação
 */
export function createEliminationLegend() {
  return Object.entries(SEGMENT_CONFIG)
    .map(([key, config]) => `<span style="font-size: 0.75rem; margin-right: 1rem;"><strong>${key}</strong> = ${config.label}</span>`)
    .join('');
}

