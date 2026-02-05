/**
 * Módulo Manage Page
 * Controla a lógica da página de gerenciamento de partidas
 */

import { createTable, createCard } from '../modules/statsComponents.js';
import { 
  supabase,
  fetchAllMatches,
  updateMatch, 
  deleteMatch
} from '../modules/supabaseClient.js';
import { el, show, hide, clear, on, getValue, setValue, setHTML } from '../modules/domUtils.js';

class ManagePage {
  constructor() {
    this.allMatches = [];
    this.filteredMatches = [];
    this.selectedIds = new Set();
    
    this.initDOM();
    this.attachListeners();
  }

  initDOM() {
    this.tableBody = el('table-body');
    this.filterYear = el('filter-year');
    this.filterText = el('filter-text');
    this.checkboxAll = el('checkbox-all');
    this.selectedCountSpan = el('selected-count');
    this.btnBulkTurn = el('btn-bulk-turn');
    this.btnBulkDelete = el('btn-bulk-delete');
    this.loadingOverlay = el('loading-overlay');
    
    this.editModal = el('edit-modal');
    this.editPlayersList = el('edit-players-list');
  }

  attachListeners() {
    on(this.filterYear, 'change', () => this.applyFilters());
    on(this.filterText, 'input', () => this.applyFilters());
    on(this.checkboxAll, 'change', (e) => this.toggleAllCheckboxes(e.target.checked));
    on(this.btnBulkTurn, 'click', () => this.bulkSetTurn());
    on(this.btnBulkDelete, 'click', () => this.bulkDelete());
  }

  async init() {
    this.showLoading(true);
    try {
      await this.loadMatches();
    } catch (error) {
      console.error("Erro init:", error);
      alert("Erro ao conectar ao banco de dados.");
    } finally {
      this.showLoading(false);
    }
  }

  async loadMatches() {
    const matches = await fetchAllMatches();
    this.allMatches = matches.sort((a, b) => new Date(b.date) - new Date(a.date));
    this.applyFilters();
  }

  applyFilters() {
    const year = getValue(this.filterYear);
    const text = getValue(this.filterText).toLowerCase();

    this.filteredMatches = this.allMatches.filter(m => {
      const matchYear = m.date.substring(0, 4);
      let passYear = true;
      
      if (year === 'legacy') passYear = parseInt(matchYear) <= 2022;
      else if (year !== 'all') passYear = matchYear === year;

      let passText = true;
      if (text) {
        // Monta string de busca com dados dos participantes
        const participantNames = (m.match_participants || [])
          .map(p => `${p.name} ${p.deck_name}`)
          .join(' ');
        const searchStr = `${m.date} ${participantNames} ${m.notes || ''}`.toLowerCase();
        passText = searchStr.includes(text);
      }

      return passYear && passText;
    });

    this.selectedIds.clear();
    this.updateSelectionUI();
    this.renderTable();
  }

  renderTable() {
    clear(this.tableBody);
    const displayList = this.filteredMatches.slice(0, 300);

    displayList.forEach(match => {
      const tr = document.createElement('tr');
      tr.className = "border-b border-gray-700 hover:bg-gray-750";
      
      // Para Supabase, acessa os participantes diretamente
      const participants = match.match_participants || [];
      const maxTurn = Math.max(0, ...participants.map(p => p.turn_eliminated || 0));
      
      // Identifica vencedor e monta resumo
      const winner = participants.find(p => p.is_winner);
      const winnerName = winner ? `${winner.name || '?'}` : '?';
      
      const playersSummary = participants.map(p => 
        `<span class="${p.is_winner ? 'text-yellow-400 font-bold' : 'text-gray-400'}">${p.name || '?'} (${p.deck_name || '?'})</span>`
      ).join(', ');

      tr.innerHTML = `
        <td class="p-4">
          <input type="checkbox" class="row-checkbox w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded" value="${match.match_id}">
        </td>
        <td class="px-6 py-4 font-mono">${match.date}</td>
        <td class="px-6 py-4 font-bold text-yellow-500">${winnerName}</td>
        <td class="px-6 py-4 truncate max-w-xs text-xs" title="${playersSummary.replace(/<[^>]*>?/gm, '')}">
          ${playersSummary}
        </td>
        <td class="px-6 py-4 text-center font-mono">${maxTurn > 0 ? maxTurn : '-'}</td>
        <td class="px-6 py-4 text-right">
          <button onclick="window.editMatch('${match.match_id}')" class="font-medium text-blue-500 hover:underline mr-3">Editar</button>
          <button onclick="window.deleteMatch('${match.match_id}')" class="font-medium text-red-500 hover:underline">Excluir</button>
        </td>
      `;
      this.tableBody.appendChild(tr);
    });

    this.reattachCheckboxListeners();
  }

