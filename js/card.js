/**
 * card.js — Módulo de Cards
 * KanbanCintia v2.0
 * Novidades: cores de etiquetas com getContrastColor, paleta CSS integrada,
 * retrocompatibilidade com labels antigas (string), showConfirmModal.
 */
(function () {
  'use strict';
  window.KanbanApp = window.KanbanApp || {};

  const CARD_COLORS = [
    {hex:'#ffffff',name:'Branco'},{hex:'#6366f1',name:'Índigo'},{hex:'#8b5cf6',name:'Violeta'},
    {hex:'#ec4899',name:'Rosa'},{hex:'#ef4444',name:'Vermelho'},{hex:'#f97316',name:'Laranja'},
    {hex:'#f59e0b',name:'Âmbar'},{hex:'#22c55e',name:'Verde'},{hex:'#06b6d4',name:'Ciano'},
    {hex:'#3b82f6',name:'Azul'},{hex:'#64748b',name:'Slate'},{hex:'#1e293b',name:'Escuro'},
  ];

  /** Paleta de cores de etiquetas — alinhada com variáveis CSS --label-* */
  const LABEL_PRESET_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#64748b'];

  let _modalCardId=null, _modalColId=null, _modalTempLabels=[], _modalTempColor='#ffffff';

  /** Normaliza label para {text, color}. Retrocompatível com labels string antigas. */
  function normalizeLabel(label) {
    if (typeof label==='string') return {text:label, color:'#6366f1'};
    return {text:label.text||'', color:label.color||'#6366f1'};
  }

  const Card = {
    create(colId, title) {
      const t=title.trim(); if(!t) return;
      const data=KanbanApp.getData(), col=data.columns[colId]; if(!col) return;
      const nc={id:KanbanApp.generateId('k'),title:t,description:'',color:'#ffffff',labels:[]};
      data.cards[nc.id]=nc; col.cards.push(nc.id); KanbanApp.saveData(data); KanbanApp.renderPage();
    },
    delete(colId, cardId) {
      const data=KanbanApp.getData(), col=data.columns[colId]; if(!col) return;
      col.cards=col.cards.filter(id=>id!==cardId); delete data.cards[cardId]; KanbanApp.saveData(data);
    },
    update(cardId, changes) {
      const data=KanbanApp.getData(); if(!data.cards[cardId]) return;
      Object.assign(data.cards[cardId],changes); KanbanApp.saveData(data);
    },
    render(cardId) {
      const data=KanbanApp.getData(), card=data.cards[cardId]; if(!card) return null;
      const cardEl=document.createElement('div');
      cardEl.className='card'; cardEl.dataset.cardId=cardId;
      cardEl.setAttribute('draggable','true'); cardEl.setAttribute('role','listitem');
      cardEl.setAttribute('tabindex','0'); cardEl.setAttribute('aria-label','Card: '+card.title);
      const colorBar = card.color&&card.color!=='#ffffff' ? '<div class="card-color-bar" style="background-color:'+card.color+';" aria-hidden="true"></div>' : '';
      const labels = (card.labels||[]).map(normalizeLabel);
      const labelsHtml = labels.length ? '<div class="card-labels">'+labels.map(l=>{
        const fg=KanbanApp.getContrastColor(l.color);
        return '<span class="card-label" style="background-color:'+l.color+';color:'+fg+';">'+KanbanApp.Board._escapeHtml(l.text)+'</span>';
      }).join('')+'</div>' : '';
      const descHtml = card.description ? '<p class="card-description">'+KanbanApp.Board._escapeHtml(card.description)+'</p>' : '';
      cardEl.innerHTML = colorBar+'<div class="card-content"><div class="card-title">'+KanbanApp.Board._escapeHtml(card.title)+'</div>'+descHtml+labelsHtml+'</div><button class="card-edit-btn" data-card-id="'+cardId+'" title="Editar card" aria-label="Editar card"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9 2l2 2-6 6-2.5.5.5-2.5 6-6z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      Card._bindCardEvents(cardEl, cardId);
      return cardEl;
    },
    _bindCardEvents(cardEl, cardId) {
      const open = () => { const col=cardEl.closest('.column-cards'); Card.openModal(cardId,col?col.dataset.colId:null); };
      const eb=cardEl.querySelector('.card-edit-btn');
      if(eb) eb.addEventListener('click',e=>{e.stopPropagation();open();});
      cardEl.addEventListener('click',e=>{if(!e.target.closest('.card-edit-btn'))open();});
      cardEl.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    },
    openModal(cardId, colId) {
      const data=KanbanApp.getData(), card=data.cards[cardId]; if(!card) return;
      _modalCardId=cardId; _modalColId=colId;
      _modalTempColor=card.color||'#ffffff';
      _modalTempLabels=(card.labels||[]).map(normalizeLabel);
      document.getElementById('modal-input-title').value=card.title;
      document.getElementById('modal-input-desc').value=card.description||'';
      Card._updateModalColorStrip(_modalTempColor);
      Card._renderColorSwatches(_modalTempColor);
      Card._renderLabelColorPresets();
      Card._renderModalLabels();
      const overlay=document.getElementById('modal-overlay');
      overlay.removeAttribute('hidden'); document.body.style.overflow='hidden';
      setTimeout(()=>document.getElementById('modal-input-title').focus(),50);
    },
    closeModal() {
      if(!_modalCardId) return;
      const title=document.getElementById('modal-input-title').value.trim();
      const desc=document.getElementById('modal-input-desc').value.trim();
      if(title) Card.update(_modalCardId,{title,description:desc,color:_modalTempColor,labels:[..._modalTempLabels]});
      document.getElementById('modal-overlay').setAttribute('hidden',''); document.body.style.overflow='';
      const ex=document.querySelector('.card[data-card-id="'+_modalCardId+'"]');
      if(ex){const nc=Card.render(_modalCardId);if(nc)ex.replaceWith(nc);}
      _modalCardId=null; _modalColId=null;
    },
    _renderColorSwatches(selected) {
      const row=document.getElementById('color-picker-row'); row.innerHTML='';
      CARD_COLORS.forEach(({hex,name})=>{
        const sw=document.createElement('button'); sw.type='button';
        sw.className='color-swatch'+(hex===selected?' selected':'');
        sw.style.backgroundColor=hex; if(hex==='#ffffff') sw.style.border='2px solid #e2e8f0';
        sw.title=name; sw.setAttribute('aria-label','Cor: '+name);
        sw.addEventListener('click',()=>{ _modalTempColor=hex; Card._updateModalColorStrip(hex); row.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected')); sw.classList.add('selected'); });
        row.appendChild(sw);
      });
    },
    _updateModalColorStrip(color) {
      const s=document.getElementById('modal-color-strip'); if(s) s.style.backgroundColor=color==='#ffffff'?'transparent':color;
    },
    /** Renderiza paleta de presets de cores de etiquetas (integrada com CSS --label-*) */
    _renderLabelColorPresets() {
      const container=document.getElementById('label-color-presets'); if(!container) return;
      container.innerHTML='';
      const ci=document.getElementById('modal-input-label-color');
      const current=ci?ci.value:LABEL_PRESET_COLORS[0];
      LABEL_PRESET_COLORS.forEach((color,idx)=>{
        const btn=document.createElement('button'); btn.type='button';
        btn.className='label-color-preset'+(color===current||(!current&&idx===0)?' selected':'');
        btn.style.backgroundColor=color; btn.title=color; btn.setAttribute('aria-label','Cor de etiqueta '+color);
        btn.addEventListener('click',()=>{
          if(ci) ci.value=color;
          container.querySelectorAll('.label-color-preset').forEach(b=>b.classList.remove('selected'));
          btn.classList.add('selected');
        });
        container.appendChild(btn);
      });
    },
    _renderModalLabels() {
      const list=document.getElementById('modal-labels-list'); list.innerHTML='';
      if(!_modalTempLabels.length){list.innerHTML='<span style="font-size:.8rem;color:var(--text-muted)">Nenhuma etiqueta adicionada.</span>';return;}
      _modalTempLabels.forEach((label,idx)=>{
        const bg=label.color, fg=KanbanApp.getContrastColor(bg);
        const tag=document.createElement('span'); tag.className='label-tag';
        tag.style.backgroundColor=bg; tag.style.color=fg; tag.setAttribute('role','listitem');
        tag.innerHTML=KanbanApp.Board._escapeHtml(label.text)+'<button class="label-remove-btn" title="Remover" aria-label="Remover etiqueta">✕</button>';
        tag.querySelector('.label-remove-btn').addEventListener('click',()=>{_modalTempLabels.splice(idx,1);Card._renderModalLabels();});
        list.appendChild(tag);
      });
    }
  };

  Card._initModalEvents = function () {
    document.getElementById('modal-close-btn').addEventListener('click',()=>Card.closeModal());
    document.getElementById('modal-overlay').addEventListener('click',e=>{if(e.target===document.getElementById('modal-overlay'))Card.closeModal();});
    document.getElementById('modal-save-btn').addEventListener('click',()=>Card.closeModal());
    // Excluir card via modal de confirmação customizado
    document.getElementById('modal-delete-btn').addEventListener('click',()=>{
      if(!_modalCardId||!_modalColId) return;
      const data=KanbanApp.getData(), card=data.cards[_modalCardId]; if(!card) return;
      const cardId=_modalCardId, colId=_modalColId;
      KanbanApp.showConfirmModal({
        title:'Excluir Card', message:'Excluir o card "'+card.title+'" permanentemente?', isDanger:true,
        onConfirm:()=>{
          document.getElementById('modal-overlay').setAttribute('hidden',''); document.body.style.overflow='';
          _modalCardId=null; _modalColId=null;
          Card.delete(colId,cardId);
          const ce=document.querySelector('.card[data-card-id="'+cardId+'"]');
          if(ce){
            const ca=document.getElementById('col-cards-'+colId);
            ce.remove();
            if(ca){const badge=ca.closest('.column')?.querySelector('.column-count-badge');if(badge)badge.textContent=ca.querySelectorAll('.card').length;}
          }
          KanbanApp.showToast('Card excluído.');
        }
      });
    });
    // Adicionar etiqueta com cor selecionada
    document.getElementById('btn-add-label').addEventListener('click',()=>{
      const input=document.getElementById('modal-input-label');
      const ci=document.getElementById('modal-input-label-color');
      const val=input.value.trim(), color=ci?ci.value:'#6366f1';
      if(val&&!_modalTempLabels.some(l=>l.text===val)){
        _modalTempLabels.push({text:val,color}); Card._renderModalLabels(); input.value=''; input.focus();
      }
    });
    document.getElementById('modal-input-label').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('btn-add-label').click();}});
    // Sincroniza preset ao mudar input[type=color] manualmente
    const ci=document.getElementById('modal-input-label-color');
    if(ci) ci.addEventListener('input',()=>{ document.querySelectorAll('#label-color-presets .label-color-preset').forEach(b=>b.classList.toggle('selected',b.style.backgroundColor===ci.value)); });
  };

  window.KanbanApp.Card = Card;
})();
