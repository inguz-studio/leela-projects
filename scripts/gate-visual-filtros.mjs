// =============================================================================
// scripts/gate-visual-filtros.mjs — o gate visual do padrão FILTRO EM LISTA.
//
// POR QUE EXISTE. O padrão que o dono cravou em 17/08 (leva 20) é geométrico,
// não estilístico: *"eles devem ficar alinhados ao lado do pesquisador"*, numa
// fileira só. Geometria se mede; "está alinhado" não se prova por leitura de
// JSX, porque quem quebra a fileira é o `flex-wrap` em execução, com a largura
// real do campo de busca e das facetas. Um teste de unidade veria o mesmo JSX
// nas duas telas e passaria verde nas duas — foi exatamente o que aconteceu:
// Membros e Desafios têm composição IDÊNTICA e desenham fileiras diferentes.
//
// O QUE ELE MEDE, por rota: quantas fileiras distintas a barra de filtro ocupa
// (agrupando y por tolerância de 8px, que é a folga de centralização vertical),
// a largura do campo de busca, a altura da barra e a FORMA de cada faceta
// (fileira de chips × gatilho de lista). Reprova se a barra ocupar mais de uma
// fileira no desktop, ou se sobrar faceta em forma de fileira de chips.
//
// COMO RODAR (precisa do mock local de pé — `bash scripts/mock-campeche.sh up`,
// ou qualquer emulador com o seed do clube):
//   node scripts/gate-visual-filtros.mjs --base http://localhost:5399 --shots <dir>
//
// ⛔ NÃO É DEPLOY e não fala com produção: a base é sempre local e o autologin
// só existe no preview (`VITE_PREVIEW_AUTOLOGIN`).
//
// ⛔ ERRO REPROVA (conserto de 2026-08-17, lane FILTROS-FIX). A 1ª versão só
// checava geometria quando conseguia medir, e rodada contra uma porta MORTA
// imprimiu "ERRO — sem barra de filtro" nas quatro rotas e terminou dizendo
// "Aprovado", com código 0 e doze PNGs idênticos. Um gate que passa quando não
// consegue medir é pior que gate nenhum, porque parece prova. Hoje reprovam,
// além da geometria: erro de navegação ou barra ausente em QUALQUER largura,
// falha de captura, rodada com menos medições/capturas que o esperado, e duas
// capturas da mesma tela em temas diferentes com o mesmo sha256.
// =============================================================================

import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/** Impressão digital do PNG salvo. Duas capturas iguais nunca são duas provas. */
function sha256(caminho) {
  return createHash('sha256').update(readFileSync(caminho)).digest('hex');
}

const args = process.argv.slice(2);
const arg = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
};

const BASE = arg('base', 'http://localhost:5399');
const SHOTS = arg('shots', '.nirvana/gate-visual/filtros-lista');
const ROTULO = arg('rotulo', 'depois');

/** Os três tamanhos do gate de marca, e os dois temas. */
const TAMANHOS = [
  { nome: 'desktop', w: 1440, h: 900 },
  { nome: '768', w: 768, h: 1024 },
  { nome: '375', w: 375, h: 812 },
];
const TEMAS = ['brasa', 'dark-wine'];

/**
 * As telas do gate. `controle: true` marca Desafios — a referência que o dono
 * nomeou; ela entra para provar que o padrão descrito saiu do exemplo real.
 *
 * ⛔ AS QUATRO ÚLTIMAS ENTRARAM EM 2026-08-17 (lane FILTROS-FIX). A rodada que
 * reprovou media só quatro rotas, e as três reprovadas eram justamente as que
 * tinham DUAS ou mais facetas exclusivas na mesma barra — o defeito precisava
 * de vizinha para aparecer. Concluir dali que as outras dez telas convertidas
 * estavam sãs seria suposição, e suposição foi o que produziu o defeito. Elas
 * ficam medidas: barra com faceta exclusiva, em toda área do painel que tem
 * uma. As telas cujas facetas vivem FORA de uma `FilterBar` (Repasses,
 * Tenants) não entram — não há barra para medir, e cobrar `role="toolbar"`
 * delas seria reprovar por uma anatomia que elas nunca prometeram.
 */
const TELAS = [
  { id: 'membros', rota: '/clubes/corrida-perfeita-sul/membros', preview: 'corrida' },
  { id: 'desafios', rota: '/clubes/corrida-perfeita-sul/desafios', preview: 'corrida', controle: true },
  { id: 'comunicados', rota: '/clubes/corrida-perfeita-sul/comunicacao', preview: 'corrida' },
  { id: 'eventos-hub', rota: '/eventos', preview: 'castelo' },
  { id: 'inscritos', rota: '/eventos/meia-floripa-2026/inscritos', preview: 'castelo' },
  { id: 'afiliados', rota: '/eventos/meia-floripa-2026/afiliados', preview: 'castelo' },
  { id: 'campanhas', rota: '/eventos/meia-floripa-2026/comunicacao', preview: 'castelo' },
  { id: 'eventos-globais', rota: '/plataforma/eventos', preview: 'admin' },
];

