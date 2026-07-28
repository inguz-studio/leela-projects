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
// Layout base (inline, sem assets externos — e-mail transacional enxuto)
// ---------------------------------------------------------------------------

function layoutBase(tituloEsc: string, corpoHtml: string): string {
  return (
    `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;` +
    `background:#f6f5f2;font-family:Arial,Helvetica,sans-serif;color:#1e1b16;">` +
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;` +
    `border-radius:12px;padding:32px;">` +
    `<h1 style="margin:0 0 16px;font-size:20px;">${tituloEsc}</h1>` +
    corpoHtml +
    `<p style="margin:24px 0 0;font-size:12px;color:#6f675c;">` +
    `Este é um e-mail transacional da plataforma Leela. Se você não esperava ` +
    `este convite, ignore esta mensagem.</p>` +
    `</div></body></html>`
  );
}

function botaoLink(linkEsc: string, rotuloEsc: string): string {
  return (
    `<p style="margin:24px 0;">` +
    `<a href="${linkEsc}" style="display:inline-block;background:#5b2333;` +
    `color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;` +
    `font-weight:bold;">${rotuloEsc}</a></p>` +
    `<p style="margin:0;font-size:12px;color:#6f675c;">Se o botão não abrir, ` +
    `copie e cole este endereço no navegador:<br>${linkEsc}</p>`
  );
}

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
    `<p style="margin:0 0 12px;">${nomeEsc}, você foi convidado(a) a divulgar ` +
      `<strong>${eventoEsc}</strong> como influenciador(a) parceiro(a).</p>` +
      `<p style="margin:0 0 12px;">Ao aceitar, você cria sua conta e passa a ` +
      `acompanhar as conversões do seu link de divulgação.</p>` +
      botaoLink(linkEsc, 'Aceitar convite') +
      `<p style="margin:16px 0 0;font-size:12px;color:#6f675c;">O convite ` +
      `expira em ${dias} dias.</p>`
  );
  const texto =
    `${nome}, você foi convidado(a) a divulgar ${evento} como influenciador(a) ` +
    `parceiro(a) na Leela.\n\nAceite o convite: ${input.linkAceite}\n\n` +
    `O convite expira em ${dias} dias. Se você não esperava este convite, ` +
    `ignore esta mensagem.`;
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
    `<p style="margin:0 0 12px;">Um organizador de eventos convidou ` +
      `<strong>${nomeEsc}</strong> para ser assessoria parceira na Leela.</p>` +
      `<p style="margin:0 0 12px;">Ao aceitar, você cria sua conta de ` +
      `responsável e ativa a parceria (clube + condição de desconto).</p>` +
      botaoLink(linkEsc, 'Aceitar parceria') +
      `<p style="margin:16px 0 0;font-size:12px;color:#6f675c;">O convite ` +
      `expira em ${dias} dias.</p>`
  );
  const texto =
    `Um organizador convidou ${nome} para ser assessoria parceira na Leela.\n\n` +
    `Aceite o convite: ${input.linkAceite}\n\nO convite expira em ${dias} ` +
    `dias. Se você não esperava este convite, ignore esta mensagem.`;
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
    'Sua conta na Leela foi criada — defina sua senha',
    TEMPLATE_ASSUNTO_MAX
  );
  const html = layoutBase(
    'Sua conta na Leela foi criada',
    `<p style="margin:0 0 12px;">${nomeEsc}, sua inscrição em ` +
      `<strong>${eventoEsc}</strong> foi confirmada e criamos uma conta para ` +
      `você acompanhar a compra.</p>` +
      `<p style="margin:0 0 12px;">Defina uma senha para acessar sua conta e ` +
      `visualizar a inscrição quando quiser.</p>` +
      botaoLink(linkEsc, 'Definir minha senha') +
      `<p style="margin:16px 0 0;font-size:12px;color:#6f675c;">Se você não ` +
      `fez esta compra, ignore esta mensagem — nenhuma senha foi definida.</p>`
  );
  const texto =
    `${nome}, sua inscrição em ${evento} foi confirmada e criamos uma conta ` +
    `para você acompanhar a compra.\n\nDefina sua senha: ` +
    `${input.linkDefinirSenha}\n\nSe você não fez esta compra, ignore esta ` +
    `mensagem — nenhuma senha foi definida.`;
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
}

export interface IngressosCompraEmailInput {
  nomeComprador: string;
  nomeEvento: string;
  /** Página pública do evento — montada pelo servidor (nunca do organizador). */
  linkEvento: string;
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
  if (!isLinkDeAppValido(input.linkEvento)) {
    throw new Error('linkEvento inválido para template (montagem do servidor).');
  }
  const nome = limparCampoCurto(input.nomeComprador, TEMPLATE_NOME_MAX) || 'Olá';
  const evento =
    limparCampoCurto(input.nomeEvento, TEMPLATE_NOME_MAX) || 'seu evento';
  const nomeEsc = escapeHtml(nome);
  const eventoEsc = escapeHtml(evento);
  const linkEsc = escapeHtml(input.linkEvento);

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

