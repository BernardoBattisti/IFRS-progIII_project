# Design system — Sistema de Votações IFRS

Direção: **sistema institucional público** (como o sistema acadêmico de um instituto federal ou um portal
de órgão público). Faixa sólida de cabeçalho, barra de navegação, trilha nas páginas internas, listagens em
tabelas com bordas, formulários em caixas cinza, botões retangulares. Sem gradientes, sem sombras difusas,
sem pílulas, sem ícones decorativos, sem emojis, sem ilustrações. Alinhado à esquerda e denso.

Implementação: **CSS puro**. `src/app/globals.css` guarda só reset, tokens (`:root`), elementos base
(`body`, títulos, `a`, `table`, campos nativos, foco) e o utilitário de acessibilidade `.sr-only`.
Cada componente/página tem seu `*.module.css` ao lado. Nenhum framework de CSS ou de componentes.
Tema claro apenas. Não usamos o logotipo do IFRS.

## Cores (tokens em `:root`)

Contrastes medidos com a fórmula de luminância relativa da WCAG 2.1 (script em Node).

| Token | Valor | Uso | Contraste medido |
|---|---|---|---|
| `--verde-900` | `#143A20` | Barra de navegação | branco 12,68:1 · `#D9E6DC` 9,85:1 |
| `--verde-800` | `#1D4F2C` | Faixa do cabeçalho | branco 9,52:1 · `#D9E6DC` 7,39:1 |
| `--verde-700` | `#174F27` | Hover do primário e de links | branco 9,61:1 |
| `--verde-600` | `#1F6A34` | Botão primário, links, barras de resultado, borda de seleção | branco 6,63:1 · sobre `--cinza-100` 5,96:1 · sobre `--cinza-200` 5,32:1 · sobre `--verde-100` 5,74:1 |
| `--verde-100` | `#E8F1EA` | Fundo de seleção, aviso de sucesso, rótulo “Aberta” | `--verde-700` sobre ele 8,33:1 |
| `--cinza-900` | `#1B1D1B` | Texto principal | branco 16,96:1 · `--cinza-200` 13,61:1 |
| `--cinza-700` | `#4A4F4A` | Texto secundário, ajuda | branco 8,37:1 · `--cinza-100` 7,53:1 · `--cinza-200` 6,72:1 |
| `--cinza-600` | `#6B716B` | Borda de campos, botões secundários, caixas de marcação | branco 5,00:1 · `--cinza-100` 4,50:1 (≥ 3:1, 1.4.11) |
| `--cinza-400` | `#B9BFB9` | Bordas de tabela e divisórias (estrutura, não componente) | decorativo |
| `--cinza-200` | `#E4E7E4` | Cabeçalho de tabela, faixa de título de caixa, trilho das barras | — |
| `--cinza-100` | `#F2F3F2` | Fundo das caixas de formulário e da página | — |
| `--branco` | `#FFFFFF` | Fundo do conteúdo e das tabelas | — |
| `--vermelho-700` | `#A3201A` | **Só** erro e ação destrutiva | branco 7,56:1 · sobre `--vermelho-100` 6,59:1 |
| `--vermelho-800` | `#8A1B16` | Hover destrutivo | branco 9,34:1 |
| `--vermelho-100` | `#FBECEB` | Fundo de aviso de erro | — |
| `--amarelo-800` / `--amarelo-100` | `#6B4500` / `#FFF5D6` | Aviso (ex.: votação identificada) | 7,79:1 · texto principal sobre o fundo 15,57:1 |
| `--amarelo-700` | `#8A5A00` | Borda do aviso | branco 5,93:1 |
| `--azul-800` / `--azul-100` | `#1D4A73` / `#E9F0F7` | Informação, rótulo “Agendada” | 8,02:1 · branco 9,21:1 |
| `--foco` | `#B35400` | Anel de foco em fundos claros | branco 5,02:1 · `--cinza-100` 4,51:1 |
| `--foco-escuro` | `#FFD84D` | Anel de foco na faixa/barra verde | `--verde-800` 6,88:1 · `--verde-900` 9,17:1 |

