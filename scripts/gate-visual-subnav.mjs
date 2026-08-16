// =============================================================================
// Gate visual da SUBNAV-UNIFICA — as áreas nos três tamanhos, mais o popover
// do perfil ABERTO.
//
// Existe porque a rodada anterior deixou dois buracos que só a imagem mostra:
//
//  1. o popover do perfil nunca foi fotografado. Sem `displayName` na sessão do
//     emulador, `RootShell` não passa `footerName`, o rodapé do rail não monta o
//     gatilho e as seis tentativas voltaram com o menu vazio. Aqui o
//     `displayName` é gravado no Auth Emulator ANTES de abrir o navegador — é
//     conserto de fixture, não de produto.
//  2. as fotos de `clube-abas` saíram byte a byte idênticas às de `clubs-area`
//     nos três tamanhos: a navegação para a ficha do clube não aconteceu e a
//     mesma tela foi salva com dois nomes. Aqui a rota do clube é DESCOBERTA no
//     DOM (o primeiro link `/clubes/<id>`) e a captura falha alto se não achar.
//
// A prova que a lane precisa não é a imagem sozinha: é o `borderBottomWidth`
// computado do `<nav>` de cada área, que a Leva 14 mandou para zero. As imagens
// ficam para o dono ver; o número fica para o gate julgar.
// =============================================================================

// `@playwright/test` e não `playwright`: o pacote direto do repo é o do test
// runner (raiz do monorepo), e ele reexporta o `chromium`. Importar `playwright`
// resolve na máquina de quem tem o pacote solto e falha na de quem não tem.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Servido pelo `scripts/mock-campeche.sh up` RODADO NESTE WORKTREE: painel em
// :4602 e Auth Emulator em :9298 (bloco de portas próprio, para não disputar
// com o preview de nenhuma lane vizinha). O build é o da árvore atual — a
// suíte julga o `dist`, e a foto também.
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4602';
const AUTH = process.env.AUTH_URL ?? 'http://127.0.0.1:9298';
const OUT = process.env.OUT_DIR ?? 'C:/dev/LEELA/.nirvana/outputs/leela-subnav-unifica-20260813-resume';

const TAMANHOS = [
  { nome: 'desktop', width: 1440, height: 900 },
  { nome: '768', width: 768, height: 1024 },
  { nome: '375', width: 375, height: 812 },
];

/** Sessões do preview local (auto-login por `?preview=`). */
const IDENTIDADES = {
  castelo: { email: 'marina@demo-leela.dev', nome: 'Marina Duarte' },
  corrida: { email: 'felipe@demo-leela.dev', nome: 'Felipe Prado' },
  admin: { email: 'admin@demo-leela.dev', nome: 'Ana Ribeiro' },
};
const SENHA = 'demo1234';

/**
 * Grava `displayName` no Auth Emulator. Sem isso o gatilho do popover não
 * existe — foi o que travou a leva 16 na rodada anterior.
 */
async function nomearSessao(email, nome) {
  const entrar = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: SENHA, returnSecureToken: true }),
    },
  );
  const sessao = await entrar.json();
  if (!sessao.idToken) throw new Error(`login falhou para ${email}: ${JSON.stringify(sessao)}`);
  const atualizar = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: sessao.idToken, displayName: nome, returnSecureToken: true }),
    },
  );
  const conta = await atualizar.json();
  if (conta.displayName !== nome) throw new Error(`displayName não gravou: ${JSON.stringify(conta)}`);
  return conta.displayName;
}

/** Mede a borda inferior do `<nav>` da área — o número que a Leva 14 zerou. */
async function medirBarra(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label^="Seções"]');
    if (!nav) return { achou: false };
    const estilo = getComputedStyle(nav);
    return {
      achou: true,
      rotulo: nav.getAttribute('aria-label'),
      borderBottomWidth: estilo.borderBottomWidth,
      borderBottomColor: estilo.borderBottomColor,
      abas: nav.querySelectorAll('li').length,
    };
  });
}

/**
 * Conta os itens do menu principal — a Leva 15 levou o rail do produtor de 6
 * para 5, e é o outro número que o dono consegue conferir na própria imagem.
 * O landmark é o mesmo que os testes usam (`RootShell.test`), para a medição da
 * tela e a do teste falarem do mesmo elemento.
 */
