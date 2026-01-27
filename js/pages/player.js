/**
 * Módulo Player Page
 * Gerencia perfil de jogadores, estatísticas e decks
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCOHP_pb8H_fQEqYG9S8OteLk4E-7dmTUU",
  authDomain: "registro-mtg.firebaseapp.com",
  projectId: "registro-mtg",
  storageBucket: "registro-mtg.firebasestorage.app",
  messagingSenderId: "723737182903",
  appId: "1:723737182903:web:1475d4d8d8f76639d00332"
};

const APP_ID = firebaseConfig.projectId;

const CLOUD_FUNCTION_ENDPOINT = "https://us-central1-registro-mtg.cloudfunctions.net/importDeck";
const decksCollectionPath = `artifacts/${APP_ID}/public/data/decks`;
const matchesCollectionPath = `artifacts/${APP_ID}/public/data/matches`;

let db, auth;

/**
 * Inicializa autenticação Firebase
 */
async function initializeAuth() {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    await signInAnonymously(auth);

    const statusEl = document.getElementById('auth-status');
    statusEl.textContent = 'Conectado';
    statusEl.className = 'auth-status connected';

    await loadPlayerDatalist();
  } catch (error) {
    console.error("Erro no login:", error);
    const statusEl = document.getElementById('auth-status');
    statusEl.textContent = 'Erro de Conexão';
    statusEl.className = 'auth-status error';
  }
}

/**
 * Carrega lista de jogadores
 */
async function loadPlayerDatalist() {
  try {
    const decksRef = collection(db, decksCollectionPath);
    const snapshot = await getDocs(decksRef);
    const playerNames = new Set();

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.playerName) {
        playerNames.add(data.playerName.trim());
      }
    });

    const datalist = document.getElementById('players-datalist');
    datalist.innerHTML = Array.from(playerNames)
      .sort()
      .map(name => `<option value="${name}">`)
      .join('');
  } catch (error) {
    console.error("Erro ao carregar lista de jogadores:", error);
  }
}

/**
 * Formata valor USD para exibição
 */
function formatUSDDisplay(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    value = 0;
  }
  return '$ ' + value.toFixed(2).replace('.', ',');
}

/**
 * Exibe feedback ao usuário
 */
function showFeedback(message, isError = false) {
  const feedback = document.getElementById('update-feedback');
  feedback.textContent = message;
  feedback.classList.remove('hidden', 'error', 'success');
  feedback.classList.add(isError ? 'error' : 'success');

  setTimeout(() => feedback.classList.add('hidden'), 5000);
}

/**
 * Exibe estatísticas do jogador
 */
