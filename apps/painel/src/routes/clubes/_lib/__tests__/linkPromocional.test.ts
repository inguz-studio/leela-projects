// =============================================================================
// PROVA do gerador único do link compartilhável (S1215-T1 · RN-429).
//
// Cobre os vetores 4 e 5 do contrato de review antagonista da B1:
//
//   ⚔ 4 — Nenhum domínio de terceiro sai do gerador. Nem `beh.ro`, nem base
//         ausente virando `undefined/...`. Sem base, o comportamento é honesto,
//         no espírito da RN-423.
//   ⚔ 5 — O apelido `c` ENTRA e não SAI: link com `?c=` aplica; nenhum link
//         gerado contém `c`.
//
// Os vetores 1, 2 e 3 (kernel intocado e os dois desempates de comissão) vivem
// em `functions/src/__tests__/afiliados.integration.test.ts`, porque são
// comportamento do `createInscricaoCharge` e só se provam contra o emulator.
// =============================================================================

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  cupomDaEntrada,
  montarLinkPromocional,
  normalizarBasePublica,
  CHAVE_CUPOM_URL_APELIDO,
} from '@leela/core';
import { linkDaParceria } from '../linkParceria';
import type { ParceriaEventoAfiliado } from '@leela/core';

const BASE = 'https://leela-landing.web.app';
const SLUG = 'meia-floripa-2026';
const REF = 'FLORIPA10';

function link(over: Partial<Parameters<typeof montarLinkPromocional>[0]> = {}) {
  return montarLinkPromocional({
    baseUrl: BASE,
    eventoSlug: SLUG,
    refCodigo: REF,
    ...over,
  });
}

describe('⚔ 4 · nenhum domínio de terceiro sai do gerador (RN-429/423)', () => {
  it('a forma canônica é {base}/{slug}?ref=…&cupom=…', () => {
    expect(link({ cupomCodigo: 'FLORIPARUN10' })).toBe(
      `${BASE}/${SLUG}?ref=FLORIPA10&cupom=FLORIPARUN10`,
    );
  });

  it('sem cupom vinculado sai só com ref — e continua rastreando', () => {
    expect(link()).toBe(`${BASE}/${SLUG}?ref=FLORIPA10`);
    expect(link({ cupomCodigo: null })).toBe(`${BASE}/${SLUG}?ref=FLORIPA10`);
  });

  it('BASE AUSENTE devolve null — nunca "undefined/meia-floripa"', () => {
    for (const base of [undefined, null, '', '   ', 42, {}]) {
      const r = link({ baseUrl: base });
      expect(r).toBeNull();
      expect(String(r)).not.toContain('undefined');
    }
  });

  it('base que não é http(s) devolve null — beh.ro nu não passa', () => {
    for (const base of ['beh.ro', 'beh.ro/mfl26', '//beh.ro', 'javascript:alert(1)']) {
      expect(link({ baseUrl: base })).toBeNull();
    }
  });

  it('o host do link sai SEMPRE da base recebida, nunca de um default embutido', () => {
    const gerado = link({ baseUrl: 'https://exemplo.test' })!;
    expect(new URL(gerado).host).toBe('exemplo.test');
    expect(gerado).not.toContain('beh.ro');
    expect(gerado).not.toContain('be-hero');
  });

  it('base com barra final e espaço em volta normaliza sem duplicar barra', () => {
    expect(link({ baseUrl: `  ${BASE}///  ` })).toBe(`${BASE}/${SLUG}?ref=FLORIPA10`);
  });

  it('ref fora do padrão ou slug vazio devolvem null em vez de link torto', () => {
    expect(link({ refCodigo: 'ab' })).toBeNull();
    expect(link({ refCodigo: 'COM ESPACO' })).toBeNull();
    expect(link({ eventoSlug: '  ' })).toBeNull();
  });

  it('cupom podre não vira "&cupom=" vazio — promessa de desconto sem desconto', () => {
    for (const c of ['', '  ', 'a', 'CUPOM COM ESPACO', 'X'.repeat(40)]) {
      const r = link({ cupomCodigo: c });
      expect(r).toBe(`${BASE}/${SLUG}?ref=FLORIPA10`);
      expect(r).not.toContain('cupom=');
    }
  });

  it('normalizarBasePublica recusa o que quebraria atributo/URL', () => {
    expect(normalizarBasePublica('https://ok.test')).toBe('https://ok.test');
    expect(normalizarBasePublica('https://com espaco.test')).toBeNull();
    expect(normalizarBasePublica('https://a"b.test')).toBeNull();
    expect(normalizarBasePublica(`https://${'a'.repeat(600)}.test`)).toBeNull();
  });
});

