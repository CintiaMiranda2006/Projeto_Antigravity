# PRD — KanbanCintia
**Versão 2.0** | Atualizado em: 2026-03-23

---

## Seção 1 — Visão Geral (Original)

Sistema Kanban web single-page (SPA) com HTML, CSS e JavaScript Vanilla.  
Funcionalidades: gerenciamento de quadros, colunas e cards com drag & drop e persistência via localStorage.

**Stack:** HTML5 · CSS3 (Custom Properties) · JavaScript ES5+ (sem frameworks)  
**Compatibilidade:** Chrome, Edge, Safari, Firefox (file:// protocol)

---

## Seção 2 — Regras de Negócio (Original)

1. Dados persistidos em `localStorage` com chave `kanban_data`
2. Estrutura relacional: `{boards[], columns{}, cards{}}`
3. Navegação por hash routing: `#board-{id}`
4. Namespace global `window.KanbanApp` (compatível com `file://`)
5. IDs gerados com `{prefix}-{timestamp}-{random}`

---

## Seção 3 — Arquitetura Técnica (Original)

```
Projeto_Antigravity/
├── index.html          # Estrutura HTML + modais
├── css/style.css       # CSS Skill — Design Token System
└── js/
    ├── app.js          # Init + DragEngine + Modais + Utilitários
    ├── board.js        # CRUD boards + home/board view
    ├── column.js       # CRUD colunas
    └── card.js         # CRUD cards + modal de edição + cores de labels
```

**Motor D&D:** HTML5 Drag & Drop API nativa, `.drop-indicator` dinâmico.  
**Modais customizados:** `#input-modal-overlay` e `#confirm-modal-overlay` (HTML nativo).

---

## Seção 4 — Funcionalidades (Original + Atualizações v2.0)

| Funcionalidade | Status | Versão |
|---|---|---|
| CRUD Boards | ✅ | v1.0 |
| CRUD Colunas | ✅ | v1.0 |
| CRUD Cards | ✅ | v1.0 |
| Drag & Drop (cards + colunas) | ✅ | v1.0 |
| Persistência localStorage | ✅ | v1.0 |
| Empty State (home) | ✅ | v1.0 |
| Toast notifications | ✅ | v1.0 |
| Cores de card (modal) | ✅ | v1.0 |
| **Rebranding KanbanCintia** | ✅ | **v2.0** |
| **CSS Skill (Design Tokens)** | ✅ | **v2.0** |
| **Modais customizados (input + confirm)** | ✅ | **v2.0** |
| **Cores de etiquetas (Labels)** | ✅ | **v2.0** |
| **Acessibilidade de contraste (getContrastColor)** | ✅ | **v2.0** |

---

## ATUALIZAÇÕES v2.0 — 2026-03-23

### 1. Rebranding Completo → KanbanCintia

- `<title>` atualizado: "KanbanCintia — Seu Gerenciador de Projetos"
- Logo (`.logo-text`) alterado de "KanbanFlow" para "KanbanCintia"
- Meta description atualizado
- Empty state e comentários JS atualizados

### 2. CSS Skill — Sistema de Design Tokens

Toda a estilização do projeto passa a ser controlada por **Custom Properties CSS** no `:root`:

| Categoria | Variáveis |
|---|---|
| Brand | `--brand-primary/hover/light/secondary/gradient` |
| Semânticas | `--color-danger/success/warning/info` |
| Fundos | `--bg-app/header/board/column/card/modal-overlay` |
| Texto | `--text-primary/secondary/muted/on-dark` |
| Bordas | `--border-color/focus/hover`, `--border-width` |
| Raios | `--radius-xs/sm/md/lg/full` |
| Espaçamentos | `--sp-1` a `--sp-10` |
| Tipografia | `--font-size-*`, `--font-weight-*`, `--line-height-*` |
| Sombras | `--shadow-xs/sm/card/card-hover/modal/focus/btn-primary` |
| Transições | `--transition-fast/transition/transition-slow` |
| Layout | `--header-height`, `--column-width/gap`, `--max-content-width` |
| Z-Index | `--z-header/modal/toast` |
| **Label Colors** | `--label-indigo/violet/rose/red/orange/amber/green/cyan/blue/slate` |

> **Para mudar o tema:** edite apenas o bloco `:root` em `style.css`.

### 3. Sistema de Cores de Etiquetas

**Formato retrocompatível:**
```js
// Novo: {text, color}
{ text: "Bug", color: "#ef4444" }
// Antigo (string) → convertido automaticamente para {text, color: '#6366f1'}
```

- `#label-color-presets`: 10 swatches alinhados com `--label-*` CSS
- `input[type=color]` para cor personalizada livre
- `KanbanApp.getContrastColor(hex)`: garante contraste WCAG

### 4. Modais Customizados (sem window.prompt/confirm)

#### `KanbanApp.showInputModal(options)` 
Usado em: Novo Quadro, Renomear, Nova Coluna, Novo Card.
- Fecha: botão Cancelar · botão X · overlay · Escape

#### `KanbanApp.showConfirmModal(options)`
Usado em: Excluir Quadro, Excluir Coluna, Excluir Card.
- Botão `.btn-danger` quando `isDanger: true`
- Fecha: botão Cancelar · overlay · Escape

**Novas classes CSS:** `.modal-box--sm`, `.modal-footer--end`, `.btn-danger`

### 5. Melhorias de UI/UX

- `btn-add-card` e `add-column-btn`: hover interativos com \u00edcones animados
- `btn-primary`: `translateY(-1px)` + sombra no hover
- Cards: `translateY(-1px)` no hover
- Toast: borda esquerda da cor primária
- Board cards: gradiente via `--brand-gradient`

---

## Seção 5 — Plano de Verificação

**Cenários adicionados na v2.0:**

| # | Cenário | Critério |
|---|---|---|
| 17 | Criar quadro via modal | Modal valida campo, quadro criado ao confirmar |
| 18 | Cancelar via Esc / overlay / botão | Modal fecha, nada criado |
| 19 | Excluir coluna via modal confirm | Coluna + cards removidos, toast exibido |
| 20 | Label com cor personalizada | Label renderizada com cor e contraste corretos |
| 21 | Dados antigos (labels como string) | Renderiza como label azul padrão |
| 22 | Mudar tema via `:root` | Toda UI atualiza sem tocar em JS ou HTML |