O foco é **âmbar** de propósito: não se confunde com o verde (marca/seleção) nem com o vermelho (erro).
Erros e ações destrutivas sempre têm texto (“Excluir…”, “✕ mensagem”), nunca só cor.

## Tipografia

- **Títulos** (`h1`–`h3`, nome do sistema na faixa, títulos de caixa): *Source Serif 4* (600/700), auto-hospedada
  por `next/font/google` (baixada no build; o navegador não acessa o Google). Pilha:
  `var(--fonte-serifa-carregada), Georgia, "Times New Roman", serif`.
- **Corpo, tabelas, formulários, botões**: pilha do sistema `Arial, "Segoe UI", Helvetica, "Liberation Sans", sans-serif`.
- Escala (rem): `--texto-pp` 0,8125 (rótulos de estado) · `--texto-p` 0,875 (ajuda, tabelas densas, trilha) ·
  `--texto-m` 1 (corpo e campos — 16px evita zoom no iOS) · `h3` 1,0625 · `h2` 1,25 · `h1` 1,625 (1,375 no celular).
- Pesos 400/700. `font-variant-numeric: tabular-nums` em números de votos e datas.

## Espaçamento, bordas, sombras

- Escala de 4px: `--esp-1` 4 · `--esp-2` 8 · `--esp-3` 12 · `--esp-4` 16 · `--esp-5` 24 · `--esp-6` 32.
- Largura máxima do conteúdo `--largura` 64rem (1024px), gutter 16px, alinhado à esquerda.
- `--raio` **2px** em botões, campos, caixas e rótulos (o limite combinado é ≤ 3px). Nada de `border-radius: 999px`.
- Bordas 1px; seleção/erro 2px. **Sem sombras**, exceto o diálogo (uma sombra curta e firme, `0 2px 0`, para separá-lo do fundo escurecido).

## Componentes

### Cabeçalho (`AppShell`, `TelaPublica`, `TelaSimples`)
Faixa `--verde-800` com o nome **“Sistema de Votações”** em serifa branca e “Instituto Federal do Rio Grande do Sul” em
texto menor; à direita, “Usuário: nome (perfil)”, link “Minha conta” e botão “Sair” (texto claro, foco amarelo).
Abaixo, barra de navegação `--verde-900` com os itens da área; item ativo com fundo branco e texto verde
(`aria-current="page"`). No celular, nome e usuário empilham, itens da barra quebram linha (sem rolagem).
Rodapé cinza simples com o nome do sistema.

### Trilha (`ui/Trilha`)
`<nav aria-label="Trilha de navegação"><ol>` com separador “»” (`aria-hidden`); o último item é texto com
`aria-current="page"`. Usada nas páginas internas (detalhe de votação, nova/editar votação, detalhe de turma).

### Título da página (`ui/PageHeader`)
`h1` serifado com linha inferior de 2px `--verde-600`; descrição em `--cinza-700`; ações à direita (desktop) ou abaixo.

### Caixa / Seção (`ui/Card`, `ui/Secao`)
Borda 1px `--cinza-400`, fundo branco; `Secao` tem o título (`h2`) numa faixa `--cinza-200` com borda inferior.
Variante `form`: fundo `--cinza-100` (caixas de formulário). Variante `perigo`: faixa do título com borda vermelha.

### Tabela (`ui/Tabela`)
`<table>` com bordas 1px em todas as células, cabeçalho `--cinza-200` em negrito, linhas zebradas leves, `caption` opcional.
Abaixo de 640px, cada linha vira um bloco empilhado: o cabeçalho fica só para leitores de tela e cada célula mostra
seu rótulo (`data-rotulo`) antes do valor. Sem rolagem horizontal.

### Formulário (`ui/Field`)
Rótulo em negrito acima do campo, “(obrigatório)” em texto, ajuda abaixo (`aria-describedby`), erro em vermelho
com “✕” e `aria-invalid`. Campos com borda `--cinza-600`, fundo branco, altura mínima 44px. Grupos de rádio/caixa
de marcação em linhas com borda; selecionado = borda 2px `--verde-600` + fundo `--verde-100`.

