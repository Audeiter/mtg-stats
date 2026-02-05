/**
 * Módulo Bar Chart
 * DEPRECATED: Use statsComponents.js em seu lugar
 * 
 * Este módulo foi mantido para compatibilidade com versões anteriores.
 * Novas implementações devem usar statsComponents.createEliminationBar()
 */

import { createEliminationBar } from './statsComponents.js';

/**
 * Cria barras horizontais para eliminações com formato CDNO
 * DEPRECATED: Use statsComponents.createEliminationBar() em seu lugar
 * 
 * @deprecated Use createEliminationBar from statsComponents.js
 * @param {Object} percentages - Percentuais { C, D, N, O }
 * @param {string} color - Cor da barra
 * @returns {string} HTML da barra
 */
export function createEliminationBar(percentages = {}, color = 'green') {
  // Redireciona para o novo módulo centralizado
  return createEliminationBar(percentages, color);
}

// Exportação para compatibilidade com código antigo
export { createEliminationBar as default };
