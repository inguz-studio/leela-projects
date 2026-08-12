// =============================================================================
// scripts/gate-canon.mjs
//
// Gate `leela-canon` — a CATRACA da procedência do componente (S005-T5).
//
// As duas regras ESLint (`leela-canon/controle-cru-fora-do-ds` e
// `leela-canon/padrao-reimplementado-fora-do-ds`) julgam fato sintático local,
// com zero ambiguidade. Este script julga o que elas não podem julgar sem
// inventar falso positivo — e falso positivo é como gate morre:
//
//   (A) INTEGRIDADE DO CÂNONE. O barrel do DS, o documento canônico e a config
//       do lint não podem se separar em silêncio. Essa separação é o defeito
//       que a L-021 descreve, um nível acima: componente novo sem linha no mapa
//       é o próximo padrão que ninguém vai encontrar. Aqui também mora a prova
//       de que a lista de dívida herdada do `eslint.config.mjs` ainda é VERDADE
//       — entrada morta reprova, porque arquivo já convertido que continua na
//       lista é mentira sobre cobertura.
//
//   (B) CATRACA. Conta, por app e por padrão, as classes que a regra dura não
//       julga: superfície reconstruída à mão, `<button>` replicando variante,
//       receitas de grid, padrão órfão. O número vive em
//       `scripts/gate-canon.baseline.json`, versionado. SUBIR REPROVA; descer
//       atualiza o arquivo no mesmo commit. É isso que impede o inventário de
//       2026-08-11 de apodrecer: cada onda derruba o número e o número não volta.
//
// Molde: `apps/landing/scripts/verify-brand-fonts.mjs` — duas camadas, contador
// `failures`, saída ✓/✗, CI-safe sem servidor.
//
// Uso:
//   node scripts/gate-canon.mjs              # verifica contra o baseline
//   node scripts/gate-canon.mjs --atualizar  # regrava o baseline (só se desceu)
//   node scripts/gate-canon.mjs --relatorio  # lista arquivo:linha de cada contagem
//   node scripts/gate-canon.mjs --remedir "razão"   # regrava APÓS a régua mudar
//
// Sobre o `--remedir`, que nasceu na Onda 0 Parte B: `--atualizar` recusa
// quando uma contagem sobe, e essa recusa é o coração da catraca. Só que ela
// tem um ponto cego — quando o INSTRUMENTO fica melhor, o número sobe sem que
// o código tenha piorado. Foi o que aconteceu no dia em que `SecaoHead` virou
// sinônimo de `SectionHeader`: a mesma árvore, uma régua mais longa, 2 → 3.
//
// Sem porta declarada, o único caminho seria editar o JSON à mão — que é
// exatamente o "conserte o baseline em vez do código" que este script existe
// para impedir, e que não deixaria rastro nenhum. Com ela, remedir exige uma
// RAZÃO em texto, a razão fica versionada dentro do próprio baseline, e o ato
// aparece sozinho no diff da revisão. É o mesmo desenho da porta única de
// exceção da governança §8: não se proíbe o caso legítimo, obriga-se ele a
// aparecer.
// =============================================================================

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';
import { canoneDoBarrel } from '../packages/design-system/lint/leela-canon-plugin.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(RAIZ, 'scripts/gate-canon.baseline.json');
const BARREL = join(RAIZ, 'packages/design-system/src/index.ts');
const CANONE_DOC = join(RAIZ, 'leela-specs/03-canon/canone-de-componentes.md');

const atualizar = process.argv.includes('--atualizar');
const relatorio = process.argv.includes('--relatorio');
/** `--remedir "razão"` — a porta declarada para quando a RÉGUA muda. */
const iRemedir = process.argv.indexOf('--remedir');
const remedir = iRemedir >= 0;
const razaoDaRemedicao = remedir ? (process.argv[iRemedir + 1] ?? '').trim() : '';