  reattachCheckboxListeners() {
    document.querySelectorAll('.row-checkbox').forEach(cb => {
      on(cb, 'change', (e) => this.toggleSelection(e.target.value, e.target.checked));
      if (this.selectedIds.has(cb.value)) cb.checked = true;
    });
  }

  toggleSelection(id, isSelected) {
    if (isSelected) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
    this.updateSelectionUI();
  }

  toggleAllCheckboxes(isChecked) {
    const visibleIds = this.filteredMatches.slice(0, 300).map(m => m.id);
    
    visibleIds.forEach(id => {
      if (isChecked) this.selectedIds.add(id);
      else this.selectedIds.delete(id);
    });
    
    this.renderTable();
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    setHTML(this.selectedCountSpan, `${this.selectedIds.size} selecionados`);
    const hasSelection = this.selectedIds.size > 0;
    this.btnBulkTurn.disabled = !hasSelection;
    this.btnBulkDelete.disabled = !hasSelection;
  }

  async bulkSetTurn() {
    if (!confirm(`Deseja definir o TURNO = 0 para as ${this.selectedIds.size} partidas selecionadas?`)) return;
    
    this.showLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of this.selectedIds) {
      try {
        const matchData = this.allMatches.find(m => m.match_id === id);
        if (matchData) {
          // Atualiza todos os participantes dessa partida
          const { error } = await supabase
            .from('match_participants')
            .update({ turn_eliminated: 0 })
            .eq('match_id', id);
          
          if (error) throw error;
          successCount++;
        }
      } catch (e) {
        console.error("Erro ao atualizar partida:", e);
        errorCount++;
      }
    }

