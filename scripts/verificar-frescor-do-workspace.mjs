#!/usr/bin/env node
// =============================================================================
// scripts/verificar-frescor-do-workspace.mjs
//
// O GATE QUE ENXERGA O QUE OS OUTROS TRÊS NÃO ENXERGAM (PONTE-FIX · B1).
//
// -----------------------------------------------------------------------------
// A ARMADILHA, MEDIDA DUAS VEZES
// -----------------------------------------------------------------------------
// Em 08/08 e de novo em 11/08 o mesmo defeito armou: o `dist/` de um pacote do
// workspace ficou para trás da fonte, e o bundle do app saiu com o código
// velho. Na PONTE-REV de 11/08 a medição foi esta —
// `packages/api-client/dist` de 09/08 13:01 contra fonte de 11/08 02:33, sem
// `nomeProfissional` e sem `intencao` em lugar nenhum do bundle.
//
// O caro não é o defeito: é que NENHUM DOS TRÊS GATES DA CASA O VÊ.
//   1. `tsc --noEmit` lê a FONTE — `apps/landing/tsconfig.json` mapeia
//      `@leela/api-client` para `../../packages/api-client/src/index.ts`.
//      Passa verde com o `dist/` podre.
//   2. A suíte lê um DUBLÊ — `vi.mock('@leela/api-client', …)`. O módulo real
//      nunca é carregado. Passa verde com o `dist/` podre.
//   3. Só o BUNDLE lê o `dist/`: nem `next.config.js` nem o vite do painel
//      apelidam os pacotes, então o resolvedor cai no `exports` do
//      package.json → `./dist/index.mjs`. E o bundle é a única peça que
//      ninguém inspeciona antes de subir.
//
// -----------------------------------------------------------------------------
// POR QUE FRESCOR, E NÃO RECONSTRUÇÃO AUTOMÁTICA
// -----------------------------------------------------------------------------
// A alternativa óbvia era o `build` do app reconstruir as dependências sozinho.
// Ela foi RECUSADA por dois motivos medidos:
//   - `turbo run build` JÁ faz isso (`build.dependsOn: ["^build"]`), então um
//     rebuild embutido duplicaria trabalho no caminho que já está correto e
//     esconderia o erro de ordem em vez de nomeá-lo;
//   - reconstruir em silêncio é a mesma família do descarte silencioso que esta
//     rodada inteira existe para matar. Quem errou a ordem do deploy precisa
//     LER que errou, e não receber um conserto invisível.
// Este gate detecta e RECUSA, com o comando do conserto na tela. Ele é
// fail-closed, roda em qualquer forma de invocação do build (`pnpm --filter
// … build`, `pnpm build`, `turbo run build`) e não depende de ninguém lembrar.
//
// A régua é a data de modificação, e ela é deliberadamente GROSSA: tocar um
// arquivo de fonte sem mudar conteúdo derruba o gate. Falso positivo custa um
// `tsup` de dois segundos; falso negativo custou dois deploys.
//
// -----------------------------------------------------------------------------
// O QUE ELE NÃO É
// -----------------------------------------------------------------------------
// Não substitui o probe de conteúdo do runbook (contar símbolo dentro do
// `dist/`) — aquele prova QUAL símbolo entrou, este prova QUANDO o arquivo
// nasceu. E o probe de conteúdo tem de mirar em símbolo NOVO: contar
// `promoverParaProfissional` dava falso verde na PONTE-REV, porque o nome já
// existia no `dist/` velho e o que mudou foi a aridade.
//
// Uso:  node ../../scripts/verificar-frescor-do-workspace.mjs
//       (a partir do diretório do app; ele lê o `package.json` do cwd)
// =============================================================================

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Núcleo puro — testável sem tocar no build de ninguém
// ---------------------------------------------------------------------------

