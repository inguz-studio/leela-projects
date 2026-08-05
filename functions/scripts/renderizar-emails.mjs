// =============================================================================
// functions/scripts/renderizar-emails.mjs
//
// Renderiza os 9 e-mails do produto em HTML, com dados de exemplo, para
// `.nirvana/outputs/leela-build-2d6ee98d/emails/` (lane IDENTIDADE-EMAIL).
//
// POR QUE ISTO É ENTREGÁVEL, e não subproduto: gate de código não prova
// estética. A conferência visual é do dono, e é por estes arquivos que ele
// aprova ou reprova a cara dos e-mails. Nenhum navegador é aberto aqui e
// nenhum screenshot é tirado — o script produz o HTML e para.
//
// Compila `email/identidade.ts`, `email/templates.ts` e o entry do `@leela/core`
// para um diretório temporário em CommonJS e carrega dali. Evita depender do
// build inteiro das Functions só para ver um e-mail.
//
// ⚠ POR QUE O CORE ENTRA NA COMPILAÇÃO (conserto · SPEC-CONTAS-LANDING,
// 2026-08-05): o cabeçalho antigo dizia que os dois módulos "não importam nada
// fora de si", e isso deixou de ser verdade em `6993a36a` (S1228-T2), quando o
// template do ingresso passou a importar `formatarCodigoPedido` do core. Desde
// então o script morria com `MODULE_NOT_FOUND` — o entregável que existe para
// o dono conferir a estética dos e-mails simplesmente não rodava, e nenhum
// teste cobria isso porque nenhum teste chama o script. O conserto compila o
// core junto e planta um `node_modules/@leela/core` no temporário, para que a
// resolução do Node encontre o mesmo código que a produção usa em vez de um
// stub que mentiria sobre o formato do código da compra.
//
// USO: npm --prefix functions run email:render
// =============================================================================

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS = resolve(AQUI, '..');
const RAIZ = resolve(FUNCTIONS, '..');
const SAIDA = resolve(RAIZ, '.nirvana/outputs/leela-build-2d6ee98d/emails');

