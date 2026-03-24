/**
 * app.js — Módulo Principal + Sistema de Modais + DragEngine v2.1
 * KanbanCintia
 *
 * [Ghost Card D&D] setDragImage() com clone rotacionado:
 *   1. Cria clone off-screen com rotate(2.5deg)
 *   2. setDragImage(ghost, offsetX, offsetY)
 *   3. setTimeout 0: remove clone + .dragging no original
 *   → Original: opaco/fantasma (--dnd-ghost-opacity, borda pontilhada)
 *   → Cursor: segue card rotacionado com sombra
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};
  const STORAGE_KEY = 'kanban_data';

  KanbanApp.generateId = function (prefix) {
    return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
  };
  KanbanApp.getData = function () {
    try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : { boards: [], columns: {}, cards: {} }; }
    catch (e) { return { boards: [], columns: {}, cards: {} }; }
  };
  KanbanApp.saveData = function (data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (e) { console.error('[KanbanCintia] Erro ao salvar:', e); }
  };
  KanbanApp.navigate = function (hash) { window.location.hash = hash; };

  KanbanApp.showToast = function (message) {
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container'; container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite'); document.body.appendChild(container);
    }
    var toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(function () { toast.remove(); }, 300); }, 2800);
  };

  /**
   * Calcula cor de texto (preto ou branco) para contraste adequado sobre um fundo colorido.
   * WCAG-compatible. Usado pelas etiquetas (labels) nos cards.
   */
  KanbanApp.getContrastColor = function (hex) {
    if (!hex || hex.length < 7) return '#ffffff';
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.55 ? '#1e293b' : '#ffffff';
  };

  // --- MODAIS CUSTOMIZADOS -----------------------------------------

  KanbanApp.showInputModal = function (options) {
    var overlay = document.getElementById('input-modal-overlay');
    var titleEl = document.getElementById('input-modal-title');
    var labelEl = document.getElementById('input-modal-label');
    var field   = document.getElementById('input-modal-field');
    var confirmBtn = document.getElementById('input-modal-confirm');
    var cancelBtn  = document.getElementById('input-modal-cancel');
    var closeBtn   = document.getElementById('input-modal-close-btn');
    titleEl.textContent = options.title || 'Adicionar';
    labelEl.textContent = options.label || 'Nome';
    field.placeholder   = options.placeholder  || '';
    field.value         = options.defaultValue || '';
    overlay.removeAttribute('hidden'); document.body.style.overflow = 'hidden';
    setTimeout(function () { field.focus(); }, 50);
    function close() { overlay.setAttribute('hidden', ''); document.body.style.overflow = ''; field.value = ''; confirmBtn.onclick = null; cancelBtn.onclick = null; closeBtn.onclick = null; overlay.onclick = null; field.onkeydown = null; }
    function confirm() { var val = field.value.trim(); if (!val) { field.focus(); field.style.borderColor = 'var(--color-danger)'; setTimeout(function () { field.style.borderColor = ''; }, 600); return; } close(); if (options.onConfirm) options.onConfirm(val); }
    confirmBtn.onclick = confirm;
    cancelBtn.onclick  = function () { close(); if (options.onCancel) options.onCancel(); };
    closeBtn.onclick   = function () { close(); if (options.onCancel) options.onCancel(); };
    overlay.onclick    = function (e) { if (e.target === overlay) { close(); if (options.onCancel) options.onCancel(); } };
    field.onkeydown    = function (e) { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') { close(); if (options.onCancel) options.onCancel(); } };
  };

  KanbanApp.showConfirmModal = function (options) {
    var overlay    = document.getElementById('confirm-modal-overlay');
    var titleEl    = document.getElementById('confirm-modal-title');
    var messageEl  = document.getElementById('confirm-modal-message');
    var confirmBtn = document.getElementById('confirm-modal-confirm');
    var cancelBtn  = document.getElementById('confirm-modal-cancel');
    titleEl.textContent    = options.title       || 'Confirmar';
    messageEl.textContent  = options.message     || '';
    confirmBtn.textContent = options.confirmText || 'Excluir';
    confirmBtn.className   = 'btn ' + (options.isDanger === false ? 'btn-primary' : 'btn-danger');
    overlay.removeAttribute('hidden'); document.body.style.overflow = 'hidden';
    setTimeout(function () { confirmBtn.focus(); }, 50);
    function close() { overlay.setAttribute('hidden', ''); document.body.style.overflow = ''; confirmBtn.onclick = null; cancelBtn.onclick = null; overlay.onclick = null; }
    confirmBtn.onclick = function () { close(); if (options.onConfirm) options.onConfirm(); };
    cancelBtn.onclick  = function () { close(); if (options.onCancel) options.onCancel(); };
    overlay.onclick    = function (e) { if (e.target === overlay) { close(); if (options.onCancel) options.onCancel(); } };
  };

  // --- ROTEADOR ----------------------------------------------------

  KanbanApp.renderPage = function () {
    var appEl = document.getElementById('app'), hash = window.location.hash;
    if (hash.startsWith('#board-')) KanbanApp.Board.renderView(hash.replace('#board-', ''), appEl);
    else KanbanApp.Board.renderHome(appEl);
  };

  // --- DRAG ENGINE v2.1 --------------------------------------------
  KanbanApp.DragEngine = {
    _state:   null,
    _ghostId: '_kc-drag-ghost',

    init: function (boardId) {
      var E = KanbanApp.DragEngine;
      E._state = null; E._removeIndicator(); E._removeGhost();
      document.querySelectorAll('.card[draggable="true"]').forEach(function (el) { E._bindCardDrag(el, boardId); });
      document.querySelectorAll('.column[draggable="true"]').forEach(function (el) { E._bindColumnDrag(el, boardId); });
      document.querySelectorAll('.column-cards').forEach(function (area) { E._bindCardDropZone(area, boardId); });
      var ca = document.getElementById('columns-area');
      if (ca) E._bindColumnDropZone(ca, boardId);
    },

    _createGhostCard: function (cardEl) {
      var ghost = cardEl.cloneNode(true);
      ghost.id = this._ghostId;
      ghost.removeAttribute('draggable');
      ghost.style.cssText = [
        'position:fixed', 'top:-9999px', 'left:-9999px',
        'width:' + cardEl.offsetWidth + 'px',
        'transform:rotate(2.5deg) scale(1.02)',
        'opacity:0.92', 'pointer-events:none',
        'border-radius:10px',
        'box-shadow:0 12px 40px rgba(0,0,0,0.22)',
        'background:#fff', 'z-index:9999'
      ].join(';');
      var eb = ghost.querySelector('.card-edit-btn'); if (eb) eb.remove();
      document.body.appendChild(ghost);
      return ghost;
    },

    _removeGhost: function () {
      var g = document.getElementById(this._ghostId); if (g) g.remove();
    },

    _bindCardDrag: function (cardEl, boardId) {
      var E = KanbanApp.DragEngine;
      cardEl.addEventListener('dragstart', function (ev) {
        var col = cardEl.closest('.column-cards');
        E._state = { type: 'card', id: cardEl.dataset.cardId, sourceColId: col ? col.dataset.colId : null, boardId: boardId };
        ev.dataTransfer.setData('text/plain', JSON.stringify(E._state));
        ev.dataTransfer.effectAllowed = 'move';
        var ghost   = E._createGhostCard(cardEl);
        var offsetX = ev.offsetX  || Math.round(cardEl.offsetWidth  / 2);
        var offsetY = ev.offsetY  || Math.round(cardEl.offsetHeight / 3);
        ev.dataTransfer.setDragImage(ghost, offsetX, offsetY);
        setTimeout(function () { cardEl.classList.add('dragging'); E._removeGhost(); }, 0);
      });
      cardEl.addEventListener('dragend', function () {
        cardEl.classList.remove('dragging'); E._removeIndicator(); E._removeGhost(); E._state = null;
      });
    },

    _bindCardDropZone: function (cardsArea, boardId) {
      var E = KanbanApp.DragEngine;
      cardsArea.addEventListener('dragover', function (ev) {
        if (!E._state || E._state.type !== 'card') return;
        ev.preventDefault(); ev.dataTransfer.dropEffect = 'move';
        var ind = E._getOrCreateIndicator('card'), afterEl = E._getDragAfterCard(cardsArea, ev.clientY);
        afterEl === null ? cardsArea.appendChild(ind) : cardsArea.insertBefore(ind, afterEl);
      });
      cardsArea.addEventListener('dragleave', function (ev) { if (!cardsArea.contains(ev.relatedTarget)) E._removeIndicator(); });
      cardsArea.addEventListener('drop', function (ev) {
        ev.preventDefault();
        if (!E._state || E._state.type !== 'card') return;
        var cardId = E._state.id, sourceColId = E._state.sourceColId, targetColId = cardsArea.dataset.colId;
        var afterEl = E._getDragAfterCard(cardsArea, ev.clientY);
        E._removeIndicator();
        E._moveCard(cardId, sourceColId, targetColId, afterEl ? afterEl.dataset.cardId : null, boardId);
      });
    },

    _getDragAfterCard: function (container, mouseY) {
      var draggingId = this._state ? this._state.id : null;
      var cards = Array.prototype.slice.call(container.querySelectorAll('.card:not(.dragging):not(.drop-indicator)'));
      var closest = null, closestOffset = -Infinity;
      cards.forEach(function (card) {
        if (card.dataset.cardId === draggingId) return;
        var rect = card.getBoundingClientRect(), offset = mouseY - (rect.top + rect.height / 2);
        if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = card; }
      });
      return closest;
    },

    _moveCard: function (cardId, sourceColId, targetColId, afterCardId, boardId) {
      var data = KanbanApp.getData(), sc = data.columns[sourceColId], tc = data.columns[targetColId];
      if (!sc || !tc) return;
      sc.cards = sc.cards.filter(function (id) { return id !== cardId; });
      if (afterCardId) { var idx = tc.cards.indexOf(afterCardId); idx === -1 ? tc.cards.push(cardId) : tc.cards.splice(idx, 0, cardId); }
      else tc.cards.push(cardId);
      KanbanApp.saveData(data);
      var cardEl = document.querySelector('.card[data-card-id="' + cardId + '"]');
      var targetArea = document.getElementById('col-cards-' + targetColId);
      if (cardEl && targetArea) {
        if (afterCardId) { var afterEl = targetArea.querySelector('.card[data-card-id="' + afterCardId + '"]'); afterEl ? targetArea.insertBefore(cardEl, afterEl) : targetArea.appendChild(cardEl); }
        else targetArea.appendChild(cardEl);
        KanbanApp.DragEngine._updateColumnBadge(sourceColId);
        KanbanApp.DragEngine._updateColumnBadge(targetColId);
      } else KanbanApp.renderPage();
    },

    _bindColumnDrag: function (colEl, boardId) {
      var E = KanbanApp.DragEngine;
      colEl.addEventListener('dragstart', function (ev) {
        if (ev.target.closest('.card') || ev.target.closest('.column-title-input')) { ev.preventDefault(); return; }
        E._state = { type: 'column', id: colEl.dataset.colId, boardId: boardId };
        ev.dataTransfer.setData('text/plain', JSON.stringify(E._state)); ev.dataTransfer.effectAllowed = 'move';
        setTimeout(function () { colEl.classList.add('dragging-col'); }, 0);
      });
      colEl.addEventListener('dragend', function () { colEl.classList.remove('dragging-col'); E._removeIndicator(); E._state = null; });
    },

    _bindColumnDropZone: function (columnsArea, boardId) {
      var E = KanbanApp.DragEngine;
      columnsArea.addEventListener('dragover', function (ev) {
        if (!E._state || E._state.type !== 'column') return;
        ev.preventDefault(); ev.dataTransfer.dropEffect = 'move';
        var ind = E._getOrCreateIndicator('column'), afterEl = E._getDragAfterColumn(columnsArea, ev.clientX);
        var addBtn = document.getElementById('btn-add-column');
        afterEl === null ? columnsArea.insertBefore(ind, addBtn || null) : columnsArea.insertBefore(ind, afterEl);
      });
      columnsArea.addEventListener('dragleave', function (ev) { if (!columnsArea.contains(ev.relatedTarget)) E._removeIndicator(); });
      columnsArea.addEventListener('drop', function (ev) {
        ev.preventDefault();
        if (!E._state || E._state.type !== 'column') return;
        var colId = E._state.id, afterEl = E._getDragAfterColumn(columnsArea, ev.clientX);
        E._removeIndicator(); E._moveColumn(colId, afterEl ? afterEl.dataset.colId : null, boardId);
      });
    },

    _getDragAfterColumn: function (container, mouseX) {
      var draggingId = this._state ? this._state.id : null;
      var cols = Array.prototype.slice.call(container.querySelectorAll('.column:not(.dragging-col):not(.drop-indicator-col)'));
      var closest = null, closestOffset = -Infinity;
      cols.forEach(function (col) {
        if (col.dataset.colId === draggingId) return;
        var rect = col.getBoundingClientRect(), offset = mouseX - (rect.left + rect.width / 2);
        if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = col; }
      });
      return closest;
    },

    _moveColumn: function (colId, afterColId, boardId) {
      var data = KanbanApp.getData(), board = data.boards.find(function (b) { return b.id === boardId; });
      if (!board) return;
      board.columns = board.columns.filter(function (id) { return id !== colId; });
      if (afterColId) { var idx = board.columns.indexOf(afterColId); idx === -1 ? board.columns.push(colId) : board.columns.splice(idx, 0, colId); }
      else board.columns.push(colId);
      KanbanApp.saveData(data);
      var ca = document.getElementById('columns-area'), colEl = ca ? ca.querySelector('.column[data-col-id="' + colId + '"]') : null;
      if (colEl && ca) {
        var addBtn = document.getElementById('btn-add-column');
        if (afterColId) { var afterEl = ca.querySelector('.column[data-col-id="' + afterColId + '"]'); afterEl ? ca.insertBefore(colEl, afterEl) : ca.insertBefore(colEl, addBtn || null); }
        else ca.insertBefore(colEl, addBtn || null);
      } else KanbanApp.renderPage();
    },

    _getOrCreateIndicator: function (type) {
      var ind = document.querySelector('.drop-indicator, .drop-indicator-col');
      var cls = type === 'column' ? 'drop-indicator-col' : 'drop-indicator';
      if (!ind || !ind.classList.contains(cls)) { if (ind) ind.remove(); ind = document.createElement('div'); ind.className = cls; ind.setAttribute('aria-hidden', 'true'); }
      return ind;
    },
    _removeIndicator: function () { var i = document.querySelector('.drop-indicator, .drop-indicator-col'); if (i) i.remove(); },
    _updateColumnBadge: function (colId) {
      var area = document.getElementById('col-cards-' + colId); if (!area) return;
      var col = area.closest('.column'), badge = col ? col.querySelector('.column-count-badge') : null;
      if (badge) badge.textContent = area.querySelectorAll('.card').length;
    }
  };

  // --- INICIALIZAÇÃO -----------------------------------------------
  function init() {
    KanbanApp.Card._initModalEvents();
    var homeBtn = document.getElementById('btn-home');
    if (homeBtn) homeBtn.addEventListener('click', function () { KanbanApp.navigate('#'); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!document.getElementById('modal-overlay').hasAttribute('hidden')) KanbanApp.Card.closeModal();
      if (!document.getElementById('input-modal-overlay').hasAttribute('hidden')) document.getElementById('input-modal-cancel').click();
      if (!document.getElementById('confirm-modal-overlay').hasAttribute('hidden')) document.getElementById('confirm-modal-cancel').click();
    });
    KanbanApp.renderPage();
    window.addEventListener('hashchange', function () { KanbanApp.renderPage(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