let failures = 0;
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failures += 1;
};
const pass = (msg) => console.log(`  ✓ ${msg}`);
const rel = (p) => relative(RAIZ, p).replace(/\\/g, '/');

/**
 * Exports do barrel que NÃO são padrão de UI e por isso não têm linha no mapa
 * padrão→componente. A lista é curta de propósito: cada nome aqui é uma coisa
 * que ninguém escolhe ao desenhar uma tela.
 */
const FORA_DO_MAPA = new Set(['ThemeProvider', 'ThemeProviderRN']);

// ===========================================================================
// Varredura de arquivos
// ===========================================================================

const APPS = [
  { app: 'painel', dir: join(RAIZ, 'apps/painel/src') },
  { app: 'landing', dir: join(RAIZ, 'apps/landing/app') },
];

function varrer(dir) {
  if (!existsSync(dir)) return [];
  const saida = [];
  for (const entrada of readdirSync(dir)) {
    const p = join(dir, entrada);
    if (statSync(p).isDirectory()) {
      if (entrada === 'node_modules' || entrada === '.next' || entrada === '__tests__') continue;
      saida.push(...varrer(p));
    } else if (/\.tsx$/.test(entrada) && !/\.(test|stories)\.tsx$/.test(entrada)) {
      saida.push(p);
    }
  }
  return saida;
}

/**
 * Tags de abertura de um elemento intrínseco, com o texto dos atributos.
 *
 * Escrito à mão em vez de por parser porque a catraca lê MUITO arquivo e o
 * critério é textual (assinatura de classe), não sintático. O corte é o `>` de
 * fechamento no nível zero de chaves e aspas — `className={cn('a>b')}` não
 * fecha a tag.
 *
 * @returns {Array<{ tag: string, atributos: string, linha: number }>}
 */
function tagsDeAbertura(fonte, tags) {
  const achados = [];
  const nomes = tags.join('|');
  const re = new RegExp(`<(${nomes})(?=[\\s/>])`, 'g');
  let m;
  while ((m = re.exec(fonte))) {
    let i = m.index + m[0].length;
    let chaves = 0;
    let aspas = null;
    while (i < fonte.length) {
      const c = fonte[i];
      if (aspas) {
        if (c === aspas) aspas = null;
      } else if (c === '"' || c === "'" || c === '`') {
        aspas = c;
      } else if (c === '{') {
        chaves += 1;
      } else if (c === '}') {
        chaves -= 1;
      } else if (c === '>' && chaves === 0) {
        break;
      }
      i += 1;
    }
    achados.push({
      tag: m[1],
      atributos: fonte.slice(m.index + m[0].length, i),
      linha: fonte.slice(0, m.index).split('\n').length,
    });
  }
  return achados;
}

// ===========================================================================
// CAMADA A — integridade do cânone
// ===========================================================================

console.log('\nCAMADA A · integridade do cânone');

const componentesDoBarrel = canoneDoBarrel(readFileSync(BARREL, 'utf8'));
console.log(`  · ${componentesDoBarrel.length} componentes exportados pelo barrel`);

// ── A1 · barrel × config do lint ─────────────────────────────────────────────
const configRaiz = (await import(pathToFileURL(join(RAIZ, 'eslint.config.mjs')).href)).default;
const blocoDaRegra2 = configRaiz.find(
  (b) => b?.rules?.['leela-canon/padrao-reimplementado-fora-do-ds'],
);
if (!blocoDaRegra2) {
  fail('eslint.config.mjs não liga `leela-canon/padrao-reimplementado-fora-do-ds`');
} else {
  const canoneDaConfig = blocoDaRegra2.rules['leela-canon/padrao-reimplementado-fora-do-ds'][1]
    ?.canone ?? [];
  const diff = [
    ...componentesDoBarrel.filter((n) => !canoneDaConfig.includes(n)).map((n) => `+${n}`),
    ...canoneDaConfig.filter((n) => !componentesDoBarrel.includes(n)).map((n) => `-${n}`),
  ];
  if (diff.length === 0) {
    pass(`a opção \`canone\` do lint bate com o barrel (${canoneDaConfig.length})`);
  } else {
    fail(`lint × barrel divergem: ${diff.join(' ')} — a lista tem de vir do barrel, não de mão`);
  }
}