    this.showLoading(false);
    alert(`Atualização concluída: ${successCount} sucesso(s), ${errorCount} erro(s)`);
    await this.loadMatches();
  }

  async bulkDelete() {
    if (!confirm(`ATENÇÃO: Isso excluirá permanentemente ${this.selectedIds.size} partidas. Continuar?`)) return;

    this.showLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of this.selectedIds) {
      try {
        await deleteMatch(id);
        successCount++;
      } catch (e) {
        console.error("Erro ao deletar partida:", e);
        errorCount++;
      }
    }

    this.showLoading(false);
    alert(`Exclusão concluída: ${successCount} sucesso(s), ${errorCount} erro(s)`);
    await this.loadMatches();
  }

  openEditModal(id) {
    const match = this.allMatches.find(m => m.match_id === id);
    if (!match) return;

    setValue(el('edit-id'), id);
    setValue(el('edit-date'), match.date);
    setValue(el('edit-notes'), match.notes || '');

    clear(this.editPlayersList);
    const participants = match.match_participants || [];
    
    participants.forEach((p, index) => {
      const div = document.createElement('div');
      div.className = "flex gap-2 items-center bg-gray-900 p-2 rounded border border-gray-700";
      div.innerHTML = `
        <div class="flex-1">
          <label class="text-xs text-gray-500">Nome</label>
          <input type="text" class="w-full bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm text-white edit-p-name" value="${p.name || ''}">
        </div>
        <div class="flex-1">
          <label class="text-xs text-gray-500">Deck</label>
          <input type="text" class="w-full bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm text-white edit-p-deck" value="${p.deck_name || ''}">
        </div>
        <div class="w-16">
          <label class="text-xs text-gray-500">Turno</label>
          <input type="number" class="w-full bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm text-white edit-p-turn" value="${p.turn_eliminated || 0}">
        </div>
        <div class="w-32">
          <label class="text-xs text-gray-500">Eliminação</label>
          <select class="w-full bg-gray-800 border-gray-600 rounded px-2 py-1 text-sm text-white edit-p-elim">
            <option value="Winner" ${p.is_winner ? 'selected' : ''}>Winner</option>
            <option value="Combat Damage" ${p.elimination_type === 'Combat Damage' ? 'selected' : ''}>Combat</option>
            <option value="Commander Damage" ${p.elimination_type === 'Commander Damage' ? 'selected' : ''}>Commander</option>
            <option value="Non-Combat Damage" ${p.elimination_type === 'Non-Combat Damage' ? 'selected' : ''}>Non-Combat</option>
            <option value="Other" ${p.elimination_type === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
      `;
      this.editPlayersList.appendChild(div);
    });

    show(this.editModal);
  }

  closeEditModal() {
    hide(this.editModal);
  }

  async saveEdit() {
    const id = getValue(el('edit-id'));
    const date = getValue(el('edit-date'));
    const notes = getValue(el('edit-notes'));
    
    const playerDivs = this.editPlayersList.children;
    let hasWinner = false;

    // Valida se tem vencedor
    for (let div of playerDivs) {
      const elimType = div.querySelector('.edit-p-elim').value;
      if (elimType === 'Winner') {
        hasWinner = true;
        break;
      }
    }

    if (!hasWinner) {
      alert("Erro: Alguém precisa ter o tipo de eliminação 'Winner'.");
      return;
    }

    this.showLoading(true);
    try {
      // Atualiza a partida
      await updateMatch(id, { date, notes });

      // Atualiza cada participante
      const match = this.allMatches.find(m => m.match_id === id);
      const participants = match.match_participants || [];

      for (let i = 0; i < playerDivs.length; i++) {
        const div = playerDivs[i];
        const participant = participants[i];
        
        if (participant) {
          const turn = parseInt(div.querySelector('.edit-p-turn').value) || 0;
          const elimType = div.querySelector('.edit-p-elim').value;
          const isWinner = elimType === 'Winner';

          const { error } = await supabase
            .from('match_participants')
            .update({
              turn_eliminated: turn,
              elimination_type: elimType,
              is_winner: isWinner
            })
            .eq('id', participant.id);

          if (error) throw error;
        }
      }

      this.closeEditModal();
      await this.loadMatches();
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      this.showLoading(false);
    }
  }

  async deleteMatchById(id) {
    if (!confirm("Tem certeza que deseja excluir esta partida?")) return;
    this.showLoading(true);
    try {
      await deleteMatch(id);
      await this.loadMatches();
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    } finally {
      this.showLoading(false);
    }
  }

  showLoading(show) {
    if (show) show(this.loadingOverlay);
    else hide(this.loadingOverlay);
  }
}

// Instancia a página quando DOM estiver pronto
let managePage;
document.addEventListener('DOMContentLoaded', () => {
  managePage = new ManagePage();
  managePage.init();
});

// Expõe funções globais para onclick
window.editMatch = (id) => {
  if (managePage) managePage.openEditModal(id);
};

window.closeModal = () => {
  if (managePage) managePage.closeEditModal();
};

window.saveEdit = () => {
  if (managePage) managePage.saveEdit();
};

window.deleteMatch = (id) => {
  if (managePage) managePage.deleteMatchById(id);
};
