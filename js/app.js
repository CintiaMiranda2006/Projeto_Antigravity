/**
 * app.js — Módulo Principal + Sistema de Modais + DragEngine
 * KanbanCintia v2.0
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};
  const STORAGE_KEY = 'kanban_data';

  KanbanApp.generateId = function (prefix) {
    return (prefix||'id') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2,4);
  };
  KanbanApp.getData = function () {
    try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {boards:[],columns:{},cards:{}}; }
    catch(e) { return {boards:[],columns:{},cards:{}}; }
  };
  KanbanApp.saveData = function (data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) { console.error('[KanbanCintia] Erro ao salvar:', e); }
  };
  KanbanApp.navigate = function (hash) { window.location.hash = hash; };

  KanbanApp.showToast = function (message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div'); container.id='toast-container'; container.className='toast-container';
      container.setAttribute('aria-live','polite'); document.body.appendChild(container);
    }
    const toast = document.createElement('div'); toast.className='toast'; toast.textContent=message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(()=>toast.remove(),300); }, 2800);
  };

  /**
   * Calcula a cor de texto (claro ou escuro) com base na luminosidade do fundo.
   * Garante contraste acessível WCAG para etiquetas coloridas.
   */
  KanbanApp.getContrastColor = function (hex) {
    if (!hex || hex.length < 7) return '#ffffff';
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? '#1e293b' : '#ffffff';
  };

  // ============================================================
  // SISTEMA DE MODAIS CUSTOMIZADOS
  // Substitui window.prompt e window.confirm
  // ============================================================

  /**
   * Modal de entrada de texto (substitui window.prompt).
   * Usado em: Novo Quadro, Renomear, Nova Coluna, Novo Card.
   */
  KanbanApp.showInputModal = function (options) {
    const overlay    = document.getElementById('input-modal-overlay');
    const titleEl    = document.getElementById('input-modal-title');
    const labelEl    = document.getElementById('input-modal-label');
    const field      = document.getElementById('input-modal-field');
    const confirmBtn = document.getElementById('input-modal-confirm');
    const cancelBtn  = document.getElementById('input-modal-cancel');
    const closeBtn   = document.getElementById('input-modal-close-btn');

    titleEl.textContent  = options.title        || 'Adicionar';
    labelEl.textContent  = options.label         || 'Nome';
    field.placeholder    = options.placeholder   || '';
    field.value          = options.defaultValue  || '';

    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => field.focus(), 50);

    function close() {
      overlay.setAttribute('hidden',''); document.body.style.overflow='';
      field.value='';
      confirmBtn.onclick=null; cancelBtn.onclick=null; closeBtn.onclick=null;
      overlay.onclick=null; field.onkeydown=null;
    }
    function confirm() {
      const val = field.value.trim();
      if (!val) { field.focus(); return; }
      close(); if (options.onConfirm) options.onConfirm(val);
    }
    confirmBtn.onclick = confirm;
    cancelBtn.onclick  = () => { close(); if (options.onCancel) options.onCancel(); };
    closeBtn.onclick   = () => { close(); if (options.onCancel) options.onCancel(); };
    overlay.onclick    = (e) => { if (e.target===overlay) { close(); if (options.onCancel) options.onCancel(); } };
    field.onkeydown    = (e) => { if (e.key==='Enter') confirm(); if (e.key==='Escape') { close(); if (options.onCancel) options.onCancel(); } };
  };

  /**
   * Modal de confirmação (substitui window.confirm).
   * Usado em: Excluir Quadro, Excluir Coluna, Excluir Card.
   */
  KanbanApp.showConfirmModal = function (options) {
    const overlay    = document.getElementById('confirm-modal-overlay');
    const titleEl    = document.getElementById('confirm-modal-title');
    const messageEl  = document.getElementById('confirm-modal-message');
    const confirmBtn = document.getElementById('confirm-modal-confirm');
    const cancelBtn  = document.getElementById('confirm-modal-cancel');

    titleEl.textContent   = options.title       || 'Confirmar';
    messageEl.textContent = options.message     || '';
    confirmBtn.textContent = options.confirmText || 'Excluir';
    confirmBtn.className  = 'btn ' + (options.isDanger===false ? 'btn-primary' : 'btn-danger');

    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => confirmBtn.focus(), 50);

    function close() { overlay.setAttribute('hidden',''); document.body.style.overflow=''; confirmBtn.onclick=null; cancelBtn.onclick=null; overlay.onclick=null; }
    confirmBtn.onclick = () => { close(); if (options.onConfirm) options.onConfirm(); };
    cancelBtn.onclick  = () => { close(); if (options.onCancel)  options.onCancel(); };
    overlay.onclick    = (e) => { if (e.target===overlay) { close(); if (options.onCancel) options.onCancel(); } };
  };

  // ============================================================
  // ROTEADOR
  // ============================================================
  KanbanApp.renderPage = function () {
    const appEl = document.getElementById('app');
    const hash  = window.location.hash;
    if (hash.startsWith('#board-')) KanbanApp.Board.renderView(hash.replace('#board-',''), appEl);
    else KanbanApp.Board.renderHome(appEl);
  };

  // ============================================================
  // MOTOR DE DRAG & DROP
  // Algoritmo Cards: compara mouseY com midY de cada card.
  // Algoritmo Colunas: compara mouseX com midX de cada coluna.
  // ============================================================
  KanbanApp.DragEngine = {
    _state: null,
    init(boardId) {
      const e = KanbanApp.DragEngine;
      e._state=null; e._removeIndicator();
      document.querySelectorAll('.card[draggable="true"]').forEach(el => e._bindCardDrag(el,boardId));
      document.querySelectorAll('.column[draggable="true"]').forEach(el => e._bindColumnDrag(el,boardId));
      document.querySelectorAll('.column-cards').forEach(area => e._bindCardDropZone(area,boardId));
      const ca = document.getElementById('columns-area');
      if (ca) e._bindColumnDropZone(ca,boardId);
    },
    _bindCardDrag(cardEl, boardId) {
      const e = KanbanApp.DragEngine;
      cardEl.addEventListener('dragstart', function(ev) {
        const col = cardEl.closest('.column-cards');
        e._state = {type:'card', id:cardEl.dataset.cardId, sourceColId:col?col.dataset.colId:null, boardId};
        ev.dataTransfer.setData('text/plain', JSON.stringify(e._state)); ev.dataTransfer.effectAllowed='move';
        setTimeout(()=>cardEl.classList.add('dragging'),0);
      });
      cardEl.addEventListener('dragend', function() { cardEl.classList.remove('dragging'); e._removeIndicator(); e._state=null; });
    },
    _bindCardDropZone(cardsArea, boardId) {
      const e = KanbanApp.DragEngine;
      cardsArea.addEventListener('dragover', function(ev) {
        if (!e._state||e._state.type!=='card') return;
        ev.preventDefault(); ev.dataTransfer.dropEffect='move';
        const ind = e._getOrCreateIndicator('card');
        const after = e._getDragAfterCard(cardsArea, ev.clientY);
        after===null ? cardsArea.appendChild(ind) : cardsArea.insertBefore(ind,after);
      });
      cardsArea.addEventListener('dragleave', function(ev) { if (!cardsArea.contains(ev.relatedTarget)) e._removeIndicator(); });
      cardsArea.addEventListener('drop', function(ev) {
        ev.preventDefault();
        if (!e._state||e._state.type!=='card') return;
        const {id:cardId, sourceColId} = e._state;
        const targetColId = cardsArea.dataset.colId;
        const after = e._getDragAfterCard(cardsArea, ev.clientY);
        e._removeIndicator();
        e._moveCard(cardId, sourceColId, targetColId, after?after.dataset.cardId:null, boardId);
      });
    },
    _getDragAfterCard(container, mouseY) {
      const draggingId = this._state?this._state.id:null;
      const cards = [...container.querySelectorAll('.card:not(.dragging):not(.drop-indicator)')];
      let closest=null, closestOffset=-Infinity;
      cards.forEach(card => {
        if (card.dataset.cardId===draggingId) return;
        const rect=card.getBoundingClientRect(), offset=mouseY-(rect.top+rect.height/2);
        if (offset<0&&offset>closestOffset) { closestOffset=offset; closest=card; }
      });
      return closest;
    },
    _moveCard(cardId, sourceColId, targetColId, afterCardId, boardId) {
      const data=KanbanApp.getData(), sc=data.columns[sourceColId], tc=data.columns[targetColId];
      if (!sc||!tc) return;
      sc.cards=sc.cards.filter(id=>id!==cardId);
      if (afterCardId) { const idx=tc.cards.indexOf(afterCardId); idx===-1?tc.cards.push(cardId):tc.cards.splice(idx,0,cardId); }
      else tc.cards.push(cardId);
      KanbanApp.saveData(data);
      const cardEl=document.querySelector('.card[data-card-id="'+cardId+'"]');
      const targetArea=document.getElementById('col-cards-'+targetColId);
      if (cardEl&&targetArea) {
        if (afterCardId) { const afterEl=targetArea.querySelector('.card[data-card-id="'+afterCardId+'"]'); afterEl?targetArea.insertBefore(cardEl,afterEl):targetArea.appendChild(cardEl); }
        else targetArea.appendChild(cardEl);
        KanbanApp.DragEngine._updateColumnBadge(sourceColId);
        KanbanApp.DragEngine._updateColumnBadge(targetColId);
      } else KanbanApp.renderPage();
    },
    _bindColumnDrag(colEl, boardId) {
      const e = KanbanApp.DragEngine;
      colEl.addEventListener('dragstart', function(ev) {
        if (ev.target.closest('.card')||ev.target.closest('.column-title-input')) { ev.preventDefault(); return; }
        e._state = {type:'column', id:colEl.dataset.colId, boardId};
        ev.dataTransfer.setData('text/plain', JSON.stringify(e._state)); ev.dataTransfer.effectAllowed='move';
        setTimeout(()=>colEl.classList.add('dragging-col'),0);
      });
      colEl.addEventListener('dragend', function() { colEl.classList.remove('dragging-col'); e._removeIndicator(); e._state=null; });
    },
    _bindColumnDropZone(columnsArea, boardId) {
      const e = KanbanApp.DragEngine;
      columnsArea.addEventListener('dragover', function(ev) {
        if (!e._state||e._state.type!=='column') return;
        ev.preventDefault(); ev.dataTransfer.dropEffect='move';
        const ind = e._getOrCreateIndicator('column');
        const after = e._getDragAfterColumn(columnsArea, ev.clientX);
        const addBtn = document.getElementById('btn-add-column');
        after===null ? columnsArea.insertBefore(ind,addBtn||null) : columnsArea.insertBefore(ind,after);
      });
      columnsArea.addEventListener('dragleave', function(ev) { if (!columnsArea.contains(ev.relatedTarget)) e._removeIndicator(); });
      columnsArea.addEventListener('drop', function(ev) {
        ev.preventDefault();
        if (!e._state||e._state.type!=='column') return;
        const {id:colId} = e._state;
        const after = e._getDragAfterColumn(columnsArea, ev.clientX);
        e._removeIndicator();
        e._moveColumn(colId, after?after.dataset.colId:null, boardId);
      });
    },
    _getDragAfterColumn(container, mouseX) {
      const draggingId = this._state?this._state.id:null;
      const cols = [...container.querySelectorAll('.column:not(.dragging-col):not(.drop-indicator-col)')];
      let closest=null, closestOffset=-Infinity;
      cols.forEach(col => {
        if (col.dataset.colId===draggingId) return;
        const rect=col.getBoundingClientRect(), offset=mouseX-(rect.left+rect.width/2);
        if (offset<0&&offset>closestOffset) { closestOffset=offset; closest=col; }
      });
      return closest;
    },
    _moveColumn(colId, afterColId, boardId) {
      const data=KanbanApp.getData(), board=data.boards.find(b=>b.id===boardId);
      if (!board) return;
      board.columns=board.columns.filter(id=>id!==colId);
      if (afterColId) { const idx=board.columns.indexOf(afterColId); idx===-1?board.columns.push(colId):board.columns.splice(idx,0,colId); }
      else board.columns.push(colId);
      KanbanApp.saveData(data);
      const ca=document.getElementById('columns-area');
      const colEl=ca?ca.querySelector('.column[data-col-id="'+colId+'"]'):null;
      if (colEl&&ca) {
        const addBtn=document.getElementById('btn-add-column');
        if (afterColId) { const afterEl=ca.querySelector('.column[data-col-id="'+afterColId+'"]'); afterEl?ca.insertBefore(colEl,afterEl):ca.insertBefore(colEl,addBtn||null); }
        else ca.insertBefore(colEl,addBtn||null);
      } else KanbanApp.renderPage();
    },
    _getOrCreateIndicator(type) {
      let ind = document.querySelector('.drop-indicator, .drop-indicator-col');
      const cls = type==='column'?'drop-indicator-col':'drop-indicator';
      if (!ind||!ind.classList.contains(cls)) { if(ind)ind.remove(); ind=document.createElement('div'); ind.className=cls; ind.setAttribute('aria-hidden','true'); }
      return ind;
    },
    _removeIndicator() { const i=document.querySelector('.drop-indicator, .drop-indicator-col'); if(i)i.remove(); },
    _updateColumnBadge(colId) {
      const area=document.getElementById('col-cards-'+colId); if(!area) return;
      const badge=area.closest('.column')?.querySelector('.column-count-badge');
      if(badge) badge.textContent=area.querySelectorAll('.card').length;
    }
  };

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
  function init() {
    KanbanApp.Card._initModalEvents();
    const homeBtn = document.getElementById('btn-home');
    if (homeBtn) homeBtn.addEventListener('click', () => KanbanApp.navigate('#'));
    // Escape global fecha qualquer modal aberto
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      if (!document.getElementById('modal-overlay').hasAttribute('hidden'))        KanbanApp.Card.closeModal();
      if (!document.getElementById('input-modal-overlay').hasAttribute('hidden'))  document.getElementById('input-modal-cancel').click();
      if (!document.getElementById('confirm-modal-overlay').hasAttribute('hidden')) document.getElementById('confirm-modal-cancel').click();
    });
    KanbanApp.renderPage();
    window.addEventListener('hashchange', () => KanbanApp.renderPage());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