// ── A2 · barrel × documento canônico ─────────────────────────────────────────
const doc = readFileSync(CANONE_DOC, 'utf8');
const semLinha = componentesDoBarrel.filter(
  (n) => !FORA_DO_MAPA.has(n) && !new RegExp(`\\b${n}\\b`).test(doc),
);
if (semLinha.length === 0) {
  pass(`todo componente do barrel tem linha em ${rel(CANONE_DOC)}`);
} else {
  fail(
    `componente no DS sem linha no cânone: ${semLinha.join(', ')} — componente novo nasce com a linha no MESMO commit`,
  );
}

// ── A3 · a dívida herdada ainda é verdade ────────────────────────────────────
//
// Cada arquivo silenciado no `eslint.config.mjs` tem de continuar produzindo
// achado quando o silêncio é levantado. Entrada morta reprova por dois motivos:
// ela mente sobre a cobertura, e ela esconde que uma onda já pagou o item.
// Este passo também pega o defeito que quase passou nesta lane — o caminho do
// Next com `(route group)` e `[segmento]` é glob com metacaractere, e sem escape
// o ignore vira no-op silencioso.
const DIVIDA = [
  {
    regra: 'leela-canon/controle-cru-fora-do-ds',
    bloco: configRaiz.findIndex((b) => b?.rules?.['leela-canon/controle-cru-fora-do-ds']),
  },
  {
    regra: 'leela-canon/padrao-reimplementado-fora-do-ds',
    bloco: configRaiz.findIndex((b) => b?.rules?.['leela-canon/padrao-reimplementado-fora-do-ds']),
  },
];

/** Roda UMA regra sobre os apps, sem os ignores de dívida. Devolve os achados. */
async function acharSemDivida(regra) {
  const bloco = configRaiz.find((b) => b?.rules?.[regra]);
  const linter = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
          parser: (await import('@typescript-eslint/parser')).default,
          parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        },
      },
      {
        files: bloco.files,
        // Só a dívida sai; as exclusões de natureza (teste, story, mobile) ficam.
        ignores: bloco.ignores.filter(
          (p) => p.startsWith('**/') || p.startsWith('apps/mobile'),
        ),
        plugins: bloco.plugins,
        rules: { [regra]: ['warn', bloco.rules[regra][1]] },
      },
    ],
    errorOnUnmatchedPattern: false,
  });
  const resultados = await linter.lintFiles([
    join(RAIZ, 'apps/painel/src'),
    join(RAIZ, 'apps/landing/app'),
    join(RAIZ, 'packages/design-system/showcase/src'),
  ]);
  const achados = [];
  for (const r of resultados) {
    for (const m of r.messages) {
      if (m.ruleId === regra) achados.push({ arquivo: rel(r.filePath), linha: m.line, msg: m.message });
    }
  }
  return achados;
}

const achadosPorRegra = {};
for (const { regra, bloco } of DIVIDA) {
  if (bloco < 0) {
    fail(`eslint.config.mjs não liga \`${regra}\``);
    continue;
  }
  const achados = await acharSemDivida(regra);
  achadosPorRegra[regra] = achados;
  const silenciados = configRaiz[bloco].ignores.filter(
    (p) => !p.startsWith('**/') && !p.startsWith('apps/mobile'),
  );
  const mortas = silenciados.filter((padrao) => {
    const limpo = padrao.replace(/\\/g, '');
    return !achados.some((a) => a.arquivo === limpo);
  });
  if (silenciados.length === 0) {
    pass(`\`${regra}\` sem dívida herdada — pronta para virar \`error\``);
  } else if (mortas.length === 0) {
    pass(`dívida herdada de \`${regra}\`: ${silenciados.length} arquivo(s), todos ainda vivos`);
  } else {
    fail(
      `entrada MORTA na dívida de \`${regra}\`: ${mortas.join(', ')} — já foi paga, tire a linha do eslint.config.mjs`,
    );
  }
}

