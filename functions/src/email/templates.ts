// =============================================================================
// functions/src/email/templates.ts
//
// Templates transacionais mínimos + SANITIZAÇÃO dos campos do organizador
// (LEELA-R9E · S-R9-14-T3 · RN-137).
//
// AMEAÇA (a review antagonista ataca isto): a superfície de e-mail é vetor
// de phishing/injeção de conteúdo — nome de evento/clube/afiliado e corpo de
// campanha são TEXTO DO ORGANIZADOR (e, transitivamente, de quem o
// organizador copiar). Regras invioláveis:
//   1. NUNCA interpolar cru em HTML: todo campo passa por escapeHtml.
//   2. Control chars fora (inclui CR/LF no ASSUNTO — anti header/línea).
//   3. Caps de tamanho — e-mail não é doc-bomba.
//   4. Links: SÓ URLs http(s) montadas PELO SERVIDOR (linkAceite nasce da
//      base do app + ids validados) — nunca URL vinda do organizador.
//   5. HTML do organizador NÃO é suportado: campanha por e-mail envia o
//      corpo como TEXTO escapado (parágrafos preservados) — nenhum rich
//      text até existir sanitizador de HTML de verdade (decisão registrada).
// =============================================================================

// ---------------------------------------------------------------------------
// Sanitização
// ---------------------------------------------------------------------------

/** Escapa texto para interpolação segura em HTML. @pure */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitiza um campo CURTO vindo do organizador: remove control chars
 * (CR/LF incluídos), colapsa whitespace e aplica cap. @pure
 */
export function limparCampoCurto(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Sanitiza um corpo LONGO (campanha): control chars fora EXCETO \n
 * (parágrafos preservados), cap de tamanho. @pure
 */
export function limparCorpoLongo(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]/g, ' ')
    .trim()
    .slice(0, max);
}

