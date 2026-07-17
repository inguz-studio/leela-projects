/**
 * refundTransferCore.test.ts — LEELA-S904 (T1/T3/T4) · unit PURO (sem emulator)
 *
 * Cobre o domínio do core:
 *   - máquina de reembolso (RN-341): matriz COMPLETA de arestas válidas e
 *     inválidas, terminais, no-op e strings fora do enum;
 *   - notificações (RN-342): chaves compatíveis com o log FABLE-G
 *     (CHAVE_LOG_COMUNICACAO_RE — sem `_`), destinatários da abertura
 *     (organizador obrigatório) e de cada transição;
 *   - guardas de transferência (RN-343/344/345): kit entregue/chip/check-in/
 *     flag/janela; recoleta de tamanhos; diff da troca (downgrade RN-344).
 */
import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  CHAVE_LOG_COMUNICACAO_RE,
  chaveTransicaoReembolso,
  diffTrocaIngresso,
  ESTADOS_REEMBOLSO,
  ESTADOS_REEMBOLSO_EXECUTAVEIS,
  ESTADOS_REEMBOLSO_TERMINAIS,
  exigeRecoletaTamanhos,
  isEstadoReembolso,
  notificacoesAberturaReembolso,
  notificacoesTransicaoReembolso,
  podeTransferirTitularidade,
  podeTrocarIngresso,
  transicaoReembolsoValida,
  transitionReembolso,
  type EstadoReembolso,
  type PoliticaTransferencia,
  type PoliticaTrocaIngresso,
} from '@leela/core';

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date('2026-03-15T12:00:00-03:00');
const tsRel = (dias: number): Timestamp =>
  Timestamp.fromDate(new Date(AGORA.getTime() + dias * DIA_MS));

// ─────────────────────────────────────────────────────────────────────────────
// Máquina de reembolso (RN-341)
// ─────────────────────────────────────────────────────────────────────────────

