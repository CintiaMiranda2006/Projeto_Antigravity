/**
 * board.js — Módulo de Quadros (Boards)
 * Responsabilidade: CRUD de boards e renderização da home e board view.
 * Expõe: window.KanbanApp.Board
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};

  const Board = {
    create(name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      const data = KanbanApp.getData();
      const newBoard = { id: KanbanApp.generateId('b'), name: trimmed, columns: [] };
      data.boards.push(newBoard);
      KanbanApp.saveData(data);
      KanbanApp.navigate('#board-' + newBoard.id);
    },
    rename(boardId, newName) {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const data = KanbanApp.getData();
      const board = data.boards.find(b => b.id === boardId);
      if (!board) return;
      board.name = trimmed;
      KanbanApp.saveData(data);
      KanbanApp.renderPage();
    },
    delete(boardId) {
      const data = KanbanApp.getData();
      const board = data.boards.find(b => b.id === boardId);
      if (!board) return;
      board.columns.forEach(colId => {
        const col = data.columns[colId];
        if (col) { col.cards.forEach(cardId => delete data.cards[cardId]); delete data.columns[colId]; }
      });
      data.boards = data.boards.filter(b => b.id !== boardId);
      KanbanApp.saveData(data);
      KanbanApp.navigate('#');
    },
    renderHome(container) {
      const data = KanbanApp.getData();
      const boards = data.boards;
      let html = '<div class="home-container"><div class="home-header"><h1 class="home-title">Meus <span>Quadros</span></h1><button class="btn btn-primary" id="btn-new-board"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Novo Quadro</button></div>';
      if (boards.length === 0) {
        html += '<div class="empty-state"><svg class="empty-state-icon" width="120" height="120" viewBox="0 0 120 120" fill="none"><rect x="10" y="30" width="44" height="60" rx="8" fill="#c7d2fe"/><rect x="66" y="30" width="44" height="60" rx="8" fill="#e0e7ff"/><circle cx="90" cy="28" r="18" fill="#6366f1"/><path d="M90 20v16M82 28h16" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg><h2>Nenhum quadro ainda</h2><p>Crie seu primeiro quadro Kanban para começar a organizar suas tarefas de forma visual.</p><button class="btn btn-primary" id="btn-new-board-empty"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Criar Primeiro Quadro</button></div>';
      } else {
        html += '<div class="boards-grid" id="boards-grid">';
        boards.forEach(board => {
          const colCount = board.columns.length;
          const cardCount = board.columns.reduce((acc, colId) => { const col = data.columns[colId]; return acc + (col ? col.cards.length : 0); }, 0);
          html += '<article class="board-card" data-board-id="' + board.id + '" tabindex="0" role="button"><div class="board-card-name">' + Board._escapeHtml(board.name) + '</div><div class="board-card-meta">' + colCount + ' coluna' + (colCount !== 1 ? 's' : '') + ' · ' + cardCount + ' card' + (cardCount !== 1 ? 's' : '') + '</div><div class="board-card-actions"><button class="btn btn-icon btn-rename-board" data-board-id="' + board.id + '" title="Renomear"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.5 2.5l2 2-7 7-2.5.5.5-2.5 7-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="btn btn-icon btn-delete-board" data-board-id="' + board.id + '" title="Excluir"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M6 4V2.5h3V4M4.5 4v8a1 1 0 001 1h4a1 1 0 001-1V4H4.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></article>';
        });
        html += '</div>';
      }
      html += '</div>';
      container.innerHTML = html;
      document.getElementById('header-actions').innerHTML = '';
      Board._bindHomeEvents();
    },
    _bindHomeEvents() {
      ['btn-new-board', 'btn-new-board-empty'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', () => Board._promptNewBoard());
      });
      const grid = document.getElementById('boards-grid');
      if (grid) {
        grid.addEventListener('click', e => {
          const renameBtn = e.target.closest('.btn-rename-board');
          const deleteBtn = e.target.closest('.btn-delete-board');
          const boardCard = e.target.closest('.board-card');
          if (renameBtn) { e.stopPropagation(); Board._promptRename(renameBtn.dataset.boardId); }
          else if (deleteBtn) { e.stopPropagation(); Board._confirmDelete(deleteBtn.dataset.boardId); }
          else if (boardCard) { KanbanApp.navigate('#board-' + boardCard.dataset.boardId); }
        });
        grid.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            const boardCard = e.target.closest('.board-card');
            if (boardCard) { e.preventDefault(); KanbanApp.navigate('#board-' + boardCard.dataset.boardId); }
          }
        });
      }
    },
    _promptNewBoard() {
      const name = window.prompt('Nome do novo quadro:');
      if (name && name.trim()) { Board.create(name.trim()); KanbanApp.showToast('Quadro "' + name.trim() + '" criado!'); }
    },
    _promptRename(boardId) {
      const data = KanbanApp.getData();
      const board = data.boards.find(b => b.id === boardId);
      if (!board) return;
      const newName = window.prompt('Novo nome do quadro:', board.name);
      if (newName && newName.trim()) { Board.rename(boardId, newName.trim()); KanbanApp.showToast('Quadro renomeado!'); }
    },
    _confirmDelete(boardId) {
      const data = KanbanApp.getData();
      const board = data.boards.find(b => b.id === boardId);
      if (!board) return;
      if (window.confirm('Excluir o quadro "' + board.name + '"?\n\nTodas as colunas e cards serão removidos permanentemente.')) {
        Board.delete(boardId);
        KanbanApp.showToast('Quadro excluído.');
      }
    },
    renderView(boardId, container) {
      const data = KanbanApp.getData();
      const board = data.boards.find(b => b.id === boardId);
      if (!board) { container.innerHTML = '<div class="empty-state"><h2>Quadro não encontrado.</h2></div>'; return; }
      document.getElementById('header-actions').innerHTML =
        '<span class="header-board-name">' + Board._escapeHtml(board.name) + '</span>' +
        '<button class="btn btn-ghost" id="btn-board-rename" style="color:rgba(255,255,255,.7)">Renomear</button>' +
        '<button class="btn btn-ghost" id="btn-board-delete" style="color:rgba(255,255,255,.7)">Excluir</button>';
      document.getElementById('btn-board-rename').addEventListener('click', () => Board._promptRename(boardId));
      document.getElementById('btn-board-delete').addEventListener('click', () => Board._confirmDelete(boardId));
      container.innerHTML = '<div class="board-view" id="board-view" data-board-id="' + boardId + '"><div class="columns-scroll-area" id="columns-area"></div></div>';
      const columnsArea = document.getElementById('columns-area');
      Board._renderColumns(board, columnsArea, boardId);
    },
    _renderColumns(board, columnsArea, boardId) {
      columnsArea.innerHTML = '';
      board.columns.forEach(colId => {
        const colEl = KanbanApp.Column.render(colId, boardId);
        if (colEl) columnsArea.appendChild(colEl);
      });
      const addBtn = document.createElement('button');
      addBtn.className = 'add-column-btn'; addBtn.id = 'btn-add-column';
      addBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Adicionar Coluna';
      addBtn.addEventListener('click', () => {
        const name = window.prompt('Nome da nova coluna:');
        if (name && name.trim()) { KanbanApp.Column.create(boardId, name.trim()); KanbanApp.showToast('Coluna "' + name.trim() + '" criada!'); }
      });
      columnsArea.appendChild(addBtn);
      KanbanApp.DragEngine.init(boardId);
    },
    _escapeHtml(str) {
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
  };
  window.KanbanApp.Board = Board;
})();