    blocos.push(
      `<div style="border:1px solid #e4e0d8;border-radius:12px;padding:16px;` +
        `margin:0 0 12px;">` +
        `<p style="margin:0 0 4px;font-size:16px;font-weight:bold;">${nomeInscEsc}</p>` +
        (modalidadeEsc !== ''
          ? `<p style="margin:0 0 12px;font-size:13px;color:#6f675c;">${modalidadeEsc}</p>`
          : '') +
        (codigo !== ''
          ? `<p style="margin:0 0 12px;font-size:13px;color:#6f675c;">` +
            `Código do ingresso<br>` +
            `<span style="font-size:24px;letter-spacing:3px;font-weight:bold;` +
            `color:#1e1b16;">${codigoEsc}</span></p>`
          : `<p style="margin:0 0 12px;font-size:13px;color:#6f675c;">` +
            `Ingresso ainda sendo emitido — o código chega em seguida.</p>`) +
        // `alt` GENÉRICO de propósito: nome de pessoa dentro de atributo é
        // dado do checkout num lugar onde só o escape separa texto de markup.
        // Aqui não separa nada — o nome já está visível logo acima, e o leitor
        // de tela lê os dois na ordem. Um atributo a menos com dado de fora.
        (embuteQr
          ? `<img src="${ingresso.qrDataUri}" width="180" height="180" ` +
            `alt="QR do ingresso" ` +
            `style="display:block;width:180px;height:180px;">`
          : '') +
        `</div>`
    );

    linhasTexto.push(
      `- ${nomeInsc}${modalidade !== '' ? ` (${modalidade})` : ''}: ` +
        (codigo !== ''
          ? `código ${codigo}`
          : 'ingresso ainda sendo emitido')
    );
  }

  const assunto = limparCampoCurto(
    `Seu ingresso para ${evento}`,
    TEMPLATE_ASSUNTO_MAX
  );
  const html = layoutBase(
    `Seu ingresso para ${eventoEsc}`,
    `<p style="margin:0 0 16px;">${nomeEsc}, sua compra foi confirmada. ` +
      `Abaixo está o ingresso de cada inscrito do pedido.</p>` +
      (blocos.length > 0
        ? blocos.join('')
        : `<p style="margin:0 0 12px;">Os ingressos estão sendo emitidos e ` +
          `chegam em seguida.</p>`) +
      `<p style="margin:16px 0 0;font-size:13px;color:#6f675c;">` +
      `No credenciamento basta apresentar o QR. Se a imagem não abrir no seu ` +
      `e-mail, o código acima identifica a inscrição.</p>` +
      botaoLink(linkEsc, 'Ver a página do evento')
  );
  const texto =
    `${nome}, sua compra em ${evento} foi confirmada.\n\n` +
    `Ingressos do pedido:\n${linhasTexto.join('\n')}\n\n` +
    `No credenciamento basta apresentar o QR que está neste e-mail. Se a ` +
    `imagem não abrir, o código acima identifica a inscrição.\n\n` +
    `Página do evento: ${input.linkEvento}`;
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
    .map(
      (p) =>
        `<p style="margin:0 0 12px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
    )
    .join('');

  const html = layoutBase(
    escapeHtml(assuntoLimpo),
    (paragrafos.length > 0
      ? paragrafos
      : `<p style="margin:0 0 12px;">(sem conteúdo)</p>`) +
      `<p style="margin:16px 0 0;font-size:12px;color:#6f675c;">Enviado pelo ` +
      `organizador de ${eventoEsc} pela plataforma Leela.</p>`
  );
  const texto =
    `${corpo}\n\n—\nEnviado pelo organizador de ${evento} pela plataforma Leela.`;
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

  const assunto = `Repasse de comissão registrado — ${evento}`.slice(
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
    `<p style="margin:0 0 12px;">${escapeHtml(saudacao)}</p>` +
      `<p style="margin:0 0 12px;">O organizador de <strong>${escapeHtml(evento)}` +
      `</strong> registrou um repasse de <strong>${escapeHtml(valor)}</strong> ` +
      `da sua comissão.</p>` +
      `<p style="margin:0 0 12px;">${escapeHtml(linhaRestante)}</p>` +
      `<p style="margin:16px 0 0;font-size:12px;color:#6f675c;">O pagamento é ` +
      `feito pelo organizador fora da plataforma — este e-mail é o registro de ` +
      `que ele o informou.</p>`
  );
  const texto =
    `${saudacao}\n\n` +
    `O organizador de ${evento} registrou um repasse de ${valor} da sua ` +
    `comissão.\n\n${linhaRestante}\n\n—\nO pagamento é feito pelo organizador ` +
    `fora da plataforma; este e-mail é o registro de que ele o informou.`;
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
    `<p style="margin:0 0 12px;">${escapeHtml(saudacao)}</p>` +
      `<p style="margin:0 0 12px;">${escapeHtml(manchete)}</p>` +
      `<p style="margin:0 0 12px;">Total acumulado até agora: ` +
      `<strong>${escapeHtml(acumulada)}</strong>.</p>` +
      `<p style="margin:16px 0 0;font-size:12px;color:#6f675c;">O repasse é ` +
      `combinado com o organizador do evento.</p>`
  );
  const texto =
    `${saudacao}\n\n${manchete}\n\nTotal acumulado até agora: ${acumulada}.\n\n` +
    `—\nO repasse é combinado com o organizador do evento.`;
  return { assunto, html, texto };
}
