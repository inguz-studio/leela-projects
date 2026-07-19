// =============================================================================
// Tipos do checkout público (client-side) — S1203.
// Formulário do atleta anônimo (ADR-011: 1 responsável/pagador + N inscritos).
// =============================================================================

import type { KitInscritoInput } from '@leela/api-client';
import type { ItemTamanhadoPublico, KitPublico } from '@/lib/tipos';

/** Dados de UM inscrito em edição no formulário. */
export interface InscritoForm {
  nome: string;
  email: string;
  cpf: string;
  /**
   * Nascimento `yyyy-mm-dd` POR ATLETA (CKFORM · spec §5.1 item 2 — categoria
   * de prova + demografia são do titular, ADR-011). '' = ainda não preenchido.
   */
  nascimento: string;
  /** '' até a etapa Modalidade e kit. */
  modalidade: string;
  /**
   * Id do kit REAL do evento (`eventos/{id}/kits/{kitId}`) escolhido nesta
   * inscrição — '' = nenhum kit selecionado. Fonte da precificação (o core soma
   * o `preco` do kit via kitId); o rótulo persistido no inscrito deriva daqui.
   */
  kitId: string;
  /**
   * Escolha de corte→tamanho POR item tamanhado do kit (RN-231 · TAMANHOS-
   * GRADE): `itemId → sufixo de SKU` ('M' na grade única/unissex,
   * 'feminina__M' na grade por corte) — o MESMO formato que o servidor
   * valida FAIL-CLOSED e persiste no inscrito. Zera ao trocar kit/modalidade.
   */
  tamanhos: Record<string, string>;
}

/** Forma de pagamento na UI (espelho de FormaPagamento do core). */
export type FormaUI = 'pix' | 'cartao_credito';

/** Enum de kit persistido no inscrito (RN-202). */
const KITS_INSCRITO_ENUM: readonly KitInscritoInput[] = [
  'kit_ouro',
  'kit_prata',
  'kit_basico',
  'sem_kit',
];

/**
 * Deriva o rótulo enum (RN-202, persistido no inscrito) a partir do id do kit
 * real. CHAVE CANÔNICA Kit↔enum (FABLE-E-T1): o seed usa o PRÓPRIO enum como
 * id (`kit_ouro`) — para o fluxo canônico a derivação é identidade; o
 * `replace` segue reconhecendo id legado com hífen (`kit-ouro`) sem quebrar.
 * Kit fora do conjunto canônico (ou sem kit) cai em `sem_kit` — o PREÇO nunca
 * depende deste rótulo (vem do core via kitId); é só a etiqueta do inscrito.
 * ⚠️ Fable: persistir o kitId real no inscrito é follow-up (hoje o doc
 * guarda só o enum canônico).
 */
export function kitEnumFromId(kitId: string): KitInscritoInput {
  const norm = kitId.replace(/-/g, '_');
  return KITS_INSCRITO_ENUM.includes(norm as KitInscritoInput)
    ? (norm as KitInscritoInput)
    : 'sem_kit';
}

/** Nome humano do kit escolhido (rótulo do Resumo/Confirmação). */
export function kitNomeFromId(kits: readonly KitPublico[], kitId: string): string {
  if (kitId.length === 0) return 'Sem kit';
  return kits.find((k) => k.id === kitId)?.nome ?? 'Sem kit';
}

/** Kits ofertados para uma modalidade (RN-210 — a FILTRAGEM do checkout). */
export function kitsDaModalidade(
  kits: readonly KitPublico[],
  modalidade: string,
): KitPublico[] {
  if (modalidade.length === 0) return [];
  return kits.filter((k) => k.modalidades.includes(modalidade));
}

/** Itens tamanhados (com grade) inclusos no kit escolhido (RN-215/231). */
export function itensTamanhadosDoKit(
  itens: readonly ItemTamanhadoPublico[],
  kitId: string,
): ItemTamanhadoPublico[] {
  if (kitId.length === 0) return [];
  return itens.filter((item) => item.kits.includes(kitId));
}

/** Inscrito em branco (sem modalidade nem kit escolhidos ainda). */
export function inscritoVazio(): InscritoForm {
  return { nome: '', email: '', cpf: '', nascimento: '', modalidade: '', kitId: '', tamanhos: {} };
}

/**
 * Endereço do COMPRADOR em edição (CKFORM · spec §5.1 item 3): 1× por pedido,
 * do responsável — vira `CheckoutEnderecoInput` no submit (o servidor
 * canoniza o CEP). Todos os campos como string de UI ('' = vazio).
 */
export interface EnderecoForm {
  /** CEP com máscara de UI `00000-000`. */
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
  complemento: string;
}

/** Endereço em branco. */
export function enderecoVazio(): EnderecoForm {
  return { cep: '', logradouro: '', bairro: '', cidade: '', uf: '', numero: '', complemento: '' };
}
