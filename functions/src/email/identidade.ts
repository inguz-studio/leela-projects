// =============================================================================
// functions/src/email/identidade.ts
//
// O SISTEMA VISUAL de e-mail da Leela: um cabeçalho, um rodapé e um layout,
// compartilhados por TODOS os templates (lane IDENTIDADE-EMAIL · trace
// leela-build-2d6ee98d). Nenhum template desenha moldura própria.
//
// -----------------------------------------------------------------------------
// 1. POR QUE VALOR LITERAL AQUI, se a casa proíbe cor fora de token
// -----------------------------------------------------------------------------
// Cliente de e-mail não resolve `var(--surface-base)`: não há cascata, não há
// folha externa, e metade dos motores nem lê `<style>` no `<head>`. O HTML sai
// com o número dentro do atributo `style` ou não sai com cor nenhuma.
//
// A regra da governança (§1: "zero cor hardcoded fora de token") continua
// valendo, e é cumprida por ESPELHO PROVADO, não por confiança: cada entrada de
// `PALETA` declara de qual token do design system ela veio, e
// `__tests__/emailIdentidade.test.ts` lê `packages/design-system/themes/
// index.css`, resolve a cadeia de `var()` até o primitivo e REPROVA se algum
// literal daqui divergir do token. Trocar `#161616` por um hex escolhido na
// hora quebra a suíte.
//
// -----------------------------------------------------------------------------
// 2. A ARMADILHA DO GMAIL — por que a logo é URL e não data URI
// -----------------------------------------------------------------------------
// O Gmail descarta `src="data:image/..."`. O produto já pagou por isso uma vez:
// o QR do ingresso virou link porque o data URI não aparecia justamente no
// cliente mais usado (decisão do item 55, registrada em `templates.ts`). Repetir
// o padrão com a logo daria uma marca invisível na maioria das caixas.
//
// Então a logo é `https://leela-landing.web.app/brand/leela-wordmark-email.png`:
//   - PNG, não SVG. Gmail (web/Android/iOS), Outlook, Yahoo e AOL descartam SVG.
//   - Opaco, sem canal alfa, já composto contra `--surface-base`. O motor Word
//     do Outlook 2007-2016 compõe alfa contra branco e deixaria franja clara.
//   - Servido pela LANDING, não pelo Storage: `apps/landing/public/**` cai na
//     raiz do site (provado — `/brand/leela-wordmark-cream.svg` responde 200
//     hoje), com cache de Hosting e sem sessão. O bucket de Storage foi
//     descartado porque as `storage.rules` são deny-by-default com allowlist de
//     path (ADR-016): abrir um path de marca exigiria mexer nas Rules, o que é
//     mais superfície de segurança do que este problema merece.
//   - Gerado por `scripts/brand/gerar-logo-email.mjs` a partir do wordmark
//     oficial, com `--check` no gate para o PNG nunca sair de sincronia.
//
// IMAGEM BLOQUEADA É O CASO NORMAL, não a exceção. O `alt` da logo é estilizado
// (mesma tinta, mesmo peso, mesmo tracking do wordmark), então quando o cliente
// bloqueia a imagem o cabeçalho continua sendo um wordmark legível em vez de um
// ícone quebrado. `width`/`height` fixos evitam o pulo de layout, e a faixa da
// marca é pintada pelo `<td>`, não pela imagem: o bloco não desmonta sem ela.
//
// -----------------------------------------------------------------------------
// 3. MODO ESCURO — a postura e a prova
// -----------------------------------------------------------------------------
// POSTURA: DARK-FIRST. A identidade do produto já é escura (o tema `brasa` é o
// que a landing e o painel fixam no `<html data-theme>`), então o e-mail nasce
// escuro em vez de nascer claro e apanhar da inversão. Um fundo de marca claro
// com texto escuro é exatamente o que os clientes reescrevem em modo escuro.
//
// Declaramos `color-scheme: dark` e `supported-color-schemes: dark` (meta +
// `<style>`): Apple Mail, iOS Mail e Outlook leem isso como "esta mensagem já
// trata modo escuro" e param de inverter por conta própria.
//
// Para os motores que invertem assim mesmo, a paleta foi ESCOLHIDA para
// sobreviver: todo par texto/fundo passa AA tanto como escrito quanto sob
// inversão mecânica (`255 - canal`), com os números no teste. A regra que caiu
// dessa conta, e que o teste protege:
//
//   O LARANJA DA MARCA NUNCA É TEXTO. `#FF450C` sobre `#161616` invertido vira
//   `#00BAF3` sobre `#E9E9E9` — 2,03:1, ilegível. O laranja só aparece como
//   fundo de ação (com `--action-primary-fg` por cima, 4,81:1 escrito e 10,99:1
//   invertido) e como filete decorativo, que não carrega texto.
//
// -----------------------------------------------------------------------------
// 4. RESTRIÇÕES DE E-MAIL QUE O LAYOUT RESPEITA
// -----------------------------------------------------------------------------
// Tabela, nunca flex/grid (o Word engine não implementa nenhum dos dois). CSS
// inline no atributo `style`, mais `bgcolor` no `<td>` porque alguns motores
// preservam o atributo e descartam a propriedade. Largura máxima de 600px.
// Nenhuma folha externa e nenhuma webfont remota: o Gmail descartaria o `link`
// e o resto ganharia uma requisição a mais por nada — a tipografia da marca
// entra pelo wordmark, que é imagem, e o corpo usa a pilha segura do sistema.
// =============================================================================