/** Link de app válido para template: http(s), montado pelo servidor. @pure */
export function isLinkDeAppValido(url: unknown): url is string {
  return (
    typeof url === 'string' &&
    url.length > 0 &&
    url.length <= 2048 &&
    /^https?:\/\//.test(url) &&
    // Defesa em profundidade: chars que quebram atributo/URL nunca entram
    // (os ids já vêm encodeURIComponent — isto pega montagem errada).
    !/[\s<>"'\\]/.test(url)
  );
}

/** Caps dos campos (higiene). */
export const TEMPLATE_NOME_MAX = 80;
export const TEMPLATE_ASSUNTO_MAX = 150;
export const TEMPLATE_CORPO_MAX = 10_000;

export interface EmailRenderizado {
  assunto: string;
  html: string;
  texto: string;
}

// ---------------------------------------------------------------------------
// Layout base — a moldura da marca (lane IDENTIDADE-EMAIL)
//
// Até aqui cada template desenhava a própria caixa: fundo bege, cartão branco,
// botão vinho. Nada disso vinha do design system, e o resultado era um e-mail
// que não parecia da Leela. A moldura passou a ser UMA, em `identidade.ts`,
// com cabeçalho de marca, tipografia e cores espelhando os tokens do tema
// `brasa`. O contrato está provado em `__tests__/emailIdentidade.test.ts`.
//
// `layoutBase` sobrevive como a costura fina entre os templates e a moldura:
// os sete render() abaixo seguem chamando a mesma função com os mesmos
// argumentos, então a troca de identidade não mexeu na lógica de nenhum deles.
// ---------------------------------------------------------------------------

import {
  botao,
  blocoDestaque,
  FONTE_UI,
  layoutEmail,
  nota,
  paragrafo,
  PALETA,
  RODAPE_TEXTO,
} from './identidade';

/**
 * @param tituloEsc título JÁ ESCAPADO.
 * @param corpoHtml corpo JÁ ESCAPADO.
 * @param preheader prévia da caixa de entrada, em texto CRU (o layout escapa).
 *        Obrigatória: sem ela o cliente completa a linha de preview com o
 *        começo do corpo, que quase sempre só repete o título. Cru e não
 *        escapado de propósito — passar o `tituloEsc` aqui escaparia duas
 *        vezes e a prévia sairia com `&amp;lt;` na cara do destinatário.
 */
function layoutBase(
  tituloEsc: string,
  corpoHtml: string,
  preheader: string
): string {
  return layoutEmail({ tituloEsc, corpoHtml, preheader });
}

function botaoLink(linkEsc: string, rotuloEsc: string): string {
  return botao(linkEsc, rotuloEsc);
}

/** Pilha monoespaçada — espelha `--font-family-mono` com fallback de e-mail. */
const FONTE_MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

// ---------------------------------------------------------------------------
// Convite de afiliado/influenciador PF (RN-316)
// ---------------------------------------------------------------------------

export interface ConviteAfiliadoEmailInput {
  nomeConvidado: string;
  nomeEvento: string;
  linkAceite: string;
  expiraEmDias: number;
}

export function renderConviteAfiliadoEmail(
  input: ConviteAfiliadoEmailInput
): EmailRenderizado {
  if (!isLinkDeAppValido(input.linkAceite)) {
    throw new Error('linkAceite inválido para template (montagem do servidor).');
  }
  const nome = limparCampoCurto(input.nomeConvidado, TEMPLATE_NOME_MAX) || 'Olá';
  const evento = limparCampoCurto(input.nomeEvento, TEMPLATE_NOME_MAX) || 'um evento';
  const dias = Number.isInteger(input.expiraEmDias) && input.expiraEmDias > 0
    ? input.expiraEmDias
    : 14;
  const nomeEsc = escapeHtml(nome);
  const eventoEsc = escapeHtml(evento);
  const linkEsc = escapeHtml(input.linkAceite);

  const assunto = limparCampoCurto(
    `Convite para divulgar ${evento} na Leela`,
    TEMPLATE_ASSUNTO_MAX
  );
  const html = layoutBase(
    `Convite para divulgar ${eventoEsc}`,
    paragrafo(
      `${nomeEsc}, você foi convidado a divulgar <strong>${eventoEsc}</strong> ` +
        `como influenciador parceiro.`
    ) +
      paragrafo(
        'Ao aceitar, você cria sua conta e passa a acompanhar as conversões do ' +
          'seu link de divulgação.'
      ) +
      botaoLink(linkEsc, 'Aceitar convite') +
      nota(`O convite expira em ${dias} dias.`),
    `${nome}, o convite para divulgar ${evento} expira em ${dias} dias.`
  );
  const texto =
    `${nome}, você foi convidado a divulgar ${evento} como influenciador ` +
    `parceiro na Leela.\n\nAceite o convite: ${input.linkAceite}\n\n` +
    `O convite expira em ${dias} dias.${RODAPE_TEXTO}`;
  return { assunto, html, texto };
}

// ---------------------------------------------------------------------------
// Convite de assessoria parceira (E18 — consumidor `cadastrarAssessoria`)
// ---------------------------------------------------------------------------

export interface ConviteAssessoriaEmailInput {
  nomeAssessoria: string;
  linkAceite: string;
  expiraEmDias: number;
}

export function renderConviteAssessoriaEmail(
  input: ConviteAssessoriaEmailInput
): EmailRenderizado {
  if (!isLinkDeAppValido(input.linkAceite)) {
    throw new Error('linkAceite inválido para template (montagem do servidor).');
  }
  const nome =
    limparCampoCurto(input.nomeAssessoria, TEMPLATE_NOME_MAX) || 'sua assessoria';
  const dias = Number.isInteger(input.expiraEmDias) && input.expiraEmDias > 0
    ? input.expiraEmDias
    : 14;
  const nomeEsc = escapeHtml(nome);
  const linkEsc = escapeHtml(input.linkAceite);

  const assunto = limparCampoCurto(
    `Convite de parceria para ${nome} na Leela`,
    TEMPLATE_ASSUNTO_MAX
  );
  const html = layoutBase(
    `Parceria com ${nomeEsc}`,
    paragrafo(
      `Um organizador convidou <strong>${nomeEsc}</strong> para ser assessoria ` +
        `parceira na Leela.`
    ) +
      paragrafo(
        'Ao aceitar, você cria sua conta de responsável e ativa a parceria, com ' +
          'o clube e a condição de desconto já valendo.'
      ) +
      botaoLink(linkEsc, 'Aceitar parceria') +
      nota(`O convite expira em ${dias} dias.`),
    `O convite de parceria para ${nome} expira em ${dias} dias.`
  );
  const texto =
    `Um organizador convidou ${nome} para ser assessoria parceira na Leela.\n\n` +
    `Aceite o convite: ${input.linkAceite}\n\nO convite expira em ${dias} ` +
    `dias.${RODAPE_TEXTO}`;
  return { assunto, html, texto };
}

// ---------------------------------------------------------------------------
// Conta criada sem fricção (CK2-T3 · RN-155 — consumidor contaSemFriccao)
// ---------------------------------------------------------------------------

export interface ContaCriadaEmailInput {
  nomeComprador: string;
  nomeEvento: string;
  /**
   * Link OFICIAL do Firebase Auth para definir a senha
   * (`generatePasswordResetLink` — oobCode single-use; nunca token próprio).
   */
  linkDefinirSenha: string;
}

export function renderContaCriadaEmail(
  input: ContaCriadaEmailInput
): EmailRenderizado {
  if (!isLinkDeAppValido(input.linkDefinirSenha)) {
    throw new Error('linkDefinirSenha inválido para template (montagem do servidor).');
  }
  const nome = limparCampoCurto(input.nomeComprador, TEMPLATE_NOME_MAX) || 'Olá';
  const evento = limparCampoCurto(input.nomeEvento, TEMPLATE_NOME_MAX) || 'seu evento';
  const nomeEsc = escapeHtml(nome);
  const eventoEsc = escapeHtml(evento);
  const linkEsc = escapeHtml(input.linkDefinirSenha);

  const assunto = limparCampoCurto(
    'Sua conta na Leela foi criada: defina sua senha',
    TEMPLATE_ASSUNTO_MAX
  );
  const html = layoutBase(
    'Sua conta na Leela foi criada',
    paragrafo(
      `${nomeEsc}, sua inscrição em <strong>${eventoEsc}</strong> foi ` +
        `confirmada e criamos uma conta para você acompanhar a compra.`
    ) +
      paragrafo(
        'Defina uma senha para entrar e ver a inscrição quando quiser.'
      ) +
      botaoLink(linkEsc, 'Definir minha senha') +
      nota(
        'Se você não fez esta compra, pode ignorar esta mensagem. Nenhuma senha ' +
          'foi definida.'
      ),
    `${nome}, defina sua senha para acessar sua conta na Leela.`
  );
  const texto =
    `${nome}, sua inscrição em ${evento} foi confirmada e criamos uma conta ` +
    `para você acompanhar a compra.\n\nDefina sua senha: ` +
    `${input.linkDefinirSenha}\n\nSe você não fez esta compra, pode ignorar ` +
    `esta mensagem. Nenhuma senha foi definida.${RODAPE_TEXTO}`;
  return { assunto, html, texto };
}

// ---------------------------------------------------------------------------
// Ingressos da compra (S1206-T6 · RN-398 — consumidor `enviarEmailIngressos`)
//
// A regra que manda neste bloco: o CÓDIGO VAI COMO TEXTO, SEMPRE. Cliente que
// bloqueia imagem é o caso comum, e ingresso não pode depender de imagem
// carregar na véspera da prova. A imagem do QR é o confortável; o texto é o
// que sustenta a manhã do evento.
//
// Por que data URI e não imagem remota: hospedar o PNG do QR numa URL pública
// colocaria a CREDENCIAL (o `qrToken` assinado é a prova de presença) num
// endereço que vaza por log de servidor, referrer e histórico. Data URI fica
// dentro da caixa de quem comprou. O custo é conhecido e assumido — Gmail e o
// Outlook desktop não renderizam data URI —, e é exatamente por isso que a
// RN-398 escreve o código em texto: o caminho degradado É o caminho principal.
// ---------------------------------------------------------------------------

/** Ingresso de um inscrito, pronto para o template (já emitido). */
export interface IngressoDoEmail {
  nome: string;
  modalidade: string;
  /** Código canônico da RN-396 — validado pelo chamador. */
  codigo: string;
  /** Data URI PNG do QR; string vazia quando não foi possível gerar. */
  qrDataUri: string;
  /**
   * Página do ingresso DESTE inscrito (S1214-T3 · RN-423). Um link por
   * INSCRITO, não um por pedido: o token é por inscrito, e é isso que resolve
   * o QR invisível para cada pessoa da compra (o Gmail e o Outlook não
   * renderizam o data URI embutido).
   *
   * Ausente quando não há base pública configurada ou quando o inscrito ainda
   * não tem ingresso emitido. **Ausência é a degradação certa** — link
   * quebrado, ou link para domínio de terceiro, gasta a confiança de quem
   * acabou de pagar (D-ING-8).
   */
  linkIngresso?: string;
}

export interface IngressosCompraEmailInput {
  nomeComprador: string;
  nomeEvento: string;
  /**
   * Página pública do evento — montada pelo servidor (nunca do organizador).
   * OPCIONAL desde o S1214-T3: sem base pública configurada o e-mail sai sem
   * link nenhum, com o código em texto, em vez de sair com URL inventada.
   */
  linkEvento?: string;
  ingressos: readonly IngressoDoEmail[];
}

/** Quantos QR o e-mail embute antes de virar só texto (peso da mensagem). */
export const QR_POR_EMAIL_MAX = 10;

/** Formato canônico do código no template (espelha core/tickets). */
const CODIGO_EMAIL_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Data URI de PNG bem-formado — SÓ base64 de image/png, nada de `svg+xml`
 * (que carrega script) nem de URL externa. Vale para o `src` de `<img>`.
 * @pure
 */
export function isQrDataUriValido(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    valor.length > 0 &&
    valor.length <= 40_000 &&
    /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(valor)
  );
}

