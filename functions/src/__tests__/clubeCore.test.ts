/**
 * clubeCore.test.ts — LEELA-S101-T1
 *
 * Unit (core puro, sem emulador): código de convite (RN-101) e
 * validação do payload de clube (limites do modelo de dados).
 */
import { describe, expect, it } from 'vitest';
import {
  ALFABETO_CODIGO_CONVITE,
  TAMANHO_CODIGO_CONVITE,
  gerarCodigoConvite,
  validarCodigoConvite,
  validarClube,
  validarSlugClube,
  CLUBE_NOME_MAX,
  CLUBE_DESCRICAO_MAX,
  type ClubeInput,
} from '@leela/core';

// ── validarCodigoConvite (RN-101) ─────────────────────────────────────────

describe('validarCodigoConvite (RN-101)', () => {
  it('aceita o código canônico 8A3K9', () => {
    expect(validarCodigoConvite('8A3K9')).toBe(true);
  });

  it.each(['0', 'O', '1', 'I', 'L'])(
    'rejeita código contendo o char ambíguo %s',
    (proibido) => {
      // Substitui o 3º char de um código válido pelo proibido
      expect(validarCodigoConvite(`8A${proibido}K9`)).toBe(false);
    }
  );

  it('rejeita comprimento diferente de 5', () => {
    expect(validarCodigoConvite('8A3K')).toBe(false);
    expect(validarCodigoConvite('8A3K92')).toBe(false);
    expect(validarCodigoConvite('')).toBe(false);
  });

  it('rejeita minúsculas (código canônico é maiúsculo)', () => {
    expect(validarCodigoConvite('8a3k9')).toBe(false);
  });

  it('rejeita símbolos fora do alfabeto', () => {
    expect(validarCodigoConvite('8A-K9')).toBe(false);
    expect(validarCodigoConvite('8A K9')).toBe(false);
  });

  it('alfabeto não contém nenhum char proibido', () => {
    for (const proibido of ['0', 'O', '1', 'I', 'L']) {
      expect(ALFABETO_CODIGO_CONVITE.includes(proibido)).toBe(false);
    }
  });
});

// ── gerarCodigoConvite ────────────────────────────────────────────────────

describe('gerarCodigoConvite', () => {
  it('gera códigos sempre válidos (fuzz 500 iterações)', () => {
    for (let i = 0; i < 500; i++) {
      const codigo = gerarCodigoConvite();
      expect(validarCodigoConvite(codigo)).toBe(true);
      expect(codigo).toHaveLength(TAMANHO_CODIGO_CONVITE);
    }
  });

  it('é determinístico com RNG injetado', () => {
    const rng = (): number => 0; // sempre o primeiro símbolo do alfabeto
    expect(gerarCodigoConvite(rng)).toBe('AAAAA');
  });

  it('não estoura o alfabeto com random() ~1', () => {
    const rng = (): number => 0.999999999;
    const codigo = gerarCodigoConvite(rng);
    expect(validarCodigoConvite(codigo)).toBe(true);
  });
});

// ── validarClube / validarSlugClube ───────────────────────────────────────

const CLUBE_OK: ClubeInput = {
  tenantId: 'corrida-perfeita',
  nome: 'Corrida Perfeita Sul',
  descricao: 'Assessoria de corrida na Lagoa da Conceição.',
  slug: 'corrida-perfeita-sul',
  categoria: 'Assessoria esportiva',
  modalidade: 'Corrida de rua',
  localizacao: { cidade: 'Florianópolis', estado: 'SC', online: false },
  ownerId: 'uid-felipe-martins',
  codigoConvite: '8A3K9',
  visibilidade: 'publica',
  aprovacaoManual: false,
  modeloEntrada: 'gratuito',
};

