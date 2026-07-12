/**
 * logComunicacaoCore.test.ts — LEELA-FABLE-G-T1
 *
 * Unit PURO do modelo de LOG DE COMUNICAÇÃO (core/comms/logComunicacao):
 *   - enums + type guards + matriz de transição;
 *   - docId determinístico / chave de idempotência (RN-219) — inclusive a
 *     prova de não-colisão de fronteira (chave sem `_`);
 *   - merge monotônico `aplicarEventoProvedor` (webhooks at-least-once e
 *     fora de ordem; falhou/aberto terminais; backfill de enviadoEm);
 *   - `parseLogComunicacao` fail-fast (shape, coerência tipo↔chave↔campanha,
 *     coerência carimbos↔status, PROIBIÇÃO de corpo — PII mínima);
 *   - `parseResumoComunicacoes` fail-fast.
 *
 * Sem emulator — tudo puro.
 */

import { describe, expect, it } from 'vitest';
import {
  aplicarEventoProvedor,
  CANAIS_LOG_COMUNICACAO,
  chaveLogComunicacao,
  isCanalLogComunicacao,
  isStatusLogComunicacao,
  isTipoLogComunicacao,
  logComunicacaoDocId,
  parseLogComunicacao,
  parseResumoComunicacoes,
  podeTransicionarStatusLogComunicacao,
  STATUS_LOG_COMUNICACAO,
  TIPOS_LOG_COMUNICACAO,
  TRANSICOES_STATUS_LOG_COMUNICACAO,
  type EventoProvedor,
  type Timestamp,
} from '@leela/core';

// ── Timestamp de teste (estruturalmente compatível com o core) ─────────────
function ts(millis: number): Timestamp {
  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1e6,
    toDate: () => new Date(millis),
    toMillis: () => millis,
  };
}

const T0 = ts(1_700_000_000_000);
const T1 = ts(1_700_000_060_000);
const T2 = ts(1_700_000_120_000);
const T3 = ts(1_700_000_180_000);