export function renderIngressosCompraEmail(
  input: IngressosCompraEmailInput
): EmailRenderizado {
  // Link AUSENTE é caso legítimo (sem base pública — RN-423); link PRESENTE e
  // torto continua sendo erro alto, porque a montagem é do servidor.
  if (input.linkEvento !== undefined && !isLinkDeAppValido(input.linkEvento)) {
    throw new Error('linkEvento inválido para template (montagem do servidor).');
  }
  const nome = limparCampoCurto(input.nomeComprador, TEMPLATE_NOME_MAX) || 'Olá';
  const evento =
    limparCampoCurto(input.nomeEvento, TEMPLATE_NOME_MAX) || 'seu evento';
  const nomeEsc = escapeHtml(nome);
  const eventoEsc = escapeHtml(evento);
  const linkEsc =
    input.linkEvento !== undefined ? escapeHtml(input.linkEvento) : '';

  const blocos: string[] = [];
  const linhasTexto: string[] = [];
  let comQr = 0;

  for (const ingresso of input.ingressos) {
    // Código fora do formato canônico NÃO vira "código" no e-mail: melhor a
    // ausência honesta do que um número que o balcão não acha.
    const codigo = CODIGO_EMAIL_RE.test(ingresso.codigo) ? ingresso.codigo : '';
    const nomeInsc =
      limparCampoCurto(ingresso.nome, TEMPLATE_NOME_MAX) || 'Inscrito';
    const modalidade = limparCampoCurto(ingresso.modalidade, TEMPLATE_NOME_MAX);
    const nomeInscEsc = escapeHtml(nomeInsc);
    const modalidadeEsc = escapeHtml(modalidade);
    const codigoEsc = escapeHtml(codigo);

    const embuteQr =
      codigo !== '' &&
      comQr < QR_POR_EMAIL_MAX &&
      isQrDataUriValido(ingresso.qrDataUri);
    if (embuteQr) comQr++;

    // ACRÉSCIMO ao bloco, nunca reescrita (S1214-T3): o código em texto e o QR
    // embutido continuam exatamente onde estavam. O link é a DEGRADAÇÃO para
    // quem usa cliente que não renderiza data URI, não a troca.
    const linkIngresso = isLinkDeAppValido(ingresso.linkIngresso)
      ? ingresso.linkIngresso
      : '';
    const linkIngressoEsc = escapeHtml(linkIngresso);

    // O bloco de destaque da identidade substitui a caixa com borda bege. A
    // ORDEM e o CONTEÚDO seguem intactos: nome, modalidade, código em texto
    // grande, QR embutido e link com o endereço copiável embaixo.
    blocos.push(
      blocoDestaque(
        `<p style="margin:0 0 2px;font-family:${FONTE_UI};font-size:17px;` +
          `font-weight:700;line-height:24px;color:${PALETA.tinta};">${nomeInscEsc}</p>` +
          (modalidadeEsc !== ''
            ? `<p style="margin:0 0 16px;font-family:${FONTE_UI};font-size:13px;` +
              `line-height:20px;color:${PALETA.tintaSuave};">${modalidadeEsc}</p>`
            : '<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>') +
          (codigo !== ''
            ? `<p style="margin:0 0 16px;font-family:${FONTE_UI};font-size:12px;` +
              `line-height:18px;letter-spacing:0.08em;text-transform:uppercase;` +
              `color:${PALETA.tintaSuave};">Código do ingresso</p>` +
              `<p style="margin:0 0 16px;font-family:${FONTE_MONO};font-size:32px;` +
              `letter-spacing:0.18em;font-weight:700;line-height:40px;` +
              `color:${PALETA.tinta};">${codigoEsc}</p>`
            : `<p style="margin:0 0 16px;font-family:${FONTE_UI};font-size:13px;` +
              `line-height:20px;color:${PALETA.tintaSuave};">Ingresso ainda sendo ` +
              `emitido. O código chega em seguida.</p>`) +
          // `alt` GENÉRICO de propósito: nome de pessoa dentro de atributo é
          // dado do checkout num lugar onde só o escape separa texto de markup.
          // Aqui não separa nada — o nome já está visível logo acima, e o leitor
          // de tela lê os dois na ordem. Um atributo a menos com dado de fora.
          //
          // O QR CONTINUA DATA URI, e isto NÃO contradiz a regra da logo: o
          // `qrToken` é credencial, e hospedá-lo numa URL pública o vazaria por
          // log, referrer e histórico. A logo é pública por natureza e por isso
          // vai por URL. As duas decisões têm a mesma raiz — o que é público vai
          // para a rede, o que prova presença fica na caixa de quem comprou.
          (embuteQr
            ? `<img src="${ingresso.qrDataUri}" width="180" height="180" ` +
              `alt="QR do ingresso" border="0" ` +
              `style="display:block;width:180px;height:180px;border:0;` +
              `background-color:${PALETA.acaoTinta};border-radius:8px;">`
            : '') +
          // Rótulo GENÉRICO, pela mesma razão do `alt` do QR logo acima: o nome
          // já está visível no topo do bloco, e cada repetição de dado do
          // checkout dentro de markup é uma superfície a mais para o escape ter
          // de segurar. O endereço vai abaixo em texto para quem precisa copiar.
          (linkIngresso !== ''
            ? `<p style="margin:16px 0 0;font-family:${FONTE_UI};font-size:15px;` +
              `line-height:22px;">` +
              `<a href="${linkIngressoEsc}" style="color:${PALETA.wordmark};` +
              `font-weight:600;text-decoration:underline;">Abrir este ingresso</a><br>` +
              `<span style="font-size:12px;line-height:18px;color:${PALETA.tintaSuave};` +
              `word-break:break-all;">${linkIngressoEsc}</span></p>`
            : '')
      )
    );

    linhasTexto.push(
      `- ${nomeInsc}${modalidade !== '' ? ` (${modalidade})` : ''}: ` +
        (codigo !== ''
          ? `código ${codigo}`
          : 'ingresso ainda sendo emitido') +
        (linkIngresso !== '' ? `\n  ${linkIngresso}` : '')
    );
  }

  const assunto = limparCampoCurto(
    `Seu ingresso para ${evento}`,
    TEMPLATE_ASSUNTO_MAX
  );
  const html = layoutBase(
    `Seu ingresso para ${eventoEsc}`,
    paragrafo(
      `${nomeEsc}, sua compra foi confirmada. Abaixo está o ingresso de cada ` +
        `participante do pedido.`
    ) +
      (blocos.length > 0
        ? blocos.join('')
        : paragrafo(
            'Os ingressos estão sendo emitidos e chegam em seguida.'
          )) +
      nota(
        'No credenciamento basta apresentar o QR. Se a imagem não abrir no seu ' +
          'e-mail, o código acima identifica a inscrição.'
      ) +
      (linkEsc !== '' ? botaoLink(linkEsc, 'Ver a página do evento') : ''),
    `${nome}, sua compra em ${evento} está confirmada.`
  );
  const texto =
    `${nome}, sua compra em ${evento} foi confirmada.\n\n` +
    `Ingressos do pedido:\n${linhasTexto.join('\n')}\n\n` +
    `No credenciamento basta apresentar o QR que está neste e-mail. Se a ` +
    `imagem não abrir, o código acima identifica a inscrição.` +
    (input.linkEvento !== undefined
      ? `\n\nPágina do evento: ${input.linkEvento}`
      : '') +
    RODAPE_TEXTO;
  return { assunto, html, texto };
}

