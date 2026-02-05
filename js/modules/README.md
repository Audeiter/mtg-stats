# Módulos do Site MTG

## statsComponents.js
Componentes padronizados reutilizáveis para toda a aplicação:
- `createEliminationBar()` - Barra de eliminações com 4 tipos
- `createTable()` - Tabela padronizada
- `createFiltersSection()` - Seção de filtros
- `createSelector()` - Seletor dropdown
- `createStatsCards()` - Cards de estatísticas
- `createTabs()` - Sistema de abas
- `createCard()` - Card genérico
- `createStateContainer()` - Container com estado
- `createInfoPanel()` - Painel de informações
- `createLegend()` - Legenda visual

Uso:
```javascript
import { createEliminationBar, createTable } from '../modules/statsComponents.js';

// Barra de eliminações
const bar = createEliminationBar({ C: 25, D: 50, N: 20, O: 5 }, 'green');

// Tabela
const table = createTable(headers, rows, options);
```

## Outros Módulos
- **supabaseClient.js** - Conexão e operações Supabase
- **dataProcessor.js** - Processamento de dados
- **domUtils.js** - Utilidades DOM
- **firebaseClient.js** - Integração Firebase (legado)
- **barChart.js** - Compatibilidade com código antigo

## CSS
Todos os componentes usam classes CSS definidas em `styles.css`:
- `.stats-table` - Tabela padronizada
- `.elimination-bar-*` - Barras de eliminação
- `.stat-card` - Cards
- Variáveis CSS para tema: `--bg-primary`, `--text-primary`, etc.

## Integração
Todas as páginas já foram atualizadas para usar os novos componentes:
- `stats.js` - Página principal de estatísticas
- `player.js` - Perfil de jogador
- `colors.js` - Estatísticas por cores
- `manage.js` - Gerenciamento de partidas
- `strategy.js` - Estratégias
- `retrospective.js` - Dashboard retrospectivo