describe('validarClube', () => {
  it('payload canônico é válido (zero erros)', () => {
    expect(validarClube(CLUBE_OK)).toEqual([]);
  });

  it('rejeita categoria fora do vocabulário fechado', () => {
    const erros = validarClube({ ...CLUBE_OK, categoria: 'Qualquer coisa' });
    expect(erros.some((e) => e.includes('categoria'))).toBe(true);
  });

  it('rejeita modalidade fora do vocabulário fechado', () => {
    const erros = validarClube({ ...CLUBE_OK, modalidade: 'Xadrez' });
    expect(erros.some((e) => e.includes('modalidade'))).toBe(true);
  });

  it('presencial exige cidade + UF válida', () => {
    const semCidade = validarClube({
      ...CLUBE_OK,
      localizacao: { cidade: '', estado: 'SC', online: false },
    });
    expect(semCidade.some((e) => e.includes('cidade'))).toBe(true);

    const ufInvalida = validarClube({
      ...CLUBE_OK,
      localizacao: { cidade: 'Floripa', estado: 'XX', online: false },
    });
    expect(ufInvalida.some((e) => e.includes('estado'))).toBe(true);
  });

  it('online é válido sem cidade/estado (clube sem sede física)', () => {
    const online = validarClube({
      ...CLUBE_OK,
      localizacao: { cidade: '', estado: '', online: true },
    });
    expect(online).toEqual([]);
  });

  it(`rejeita nome com mais de ${CLUBE_NOME_MAX} chars`, () => {
    const erros = validarClube({ ...CLUBE_OK, nome: 'x'.repeat(CLUBE_NOME_MAX + 1) });
    expect(erros.some((e) => e.includes('nome'))).toBe(true);
  });

  it('rejeita nome vazio', () => {
    expect(validarClube({ ...CLUBE_OK, nome: '  ' }).length).toBeGreaterThan(0);
  });

  it(`rejeita descricao com mais de ${CLUBE_DESCRICAO_MAX} chars`, () => {
    const erros = validarClube({
      ...CLUBE_OK,
      descricao: 'x'.repeat(CLUBE_DESCRICAO_MAX + 1),
    });
    expect(erros.some((e) => e.includes('descricao'))).toBe(true);
  });

  it('rejeita código de convite inválido (RN-101)', () => {
    const erros = validarClube({ ...CLUBE_OK, codigoConvite: '8A0K9' });
    expect(erros.some((e) => e.includes('codigoConvite'))).toBe(true);
  });

  it('exige tenantId (ADR-009)', () => {
    const erros = validarClube({ ...CLUBE_OK, tenantId: '' });
    expect(erros.some((e) => e.includes('tenantId'))).toBe(true);
  });

  // ── Capa do clube (RN-166 · S1702-T1 — nome canônico imagemUrl) ─────────

  it('capa ausente é válida (campo opcional)', () => {
    expect(validarClube(CLUBE_OK)).toEqual([]);
  });

  it('aceita imagemUrl http(s) válida', () => {
    expect(
      validarClube({ ...CLUBE_OK, imagemUrl: 'https://cdn.leela.dev/capas/cps.jpg' })
    ).toEqual([]);
  });

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'file:///etc/passwd',
    '',
    'não-é-url',
  ])('rejeita imagemUrl perigosa/inválida: %s', (url) => {
    const erros = validarClube({ ...CLUBE_OK, imagemUrl: url });
    expect(erros.some((e) => e.includes('imagemUrl'))).toBe(true);
  });

  it('rejeita imagemUrl acima de 2048 chars (anti doc-bomba)', () => {
    const url = `https://cdn.leela.dev/${'x'.repeat(2100)}`;
    const erros = validarClube({ ...CLUBE_OK, imagemUrl: url });
    expect(erros.some((e) => e.includes('imagemUrl'))).toBe(true);
  });
});

describe('validarSlugClube', () => {
  it.each(['corrida-perfeita-sul', 'clube1', 'a-b-c'])('aceita %s', (slug) => {
    expect(validarSlugClube(slug)).toBe(true);
  });

  it.each(['Corrida-Sul', 'corrida_sul', 'corrida sul', '-inicio', 'fim-', 'açaí', ''])(
    'rejeita %s',
    (slug) => {
      expect(validarSlugClube(slug)).toBe(false);
    }
  );
});
