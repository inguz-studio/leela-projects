// =============================================================================
// Tipos do checkout público (client-side) — S1203.
// Formulário do atleta anônimo (ADR-011: 1 responsável/pagador + N inscritos).
// =============================================================================

import type { KitInscritoInput } from '@leela/api-client';

/** Dados de UM inscrito em edição no formulário (modalidade escolhida na etapa 2). */
export interface InscritoForm {
  nome: string;
  email: string;
  cpf: string;
  /** '' até a etapa Modalidade/Kit. */
  modalidade: string;
  kit: KitInscritoInput;
}

/** Forma de pagamento na UI (espelho de FormaPagamento do core). */
export type FormaUI = 'pix' | 'cartao_credito';

/** Rótulos humanos dos kits (RN-202) — nunca a chave crua. */
export const KIT_OPCOES: { value: KitInscritoInput; label: string }[] = [
  { value: 'sem_kit', label: 'Sem kit' },
  { value: 'kit_basico', label: 'Kit básico' },
  { value: 'kit_prata', label: 'Kit prata' },
  { value: 'kit_ouro', label: 'Kit ouro' },
];

/** Inscrito em branco (default: sem kit — RN-202). */
export function inscritoVazio(): InscritoForm {
  return { nome: '', email: '', cpf: '', modalidade: '', kit: 'sem_kit' };
}
