/**
 * evento.test.ts — LEELA-S200-T1
 *
 * Unit: parsing/derivação de `Evento` em @leela/core (domínio puro, sem I/O).
 */

import { describe, expect, it } from 'vitest';
import {
  CAMPOS_AGREGADOS_EVENTO,
  eventoPublico,
  IMAGEM_URL_MAX,
  isStatusEvento,
  isUrlCapaValida,
  modoTaxaDoEvento,
  parseEvento,
  STATUS_EVENTO,
  temVenda,
} from '@leela/core';

const fakeTs = { seconds: 1_777_600_800, nanoseconds: 0 };

/** Doc canônico da Meia Floripa 2026 (shape do seed HANDOFF-05) */
function docMeiaFloripa(): Record<string, unknown> {
  return {
    tenantId: 'castelo-producoes',
    organizadorId: 'uid-marina-castelo',
    nome: 'Meia Maratona Floripa 2026',
    data: fakeTs,
    local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'],
    slug: 'meia-floripa-2026',
    status: 'publicado',
    usaChip: true,
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
    qtdInscritos: 453,
    receitaConfirmada: 85617,
  };
}

describe('StatusEvento (S200-T1)', () => {
  it('aceita os 4 status canônicos', () => {
    for (const status of STATUS_EVENTO) {
      expect(isStatusEvento(status)).toBe(true);
    }
  });

  it('rejeita status fora do enum', () => {
    expect(isStatusEvento('cancelado')).toBe(false);
    expect(isStatusEvento('')).toBe(false);
    expect(isStatusEvento(null)).toBe(false);
    expect(isStatusEvento(42)).toBe(false);
  });
});

describe('parseEvento (S200-T1)', () => {
  it('parseia o doc canônico da Meia Floripa 2026', () => {
    const evento = parseEvento('meia-floripa-2026', docMeiaFloripa());

    expect(evento.id).toBe('meia-floripa-2026');
    expect(evento.tenantId).toBe('castelo-producoes');
    expect(evento.organizadorId).toBe('uid-marina-castelo');
    expect(evento.status).toBe('publicado');
    expect(evento.usaChip).toBe(true);
    expect(evento.modalidades).toEqual(['5k', '10k', '21k']);
    expect(evento.qtdInscritos).toBe(453);
    expect(evento.receitaConfirmada).toBe(85617);
  });

  it('agregados ausentes entram como 0 (doc recém-criado pela Function)', () => {
    const raw = docMeiaFloripa();
    delete raw['qtdInscritos'];
    delete raw['receitaConfirmada'];

    const evento = parseEvento('novo-evento', raw);
    expect(evento.qtdInscritos).toBe(0);
    expect(evento.receitaConfirmada).toBe(0);
  });

  it('slug ausente cai no docId (docId = slug por convenção)', () => {
    const raw = docMeiaFloripa();
    delete raw['slug'];
    expect(parseEvento('meia-floripa-2026', raw).slug).toBe('meia-floripa-2026');
  });

  it('lança em status fora do enum', () => {
    const raw = docMeiaFloripa();
    raw['status'] = 'hackeado';
    expect(() => parseEvento('x', raw)).toThrow(/status/);
  });

  it('lança sem tenantId (ADR-009 — isolamento obrigatório)', () => {
    const raw = docMeiaFloripa();
    delete raw['tenantId'];
    expect(() => parseEvento('x', raw)).toThrow(/tenantId/);
  });

  it('lança sem nome ou sem organizadorId', () => {
    const semNome = docMeiaFloripa();
    delete semNome['nome'];
    expect(() => parseEvento('x', semNome)).toThrow(/nome/);

    const semOrg = docMeiaFloripa();
    delete semOrg['organizadorId'];
    expect(() => parseEvento('x', semOrg)).toThrow(/organizadorId/);
  });

  it('lança com modalidades não-lista-de-strings', () => {
    const raw = docMeiaFloripa();
    raw['modalidades'] = [5, 10, 21];
    expect(() => parseEvento('x', raw)).toThrow(/modalidades/);
  });
});

describe('parseEvento — capacidade (S600-T2-fix · handoff E02/E03)', () => {
  it('expõe a capacidade direta do doc (base do ratio 453/500)', () => {
    const raw = docMeiaFloripa();
    raw['capacidade'] = 500;
    const evento = parseEvento('meia-floripa-2026', raw);
    expect(evento.capacidade).toBe(500);
    expect(evento.qtdInscritos).toBe(453);
  });

  it('ausente → null (desconhecida; resolução Σkits é server-side — RN-210)', () => {
    expect(parseEvento('meia-floripa-2026', docMeiaFloripa()).capacidade).toBeNull();
  });

  it('inválida (0, negativa, não-finita, não-numérica) → null — nunca inventa', () => {
    for (const invalida of [0, -10, Number.NaN, Number.POSITIVE_INFINITY, '500', null]) {
      const raw = docMeiaFloripa();
      raw['capacidade'] = invalida;
      expect(parseEvento('x', raw).capacidade).toBeNull();
    }
  });
});

