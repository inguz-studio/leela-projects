// =============================================================================
// Tipos do checkout público (client-side) — S1203.
// Formulário do atleta anônimo (ADR-011: 1 responsável/pagador + N inscritos).
// =============================================================================

import type { KitInscritoInput } from '@leela/api-client';
import type { KitPublico } from '@/lib/tipos';

/** Dados de UM inscrito em edição no formulário. */
export interface InscritoForm {
  nome: string;
  email: string;
  cpf: string;
  /** '' até a etapa Modalidade e kit. */
  modalidade: string;
  /**
   * Id do kit REAL do evento (`eventos/{id}/kits/{kitId}`) escolhido nesta
   * inscrição — '' = nenhum kit selecionado. Fonte da precificação (o core soma
   * o `preco` do kit via kitId); o rótulo persistido no inscrito deriva daqui.
   */
  kitId: string;
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
 * real. Os kits canônicos do seed usam ids `kit-ouro`/`kit-prata`/`kit-basico`/
 * `sem-kit` → o enum é o mesmo com `_`. Kit fora do conjunto canônico (ou sem
 * kit) cai em `sem_kit` — o PREÇO nunca depende deste rótulo (vem do core via
 * kitId); é só a etiqueta do inscrito. ⚠️ Fable: persistir o kitId real no
 * inscrito é follow-up (hoje o doc guarda só o enum canônico).
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

/** Inscrito em branco (sem modalidade nem kit escolhidos ainda). */
export function inscritoVazio(): InscritoForm {
  return { nome: '', email: '', cpf: '', modalidade: '', kitId: '' };
}
