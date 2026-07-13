// =============================================================================
// packages/core/src/eventos/equipe.ts
//
// Equipe do evento — 4 papéis de permissão (RN-320 · LEELA-S304-T1 · E04-L4).
// Subcoleção: `eventos/{eventoId}/equipe/{membroId}` — tenant-scoped (ADR-009).
//
// FONTE ÚNICA DE AUTORIZAÇÃO POR ÁREA: a matriz `MATRIZ_ACESSO_EVENTO` +
// `podeAcessar(papel, area)` é API pública de @leela/core — E07-web (403 por
// papel), E05 (aceite de parceria) e as telas de E04-L5 importam DAQUI. As
// Security Rules espelham as mesmas células (uma lista de papéis por coleção);
// mudar uma célula aqui EXIGE mudar a Rule correspondente + teste.
//
// PAPEL VEM DO TOKEN, NUNCA DO CLIENTE (ADR-008/RN-401): o papel do membro é
// refletido em custom claims `{ eventos: { [eventoId]: papel } }` mantidos
// EXCLUSIVAMENTE pela Function `setClaimsEquipe` (merge preservador — nunca
// apaga claims de tenant nem de outros eventos). O doc `equipe/{uid}` com
// `status: 'ativo'` é a ÂNCORA VIVA das Rules: token velho de membro removido
// (janela de ~1h até expirar) não passa, porque a Rule confere o doc via get().
//
// Papéis (definição canônica do épico E04 · "modelo de 4 papéis da IA v1.5"):
//   organizador   — dono do evento; controle total (excluir/transferir,
//                   financeiro e equipe inclusos).
//   administrador — gestão completa (inscritos, kits, página de vendas,
//                   comunicação, configurações, equipe); SEM financeiro,
//                   SEM excluir evento/transferir ownership.
//   operador      — balcão: entrega de kit, chip e check-in (E03-S204) +
//                   leitura de inscritos; sem configurações nem financeiro.
//   financeiro    — leitura do financeiro/repasses + export CSV (S302);
//                   sem operação nem edição de conteúdo.
// =============================================================================

import type { Timestamp } from '../index';

// ---------------------------------------------------------------------------
// Papéis (RN-320)
// ---------------------------------------------------------------------------

/** Papel de um membro DENTRO de um evento (RN-320 — 4 papéis canônicos). */
export type PapelEvento = 'organizador' | 'administrador' | 'operador' | 'financeiro';

/** Lista canônica de papéis — única fonte para validação/UI/seed. */
export const PAPEIS_EVENTO: readonly PapelEvento[] = [
  'organizador',
  'administrador',
  'operador',
  'financeiro',
];