describe('derivações puras (S200-T1)', () => {
  it('temVenda: 453 inscritos → true; 0 → false (base da RN-200)', () => {
    expect(temVenda({ qtdInscritos: 453 })).toBe(true);
    expect(temVenda({ qtdInscritos: 0 })).toBe(false);
  });

  it('eventoPublico: publicado/ao_vivo → true; rascunho/encerrado → false', () => {
    expect(eventoPublico('publicado')).toBe(true);
    expect(eventoPublico('ao_vivo')).toBe(true);
    expect(eventoPublico('rascunho')).toBe(false);
    expect(eventoPublico('encerrado')).toBe(false);
  });

  it('CAMPOS_AGREGADOS_EVENTO espelha os campos ∑ das Rules', () => {
    expect(CAMPOS_AGREGADOS_EVENTO).toEqual(['qtdInscritos', 'receitaConfirmada']);
  });
});

// ── EVENTO-CAMPOS (RN-153/RN-347): capa http(s), regulamento, taxaModo ─────

describe('isUrlCapaValida (RN-153 — capa é src de <img> público)', () => {
  it('aceita http(s) com host', () => {
    expect(isUrlCapaValida('https://cdn.leela.run/capa.jpg')).toBe(true);
    expect(isUrlCapaValida('http://exemplo.com.br/foto.png?w=1600')).toBe(true);
  });

  it('rejeita javascript:/data:/file:/esquema relativo (ataque de capa)', () => {
    expect(isUrlCapaValida('javascript:alert(document.cookie)')).toBe(false);
    expect(isUrlCapaValida('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
    expect(isUrlCapaValida('file:///etc/passwd')).toBe(false);
    expect(isUrlCapaValida('//cdn.evil.com/x.png')).toBe(false);
    expect(isUrlCapaValida('/uploads/x.png')).toBe(false);
  });

  it('rejeita vazio, não-string, espaço embutido e URL acima do teto', () => {
    expect(isUrlCapaValida('')).toBe(false);
    expect(isUrlCapaValida(42)).toBe(false);
    expect(isUrlCapaValida(null)).toBe(false);
    expect(isUrlCapaValida('https://a.com/um espaço.png')).toBe(false);
    expect(isUrlCapaValida(`https://a.com/${'x'.repeat(IMAGEM_URL_MAX)}`)).toBe(false);
  });
});

describe('parseEvento — capa/regulamento/taxaModo (EVENTO-CAMPOS)', () => {
  it('capa http(s) válida passa; esquema fora de http(s) é DESCARTADO (fallback gradiente)', () => {
    const raw = docMeiaFloripa();
    raw['imagemUrl'] = 'https://cdn.leela.run/meia-floripa.jpg';
    expect(parseEvento('x', raw).imagemUrl).toBe('https://cdn.leela.run/meia-floripa.jpg');

    raw['imagemUrl'] = 'javascript:alert(1)';
    expect(parseEvento('x', raw).imagemUrl).toBeUndefined();

    raw['imagemUrl'] = '';
    expect(parseEvento('x', raw).imagemUrl).toBeUndefined();
  });

  it('regulamento: texto não-vazio passa; vazio/não-string → undefined', () => {
    const raw = docMeiaFloripa();
    raw['regulamento'] = 'Art. 1º — A prova acontece com chuva ou sol.';
    expect(parseEvento('x', raw).regulamento).toMatch(/Art\. 1º/);

    raw['regulamento'] = '';
    expect(parseEvento('x', raw).regulamento).toBeUndefined();
    raw['regulamento'] = 42;
    expect(parseEvento('x', raw).regulamento).toBeUndefined();
  });

  it('taxaModo: os dois modos do enum passam; ausente/null → undefined (legado)', () => {
    const raw = docMeiaFloripa();
    raw['taxaModo'] = 'repassada';
    expect(parseEvento('x', raw).taxaModo).toBe('repassada');
    raw['taxaModo'] = 'incorporada';
    expect(parseEvento('x', raw).taxaModo).toBe('incorporada');

    expect(parseEvento('x', docMeiaFloripa()).taxaModo).toBeUndefined();
    raw['taxaModo'] = null;
    expect(parseEvento('x', raw).taxaModo).toBeUndefined();
  });

  it('taxaModo fora do enum LANÇA (campo de dinheiro — fail-fast na borda de I/O)', () => {
    const raw = docMeiaFloripa();
    raw['taxaModo'] = 'gratis';
    expect(() => parseEvento('x', raw)).toThrow(/taxaModo/);
    raw['taxaModo'] = 42;
    expect(() => parseEvento('x', raw)).toThrow(/RN-347/);
  });

  it('modoTaxaDoEvento: campo presente vence; ausente → incorporada (vigente)', () => {
    expect(modoTaxaDoEvento({ taxaModo: 'repassada' })).toBe('repassada');
    expect(modoTaxaDoEvento({ taxaModo: 'incorporada' })).toBe('incorporada');
    expect(modoTaxaDoEvento({})).toBe('incorporada');
  });
});