describe('⚔ 5 · o apelido `c` entra e não sai (RN-429)', () => {
  const ler = (m: Record<string, string>) => (k: string) => m[k] ?? null;

  it('`?c=` é aceito na ENTRADA como apelido de cupom', () => {
    expect(cupomDaEntrada(ler({ c: 'floripa10' }))).toBe('FLORIPA10');
  });

  it('`?cupom=` é aceito e tem precedência quando os dois vêm', () => {
    expect(cupomDaEntrada(ler({ cupom: 'CANONICO', c: 'APELIDO' }))).toBe('CANONICO');
  });

  it('valor podre em qualquer das chaves devolve null, sem viajar ao servidor', () => {
    expect(cupomDaEntrada(ler({ c: 'a' }))).toBeNull();
    expect(cupomDaEntrada(ler({ cupom: '   ' }))).toBeNull();
    expect(cupomDaEntrada(ler({}))).toBeNull();
  });

  it('NENHUM link gerado contém a chave `c` — nem com cupom, nem sem', () => {
    // Vínculo AUSENTE é `{}` e não `{ cupomCodigo: undefined }`: sob
    // `exactOptionalPropertyTypes` o campo omitido e o campo escrito como
    // `undefined` são coisas diferentes, e é o omitido que o chamador real
    // produz (o wrapper do painel monta o objeto com spread condicional).
    const vinculos: Array<Partial<Parameters<typeof montarLinkPromocional>[0]>> = [
      {},
      { cupomCodigo: null },
      { cupomCodigo: 'FLORIPARUN10' },
      { cupomCodigo: 'HEROI10' },
    ];
    for (const vinculo of vinculos) {
      const gerado = link(vinculo)!;
      const chaves = [...new URL(gerado).searchParams.keys()];
      expect(chaves).not.toContain(CHAVE_CUPOM_URL_APELIDO);
      expect(chaves.every((k) => k === 'ref' || k === 'cupom')).toBe(true);
    }
  });

  it('o link gerado é lido de volta pelo próprio leitor de entrada (round-trip)', () => {
    const gerado = link({ cupomCodigo: 'FLORIPARUN10' })!;
    const params = new URL(gerado).searchParams;
    expect(cupomDaEntrada((k) => params.get(k))).toBe('FLORIPARUN10');
    expect(params.get('ref')).toBe(REF);
  });
});

describe('E18 · o link master da parceria é derivado, não lido do doc', () => {
  // O painel lê a base do ambiente (VITE_LEELA_URL). Sem ela não existe link —
  // é o comportamento honesto da RN-423, provado no último caso deste bloco.
  beforeAll(() => vi.stubEnv('VITE_LEELA_URL', BASE));
  afterAll(() => vi.unstubAllEnvs());

  function mkParceria(over: Partial<ParceriaEventoAfiliado> = {}): ParceriaEventoAfiliado {
    return {
      id: 'parceria-meia-floripa-frc',
      tenantId: 'castelo-producoes',
      status: 'ativa',
      tipo: 'evento_afiliado',
      eventoId: SLUG,
      organizadorId: 'uid-marina',
      programaAfiliacaoRef: `eventos/${SLUG}/programaAfiliacao/atual`,
      comissaoPct: 8,
      cupom: 'FLORIPARUN10',
      refCodigo: REF,
      linkMaster: 'beh.ro/mfl26?c=frc',
      janelaAtribuicaoDias: 7,
      termosEspelho: { criterioLiberacao: 'x', prazoRepasseDiasUteis: 10, tetoMensal: null },
      conversoes: 0,
      valorAReceber: 0,
      criadoEm: null as never,
      atualizadoEm: null as never,
      ...over,
    };
  }

  it('parceria com refCodigo deriva o link — e o legado `beh.ro` não aparece', () => {
    const r = linkDaParceria(mkParceria());
    expect(r).not.toBeNull();
    expect(r).toContain(`/${SLUG}?ref=${REF}`);
    expect(r).toContain('cupom=FLORIPARUN10');
    expect(r).not.toContain('beh.ro');
  });

  it('parceria SEM refCodigo devolve null — nunca cai de volta no linkMaster legado', () => {
    const r = linkDaParceria(mkParceria({ refCodigo: undefined as never }));
    expect(r).toBeNull();
  });

  it('o campo legado continua no documento e continua sendo ignorado', () => {
    const p = mkParceria();
    expect(p.linkMaster).toContain('beh.ro');
    expect(linkDaParceria(p) ?? '').not.toContain('beh.ro');
  });

  it('AMBIENTE SEM BASE: o painel fica sem link — e não devolve o legado', () => {
    vi.stubEnv('VITE_LEELA_URL', '');
    const r = linkDaParceria(mkParceria());
    expect(r).toBeNull();
    vi.stubEnv('VITE_LEELA_URL', BASE);
  });
});
