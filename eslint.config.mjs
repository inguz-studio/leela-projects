// @ts-check
import { readFileSync } from "node:fs";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import leelaTokens from "./packages/design-system/lint/leela-tokens-plugin.mjs";
import leelaScroll from "./packages/design-system/lint/leela-scroll-plugin.mjs";
import leelaAuth from "./packages/design-system/lint/leela-auth-plugin.mjs";
import leelaCanon, {
  canoneDoBarrel,
  SINONIMOS_PADRAO,
} from "./packages/design-system/lint/leela-canon-plugin.mjs";

// O cânone da regra 2 NÃO é uma lista escrita à mão. Lista copiada envelhece na
// primeira semana e passa a mentir — e o cânone do lint separado do cânone do DS
// é o defeito que a L-021 descreve, um nível acima. Aqui ele é DERIVADO do
// barrel a cada execução, então não tem como divergir.
const CANONE_DO_DS = canoneDoBarrel(
  readFileSync(
    new URL("./packages/design-system/src/index.ts", import.meta.url),
    "utf8",
  ),
);

// ---------------------------------------------------------------------------
// Dívida herdada da medição de 2026-08-11 — a única razão pela qual este gate
// não nasce `error`.
//
// A spec §9 manda o gate nascer sem barrar ninguém: ligar a regra dura antes das
// ondas converterem quebraria `pnpm lint --max-warnings 0` no primeiro dia, e um
// gate que nasce vermelho é desligado no mesmo dia. Só que `warn` não resolve
// nada NESTE repo — `--max-warnings 0` é o contrato do CI, e warning barra igual
// a erro. O `senha-fora-do-ds` mostrou o único caminho que funciona aqui: nasceu
// `error` DEPOIS que as dezessete instâncias foram pagas, com contagem zero.
//
// As instâncias daqui pertencem a ONDAS que ainda não rodaram, então a lista
// abaixo nomeia cada arquivo com a onda que o paga. Ela só encolhe. O que a
// impede de virar um `off` mudo — que é como gate morre — é a camada A do
// `scripts/gate-canon.mjs`: entrada MORTA reprova. Arquivo já convertido que
// continua na lista é mentira sobre cobertura, exatamente o defeito que este
// gate existe para impedir. E o número real (medido SEM estas listas) vive no
// baseline versionado, público, com catraca que só desce.
// ---------------------------------------------------------------------------

/**
 * Dívida da Regra 1 — controle nativo com canônico publicado.
 *
 * A entrada do `ShareBlock.tsx` da landing saiu na Onda 1 (11/08): o
 * `<input readOnly>` de link copiável virou `Input`, a camada A do
 * `gate-canon` acusou a entrada MORTA no mesmo dia, e a linha caiu junto com
 * a conversão. É esse o ciclo que a lista promete — ela só encolhe, e nunca
 * sobrevive ao item que silenciava.
 */
/**
 * Onda C1 (2026-08-12) pagou a única entrada — `<select>` cru + dois `<option>`
 * do `ProvisionTenantModal` viraram `Select` do DS. Lista vazia por desenho: a
 * camada A do `gate-canon` reprova entrada MORTA, então ela não sobrevive à
 * conversão que a apaga.
 */
const DIVIDA_CONTROLE_CRU = [];

/**
 * Dívida da Regra 2 — re-implementação batizada. As duas entradas restantes
 * são ACHADO DO GATE, não da varredura: a medição de 2026-08-11 contou
 * superfície reconstruída em `<div>`/`<article>` e não procurou DECLARAÇÃO
 * com nome de canônico. São o segundo mecanismo da L-021, e o mais caro —
 * a duplicata batizada é a que a próxima pessoa importa achando que importou
 * o cânone.
 *
 * `SecaoHead.tsx` SAIU desta lista em 28/08 (lane REUSO-E-SHOWROOM): o
 * arquivo foi deletado e os 7 consumidores em `EngajamentoView.tsx` passaram
 * a importar `SectionHeader` do DS diretamente.
 */
