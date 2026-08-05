// =============================================================================
// Testes puros dos helpers do form de assessoria (E18). Behavior-first: os
// mesmos limites que o servidor valida (documento/e-mail/cupom/janela).
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  CADASTRO_VALORES_INICIAIS,
  CONDICAO_VALORES_INICIAIS,
  millisDeInputLocal,
  parseValorCondicao,
  problemaDoDocumento,
  statusParceriaBadge,
  tetoUsoParaNumero,
  validarCadastro,
  validarCondicaoDesconto,
} from '../assessoriaForm';

describe('validarCadastro', () => {
  it('reprova vazio com erros de nome, documento e e-mail', () => {
    const erros = validarCadastro(CADASTRO_VALORES_INICIAIS);
    expect(erros.length).toBeGreaterThanOrEqual(3);
  });

  it('aprova nome + CNPJ válido + e-mail', () => {
    const erros = validarCadastro({
      nome: 'Assessoria Livre',
      documento: '11.222.333/0001-81',
      responsavelEmail: 'resp@assessoria.com',
    });
    expect(erros).toEqual([]);
  });

  it('reprova CNPJ com dígito verificador errado', () => {
    const erros = validarCadastro({
      nome: 'X',
      documento: '11.222.333/0001-00',
      responsavelEmail: 'a@b.com',
    });
    expect(erros.some((e) => e.includes('CNPJ/CPF'))).toBe(true);
  });
});

describe('problemaDoDocumento', () => {
  it('null quando vazio (sem feedback prematuro)', () => {
    expect(problemaDoDocumento('')).toBeNull();
  });
  it('mensagem quando inválido', () => {
    expect(problemaDoDocumento('123')).not.toBeNull();
  });
  it('null quando CPF válido', () => {
    expect(problemaDoDocumento('111.444.777-35')).toBeNull();
  });
});

describe('statusParceriaBadge', () => {
  it('mapeia os 3 estados (RN-123)', () => {
    expect(statusParceriaBadge('ativa').variant).toBe('vitoria');
    expect(statusParceriaBadge('convite_pendente').variant).toBe('alerta');
    expect(statusParceriaBadge('inativa').variant).toBe('neutro');
  });
});

describe('validarCondicaoDesconto', () => {
  const base = {
    ...CONDICAO_VALORES_INICIAIS,
    eventoId: 'evt-1',
    codigo: 'PARCEIRO10',
    tipo: 'percentual' as const,
    valor: '10',
    inicio: '2026-01-01T10:00',
    fim: '2026-02-01T10:00',
  };

  it('aprova condição percentual válida', () => {
    expect(validarCondicaoDesconto(base)).toEqual([]);
  });

  it('reprova fim anterior ao início', () => {
    const erros = validarCondicaoDesconto({ ...base, fim: '2025-12-01T10:00' });
    expect(erros.some((e) => e.includes('posterior'))).toBe(true);
  });

  it('reprova percentual acima de 100', () => {
    const erros = validarCondicaoDesconto({ ...base, valor: '150' });
    expect(erros.some((e) => e.toLowerCase().includes('percentual'))).toBe(true);
  });

  it('reprova teto de usos não inteiro', () => {
    const erros = validarCondicaoDesconto({ ...base, tetoUso: '1.5' });
    expect(erros.some((e) => e.toLowerCase().includes('teto'))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // FIX-PARSE-DINHEIRO: a validação e o submit da ParceriaDetailPage tinham cada
  // um o seu `Number(valor.replace(',', '.'))`, e os dois liam "1.234,56" como
  // 1.234 — a tela aprovava e gravava R$ 1,23 de desconto sem dizer nada.
  // ---------------------------------------------------------------------------

  it('aprova desconto fixo escrito com separador de milhar', () => {
    expect(
      validarCondicaoDesconto({ ...base, tipo: 'fixo', valor: '1.234,56' }),
    ).toEqual([]);
  });

  it('aprova o ponto de milhar sem vírgula: "1.500" é um desconto de mil e quinhentos', () => {
    expect(validarCondicaoDesconto({ ...base, tipo: 'fixo', valor: '1.500' })).toEqual([]);
  });
});

describe('parseValorCondicao — o valor que a página envia (FIX-PARSE-DINHEIRO)', () => {
  it('desconto fixo com milhar chega inteiro no payload', () => {
    expect(parseValorCondicao('fixo', '1.234,56')).toBe(1234.56);
    expect(Math.round(parseValorCondicao('fixo', '1.234,56')! * 100)).toBe(123456);
    expect(parseValorCondicao('fixo', 'R$ 1.234,56')).toBe(1234.56);
  });

  it('percentual mantém a fração exata; fixo sai cent-exato', () => {
    expect(parseValorCondicao('percentual', '12,5')).toBe(12.5);
    expect(parseValorCondicao('fixo', '99,999')).toBe(100);
  });

  it('ilegível vira null (a página não envia)', () => {
    expect(parseValorCondicao('fixo', '')).toBeNull();
    expect(parseValorCondicao('fixo', 'abc')).toBeNull();
  });

  it('ponto sem vírgula chega como milhar no payload', () => {
    expect(parseValorCondicao('fixo', '1.500')).toBe(1500);
  });
});

describe('millisDeInputLocal / tetoUsoParaNumero', () => {
  it('vazio → null', () => {
    expect(millisDeInputLocal('')).toBeNull();
    expect(tetoUsoParaNumero('')).toBeNull();
  });
  it('datetime-local legível → millis finito', () => {
    const ms = millisDeInputLocal('2026-01-01T10:00');
    expect(ms).not.toBeNull();
    expect(Number.isFinite(ms as number)).toBe(true);
  });
  it('teto inteiro ≥ 1 → número', () => {
    expect(tetoUsoParaNumero('5')).toBe(5);
    expect(tetoUsoParaNumero('0')).toBeNull();
  });
});
