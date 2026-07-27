// =============================================================================
// Lógica pura do form de Política de vendas (LEELA-S305-T2/T3 · E04). Sem React,
// testável isolado. Espelha o kernel `politicaVendas` (@leela/core): defaults
// legais (CDC Art. 49), shape dos 3 blocos e a validação SÃO do core — aqui só
// se converte o estado controlado (números como string) ⇄ o payload do domínio.
//
// FRONTEIRA: a política é SÓ parâmetro (janelas/flags/taxa). A máquina de
// reembolso/estorno/transferência é de E09-S904; esta tela nunca a executa.
// A ESCRITA passa por `salvarPoliticaVendas` (Rules: só tenant_owner grava —
// contrato legal do organizador); esta camada só monta o payload.
// =============================================================================

import {
  politicaVendasPadrao,
  validarPoliticaVendas,
  type PoliticaReembolso,
  type PoliticaTransferencia,
  type PoliticaTrocaIngresso,
  type PoliticaVendas,
} from '@leela/core';

/** Estado controlado do form — números como string do input (convertidos no submit). */
export interface PoliticaVendasValues {
  janelaArrependimentoDias: string;
  corteHoras: string;
  slaAnaliseDias: string;
  /**
   * RN-374: fora da janela de arrependimento, a taxa de serviço volta ao
   * comprador? DENTRO da janela ela volta sempre (art. 49) e isso não aparece
   * no form — não é do organizador desligar a lei.
   */
  devolveTaxaForaDaJanela: boolean;
  transferenciaHabilitada: boolean;
  transferenciaJanelaHoras: string;
  transferenciaTaxa: string;
  trocaHabilitada: boolean;
  trocaJanelaHoras: string;
  permiteReembolsoDowngrade: boolean;
}

/**
 * Preenche o form a partir da política gravada, ou dos DEFAULTS legais do kernel
 * quando o organizador ainda não configurou (`null`) — nunca inventa número: os
 * defaults saem de `politicaVendasPadrao` (CDC Art. 49). @pure
 */
export function valoresDaPolitica(politica: PoliticaVendas | null): PoliticaVendasValues {
  const base = politica ?? politicaVendasPadrao();
  return {
    janelaArrependimentoDias: String(base.reembolso.janelaArrependimentoDias),
    corteHoras: String(base.reembolso.corteHoras),
    slaAnaliseDias: String(base.reembolso.slaAnaliseDias),
    devolveTaxaForaDaJanela: base.reembolso.devolveTaxaForaDaJanela,
    transferenciaHabilitada: base.transferencia.habilitada,
    transferenciaJanelaHoras: String(base.transferencia.janelaHoras),
    transferenciaTaxa: String(base.transferencia.taxa),
    trocaHabilitada: base.trocaIngresso.habilitada,
    trocaJanelaHoras: String(base.trocaIngresso.janelaHoras),
    permiteReembolsoDowngrade: base.trocaIngresso.permiteReembolsoDowngrade,
  };
}

/**
 * Converte o input (string → número): string vazia/lixo vira NaN de propósito —
 * `validarPoliticaVendas` (kernel) rejeita não-inteiro/fora-de-faixa, então o
 * gate de faixa mora numa fonte só (o core). @pure
 */
function paraNumero(valor: string): number {
  const v = valor.trim();
  return v.length === 0 ? Number.NaN : Number(v);
}

/** Monta os 3 blocos do domínio a partir do form. @pure */
export function construirPolitica(values: PoliticaVendasValues): {
  reembolso: PoliticaReembolso;
  transferencia: PoliticaTransferencia;
  trocaIngresso: PoliticaTrocaIngresso;
} {
  return {
    reembolso: {
      janelaArrependimentoDias: paraNumero(values.janelaArrependimentoDias),
      corteHoras: paraNumero(values.corteHoras),
      slaAnaliseDias: paraNumero(values.slaAnaliseDias),
      devolveTaxaForaDaJanela: values.devolveTaxaForaDaJanela,
    },
    transferencia: {
      habilitada: values.transferenciaHabilitada,
      janelaHoras: paraNumero(values.transferenciaJanelaHoras),
      taxa: paraNumero(values.transferenciaTaxa),
    },
    trocaIngresso: {
      habilitada: values.trocaHabilitada,
      janelaHoras: paraNumero(values.trocaJanelaHoras),
      permiteReembolsoDowngrade: values.permiteReembolsoDowngrade,
    },
  };
}

/**
 * Valida o form pela AUTORIDADE do kernel (`validarPoliticaVendas` — a MESMA
 * regra que a api-client re-checa e as Rules espelham). Retorna a lista de erros
 * (vazia = válido) para a UI mostrar honesto antes do submit. @pure
 */
export function validaPoliticaVendas(values: PoliticaVendasValues): string[] {
  return validarPoliticaVendas(construirPolitica(values));
}
