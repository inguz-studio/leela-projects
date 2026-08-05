// =============================================================================
// Helpers PUROS do editor de automações (E06 · S402). A validação de FORMA é
// DELEGADA ao core (`validarAutomacao`) — a MESMA que a fronteira das Rules/
// Function espelha. Aqui só a ponte estado-controlado ↔ AutomacaoInput + rótulos.
// =============================================================================

import {
  AUTOMACAO_OFFSET_HORAS_DEFAULT,
  parseContagemPtBr,
  validarAutomacao,
  type AutomacaoInput,
  type CanalCampanha,
  type GatilhoAutomacao,
} from '@leela/core';

/** Estado controlado do form (offsetHoras como string do input). */
export interface AutomacaoFormValues {
  gatilho: GatilhoAutomacao;
  templateRef: string;
  canal: CanalCampanha[];
  ativa: boolean;
  /** Só relevante em vespera_evento/pos_evento — string do input numérico. */
  offsetHoras: string;
}

export const AUTOMACAO_VALORES_INICIAIS: AutomacaoFormValues = {
  gatilho: 'novo_inscrito',
  templateRef: '',
  canal: ['push'],
  ativa: true,
  offsetHoras: String(AUTOMACAO_OFFSET_HORAS_DEFAULT),
};

/** Gatilhos que usam offset de relógio (véspera/pós). @pure */
export function gatilhoUsaOffset(gatilho: GatilhoAutomacao): boolean {
  return gatilho === 'vespera_evento' || gatilho === 'pos_evento';
}

/** Rótulo humano do gatilho. @pure */
export function gatilhoLabel(gatilho: GatilhoAutomacao): string {
  switch (gatilho) {
    case 'novo_inscrito':
      return 'Novo inscrito confirmado';
    case 'kit_disponivel':
      return 'Kit disponível para retirada';
    case 'vespera_evento':
      return 'Véspera do evento';
    case 'pos_evento':
      return 'Após o evento';
  }
}

/** Descrição do gatilho (copy da tela). @pure */
export function gatilhoDescricao(gatilho: GatilhoAutomacao): string {
  switch (gatilho) {
    case 'novo_inscrito':
      return 'Dispara quando uma inscrição é confirmada.';
    case 'kit_disponivel':
      return 'Dispara quando abre a primeira janela de retirada de kit.';
    case 'vespera_evento':
      return 'Dispara o número de horas escolhido ANTES da data do evento.';
    case 'pos_evento':
      return 'Dispara o número de horas escolhido DEPOIS da data do evento.';
  }
}

/** Alterna um canal no array (mín. 1 — não deixa esvaziar). @pure */
export function toggleCanal(atual: CanalCampanha[], canal: CanalCampanha): CanalCampanha[] {
  if (atual.includes(canal)) {
    const proximo = atual.filter((c) => c !== canal);
    return proximo.length === 0 ? atual : proximo;
  }
  return [...atual, canal];
}

/** Monta o `AutomacaoInput` (offset só nos gatilhos de relógio). @pure */
export function paraAutomacaoInput(v: AutomacaoFormValues): AutomacaoInput {
  const base: AutomacaoInput = {
    gatilho: v.gatilho,
    templateRef: v.templateRef.trim(),
    canal: v.canal,
    ativa: v.ativa,
  };
  if (gatilhoUsaOffset(v.gatilho)) {
    // Mesmo parser de vaga e capacidade (FIX-PARSE-MILHAR): "1.000" era lido
    // como UMA hora e a campanha saía no dia errado sem ninguém ser avisado.
    // Fora da faixa o campo continua saindo do input, e o core acusa.
    const lido = parseContagemPtBr(v.offsetHoras);
    if (lido.ok && lido.valor >= 1) base.offsetHoras = lido.valor;
  }
  return base;
}

/** Erros de forma (vazio = pronto). Delega ao core + exige template. @pure */
export function validarAutomacaoForm(v: AutomacaoFormValues): string[] {
  const erros = validarAutomacao(paraAutomacaoInput(v));
  if (v.templateRef.trim().length === 0) {
    erros.push('Escolha a campanha-modelo que será disparada.');
  }
  return erros;
}
