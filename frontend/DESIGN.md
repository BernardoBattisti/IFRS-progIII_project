# Design system — Votações IFRS

Tokens definidos em `src/app/globals.css` (`@theme` do Tailwind v4) e usados como classes
(`bg-brand-600`, `text-ink-muted`, `border-line-strong`…). Tema claro apenas.
Não usamos o logotipo do IFRS — só a paleta institucional.

## Cores

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `brand-500` | `#2F9E41` | Verde da marca. Só decoração e áreas grandes (faixa do topo) | 3,45:1 com branco — **não** usar para texto |
| `brand-600` | `#237A32` | Botão primário, links, barras de resultado, bordas de seleção | 5,38:1 com branco; 4,34:1 sobre o trilho `track` |
| `brand-700` | `#1E6B2B` | Hover, texto de link, contorno de foco | 6,58:1 |
| `brand-800` | `#1B5E27` | Pressionado; texto de badge “Aberta” | 7,84:1 |
| `brand-50` / `brand-100` / `brand-200` | `#EAF6EC` / `#D3EDD7` / `#A9DBB1` | Fundos de seleção e de sucesso | — |
| `accent-red` | `#CD191E` | Vermelho da marca: **só** o detalhe da faixa do cabeçalho | Nunca para erro/destrutivo |
| `ink` | `#1D2939` | Texto principal | 14,7:1 |
| `ink-muted` | `#475467` | Texto secundário | 7,69:1 (7,21:1 sobre `canvas`) |
| `ink-subtle` | `#667085` | Placeholder | 4,97:1 |
| `line` | `#D0D5DD` | Divisórias e contornos decorativos | — |
| `line-strong` | `#7A8599` | Borda de campos e botões secundários | 3,72:1 (1.4.11) |
| `canvas` / `surface` | `#F6F8F7` / `#FFFFFF` | Fundo da página / cartões | — |
| `track` | `#E4E7EC` | Trilho das barras de resultado | — |
| `danger-600` (+50/200/700) | `#B42318` | Erros e ações destrutivas | 6,57:1 com branco; 6,05:1 sobre `danger-50` |
| `warning-700` (+50/200) | `#93370D` | Avisos (ex.: votação identificada) | 7,21:1 sobre `warning-50` |
| `info-700` (+50/200) | `#175CD3` | Informações (ex.: votação anônima, agendada) | 5,57:1 sobre `info-50` |

Erro × marca: o vermelho institucional fica restrito à faixa decorativa; erros e ações destrutivas usam
`danger-600` (tom diferente) **sempre** acompanhado de ícone/“✕” e texto, nunca só cor.

## Tipografia

Pilha de fontes do sistema (`ui-sans-serif, system-ui, …`) — sem download de fontes.
Escala Tailwind: `text-sm` (14px) auxiliar · `text-base` (16px) corpo e campos (evita zoom no iOS) ·
`text-lg`/`text-xl` títulos de seção · `text-2xl`→`sm:text-3xl` título da página. Pesos 400/600/700.
Números de votos com `tabular-nums`.

## Espaçamento, raios, sombras

- Escala de 4px do Tailwind. Gutter da página 16px (`px-4`), largura máxima `max-w-5xl`.
- `--radius-control` 8px (campos/botões) · `--radius-card` 12px (cartões, diálogos).
- `--shadow-card` (elevação 1) · `--shadow-overlay` (diálogos e skip link).

## Estados

| Estado | Tratamento |
|---|---|
| Foco | `outline` 3px `brand-700` com 2px de afastamento, em todo elemento focável (`:focus-visible`) |
| Hover | Primário → `brand-700`; secundário/ghost → fundo `brand-50` |
| Desabilitado | Opacidade 60% + `cursor-not-allowed` |
| Carregando | Spinner no botão + `aria-busy`; listas mostram “Carregando…” com `role="status"` |
| Erro de campo | Borda 2px `danger-600`, mensagem abaixo ligada por `aria-describedby`, `aria-invalid` |
| Selecionado (opção de voto/escolha) | Borda 2px `brand-600` + fundo `brand-50` + controle nativo marcado |

Alvos de toque: botões com altura mínima de 44px no celular (o tamanho `sm` cai para 36px só a partir de 640px).

## Componentes (`src/components/ui`)

`Button`/`LinkBotao` (primary, secondary, ghost, danger; md/sm) · `InputField`/`TextareaField`/`SelectField`
(rótulo, ajuda, erro, “(obrigatório)”) · `Alert` (info, sucesso, aviso, erro — ícone + título) ·
`Badge`, `EstadoBadge`, `StatusBadge` · `Card` · `EmptyState` (o que é + por que está vazio + como começar) ·
`Dialog`/`ConfirmDialog` (`<dialog>` nativo: foco preso, Esc fecha, foco volta ao gatilho) · `Spinner`/`Carregando` ·
`PageHeader`.

### Badges de estado da votação

| Estado | Rótulo | Estilo |
|---|---|---|
| `RASCUNHO` | Rascunho | neutro (cinza `#344054` sobre `#F2F4F7`) |
| `AGENDADA` | Agendada | info |
| `ABERTA` | Aberta | verde, com ponto |
| `ENCERRADA` | Encerrada | escuro (`ink` com texto branco) |

Status de conta: Ativo (verde), Aguardando aprovação (aviso), Rejeitado (erro), Cadastro incompleto (neutro).

## Padrões

- **Resultados**: barras horizontais HTML/CSS; rótulo, percentual e contagem sempre em texto; barra `aria-hidden`.
- **Ações irreversíveis** (enviar voto, encerrar, excluir, rejeitar, gerar novo código): diálogo com título em
  forma de pergunta específica, consequência descrita e botões rotulados com a ação (“Encerrar votação” / “Manter aberta”).
- **Texto**: português do Brasil, verbos no imperativo nos botões, glossário fixo — votação, opção, voto, turma,
  código da turma, matrícula, docente, aluno, rascunho, publicar/despublicar, encerrar, prorrogar.
