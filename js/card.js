/**
 * card.js — Módulo de Cards (Tarefas)
 * Responsabilidade: CRUD de cards, renderização e gerenciamento do modal de edição.
 * Expõe: window.KanbanApp.Card
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};

  const CARD_COLORS = [
    { hex: '#ffffff', name: 'Branco' }, { hex: '#6366f1', name: 'Índigo' },
    { hex: '#8b5cf6', name: 'Violeta' }, { hex: '#ec4899', name: 'Rosa' },
    { hex: '#ef4444', name: 'Vermelho' }, { hex: '#f97316', name: 'Laranja' },
    { hex: '#f59e0b', name: 'Âmbar' }, { hex: '#22c55e', name: 'Verde' },
    { hex: '#06b6d4', name: 'Ciano' }, { hex: '#3b82f6', name: 'Azul' },
    { hex: '#64748b', name: 'Slate' }, { hex: '#1e293b', name: 'Escuro' },
  ];

  let _modalCardId = null, _modalColId = null, _modalTempLabels = [], _modalTempColor = '#ffffff';

  const Card = {
    create(colId, title) {
      const trimmed = title.trim();
      if (!trimmed) return;
      const data = KanbanApp.getData();
      const col = data.columns[colId];
      if (!col) return;
      const newCard = { id: KanbanApp.generateId('k'), title: trimmed, description: '', color: '#ffffff', labels: [] };
      data.cards[newCard.id] = newCard;
      col.cards.push(newCard.id);
      KanbanApp.saveData(data);
      KanbanApp.renderPage();
    },
    delete(colId, cardId) {
      const data = KanbanApp.getData();
      const col = data.columns[colId];
      if (!col) return;
      col.cards = col.cards.filter(id => id !== cardId);
      delete data.cards[cardId];
      KanbanApp.saveData(data);
    },
    update(cardId, changes) {
      const data = KanbanApp.getData();
      if (!data.cards[cardId]) return;
      Object.assign(data.cards[cardId], changes);
      KanbanApp.saveData(data);
    },
    render(cardId) {
      const data = KanbanApp.getData();
      const card = data.cards[cardId];
      if (!card) return null;
      const cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.dataset.cardId = cardId;
      cardEl.setAttribute('draggable', 'true');
      cardEl.setAttribute('role', 'listitem');
      cardEl.setAttribute('tabindex', '0');
      const colorBar = card.color && card.color !== '#ffffff' ? '<div class="card-color-bar" style="background-color:' + card.color + ';"></div>' : '';
      const labelsHtml = card.labels && card.labels.length ? '<div class="card-labels">' + card.labels.map(l => '<span class="card-label">' + KanbanApp.Board._escapeHtml(l) + '</span>').join('') + '</div>' : '';
      const descHtml = card.description ? '<p class="card-description">' + KanbanApp.Board._escapeHtml(card.description) + '</p>' : '';
      cardEl.innerHTML = colorBar + '<div class="card-content"><div class="card-title">' + KanbanApp.Board._escapeHtml(card.title) + '</div>' + descHtml + labelsHtml + '</div><button class="card-edit-btn" data-card-id="' + cardId + '" title="Editar card"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9 2l2 2-6 6-2.5.5.5-2.5 6-6z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      Card._bindCardEvents(cardEl, cardId);
      return cardEl;
    },
    _bindCardEvents(cardEl, cardId) {
      const editBtn = cardEl.querySelector('.card-edit-btn');
      const openModal = () => {
        const colContainer = cardEl.closest('.column-cards');
        Card.openModal(cardId, colContainer ? colContainer.dataset.colId : null);
      };
      if (editBtn) editBtn.addEventListener('click', e => { e.stopPropagation(); openModal(); });
      cardEl.addEventListener('click', e => { if (!e.target.closest('.card-edit-btn')) openModal(); });
      cardEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); } });
    },
    openModal(cardId, colId) {
      const data = KanbanApp.getData();
      const card = data.cards[cardId];
      if (!card) return;
      _modalCardId = cardId; _modalColId = colId;
      _modalTempLabels = [...(card.labels || [])];
      _modalTempColor = card.color || '#ffffff';
      document.getElementById('modal-input-title').value = card.title;
      document.getElementById('modal-input-desc').value = card.description || '';
      Card._updateModalColorStrip(_modalTempColor);
      Card._renderColorSwatches(_modalTempColor);
      Card._renderModalLabels();
      const overlay = document.getElementById('modal-overlay');
      overlay.removeAttribute('hidden');
      document.getElementById('modal-input-title').focus();
      document.body.style.overflow = 'hidden';
    },
    closeModal() {
      if (!_modalCardId) return;
      const title = document.getElementById('modal-input-title').value.trim();
      const desc = document.getElementById('modal-input-desc').value.trim();
      if (title) Card.update(_modalCardId, { title, description: desc, color: _modalTempColor, labels: [..._modalTempLabels] });
      const overlay = document.getElementById('modal-overlay');
      overlay.setAttribute('hidden', '');
      document.body.style.overflow = '';
      const existingCard = document.querySelector('.card[data-card-id="' + _modalCardId + '"]');
      if (existingCard) { const newCard = Card.render(_modalCardId); if (newCard) existingCard.replaceWith(newCard); }
      _modalCardId = null; _modalColId = null;
    },
    _renderColorSwatches(selectedColor) {
      const row = document.getElementById('color-picker-row');
      row.innerHTML = '';
      CARD_COLORS.forEach(({ hex, name }) => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'color-swatch' + (hex === selectedColor ? ' selected' : '');
        swatch.style.backgroundColor = hex;
        if (hex === '#ffffff') swatch.style.border = '2px solid #e2e8f0';
        swatch.title = name;
        swatch.addEventListener('click', () => {
          _modalTempColor = hex;
          Card._updateModalColorStrip(hex);
          row.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
          swatch.classList.add('selected');
        });
        row.appendChild(swatch);
      });
    },
    _updateModalColorStrip(color) {
      document.getElementById('modal-color-strip').style.backgroundColor = color === '#ffffff' ? 'transparent' : color;
    },
    _renderModalLabels() {
      const list = document.getElementById('modal-labels-list');
      list.innerHTML = '';
      if (!_modalTempLabels.length) { list.innerHTML = '<span style="font-size:.8rem;color:var(--text-muted)">Nenhuma etiqueta adicionada.</span>'; return; }
      _modalTempLabels.forEach((label, idx) => {
        const tag = document.createElement('span');
        tag.className = 'label-tag';
        tag.innerHTML = KanbanApp.Board._escapeHtml(label) + '<button class="label-remove-btn" title="Remover">✕</button>';
        tag.querySelector('.label-remove-btn').addEventListener('click', () => { _modalTempLabels.splice(idx, 1); Card._renderModalLabels(); });
        list.appendChild(tag);
      });
    }
  };

  Card._initModalEvents = function () {
    document.getElementById('modal-close-btn').addEventListener('click', () => Card.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) Card.closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('modal-overlay').hasAttribute('hidden')) Card.closeModal(); });
    document.getElementById('modal-save-btn').addEventListener('click', () => Card.closeModal());
    document.getElementById('modal-delete-btn').addEventListener('click', () => {
      if (!_modalCardId || !_modalColId) return;
      const data = KanbanApp.getData();
      const card = data.cards[_modalCardId];
      if (!card) return;
      if (window.confirm('Excluir o card "' + card.title + '" permanentemente?')) {
        const cardId = _modalCardId, colId = _modalColId;
        document.getElementById('modal-overlay').setAttribute('hidden', '');
        document.body.style.overflow = '';
        _modalCardId = null; _modalColId = null;
        Card.delete(colId, cardId);
        const cardEl = document.querySelector('.card[data-card-id="' + cardId + '"]');
        if (cardEl) {
          const colArea = document.getElementById('col-cards-' + colId);
          cardEl.remove();
          if (colArea) { const badge = colArea.closest('.column')?.querySelector('.column-count-badge'); if (badge) badge.textContent = colArea.querySelectorAll('.card').length; }
        }
        KanbanApp.showToast('Card excluído.');
      }
    });
    document.getElementById('btn-add-label').addEventListener('click', () => {
      const input = document.getElementById('modal-input-label');
      const val = input.value.trim();
      if (val && !_modalTempLabels.includes(val)) { _modalTempLabels.push(val); Card._renderModalLabels(); input.value = ''; input.focus(); }
    });
    document.getElementById('modal-input-label').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-label').click(); } });
  };

  window.KanbanApp.Card = Card;
})();
