// =============================================================================
// packages/core/src/crm/cliente.ts
//
// CRM do organizador — cliente consolidado cross-evento (E19 · S-R9-13-T1 ·
// RN-172). Doc mantido por Function em `tenants/{tenantId}/crmClientes/{key}`
// — categoria DISTINTA do RN-820: aqui é identidade INDIVIDUAL (PII), não
// agregado anônimo. Leitura só isTenantWriter (Rules); escrita só Function.
//
// IDENTIDADE (P-E19-1 · default #3 autorizado 2026-07-18): a chave de linking
// cruza o cliente entre eventos do MESMO tenant:
//   1. CPF do [reg] quando presente e válido (normalizado p/ 11 dígitos —
//      "529.982.247-25" e "52998224725" são a MESMA pessoa);
//   2. e-mail (lowercase/trim) — na prática o do responsável do pedido, único
//      e-mail que o modelo carrega (o [reg] não tem e-mail);
//   3. atletaId — último recurso: não une cross-evento se a conta variar,
//      mas nunca fabrica união errada (limitação documentada no épico).
// O VALOR da chave NÃO vai ao doc nem ao path: a Function deriva o docId por
// hash (minimização RN-172 — o doc CRM não armazena CPF/e-mail/telefone).
//
// DINHEIRO (P-E19-5): `ltv` = Σ valorFinal das inscrições CONFIRMADAS —
// receita do organizador atribuível ao cliente (mesma base de
// receitaConfirmada); `valorGasto` = Σ (valorFinal + taxaRepassada) — o que
// saiu do bolso do cliente e ficou. Estornada permanece no HISTÓRICO
// (transparência) mas fora dos dois números (o dinheiro voltou).
//
// DADO MÍNIMO (P-E19-4/6): só inscrição confirmada/estornada entra (pendente/
// cancelada não constrói perfil de quem não comprou); campos individuais =
// SÓ os da RN-172 (nome, nascimento→idade/aniversário, gênero) — nunca CPF,
// telefone, cidade/UF, contato de emergência ou restrição médica.
//
// O recompute é FECHADO sobre o próprio doc (mapa `inscricoes` = ledger por
// inscrição): `computeCrmCliente` é pura e determinística — reprocessar não
// duplica, e a Function faz no-op quando nada mudou (padrão agregarDemografia).
// =============================================================================

import { roundMoney } from '../finance/calc';
import { cpfValido, isGeneroInscrito, type GeneroInscrito } from '../eventos/dadosPessoais';
import { isDataEventoISO } from '../eventos/dataEvento';

// ---------------------------------------------------------------------------
// Constantes de coleção
// ---------------------------------------------------------------------------

/** Subcoleção do cliente CRM sob `tenants/{tenantId}` (E19 · RN-172). */
export const SUBCOLECAO_CRM_CLIENTES = 'crmClientes';

// ---------------------------------------------------------------------------
// Identidade do cliente (P-E19-1)
// ---------------------------------------------------------------------------

/** Tipo da chave de linking (ordem = precedência da derivação). */
export type TipoChaveCliente = 'cpf' | 'email' | 'atleta';

export const TIPOS_CHAVE_CLIENTE: readonly TipoChaveCliente[] = [
  'cpf',
  'email',
  'atleta',
];

export function isTipoChaveCliente(v: unknown): v is TipoChaveCliente {
  return (
    typeof v === 'string' &&
    (TIPOS_CHAVE_CLIENTE as readonly string[]).includes(v)
  );
}

/**
 * Identidade derivada de UMA inscrição. `valor` é o dado normalizado que
 * alimenta o hash do docId — NUNCA persistido em claro (minimização RN-172).
 */
