/**
 * board.js — Módulo de Quadros (Boards)
 * KanbanCintia v2.0
 * Usa showInputModal e showConfirmModal (sem window.prompt/confirm).
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};

  const Board = {
    create(name) {
      const t = name.trim(); if (!t) return;
      const data = KanbanApp.getData();
      const nb = {id:KanbanApp.generateId('b'), name:t, columns:[]};
      data.boards.push(nb); KanbanApp.saveData(data);
      KanbanApp.navigate('#board-'+nb.id);
    },
    rename(boardId, newName) {
      const t = newName.trim(); if (!t) return;
      const data = KanbanApp.getData();
      const board = data.boards.find(b=>b.id===boardId);
      if (!board) return; board.name=t; KanbanApp.saveData(data); KanbanApp.renderPage();
    },
    delete(boardId) {
      const data = KanbanApp.getData();
      const board = data.boards.find(b=>b.id===boardId); if (!board) return;
      board.columns.forEach(colId => { const col=data.columns[colId]; if(col){col.cards.forEach(cid=>delete data.cards[cid]); delete data.columns[colId];} });
      data.boards = data.boards.filter(b=>b.id!==boardId); KanbanApp.saveData(data); KanbanApp.navigate('#');
    },
    renderHome(container) {
      const data=KanbanApp.getData(), boards=data.boards;
      let html = '<div class="home-container"><div class="home-header"><h1 class="home-title">Meus <span>Quadros</span></h1><button class="btn btn-primary" id="btn-new-board"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Novo Quadro</button></div>';
      if (boards.length===0) {
        html += '<div class="empty-state"><svg class="empty-state-icon" width="120" height="120" viewBox="0 0 120 120" fill="none"><rect x="10" y="30" width="44" height="60" rx="8" fill="#c7d2fe"/><rect x="66" y="30" width="44" height="60" rx="8" fill="#e0e7ff"/><rect x="20" y="42" width="24" height="6" rx="3" fill="#6366f1" opacity=".6"/><rect x="20" y="54" width="18" height="6" rx="3" fill="#6366f1" opacity=".4"/><circle cx="90" cy="28" r="18" fill="#6366f1"/><path d="M90 20v16M82 28h16" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg><h2>Nenhum quadro ainda</h2><p>Crie seu primeiro quadro KanbanCintia para começar a organizar suas tarefas de forma visual.</p><button class="btn btn-primary" id="btn-new-board-empty"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Criar Primeiro Quadro</button></div>';
      } else {
        html += '<div class="boards-grid" id="boards-grid">';
        boards.forEach(board => {
          const cc=board.columns.length, kc=board.columns.reduce((a,id)=>{const c=data.columns[id];return a+(c?c.cards.length:0);},0);
          html += '<article class="board-card" data-board-id="'+board.id+'" tabindex="0" role="button" aria-label="Abrir quadro '+Board._escapeHtml(board.name)+'">';
          html += '<div class="board-card-name">'+Board._escapeHtml(board.name)+'</div>';
          html += '<div class="board-card-meta">'+cc+' coluna'+(cc!==1?'s':'')+' · '+kc+' card'+(kc!==1?'s':'')+'</div>';
          html += '<div class="board-card-actions">';
          html += '<button class="btn btn-icon btn-rename-board" data-board-id="'+board.id+'" title="Renomear"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.5 2.5l2 2-7 7-2.5.5.5-2.5 7-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
          html += '<button class="btn btn-icon btn-delete-board" data-board-id="'+board.id+'" title="Excluir"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M6 4V2.5h3V4M4.5 4v8a1 1 0 001 1h4a1 1 0 001-1V4H4.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
          html += '</div></article>';
        });
        html += '</div>';
      }
      html += '</div>';
      container.innerHTML = html;
      document.getElementById('header-actions').innerHTML = '';
      Board._bindHomeEvents();
    },
    _bindHomeEvents() {
      ['btn-new-board','btn-new-board-empty'].forEach(id => { const btn=document.getElementById(id); if(btn) btn.addEventListener('click',()=>Board._promptNewBoard()); });
      const grid = document.getElementById('boards-grid');
      if (grid) {
        grid.addEventListener('click', e => {
          const rb=e.target.closest('.btn-rename-board'), db=e.target.closest('.btn-delete-board'), bc=e.target.closest('.board-card');
          if(rb) { e.stopPropagation(); Board._promptRename(rb.dataset.boardId); }
          else if(db) { e.stopPropagation(); Board._confirmDelete(db.dataset.boardId); }
          else if(bc) KanbanApp.navigate('#board-'+bc.dataset.boardId);
        });
        grid.addEventListener('keydown', e => {
          if (e.key==='Enter'||e.key===' ') { const bc=e.target.closest('.board-card'); if(bc){e.preventDefault();KanbanApp.navigate('#board-'+bc.dataset.boardId);} }
        });
      }
    },
    _promptNewBoard() {
      KanbanApp.showInputModal({ title:'Novo Quadro', label:'Nome do Quadro', placeholder:'Ex: Projeto Marketing...', onConfirm:(name)=>{Board.create(name);KanbanApp.showToast('Quadro "'+name+'" criado!');} });
    },
    _promptRename(boardId) {
      const data=KanbanApp.getData(), board=data.boards.find(b=>b.id===boardId); if(!board) return;
      KanbanApp.showInputModal({ title:'Renomear Quadro', label:'Novo Nome', placeholder:'Nome do quadro...', defaultValue:board.name, onConfirm:(n)=>{Board.rename(boardId,n);KanbanApp.showToast('Quadro renomeado!');} });
    },
    _confirmDelete(boardId) {
      const data=KanbanApp.getData(), board=data.boards.find(b=>b.id===boardId); if(!board) return;
      KanbanApp.showConfirmModal({ title:'Excluir Quadro', message:'Excluir o quadro "'+board.name+'"? Todas as colunas e cards serão removidos permanentemente.', isDanger:true, onConfirm:()=>{Board.delete(boardId);KanbanApp.showToast('Quadro excluído.');} });
    },
    renderView(boardId, container) {
      const data=KanbanApp.getData(), board=data.boards.find(b=>b.id===boardId);
      if (!board) { container.innerHTML='<div class="empty-state"><h2>Quadro não encontrado.</h2></div>'; return; }
      document.getElementById('header-actions').innerHTML =
        '<span class="header-board-name" title="'+Board._escapeHtml(board.name)+'">'+Board._escapeHtml(board.name)+'</span>'+
        '<button class="btn btn-ghost" id="btn-board-rename" style="color:rgba(255,255,255,.75)">Renomear</button>'+
        '<button class="btn btn-ghost" id="btn-board-delete" style="color:rgba(255,255,255,.75)">Excluir</button>';
      document.getElementById('btn-board-rename').addEventListener('click',()=>Board._promptRename(boardId));
      document.getElementById('btn-board-delete').addEventListener('click',()=>Board._confirmDelete(boardId));
      container.innerHTML='<div class="board-view" id="board-view" data-board-id="'+boardId+'"><div class="columns-scroll-area" id="columns-area"></div></div>';
      Board._renderColumns(board, document.getElementById('columns-area'), boardId);
    },
    _renderColumns(board, columnsArea, boardId) {
      columnsArea.innerHTML='';
      board.columns.forEach(colId => { const el=KanbanApp.Column.render(colId,boardId); if(el) columnsArea.appendChild(el); });
      const addBtn = document.createElement('button');
      addBtn.className='add-column-btn'; addBtn.id='btn-add-column'; addBtn.setAttribute('aria-label','Adicionar nova coluna');
      addBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Adicionar Coluna';
      addBtn.addEventListener('click', () => {
        KanbanApp.showInputModal({ title:'Nova Coluna', label:'Nome da Coluna', placeholder:'Ex: Em Revisão...', onConfirm:(name)=>{KanbanApp.Column.create(boardId,name);KanbanApp.showToast('Coluna "'+name+'" criada!');} });
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