const temp = mkdtempSync(join(tmpdir(), 'leela-emails-'));
try {
  // `process.execPath` + o entry do próprio pacote, não o `.bin` nem `npx`:
  // shim de `.cmd` no Windows não é spawnável sem shell.
  execFileSync(
    process.execPath,
    [
      resolve(FUNCTIONS, 'node_modules/typescript/bin/tsc'),
      'src/email/identidade.ts',
      'src/email/templates.ts',
      '--outDir',
      temp,
      '--module',
      'commonjs',
      '--target',
      'es2022',
      '--skipLibCheck',
    ],
    { cwd: FUNCTIONS, stdio: 'inherit' }
  );

  // O core vai em invocação PRÓPRIA, com o tsconfig DELE. Compilá-lo junto dos
  // dois templates, com flags soltas na linha de comando, produz erros de tipo
  // que só existem porque as opções do pacote (`exactOptionalPropertyTypes` e
  // companhia) não estariam ligadas — o código está certo, a compilação é que
  // estaria errada.
  execFileSync(
    process.execPath,
    [
      resolve(FUNCTIONS, 'node_modules/typescript/bin/tsc'),
      '-p',
      resolve(RAIZ, 'packages/core/tsconfig.json'),
      '--outDir',
      join(temp, 'core'),
      '--module',
      'commonjs',
      // `moduleResolution: bundler` do tsconfig.base é incompatível com
      // `module: commonjs` (TS5095) — a resolução volta para a do Node, que é
      // a que este carregamento em CommonJS de fato usa.
      '--moduleResolution',
      'node10',
      '--declaration',
      'false',
      '--declarationMap',
      'false',
      '--sourceMap',
      'false',
    ],
    { cwd: FUNCTIONS, stdio: 'inherit' }
  );

  // `rootDir` inferido é `src/email`, então os dois .js dos templates caem na
  // raiz do outDir; o core cai em `temp/core/` pelo `rootDir: src` do pacote.
  const TEMPLATES_JS = join(temp, 'templates.js');
  const CORE_JS = join(temp, 'core/index.js');

  // A ponte de resolução: `require('@leela/core')` dentro do templates.js
  // compilado sobe a árvore de diretórios procurando `node_modules`, e é este
  // pacotinho que ele encontra. Ele reexporta o core REAL compilado — nada de
  // stub, porque um stub esconderia divergência de formato do código da compra.
  const SHIM = join(temp, 'node_modules/@leela/core');
  mkdirSync(SHIM, { recursive: true });
  writeFileSync(
    join(SHIM, 'package.json'),
    JSON.stringify({ name: '@leela/core', main: 'index.js' })
  );
  writeFileSync(
    join(SHIM, 'index.js'),
    `module.exports = require(${JSON.stringify(CORE_JS)});\n`
  );

  const require = createRequire(import.meta.url);
  const t = require(TEMPLATES_JS);
  const QRCode = require(resolve(FUNCTIONS, 'node_modules/qrcode'));

  // Um QR de verdade, para o e-mail de ingresso sair como sai na caixa.
  const qrDataUri = await QRCode.toDataURL('LLIP1.exemplo.assinatura', {
    margin: 1,
    width: 360,
    errorCorrectionLevel: 'M',
  });

  const BASE = 'https://leela-landing.web.app';
  const PAINEL = 'https://leela-hub.web.app';

  // Dois links de senha DIFERENTES, e a diferença é o estado real do produto:
  //   · o de "conta criada" ainda sai como o Firebase gera, porque o ponto de
  //     origem dele vive em functions/src/checkout/ — território da lane
  //     PIXREAL-FIX nesta rodada. Falta um argumento lá (ver handoff).
  //   · o de "redefinição" já sai reescrito para a nossa tela, que é o que a
  //     callable solicitarRedefinicaoSenha faz hoje.
  const LINK_SENHA_FIREBASE =
    'https://leela-hub.firebaseapp.com/__/auth/action' +
    '?mode=resetPassword&oobCode=EXEMPLO-oob-code-123&lang=pt-BR';
  const LINK_SENHA_NOSSO =
    `${PAINEL}/redefinir-senha` +
    '?mode=resetPassword&oobCode=EXEMPLO-oob-code-123&lang=pt-BR';

  // Vocabulário da marca (D-0802-1): experiência e participante. Corrida nunca
  // é a categoria — é uma das experiências do hub.
  const EVENTO = 'Retiro Respira Serra';

  const emails = [
    {
      arquivo: '1-ingressos-da-compra.html',
      titulo: 'Ingressos da compra',
      quando: 'Assim que o pagamento é confirmado, para quem comprou.',
      render: () =>
        t.renderIngressosCompraEmail({
          nomeComprador: 'Marina Alves',
          nomeEvento: EVENTO,
          linkEvento: `${BASE}/retiro-respira-serra`,
          ingressos: [
            {
              nome: 'Marina Alves',
              modalidade: 'Vivência de 2 dias',
              codigo: 'H4KQ7M',
              qrDataUri,
              linkIngresso: `${BASE}/ingresso/LLIP1.exemplo.assinatura`,
            },
            {
              nome: 'Felipe Duarte',
              modalidade: 'Vivência de 2 dias',
              codigo: 'R9TXB3',
              qrDataUri,
              linkIngresso: `${BASE}/ingresso/LLIP1.exemplo2.assinatura`,
            },
          ],
        }),
    },
    {
      arquivo: '2-conta-criada-defina-a-senha.html',
      titulo: 'Conta criada, defina a senha',
      quando: 'Primeira compra de um e-mail que ainda não tinha conta. O link ainda cai no handler do Firebase — falta um argumento em functions/src/checkout/contaSemFriccao.ts, território de outra lane nesta rodada.',
      render: () =>
        t.renderContaCriadaEmail({
          nomeComprador: 'Marina Alves',
          nomeEvento: EVENTO,
          linkDefinirSenha: LINK_SENHA_FIREBASE,
        }),
    },
    {
      arquivo: '3-convite-de-afiliado.html',
      titulo: 'Convite de afiliado',
      quando: 'Organizador convida um influenciador para divulgar.',
      render: () =>
        t.renderConviteAfiliadoEmail({
          nomeConvidado: 'Felipe Duarte',
          nomeEvento: EVENTO,
          linkAceite: `${BASE}/convite/afiliado?e=retiro&a=AB12CD34&t=exemplo`,
          expiraEmDias: 14,
        }),
    },
    {
      arquivo: '4-convite-de-assessoria.html',
      titulo: 'Convite de assessoria',
      quando: 'Organizador cadastra uma assessoria parceira sem conta.',
      render: () =>
        t.renderConviteAssessoriaEmail({
          nomeAssessoria: 'Estúdio Passo Firme',
          linkAceite: `${BASE}/convite/assessoria?p=exemplo&t=exemplo`,
          expiraEmDias: 14,
        }),
    },
    {
      arquivo: '5-campanha-do-evento.html',
      titulo: 'Campanha do evento',
      quando: 'Organizador dispara um comunicado para os participantes.',
      render: () =>
        t.renderCampanhaEmail({
          assunto: 'A retirada do kit começa quinta',
          corpo:
            'A retirada do kit abre quinta-feira, das 10h às 20h, na recepção ' +
            'da pousada.\n\nLeve um documento com foto. Quem retira para outra ' +
            'pessoa precisa de uma autorização assinada e de uma cópia do ' +
            'documento dela.\n\nQualquer dúvida é só responder este e-mail.',
          nomeEvento: EVENTO,
        }),
    },
    {
      arquivo: '6-repasse-de-comissao.html',
      titulo: 'Repasse de comissão',
      quando: 'Organizador registra um repasse para o afiliado.',
      render: () =>
        t.renderAvisoRepasseComissaoEmail({
          nomeAfiliado: 'Felipe Duarte',
          nomeEvento: EVENTO,
          valor: 480,
          saldoRestante: 120,
        }),
    },
    {
      arquivo: '7-marco-de-comissao.html',
      titulo: 'Marco de comissão',
      quando: 'A comissão do afiliado cruza uma faixa.',
      render: () =>
        t.renderAvisoMarcoComissaoEmail({
          nomeAfiliado: 'Felipe Duarte',
          nomeEvento: EVENTO,
          faixa: 500,
          acumulada: 640,
        }),
    },
    {
      arquivo: '8-redefinicao-de-senha.html',
      titulo: 'Redefinição de senha',
      quando:
          'Alguém pede "esqueci minha senha". ERA o template genérico do ' +
          'Firebase; agora é nosso, e o link já cai na tela do painel.',
      render: () =>
        t.renderRedefinirSenhaEmail({
          nomeUsuario: 'Marina Alves',
          linkRedefinirSenha: LINK_SENHA_NOSSO,
        }),
    },
    {
      arquivo: '9-codigo-de-acesso.html',
      titulo: 'Código de acesso',
      quando:
        'Alguém pede o código de seis dígitos no "É meu primeiro acesso" ou ' +
        'no "Criar conta" da landing. O texto serve os QUATRO desfechos da ' +
        'RN-477 e NÃO revela se existe conta no endereço — é a única peça do ' +
        'catálogo cuja copy tem restrição de segurança, não de estética.',
      render: () =>
        t.renderCodigoDeAcessoEmail({
          // Zeros à esquerda de propósito no exemplo: é o caso que uma
          // conversão descuidada para número apagaria.
          codigo: '048213',
          validadeMinutos: 10,
        }),
    },
  ];

  mkdirSync(SAIDA, { recursive: true });
  const linhas = [];
  for (const email of emails) {
    const r = email.render();
    writeFileSync(join(SAIDA, email.arquivo), r.html, 'utf8');
    writeFileSync(
      join(SAIDA, email.arquivo.replace(/\.html$/, '.txt')),
      `ASSUNTO: ${r.assunto}\n\n${r.texto}\n`,
      'utf8'
    );
    linhas.push({ ...email, assunto: r.assunto, bytes: r.html.length });
    console.log(`${email.arquivo.padEnd(34)} ${r.html.length} bytes`);
  }

  // Índice: uma página só para o dono percorrer os nove. As cores vêm da MESMA
  // paleta dos e-mails (que espelha os tokens do design system) — a página que
  // apresenta a marca não podia ser a única coisa aqui com hex escolhido na
  // hora.
  const { PALETA, MEDIDAS, FONTE_UI } = require(join(temp, 'identidade.js'));
  const indice =
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Os 9 e-mails da Leela</title>` +
    `<style>body{margin:0;background:${PALETA.canvas};color:${PALETA.tinta};` +
    `font-family:${FONTE_UI};padding:40px 24px;}` +
    `main{max-width:760px;margin:0 auto;}` +
    `h1{font-size:28px;margin:0 0 8px;}p.sub{color:${PALETA.tintaSuave};margin:0 0 32px;}` +
    `ol{padding:0;margin:0;list-style:none;}` +
    `li{background:${PALETA.superficie};border-radius:${MEDIDAS.raio}px;` +
    `padding:20px 24px;margin:0 0 12px;}` +
    `li a{color:${PALETA.wordmark};font-size:19px;font-weight:600;` +
    `text-decoration:none;}li a:hover{text-decoration:underline;}` +
    `li .n{color:${PALETA.tintaFraca};font-size:13px;}` +
    `li .q{color:${PALETA.tintaSuave};font-size:14px;margin:6px 0 0;}` +
    `li .a{color:${PALETA.tintaSuave};font-size:13px;margin:8px 0 0;}` +
    `code{background:${PALETA.destaque};padding:2px 6px;border-radius:4px;font-size:12px;}` +
    `</style></head><body><main>` +
    `<h1>Os 9 e-mails da Leela</h1>` +
    `<p class="sub">Renderizados com dados de exemplo. Cada item abre o HTML ` +
    `como o cliente de e-mail recebe; o <code>.txt</code> ao lado é a versão ` +
    `em texto puro que acompanha toda mensagem.</p><ol>` +
    linhas
      .map(
        (l, i) =>
          `<li><span class="n">${i + 1}</span><br>` +
          `<a href="${l.arquivo}">${l.titulo}</a>` +
          `<p class="q">${l.quando}</p>` +
          `<p class="a">Assunto: ${l.assunto} &middot; ` +
          `<a href="${l.arquivo.replace(/\.html$/, '.txt')}" ` +
          `style="font-size:13px;">versão em texto</a></p></li>`
      )
      .join('') +
    `</ol></main></body></html>`;
  writeFileSync(join(SAIDA, 'index.html'), indice, 'utf8');
  console.log(`\n${emails.length} e-mails + index.html em ${SAIDA}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