describe('refund-machine · grafo RN-341', () => {
  const VALIDAS: Array<[EstadoReembolso, EstadoReembolso]> = [
    ['solicitado', 'aprovado_auto'],
    ['solicitado', 'em_analise'],
    ['em_analise', 'aprovado'],
    ['em_analise', 'recusado'],
    ['aprovado', 'estornado'],
    ['aprovado_auto', 'estornado'],
  ];

  it('matriz completa: SÓ as 6 arestas do grafo passam; todo o resto rejeita', () => {
    let validas = 0;
    for (const de of ESTADOS_REEMBOLSO) {
      for (const para of ESTADOS_REEMBOLSO) {
        const esperada = VALIDAS.some(([d, p]) => d === de && p === para);
        expect(transicaoReembolsoValida(de, para), `${de}→${para}`).toBe(esperada);
        if (esperada) validas++;
        const r = transitionReembolso(de, para);
        expect(r.ok, `${de}→${para}`).toBe(esperada && de !== para);
        if (!r.ok) expect(r.motivo).toBeTruthy();
      }
    }
    expect(validas).toBe(6);
  });

  it('terminais não têm saída; executáveis são aprovado/aprovado_auto', () => {
    for (const terminal of ESTADOS_REEMBOLSO_TERMINAIS) {
      for (const para of ESTADOS_REEMBOLSO) {
        expect(transicaoReembolsoValida(terminal, para)).toBe(false);
      }
    }
    expect([...ESTADOS_REEMBOLSO_EXECUTAVEIS].sort()).toEqual(['aprovado', 'aprovado_auto']);
  });

  it('pular a decisão (solicitado→estornado) rejeita; no-op rejeita; lixo rejeita', () => {
    expect(transitionReembolso('solicitado', 'estornado').ok).toBe(false);
    expect(transitionReembolso('em_analise', 'em_analise').ok).toBe(false);
    expect(transitionReembolso('hackeado' as EstadoReembolso, 'estornado').ok).toBe(false);
    expect(isEstadoReembolso('hackeado')).toBe(false);
    expect(isEstadoReembolso('estornado')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notificações (RN-342 · T3)
// ─────────────────────────────────────────────────────────────────────────────

describe('refund-notifications · RN-342', () => {
  it('toda chave gerada é compatível com o log FABLE-G (sem `_`, regex)', () => {
    for (const estado of ESTADOS_REEMBOLSO) {
      expect(chaveTransicaoReembolso(estado)).toMatch(CHAVE_LOG_COMUNICACAO_RE);
      expect(chaveTransicaoReembolso(estado)).not.toContain('_');
    }
    for (const n of notificacoesAberturaReembolso('insc_0001', 'uid-marina', 'em_analise')) {
      expect(n.chave, n.chave).toMatch(CHAVE_LOG_COMUNICACAO_RE);
    }
  });

  it('abertura: organizador (obrigatório) + recibo + transição inicial ao atleta', () => {
    const ns = notificacoesAberturaReembolso('insc-1', 'uid-org', 'aprovado_auto');
    expect(ns).toHaveLength(3);
    expect(ns[0]!.destinatario).toEqual({ tipo: 'organizador', ref: 'uid-org' });
    expect(ns[1]!.destinatario).toEqual({ tipo: 'inscrito', ref: 'insc-1' });
    expect(ns[1]!.chave).toBe('reembolso-recibo');
    expect(ns[2]!.chave).toBe('reembolso-aprovado-auto');
  });

  it('transição: exatamente 1 notificação ao atleta, chave por estado', () => {
    const ns = notificacoesTransicaoReembolso('insc-1', 'estornado');
    expect(ns).toHaveLength(1);
    expect(ns[0]!.destinatario.tipo).toBe('inscrito');
    expect(ns[0]!.chave).toBe('reembolso-estornado');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Guardas de transferência (RN-343/344/345 · T4)
// ─────────────────────────────────────────────────────────────────────────────

const POLITICA_TRANSFER: PoliticaTransferencia = {
  habilitada: true,
  janelaHoras: 72,
  taxa: 25,
};
const POLITICA_TROCA: PoliticaTrocaIngresso = {
  habilitada: true,
  janelaHoras: 48,
  permiteReembolsoDowngrade: false,
};

const INSCRITO_LIMPO = {
  status: 'confirmado' as const,
  chipNumero: null,
  tamanhos: { 'camiseta-tecnica': 'M' },
};

describe('transfer · podeTransferirTitularidade (RN-345)', () => {
  it('caminho feliz: confirmado, sem kit/chip/check-in, política aberta', () => {
    expect(
      podeTransferirTitularidade(INSCRITO_LIMPO, POLITICA_TRANSFER, tsRel(30), AGORA).ok
    ).toBe(true);
  });

  it.each([
    ['kit entregue', { ...INSCRITO_LIMPO, kitEntregueEm: tsRel(-1) }],
    ['chip vinculado', { ...INSCRITO_LIMPO, chipNumero: 'CHIP-042' }],
    ['check-in feito', { ...INSCRITO_LIMPO, checkinEm: tsRel(-1) }],
    ['não confirmado', { ...INSCRITO_LIMPO, status: 'pendente' as const }],
    ['estornado', { ...INSCRITO_LIMPO, status: 'estornado' as const }],
  ])('bloqueia: %s', (_rotulo, inscrito) => {
    const r = podeTransferirTitularidade(inscrito, POLITICA_TRANSFER, tsRel(30), AGORA);
    expect(r.ok).toBe(false);
    expect(r.motivo).toBeTruthy();
  });

  it('bloqueia: flag desligada e janela encerrada (RN-343)', () => {
    expect(
      podeTransferirTitularidade(
        INSCRITO_LIMPO,
        { ...POLITICA_TRANSFER, habilitada: false },
        tsRel(30),
        AGORA
      ).ok
    ).toBe(false);
    // Evento em 48h < janela de 72h ⇒ fechada
    expect(
      podeTransferirTitularidade(INSCRITO_LIMPO, POLITICA_TRANSFER, tsRel(2), AGORA).ok
    ).toBe(false);
  });
});

describe('transfer · podeTrocarIngresso (RN-344) + diff', () => {
  const INSCRITO_10K = { status: 'confirmado' as const, modalidade: '10k' };
  const MODALIDADES = ['5k', '10k', '21k'];

  it('feliz: destino existe, difere, flag ligada, janela aberta', () => {
    expect(
      podeTrocarIngresso(INSCRITO_10K, '21k', MODALIDADES, POLITICA_TROCA, tsRel(30), AGORA).ok
    ).toBe(true);
  });

  it.each([
    ['modalidade inexistente', '42k'],
    ['mesma modalidade (no-op)', '10k'],
  ])('bloqueia: %s', (_rotulo, destino) => {
    expect(
      podeTrocarIngresso(INSCRITO_10K, destino, MODALIDADES, POLITICA_TROCA, tsRel(30), AGORA).ok
    ).toBe(false);
  });

  it('bloqueia: flag off · janela fechada · não confirmado', () => {
    expect(
      podeTrocarIngresso(INSCRITO_10K, '21k', MODALIDADES,
        { ...POLITICA_TROCA, habilitada: false }, tsRel(30), AGORA).ok
    ).toBe(false);
    expect(
      podeTrocarIngresso(INSCRITO_10K, '21k', MODALIDADES, POLITICA_TROCA, tsRel(1), AGORA).ok
    ).toBe(false);
    expect(
      podeTrocarIngresso({ status: 'cancelado', modalidade: '10k' }, '21k', MODALIDADES,
        POLITICA_TROCA, tsRel(30), AGORA).ok
    ).toBe(false);
  });

  it('diff: upgrade cobra a diferença; downgrade trava em 0 sem a flag (RN-344)', () => {
    expect(diffTrocaIngresso(249.9, 189.9, POLITICA_TROCA)).toBe(60);
    expect(diffTrocaIngresso(99.9, 189.9, POLITICA_TROCA)).toBe(0);
    expect(
      diffTrocaIngresso(99.9, 189.9, { permiteReembolsoDowngrade: true })
    ).toBe(-90);
    // cent-exato (nunca float sujo)
    expect(diffTrocaIngresso(170.91, 170.91, POLITICA_TROCA)).toBe(0);
  });
});

describe('transfer · exigeRecoletaTamanhos (RN-345)', () => {
  it('kit tamanhado não entregue ⇒ recoleta; sem item tamanhado ⇒ não', () => {
    expect(exigeRecoletaTamanhos({ tamanhos: { camiseta: 'M' } })).toBe(true);
    expect(exigeRecoletaTamanhos({ tamanhos: {} })).toBe(false);
    // kit JÁ entregue: a transferência nem passa (bloqueada) — recoleta não se aplica
    expect(
      exigeRecoletaTamanhos({ tamanhos: { camiseta: 'M' }, kitEntregueEm: tsRel(-1) })
    ).toBe(false);
  });
});
