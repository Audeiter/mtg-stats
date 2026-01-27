/**
 * Módulo Register Page (Registro de Partidas)
 * Controla a lógica da página de registro de partidas com novo layout
 */

import { supabase } from '../modules/supabaseClient.js';
import { el, on } from '../modules/domUtils.js';

// Classe Autocomplete customizada
class Autocomplete {
  constructor(inputElement, listElement, dataSource) {
    this.inputElement = inputElement;
    this.listElement = listElement;
    this.dataSource = dataSource; // função que retorna array de opções
    this.options = [];
    this.highlighted = -1;

    this.setupListeners();
  }

  setupListeners() {
    on(this.inputElement, 'input', () => this.handleInput());
    on(this.inputElement, 'focus', () => this.handleInput());
    on(this.inputElement, 'blur', () => setTimeout(() => this.close(), 200));
    on(this.inputElement, 'keydown', (e) => this.handleKeydown(e));
    on(this.listElement, 'click', (e) => this.handleItemClick(e));
  }

  handleInput() {
    const value = this.inputElement.value.toLowerCase();
    this.options = this.dataSource(value);
    this.highlighted = -1;
    this.render();
  }

  render() {
    this.listElement.innerHTML = '';
    
    if (this.options.length === 0) {
      this.listElement.classList.remove('active');
      return;
    }

    this.listElement.classList.add('active');
    this.options.forEach((opt, idx) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      if (idx === this.highlighted) item.classList.add('highlighted');
      item.textContent = opt;
      item.dataset.index = idx;
      this.listElement.appendChild(item);
    });
  }

  handleKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlighted = Math.min(this.highlighted + 1, this.options.length - 1);
      this.render();
      this.scrollToHighlighted();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlighted = Math.max(this.highlighted - 1, -1);
      this.render();
      this.scrollToHighlighted();
    } else if (e.key === 'Enter' && this.highlighted >= 0) {
      e.preventDefault();
      this.selectOption(this.options[this.highlighted]);
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  handleItemClick(e) {
    if (e.target.classList.contains('list-item')) {
      this.selectOption(e.target.textContent);
    }
  }

  selectOption(value) {
    this.inputElement.value = value;
    this.close();
    this.inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  }

  scrollToHighlighted() {
    const items = this.listElement.querySelectorAll('.list-item');
    if (items[this.highlighted]) {
      items[this.highlighted].scrollIntoView({ block: 'nearest' });
    }
  }

  close() {
    this.listElement.classList.remove('active');
    this.highlighted = -1;
  }
}

class RegisterPage {
  constructor() {
    this.activePlayers = [];
    this.allPlayers = []; // Todos os jogadores (inativos inclusive)
    this.activeDecks = {};
    this.allDecks = {}; // Todos os decks
    this.eliminatedPlayerCount = 0;
    this.autocompletes = [];
    this.formPlayers = []; // Jogadores inseridos no formulário (vencedor + eliminados)
    
    // Elementos do formulário
    this.matchForm = el('matchForm');
    this.matchDate = el('match-date');
    this.winnerPlayer = el('winner-player');
    this.winnerDeck = el('winner-deck');
    this.matchNotes = el('match-notes');
    this.eliminatedContainer = el('eliminated-players-container');
    this.btnAddPlayer = el('btn-add-player');
    this.btnSave = el('btn-save');
    this.authStatus = el('auth-status');
    
    // Modal de validação
    this.validationModal = el('validation-modal');
    this.validationMessage = el('validation-message');
    this.btnContinueInvalid = el('btn-continue-invalid');
    this.btnCloseValidation = el('btn-close-validation');
    
    // Template
    this.eliminatedTemplate = el('eliminated-player-template');
  }