/** Onde o repo começa: o diretório que tem o `pnpm-workspace.yaml`. */
export function acharRaizDoRepo(partida) {
  let atual = resolve(partida);
  for (;;) {
    if (existsSync(join(atual, 'pnpm-workspace.yaml'))) return atual;
    const pai = dirname(atual);
    // Chegou na raiz do disco sem achar: devolver null em vez de laçar para
    // sempre. Quem chama decide (o CLI recusa; o teste afirma).
    if (pai === atual) return null;
    atual = pai;
  }
}

/** Os nomes de dependência declarados com o protocolo `workspace:`. */
export function dependenciasDeWorkspace(pkg) {
  const todas = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  return Object.entries(todas)
    .filter(([, faixa]) => typeof faixa === 'string' && faixa.startsWith('workspace:'))
    .map(([nome]) => nome)
    .sort();
}

/** Mapa nome-do-pacote → diretório, varrendo `packages/*` e `apps/*`. */
export function mapearPacotes(raiz) {
  const mapa = new Map();
  for (const grupo of ['packages', 'apps']) {
    const dir = join(raiz, grupo);
    if (!existsSync(dir)) continue;
    for (const entrada of readdirSync(dir)) {
      const pkgPath = join(dir, entrada, 'package.json');
      if (!existsSync(pkgPath)) continue;
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (pkg?.name) mapa.set(pkg.name, join(dir, entrada));
      } catch {
        // package.json ilegível não é assunto deste gate.
      }
    }
  }
  return mapa;
}

/** O instante mais recente entre os arquivos de uma árvore. */
function maisRecenteNaArvore(dir) {
  if (!existsSync(dir)) return 0;
  let maior = 0;
  const pilha = [dir];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    for (const entrada of readdirSync(atual, { withFileTypes: true })) {
      // `node_modules` dentro do pacote não é fonte dele.
      if (entrada.name === 'node_modules') continue;
      const caminho = join(atual, entrada.name);
      if (entrada.isDirectory()) {
        pilha.push(caminho);
        continue;
      }
      const t = statSync(caminho).mtimeMs;
      if (t > maior) maior = t;
    }
  }
  return maior;
}

/**
 * Os arquivos que o `exports`/`main`/`module`/`types` do pacote promete. São
 * eles que o bundler vai ler — e não o `dist/` inteiro.
 */
function saidasProometidas(pkg) {
  const alvos = new Set();
  for (const campo of [pkg?.main, pkg?.module, pkg?.types]) {
    if (typeof campo === 'string' && campo.includes('dist/')) alvos.add(campo);
  }
  const exp = pkg?.exports;
  const empilhar = (v) => {
    if (typeof v === 'string') {
      if (v.includes('dist/')) alvos.add(v);
      return;
    }
    if (v && typeof v === 'object') for (const filho of Object.values(v)) empilhar(filho);
  };
  empilhar(exp);
  return [...alvos];
}

/**
 * Um pacote é analisável quando ele COMPILA para `dist/` (tem script de build e
 * promete arquivos em `dist/`). Pacote só-de-fonte não é assunto deste gate.
 *
 * Devolve:
 *   { estado: 'ignorado' }               — não compila para dist
 *   { estado: 'ausente', faltando: [] }  — prometeu e não entregou
 *   { estado: 'defasado', fonteEm, distEm, arquivo }
 *   { estado: 'fresco',   fonteEm, distEm }
 */
export function analisarPacote(dirDoPacote) {
  const pkgPath = join(dirDoPacote, 'package.json');
  if (!existsSync(pkgPath)) return { estado: 'ignorado' };
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const saidas = saidasProometidas(pkg);
  if (saidas.length === 0 || !pkg?.scripts?.build) return { estado: 'ignorado', nome: pkg?.name };

  const faltando = saidas.filter((rel) => !existsSync(join(dirDoPacote, rel)));
  if (faltando.length > 0) return { estado: 'ausente', nome: pkg.name, faltando };

  // A fonte inclui o que muda a SAÍDA sem estar em `src/`: a config do tsup, o
  // tsconfig e o próprio package.json (mudar `exports` muda o que o bundler lê).
  let fonteEm = maisRecenteNaArvore(join(dirDoPacote, 'src'));
  for (const arq of ['tsup.config.ts', 'tsup.config.js', 'tsconfig.json', 'package.json']) {
    const caminho = join(dirDoPacote, arq);
    if (existsSync(caminho)) fonteEm = Math.max(fonteEm, statSync(caminho).mtimeMs);
  }

  let distEm = Infinity;
  let maisVelho = null;
  for (const rel of saidas) {
    const t = statSync(join(dirDoPacote, rel)).mtimeMs;
    if (t < distEm) {
      distEm = t;
      maisVelho = rel;
    }
  }

  return distEm < fonteEm
    ? { estado: 'defasado', nome: pkg.name, fonteEm, distEm, arquivo: maisVelho }
    : { estado: 'fresco', nome: pkg.name, fonteEm, distEm };
}