async function displayPlayerStats(playerName) {
  const statsContainer = document.getElementById('player-stats-display');
  statsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Calculando estatísticas...</div>';

  try {
    const matchesRef = collection(db, matchesCollectionPath);
    const decksRef = collection(db, decksCollectionPath);

    const allMatchesSnapshot = await getDocs(matchesRef);
    const allMatches = allMatchesSnapshot.docs.map(doc => doc.data());

    let totalGames = 0;
    let wins = 0;
    const targetName = playerName.trim();

    allMatches.forEach(match => {
      const isWinner = match.winner && (match.winner.name && match.winner.name.trim() === targetName);
      const wasParticipant = match.players && match.players.some(p => p.name && p.name.trim() === targetName);

      if (isWinner || wasParticipant) {
        totalGames++;
        if (isWinner) wins++;
      }
    });

    const decksQuery = query(decksRef, where("playerName", "==", playerName));
    const decksSnapshot = await getDocs(decksQuery);
    const totalDecks = decksSnapshot.size;

    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) + '%' : '0%';

    document.getElementById('player-name-display').textContent = `Perfil de ${playerName}`;

    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${totalGames}</div>
        <div class="stat-label">Jogos Totais</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${winRate}</div>
        <div class="stat-label">Taxa de Vitória</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalDecks}</div>
        <div class="stat-label">Decks Registrados</div>
      </div>
    `;
  } catch (error) {
    console.error("Erro ao calcular estatísticas:", error);
    statsContainer.innerHTML = `<div style="grid-column: 1/-1; color: var(--danger);">Erro ao carregar estatísticas</div>`;
  }
}

/**
 * Carrega e renderiza decks do jogador
 */
async function loadAndRenderDecks(playerName) {
  const decksContainer = document.getElementById('decks-table');
  decksContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">Carregando decks...</p>';

  try {
    const decksRef = collection(db, decksCollectionPath);
    const decksQuery = query(decksRef, where("playerName", "==", playerName));
    const snapshot = await getDocs(decksQuery);

    const decks = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

    if (decks.length === 0) {
      decksContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 1rem;">Nenhum deck encontrado.</p>`;
      return;
    }

    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>Nome do Deck</th>
            <th>Cores</th>
            <th>CMC</th>
            <th>Tags</th>
            <th>URL Lista</th>
            <th>Custo USD</th>
            <th>Bracket</th>
            <th style="text-align: center;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${decks.map(deck => `
            <tr id="deck-row-${deck.docId}">
              <td><input type="text" value="${deck.deckName || ''}" data-field="deckName" class="deck-input deck-name-input"></td>
              <td>
                <div class="color-selector" data-deck-id="${deck.docId}">
                  ${['W', 'U', 'B', 'R', 'G'].map(c => `
                    <input type="checkbox" 
                           class="color-checkbox color-${c} deck-color-checkbox" 
                           data-color="${c}"
                           ${(deck.colors || []).includes(c) ? 'checked' : ''}
                           title="${c}">
                  `).join('')}
                </div>
              </td>
              <td><input type="number" min="0" step="1" value="${deck.cmc || ''}" data-field="cmc" placeholder="0" class="deck-input deck-cmc-input" style="text-align: center;"></td>
              <td><input type="text" value="${deck.strategy || ''}" data-field="strategy" placeholder="Tags..." class="deck-input deck-strategy-input"></td>
              <td><input type="url" value="${deck.listURL || ''}" data-field="listURL" placeholder="https://..." class="deck-input deck-list-url-input"></td>
              <td><input type="text" value="${formatUSDDisplay(deck.costUSD)}" data-field="costUSD" placeholder="$ 0,00" class="deck-input deck-cost-usd-input" style="text-align: right;"></td>
              <td>
                <select data-field="bracket" class="deck-input deck-bracket-select">
                  <option value="Unset" ${deck.bracket === 'Unset' || !deck.bracket ? 'selected' : ''}>Unset</option>
                  <option value="1 - Exhibition" ${deck.bracket === '1 - Exhibition' ? 'selected' : ''}>1 - Exh</option>
                  <option value="2 - Core" ${deck.bracket === '2 - Core' ? 'selected' : ''}>2 - Core</option>
                  <option value="3 - Upgraded" ${deck.bracket === '3 - Upgraded' ? 'selected' : ''}>3 - Upg</option>
                  <option value="4 - Optimized" ${deck.bracket === '4 - Optimized' ? 'selected' : ''}>4 - Opt</option>
                  <option value="5 - cEDH" ${deck.bracket === '5 - cEDH' ? 'selected' : ''}>5 - cEDH</option>
                </select>
              </td>
              <td style="text-align: center;">
                <div class="deck-actions">
                  <button onclick="updateDeck('${deck.docId}', '${playerName}')" class="btn btn-success btn-sm">Salvar</button>
                  <button onclick="importDeckData('${deck.docId}')" class="btn btn-primary btn-sm">Import</button>
                  <button onclick="deleteDeck('${deck.docId}', '${playerName}')" class="btn btn-danger btn-sm">Del</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    decksContainer.innerHTML = tableHTML;
  } catch (error) {
    console.error("Erro ao carregar decks:", error);
    decksContainer.innerHTML = `<p style="color: var(--danger); text-align: center; padding: 1rem;">Erro ao carregar decks</p>`;
  }
}

/**
 * Atualiza um deck
 */