const DIVIDA_PADRAO_REIMPLEMENTADO = [
  // Onda 4 · `Painel` = `Card` (cartão vidro do HIFI-REC reescrito à mão)
  "apps/painel/src/routes/clubes/engajamento/EngajamentoView.tsx",
  // Onda 2 · `Vazio` = `EmptyState` — o mesmo item que a onda já lista como
  // "estado vazio artesanal" em `kits/DistribuicaoView.tsx:112`.
  "apps/painel/src/routes/eventos/kits/DistribuicaoView.tsx",
  // Onda C5 · `FiltroStatus` (HubEventos.tsx) SAIU desta lista, verdicto
  // registrado na própria lane, não achado morto por engano. A hipótese da C0
  // — "byte a byte a anatomia da FilterChips" — não resistiu à leitura de
  // perto: `FilterChips` só produz o `<div role="group">` no ramo de FILEIRA
  // (<4 opções); o ramo de dropdown (4+) devolve `<FilterMenu>` puro, sem
  // grupo. A faceta de HubEventos tem 3 categorias REAIS — abaixo do limiar —,
  // e só cruza o "4" porque o dono decidiu (2026-07-11, testado e travado em
  // `HubEventos.test.tsx`) contar "Todos" como um quarto estado. Rotear pela
  // `FilterChips` de verdade inverteria essa decisão em silêncio (fileira no
  // lugar de dropdown). O conserto real — tirar o `<div role="group">`
  // redundante, que o `FilterMenu` já não precisa — saiu da HubEventos.tsx
  // sem trocar o nome por um sinônimo da peça; o comentário no arquivo
  // registra o porquê e a condição de reabertura.
];

/**
 * Dívida da Regra 3 — seleção fazendo trabalho de filtro. Dois arquivos, cada
 * um com a onda que o paga.
 *
 * A regra nasce `error`, como o `senha-fora-do-ds` fez, e não `warn`: a Parte B
 * de 11/08 já provou que `warn` não é instrumento de rollout neste repo, porque
 * os três `lint` rodam com `--max-warnings 0`.
 *
 * O terceiro caso da regra — o motor de combobox artesanal — entra com contagem
 * ZERO: a varredura de 2026-08-12 §6 procurou `role="combobox"`, `role="listbox"`,
 * `role="option"`, `aria-autocomplete` e `aria-activedescendant` fora do design
 * system e não teve um único hit. Ele não precisa de dívida nenhuma.
 */
