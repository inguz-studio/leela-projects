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
