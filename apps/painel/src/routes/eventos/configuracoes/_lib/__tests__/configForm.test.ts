// =============================================================================
// Testes da lógica pura do form de Configurações gerais (S304-T2). Validação,
// derivação de capacidade e URL pública (sempre {DOMINIO_LEELA}, nunca host
// legado).
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  capacidadeParaNumero,
  imagemUrlDoForm,
  taxaModoDoForm,
  urlPublicaEvento,
  valoresDoEvento,
  validaConfigGerais,
} from '../configForm';

describe('urlPublicaEvento', () => {
  it('usa o placeholder {DOMINIO_LEELA} e nunca vaza o host legado', () => {
    const url = urlPublicaEvento('meia-floripa-2026');
    expect(url).toBe('{DOMINIO_LEELA}/meia-floripa-2026');
    expect(url).not.toContain('be-hero');
    expect(url).not.toContain('beh.ro');
  });
});

describe('capacidadeParaNumero', () => {
  it('vazio → null (desconhecida)', () => {
    expect(capacidadeParaNumero('')).toBeNull();
    expect(capacidadeParaNumero('   ')).toBeNull();
  });
  it('inteiro > 0 → número', () => {
    expect(capacidadeParaNumero('500')).toBe(500);
  });
  it('não-inteiro / ≤ 0 → null', () => {
    expect(capacidadeParaNumero('0')).toBeNull();
    expect(capacidadeParaNumero('-3')).toBeNull();
    expect(capacidadeParaNumero('12.5')).toBeNull();
    expect(capacidadeParaNumero('abc')).toBeNull();
  });
});

describe('valoresDoEvento', () => {
  it('preenche a partir do evento; capacidade null → campo vazio', () => {
    expect(
      valoresDoEvento({ nome: 'Meia', local: 'Floripa', usaChip: true, capacidade: null }),
    ).toEqual({ nome: 'Meia', local: 'Floripa', usaChip: true, capacidade: '', repassarTaxa: false, vendaSomentePorCupom: false, imagemUrl: '' });
    expect(
      valoresDoEvento({ nome: 'Meia', local: 'Floripa', usaChip: false, capacidade: 500 }),
    ).toEqual({ nome: 'Meia', local: 'Floripa', usaChip: false, capacidade: '500', repassarTaxa: false, vendaSomentePorCupom: false, imagemUrl: '' });
  });

  it('capa (CEV · RN-228): imagemUrl do evento preenche; ausente ⇒ vazio', () => {
    expect(
      valoresDoEvento({ nome: 'E', local: 'L', usaChip: true, imagemUrl: 'https://cdn.x/capa.jpg' })
        .imagemUrl,
    ).toBe('https://cdn.x/capa.jpg');
    expect(valoresDoEvento({ nome: 'E', local: 'L', usaChip: true }).imagemUrl).toBe('');
  });

  it('deriva repassarTaxa do taxaModo (RN-347): ausente ⇒ false, repassada ⇒ true', () => {
    expect(valoresDoEvento({ nome: 'E', local: 'L', usaChip: true }).repassarTaxa).toBe(false);
    expect(
      valoresDoEvento({ nome: 'E', local: 'L', usaChip: true, taxaModo: 'incorporada' }).repassarTaxa,
    ).toBe(false);
    expect(
      valoresDoEvento({ nome: 'E', local: 'L', usaChip: true, taxaModo: 'repassada' }).repassarTaxa,
    ).toBe(true);
  });
});

describe('taxaModoDoForm', () => {
  it('mapeia o toggle para o enum ModoTaxa (RN-347)', () => {
    expect(taxaModoDoForm(false)).toBe('incorporada');
    expect(taxaModoDoForm(true)).toBe('repassada');
  });
});

describe('imagemUrlDoForm (CEV · RN-228)', () => {
  it("'' e espaços ⇒ null (REMOVE — deleteField no fluxo canônico)", () => {
    expect(imagemUrlDoForm('')).toBeNull();
    expect(imagemUrlDoForm('   ')).toBeNull();
  });
  it('URL ⇒ trim preservado', () => {
    expect(imagemUrlDoForm('  https://cdn.x/capa.jpg ')).toBe('https://cdn.x/capa.jpg');
  });
});

describe('validaConfigGerais', () => {
  const base = { nome: 'Meia Floripa', local: 'Floripa', usaChip: true, capacidade: '', repassarTaxa: false, vendaSomentePorCupom: false, imagemUrl: '' };

  it('form válido passa', () => {
    expect(validaConfigGerais(base).valido).toBe(true);
  });

  it('nome vazio bloqueia', () => {
    const { valido, erros } = validaConfigGerais({ ...base, nome: '   ' });
    expect(valido).toBe(false);
    expect(erros.nome).toBeTruthy();
  });

  it('capacidade inválida bloqueia; vazia é aceita', () => {
    expect(validaConfigGerais({ ...base, capacidade: '0' }).valido).toBe(false);
    expect(validaConfigGerais({ ...base, capacidade: '12.5' }).valido).toBe(false);
    expect(validaConfigGerais({ ...base, capacidade: '' }).valido).toBe(true);
    expect(validaConfigGerais({ ...base, capacidade: '500' }).valido).toBe(true);
  });

  // -------------------------------------------------------------------------
  // FIX-PARSE-MILHAR — a capacidade do evento é lida duas vezes (validação e
  // submit) e as duas precisam concordar sobre o que "1.000" quer dizer.
  // -------------------------------------------------------------------------

  it('"1.000" é capacidade para mil pessoas nas duas leituras', () => {
    expect(validaConfigGerais({ ...base, capacidade: '1.000' }).valido).toBe(true);
    expect(capacidadeParaNumero('1.000')).toBe(1000);
    expect(capacidadeParaNumero('12.500')).toBe(12500);
    // O caminho antigo: `Number("1.000")` é 1 e passa em `Number.isInteger`.
    expect(Number('1.000')).toBe(1);
  });

  it('casa decimal na capacidade continua recusada nas duas leituras', () => {
    for (const c of ['1,000', '12.5', '2,5']) {
      expect(validaConfigGerais({ ...base, capacidade: c }).valido).toBe(false);
      expect(capacidadeParaNumero(c)).toBeNull();
    }
  });
});