### Botão (`ui/Button`)
Retangular, borda 1px, raio 2px, negrito, altura mínima 44px (36px para `sm` só a partir de 640px).
`primary` verde cheio · `secondary` branco com borda cinza e texto verde · `ghost` sem borda, texto verde sublinhado no hover ·
`danger` vermelho cheio · `danger-secondary` branco com borda e texto vermelho (remover/excluir em linhas de tabela).
Desabilitado: opacidade 55% e `cursor: not-allowed`. Carregando: indicador giratório + `aria-busy`.

### Rótulo de estado (`ui/Badge`)
Retângulo pequeno (borda 1px, raio 2px, 13px, negrito), sempre com texto:

| Estado | Texto | Estilo |
|---|---|---|
| `RASCUNHO` | Rascunho | borda tracejada `--cinza-600`, texto `--cinza-700`, fundo branco |
| `AGENDADA` | Agendada | borda/texto `--azul-800`, fundo `--azul-100` |
| `ABERTA` | Aberta | borda `--verde-600`, texto `--verde-700`, fundo `--verde-100` |
| `ENCERRADA` | Encerrada | fundo `--cinza-200`, borda `--cinza-600`, texto `--cinza-900` |
| Conta | Ativo · Aguardando aprovação · Rejeitado | verde · amarelo · vermelho, mesmo formato |

### Aviso (`ui/Alert`)
Caixa com borda 1px e **barra esquerda de 5px** na cor do tom (info azul, sucesso verde, aviso âmbar, erro vermelho),
fundo claro do tom, título em negrito. Sem ícones. `anunciar` usa `role="alert"` (erro) ou `role="status"`.

### Diálogo (`ui/Dialog`)
`<dialog>` nativo (`showModal`: foco preso, Esc fecha, foco volta ao gatilho). Título em faixa `--verde-800` com texto
branco serifado, corpo branco, rodapé cinza com os botões (confirmar à direita no desktop, em cima no celular).

### Lista vazia (`ui/EmptyState`)
Caixa cinza com borda tracejada, alinhada à esquerda: título em negrito, explicação e ação.

## Estados

| Estado | Tratamento |
|---|---|
| Foco | `outline` 3px `--foco` (âmbar) com 2px de afastamento; `--foco-escuro` (amarelo) na faixa/barra verde |
| Hover | Primário → `--verde-700`; secundário → fundo `--verde-100`; links → sublinhado mais grosso |
| Desabilitado | Opacidade 55% + `cursor: not-allowed` |
| Carregando | Indicador giratório + texto com `role="status"` |
| Erro de campo | Borda 2px `--vermelho-700`, mensagem ligada por `aria-describedby`, `aria-invalid` |
| Selecionado | Borda 2px `--verde-600` + fundo `--verde-100` + controle nativo marcado |

## Padrões

- **Listagens**: tabelas (votações, turmas, alunos, usuários, domínios, opções, resultados). Ação por linha em botão
  pequeno com o nome do item em `.sr-only` (“Abrir<span>Tema da feira</span>”).
- **Resultados**: tabela Opção · Votos · Percentual · barra simples (`aria-hidden`); número e percentual sempre em texto.
- **Cédula do aluno**: opções em linhas com caixa de marcação (ou contador − / +), imagem quando houver, barra de
  envio fixa no rodapé no celular e diálogo de confirmação antes de enviar.
- **Ações irreversíveis**: diálogo com título em forma de pergunta e botões rotulados com a ação.
- **Telas públicas**: faixa do cabeçalho, título à esquerda, formulário numa caixa cinza de até 30rem.
- **Texto**: português do Brasil, imperativo nos botões, glossário fixo — votação, opção, voto, turma, código da turma,
  matrícula, docente, aluno, rascunho, publicar/despublicar, encerrar, prorrogar.
