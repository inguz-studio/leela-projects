// =============================================================================
// packages/core/src/pedidos/pessoa.ts
//
// PESSOA — registro global de identidade por CPF (LEELA-CK2 · RN-173 ·
// DEC-0719 item 24d: "só podemos ter CPF's únicos no sistema").
//
// UNICIDADE ESTRUTURAL (padrão do registry de @handle/RN-160, Kleppmann):
// a coleção raiz `pessoas/{pessoaId}` tem docId DETERMINÍSTICO derivado do
// CPF canônico (HMAC com pepper — derivação vive em functions, que tem
// crypto; ver pessoaRegistry.ts). Dois checkouts com o MESMO CPF colidem no
// MESMO doc por construção: colisão = MESMA pessoa → linka, NUNCA duplica.
//
// ⚠️ PII (LGPD): o doc carrega o CPF em claro + dados conhecidos do checkout
// (nome/gênero/nascimento/telefone/endereço). Acesso: Rules `read, write: if
// false` para TODO cliente — escrita EXCLUSIVA da Function do checkout;
// leitura só pelo prefill (getCheckoutPrefill), que devolve APENAS o registro
// da PRÓPRIA conta autenticada (`contaUid === caller.uid` — RN-172: PII de
// terceiro nunca atravessa). O PATH não carrega PII (docId é HMAC).
//
// ANTI-HIJACK (review de desenho CK2): `contaUid` é first-claim — só é
// escrito quando null (T3 conta-sem-fricção ou compra autenticada do próprio
// responsável). `dadosConhecidos` só atualiza enquanto a pessoa não foi
// reivindicada OU quando o caller autenticado É a conta dona. Comprar com o
// CPF de terceiro nunca lê nem regrava os dados da vítima.
//
// RETROCOMPAT (premissa CK2-3): o registry nasce vazio; inscritos criados
// antes do RN-173 não têm `pessoaRef` (leitura Postel nos consumidores).
// Produção não tem dado real ⇒ nada a migrar; backfill = reprocesso Admin
// futuro, se necessário.
// =============================================================================

import type { Timestamp } from '../index';
import {
  cpfValido,
  isGeneroInscrito,
  telefoneValido,
  type GeneroInscrito,
} from '../eventos/dadosPessoais';
import { isDataEventoISO } from '../eventos/dataEvento';
import { validarEnderecoPedido, type EnderecoPedido } from './endereco';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Coleção raiz do registro de pessoas (RN-173). */
export const COLECAO_PESSOAS = 'pessoas';

/** Prefixo do docId derivado de CPF (`cpf_{hmac32}`). */
export const PESSOA_ID_PREFIXO_CPF = 'cpf_';

// ---------------------------------------------------------------------------
// Entidade
// ---------------------------------------------------------------------------

/**
 * Dados que a plataforma CONHECE da pessoa a partir dos próprios checkouts
 * dela (RN-154 — insumo do pré-preenchimento). `''`/ausente = não coletado
 * (mesma semântica Postel do bloco [reg]).
 */
export interface DadosConhecidosPessoa {
  /** Último nome informado pela própria pessoa no checkout. '' = nunca. */
  nome: string;
  genero: GeneroInscrito;
  /** Nascimento date-only `yyyy-mm-dd`. '' = não coletado. */
  nascimento: string;
  /** Telefone canônico só-dígitos. '' = não coletado. */
  telefone: string;
  /** Endereço do último pedido PRÓPRIO (comprador). Ausente = não coletado. */
  endereco?: EnderecoPedido;
}