// ---------------------------------------------------------------------------
// Campanha por e-mail (E06 — consumidor `executarDisparoCampanha`)
// ---------------------------------------------------------------------------

export interface CampanhaEmailInput {
  assunto: string;
  /** Corpo em TEXTO do organizador — HTML não suportado (ver cabeçalho). */
  corpo: string;
  nomeEvento: string;
}

export function renderCampanhaEmail(input: CampanhaEmailInput): EmailRenderizado {
  const assuntoLimpo =
    limparCampoCurto(input.assunto, TEMPLATE_ASSUNTO_MAX) || 'Comunicado do evento';
  const evento = limparCampoCurto(input.nomeEvento, TEMPLATE_NOME_MAX) || 'seu evento';
  const corpo = limparCorpoLongo(input.corpo, TEMPLATE_CORPO_MAX);
  const eventoEsc = escapeHtml(evento);

  // Corpo do organizador: TEXTO escapado, parágrafos preservados (\n\n → <p>).
  const paragrafos = corpo
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => paragrafo(escapeHtml(p).replace(/\n/g, '<br>')))
    .join('');

  const html = layoutBase(
    escapeHtml(assuntoLimpo),
    (paragrafos.length > 0 ? paragrafos : paragrafo('(sem conteúdo)')) +
      nota(`Enviado pelo organizador de ${eventoEsc} pela plataforma Leela.`),
    assuntoLimpo
  );
  const texto =
    `${corpo}\n\n—\nEnviado pelo organizador de ${evento} pela plataforma ` +
    `Leela.${RODAPE_TEXTO}`;
  return { assunto: assuntoLimpo, html, texto };
}