const DIVIDA_FILTRO_FORA_DO_CANONE = [
  // Onda C1 (2026-08-12) pagou os dois `Select` que a regra 3 realmente via em
  // `EngajamentoView.tsx` (":299" e ":382", QUANTOS itens mostrar — viraram
  // `Chip` com `active`). O terceiro (":461", qual club analisado, virou
  // `Combobox`) nunca produziu achado aqui — o aria-label "Club analisado" não
  // casa nenhum dos dois prefixos da regra, e a conversão dele foi por leitura
  // humana (ver 02-catraca-controles.md §7). Arquivo sai da lista: zero achado
  // sobrando, e entrada morta reprova a camada A.
  //
  // Onda C5 · `Select` de ORDENAÇÃO (ClientesPage.tsx:118) SAIU desta lista —
  // decisão tomada NA ONDA, como `03-fila-em-ondas.md` mandou (não sobe ao
  // dono: não é dinheiro nem dado pessoal, e o default é técnico). Dos três
  // destinos que a fila apontou (prop `sort` da `FilterBar`, peça própria
  // `SortSelect`, ou `Select` legítimo com linha nova no cânone), o veredicto
  // é o terceiro: ordenar não retira nada da lista (não é filtro) e não é
  // campo de formulário que vira dado — mas É "escolha única, poucas opções,
  // sem busca", exatamente a forma que `Select` já cobre. Uma peça nova
  // (`SortSelect`) para UM único consumidor no produto inteiro violaria o
  // reuso-primeiro que justificou as cinco peças da C0 (12-13 consumidores
  // cada); a prop `sort` da `FilterBar` misturaria responsabilidade de
  // reordenar TODA a lista dentro de uma peça desenhada para RECORTAR facetas.
  // Registro: `03-canon/canone-de-componentes.md` §1 ganhou a linha
  // "Ordenação de lista"; `prefixosDeFiltro` (abaixo) perdeu `"ordenar"` — o
  // prefixo confundia ordenar (reordena) com filtrar (retira), e a decisão
  // vale para a categoria inteira, não só para este arquivo.
  // Condição de reabertura: se aparecer um SEGUNDO consumidor de ordenação
  // fora de formulário, ou se um `Select` rotulado "Ordenar por…" for achado
  // filtrando de verdade (retirando item da lista), a exceção volta à mesa —
  // registrar achado + ADR antes de tocar código.
];

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/.turbo/**",
      "**/*.min.js",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // TypeScript strict rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // General quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // Lint de tokens do design system (LEELA-S001-4-T2):
    // componentes e telas nunca hardcodam cor/spacing/radius — semantic-only.
    // Fontes legítimas de valores crus (tokens, gerador, preset, temas) ficam fora.
    files: [
      "packages/design-system/src/**/*.{ts,tsx}",
      "apps/*/src/**/*.{ts,tsx}",
      "apps/*/app/**/*.{ts,tsx}",
    ],
    ignores: [
      "packages/design-system/src/theme/**",
      "packages/design-system/src/tailwind-preset.ts",
      "packages/design-system/src/scripts/**",
      // Mobile (RN) tematiza via objeto de tema, não CSS vars; a regra
      // string-based é web. Adoção RN é pendência registrada na governança.
      "apps/mobile/**",
    ],
    plugins: {
      "leela-tokens": leelaTokens,
    },
    rules: {
      "leela-tokens/no-hardcoded-tokens": "error",
    },
  },
  {
    // Padrão de rolagem (BUILD-SCROLL-PADRAO): ninguém declara um eixo de
    // overflow sozinho — o CSS promove o outro a `auto` e nasce a segunda barra
    // de rolagem (o "scroll duplo" que o dono reportou três vezes). A regra
    // completa e as três constantes estão em
    // packages/design-system/src/utils/scroll.ts.
    //
    // Testes ficam fora: `toHaveClass('overflow-y-hidden')` afirma uma classe
    // renderizada, não declara CSS de componente.
    // O showroom entra no escopo (REV-SCROLL): ele monta o próprio contêiner de
    // rolagem com o AppShell, exatamente como o RootShell do painel, e por ficar
    // de fora ele guardou um `overflow-y-auto` solto durante toda a varredura,
    // com o gate verde. O `lint` do DS também passou a varrer `showcase/src`.
    files: [
      "packages/design-system/src/**/*.{ts,tsx}",
      "packages/design-system/showcase/src/**/*.{ts,tsx}",
      "apps/*/src/**/*.{ts,tsx}",
      "apps/*/app/**/*.{ts,tsx}",
    ],
    ignores: [
      "**/__tests__/**",
      "**/*.test.{ts,tsx}",
      // Mobile (RN) não usa Tailwind — estiliza por objeto de tema.
      "apps/mobile/**",
    ],
    plugins: {
      "leela-scroll": leelaScroll,
    },
    rules: {
      "leela-scroll/no-scroll-de-um-eixo": "error",
    },
  },
  {
    // Fronteira de autenticação do painel (FRONTEIRA-AUTH): "ninguém entra no
    // sistema sem estar autenticado". A verdade hoje é estrutural — `App.tsx`
    // tem DOIS irmãos debaixo do `<BrowserRouter>`: o bloco público
    // (`AuthLayout`: entrar, cadastrar, recuperar/redefinir senha) e o bloco do
    // app (`RequireSessao`). Um TERCEIRO irmão é uma linha de diff, não quebra
    // build nem teste, e nasce aberto ao mundo.
    //
    // A regra exige que todo `<Route>` de topo declare de que lado está. Abrir
    // uma rota nova ao anônimo passa a exigir a edição DESTE arquivo — a
    // decisão aparece sozinha no diff da review em vez de se esconder na
    // indentação do App.tsx.
    //
    // Escopo: só o painel. A landing é Next (App Router), não tem `<Routes>`, e
    // a fronteira dela é outro contrato (callables + Rules, sem sessão de
    // servidor) — regra própria quando houver o que travar.
    files: ["apps/painel/src/**/*.tsx"],
    ignores: ["**/__tests__/**", "**/*.test.tsx"],
    plugins: {
      "leela-auth": leelaAuth,
    },
    rules: {
      "leela-auth/rota-fora-da-fronteira": [
        "error",
        { guardas: ["RequireSessao"], publicas: ["AuthLayout"] },
      ],
    },
  },
  {
    // Campo de senha da casa (FRONTEIRA-AUTH · pedido do dono: revelar a senha,
    // exigir número + caractere especial, indicar força). Eram DEZESSETE campos
    // em nove arquivos, nos dois apps. O décimo oitavo será escrito por alguém
    // que não leu nenhum dos outros — e é ele que esta regra pega, antes que
    // nasça sem `type="button"` no botão (que submete o formulário) ou sem o
    // `autocomplete` que o gerenciador de senha precisa.
    //
    // Escopo: só `apps/`. O design system precisa do `<input type="password">`
    // cru para construir o `InputSenha`.
    files: ["apps/painel/src/**/*.tsx", "apps/landing/app/**/*.tsx"],
    ignores: ["**/__tests__/**", "**/*.test.tsx", "apps/mobile/**"],
    plugins: {
      "leela-auth": leelaAuth,
    },
    rules: {
      "leela-auth/senha-fora-do-ds": "error",
    },
  },
  {
    // Procedência do componente (S005-T5 · gate `leela-canon`). O furo que a
    // L-021 nomeou: havia gate de marca, de rolagem e de fronteira, e NENHUM
    // julgava de onde o componente veio. Um combobox artesanal feito 100% com
    // token semântico passa nos três — e a medição achou 223 instâncias assim.
    //
    // Regra 1 trava o controle nativo que tem canônico publicado. Regra 2 trava
    // a re-implementação BATIZADA: o componente chamado `Card`/`Modal`/`Table`
    // fora do DS, que é o que faz a duplicata parecer oficial.
    //
    // `<button>` fica FORA da regra dura de propósito (spec §4): ele aparece
    // legitimamente em três lugares que a análise sintática local não distingue
    // de violação (trigger `asChild` do Radix, alvo de clique que não é botão de
    // ação, botão-ícone em composição). A violação real — `className` replicando
    // variante do `Button` — é reconhecível por assinatura de classe, e
    // assinatura de classe é exatamente onde falso positivo nasce. Ele entra na
    // catraca de `scripts/gate-canon.mjs`.
    //
    // O que a regra não barra, e por quê:
    //   - `packages/design-system/src/**` (não está no escopo abaixo): o DS
    //     PRECISA do elemento cru — é ele que constrói o primitivo. Mesma
    //     exceção que o `senha-fora-do-ds` já declara.
    //   - testes: renderizar `<select>` para provar que a tela NÃO tem um afirma
    //     um fato, não declara UI.
    //   - stories: composição pode montar um contraexemplo de propósito.
    //   - `apps/mobile/**`: React Native não tem esses elementos.
    files: [
      "apps/painel/src/**/*.tsx",
      "apps/landing/app/**/*.tsx",
      "packages/design-system/showcase/src/**/*.tsx",
    ],
    ignores: [
      "**/__tests__/**",
      "**/*.test.tsx",
      "**/*.stories.tsx",
      "apps/mobile/**",
      ...DIVIDA_CONTROLE_CRU,
    ],
    plugins: {
      "leela-canon": leelaCanon,
    },
    rules: {
      "leela-canon/controle-cru-fora-do-ds": [
        "warn",
        {
          permitidos: [],
          // A porta ÚNICA da governança §8, materializada em código: entrar nela
          // exige editar ESTE arquivo, e a linha aparece sozinha no diff.
          arquivosDeExcecao: [
            // Cânone §2: `<input type="time">` é spinner, não é o calendário do
            // SO, e é legítimo DENTRO do campo de data+hora do painel. Fora
            // dele continua barrado.
            "apps/painel/src/components/fields/DateTimeField.tsx",
            // O card do `Field` no showroom demonstra o wrapper sobre um
            // controle CRU — é o contraexemplo que o componente existe para
            // servir, e envolver um `Input` ali renderizaria duas labels (o
            // próprio Field documenta isso). Mesma natureza do contraexemplo
            // que a spec §3 já concede às stories.
            "packages/design-system/showcase/src/sections/ComponentsPage.tsx",
          ],
        },
      ],
    },
  },
  {
    // Regra 2 tem escopo e dívida PRÓPRIOS — por isso bloco separado. Misturar
    // as duas listas num `ignores` só cegaria uma regra pela dívida da outra.
    files: [
      "apps/painel/src/**/*.tsx",
      "apps/landing/app/**/*.tsx",
      "packages/design-system/showcase/src/**/*.tsx",
    ],
    ignores: [
      "**/__tests__/**",
      "**/*.test.tsx",
      "**/*.stories.tsx",
      "apps/mobile/**",
      ...DIVIDA_PADRAO_REIMPLEMENTADO,
    ],
    plugins: {
      "leela-canon": leelaCanon,
    },
    rules: {
      "leela-canon/padrao-reimplementado-fora-do-ds": [
        "warn",
        {
          canone: CANONE_DO_DS,
          // Os sinônimos das cinco peças da Onda C0 entram JUNTO com as peças,
          // e é isso que evita a remedição em separado que o `SecaoHead` custou
          // em 11/08. `FiltroStatus`, `FiltroEstado` e `FiltroTipo` são os nomes
          // que as telas já usaram para as funções locais que a `FilterChips`
          // substitui — o segundo mecanismo da L-021, e o mais caro: a
          // duplicata BATIZADA é a que a próxima pessoa importa achando que
          // importou o cânone.
          //
          // O spread é obrigatório: a opção SUBSTITUI o default do plugin, e
          // sem ele os quinze sinônimos anteriores sumiriam em silêncio — o
          // número desceria e o gate pareceria mais verde estando mais cego.
          sinonimos: {
            ...SINONIMOS_PADRAO,
            FilterBar: ["BarraDeFiltros", "FiltrosBar", "Filtros", "FilterToolbar"],
            FilterChips: [
              "ChipGroup",
              "GrupoDeChips",
              "FiltroStatus",
              "FiltroEstado",
              "FiltroTipo",
            ],
            ResultCount: ["ContadorResultado", "Mostrando", "ContadorDeLista"],
            CheckboxField: ["CheckboxComRotulo", "CampoCheckbox", "LabeledCheckbox"],
            FieldGroup: ["GrupoDeCampos", "Fieldset", "CampoGrupo"],
          },
        },
      ],
    },
  },
  {
    // Regra 3 · `filtro-fora-do-canone` (rodada 2026-08-12, §2 da spec da
    // catraca). O cânone §1 tem uma linha escrita como REGRA — "filtro nunca é
    // `Select`" — e as duas regras acima não a viam: um `<Select>` importado do
    // DS tem procedência perfeita, e é o PAPEL dele que está errado.
    //
    // Bloco separado pelo mesmo motivo dos outros dois: escopo e dívida
    // próprios. Misturar as listas cegaria uma regra pela dívida da outra.
    files: [
      "apps/painel/src/**/*.tsx",
      "apps/landing/app/**/*.tsx",
      "packages/design-system/showcase/src/**/*.tsx",
    ],
    ignores: [
      "**/__tests__/**",
      "**/*.test.tsx",
      "**/*.stories.tsx",
      "apps/mobile/**",
      ...DIVIDA_FILTRO_FORA_DO_CANONE,
    ],
    plugins: {
      "leela-canon": leelaCanon,
    },
    rules: {
      "leela-canon/filtro-fora-do-canone": [
        "error",
        {
          // "ordenar" SAIU (Onda C5, ver o comentário de
          // DIVIDA_FILTRO_FORA_DO_CANONE acima): reordenar não é filtrar —
          // não retira item nenhum da lista — e a régua da regra é o rótulo
          // que o próprio autor escreveu, então "Ordenar por…" declara papel
          // de ordenação, nunca de filtro.
          prefixosDeFiltro: ["filtrar", "filtro", "recorte", "recortar"],
          prefixosDeRecorte: ["quantos", "quantas", "top"],
          arquivosDeExcecao: [],
        },
      ],
    },
  },
];