  async init() {
    // Define data de hoje
    this.matchDate.valueAsDate = new Date();

    // Carrega metadados (jogadores e decks)
    await this.fetchMetadata();
    
    // Configura autocomplete do vencedor
    this.setupWinnerAutocomplete();
    
    // Adiciona 2 jogadores eliminados por padrão
    for (let i = 0; i < 2; i++) {
      this.addEliminatedPlayer();
    }

    // Listeners
    on(this.btnAddPlayer, 'click', (e) => this.handleAddPlayer(e));
    on(this.matchForm, 'submit', (e) => this.handleSubmit(e));
    on(this.btnContinueInvalid, 'click', () => this.handleContinueInvalid());
    on(this.btnCloseValidation, 'click', () => this.handleCloseValidation());

    // Atualiza status de conexão
    this.updateAuthStatus();
  }

  async fetchMetadata() {
    try {
      // Busca TODOS os jogadores (ativos e inativos)
      const { data: allPlayers } = await supabase
        .from('players')
        .select('player_id, name, status')
        .order('name');
      
      this.allPlayers = allPlayers || [];
      this.activePlayers = allPlayers?.filter(p => p.status) || [];

      // Busca TODOS os decks com o ID
      const { data: allDecks } = await supabase
        .from('decks')
        .select('deck_id, player_id, deck_name, status')
        .order('deck_name');

      // Organiza decks por ID do jogador (ativos e inativos)
      allDecks?.forEach(d => {
        if (!this.allDecks[d.player_id]) {
          this.allDecks[d.player_id] = [];
        }
        this.allDecks[d.player_id].push({ id: d.deck_id, name: d.deck_name, status: d.status });
      });

      // Organiza apenas decks ativos
      allDecks?.forEach(d => {
        if (d.status) {
          if (!this.activeDecks[d.player_id]) {
            this.activeDecks[d.player_id] = [];
          }
          this.activeDecks[d.player_id].push(d.deck_name);
        }
      });
    } catch (err) {
      console.error('Erro ao carregar metadados:', err);
    }
  }

  setupWinnerAutocomplete() {
    // Autocomplete para nome do vencedor
    const winnerPlayerAutocomplete = new Autocomplete(
      this.winnerPlayer,
      el('winner-player-list'),
      (query) => this.filterPlayers(query, 'active')
    );
    this.autocompletes.push(winnerPlayerAutocomplete);

    // Autocomplete para deck do vencedor
    const winnerDeckAutocomplete = new Autocomplete(
      this.winnerDeck,
      el('winner-deck-list'),
      (query) => this.filterDecksForWinner(query)
    );
    this.autocompletes.push(winnerDeckAutocomplete);

    // Listener para atualizar decks ao mudar vencedor
    on(this.winnerPlayer, 'change', () => {
      this.winnerDeck.value = '';
      el('winner-deck-list').classList.remove('active');
      this.updateFormPlayers();
    });

    // Listener para atualizar lista ao digitar no vencedor
    on(this.winnerPlayer, 'input', () => {
      this.updateFormPlayers();
    });
  }