/** Doc `pessoas/{pessoaId}` — registro de identidade global (RN-173). */
export interface Pessoa {
  /** docId (`cpf_{hmac32}` — derivação em functions/pessoaRegistry). */
  id: string;
  /** CPF canônico (11 dígitos) — PII; o doc é Function-only por Rules. */
  cpf: string;
  /**
   * Conta Firebase Auth vinculada (uid NÃO-anônimo) — null até a pessoa ter
   * conta (RN-155). First-claim: uma vez preenchido, NUNCA sobrescrito por
   * checkout (troca de vínculo = operação administrativa explícita).
   */
  contaUid: string | null;
  dadosConhecidos?: DadosConhecidosPessoa;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

// ---------------------------------------------------------------------------
// Merge puro dos dados conhecidos (o checkout chama dentro da transação)
// ---------------------------------------------------------------------------

/**
 * Mescla os dados conhecidos vigentes com os coletados num checkout novo:
 * campo NOVO presente e não-vazio VENCE (correção mais recente); ausente/
 * vazio PRESERVA o vigente (checkout parcial nunca apaga dado conhecido).
 * `genero === 'nao_informado'` conta como "não coletado" (respeita quem não
 * declara sem apagar declaração anterior). @pure
 */
export function mesclarDadosConhecidosPessoa(
  atual: DadosConhecidosPessoa | undefined,
  novos: Partial<DadosConhecidosPessoa>
): DadosConhecidosPessoa {
  const base: DadosConhecidosPessoa = atual ?? {
    nome: '',
    genero: 'nao_informado',
    nascimento: '',
    telefone: '',
  };
  const out: DadosConhecidosPessoa = {
    nome:
      typeof novos.nome === 'string' && novos.nome.trim().length > 0
        ? novos.nome.trim()
        : base.nome,
    genero:
      novos.genero !== undefined && novos.genero !== 'nao_informado'
        ? novos.genero
        : base.genero,
    nascimento:
      typeof novos.nascimento === 'string' && novos.nascimento.length > 0
        ? novos.nascimento
        : base.nascimento,
    telefone:
      typeof novos.telefone === 'string' && novos.telefone.length > 0
        ? novos.telefone
        : base.telefone,
  };
  const endereco = novos.endereco ?? base.endereco;
  if (endereco !== undefined) out.endereco = endereco;
  return out;
}

// ---------------------------------------------------------------------------
// Parsing defensivo (fail-fast — PII errada é pior que ausente)
// ---------------------------------------------------------------------------

function parseDadosConhecidos(
  contexto: string,
  raw: unknown
): DadosConhecidosPessoa {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${contexto}: "dadosConhecidos" inválido`);
  }
  const d = raw as Record<string, unknown>;
  const ausente = (v: unknown): boolean =>
    v === undefined || (typeof v === 'string' && v.length === 0);

  if (d['nome'] !== undefined && typeof d['nome'] !== 'string') {
    throw new Error(`${contexto}: "dadosConhecidos.nome" inválido`);
  }
  if (d['genero'] !== undefined && !isGeneroInscrito(d['genero'])) {
    throw new Error(`${contexto}: "dadosConhecidos.genero" fora do enum`);
  }
  if (!ausente(d['nascimento']) && !isDataEventoISO(d['nascimento'])) {
    throw new Error(
      `${contexto}: "dadosConhecidos.nascimento" deve ser yyyy-mm-dd válida`
    );
  }
  if (!ausente(d['telefone']) && !telefoneValido(d['telefone'])) {
    throw new Error(`${contexto}: "dadosConhecidos.telefone" inválido`);
  }
  const out: DadosConhecidosPessoa = {
    nome: typeof d['nome'] === 'string' ? d['nome'] : '',
    genero: isGeneroInscrito(d['genero']) ? d['genero'] : 'nao_informado',
    nascimento: typeof d['nascimento'] === 'string' ? d['nascimento'] : '',
    telefone: typeof d['telefone'] === 'string' ? d['telefone'] : '',
  };
  if (d['endereco'] !== undefined) {
    const errosEndereco = validarEnderecoPedido(d['endereco']);
    if (errosEndereco.length > 0) {
      throw new Error(
        `${contexto}: "dadosConhecidos.endereco" inválido — ${errosEndereco.join(' ')}`
      );
    }
    out.endereco = d['endereco'] as EnderecoPedido;
  }
  return out;
}

/**
 * Parsing defensivo do doc de pessoa (fonte única de leitura — prefill e
 * conta-sem-fricção consomem; nunca leem campo cru). @pure
 */
export function parsePessoa(id: string, data: Record<string, unknown>): Pessoa {
  const contexto = `Pessoa ${id}`;
  if (!cpfValido(data['cpf'])) {
    throw new Error(`${contexto}: "cpf" inválido (11 dígitos + DV — RN-173)`);
  }
  const contaUid = data['contaUid'];
  if (
    contaUid !== null &&
    (typeof contaUid !== 'string' || contaUid.length === 0)
  ) {
    throw new Error(`${contexto}: "contaUid" deve ser string não-vazia ou null`);
  }
  const pessoa: Pessoa = {
    id,
    cpf: data['cpf'] as string,
    contaUid: contaUid === null ? null : (contaUid as string),
    criadoEm: data['criadoEm'] as Timestamp,
    atualizadoEm: data['atualizadoEm'] as Timestamp,
  };
  if (data['dadosConhecidos'] !== undefined) {
    pessoa.dadosConhecidos = parseDadosConhecidos(contexto, data['dadosConhecidos']);
  }
  return pessoa;
}