/**
 * Endereço público da logo. HTTPS, estável, servido pelo Hosting da landing.
 *
 * Constante e não derivada de `LEELA_PUBLIC_URL` de propósito: a base pública é
 * legitimamente ausente em alguns ambientes (RN-423 / D-ING-8) e um e-mail sem
 * marca por causa de config faltando seria a regressão que esta lane existe
 * para matar. O endereço da marca não é configuração de tenant.
 */
export const URL_LOGO_EMAIL =
  'https://leela-landing.web.app/brand/leela-wordmark-email.png';

/**
 * Paleta do e-mail. Cada entrada ESPELHA um token do design system (tema
 * `brasa`); o teste de contrato resolve o token e reprova a divergência.
 */
export const PALETA = {
  /** `--surface-sunken` → `--neutral-975`. Moldura fora do cartão. */
  canvas: '#0A0A0A',
  /**
   * `--surface-raised-opaque` → `--neutral-900`. O cartão da mensagem.
   * NÃO `--surface-raised` puro: esse token virou switchável por
   * `[data-glass="on"]` (brasa.css) — filme translúcido `rgba(30,11,16,.42)`
   * no modo vidro opcional da UI. E-mail não compõe alfa de forma confiável
   * (Word engine do Outlook, entre outros), então usa sempre o companheiro
   * opaco — o mesmo que `--popover` já usa no design system pelo mesmo
   * motivo. Ver comentário de `M1` em `emailIdentidade.test.ts`.
   */
  superficie: '#161616',
  /** `--surface-base` → `--neutral-950`. Faixa da marca no topo. */
  faixaMarca: '#0C0C0C',
  /** `--border-brand` → `--primary-500`. Filete da marca. NUNCA texto. */
  fileteMarca: '#FF450C',
  /** `--email-wordmark-ink` → `--brand-wordmark`. Tinta do wordmark. */
  wordmark: '#C8E84A',
  /** `--text-primary` → `--neutral-50`. */
  tinta: '#F9F9F9',
  /** `--text-secondary` → `--neutral-300`. */
  tintaSuave: '#BFBFBF',
  /** `--text-tertiary` → `--neutral-400`. Só letra miúda. */
  tintaFraca: '#999999',
  /** `--border-subtle` → `--neutral-800`. */
  borda: '#242424',
  /** `--action-primary`. Fundo de ação — o laranja legível com branco. */
  acaoFundo: '#D63500',
  /** `--action-primary-fg` → `--neutral-0`. */
  acaoTinta: '#FFFFFF',
  /**
   * `--surface-overlay-opaque` → `--neutral-850`. Bloco de destaque/código.
   * Mesmo motivo do `superficie` acima: `--surface-overlay` puro vira filme
   * translúcido sob `[data-glass="on"]`; o e-mail fica com o companheiro
   * opaco.
   */
  destaque: '#1C1C1C',
} as const;

