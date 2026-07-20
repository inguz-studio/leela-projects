// =============================================================================
// Prova do fix F1 da review antagonista (TAXAFLEX · BLOQUEADOR): campo VAZIO
// no form da tabela global NUNCA vira 0% + R$ 0 silencioso — `Number('')`
// é 0 e a tabela `{0,0}` é estruturalmente válida; sem estas guardas, um
// clique zeraria a taxa de TODOS os tenants, congelada venda a venda.
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  errosDeFormularioGlobal,
  temZeroAtivoExplicito,
  toForm,
  toTabela,
  type FormTabela,
} from '../taxaGlobalForm';

const CHEIO: FormTabela = {
  pix: { percentual: '6', fixoReais: '2.00' },
  cartao: { percentual: '8', fixoReais: '1.50' },
  boleto: { percentual: '4', fixoReais: '3.50' },
};

describe('F1 — errosDeFormularioGlobal (vazio nunca vira zero)', () => {
  it('form completo passa sem erros', () => {
    expect(errosDeFormularioGlobal(CHEIO, false)).toEqual([]);
  });

  it('CENÁRIO DA REFUTAÇÃO: só o PIX preenchido ⇒ erro nas outras 2 linhas, nada salva', () => {
    const soPix: FormTabela = {
      pix: { percentual: '6', fixoReais: '2.00' },
      cartao: { percentual: '', fixoReais: '' },
      boleto: { percentual: '', fixoReais: '' },
    };
    const erros = errosDeFormularioGlobal(soPix, false);
    expect(erros).toHaveLength(2);
    expect(erros.join(' ')).toMatch(/Cartão/);
    expect(erros.join(' ')).toMatch(/Boleto/);
  });

  it('form 100% vazio ⇒ 3 erros (jamais zera a tabela inteira em silêncio)', () => {
    const vazio: FormTabela = {
      pix: { percentual: '', fixoReais: '' },
      cartao: { percentual: '', fixoReais: '' },
      boleto: { percentual: '', fixoReais: '' },
    };
    expect(errosDeFormularioGlobal(vazio, false)).toHaveLength(3);
    expect(errosDeFormularioGlobal(vazio, true)).toHaveLength(3); // confirmar não contorna vazio
  });

  it('meio-preenchido (só percentual OU só fixo) também é erro', () => {
    const meio: FormTabela = {
      ...CHEIO,
      cartao: { percentual: '8', fixoReais: '' },
    };
    expect(errosDeFormularioGlobal(meio, false)).toHaveLength(1);
  });

  it('zero EXPLÍCITO em meio ativo exige confirmação; confirmado, salva', () => {
    const pixZero: FormTabela = {
      ...CHEIO,
      pix: { percentual: '0', fixoReais: '0' },
    };
    const semConfirma = errosDeFormularioGlobal(pixZero, false);
    expect(semConfirma).toHaveLength(1);
    expect(semConfirma[0]).toMatch(/ZERO/);
    expect(errosDeFormularioGlobal(pixZero, true)).toEqual([]);
    expect(temZeroAtivoExplicito(pixZero)).toBe(true);
    expect(temZeroAtivoExplicito(CHEIO)).toBe(false);
  });

  it('boleto (inativo) zerado NÃO exige confirmação — só pix/cartao', () => {
    const boletoZero: FormTabela = {
      ...CHEIO,
      boleto: { percentual: '0', fixoReais: '0' },
    };
    expect(errosDeFormularioGlobal(boletoZero, false)).toEqual([]);
  });
});

describe('toForm/toTabela — round-trip', () => {
  it('tabela → form → tabela preserva valores (fixo R$ ↔ centavos)', () => {
    const tabela = toTabela(CHEIO);
    expect(tabela.pix).toEqual({ percentual: 6, fixoCentavos: 200 });
    expect(tabela.cartao).toEqual({ percentual: 8, fixoCentavos: 150 });
    expect(toTabela(toForm(tabela))).toEqual(tabela);
  });
});
