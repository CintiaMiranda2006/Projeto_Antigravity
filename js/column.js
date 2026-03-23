/**
 * column.js — Módulo de Colunas
 * Responsabilidade: CRUD de colunas e renderização de cada coluna e seus cards.
 * Expõe: window.KanbanApp.Column
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};

  const Column = {
    create(boardId, name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      const data = KanbanApp.getData();
      const board = data.boards.find(b => b.id === boardId);
      if (!board) return;
      const newCol = { id: KanbanApp.generateId('c'), name: trimmed, cards: [] };
      data.columns[newCol.id] = newCol;
      board.columns.push(newCol.id);
      KanbanApp.saveData(data);
      KanbanApp.renderPage();
    },
    rename(colId, newName) {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const data = KanbanApp.getData();
      const col = data.columns[colId];
      if (!col) return;
      col.name = trimmed;
      KanbanApp.saveData(data);
      const input = document.querySelector('.column-title-input[data-col-id="' + colId + '"]');
      if (input) input.value = trimmed;
    },
    delete(boardId, colId) {
      const data = KanbanApp.getData();
      const board = data.boards.find(b => b.id === boardId);
      const col = data.columns[colId];
      if (!board || !col) return;
      col.cards.forEach(cardId => delete data.cards[cardId]);
      delete data.columns[colId];
      board.columns = board.columns.filter(id => id !== colId);
      KanbanApp.saveData(data);
      KanbanApp.renderPage();
    },
    render(colId, boardId) {
      const data = KanbanApp.getData();
      const col = data.columns[colId];
      if (!col) return null;
      const colEl = document.createElement('div');
      colEl.className = 'column';
      colEl.dataset.colId = colId;
      colEl.dataset.boardId = boardId;
      colEl.setAttribute('draggable', 'true');
      const cardCount = col.cards.length;
      colEl.innerHTML =
        '<div class="column-header">' +
          '<input type="text" class="column-title-input" data-col-id="' + colId + '" value="' + KanbanApp.Board._escapeHtml(col.name) + '" maxlength="80" title="Clique para renomear" />' +
          '<span class="column-count-badge">' + cardCount + '</span>' +
          '<div class="column-actions"><button class="btn-icon btn-delete-col" data-col-id="' + colId + '" data-board-id="' + boardId + '" title="Excluir coluna"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M6 4V2.5h3V4M4.5 4v8a1 1 0 001 1h4a1 1 0 001-1V4H4.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
        '</div>' +
        '<div class="column-cards" id="col-cards-' + colId + '" data-col-id="' + colId + '" role="list"></div>' +
        '<div class="column-footer"><button class="btn-add-card" data-col-id="' + colId + '"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Adicionar Card</button></div>';
      const cardsContainer = colEl.querySelector('#col-cards-' + colId);
      col.cards.forEach(cardId => {
        const cardEl = KanbanApp.Card.render(cardId);
        if (cardEl) cardsContainer.appendChild(cardEl);
      });
      Column._bindColumnEvents(colEl, colId, boardId);
      return colEl;
    },
    _bindColumnEvents(colEl, colId, boardId) {
      const titleInput = colEl.querySelector('.column-title-input');
      if (titleInput) {
        titleInput.addEventListener('blur', () => Column.rename(colId, titleInput.value));
        titleInput.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); titleInput.blur(); }
          if (e.key === 'Escape') { const data = KanbanApp.getData(); const col = data.columns[colId]; if (col) titleInput.value = col.name; titleInput.blur(); }
        });
        titleInput.addEventListener('mousedown', e => e.stopPropagation());
      }
      const deleteBtn = colEl.querySelector('.btn-delete-col');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', e => {
          e.stopPropagation();
          const data = KanbanApp.getData();
          const col = data.columns[colId];
          const count = col ? col.cards.length : 0;
          const msg = count > 0 ? 'Excluir a coluna "' + (col ? col.name : '') + '"?\n\n' + count + ' card(s) será(o) removido(s).' : 'Excluir a coluna "' + (col ? col.name : '') + '"?';
          if (window.confirm(msg)) { Column.delete(boardId, colId); KanbanApp.showToast('Coluna excluída.'); }
        });
      }
      const addCardBtn = colEl.querySelector('.btn-add-card');
      if (addCardBtn) {
        addCardBtn.addEventListener('click', () => {
          const title = window.prompt('Título do novo card:');
          if (title && title.trim()) { KanbanApp.Card.create(colId, title.trim()); KanbanApp.showToast('Card "' + title.trim() + '" criado!'); }
        });
      }
    }
  };
  window.KanbanApp.Column = Column;
})();
