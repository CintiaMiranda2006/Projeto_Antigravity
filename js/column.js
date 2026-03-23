/**
 * column.js — Módulo de Colunas
 * KanbanCintia v2.0
 * Usa showInputModal e showConfirmModal (sem window.prompt/confirm).
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};

  const Column = {
    create(boardId, name) {
      const t=name.trim(); if(!t) return;
      const data=KanbanApp.getData(), board=data.boards.find(b=>b.id===boardId); if(!board) return;
      const nc={id:KanbanApp.generateId('c'), name:t, cards:[]};
      data.columns[nc.id]=nc; board.columns.push(nc.id); KanbanApp.saveData(data); KanbanApp.renderPage();
    },
    rename(colId, newName) {
      const t=newName.trim(); if(!t) return;
      const data=KanbanApp.getData(), col=data.columns[colId]; if(!col) return;
      col.name=t; KanbanApp.saveData(data);
      const input=document.querySelector('.column-title-input[data-col-id="'+colId+'"]'); if(input) input.value=t;
    },
    delete(boardId, colId) {
      const data=KanbanApp.getData(), board=data.boards.find(b=>b.id===boardId), col=data.columns[colId];
      if(!board||!col) return;
      col.cards.forEach(cid=>delete data.cards[cid]); delete data.columns[colId];
      board.columns=board.columns.filter(id=>id!==colId); KanbanApp.saveData(data); KanbanApp.renderPage();
    },
    render(colId, boardId) {
      const data=KanbanApp.getData(), col=data.columns[colId]; if(!col) return null;
      const colEl=document.createElement('div');
      colEl.className='column'; colEl.dataset.colId=colId; colEl.dataset.boardId=boardId;
      colEl.setAttribute('draggable','true'); colEl.setAttribute('role','region'); colEl.setAttribute('aria-label','Coluna '+KanbanApp.Board._escapeHtml(col.name));
      const cc=col.cards.length;
      colEl.innerHTML =
        '<div class="column-header">'+
          '<input type="text" class="column-title-input" data-col-id="'+colId+'" value="'+KanbanApp.Board._escapeHtml(col.name)+'" maxlength="80" title="Clique para renomear" aria-label="Nome da coluna" />'+
          '<span class="column-count-badge" title="'+cc+' cards">'+cc+'</span>'+
          '<div class="column-actions"><button class="btn-icon btn-delete-col" data-col-id="'+colId+'" data-board-id="'+boardId+'" title="Excluir coluna" aria-label="Excluir coluna"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M6 4V2.5h3V4M4.5 4v8a1 1 0 001 1h4a1 1 0 001-1V4H4.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>'+
        '</div>'+
        '<div class="column-cards" id="col-cards-'+colId+'" data-col-id="'+colId+'" role="list" aria-label="Cards da coluna"></div>'+
        '<div class="column-footer"><button class="btn-add-card" data-col-id="'+colId+'" aria-label="Adicionar card"><svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Adicionar Card</button></div>';
      const cardsArea=colEl.querySelector('#col-cards-'+colId);
      col.cards.forEach(cid => { const el=KanbanApp.Card.render(cid); if(el) cardsArea.appendChild(el); });
      Column._bindColumnEvents(colEl, colId, boardId);
      return colEl;
    },
    _bindColumnEvents(colEl, colId, boardId) {
      const ti=colEl.querySelector('.column-title-input');
      if (ti) {
        ti.addEventListener('blur', ()=>Column.rename(colId,ti.value));
        ti.addEventListener('keydown', e => {
          if(e.key==='Enter'){e.preventDefault();ti.blur();}
          if(e.key==='Escape'){const data=KanbanApp.getData(),col=data.columns[colId];if(col)ti.value=col.name;ti.blur();}
        });
        ti.addEventListener('mousedown', e=>e.stopPropagation());
      }
      const db=colEl.querySelector('.btn-delete-col');
      if (db) {
        db.addEventListener('click', e => {
          e.stopPropagation();
          const data=KanbanApp.getData(), col=data.columns[colId], count=col?col.cards.length:0;
          KanbanApp.showConfirmModal({
            title:'Excluir Coluna',
            message:'Excluir a coluna "'+(col?col.name:'')+'
          "?'+(count>0?' '+count+' card(s) será(o) removido(s).':''),
            isDanger:true,
            onConfirm:()=>{Column.delete(boardId,colId);KanbanApp.showToast('Coluna excluída.');}
          });
        });
      }
      const acb=colEl.querySelector('.btn-add-card');
      if (acb) {
        acb.addEventListener('click', () => {
          KanbanApp.showInputModal({ title:'Novo Card', label:'Título do Card', placeholder:'Ex: Implementar login...', onConfirm:(title)=>{KanbanApp.Card.create(colId,title);KanbanApp.showToast('Card "'+title+'" criado!');} });
        });
      }
    }
  };
  window.KanbanApp.Column = Column;
})();