/** Type guard de PapelEvento. @pure */
export function isPapelEvento(value: unknown): value is PapelEvento {
  return typeof value === 'string' && (PAPEIS_EVENTO as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Áreas do evento (7 — E04-L4)
// ---------------------------------------------------------------------------

/**
 * Área funcional do evento sujeita a autorização por papel.
 * `promotores` da spec saiu com o corte da afiliação; `comunicacao` entrou
 * porque E06 adiciona a aba nesta onda (decisão do lote E04-L4).
 */
export type AreaEvento =
  | 'pagina_vendas'
  | 'comunicacao'
  | 'financeiro'
  | 'entrega'
  | 'inscritos'
  | 'configuracoes'
  | 'equipe';

/** Lista canônica de áreas — única fonte para UI (tabs/403) e testes. */
export const AREAS_EVENTO: readonly AreaEvento[] = [
  'pagina_vendas',
  'comunicacao',
  'financeiro',
  'entrega',
  'inscritos',
  'configuracoes',
  'equipe',
];

/** Type guard de AreaEvento. @pure */
export function isAreaEvento(value: unknown): value is AreaEvento {
  return typeof value === 'string' && (AREAS_EVENTO as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Matriz de acesso 4×7 (célula a célula — fonte única)
// ---------------------------------------------------------------------------

/**
 * Matriz papel × área (4×7). CADA célula é deliberada — derivada da definição
 * canônica dos papéis no épico E04 (ver cabeçalho). true = o papel acessa a
 * área (a aba aparece; leituras da área passam na Rule); false = 403 na UI e
 * deny na Rule.
 *
 * NOTA configuracoes/equipe: a matriz governa ACESSO à área. Operações mais
 * finas dentro dela (excluir evento, transferir ownership, conceder papel
 * 'organizador') são EXCLUSIVAS do organizador e vivem nos guards da Function
 * (`podeGerirPapelEquipe` em functions/setClaimsEquipe) — não são células.
 */
export const MATRIZ_ACESSO_EVENTO: Readonly<
  Record<PapelEvento, Readonly<Record<AreaEvento, boolean>>>
> = {
  organizador: {
    pagina_vendas: true,
    comunicacao: true,
    financeiro: true,
    entrega: true,
    inscritos: true,
    configuracoes: true,
    equipe: true,
  },
  administrador: {
    pagina_vendas: true,
    comunicacao: true,
    financeiro: false, // dinheiro é só organizador + financeiro
    entrega: true,
    inscritos: true,
    configuracoes: true,
    equipe: true, // E04-L5: "só Organizador/Administrador gerem equipe"
  },
  operador: {
    pagina_vendas: false,
    comunicacao: false,
    financeiro: false, // aceite E04-L4: operador lendo financeiro → NEGA
    entrega: true, // balcão: kit, chip, check-in (E03-S204)
    inscritos: true, // leitura de inscritos p/ atender no balcão
    configuracoes: false,
    equipe: false,
  },
  financeiro: {
    pagina_vendas: false, // aceite E04-L4: financeiro edita página → NEGA
    comunicacao: false,
    financeiro: true, // leitura de financeiro/repasses + export (S302)
    entrega: false,
    inscritos: false,
    configuracoes: false,
    equipe: false,
  },
};

/**
 * O papel acessa a área? Consulta pura da matriz 4×7 — API pública
 * (E07-web importa para o 403 por papel). @pure
 */
export function podeAcessar(papel: PapelEvento, area: AreaEvento): boolean {
  return MATRIZ_ACESSO_EVENTO[papel][area];
}

/**
 * Papéis com acesso a uma área — na ordem canônica de PAPEIS_EVENTO.
 * Útil para as Rules-em-teste e para UI de convite ("quem verá isto"). @pure
 */
export function papeisComAcesso(area: AreaEvento): PapelEvento[] {
  return PAPEIS_EVENTO.filter((papel) => podeAcessar(papel, area));
}

// ---------------------------------------------------------------------------
// Claims por evento (ADR-008)
// ---------------------------------------------------------------------------

/**
 * Mapa `eventoId → papel` dentro do custom claim (`claims.eventos`).
 * Mantido EXCLUSIVAMENTE pela Function `setClaimsEquipe` via merge
 * preservador — cliente nunca escreve claim (RN-401).
 */
export type ClaimsEquipeEventos = Readonly<Record<string, PapelEvento>>;

/**
 * Papel do usuário em UM evento a partir dos claims do token — null quando
 * não é membro. Defensivo contra claim malformado (valor fora do enum não
 * vira papel). @pure
 */
export function papelNoEvento(
  claims: { eventos?: Record<string, unknown> } | null | undefined,
  eventoId: string
): PapelEvento | null {
  const papel = claims?.eventos?.[eventoId];
  return isPapelEvento(papel) ? papel : null;
}

// ---------------------------------------------------------------------------
// Membro da equipe (entidade)
// ---------------------------------------------------------------------------

/** Status do vínculo do membro com o evento. */
export type StatusMembroEquipe = 'convidado' | 'ativo' | 'removido';

/** Lista canônica de status. */
export const STATUS_MEMBRO_EQUIPE: readonly StatusMembroEquipe[] = [
  'convidado',
  'ativo',
  'removido',
];

/** Type guard de StatusMembroEquipe. @pure */
export function isStatusMembroEquipe(value: unknown): value is StatusMembroEquipe {
  return (
    typeof value === 'string' && (STATUS_MEMBRO_EQUIPE as readonly string[]).includes(value)
  );
}

/**
 * Membro da equipe do evento — `eventos/{eventoId}/equipe/{membroId}`.
 *
 * CONVENÇÃO DE CHAVE: membro ATIVO tem docId == uid do Firebase Auth — é essa
 * âncora que as Rules leem via get() para conferir `status == 'ativo'` e
 * `papel` contra o claim do token (fecha a janela do token velho). Convite
 * (client-created, sem uid ainda) usa docId livre; a ativação pela Function
 * grava o doc definitivo em `equipe/{uid}`.
 */
export interface MembroEquipe {
  /** docId — uid do membro quando ativo (âncora das Rules); livre no convite. */
  id: string;
  /** Propagado do evento pai — isolamento multi-tenant (ADR-009). */
  tenantId: string;
  /** Evento pai (redundante ao path — consultas e coerência). */
  eventoId: string;
  /** Nome de exibição do membro. */
  nome: string;
  /** E-mail do convite (E04-L5) — null quando não informado. */
  email: string | null;
  /** uid Firebase Auth — escrita EXCLUSIVA de Function; null até ativar. */
  uid: string | null;
  /** 🔁 `profId → profissionais` — vínculo opcional com o cadastro. */
  profId: string | null;
  /** Papel no evento (RN-320) — troca SÓ via Function `setClaimsEquipe`. */
  papel: PapelEvento;
  /** Vínculo: convidado (sem claims) → ativo (claims) → removido (revogado). */
  status: StatusMembroEquipe;
  convidadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/**
 * Campos do membro com escrita EXCLUSIVA de Function (`setClaimsEquipe`):
 * `uid` (identidade autenticada), `papel` e `status` DEPOIS do create —
 * o convite nasce `convidado` sem uid; qualquer transição é da Function,
 * mantendo doc↔claims sempre em sincronia (as Rules espelham: update de
 * cliente é negado por inteiro nesta coleção).
 */
export const CAMPOS_FUNCTION_MEMBRO_EQUIPE = ['uid', 'papel', 'status'] as const;

/**
 * Parse fail-fast de um doc `equipe/{membroId}` (borda de I/O — leitores do
 * api-client). Lança em shape inválido; campos opcionais normalizam p/ null.
 */
export function parseMembroEquipe(id: string, data: Record<string, unknown>): MembroEquipe {
  const tenantId = data['tenantId'];
  const eventoId = data['eventoId'];
  const nome = data['nome'];
  const papel = data['papel'];
  const status = data['status'];

  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error(`MembroEquipe ${id}: campo "tenantId" inválido (ADR-009)`);
  }
  if (typeof eventoId !== 'string' || eventoId.length === 0) {
    throw new Error(`MembroEquipe ${id}: campo "eventoId" inválido`);
  }
  if (typeof nome !== 'string' || nome.length === 0) {
    throw new Error(`MembroEquipe ${id}: campo "nome" inválido`);
  }
  if (!isPapelEvento(papel)) {
    throw new Error(`MembroEquipe ${id}: papel "${String(papel)}" fora do enum (RN-320)`);
  }
  if (!isStatusMembroEquipe(status)) {
    throw new Error(`MembroEquipe ${id}: status "${String(status)}" fora do enum`);
  }

  const email = data['email'];
  const uid = data['uid'];
  const profId = data['profId'];

  return {
    id,
    tenantId,
    eventoId,
    nome,
    email: typeof email === 'string' && email.length > 0 ? email : null,
    uid: typeof uid === 'string' && uid.length > 0 ? uid : null,
    profId: typeof profId === 'string' && profId.length > 0 ? profId : null,
    papel,
    status,
    convidadoEm: data['convidadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
}