async function medirRail(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navegação principal"]');
    if (!nav) return { presente: false };
    const itens = [...nav.querySelectorAll('a[href], button')];
    return {
      presente: true,
      total: itens.length,
      rotulos: itens.map((e) => e.getAttribute('aria-label') ?? e.textContent?.trim() ?? ''),
    };
  });
}

// As duas superfícies de clubs correm na identidade `corrida`, e não em
// `castelo`: quem tem clube no seed é o Felipe (Corrida Perfeita Sul). Na
// Marina a área abre VAZIA — e é por isso que, na rodada anterior, as fotos de
// `clubs-area` e `clube-abas` saíram byte a byte idênticas nos três tamanhos:
// as duas fotografaram a mesma lista vazia, e a ficha do clube nunca apareceu.
// Clubs é a área de REFERÊNCIA desta lane; fotografá-la vazia não prova nada.
/**
 * Abre uma rota e espera a barra da área existir.
 *
 * ⛔ `networkidle` NÃO serve neste painel: os listeners do Firestore mantêm
 * conexão aberta e a rede nunca fica ociosa, então a espera estoura em 30s na
 * segunda navegação em diante. A espera certa é pelo ELEMENTO que vai ser
 * medido, com um respiro depois para o indicador Brasa assentar.
 */
async function abrir(page, url, { exigirNav = true } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (exigirNav) {
    await page
      .locator('nav[aria-label^="Seções"]')
      .first()
      .waitFor({ state: 'attached', timeout: 30000 });
  }
  await page.waitForTimeout(1500);
}

/**
 * Sub-rotas da ÁREA de clubs. `/clubes/:slug` é a ficha de um clube, mas o
 * router declara estes caminhos fixos no mesmo nível — um link para
 * `/clubes/engajamento` casa com o padrão de slug e leva de volta à barra da
 * ÁREA. Foi assim que a primeira tentativa desta rodada fotografou "Seções de
 * clubs" achando que era a ficha, o mesmo erro da rodada anterior com outra
 * roupa.
 */
const NAO_SAO_CLUBES = new Set([
  'engajamento',
  'novo',
  'assessorias',
  'influenciadores',
  'minhas-afiliacoes',
]);

