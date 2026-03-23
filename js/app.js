/**
 * app.js — Módulo Principal e Motor de Drag & Drop
 * Responsabilidade:
 *   1. Inicialização do sistema (DOMContentLoaded, hashchange)
 *   2. Utilitários globais (generateId, getData, saveData, navigate, showToast)
 *   3. Roteador (renderPage): Home vs Board View
 *   4. Motor de Drag & Drop (DragEngine) para cards e colunas
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};
  const STORAGE_KEY = 'kanban_data';

  KanbanApp.generateId = function (prefix) {
    prefix = prefix || 'id';
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
  };

  KanbanApp.getData = function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { boards: [], columns: {}, cards: {} };
    } catch (e) { return { boards: [], columns: {}, cards: {} }; }
  };

  KanbanApp.saveData = function (data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.error('[KanbanApp] Erro ao salvar:', e); }
  };

  KanbanApp.navigate = function (hash) { window.location.hash = hash; };

  KanbanApp.showToast = function (message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 2800);
  };

  KanbanApp.renderPage = function () {
    const appEl = document.getElementById('app');
    const hash = window.location.hash;
    if (hash.startsWith('#board-')) {
      KanbanApp.Board.renderView(hash.replace('#board-', ''), appEl);
    } else {
      KanbanApp.Board.renderHome(appEl);
    }
  };

  // ============================================================
  // MOTOR DE DRAG & DROP
  // ============================================================
  /**
   * DragEngine: gerencia arrastar/soltar de cards e colunas.
   *
   * Algoritmo de Drop Indicator para CARDS (eixo vertical):
   *  - Itera os cards do container, calcula o midY de cada um.
   *  - Se mouseY < midY do card, insere o indicador ANTES dele.
   *  - Caso contrário, o card vai para o final.
   *
   * Algoritmo para COLUNAS (eixo horizontal):
   *  - Itera as colunas, calcula o midX de cada uma.
   *  - Se mouseX < midX da coluna, insere o indicador ANTES dela.
   */
  KanbanApp.DragEngine = {
    _state: null,

    init(boardId) {
      const engine = KanbanApp.DragEngine;
      engine._state = null;
      engine._removeIndicator();
      document.querySelectorAll('.card[draggable="true"]').forEach(el => engine._bindCardDrag(el, boardId));
      document.querySelectorAll('.column[draggable="true"]').forEach(el => engine._bindColumnDrag(el, boardId));
      document.querySelectorAll('.column-cards').forEach(area => engine._bindCardDropZone(area, boardId));
      const columnsArea = document.getElementById('columns-area');
      if (columnsArea) engine._bindColumnDropZone(columnsArea, boardId);
    },

    _bindCardDrag(cardEl, boardId) {
      const engine = KanbanApp.DragEngine;
      cardEl.addEventListener('dragstart', function (e) {
        const colContainer = cardEl.closest('.column-cards');
        engine._state = { type: 'card', id: cardEl.dataset.cardId, sourceColId: colContainer ? colContainer.dataset.colId : null, boardId };
        e.dataTransfer.setData('text/plain', JSON.stringify(engine._state));
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => cardEl.classList.add('dragging'), 0);
      });
      cardEl.addEventListener('dragend', function () {
        cardEl.classList.remove('dragging');
        engine._removeIndicator();
        engine._state = null;
      });
    },

    /**
     * Vincula drop zone numa área de cards.
     * Usa getBoundingClientRect() + clientY para calcular a posição de inserção.
     */
    _bindCardDropZone(cardsArea, boardId) {
      const engine = KanbanApp.DragEngine;
      cardsArea.addEventListener('dragover', function (e) {
        if (!engine._state || engine._state.type !== 'card') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const indicator = engine._getOrCreateIndicator('card');
        const afterEl = engine._getDragAfterCard(cardsArea, e.clientY);
        afterEl === null ? cardsArea.appendChild(indicator) : cardsArea.insertBefore(indicator, afterEl);
      });
      cardsArea.addEventListener('dragleave', function (e) {
        if (!cardsArea.contains(e.relatedTarget)) engine._removeIndicator();
      });
      cardsArea.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!engine._state || engine._state.type !== 'card') return;
        const { id: cardId, sourceColId } = engine._state;
        const targetColId = cardsArea.dataset.colId;
        const afterEl = engine._getDragAfterCard(cardsArea, e.clientY);
        engine._removeIndicator();
        engine._moveCard(cardId, sourceColId, targetColId, afterEl ? afterEl.dataset.cardId : null, boardId);
      });
    },

    /**
     * Retorna o card antes do qual o indicador deve ser inserido.
     * Compara mouseY com o midY de cada card não arrastado.
     */
    _getDragAfterCard(container, mouseY) {
      const draggingId = this._state ? this._state.id : null;
      const cards = [...container.querySelectorAll('.card:not(.dragging):not(.drop-indicator)')];
      let closest = null, closestOffset = -Infinity;
      cards.forEach(card => {
        if (card.dataset.cardId === draggingId) return;
        const rect = card.getBoundingClientRect();
        const offset = mouseY - (rect.top + rect.height / 2);
        if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = card; }
      });
      return closest;
    },

    /**
     * Move o card no modelo de dados e atualiza o DOM parcialmente.
     * Evita re-render completo da página.
     */
    _moveCard(cardId, sourceColId, targetColId, afterCardId, boardId) {
      const data = KanbanApp.getData();
      const sourceCol = data.columns[sourceColId];
      const targetCol = data.columns[targetColId];
      if (!sourceCol || !targetCol) return;
      sourceCol.cards = sourceCol.cards.filter(id => id !== cardId);
      if (afterCardId) {
        const idx = targetCol.cards.indexOf(afterCardId);
        idx === -1 ? targetCol.cards.push(cardId) : targetCol.cards.splice(idx, 0, cardId);
      } else {
        targetCol.cards.push(cardId);
      }
      KanbanApp.saveData(data);
      const cardEl = document.querySelector('.card[data-card-id="' + cardId + '"]');
      const targetArea = document.getElementById('col-cards-' + targetColId);
      if (cardEl && targetArea) {
        if (afterCardId) {
          const afterEl = targetArea.querySelector('.card[data-card-id="' + afterCardId + '"]');
          afterEl ? targetArea.insertBefore(cardEl, afterEl) : targetArea.appendChild(cardEl);
        } else {
          targetArea.appendChild(cardEl);
        }
        KanbanApp.DragEngine._updateColumnBadge(sourceColId);
        KanbanApp.DragEngine._updateColumnBadge(targetColId);
      } else {
        KanbanApp.renderPage();
      }
    },

    _bindColumnDrag(colEl, boardId) {
      const engine = KanbanApp.DragEngine;
      colEl.addEventListener('dragstart', function (e) {
        if (e.target.closest('.card') || e.target.closest('.column-title-input')) { e.preventDefault(); return; }
        engine._state = { type: 'column', id: colEl.dataset.colId, boardId };
        e.dataTransfer.setData('text/plain', JSON.stringify(engine._state));
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => colEl.classList.add('dragging-col'), 0);
      });
      colEl.addEventListener('dragend', function () {
        colEl.classList.remove('dragging-col');
        engine._removeIndicator();
        engine._state = null;
      });
    },

    /**
     * Vincula drop zone na área de colunas para reordenação horizontal.
     * Usa getBoundingClientRect() + clientX para calcular a posição.
     */
    _bindColumnDropZone(columnsArea, boardId) {
      const engine = KanbanApp.DragEngine;
      columnsArea.addEventListener('dragover', function (e) {
        if (!engine._state || engine._state.type !== 'column') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const indicator = engine._getOrCreateIndicator('column');
        const afterEl = engine._getDragAfterColumn(columnsArea, e.clientX);
        const addBtn = document.getElementById('btn-add-column');
        afterEl === null ? columnsArea.insertBefore(indicator, addBtn || null) : columnsArea.insertBefore(indicator, afterEl);
      });
      columnsArea.addEventListener('dragleave', function (e) {
        if (!columnsArea.contains(e.relatedTarget)) engine._removeIndicator();
      });
      columnsArea.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!engine._state || engine._state.type !== 'column') return;
        const { id: colId } = engine._state;
        const afterEl = engine._getDragAfterColumn(columnsArea, e.clientX);
        engine._removeIndicator();
        engine._moveColumn(colId, afterEl ? afterEl.dataset.colId : null, boardId);
      });
    },

    /**
     * Retorna a coluna antes da qual o indicador deve ser inserido.
     * Compara mouseX com o midX de cada coluna visível.
     */
    _getDragAfterColumn(container, mouseX) {
      const draggingId = this._state ? this._state.id : null;
      const columns = [...container.querySelectorAll('.column:not(.dragging-col):not(.drop-indicator-col)')];
      let closest = null, closestOffset = -Infinity;
      columns.forEach(col => {
        if (col.dataset.colId === draggingId) return;
        const rect = col.getBoundingClientRect();
        const offset = mouseX - (rect.left + rect.width / 2);
        if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = col; }
      });
      return closest;
    },

    /**
     * Move uma coluna no modelo de dados e atualiza o DOM parcialmente.
     */
    _moveColumn(colId, afterColId, boardId) {
      const data = KanbanApp.getData();
      const board = data.boards.find(b => b.id === boardId);
      if (!board) return;
      board.columns = board.columns.filter(id => id !== colId);
      if (afterColId) {
        const idx = board.columns.indexOf(afterColId);
        idx === -1 ? board.columns.push(colId) : board.columns.splice(idx, 0, colId);
      } else {
        board.columns.push(colId);
      }
      KanbanApp.saveData(data);
      const columnsArea = document.getElementById('columns-area');
      const colEl = columnsArea ? columnsArea.querySelector('.column[data-col-id="' + colId + '"]') : null;
      if (colEl && columnsArea) {
        const addBtn = document.getElementById('btn-add-column');
        if (afterColId) {
          const afterEl = columnsArea.querySelector('.column[data-col-id="' + afterColId + '"]');
          afterEl ? columnsArea.insertBefore(colEl, afterEl) : columnsArea.insertBefore(colEl, addBtn || null);
        } else {
          columnsArea.insertBefore(colEl, addBtn || null);
        }
      } else {
        KanbanApp.renderPage();
      }
    },

    _getOrCreateIndicator(type) {
      let indicator = document.querySelector('.drop-indicator, .drop-indicator-col');
      const expectedClass = type === 'column' ? 'drop-indicator-col' : 'drop-indicator';
      if (!indicator || !indicator.classList.contains(expectedClass)) {
        if (indicator) indicator.remove();
        indicator = document.createElement('div');
        indicator.className = expectedClass;
        indicator.setAttribute('aria-hidden', 'true');
      }
      return indicator;
    },

    _removeIndicator() {
      const indicator = document.querySelector('.drop-indicator, .drop-indicator-col');
      if (indicator) indicator.remove();
    },

    _updateColumnBadge(colId) {
      const cardsArea = document.getElementById('col-cards-' + colId);
      if (!cardsArea) return;
      const badge = cardsArea.closest('.column')?.querySelector('.column-count-badge');
      if (badge) badge.textContent = cardsArea.querySelectorAll('.card').length;
    }
  };

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
  function init() {
    KanbanApp.Card._initModalEvents();
    const homeBtn = document.getElementById('btn-home');
    if (homeBtn) homeBtn.addEventListener('click', () => KanbanApp.navigate('#'));
    KanbanApp.renderPage();
    window.addEventListener('hashchange', () => KanbanApp.renderPage());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