/** A anatomia, medida no navegador. Roda dentro da página. */
const ANATOMIA = () => {
  const bar = document.querySelector('[role="toolbar"]');
  if (!bar) {
    return {
      erro: 'sem barra de filtro',
      carregando: [...document.querySelectorAll('[role="status"]')].map((e) =>
        e.getAttribute('aria-label'),
      ),
    };
  }
  const cx = (e) => {
    const b = e.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const busca = bar.querySelector('[role="search"]');
  const fileirasDeChip = [...bar.querySelectorAll('[role="group"]')];
  const gatilhosDeLista = [...bar.querySelectorAll('[aria-haspopup]')];

  const ys = [];
  if (busca) ys.push(Math.round(busca.getBoundingClientRect().y));
  for (const e of [...fileirasDeChip, ...gatilhosDeLista]) {
    ys.push(Math.round(e.getBoundingClientRect().y));
  }
  ys.sort((a, b) => a - b);
  // Fileira distinta = salto maior que a folga de centralização vertical.
  const fileiras = ys.filter((v, i) => i === 0 || v - ys[i - 1] > 8);

  return {
    barra: cx(bar),
    buscaW: busca ? cx(busca).w : null,
    fileiras: fileiras.length,
    ys,
    facetasEmFileiraDeChip: fileirasDeChip.map((g) => ({
      label: g.getAttribute('aria-label'),
      chips: [...g.querySelectorAll('button')].map((b) => b.textContent.trim()),
      box: cx(g),
    })),
    facetasEmLista: gatilhosDeLista.map((g) => ({
      texto: g.textContent.trim().slice(0, 40),
      box: cx(g),
    })),
  };
};

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const navegador = await chromium.launch();
  const medicoes = [];
  const capturas = [];
  const falhas = [];

  for (const tema of TEMAS) {
    for (const tamanho of TAMANHOS) {
      const ctx = await navegador.newContext({
        viewport: { width: tamanho.w, height: tamanho.h },
        deviceScaleFactor: 1,
      });
      // ⚠️ O painel monta `<ThemeProvider theme="brasa">` com a prop CONTROLADA
      // (`main.tsx:31`), e a prop vence a preferência persistida por contrato
      // (F04, `ThemeProvider.tsx:107-115`). Escrever a chave de storage não
      // troca o tema — a primeira rodada deste gate provou isso do pior jeito
      // possível: os doze PNGs de `dark-wine` saíram BYTE A BYTE iguais aos de
      // `brasa`, e um gate que salva o mesmo arquivo com dois nomes prova
      // menos que nenhum gate, porque parece prova. O que troca o tema é o
      // atributo na raiz, que é de onde o CSS lê — então ele é reescrito
      // DEPOIS da montagem, e conferido antes de cada captura.
      await ctx.addInitScript((t) => {
        localStorage.setItem('leela-theme-preference', t);
      }, tema);
      const page = await ctx.newPage();

      for (const tela of TELAS) {
        const url = `${BASE}${tela.rota}?preview=${tela.preview}`;
        let anat;
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          // O autologin troca de identidade e remonta a rota; esperar a barra
          // (ou o estado de carregamento resolver) é o único sinal confiável.
          await page
            .waitForSelector('[role="toolbar"]', { timeout: 25000 })
            .catch(() => null);
          await page.waitForTimeout(1200);
          // O tema entra aqui, e não no storage — ver a nota do contexto.
          await page.evaluate((t) => {
            document.documentElement.setAttribute('data-theme', t);
          }, tema);
          await page.waitForTimeout(250);
          anat = await page.evaluate(ANATOMIA);
        } catch (e) {
          anat = { erro: String(e).slice(0, 200) };
        }

        // O tema que a captura de fato pegou, lido da raiz. Sem isto, um gate
        // que falha em trocar o tema salva doze arquivos iguais e chama de
        // prova de dois temas.
        const temaAplicado = await page
          .evaluate(() => document.documentElement.getAttribute('data-theme'))
          .catch(() => null);
        if (temaAplicado !== tema) {
          falhas.push(`${tela.id} · ${tamanho.nome}: tema pedido ${tema}, aplicado ${temaAplicado}`);
        }

        const nome = `${ROTULO}-${tela.id}-${tamanho.nome}-${tema}.png`;
        const arquivo = join(SHOTS, nome);
        try {
          await page.screenshot({ path: arquivo, fullPage: false });
          capturas.push({ nome, tela: tela.id, tamanho: tamanho.nome, tema, sha: sha256(arquivo) });
        } catch (e) {
          falhas.push(`${tela.id} · ${tamanho.nome} · ${tema}: captura falhou — ${String(e).slice(0, 120)}`);
        }

        medicoes.push({
          tela: tela.id,
          controle: !!tela.controle,
          tema,
          temaAplicado,
          tamanho: tamanho.nome,
          ...anat,
        });

        // ⛔ ERRO REPROVA, EM QUALQUER LARGURA — o conserto de 2026-08-17.
        // Até aqui a checagem inteira estava atrás de `!anat.erro`, e o efeito
        // era o pior possível num gate: contra uma porta MORTA ele imprimia
        // "ERRO — sem barra de filtro" nas quatro rotas, salvava doze PNGs
        // idênticos e terminava com "Aprovado" e código 0. Um gate que não
        // consegue medir tem que REPROVAR, nunca passar — "não medi" e "medi e
        // está certo" são respostas opostas, e confundi-las é como um deploy
        // sobe com a tela preta. O erro é falha por si; as regras de geometria
        // seguem valendo só no desktop, porque em 375 a quebra de linha é o
        // desenho correto e cobrar fileira única lá pediria rolagem horizontal.
        if (anat.erro) {
          falhas.push(`${tela.id} · ${tamanho.nome} · ${tema}: não foi possível medir — ${anat.erro}`);
        } else if (tamanho.nome === 'desktop') {
          if (anat.fileiras > 1) {
            falhas.push(`${tela.id} · ${tema}: barra em ${anat.fileiras} fileiras no desktop`);
          }
          if (anat.facetasEmFileiraDeChip.length > 0) {
            falhas.push(
              `${tela.id} · ${tema}: ${anat.facetasEmFileiraDeChip.length} faceta(s) ainda em fileira de chips`,
            );
          }
        }
      }
      await ctx.close();
    }
  }

  await navegador.close();
  writeFileSync(join(SHOTS, `${ROTULO}-medicoes.json`), JSON.stringify(medicoes, null, 2));

  // ── As duas conferências de integridade da PRÓPRIA rodada ─────────────────
  //
  // Elas não olham o produto, olham o gate: uma rodada que mediu de menos ou
  // que salvou o mesmo arquivo com dois nomes não é uma rodada aprovada, é uma
  // rodada inválida. Sem isto o gate passa a ser um gerador de PNG com opinião.
  const esperado = TEMAS.length * TAMANHOS.length * TELAS.length;
  if (medicoes.length !== esperado) {
    falhas.push(`rodada incompleta: ${medicoes.length} medição(ões) de ${esperado} esperadas`);
  }
  if (capturas.length !== esperado) {
    falhas.push(`rodada incompleta: ${capturas.length} captura(s) de ${esperado} esperadas`);
  }
  // Mesma tela, mesma largura, temas diferentes, bytes iguais = o tema não
  // entrou. Foi o defeito da 1ª rodada deste gate, e o `data-theme` conferido
  // acima já o pega; este é o cinto do suspensório, porque a prova final que o
  // dono olha é o PNG, não o atributo.
  const porTelaTamanho = new Map();
  for (const c of capturas) {
    const chave = `${c.tela}·${c.tamanho}`;
    const vistos = porTelaTamanho.get(chave) ?? new Map();
    const gemeo = vistos.get(c.sha);
    if (gemeo !== undefined && gemeo !== c.tema) {
      falhas.push(`${c.tela} · ${c.tamanho}: capturas de ${gemeo} e ${c.tema} são byte a byte iguais`);
    }
    vistos.set(c.sha, c.tema);
    porTelaTamanho.set(chave, vistos);
  }

  const resumo = medicoes
    .filter((m) => m.tamanho === 'desktop' && m.tema === 'brasa')
    .map(
      (m) =>
        `  ${m.controle ? '[controle] ' : ''}${m.tela}: ${
          m.erro
            ? `ERRO — ${m.erro}`
            : `${m.fileiras} fileira(s) · barra ${m.barra.h}px · busca ${m.buscaW}px · ${m.facetasEmLista.length} lista(s), ${m.facetasEmFileiraDeChip.length} fileira(s) de chip`
        }`,
    )
    .join('\n');
  console.log(`\nDesktop · brasa:\n${resumo}\n`);

  if (falhas.length > 0) {
    console.error(`REPROVADO (${falhas.length}):\n${falhas.map((f) => `  - ${f}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`Aprovado. Capturas em ${SHOTS}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