// ===========================================================================
// CAMADA B — catraca das classes ambíguas
// ===========================================================================

console.log('\nCAMADA B · catraca');

// ---------------------------------------------------------------------------
// O repositório escreve classe em DOIS dialetos, e a catraca tem de ler os
// dois. O painel usa a forma arbitrária com token
// (`rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]`);
// a landing usa os aliases do preset (`rounded-ds-lg bg-surface-raised p-6`).
// Um detector que lê só o primeiro dá ZERO na landing — e um número zero num
// lugar com dívida medida é pior que número nenhum, porque autoriza a regressão.
// ---------------------------------------------------------------------------
const RAIO = /rounded-\[var\(--[a-z-]+\)\]|rounded-ds-[a-z]+/;
const FUNDO_DE_SUPERFICIE = /bg-\[var\(--surface-[a-z-]+\)\]|bg-surface-[a-z-]+/;
const ESPACAMENTO = /\bp-\[var\(--spacing-[\w-]+\)\]|\bp-\d|\bp-\[/;

/** Assinatura do `Card` reescrita à mão: raio + fundo de superfície + padding. */
const ehSuperficieCrua = (attrs) =>
  RAIO.test(attrs) && FUNDO_DE_SUPERFICIE.test(attrs) && ESPACAMENTO.test(attrs);

/**
 * Alvo de clique com `className` replicando variante publicada do `Button`: a
 * pílula do DS, ou cor de ação no fundo com raio próprio. É o caso que a regra
 * dura NÃO julga (spec §4) porque a assinatura de classe é justamente onde
 * falso positivo nasce — aqui ele é contado, não reprovado.
 *
 * `<span>` com pílula fica FORA: aquilo é `Badge`/`Chip` reescrito, não botão,
 * e misturar as duas dívidas numa contagem só faz o número parar de significar
 * alguma coisa.
 */
const ehBotaoCruEstilizado = (attrs) =>
  (/rounded-ds-pill/.test(attrs) || /bg-\[var\(--action-[a-z-]+\)\]|bg-action-[a-z-]+/.test(attrs)) &&
  /px-|py-|\bp-/.test(attrs);

const contagens = {
  'superficie-crua': {},
  'botao-cru-estilizado': {},
  'grade-crua': {},
  'receita-de-grid': {},
  'padrao-orfao': {},
};
const detalhes = {
  'superficie-crua': [],
  'botao-cru-estilizado': [],
  'grade-crua': [],
  'receita-de-grid': [],
  'padrao-orfao': [],
};
/**
 * Assinaturas distintas de grade. Até 11/08 esta contagem media a AUSÊNCIA de
 * cânone de layout (§6): 23 receitas para três famílias, e nada contra o quê
 * reprovar. A CANONE-1 fechou o vazio — `Stack`, `FormGrid`, `MetricGrid`,
 * `SplitPanel` e `SectionHeader` nasceram no DS na Onda 0 Parte B —, então ela
 * passa a medir a DÍVIDA: quantas receitas ainda existem escritas à mão.
 */
const receitasDeGrid = {};

for (const { app, dir } of APPS) {
  contagens['superficie-crua'][app] = 0;
  contagens['botao-cru-estilizado'][app] = 0;
  contagens['grade-crua'][app] = 0;
  contagens['padrao-orfao'][app] = 0;
  receitasDeGrid[app] = new Set();

  for (const arquivo of varrer(dir)) {
    const fonte = readFileSync(arquivo, 'utf8');
    const caminho = rel(arquivo);

    for (const t of tagsDeAbertura(fonte, ['div', 'section', 'article', 'li', 'aside'])) {
      if (ehSuperficieCrua(t.atributos)) {
        contagens['superficie-crua'][app] += 1;
        detalhes['superficie-crua'].push(`${caminho}:${t.linha}  <${t.tag}>`);
      }
    }
    for (const t of tagsDeAbertura(fonte, ['button', 'a', 'Link'])) {
      if (ehBotaoCruEstilizado(t.atributos)) {
        contagens['botao-cru-estilizado'][app] += 1;
        detalhes['botao-cru-estilizado'].push(`${caminho}:${t.linha}  <${t.tag}>`);
      }
    }
    // Padrão órfão: `<details>`/`<summary>` (acordeão sem canônico) — a regra
    // dura NÃO os reprova (spec §5/§6): enquanto a decisão não voltar, a
    // instância é permitida e CONTADA. O acordeão é o que sobrou desta lista
    // depois da CANONE-1: layout composto SAIU dela em 11/08, porque agora tem
    // canônico e por isso vira dívida com catraca (`grade-crua`), e não mais
    // finding de processo.
    for (const t of tagsDeAbertura(fonte, ['details'])) {
      contagens['padrao-orfao'][app] += 1;
      detalhes['padrao-orfao'].push(`${caminho}:${t.linha}  <details> (acordeão sem canônico)`);
    }
    // ── Grade escrita à mão ────────────────────────────────────────────────
    //
    // DUAS contagens do mesmo fato, e cada uma responde uma pergunta que a
    // outra não responde:
    //
    //   `grade-crua`      quantas INSTÂNCIAS ainda montam moldura na mão. É o
    //                     tamanho da dívida, e o que as ondas 1 a 5 derrubam.
    //   `receita-de-grid` quantas RECEITAS distintas foram inventadas. É a
    //                     diversidade, e o que denuncia tela reinventando a
    //                     fração mesmo com o primitivo publicado.
    //
    // Receita é o conjunto de tokens `grid-cols-*` de um mesmo bloco de
    // classes, COM os modificadores responsivos: `grid-cols-1 sm:grid-cols-2`
    // é uma receita, não duas.
    //
    // Os primitivos do DS ficam FORA da contagem por construção — o script só
    // varre `apps/`, e é lá que a moldura à mão é dívida. Dentro do design
    // system a classe de grade é o produto.
    for (const bloco of fonte.matchAll(/(?:className|class)=(?:"([^"]*)"|\{`([^`]*)`\}|'([^']*)')/g)) {
      const classes = bloco[1] ?? bloco[2] ?? bloco[3] ?? '';
      const tokens = [...classes.matchAll(/(?:[\w-]+:)*grid-cols-[\w[\]().,_%+-]+/g)].map((t) => t[0]);
      if (tokens.length > 0) {
        receitasDeGrid[app].add([...new Set(tokens)].sort().join(' '));
        contagens['grade-crua'][app] += 1;
        const linha = fonte.slice(0, bloco.index).split('\n').length;
        detalhes['grade-crua'].push(`${caminho}:${linha}  ${[...new Set(tokens)].sort().join(' ')}`);
      }
    }
  }
  contagens['receita-de-grid'][app] = receitasDeGrid[app].size;
  for (const r of [...receitasDeGrid[app]].sort()) {
    detalhes['receita-de-grid'].push(`${app}  ${r}`);
  }
}

// As duas contagens de lint entram no baseline pelo número REAL — medido sem os
// ignores de dívida. É esse número que as ondas derrubam.
for (const [regra, achados] of Object.entries(achadosPorRegra)) {
  const chave = regra.replace('leela-canon/', '');
  contagens[chave] = { total: achados.length };
  detalhes[chave] = achados.map((a) => `${a.arquivo}:${a.linha}`);
}

// ── comparação com o baseline ────────────────────────────────────────────────
const anterior = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
const hoje = new Date().toISOString().slice(0, 10);
const atual = { medidoEm: hoje, contagens };

if (relatorio) {
  console.log('\nRELATÓRIO · arquivo:linha por contagem\n');
  for (const [nome, linhas] of Object.entries(detalhes)) {
    console.log(`## ${nome} (${linhas.length})`);
    for (const l of linhas) console.log(`   ${l}`);
    console.log('');
  }
}

if (!anterior) {
  console.log('  · sem baseline — rode com --atualizar para gravar o primeiro');
  for (const [nome, porApp] of Object.entries(contagens)) {
    console.log(`  · ${nome}: ${JSON.stringify(porApp)}`);
  }
} else {
  for (const [nome, porApp] of Object.entries(contagens)) {
    for (const [escopo, n] of Object.entries(porApp)) {
      const base = anterior.contagens?.[nome]?.[escopo];
      if (base === undefined) {
        fail(`contagem nova sem baseline: ${nome}.${escopo} = ${n} — rode --atualizar`);
      } else if (n > base) {
        fail(`${nome}.${escopo} SUBIU: ${base} → ${n}. A catraca só desce.`);
      } else if (n < base) {
        pass(`${nome}.${escopo} desceu: ${base} → ${n} — rode --atualizar no MESMO commit`);
      } else {
        pass(`${nome}.${escopo} = ${n} (baseline)`);
      }
    }
  }
}

/** Toda contagem que subiu em relação ao baseline, com o antes e o depois. */
function subidas() {
  if (!anterior) return [];
  const lista = [];
  for (const [nome, porApp] of Object.entries(contagens)) {
    for (const [escopo, n] of Object.entries(porApp)) {
      const base = anterior.contagens?.[nome]?.[escopo];
      if (base !== undefined && n > base) lista.push({ chave: `${nome}.${escopo}`, de: base, para: n });
    }
  }
  return lista;
}

if (atualizar) {
  const acima = subidas();
  if (acima.length > 0) {
    fail(
      `\`--atualizar\` recusado: ${acima.map((s) => `${s.chave} ${s.de}→${s.para}`).join(', ')} SUBIU. ` +
        'Conserte o código, não o baseline. Se foi a RÉGUA que mudou, use `--remedir "razão"`.',
    );
  } else {
    // A remedição anterior segue no arquivo: ela é histórico, não estado.
    if (anterior?.remedicoes) atual.remedicoes = anterior.remedicoes;
    writeFileSync(BASELINE, `${JSON.stringify(atual, null, 2)}\n`, 'utf8');
    pass(`baseline regravado em ${rel(BASELINE)}`);
  }
}

if (remedir) {
  if (razaoDaRemedicao.length < 20 || razaoDaRemedicao.startsWith('--')) {
    fail(
      '`--remedir` exige uma RAZÃO em texto (mín. 20 caracteres) — ela é gravada no baseline e ' +
        'aparece no diff. Ex.: --remedir "SecaoHead virou sinônimo de SectionHeader na Onda 0 Parte B"',
    );
  } else {
    const acima = subidas();
    atual.remedicoes = [
      ...(anterior?.remedicoes ?? []),
      {
        data: hoje,
        razao: razaoDaRemedicao,
        subiram: acima.map((s) => `${s.chave}: ${s.de} → ${s.para}`),
      },
    ];
    writeFileSync(BASELINE, `${JSON.stringify(atual, null, 2)}\n`, 'utf8');
    pass(`baseline REMEDIDO em ${rel(BASELINE)} — razão gravada no arquivo`);
    if (acima.length > 0) {
      console.log(
        `  ! subiram por mudança de régua: ${acima.map((s) => `${s.chave} ${s.de}→${s.para}`).join(', ')}`,
      );
    }
  }
}

console.log(
  failures === 0 ? '\nGATE LEELA-CANON: PASS' : `\nGATE LEELA-CANON: FAIL (${failures})`,
);
process.exit(failures === 0 ? 0 : 1);