export interface IdentidadeCliente {
  tipo: TipoChaveCliente;
  valor: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Insumos de identidade de uma inscrição (tudo opcional menos atletaId). */
export interface IdentidadeClienteInput {
  /** CPF do [reg] do inscrito (com ou sem máscara) — pode faltar */
  cpf?: unknown;
  /** E-mail conhecido (responsável do pedido, quando o inscrito é ele) */
  email?: unknown;
  /** Sempre presente no inscrito — último recurso */
  atletaId: string;
}

/**
 * Deriva a identidade do cliente (P-E19-1): CPF válido normalizado →
 * e-mail plausível normalizado → atletaId. Determinística: a MESMA pessoa
 * com CPF mascarado diferente produz a MESMA chave. @pure
 */
export function derivarIdentidadeCliente(
  input: IdentidadeClienteInput
): IdentidadeCliente {
  if (cpfValido(input.cpf)) {
    return { tipo: 'cpf', valor: (input.cpf as string).replace(/\D/g, '') };
  }
  if (typeof input.email === 'string' && EMAIL_RE.test(input.email.trim())) {
    return { tipo: 'email', valor: input.email.trim().toLowerCase() };
  }
  if (typeof input.atletaId !== 'string' || input.atletaId.length === 0) {
    throw new Error('derivarIdentidadeCliente: atletaId obrigatório');
  }
  return { tipo: 'atleta', valor: input.atletaId };
}

// ---------------------------------------------------------------------------
// Entradas do ledger (uma por inscrição confirmada/estornada)
// ---------------------------------------------------------------------------

/** Status de inscrição que ENTRA no CRM (P-E19-6 — só quem comprou). */
export type StatusInscricaoCrm = 'confirmado' | 'estornado';

export const STATUS_INSCRICAO_CRM: readonly StatusInscricaoCrm[] = [
  'confirmado',
  'estornado',
];

export function isStatusInscricaoCrm(v: unknown): v is StatusInscricaoCrm {
  return (
    typeof v === 'string' &&
    (STATUS_INSCRICAO_CRM as readonly string[]).includes(v)
  );
}

/**
 * Entrada do ledger `inscricoes` do doc CRM — chave do mapa =
 * `{eventoId}_{inscritoId}` (determinística; reprocessar sobrescreve, nunca
 * duplica). Carrega SÓ os campos da RN-172 + o dinheiro da linha.
 */
export interface CrmInscricaoEntry {
  eventoId: string;
  /** 🔁 Denormalizado do evento (não é PII) */
  eventoNome: string;
  status: StatusInscricaoCrm;
  /** valorFinal da linha do pedido (R$) — base do LTV; 0 = sem pedido (legado) */
  valorPago: number;
  /** Fatia da taxa repassada ao comprador (RN-347) — 0 quando incorporada */
  taxaRepassada: number;
  /** Nome do titular (RN-172) */
  nome: string;
  /** Nascimento date-only `yyyy-mm-dd` (P-E19-4) — null sem [reg] */
  nascimento: string | null;
  /** Gênero declarado — null sem [reg] */
  genero: GeneroInscrito | null;
  /** `atualizadoEm` do inscrito em ms — desempate "identidade mais recente" */
  atualizadoEmMs: number;
}

// ---------------------------------------------------------------------------
// Agregado do cliente (derivação pura e fechada sobre o ledger)
// ---------------------------------------------------------------------------

/** Resumo por evento no doc do cliente (histórico consolidado — detalhe). */
export interface CrmEventoResumo {
  nome: string;
  /** Inscrições CONFIRMADAS do cliente neste evento */
  qtdInscricoes: number;
  /** Inscrições estornadas (histórico honesto — fora do LTV) */
  qtdEstornadas: number;
  /** Σ valorFinal confirmadas do evento (R$) */
  valorPago: number;
}

/** Campos derivados do doc CRM (tudo que `computeCrmCliente` produz). */
export interface CrmClienteAgregado {
  nome: string;
  genero: GeneroInscrito | null;
  /** date-only `yyyy-mm-dd` — null quando nenhuma inscrição tem [reg] */
  nascimento: string | null;
  /** `mm-dd` derivado do nascimento — null junto com ele */
  aniversario: string | null;
  /** Nº de eventos DISTINTOS com ≥1 inscrição confirmada */
  qtdEventos: number;
  /** Nº de inscrições confirmadas (cross-evento) */
  qtdInscricoes: number;
  /** Σ (valorFinal + taxaRepassada) confirmadas (P-E19-5) */
  valorGasto: number;
  /** Σ valorFinal confirmadas — receita atribuível ao cliente (P-E19-5) */
  ltv: number;
  /** Histórico consolidado por evento */
  eventos: Record<string, CrmEventoResumo>;
}

/** Doc completo `tenants/{tenantId}/crmClientes/{clienteKey}` (sem carimbo). */
export interface CrmClienteDoc extends CrmClienteAgregado {
  tenantId: string;
  /** Tipo da chave que uniu este cliente (o VALOR nunca é persistido) */
  chaveTipo: TipoChaveCliente;
  /** Ledger fechado do recompute — uma entrada por inscrição que conta */
  inscricoes: Record<string, CrmInscricaoEntry>;
}

/**
 * Ordena as chaves do ledger por `atualizadoEmMs` DESC com desempate pela
 * própria chave (determinismo total entre recomputes). @pure
 */
function chavesMaisRecentesPrimeiro(
  inscricoes: Record<string, CrmInscricaoEntry>
): string[] {
  return Object.keys(inscricoes).sort((a, b) => {
    const ea = inscricoes[a] as CrmInscricaoEntry;
    const eb = inscricoes[b] as CrmInscricaoEntry;
    if (eb.atualizadoEmMs !== ea.atualizadoEmMs) {
      return eb.atualizadoEmMs - ea.atualizadoEmMs;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/**
 * Deriva o agregado do cliente DO LEDGER (recompute fechado — padrão RN-820
 * de projeção server-side; o cliente/painel nunca varre inscritos).
 * Identidade (nome/nascimento/gênero) = da inscrição mais recente que TEM o
 * campo (correção de cadastro em evento novo vence a antiga). @pure
 */
export function computeCrmCliente(
  inscricoes: Record<string, CrmInscricaoEntry>
): CrmClienteAgregado {
  const chaves = chavesMaisRecentesPrimeiro(inscricoes);
  if (chaves.length === 0) {
    throw new Error('computeCrmCliente: ledger vazio — doc deve ser removido');
  }

  let nome = '';
  let nascimento: string | null = null;
  let genero: GeneroInscrito | null = null;
  for (const k of chaves) {
    const e = inscricoes[k] as CrmInscricaoEntry;
    if (nome === '' && e.nome.length > 0) nome = e.nome;
    if (nascimento === null && e.nascimento !== null) nascimento = e.nascimento;
    if (genero === null && e.genero !== null) genero = e.genero;
    if (nome !== '' && nascimento !== null && genero !== null) break;
  }

  const eventos: Record<string, CrmEventoResumo> = {};
  let qtdInscricoes = 0;
  let valorGasto = 0;
  let ltv = 0;
  const eventosConfirmados = new Set<string>();

  for (const k of chaves) {
    const e = inscricoes[k] as CrmInscricaoEntry;
    const resumo = eventos[e.eventoId] ?? {
      nome: e.eventoNome,
      qtdInscricoes: 0,
      qtdEstornadas: 0,
      valorPago: 0,
    };
    if (e.status === 'confirmado') {
      qtdInscricoes += 1;
      ltv += e.valorPago;
      valorGasto += e.valorPago + e.taxaRepassada;
      resumo.qtdInscricoes += 1;
      resumo.valorPago = roundMoney(resumo.valorPago + e.valorPago);
      eventosConfirmados.add(e.eventoId);
    } else {
      resumo.qtdEstornadas += 1;
    }
    eventos[e.eventoId] = resumo;
  }

  return {
    nome,
    genero,
    nascimento,
    aniversario: nascimento !== null ? nascimento.slice(5) : null,
    qtdEventos: eventosConfirmados.size,
    qtdInscricoes,
    valorGasto: roundMoney(valorGasto),
    ltv: roundMoney(ltv),
    eventos,
  };
}

// ---------------------------------------------------------------------------
// Idempotência (no-op do recompute — padrão demografiaInalterada)
// ---------------------------------------------------------------------------

function entryIgual(a: CrmInscricaoEntry, b: CrmInscricaoEntry): boolean {
  return (
    a.eventoId === b.eventoId &&
    a.eventoNome === b.eventoNome &&
    a.status === b.status &&
    a.valorPago === b.valorPago &&
    a.taxaRepassada === b.taxaRepassada &&
    a.nome === b.nome &&
    a.nascimento === b.nascimento &&
    a.genero === b.genero &&
    a.atualizadoEmMs === b.atualizadoEmMs
  );
}

/**
 * O doc persistido é IGUAL ao recomputado? (campo a campo — quando sim, a
 * Function não escreve: `atualizadoEm` intocado prova a idempotência). @pure
 */
export function crmClienteInalterado(
  atual: CrmClienteDoc,
  novo: CrmClienteDoc
): boolean {
  if (
    atual.tenantId !== novo.tenantId ||
    atual.chaveTipo !== novo.chaveTipo ||
    atual.nome !== novo.nome ||
    atual.genero !== novo.genero ||
    atual.nascimento !== novo.nascimento ||
    atual.aniversario !== novo.aniversario ||
    atual.qtdEventos !== novo.qtdEventos ||
    atual.qtdInscricoes !== novo.qtdInscricoes ||
    atual.valorGasto !== novo.valorGasto ||
    atual.ltv !== novo.ltv
  ) {
    return false;
  }
  const ka = Object.keys(atual.inscricoes).sort();
  const kb = Object.keys(novo.inscricoes).sort();
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false;
    const a = atual.inscricoes[ka[i] as string] as CrmInscricaoEntry;
    const b = novo.inscricoes[kb[i] as string] as CrmInscricaoEntry;
    if (!entryIgual(a, b)) return false;
  }
  const ea = Object.keys(atual.eventos).sort();
  const eb = Object.keys(novo.eventos).sort();
  if (ea.length !== eb.length) return false;
  for (let i = 0; i < ea.length; i++) {
    if (ea[i] !== eb[i]) return false;
    const a = atual.eventos[ea[i] as string] as CrmEventoResumo;
    const b = novo.eventos[eb[i] as string] as CrmEventoResumo;
    if (
      a.nome !== b.nome ||
      a.qtdInscricoes !== b.qtdInscricoes ||
      a.qtdEstornadas !== b.qtdEstornadas ||
      a.valorPago !== b.valorPago
    ) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Parsing defensivo (fail-fast — PII errada é pior que ausente)
// ---------------------------------------------------------------------------

function parseMoneyCampo(contexto: string, campo: string, v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    throw new Error(`${contexto}: "${campo}" inválido (R$ ≥ 0 finito)`);
  }
  return v;
}

function parseCount(contexto: string, campo: string, v: unknown): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new Error(`${contexto}: "${campo}" inválido (inteiro ≥ 0)`);
  }
  return v;
}

function parseEntry(contexto: string, raw: unknown): CrmInscricaoEntry {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${contexto}: entrada de inscrição inválida`);
  }
  const d = raw as Record<string, unknown>;
  if (typeof d['eventoId'] !== 'string' || d['eventoId'].length === 0) {
    throw new Error(`${contexto}: "eventoId" inválido`);
  }
  if (typeof d['eventoNome'] !== 'string') {
    throw new Error(`${contexto}: "eventoNome" inválido`);
  }
  if (!isStatusInscricaoCrm(d['status'])) {
    throw new Error(`${contexto}: status fora do enum CRM (P-E19-6)`);
  }
  if (typeof d['nome'] !== 'string') {
    throw new Error(`${contexto}: "nome" inválido`);
  }
  const nascimento = d['nascimento'];
  if (nascimento !== null && !isDataEventoISO(nascimento)) {
    throw new Error(`${contexto}: "nascimento" deve ser yyyy-mm-dd ou null`);
  }
  const genero = d['genero'];
  if (genero !== null && !isGeneroInscrito(genero)) {
    throw new Error(`${contexto}: "genero" fora do enum ou null`);
  }
  if (typeof d['atualizadoEmMs'] !== 'number' || !Number.isFinite(d['atualizadoEmMs'])) {
    throw new Error(`${contexto}: "atualizadoEmMs" inválido`);
  }
  return {
    eventoId: d['eventoId'],
    eventoNome: d['eventoNome'],
    status: d['status'],
    valorPago: parseMoneyCampo(contexto, 'valorPago', d['valorPago']),
    taxaRepassada: parseMoneyCampo(contexto, 'taxaRepassada', d['taxaRepassada']),
    nome: d['nome'],
    nascimento: nascimento === null ? null : (nascimento as string),
    genero: genero === null ? null : (genero as GeneroInscrito),
    atualizadoEmMs: d['atualizadoEmMs'],
  };
}

/**
 * Parsing defensivo do doc CRM (fail-fast). Fonte única de parsing para o
 * api-client e para o no-op da Function. @pure
 */
export function parseCrmCliente(
  clienteKey: string,
  data: Record<string, unknown>
): CrmClienteDoc {
  const contexto = `CrmCliente ${clienteKey}`;
  if (typeof data['tenantId'] !== 'string' || data['tenantId'].length === 0) {
    throw new Error(`${contexto}: "tenantId" inválido (RN-400)`);
  }
  if (!isTipoChaveCliente(data['chaveTipo'])) {
    throw new Error(`${contexto}: "chaveTipo" fora do enum (P-E19-1)`);
  }
  if (typeof data['nome'] !== 'string') {
    throw new Error(`${contexto}: "nome" inválido`);
  }
  const nascimento = data['nascimento'];
  if (nascimento !== null && nascimento !== undefined && !isDataEventoISO(nascimento)) {
    throw new Error(`${contexto}: "nascimento" deve ser yyyy-mm-dd ou null`);
  }
  const genero = data['genero'];
  if (genero !== null && genero !== undefined && !isGeneroInscrito(genero)) {
    throw new Error(`${contexto}: "genero" fora do enum ou null`);
  }
  const aniversario = data['aniversario'];
  if (
    aniversario !== null &&
    aniversario !== undefined &&
    (typeof aniversario !== 'string' || !/^\d{2}-\d{2}$/.test(aniversario))
  ) {
    throw new Error(`${contexto}: "aniversario" deve ser mm-dd ou null`);
  }

  const inscricoesRaw = data['inscricoes'];
  if (
    inscricoesRaw === null ||
    typeof inscricoesRaw !== 'object' ||
    Array.isArray(inscricoesRaw)
  ) {
    throw new Error(`${contexto}: "inscricoes" deve ser mapa`);
  }
  const inscricoes: Record<string, CrmInscricaoEntry> = {};
  for (const [k, v] of Object.entries(inscricoesRaw as Record<string, unknown>)) {
    inscricoes[k] = parseEntry(`${contexto}.inscricoes[${k}]`, v);
  }

  const eventosRaw = data['eventos'];
  if (eventosRaw === null || typeof eventosRaw !== 'object' || Array.isArray(eventosRaw)) {
    throw new Error(`${contexto}: "eventos" deve ser mapa`);
  }
  const eventos: Record<string, CrmEventoResumo> = {};
  for (const [k, v] of Object.entries(eventosRaw as Record<string, unknown>)) {
    if (v === null || typeof v !== 'object') {
      throw new Error(`${contexto}.eventos[${k}]: resumo inválido`);
    }
    const r = v as Record<string, unknown>;
    if (typeof r['nome'] !== 'string') {
      throw new Error(`${contexto}.eventos[${k}]: "nome" inválido`);
    }
    eventos[k] = {
      nome: r['nome'],
      qtdInscricoes: parseCount(`${contexto}.eventos[${k}]`, 'qtdInscricoes', r['qtdInscricoes']),
      qtdEstornadas: parseCount(`${contexto}.eventos[${k}]`, 'qtdEstornadas', r['qtdEstornadas']),
      valorPago: parseMoneyCampo(`${contexto}.eventos[${k}]`, 'valorPago', r['valorPago']),
    };
  }

  return {
    tenantId: data['tenantId'],
    chaveTipo: data['chaveTipo'],
    nome: data['nome'],
    genero: genero === null || genero === undefined ? null : (genero as GeneroInscrito),
    nascimento:
      nascimento === null || nascimento === undefined ? null : (nascimento as string),
    aniversario:
      aniversario === null || aniversario === undefined ? null : (aniversario as string),
    qtdEventos: parseCount(contexto, 'qtdEventos', data['qtdEventos']),
    qtdInscricoes: parseCount(contexto, 'qtdInscricoes', data['qtdInscricoes']),
    valorGasto: parseMoneyCampo(contexto, 'valorGasto', data['valorGasto']),
    ltv: parseMoneyCampo(contexto, 'ltv', data['ltv']),
    eventos,
    inscricoes,
  };
}