async function updateDeck(deckDocId, playerName) {
  const deckRow = document.getElementById(`deck-row-${deckDocId}`);
  const saveBtn = deckRow.querySelector('.btn-success');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Salvando...';

  try {
    const checkedColors = Array.from(deckRow.querySelectorAll('.deck-color-checkbox:checked'))
      .map(checkbox => checkbox.dataset.color);

    const rawCmc = deckRow.querySelector('.deck-cmc-input').value;
    const cmcValue = Math.max(0, parseInt(rawCmc, 10) || 0);

    const costUSDString = deckRow.querySelector('.deck-cost-usd-input').value
      .replace(/[$,\s]/g, '')
      .replace('.', ',');
    const costUSDValue = parseFloat(costUSDString.replace(',', '.')) || 0;

    const newDeckData = {
      deckName: deckRow.querySelector('.deck-name-input').value.trim(),
      colors: checkedColors,
      cmc: cmcValue,
      strategy: deckRow.querySelector('.deck-strategy-input').value.trim(),
      listURL: deckRow.querySelector('.deck-list-url-input').value.trim(),
      costUSD: costUSDValue,
      bracket: deckRow.querySelector('.deck-bracket-select').value,
      lastUpdated: new Date().toISOString(),
      playerName: playerName
    };

    const deckDocRef = doc(db, decksCollectionPath, deckDocId);
    await updateDoc(deckDocRef, newDeckData);

    showFeedback(`Deck "${newDeckData.deckName}" atualizado!`);
    await loadAndRenderDecks(playerName);
  } catch (error) {
    console.error("Erro ao atualizar deck:", error);
    showFeedback(`Erro ao salvar: ${error.message}`, true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Salvar';
  }
}

/**
 * Importa dados do deck
 */
async function importDeckData(deckDocId) {
  const deckRow = document.getElementById(`deck-row-${deckDocId}`);
  const importBtn = deckRow.querySelector('.btn-primary');
  const urlInput = deckRow.querySelector('.deck-list-url-input');
  const url = urlInput.value.trim();

  if (!url) {
    showFeedback("Insira a URL antes de importar", true);
    return;
  }

  const allBtns = deckRow.querySelectorAll('button');
  allBtns.forEach(btn => btn.disabled = true);
  importBtn.textContent = 'Importando...';

  try {
    const response = await fetch(CLOUD_FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    const data = await response.json();

    deckRow.querySelector('.deck-name-input').value = data.deckName || '';
    const importedColors = data.colors || [];
    deckRow.querySelectorAll('.deck-color-checkbox').forEach(checkbox => {
      checkbox.checked = importedColors.includes(checkbox.dataset.color);
    });
    deckRow.querySelector('.deck-cmc-input').value = data.cmc ? Math.floor(data.cmc) : 0;
    deckRow.querySelector('.deck-cost-usd-input').value = formatUSDDisplay(data.costUSD);
    deckRow.querySelector('.deck-strategy-input').value = data.tags || '';

    showFeedback("Dados importados! Revise e salve.");
  } catch (error) {
    console.error("Erro de importação:", error);
    showFeedback(`Falha na importação: ${error.message}`, true);
  } finally {
    importBtn.textContent = 'Import';
    allBtns.forEach(btn => btn.disabled = false);
  }
}

/**
 * Deleta um deck
 */
async function deleteDeck(deckDocId, playerName) {
  if (!confirm("Tem certeza que deseja DELETAR este deck? Ação irreversível.")) {
    return;
  }

  const deckRow = document.getElementById(`deck-row-${deckDocId}`);
  const deleteBtn = deckRow.querySelector('.btn-danger');
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deletando...';

  try {
    const deckDocRef = doc(db, decksCollectionPath, deckDocId);
    await deleteDoc(deckDocRef);

    showFeedback("Deck deletado com sucesso.");
    deckRow.remove();
    await loadAndRenderDecks(playerName);
  } catch (error) {
    console.error("Erro ao deletar deck:", error);
    showFeedback(`Falha ao deletar: ${error.message}`, true);
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.textContent = 'Del';
  }
}

/**
 * Inicializa a página
 */
document.addEventListener('DOMContentLoaded', async () => {
  await initializeAuth();
  const playerSelect = document.getElementById('player-select');

  playerSelect.addEventListener('change', async (event) => {
    const selectedPlayer = event.target.value.trim();
    const datalist = document.getElementById('players-datalist');
    const isValidPlayer = Array.from(datalist.options).some(
      option => option.value.trim() === selectedPlayer
    );

    const profileContainer = document.getElementById('player-profile-container');
    const decksContainer = document.getElementById('decks-list-container');

    if (isValidPlayer) {
      profileContainer.classList.remove('hidden');
      decksContainer.classList.remove('hidden');
      await displayPlayerStats(selectedPlayer);
      await loadAndRenderDecks(selectedPlayer);
    } else {
      profileContainer.classList.add('hidden');
      decksContainer.classList.add('hidden');
    }
  });
});

// Expõe funções globais para onclick
window.updateDeck = updateDeck;
window.importDeckData = importDeckData;
window.deleteDeck = deleteDeck;