// `rotuloEsperado` é o que impede a foto errada de passar por certa: cada
// superfície declara QUAL barra ela é, e o gate reprova se a tela entregar
// outra. Sem essa trava, duas superfícies diferentes podem devolver a mesma
// imagem e ninguém vê.
const SUPERFICIES = [
  { id: '01-clubs-area', preview: 'corrida', rota: '/clubes', rotuloEsperado: 'Seções de clubs' },
  {
    id: '02-clube-abas',
    preview: 'corrida',
    rota: '/clubes',
    descobrirClube: true,
    rotuloEsperado: 'Seções do club',
  },
  { id: '03-eventos-hub', preview: 'castelo', rota: '/eventos', rotuloEsperado: 'Seções de Eventos' },
  { id: '04-parcerias', preview: 'castelo', rota: '/parcerias', rotuloEsperado: 'Seções de parcerias' },
  { id: '05-crm', preview: 'castelo', rota: '/crm', rotuloEsperado: 'Seções de CRM' },
  {
    id: '06-afiliacoes',
    preview: 'castelo',
    rota: '/parcerias/afiliacoes',
    rotuloEsperado: 'Seções de parcerias',
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });

  const nomes = {};
  for (const [chave, id] of Object.entries(IDENTIDADES)) {
    nomes[chave] = await nomearSessao(id.email, id.nome);
    console.log(`[sessão] ${chave} → displayName = ${nomes[chave]}`);
  }

  const navegador = await chromium.launch();
  const medicao = { base: BASE, em: new Date().toISOString(), superficies: [], popover: null, rail: null };

  for (const tam of TAMANHOS) {
    const contexto = await navegador.newContext({
      viewport: { width: tam.width, height: tam.height },
      deviceScaleFactor: 1,
    });
    const page = await contexto.newPage();

    for (const sup of SUPERFICIES) {
      let rota = sup.rota;
      await abrir(page, `${BASE}${rota}?preview=${sup.preview}`);

      if (sup.descobrirClube) {
        // O card do clube entra na ficha por BOTÃO ("Acessar painel"), não por
        // link — então não há `href` de clube no DOM para descobrir, e é por
        // isso que a busca por `/clubes/<slug>` só achava sub-rota da área. O
        // caminho honesto é o do dono: clicar onde ele clica.
        const acessar = page.getByRole('button', { name: /Acessar painel/i }).first();
        await acessar.waitFor({ state: 'visible', timeout: 30000 });
        await acessar.click();
        await page
          .locator('nav[aria-label="Seções do club"]')
          .first()
          .waitFor({ state: 'attached', timeout: 30000 });
        await page.waitForTimeout(1500);
        rota = new URL(page.url()).pathname;
      }

      const barra = await medirBarra(page);
      if (sup.rotuloEsperado && barra.rotulo !== sup.rotuloEsperado) {
        throw new Error(
          `[${tam.nome}] ${sup.id}: a tela em ${rota} entregou a barra "${barra.rotulo}" e a superfície é "${sup.rotuloEsperado}" — foto de outra tela não vale como prova`,
        );
      }
      const arquivo = `${sup.id}__${tam.nome}.png`;
      await page.screenshot({ path: join(OUT, arquivo), fullPage: false });
      medicao.superficies.push({ id: sup.id, tamanho: tam.nome, rota, arquivo, ...barra });
      console.log(`[${tam.nome}] ${sup.id} ${rota} → borda ${barra.borderBottomWidth ?? 'n/a'} (${barra.rotulo ?? 'sem nav'})`);
    }

    await contexto.close();
  }

  // --- Leva 16 · o popover ABERTO, que a rodada anterior não conseguiu -------
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contexto.newPage();
  await abrir(page, `${BASE}/clubes?preview=castelo`, { exigirNav: false });
  await page.waitForTimeout(2000);

  medicao.rail = await medirRail(page);

  // O gatilho é o botão do rodapé do rail, e o nome acessível dele É o
  // `footerName` (`SidebarRail.tsx`: `aria-label={footerName}`) — com o rail
  // fechado só existe o avatar, então procurar por TEXTO não acha nada. Foi
  // aqui que a rodada anterior encalhou.
  const gatilho = page.getByRole('button', { name: IDENTIDADES.castelo.nome }).first();
  await gatilho.waitFor({ state: 'visible', timeout: 20000 });
  await gatilho.click();
  await page.waitForTimeout(1200);

  const conteudo = await page.evaluate(() => {
    const menu = document.querySelector('[role="menu"]');
    if (!menu) return { aberto: false };
    const itens = [...menu.querySelectorAll('[role="menuitem"]')].map((i) => ({
      rotulo: i.textContent?.trim() ?? '',
      temIcone: Boolean(i.querySelector('svg')),
      nomeAcessivel: i.getAttribute('aria-label') ?? i.textContent?.trim() ?? '',
    }));
    const painel = getComputedStyle(menu);
    return {
      aberto: true,
      itens,
      fundo: painel.backgroundColor,
      cor: painel.color,
    };
  });
  medicao.popover = conteudo;
  await page.screenshot({ path: join(OUT, 'popover-perfil__desktop__aberto.png') });
  console.log('[popover]', JSON.stringify(conteudo));

  await contexto.close();
  await navegador.close();

  writeFileSync(join(OUT, 'medicao.json'), JSON.stringify(medicao, null, 2));

  // --- veredito -------------------------------------------------------------
  const semNav = medicao.superficies.filter((s) => !s.achou);
  const comLinha = medicao.superficies.filter((s) => s.achou && s.borderBottomWidth !== '0px');
  const semIcone = (medicao.popover?.itens ?? []).filter((i) => !i.temIcone);
  const rotulos = (medicao.popover?.itens ?? []).map((i) => i.rotulo);

  console.log('\n=== GATE VISUAL SUBNAV ===');
  console.log(`superfícies medidas: ${medicao.superficies.length}`);
  console.log(`sem <nav> de área:   ${semNav.length} ${semNav.map((s) => s.id + '@' + s.tamanho).join(', ')}`);
  console.log(`com borda inferior:  ${comLinha.length} ${comLinha.map((s) => s.id + '@' + s.tamanho).join(', ')}`);
  console.log(`popover aberto:      ${medicao.popover?.aberto ? 'sim' : 'NÃO'} · itens: ${rotulos.join(' | ')}`);
  console.log(`itens sem ícone:     ${semIcone.length}`);

  const falhou =
    semNav.length > 0 ||
    comLinha.length > 0 ||
    !medicao.popover?.aberto ||
    semIcone.length > 0 ||
    rotulos[rotulos.length - 1] !== 'Sair';
  console.log(falhou ? 'GATE VISUAL: FAIL' : 'GATE VISUAL: PASS');
  process.exit(falhou ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
