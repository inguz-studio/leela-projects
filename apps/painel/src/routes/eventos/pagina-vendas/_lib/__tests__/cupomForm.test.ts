// =============================================================================
// Testes puros do formulário de cupom (S300-T5). Validação = KERNEL: cobrem os
// aceites — unicidade por evento, percentual fora de 0–100 bloqueia, teto/janela
// opcionais/obrigatórios conforme o kernel — e a derivação de estado (vigência).
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { Cupom, Timestamp } from '@leela/core';
import {
  estadoCupomBadge,
  labelDesconto,
  labelUsos,
  parseValorCupom,
  validarFormCupom,
  type CupomFormValues,
} from '../cupomForm';

describe('parseValorCupom (FIX-PARSE-DINHEIRO)', () => {
  it('desconto fixo com milhar: "1.234,56" é R$ 1.234,56, não R$ 1,23', () => {
    expect(parseValorCupom('fixo', '1.234,56')).toBe(1234.56);
    expect(Math.round(parseValorCupom('fixo', '1.234,56')! * 100)).toBe(123456);
    expect(parseValorCupom('fixo', 'R$ 1.234,56')).toBe(1234.56);
  });

  it('percentual mantém a fração exata', () => {
    expect(parseValorCupom('percentual', '12,5')).toBe(12.5);
    expect(parseValorCupom('percentual', '10')).toBe(10);
  });

  it('fixo sai cent-exato', () => {
    expect(parseValorCupom('fixo', '50,00')).toBe(50);
    expect(parseValorCupom('fixo', '99,999')).toBe(100);
  });

  it('ilegível vira null', () => {
    expect(parseValorCupom('fixo', '')).toBeNull();
    expect(parseValorCupom('fixo', 'abc')).toBeNull();
    expect(parseValorCupom('percentual', '1e3')).toBeNull();
  });

  it('ponto sem vírgula é milhar: um cupom de "1.500" desconta mil e quinhentos', () => {
    expect(parseValorCupom('fixo', '1.500')).toBe(1500);
    // Percentual lê o mesmo texto pelo decimal exato — e "12.5" segue 12,5%.
    expect(parseValorCupom('percentual', '12.5')).toBe(12.5);
  });
});

/** Timestamp-like mínimo (toMillis/toDate) para os fixtures. */
function ts(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  } as Timestamp;
}

const JANELA_OK = { inicioEm: '2026-08-01T10:00', fimEm: '2026-09-01T10:00' };

function values(over: Partial<CupomFormValues> = {}): CupomFormValues {
  return {
    codigo: 'CORRIDA10',
    tipo: 'percentual',
    valor: '10',
    tetoUso: '',
    ...JANELA_OK,
    ...over,
  };
}

describe('validarFormCupom — código', () => {
  it('rejeita código fora do padrão A-Z0-9 3..20', () => {
    const r = validarFormCupom({ values: values({ codigo: 'AB' }), codigosExistentes: [], cupomEmEdicaoId: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.campo).toBe('codigo');
  });

  it('normaliza para UPPER e aceita', () => {
    const r = validarFormCupom({ values: values({ codigo: 'corrida10' }), codigosExistentes: [], cupomEmEdicaoId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.codigo).toBe('CORRIDA10');
  });

  it('bloqueia código duplicado por evento na CRIAÇÃO (unicidade)', () => {
    const r = validarFormCupom({
      values: values({ codigo: 'CORRIDA10' }),
      codigosExistentes: ['CORRIDA10'],
      cupomEmEdicaoId: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.campo).toBe('codigo');
      expect(r.erro).toContain('CORRIDA10');
    }
  });

  it('não trata como duplicado o próprio cupom em edição', () => {
    const r = validarFormCupom({
      values: values({ codigo: 'CORRIDA10' }),
      codigosExistentes: ['CORRIDA10'],
      cupomEmEdicaoId: 'CORRIDA10',
    });
    expect(r.ok).toBe(true);
  });
});

describe('validarFormCupom — valor', () => {
  it('percentual > 100 bloqueia (0–100)', () => {
    const r = validarFormCupom({ values: values({ tipo: 'percentual', valor: '120' }), codigosExistentes: [], cupomEmEdicaoId: null });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.campo).toBe('valor');
      expect(r.erro).toContain('0 e 100');
    }
  });

  it('percentual 0 bloqueia (> 0)', () => {
    const r = validarFormCupom({ values: values({ tipo: 'percentual', valor: '0' }), codigosExistentes: [], cupomEmEdicaoId: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.campo).toBe('valor');
  });

  it('fixo aceita R$ com vírgula e vira cent-exato', () => {
    const r = validarFormCupom({ values: values({ tipo: 'fixo', valor: '50,00' }), codigosExistentes: [], cupomEmEdicaoId: null });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.tipo).toBe('fixo');
      expect(r.input.valor).toBe(50);
    }
  });
});

