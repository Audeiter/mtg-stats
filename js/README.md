/**
 * Guia de Estrutura de Módulos
 * 
 * ORGANIZAÇÃO:
 * /js/
 *   /modules/          - Módulos reutilizáveis
 *     - supabaseClient.js    (conexão com Supabase)
 *     - firebaseClient.js    (conexão com Firebase)
 *     - domUtils.js          (funções DOM comuns)
 *     - dataProcessor.js     (processamento de dados)
 *     - barChart.js          (gráficos)
 *   /pages/            - Módulos específicos de páginas
 *     - stats.js        (página de estatísticas)
 *     - manage.js       (página de gerenciamento)
 *
 * COMO USAR NOS ARQUIVOS HTML:
 * 
 * 1. No </head> da página, REMOVA todos os <script> tradicionais
 * 2. No final do </body>, adicione apenas:
 * 
 *    Para stats.html:
 *    <script type="module" src="js/pages/stats.js"><\/script>
 * 
 *    Para manage.html:
 *    <script type="module" src="js/pages/manage.js"><\/script>
 * 
 * BENEFÍCIOS:
 * ✓ Código organizado e modular
 * ✓ Fácil manutenção
 * ✓ Reutilização de código entre páginas
 * ✓ Sem poluição do escopo global
 * ✓ Melhor controle de dependências
 * 
 * EXEMPLO DE IMPORTAÇÃO EM UM NOVO MÓDULO:
 * 
 * import { fetchMatches } from '../modules/supabaseClient.js';
 * import { el, show, hide } from '../modules/domUtils.js';
 * 
 * async function minhaFuncao() {
 *   const matches = await fetchMatches();
 *   const container = el('my-container');
 *   show(container);
 * }
 */