/** Medidas do e-mail. Espelham o grupo `email` de `tokens/component.json`. */
export const MEDIDAS = {
  /** `--email-width-max`. */
  largura: 600,
  /** `--email-gutter` → `--spacing-8`. */
  gutter: 32,
  /** `--email-block-gap` → `--spacing-6`. */
  blocoGap: 24,
  /** `--email-radius` → `--radius-lg`. */
  raio: 12,
  /** `--email-header-py` → `--spacing-6`. */
  headerPy: 24,
  /** `--email-header-rule`. */
  filete: 3,
  /** `--email-logo-w`. */
  logoW: 150,
  /** `--email-logo-h`. */
  logoH: 44,
  /** `--email-code-size` → `--font-size-2xl` (2rem = 32px). */
  codigo: 32,
} as const;

/**
 * Pilha tipográfica. `Exo 2` é a fonte da marca (`--font-family-ui`) e vale
 * quando a máquina de quem lê já a tem; o resto é a pilha segura de e-mail.
 * Sem `@import` e sem `<link>` para webfont: o Gmail descarta os dois.
 */
export const FONTE_UI = "'Exo 2','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONTE = FONTE_UI;

/** Escapa texto para interpolação segura em HTML. @pure */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Cabeçalho
// ---------------------------------------------------------------------------

/**
 * A faixa da marca. A COR É DO `<td>`, não da imagem: com a imagem bloqueada o
 * fundo continua lá e o `alt` estilizado ocupa o lugar do wordmark.
 */
function cabecalho(): string {
  return (
    `<tr>` +
    `<td bgcolor="${PALETA.faixaMarca}" align="center" ` +
    `style="background-color:${PALETA.faixaMarca};padding:${MEDIDAS.headerPy}px ${MEDIDAS.gutter}px;` +
    `border-radius:${MEDIDAS.raio}px ${MEDIDAS.raio}px 0 0;">` +
    `<img src="${URL_LOGO_EMAIL}" width="${MEDIDAS.logoW}" height="${MEDIDAS.logoH}" ` +
    `alt="Leela" border="0" ` +
    // O `style` do `<img>` é o que pinta o TEXTO ALTERNATIVO quando o cliente
    // bloqueia a imagem: mesma tinta, mesmo peso e mesmo tracking do wordmark.
    `style="display:block;width:${MEDIDAS.logoW}px;height:${MEDIDAS.logoH}px;border:0;` +
    `outline:none;text-decoration:none;color:${PALETA.wordmark};font-family:${FONTE};` +
    `font-size:26px;font-weight:800;letter-spacing:0.14em;line-height:${MEDIDAS.logoH}px;">` +
    `</td></tr>` +
    // Filete da marca: decoração pura, sem texto por cima (ver §3 do cabeçalho).
    `<tr><td bgcolor="${PALETA.fileteMarca}" ` +
    `style="background-color:${PALETA.fileteMarca};height:${MEDIDAS.filete}px;` +
    `line-height:${MEDIDAS.filete}px;font-size:0;">&nbsp;</td></tr>`
  );
}

// ---------------------------------------------------------------------------
// Rodapé
// ---------------------------------------------------------------------------