// ---------------------------------------------------------------------------
// Avisos ao AFILIADO (S706-T2 · RN-386 — consumidor `avisoAfiliado.ts`)
//
// ACRÉSCIMO ao catálogo, não reorganização: os blocos acima seguem intactos.
//
// O que estes dois textos podem carregar (RN-318 + RN-172 — minimização): o
// número do PRÓPRIO afiliado, o nome do evento e nada mais. Nenhuma
// identidade de comprador, nenhum número de outro afiliado, nenhum agregado do
// evento. Quem lê o e-mail não descobre nada que já não veja na tela dele.
// ---------------------------------------------------------------------------

/** Reais em pt-BR para dentro do corpo do e-mail. @pure */
function formatBRLEmail(valor: number): string {
  const seguro = Number.isFinite(valor) ? valor : 0;
  return seguro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface AvisoRepasseComissaoEmailInput {
  nomeAfiliado: string;
  nomeEvento: string;
  /** Valor repassado agora. */
  valor: number;
  /** O que continua a receber depois deste repasse. */
  saldoRestante: number;
}

/**
 * "Registraram um repasse de comissão para você" (RN-386).
 * O saldo restante é parte do conteúdo de propósito: com repasse PARCIAL, o
 * aviso sem o resto deixaria o afiliado achando que a conta fechou.
 */
export function renderAvisoRepasseComissaoEmail(
  input: AvisoRepasseComissaoEmailInput
): EmailRenderizado {
  const nome = limparCampoCurto(input.nomeAfiliado, TEMPLATE_NOME_MAX);
  const evento = limparCampoCurto(input.nomeEvento, TEMPLATE_NOME_MAX) || 'seu evento';
  const valor = formatBRLEmail(input.valor);
  const restante = formatBRLEmail(input.saldoRestante);
  const devendo = Number.isFinite(input.saldoRestante) && input.saldoRestante < 0;

  const assunto = `Repasse de comissão registrado · ${evento}`.slice(
    0,
    TEMPLATE_ASSUNTO_MAX
  );
  const saudacao = nome.length > 0 ? `Olá, ${nome}.` : 'Olá.';
  const linhaRestante = devendo
    ? `Seu saldo de comissão ficou negativo (${restante}) porque houve estorno ` +
      `depois de um repasse. Fale com o organizador.`
    : Number.isFinite(input.saldoRestante) && input.saldoRestante > 0
      ? `Você ainda tem ${restante} de comissão a receber neste evento.`
      : `Com isso, sua comissão deste evento está toda repassada.`;

  const html = layoutBase(
    escapeHtml('Repasse de comissão registrado'),
    paragrafo(escapeHtml(saudacao)) +
      paragrafo(
        `O organizador de <strong>${escapeHtml(evento)}</strong> registrou um ` +
          `repasse de <strong>${escapeHtml(valor)}</strong> da sua comissão.`
      ) +
      paragrafo(escapeHtml(linhaRestante)) +
      nota(
        'O pagamento é feito pelo organizador fora da plataforma. Este e-mail é ' +
          'o registro de que ele o informou.'
      ),
    `Repasse de ${valor} registrado em ${evento}.`
  );
  const texto =
    `${saudacao}\n\n` +
    `O organizador de ${evento} registrou um repasse de ${valor} da sua ` +
    `comissão.\n\n${linhaRestante}\n\n—\nO pagamento é feito pelo organizador ` +
    `fora da plataforma; este e-mail é o registro de que ele o informou.` +
    RODAPE_TEXTO;
  return { assunto, html, texto };
}

export interface AvisoMarcoComissaoEmailInput {
  nomeAfiliado: string;
  nomeEvento: string;
  /** Marco alcançado; `0` = primeira comissão do afiliado no evento. */
  faixa: number;
  /** Comissão acumulada depois da conversão que cruzou o marco. */
  acumulada: number;
}

/**
 * "Sua comissão cruzou um marco" (RN-386). Boa notícia, nunca cobrança: o
 * texto não fala de dívida nem de marco perdido por estorno.
 */
export function renderAvisoMarcoComissaoEmail(
  input: AvisoMarcoComissaoEmailInput
): EmailRenderizado {
  const nome = limparCampoCurto(input.nomeAfiliado, TEMPLATE_NOME_MAX);
  const evento = limparCampoCurto(input.nomeEvento, TEMPLATE_NOME_MAX) || 'seu evento';
  const primeira = !Number.isFinite(input.faixa) || input.faixa <= 0;
  const acumulada = formatBRLEmail(input.acumulada);
  const faixaFmt = formatBRLEmail(input.faixa);

  const assunto = (
    primeira
      ? `Sua primeira comissão em ${evento}`
      : `Sua comissão passou de ${faixaFmt} em ${evento}`
  ).slice(0, TEMPLATE_ASSUNTO_MAX);
  const saudacao = nome.length > 0 ? `Olá, ${nome}.` : 'Olá.';
  const manchete = primeira
    ? `Sua primeira comissão em ${evento} entrou.`
    : `Sua comissão em ${evento} passou de ${faixaFmt}.`;

  const html = layoutBase(
    escapeHtml(primeira ? 'Sua primeira comissão' : 'Sua comissão cresceu'),
    paragrafo(escapeHtml(saudacao)) +
      paragrafo(escapeHtml(manchete)) +
      paragrafo(
        `Total acumulado até agora: <strong>${escapeHtml(acumulada)}</strong>.`
      ) +
      nota('O repasse é combinado com o organizador do evento.'),
    manchete
  );
  const texto =
    `${saudacao}\n\n${manchete}\n\nTotal acumulado até agora: ${acumulada}.\n\n` +
    `—\nO repasse é combinado com o organizador do evento.${RODAPE_TEXTO}`;
  return { assunto, html, texto };
}

// ---------------------------------------------------------------------------
// Redefinição de senha (lane IDENTIDADE-EMAIL — consumidor
// `auth/solicitarRedefinicaoSenha`)
//
// O OITAVO e-mail do produto, e o único que até aqui NÃO era nosso: quem
// mandava era o Firebase Auth, com o template padrão dele, remetente
// `noreply@leela-hub.firebaseapp.com` e layout sem marca nenhuma. É o e-mail
// que um cliente novo vê PRIMEIRO, no primeiro acesso, e era o mais genérico
// dos oito.
//
// A partir daqui o Firebase só GERA o link (`generatePasswordResetLink` —
// oobCode single-use, nunca token inventado por nós) e quem envia somos nós,
// pela Brevo, com a mesma moldura dos outros sete. É exatamente o padrão que
// `renderContaCriadaEmail` já usava e que prova que o caminho funciona.
// ---------------------------------------------------------------------------

export interface RedefinirSenhaEmailInput {
  /** Nome de exibição da conta; vazio vira saudação neutra. */
  nomeUsuario: string;
  /** Link OFICIAL do Firebase Auth (`generatePasswordResetLink`). */
  linkRedefinirSenha: string;
}

export function renderRedefinirSenhaEmail(
  input: RedefinirSenhaEmailInput
): EmailRenderizado {
  if (!isLinkDeAppValido(input.linkRedefinirSenha)) {
    throw new Error(
      'linkRedefinirSenha inválido para template (montagem do servidor).'
    );
  }
  const nome = limparCampoCurto(input.nomeUsuario, TEMPLATE_NOME_MAX);
  const nomeEsc = escapeHtml(nome);
  const linkEsc = escapeHtml(input.linkRedefinirSenha);
  const saudacao =
    nome.length > 0
      ? `${nomeEsc}, recebemos um pedido para redefinir a senha da sua conta na Leela.`
      : 'Recebemos um pedido para redefinir a senha da sua conta na Leela.';

  const assunto = limparCampoCurto(
    'Redefinir a senha da sua conta na Leela',
    TEMPLATE_ASSUNTO_MAX
  );
  const html = layoutBase(
    'Redefinir sua senha',
    paragrafo(saudacao) +
      paragrafo('Escolha uma senha nova pelo botão abaixo.') +
      botaoLink(linkEsc, 'Criar nova senha') +
      nota(
        'O link vale por uma hora e serve uma vez só. Se você não pediu a ' +
          'troca, pode ignorar esta mensagem: sua senha atual continua valendo.'
      ),
    'Escolha uma senha nova para entrar na Leela.'
  );
  const texto =
    `${nome.length > 0 ? `${nome}, r` : 'R'}ecebemos um pedido para redefinir ` +
    `a senha da sua conta na Leela.\n\nEscolha uma senha nova: ` +
    `${input.linkRedefinirSenha}\n\nO link vale por uma hora e serve uma vez ` +
    `só. Se você não pediu a troca, pode ignorar esta mensagem: sua senha ` +
    `atual continua valendo.${RODAPE_TEXTO}`;
  return { assunto, html, texto };
}
