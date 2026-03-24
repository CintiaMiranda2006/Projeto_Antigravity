/**
 * card.js — Módulo de Cards | KanbanCintia v2.1
 *
 * FIX v2.1: Labels renderizadas diretamente no board (card-labels visível sem abrir modal).
 * Labels com cor de fundo e texto contrastante via KanbanApp.getContrastColor().
 * Retrocompatível com labels antigas (string) via normalizeLabel().
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};

  var CARD_COLORS = [
    {hex:'#ffffff',name:'Branco'},{hex:'#6366f1',name:'Índigo'},{hex:'#8b5cf6',name:'Violeta'},
    {hex:'#ec4899',name:'Rosa'},{hex:'#ef4444',name:'Vermelho'},{hex:'#f97316',name:'Laranja'},
    {hex:'#f59e0b',name:'Âmbar'},{hex:'#22c55e',name:'Verde'},{hex:'#06b6d4',name:'Ciano'},
    {hex:'#3b82f6',name:'Azul'},{hex:'#64748b',name:'Slate'},{hex:'#1e293b',name:'Escuro'}
  ];

  /** Alinhado com --label-* CSS tokens. Para adicionar: inclua aqui e no :root. */
  var LABEL_PRESET_COLORS = [
    '#6366f1','#8b5cf6','#ec4899','#ef4444',
    '#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#64748b'
  ];

  var _modalCardId = null, _modalColId = null, _modalTempLabels = [], _modalTempColor = '#ffffff';

  /** Normaliza label para {text, color}. String 'Bug' → {text:'Bug', color:'#6366f1'}. */
  function normalizeLabel(label) {
    if (typeof label === 'string') return {text: label, color: '#6366f1'};
    return {text: label.text || '', color: label.color || '#6366f1'};
  }

  var Card = {
    create: function (colId, title) {
      var t = title.trim(); if (!t) return;
      var data = KanbanApp.getData(), col = data.columns[colId]; if (!col) return;
      var nc = {id: KanbanApp.generateId('k'), title: t, description: '', color: '#ffffff', labels: []};
      data.cards[nc.id] = nc; col.cards.push(nc.id); KanbanApp.saveData(data); KanbanApp.renderPage();
    },

    delete: function (colId, cardId) {
      var data = KanbanApp.getData(), col = data.columns[colId]; if (!col) return;
      col.cards = col.cards.filter(function (id) { return id !== cardId; });
      delete data.cards[cardId]; KanbanApp.saveData(data);
    },

    update: function (cardId, changes) {
      var data = KanbanApp.getData(); if (!data.cards[cardId]) return;
      Object.assign(data.cards[cardId], changes); KanbanApp.saveData(data);
    },

    /**
     * Renderiza card como elemento DOM para o board view.
     * LABELS: incluídas diretamente no card com cor de fundo + contraste WCAG.
     */
    render: function (cardId) {
      var data = KanbanApp.getData(), card = data.cards[cardId]; if (!card) return null;

      var cardEl = document.createElement('div');
      cardEl.className = 'card'; cardEl.dataset.cardId = cardId;
      cardEl.setAttribute('draggable', 'true'); cardEl.setAttribute('role', 'listitem');
      cardEl.setAttribute('tabindex', '0'); cardEl.setAttribute('aria-label', 'Card: ' + card.title);

      // Faixa de cor (topo do card)
      var colorBar = (card.color && card.color !== '#ffffff')
        ? '<div class="card-color-bar" style="background-color:' + card.color + ';" aria-hidden="true"></div>'
        : '';

      // ETIQUETAS — visíveis no board, com cor e contraste calculado
      var labels = (card.labels || []).map(normalizeLabel).filter(function (l) { return l.text; });
      var labelsHtml = labels.length
        ? '<div class="card-labels" aria-label="Etiquetas">' +
          labels.map(function (l) {
            var fg = KanbanApp.getContrastColor(l.color);
            return '<span class="card-label" style="background-color:' + l.color + ';color:' + fg + ';">' +
              KanbanApp.Board._escapeHtml(l.text) + '</span>';
          }).join('') + '</div>'
        : '';

      var descHtml = card.description
        ? '<p class="card-description">' + KanbanApp.Board._escapeHtml(card.description) + '</p>' : '';

      cardEl.innerHTML =
        colorBar +
        '<div class="card-content">' +
          '<div class="card-title">' + KanbanApp.Board._escapeHtml(card.title) + '</div>' +
          descHtml + labelsHtml +
        '</div>' +
        '<button class="card-edit-btn" data-card-id="' + cardId + '" title="Editar card" aria-label="Editar card">' +
          '<svg width="13" height="13" viewBox="0 0 13 13" fill="none">' +
            '<path d="M9 2l2 2-6 6-2.5.5.5-2.5 6-6z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>';

      Card._bindCardEvents(cardEl, cardId);
      return cardEl;
    },

    _bindCardEvents: function (cardEl, cardId) {
      var openModal = function () {
        var colArea = cardEl.closest('.column-cards');
        Card.openModal(cardId, colArea ? colArea.dataset.colId : null);
      };
      var eb = cardEl.querySelector('.card-edit-btn');
      if (eb) eb.addEventListener('click', function (e) { e.stopPropagation(); openModal(); });
      cardEl.addEventListener('click', function (e) { if (!e.target.closest('.card-edit-btn')) openModal(); });
      cardEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(); } });
    },

    openModal: function (cardId, colId) {
      var data = KanbanApp.getData(), card = data.cards[cardId]; if (!card) return;
      _modalCardId = cardId; _modalColId = colId;
      _modalTempColor = card.color || '#ffffff';
      _modalTempLabels = (card.labels || []).map(normalizeLabel);
      document.getElementById('modal-input-title').value = card.title;
      document.getElementById('modal-input-desc').value  = card.description || '';
      Card._updateModalColorStrip(_modalTempColor);
      Card._renderColorSwatches(_modalTempColor);
      Card._renderLabelColorPresets();
      Card._renderModalLabels();
      var overlay = document.getElementById('modal-overlay');
      overlay.removeAttribute('hidden'); document.body.style.overflow = 'hidden';
      setTimeout(function () { document.getElementById('modal-input-title').focus(); }, 50);
    },

    closeModal: function () {
      if (!_modalCardId) return;
      var title = document.getElementById('modal-input-title').value.trim();
      var desc  = document.getElementById('modal-input-desc').value.trim();
      if (title) Card.update(_modalCardId, {title: title, description: desc, color: _modalTempColor, labels: _modalTempLabels.slice()});
      document.getElementById('modal-overlay').setAttribute('hidden', ''); document.body.style.overflow = '';
      var ex = document.querySelector('.card[data-card-id="' + _modalCardId + '"]');
      if (ex) { var nc = Card.render(_modalCardId); if (nc) ex.replaceWith(nc); }
      _modalCardId = null; _modalColId = null;
    },

    _renderColorSwatches: function (selected) {
      var row = document.getElementById('color-picker-row'); row.innerHTML = '';
      CARD_COLORS.forEach(function (c) {
        var sw = document.createElement('button'); sw.type = 'button';
        sw.className = 'color-swatch' + (c.hex === selected ? ' selected' : '');
        sw.style.backgroundColor = c.hex; if (c.hex === '#ffffff') sw.style.border = '2px solid #e2e8f0';
        sw.title = c.name; sw.setAttribute('aria-label', 'Cor: ' + c.name);
        sw.addEventListener('click', function () {
          _modalTempColor = c.hex; Card._updateModalColorStrip(c.hex);
          row.querySelectorAll('.color-swatch').forEach(function (s) { s.classList.remove('selected'); }); sw.classList.add('selected');
        }); row.appendChild(sw);
      });
    },

    _updateModalColorStrip: function (color) {
      var s = document.getElementById('modal-color-strip');
      if (s) s.style.backgroundColor = (color === '#ffffff') ? 'transparent' : color;
    },

    _renderLabelColorPresets: function () {
      var container = document.getElementById('label-color-presets'); if (!container) return;
      container.innerHTML = '';
      var ci = document.getElementById('modal-input-label-color'), current = ci ? ci.value : LABEL_PRESET_COLORS[0];
      LABEL_PRESET_COLORS.forEach(function (color, idx) {
        var btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'label-color-preset' + ((color === current || (!current && idx === 0)) ? ' selected' : '');
        btn.style.backgroundColor = color; btn.title = color; btn.setAttribute('aria-label', 'Cor de etiqueta ' + color);
        btn.addEventListener('click', function () {
          if (ci) ci.value = color;
          container.querySelectorAll('.label-color-preset').forEach(function (b) { b.classList.remove('selected'); }); btn.classList.add('selected');
        }); container.appendChild(btn);
      });
    },

    _renderModalLabels: function () {
      var list = document.getElementById('modal-labels-list'); list.innerHTML = '';
      if (!_modalTempLabels.length) { list.innerHTML = '<span style="font-size:.8rem;color:var(--text-muted)">Nenhuma etiqueta adicionada.</span>'; return; }
      _modalTempLabels.forEach(function (label, idx) {
        var bg = label.color, fg = KanbanApp.getContrastColor(bg);
        var tag = document.createElement('span'); tag.className = 'label-tag';
        tag.style.backgroundColor = bg; tag.style.color = fg; tag.setAttribute('role', 'listitem');
        tag.innerHTML = KanbanApp.Board._escapeHtml(label.text) +
          '<button class="label-remove-btn" type="button" aria-label="Remover etiqueta">' +
            '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M8 2L2 8M2 2l6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
          '</button>';
        tag.querySelector('.label-remove-btn').addEventListener('click', function () { _modalTempLabels.splice(idx, 1); Card._renderModalLabels(); });
        list.appendChild(tag);
      });
    }
  };

  Card._initModalEvents = function () {
    document.getElementById('modal-close-btn').addEventListener('click', function () { Card.closeModal(); });
    document.getElementById('modal-save-btn').addEventListener('click',  function () { Card.closeModal(); });
    document.getElementById('modal-overlay').addEventListener('click', function (e) { if (e.target === document.getElementById('modal-overlay')) Card.closeModal(); });

    document.getElementById('modal-delete-btn').addEventListener('click', function () {
      if (!_modalCardId || !_modalColId) return;
      var data = KanbanApp.getData(), card = data.cards[_modalCardId]; if (!card) return;
      var cardId = _modalCardId, colId = _modalColId;
      KanbanApp.showConfirmModal({
        title: 'Excluir Card', message: 'Excluir o card "' + card.title + '" permanentemente?', isDanger: true,
        onConfirm: function () {
          document.getElementById('modal-overlay').setAttribute('hidden', ''); document.body.style.overflow = '';
          _modalCardId = null; _modalColId = null;
          Card.delete(colId, cardId);
          var ce = document.querySelector('.card[data-card-id="' + cardId + '"]');
          if (ce) {
            var ca = document.getElementById('col-cards-' + colId); ce.remove();
            if (ca) { var col = ca.closest('.column'), badge = col ? col.querySelector('.column-count-badge') : null; if (badge) badge.textContent = ca.querySelectorAll('.card').length; }
          }
          KanbanApp.showToast('Card excluído.');
        }
      });
    });

    document.getElementById('btn-add-label').addEventListener('click', function () {
      var input = document.getElementById('modal-input-label');
      var ci    = document.getElementById('modal-input-label-color');
      var val   = input.value.trim(), color = ci ? ci.value : '#6366f1';
      if (val && !_modalTempLabels.some(function (l) { return l.text === val; })) {
        _modalTempLabels.push({text: val, color: color}); Card._renderModalLabels(); input.value = ''; input.focus();
      }
    });

    document.getElementById('modal-input-label').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-label').click(); }
    });

    var ci = document.getElementById('modal-input-label-color');
    if (ci) ci.addEventListener('input', function () {
      document.querySelectorAll('#label-color-presets .label-color-preset').forEach(function (b) {
        b.classList.toggle('selected', b.style.backgroundColor === ci.value);
      });
    });
  };

  window.KanbanApp.Card = Card;
})();