  addEliminatedPlayer() {
    if (this.eliminatedPlayerCount >= 3) {
      alert('Máximo 3 jogadores eliminados!');
      return;
    }

    const clone = this.eliminatedTemplate.content.cloneNode(true);
    const card = clone.querySelector('.player-card');
    const titleEl = card.querySelector('.player-card-title');
    card.dataset.playerIndex = this.eliminatedPlayerCount;
    
    // Garante que o botão de remover funcione
    const removeBtn = card.querySelector('.btn-remove-player');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        card.remove();
        this.eliminatedPlayerCount--;
        this.updateAddButton();
        this.updateFormPlayers();
      });
    }
    
    // Configura autocompletes para este card
    const playerInput = card.querySelector('.elim-player-name');
    const playerList = card.querySelector('.elim-player-list');
    const deckInput = card.querySelector('.elim-player-deck');
    const deckList = card.querySelector('.elim-player-deck-list');
    const byInput = card.querySelector('.elim-player-by');
    const byList = card.querySelector('.elim-player-by-list');

    // Autocomplete para nome do jogador eliminado
    const playerAutocomplete = new Autocomplete(
      playerInput,
      playerList,
      (query) => this.filterPlayers(query, 'active')
    );
    this.autocompletes.push(playerAutocomplete);

    // Autocomplete para deck do jogador eliminado
    const deckAutocomplete = new Autocomplete(
      deckInput,
      deckList,
      (query) => this.filterDecksForEliminated(playerInput, query)
    );
    this.autocompletes.push(deckAutocomplete);

    // Autocomplete para "Eliminado por" (mostra jogadores do formulário)
    const byAutocomplete = new Autocomplete(
      byInput,
      byList,
      (query) => this.filterFormPlayers(query)
    );
    this.autocompletes.push(byAutocomplete);

    // Listener para atualizar decks ao mudar jogador
    on(playerInput, 'change', () => {
      deckInput.value = '';
      deckList.classList.remove('active');
      this.updateFormPlayers();
      this.updateCardTitle(card, titleEl, playerInput, deckInput);
    });

    // Listener para atualizar título ao mudar deck
    on(deckInput, 'change', () => {
      this.updateCardTitle(card, titleEl, playerInput, deckInput);
    });

    // Listener para atualizar lista de eliminadores em tempo real
    on(playerInput, 'input', () => {
      this.updateFormPlayers();
    });

    this.eliminatedContainer.appendChild(clone);
    this.eliminatedPlayerCount++;
    this.updateAddButton();
    this.updateFormPlayers();
  }

  updateCardTitle(card, titleEl, playerInput, deckInput) {
    const playerName = playerInput.value.trim();
    const deckName = deckInput.value.trim();

    if (playerName && deckName) {
      titleEl.textContent = `${deckName} (${playerName})`;
    } else if (playerName) {
      titleEl.textContent = playerName;
    } else {
      titleEl.textContent = 'Novo Jogador';
    }
  }

  updateFormPlayers() {
    // Coleta vencedor
    this.formPlayers = [];
    const winnerName = this.winnerPlayer.value.trim();
    if (winnerName) {
      this.formPlayers.push(winnerName);
    }

    // Coleta eliminados
    const elimCards = this.eliminatedContainer.querySelectorAll('.player-card');
    elimCards.forEach(card => {
      const name = card.querySelector('.elim-player-name').value.trim();
      if (name) {
        this.formPlayers.push(name);
      }
    });
  }

  filterFormPlayers(query) {
    if (!query) {
      return this.formPlayers;
    }
    return this.formPlayers.filter(p => p.toLowerCase().startsWith(query));
  }

  filterPlayers(query, filter = 'active') {
    const players = filter === 'active' ? this.activePlayers : this.allPlayers;
    if (!query) {
      return players.map(p => p.name);
    }
    return players
      .filter(p => p.name.toLowerCase().startsWith(query))
      .map(p => p.name);
  }

  filterDecksForWinner(query) {
    const playerName = this.winnerPlayer.value;
    const player = this.activePlayers.find(p => p.name === playerName);
    
    if (!player) return [];

    const decks = this.activeDecks[player.player_id] || [];
    if (!query) return decks;
    
    return decks.filter(d => d.toLowerCase().includes(query));
  }

  filterDecksForEliminated(playerInput, query) {
    const playerName = playerInput.value;
    const player = this.allPlayers.find(p => p.name === playerName);
    
    if (!player) return [];

    // Busca todos os decks do jogador
    let decks = this.allDecks[player.player_id] || [];
    
    // Se o jogador tem decks ativos, usa só os ativos
    const activeDecks = decks.filter(d => d.status);
    if (activeDecks.length > 0) {
      decks = activeDecks;
    }

    const deckNames = decks.map(d => d.name);
    
    if (!query) return deckNames;
    
    return deckNames.filter(d => d.toLowerCase().includes(query));
  }

  updateAddButton() {
    this.btnAddPlayer.disabled = this.eliminatedPlayerCount >= 3;
  }

  handleAddPlayer(e) {
    if (e) {
      e.preventDefault();
    }
    this.addEliminatedPlayer();
  }

  validateForm() {
    const errors = [];
    const notFoundData = {
      players: new Set(),
      decks: new Set()
    };

    // Valida vencedor
    const winner = this.winnerPlayer.value.trim();
    const winnerDeck = this.winnerDeck.value.trim();

    if (!winner || !winnerDeck) {
      errors.push('Dados do vencedor incompletos.');
      return errors;
    }

    // Valida se jogador e deck existem
    const winnerExists = this.allPlayers.some(p => p.name === winner);
    if (!winnerExists) {
      notFoundData.players.add(winner);
    }

    const winnerPlayer = this.allPlayers.find(p => p.name === winner);
    if (winnerPlayer && this.allDecks[winnerPlayer.player_id]) {
      const deckExists = this.allDecks[winnerPlayer.player_id].some(d => d.name === winnerDeck);
      if (!deckExists) {
        notFoundData.decks.add(`${winnerDeck} (${winner})`);
      }
    } else if (winnerPlayer && !this.allDecks[winnerPlayer.player_id]) {
      notFoundData.decks.add(`${winnerDeck} (${winner})`);
    }

    // Valida jogadores eliminados
    const elimCards = this.eliminatedContainer.querySelectorAll('.player-card');
    let validElimCount = 0;

    elimCards.forEach((card, idx) => {
      const name = card.querySelector('.elim-player-name').value.trim();
      const deck = card.querySelector('.elim-player-deck').value.trim();
      const elimBy = card.querySelector('.elim-player-by').value.trim();
      const elimType = card.querySelector('.elim-type').value.trim();

      if (name || deck || elimBy || elimType) {
        validElimCount++;

        // Valida se tem todos os campos preenchidos
        if (!name || !deck) {
          errors.push(`Jogador eliminado ${validElimCount}: Nome e Deck são obrigatórios.`);
        }

        // Valida existência
        const elimExists = this.allPlayers.some(p => p.name === name);
        if (name && !elimExists) {
          notFoundData.players.add(name);
        } else if (name) {
          const elimPlayer = this.allPlayers.find(p => p.name === name);
          if (elimPlayer && this.allDecks[elimPlayer.player_id]) {
            const deckExists = this.allDecks[elimPlayer.player_id].some(d => d.name === deck);
            if (!deckExists && deck) {
              notFoundData.decks.add(`${deck} (${name})`);
            }
          } else if (elimPlayer && !this.allDecks[elimPlayer.player_id] && deck) {
            notFoundData.decks.add(`${deck} (${name})`);
          }
        }
      }
    });

    if (validElimCount < 1) {
      errors.push('Mínimo 1 jogador eliminado obrigatório.');
    }
    if (validElimCount > 3) {
      errors.push('Máximo 3 jogadores eliminados.');
    }

    // Se há dados não encontrados, cria um erro indicando
    if (notFoundData.players.size > 0 || notFoundData.decks.size > 0) {
      errors.push({
        type: 'notFound',
        players: Array.from(notFoundData.players),
        decks: Array.from(notFoundData.decks)
      });
    }

    return errors;
  }

  showValidationModal(errors) {
    let message = '';

    // Procura pelo erro de dados não encontrados
    const notFoundError = errors.find(err => err && err.type === 'notFound');

    if (notFoundError) {
      message += '<p><strong>Os seguintes dados não foram encontrados no banco de dados:</strong></p>';
      
      if (notFoundError.players.length > 0) {
        message += '<p><strong>Jogadores:</strong><ul>';
        notFoundError.players.forEach(player => {
          message += `<li>${player}</li>`;
        });
        message += '</ul></p>';
      }

      if (notFoundError.decks.length > 0) {
        message += '<p><strong>Decks:</strong><ul>';
        notFoundError.decks.forEach(deck => {
          message += `<li>${deck}</li>`;
        });
        message += '</ul></p>';
      }

      message += '<p>Deseja registrar a partida mesmo assim?</p>';
    }

    // Mostra outros erros
    const otherErrors = errors.filter(err => !err || err.type !== 'notFound');
    if (otherErrors.length > 0) {
      message += '<p><strong>Erros de validação:</strong><ul>';
      otherErrors.forEach(err => {
        message += `<li>${typeof err === 'string' ? err : 'Erro desconhecido'}</li>`;
      });
      message += '</ul></p>';
    }

    this.validationMessage.innerHTML = message;
    this.validationModal.classList.add('active');
  }

  handleCloseValidation() {
    this.validationModal.classList.remove('active');
  }

  async handleContinueInvalid() {
    this.validationModal.classList.remove('active');
    await this.saveMatch();
  }

  async handleSubmit(e) {
    e.preventDefault();

    const validationErrors = this.validateForm();
    
    // Se há erros que não são "not found", não permite continuar
    const fatalErrors = validationErrors.filter(err => !err || err.type !== 'notFound');
    
    if (fatalErrors.length > 0 || validationErrors.length > 0) {
      this.showValidationModal(validationErrors);
      return;
    }

    await this.saveMatch();
  }

  async saveMatch() {
    this.btnSave.disabled = true;
    this.btnSave.innerText = 'Salvando...';

    try {
      const date = this.matchDate.value;
      const notes = this.matchNotes.value.trim();

      // 1. Inserir match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert([{ date, notes }])
        .select();

      if (matchError) throw matchError;
      if (!matchData || !matchData[0]) throw new Error('Erro ao criar partida');

      const matchId = matchData[0].match_id;

      // 2. Preparar participantes
      const participants = [];
      let rank = 1;

      // Vencedor
      const winnerName = this.winnerPlayer.value.trim();
      const winnerDeckName = this.winnerDeck.value.trim();
      
      const winnerPlayer = this.allPlayers.find(p => p.name === winnerName);
      const winnerDeck = this.allDecks[winnerPlayer.player_id]?.find(d => d.name === winnerDeckName);

      if (winnerPlayer && winnerDeck) {
        participants.push({
          match_id: matchId,
          player_id: winnerPlayer.player_id,
          deck_id: winnerDeck.id,
          rank: rank++,
          is_winner: true,
          turn_eliminated: null,
          elimination_type: null,
          eliminated_by: null
        });
      }

      // Eliminados
      const elimCards = this.eliminatedContainer.querySelectorAll('.player-card');
      elimCards.forEach(card => {
        const name = card.querySelector('.elim-player-name').value.trim();
        const deckName = card.querySelector('.elim-player-deck').value.trim();
        const eliminatedBy = card.querySelector('.elim-player-by').value.trim();
        const eliminationType = card.querySelector('.elim-type').value.trim();
        const turn = parseInt(card.querySelector('.elim-turn').value) || null;

        if (name && deckName) {
          const player = this.allPlayers.find(p => p.name === name);
          const deck = this.allDecks[player.player_id]?.find(d => d.name === deckName);

          if (player && deck) {
            participants.push({
              match_id: matchId,
              player_id: player.player_id,
              deck_id: deck.id,
              rank: rank++,
              is_winner: false,
              turn_eliminated: turn,
              elimination_type: eliminationType || null,
              eliminated_by: eliminatedBy || null
            });
          }
        }
      });

      // 3. Inserir participantes
      if (participants.length > 0) {
        const { error: participantError } = await supabase
          .from('match_participants')
          .insert(participants);

        if (participantError) throw participantError;
      }

      alert('Partida registrada com sucesso!');
      window.location.href = 'stats.html';

    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
      this.btnSave.disabled = false;
      this.btnSave.innerText = 'Salvar Partida';
    }
  }

  updateAuthStatus() {
    if (this.authStatus) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          this.authStatus.textContent = '✅ Conectado';
          this.authStatus.style.color = 'var(--success)';
        } else {
          this.authStatus.textContent = '❌ Desconectado';
          this.authStatus.style.color = 'var(--danger)';
        }
      });
    }
  }
}

// Instancia a página quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const registerPage = new RegisterPage();
  window.registerPageInstance = registerPage;
  registerPage.init();
});