function docValido(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'castelo-producoes',
    eventoId: 'meia-floripa-2026',
    destinatario: { tipo: 'inscrito', ref: 'insc-001' },
    canal: 'email',
    tipo: 'ingresso',
    chave: 'ingresso',
    status: 'enfileirado',
    assunto: 'Seu ingresso — Meia Maratona Floripa 2026',
    enfileiradoEm: T0,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Enums, guards e matriz de transição
// ─────────────────────────────────────────────────────────────────────────
describe('enums e type guards', () => {
  it('canais = push/email (mesma primitiva do clube — uma fonte)', () => {
    expect([...CANAIS_LOG_COMUNICACAO].sort()).toEqual(['email', 'push']);
    expect(isCanalLogComunicacao('email')).toBe(true);
    expect(isCanalLogComunicacao('sms')).toBe(false);
  });

  it('tipos = ingresso/campanha/transacional', () => {
    expect(TIPOS_LOG_COMUNICACAO).toEqual([
      'ingresso',
      'campanha',
      'transacional',
    ]);
    expect(isTipoLogComunicacao('whatsapp')).toBe(false);
  });

  it('status = reticulado de 5 estados', () => {
    expect(STATUS_LOG_COMUNICACAO).toEqual([
      'enfileirado',
      'enviado',
      'entregue',
      'aberto',
      'falhou',
    ]);
    expect(isStatusLogComunicacao('bounce')).toBe(false);
  });

  it('matriz: aberto e falhou são TERMINAIS; entregue/aberto não retro-falham', () => {
    expect(TRANSICOES_STATUS_LOG_COMUNICACAO['aberto']).toEqual([]);
    expect(TRANSICOES_STATUS_LOG_COMUNICACAO['falhou']).toEqual([]);
    expect(podeTransicionarStatusLogComunicacao('entregue', 'falhou')).toBe(false);
    expect(podeTransicionarStatusLogComunicacao('aberto', 'falhou')).toBe(false);
  });

  it('matriz: enviado→aberto existe (webhook de entrega pode se perder)', () => {
    expect(podeTransicionarStatusLogComunicacao('enviado', 'aberto')).toBe(true);
    expect(podeTransicionarStatusLogComunicacao('enfileirado', 'aberto')).toBe(false);
    expect(podeTransicionarStatusLogComunicacao('enfileirado', 'enviado')).toBe(true);
    expect(podeTransicionarStatusLogComunicacao('enviado', 'entregue')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// docId determinístico (idempotência estrutural — RN-219)
// ─────────────────────────────────────────────────────────────────────────
describe('chave + docId determinístico (RN-219)', () => {
  it('tipo ingresso → chave fixa "ingresso" (ref ignorada)', () => {
    expect(chaveLogComunicacao('ingresso')).toBe('ingresso');
    expect(chaveLogComunicacao('ingresso', 'qualquer')).toBe('ingresso');
  });

  it('tipo campanha exige ref (campanhaRef); transacional exige subtipo', () => {
    expect(chaveLogComunicacao('campanha', 'camp-kit-pronto')).toBe(
      'camp-kit-pronto'
    );
    expect(chaveLogComunicacao('transacional', 'emailConfirmacao')).toBe(
      'emailConfirmacao'
    );
    expect(() => chaveLogComunicacao('campanha')).toThrow(/exige ref/);
    expect(() => chaveLogComunicacao('transacional')).toThrow(/exige ref/);
  });

  it('chave com "_" é REJEITADA (fronteira do docId)', () => {
    expect(() => chaveLogComunicacao('transacional', 'email_confirmacao')).toThrow();
    expect(() => logComunicacaoDocId('insc-1', 'a_b', 'email')).toThrow(/inválida/);
  });

  it('mesmo trio → SEMPRE o mesmo docId (reprocesso colide — não reenvia)', () => {
    const a = logComunicacaoDocId('insc-001', 'ingresso', 'email');
    const b = logComunicacaoDocId('insc-001', 'ingresso', 'email');
    expect(a).toBe(b);
    expect(a).toBe('insc-001_ingresso_email');
  });

  it('trios distintos NÃO colidem mesmo com "_" no destinatarioRef', () => {
    // ref='a_b',chave='c' vs ref='a',chave='b-c' — sem "_" na chave não há
    // como dois trios distintos serializarem no mesmo id.
    const x = logComunicacaoDocId('a_b', 'c', 'email');
    const y = logComunicacaoDocId('a', 'b-c', 'email');
    expect(x).not.toBe(y);
  });

  it('destinatarioRef vazio e canal inválido lançam', () => {
    expect(() => logComunicacaoDocId('', 'ingresso', 'email')).toThrow(/vazio/);
    expect(() =>
      logComunicacaoDocId('insc-1', 'ingresso', 'sms' as never)
    ).toThrow(/canal/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Merge monotônico (aplicarEventoProvedor)
// ─────────────────────────────────────────────────────────────────────────
describe('aplicarEventoProvedor — merge monotônico de webhooks', () => {
  const base = {
    status: 'enfileirado' as const,
  };

  it('caminho feliz: enfileirado → enviado → entregue → aberto', () => {
    const enviado = aplicarEventoProvedor(base, {
      tipo: 'enviado',
      em: T1,
      providerMessageId: 'pm-123',
    });
    expect(enviado).toEqual({
      status: 'enviado',
      enviadoEm: T1,
      providerMessageId: 'pm-123',
    });

    const entregue = aplicarEventoProvedor(
      { status: 'enviado', enviadoEm: T1, providerMessageId: 'pm-123' },
      { tipo: 'entregue', em: T2 }
    );
    expect(entregue).toEqual({ status: 'entregue', entregueEm: T2 });

    const aberto = aplicarEventoProvedor(
      { status: 'entregue', enviadoEm: T1, entregueEm: T2 },
      { tipo: 'aberto', em: T3 }
    );
    expect(aberto).toEqual({ status: 'aberto', abertoEm: T3 });
  });

  it('IDEMPOTENTE: reaplicar o mesmo evento → null (nenhum write)', () => {
    const log = { status: 'enviado' as const, enviadoEm: T1, providerMessageId: 'pm-123' };
    expect(
      aplicarEventoProvedor(log, { tipo: 'enviado', em: T2, providerMessageId: 'pm-123' })
    ).toBeNull();
  });

  it('FORA DE ORDEM: aberto antes de entregue → status aberto com backfill de enviadoEm', () => {
    const m = aplicarEventoProvedor(base, { tipo: 'aberto', em: T2 });
    expect(m).toEqual({ status: 'aberto', abertoEm: T2, enviadoEm: T2 });
  });

  it('FORA DE ORDEM: entregue chegando DEPOIS de aberto → só carimbo, sem regredir', () => {
    const m = aplicarEventoProvedor(
      { status: 'aberto', enviadoEm: T1, abertoEm: T2 },
      { tipo: 'entregue', em: T3 }
    );
    expect(m).toEqual({ entregueEm: T3 }); // status NÃO regride
  });

  it('carimbo existente NUNCA é movido (primeiro vence)', () => {
    const m = aplicarEventoProvedor(
      { status: 'aberto', enviadoEm: T1, abertoEm: T2 },
      { tipo: 'aberto', em: T3 }
    );
    expect(m).toBeNull();
  });

  it('falhou a partir de enfileirado/enviado, com motivo', () => {
    expect(
      aplicarEventoProvedor(base, { tipo: 'falhou', em: T1, falhaMotivo: 'bounce' })
    ).toEqual({ status: 'falhou', falhouEm: T1, falhaMotivo: 'bounce' });
    expect(
      aplicarEventoProvedor(
        { status: 'enviado', enviadoEm: T1 },
        { tipo: 'falhou', em: T2 }
      )
    ).toEqual({ status: 'falhou', falhouEm: T2 });
  });

  it('entregue/aberto NÃO retro-falham; falhou é terminal para tudo', () => {
    expect(
      aplicarEventoProvedor(
        { status: 'entregue', enviadoEm: T1, entregueEm: T2 },
        { tipo: 'falhou', em: T3 }
      )
    ).toBeNull();
    expect(
      aplicarEventoProvedor(
        { status: 'aberto', enviadoEm: T1, abertoEm: T2 },
        { tipo: 'falhou', em: T3 }
      )
    ).toBeNull();
    expect(
      aplicarEventoProvedor({ status: 'falhou', falhouEm: T1 }, {
        tipo: 'enviado',
        em: T2,
      } as EventoProvedor)
    ).toBeNull();
  });

  it('tipo de evento inválido lança (fail-fast)', () => {
    expect(() =>
      aplicarEventoProvedor(base, { tipo: 'clicado', em: T1 } as never)
    ).toThrow(/inválido/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// parseLogComunicacao — fail-fast
// ─────────────────────────────────────────────────────────────────────────
describe('parseLogComunicacao (fail-fast)', () => {
  it('parseia doc válido mínimo (enfileirado)', () => {
    const log = parseLogComunicacao('insc-001_ingresso_email', docValido());
    expect(log.destinatario).toEqual({ tipo: 'inscrito', ref: 'insc-001' });
    expect(log.status).toBe('enfileirado');
    expect(log.campanhaRef).toBeUndefined();
  });

  it('PII mínima: corpo/conteudo/html/body são PROIBIDOS', () => {
    for (const campo of ['corpo', 'conteudo', 'html', 'body']) {
      expect(() =>
        parseLogComunicacao('x', docValido({ [campo]: '<h1>oi</h1>' }))
      ).toThrow(/proibido/);
    }
  });

  it('enums fora do domínio lançam (canal/tipo/status/destinatario.tipo)', () => {
    expect(() => parseLogComunicacao('x', docValido({ canal: 'sms' }))).toThrow(/canal/);
    expect(() => parseLogComunicacao('x', docValido({ tipo: 'zap' }))).toThrow(/tipo/);
    expect(() => parseLogComunicacao('x', docValido({ status: 'lido' }))).toThrow(/status/);
    expect(() =>
      parseLogComunicacao('x', docValido({ destinatario: { tipo: 'clube', ref: 'c1' } }))
    ).toThrow(/destinatario/);
  });

  it('tenantId/eventoId/assunto/enfileiradoEm obrigatórios', () => {
    expect(() => parseLogComunicacao('x', docValido({ tenantId: '' }))).toThrow(/tenantId/);
    expect(() => parseLogComunicacao('x', docValido({ eventoId: undefined }))).toThrow(/eventoId/);
    expect(() => parseLogComunicacao('x', docValido({ assunto: '  ' }))).toThrow(/assunto/);
    expect(() =>
      parseLogComunicacao('x', docValido({ enfileiradoEm: undefined }))
    ).toThrow(/enfileiradoEm/);
  });

  it('coerência tipo↔chave↔campanhaRef', () => {
    // campanha sem campanhaRef
    expect(() =>
      parseLogComunicacao('x', docValido({ tipo: 'campanha', chave: 'camp-1' }))
    ).toThrow(/campanhaRef/);
    // campanha com chave ≠ campanhaRef
    expect(() =>
      parseLogComunicacao(
        'x',
        docValido({ tipo: 'campanha', chave: 'camp-1', campanhaRef: 'camp-2' })
      )
    ).toThrow(/difere/);
    // campanhaRef em tipo não-campanha
    expect(() =>
      parseLogComunicacao('x', docValido({ campanhaRef: 'camp-1' }))
    ).toThrow(/só campanha/);
    // ingresso com chave ≠ 'ingresso'
    expect(() =>
      parseLogComunicacao('x', docValido({ chave: 'outra' }))
    ).toThrow(/ingresso/);
    // campanha válida
    const ok = parseLogComunicacao(
      'insc-001_camp-1_push',
      docValido({
        tipo: 'campanha',
        canal: 'push',
        chave: 'camp-1',
        campanhaRef: 'camp-1',
      })
    );
    expect(ok.campanhaRef).toBe('camp-1');
  });

  it('coerência carimbos↔status: carimbo À FRENTE do status lança', () => {
    // enfileirado com enviadoEm (escrita fora da Function)
    expect(() =>
      parseLogComunicacao('x', docValido({ enviadoEm: T1 }))
    ).toThrow(/à frente do status|fora da Function/);
    // enviado sem enviadoEm
    expect(() =>
      parseLogComunicacao('x', docValido({ status: 'enviado' }))
    ).toThrow(/exige carimbo "enviadoEm"/);
    // entregue exige enviadoEm + entregueEm
    expect(() =>
      parseLogComunicacao('x', docValido({ status: 'entregue', entregueEm: T2 }))
    ).toThrow(/enviadoEm/);
    // falhou não convive com abertoEm
    expect(() =>
      parseLogComunicacao(
        'x',
        docValido({ status: 'falhou', falhouEm: T2, abertoEm: T1 })
      )
    ).toThrow(/abertoEm/);
  });

  it('aberto SEM entregueEm é válido (webhook de entrega perdido)', () => {
    const log = parseLogComunicacao(
      'x',
      docValido({ status: 'aberto', enviadoEm: T1, abertoEm: T2 })
    );
    expect(log.status).toBe('aberto');
    expect(log.entregueEm).toBeUndefined();
  });

  it('falhaMotivo só convive com status falhou', () => {
    expect(() =>
      parseLogComunicacao('x', docValido({ falhaMotivo: 'bounce' }))
    ).toThrow(/falhaMotivo/);
    const ok = parseLogComunicacao(
      'x',
      docValido({ status: 'falhou', falhouEm: T1, falhaMotivo: 'bounce' })
    );
    expect(ok.falhaMotivo).toBe('bounce');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// parseResumoComunicacoes — fail-fast
// ─────────────────────────────────────────────────────────────────────────
describe('parseResumoComunicacoes (fail-fast)', () => {
  const resumoValido = {
    tenantId: 'castelo-producoes',
    total: 3,
    porStatus: { enfileirado: 1, enviado: 0, entregue: 1, aberto: 1, falhou: 0 },
    porCanal: { push: 1, email: 2 },
    porTipo: { ingresso: 2, campanha: 1, transacional: 0 },
  };

  it('parseia resumo válido', () => {
    const r = parseResumoComunicacoes(resumoValido);
    expect(r.total).toBe(3);
    expect(r.porStatus.aberto).toBe(1);
    expect(r.porCanal.email).toBe(2);
  });

  it('contador ausente/negativo/não-inteiro lança (não imputa 0)', () => {
    expect(() =>
      parseResumoComunicacoes({
        ...resumoValido,
        porStatus: { ...resumoValido.porStatus, aberto: undefined },
      })
    ).toThrow(/aberto/);
    expect(() =>
      parseResumoComunicacoes({ ...resumoValido, total: -1 })
    ).toThrow(/total/);
    expect(() =>
      parseResumoComunicacoes({
        ...resumoValido,
        porCanal: { push: 0.5, email: 2 },
      })
    ).toThrow(/push/);
  });

  it('tenantId ausente lança (ADR-009)', () => {
    expect(() =>
      parseResumoComunicacoes({ ...resumoValido, tenantId: '' })
    ).toThrow(/tenantId/);
  });
});