function rodape(nota: string): string {
  return (
    `<tr><td bgcolor="${PALETA.superficie}" ` +
    `style="background-color:${PALETA.superficie};padding:0 ${MEDIDAS.gutter}px;` +
    `border-radius:0 0 ${MEDIDAS.raio}px ${MEDIDAS.raio}px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
    `<tr><td style="border-top:1px solid ${PALETA.borda};padding:${MEDIDAS.blocoGap}px 0;">` +
    `<p style="margin:0;font-family:${FONTE};font-size:13px;line-height:20px;` +
    `color:${PALETA.tintaSuave};">${nota}</p>` +
    `</td></tr></table></td></tr>` +
    `<tr><td align="center" style="padding:${MEDIDAS.blocoGap}px ${MEDIDAS.gutter}px 0;">` +
    `<p style="margin:0;font-family:${FONTE};font-size:12px;line-height:18px;` +
    `color:${PALETA.tintaSuave};">Leela &middot; experiências de bem-estar</p>` +
    `</td></tr>`
  );
}

/** Nota de rodapé padrão. */
export const NOTA_TRANSACIONAL =
  'Esta mensagem faz parte do seu cadastro na Leela. Se você não reconhece este ' +
  'contato, pode ignorar sem fazer nada.';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface LayoutEmailInput {
  /** Título visível no topo do corpo. JÁ ESCAPADO pelo chamador. */
  tituloEsc: string;
  /** Corpo pronto. JÁ ESCAPADO pelo chamador. */
  corpoHtml: string;
  /**
   * Linha de prévia da caixa de entrada. Texto CRU (escapado aqui). Sem ela o
   * cliente exibe o começo do corpo, que costuma ser o mesmo do título.
   */
  preheader: string;
  /** Nota do rodapé; default é a transacional. JÁ ESCAPADA pelo chamador. */
  rodapeNotaEsc?: string;
}

/**
 * A moldura de TODOS os e-mails do produto. Tabela, CSS inline, 600px,
 * dark-first com `color-scheme` declarado.
 */
export function layoutEmail(input: LayoutEmailInput): string {
  const nota = input.rodapeNotaEsc ?? esc(NOTA_TRANSACIONAL);
  return (
    `<!doctype html>` +
    `<html lang="pt-BR">` +
    `<head>` +
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    // Os dois metas + a regra são o contrato com Apple Mail/iOS/Outlook: "esta
    // mensagem já é escura, não inverta". Único `<style>` do documento; todo o
    // resto é inline, porque o Gmail e o Outlook não garantem `<style>`.
    `<meta name="color-scheme" content="dark">` +
    `<meta name="supported-color-schemes" content="dark">` +
    `<title>${input.tituloEsc}</title>` +
    `<style>:root{color-scheme:dark;supported-color-schemes:dark;}` +
    `body{margin:0!important;padding:0!important;width:100%!important;}` +
    `table{border-collapse:collapse;}` +
    `img{-ms-interpolation-mode:bicubic;}` +
    `a{color:${PALETA.wordmark};}` +
    `@media only screen and (max-width:620px){` +
    `.leela-gutter{padding-left:20px!important;padding-right:20px!important;}}` +
    `</style>` +
    `</head>` +
    `<body bgcolor="${PALETA.canvas}" ` +
    `style="margin:0;padding:0;background-color:${PALETA.canvas};">` +
    // Prévia da caixa de entrada: lida pelo cliente, invisível no corpo. O
    // preenchimento com espaço largo impede que o cliente complete a prévia
    // com o começo do corpo.
    `<div style="display:none;font-size:1px;line-height:1px;max-height:0;` +
    `max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(input.preheader)}` +
    '&#8199;&#65279;&#847;'.repeat(30) +
    `</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `bgcolor="${PALETA.canvas}" style="background-color:${PALETA.canvas};">` +
    `<tr><td align="center" style="padding:${MEDIDAS.gutter}px 12px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `width="${MEDIDAS.largura}" ` +
    `style="width:100%;max-width:${MEDIDAS.largura}px;">` +
    cabecalho() +
    `<tr><td class="leela-gutter" bgcolor="${PALETA.superficie}" ` +
    `style="background-color:${PALETA.superficie};padding:${MEDIDAS.gutter}px ${MEDIDAS.gutter}px 0;">` +
    `<h1 style="margin:0 0 ${MEDIDAS.blocoGap}px;font-family:${FONTE};font-size:24px;` +
    `line-height:32px;font-weight:700;color:${PALETA.tinta};">${input.tituloEsc}</h1>` +
    input.corpoHtml +
    `</td></tr>` +
    rodape(nota) +
    `</table></td></tr></table></body></html>`
  );
}