/**
 * O veredito do app inteiro: analisa cada dependência de workspace dele.
 * Devolve a lista de achados, na ordem dos nomes.
 */
export function analisarApp({ raiz, dirDoApp }) {
  const pkg = JSON.parse(readFileSync(join(dirDoApp, 'package.json'), 'utf8'));
  const mapa = mapearPacotes(raiz);
  const achados = [];
  for (const nome of dependenciasDeWorkspace(pkg)) {
    const dir = mapa.get(nome);
    // Dependência declarada e não encontrada não é problema DESTE gate: o
    // `pnpm install` já teria falhado antes.
    if (dir === undefined) continue;
    achados.push({ ...analisarPacote(dir), nome });
  }
  return { app: pkg.name, achados };
}

/** Os achados que reprovam o build. */
export function reprovados(achados) {
  return achados.filter((a) => a.estado === 'defasado' || a.estado === 'ausente');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function principal() {
  const dirDoApp = process.cwd();
  const raiz = acharRaizDoRepo(dirDoApp);
  if (raiz === null) {
    console.error('[frescor] não achei a raiz do workspace (pnpm-workspace.yaml). Abortando.');
    process.exit(1);
  }

  const { app, achados } = analisarApp({ raiz, dirDoApp });
  const ruins = reprovados(achados);

  if (ruins.length === 0) {
    const olhados = achados.filter((a) => a.estado === 'fresco').map((a) => a.nome);
    console.log(
      `[frescor] ${app}: ${olhados.length} pacote(s) de workspace com dist/ à frente da fonte` +
        (olhados.length > 0 ? ` — ${olhados.join(', ')}` : '')
    );
    return;
  }

  console.error('');
  console.error(`⛔ [frescor] o build de ${app} consumiria dist/ DEFASADO.`);
  console.error('');
  for (const a of ruins) {
    if (a.estado === 'ausente') {
      console.error(`   ${a.nome}: dist/ AUSENTE (${a.faltando.join(', ')})`);
      continue;
    }
    const atraso = Math.round((a.fonteEm - a.distEm) / 60000);
    console.error(
      `   ${a.nome}: ${a.arquivo} está ${atraso} min atrás da fonte` +
        `  (dist ${new Date(a.distEm).toISOString()} < src ${new Date(a.fonteEm).toISOString()})`
    );
  }
  console.error('');
  console.error('   O bundler NÃO lê a fonte: ele resolve pelo `exports` do pacote e cai no');
  console.error('   dist/. tsc e a suíte passam verdes assim mesmo — foi assim nos dois');
  console.error('   deploys que quebraram. Reconstrua antes de buildar:');
  console.error('');
  console.error(`       pnpm turbo run build --filter='${app}...'`);
  console.error('');
  console.error('   (ou, pacote a pacote: `npx tsup` dentro de cada um listado acima)');
  console.error('');
  process.exit(1);
}

// Só roda como CLI quando é o módulo de entrada — importar não dispara nada.
// `pathToFileURL` e não template de string: no Windows o caminho vem com `\` e
// letra de unidade, e a comparação crua nunca casaria — o gate viraria um
// arquivo que não roda, que é o pior desfecho possível para um gate.
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  principal();
}