describe('validarFormCupom — teto de usos e janela', () => {
  it('teto vazio = ilimitado (null)', () => {
    const r = validarFormCupom({ values: values({ tetoUso: '' }), codigosExistentes: [], cupomEmEdicaoId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.tetoUso).toBeNull();
  });

  it('teto inteiro ≥ 1 persiste', () => {
    const r = validarFormCupom({ values: values({ tetoUso: '100' }), codigosExistentes: [], cupomEmEdicaoId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.tetoUso).toBe(100);
  });

  it('teto não-inteiro/zero é rejeitado', () => {
    for (const t of ['0', '1.5', 'abc', '-3']) {
      const r = validarFormCupom({ values: values({ tetoUso: t }), codigosExistentes: [], cupomEmEdicaoId: null });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.campo).toBe('tetoUso');
    }
  });

  it('janela invertida (fim ≤ início) é rejeitada', () => {
    const r = validarFormCupom({
      values: values({ inicioEm: '2026-09-01T10:00', fimEm: '2026-08-01T10:00' }),
      codigosExistentes: [],
      cupomEmEdicaoId: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.campo).toBe('janela');
  });

  it('janela ausente é rejeitada', () => {
    const r = validarFormCupom({ values: values({ inicioEm: '', fimEm: '' }), codigosExistentes: [], cupomEmEdicaoId: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.campo).toBe('janela');
  });
});

describe('estadoCupomBadge / labels — derivação do kernel', () => {
  const base: Cupom = {
    id: 'X10',
    tenantId: 't1',
    codigo: 'X10',
    tipo: 'percentual',
    valor: 10,
    tetoUso: 100,
    inicioEm: ts(Date.parse('2026-08-01T00:00:00Z')),
    fimEm: ts(Date.parse('2026-09-01T00:00:00Z')),
    usos: 0,
    criadoEm: ts(0),
    atualizadoEm: ts(0),
  };

  it('teto batido → Esgotado', () => {
    const c = { ...base, usos: 100 };
    expect(estadoCupomBadge(c, new Date('2026-08-15T00:00:00Z')).label).toBe('Esgotado');
  });

  it('antes do início → Agendado', () => {
    expect(estadoCupomBadge(base, new Date('2026-07-15T00:00:00Z')).label).toBe('Agendado');
  });

  it('depois do fim → Expirado', () => {
    expect(estadoCupomBadge(base, new Date('2026-09-15T00:00:00Z')).label).toBe('Expirado');
  });

  it('dentro da janela e sob o teto → Vigente', () => {
    expect(estadoCupomBadge(base, new Date('2026-08-15T00:00:00Z')).label).toBe('Vigente');
  });

  it('labelDesconto e labelUsos', () => {
    expect(labelDesconto({ tipo: 'percentual', valor: 10 })).toBe('10%');
    expect(labelDesconto({ tipo: 'fixo', valor: 50 })).toContain('50,00');
    expect(labelUsos({ usos: 3, tetoUso: 100 })).toBe('3 / 100');
    expect(labelUsos({ usos: 3, tetoUso: null })).toContain('ilimitado');
  });
});