// ---------------------------------------------------------------------------
// Peças de conteúdo
// ---------------------------------------------------------------------------

/** Parágrafo do corpo. Conteúdo JÁ ESCAPADO. @pure */
export function paragrafo(html: string, suave = false): string {
  return (
    `<p style="margin:0 0 ${MEDIDAS.blocoGap}px;font-family:${FONTE};font-size:16px;` +
    `line-height:26px;color:${suave ? PALETA.tintaSuave : PALETA.tinta};">${html}</p>`
  );
}

/** Letra miúda do corpo. Conteúdo JÁ ESCAPADO. @pure */
export function nota(html: string): string {
  return (
    `<p style="margin:0 0 ${MEDIDAS.blocoGap}px;font-family:${FONTE};font-size:13px;` +
    `line-height:20px;color:${PALETA.tintaSuave};">${html}</p>`
  );
}

/**
 * Botão de ação. Tabela com `bgcolor` no `<td>` (o único botão que o Word
 * engine do Outlook pinta sem VML), mais o endereço em texto embaixo: link que
 * não abre no cliente do trabalho ainda pode ser copiado.
 *
 * @param linkEsc endereço JÁ ESCAPADO e JÁ VALIDADO pelo chamador.
 */
export function botao(linkEsc: string, rotuloEsc: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin:0 0 ${MEDIDAS.blocoGap}px;"><tr>` +
    `<td bgcolor="${PALETA.acaoFundo}" align="center" ` +
    `style="background-color:${PALETA.acaoFundo};border-radius:6px;">` +
    `<a href="${linkEsc}" style="display:inline-block;padding:14px 28px;` +
    `font-family:${FONTE};font-size:16px;font-weight:600;line-height:20px;` +
    `color:${PALETA.acaoTinta};text-decoration:none;">${rotuloEsc}</a>` +
    `</td></tr></table>` +
    `<p style="margin:0 0 ${MEDIDAS.blocoGap}px;font-family:${FONTE};font-size:13px;` +
    `line-height:20px;color:${PALETA.tintaSuave};">Se o botão não abrir, copie este ` +
    `endereço no navegador:<br>` +
    `<span style="color:${PALETA.tintaSuave};word-break:break-all;">${linkEsc}</span></p>`
  );
}

/**
 * Bloco de destaque (o cartão dentro do cartão). Usado pelo ingresso e por
 * qualquer conteúdo que precise se separar do corpo.
 *
 * @param slot nome do papel do bloco, publicado como `data-slot` — a MESMA
 *        convenção que `data-slot="brand-logo"` já usa no painel e na landing.
 *        Cliente de e-mail ignora atributo que não conhece, e em troca existe
 *        uma costura ESTÁVEL para separar um bloco do outro. Sem ela, quem
 *        precisa dessa fronteira acaba fatiando o HTML por um pedaço de CSS
 *        (era `'<div style="border:1px solid'`), que quebra na primeira vez
 *        que alguém mexe no visual.
 */
export function blocoDestaque(conteudoHtml: string, slot = 'destaque'): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `style="margin:0 0 ${MEDIDAS.blocoGap}px;"><tr>` +
    `<td data-slot="${slot}" bgcolor="${PALETA.destaque}" ` +
    `style="background-color:${PALETA.destaque};border-radius:${MEDIDAS.raio}px;` +
    `padding:20px;">${conteudoHtml}</td></tr></table>`
  );
}

/** Rodapé em TEXTO puro, espelho do rodapé visual (todo template usa). */
export const RODAPE_TEXTO = `\n\n—\nLeela · experiências de bem-estar\n${NOTA_TRANSACIONAL}`;
