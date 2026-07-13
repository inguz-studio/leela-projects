// =============================================================================
// Testes da validação do convite (S304-T3). nome obrigatório, e-mail opcional
// com forma válida, papel restrito aos permitidos (nunca organizador).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { validaConvidar } from '../convidarForm';

const PERMITIDOS = ['administrador', 'operador', 'financeiro'] as const;

describe('validaConvidar', () => {
  it('convite válido passa (e-mail opcional vazio)', () => {
    expect(
      validaConvidar({ nome: 'Ana', email: '', papel: 'operador' }, PERMITIDOS).valido,
    ).toBe(true);
  });

  it('nome vazio bloqueia', () => {
    const { valido, erros } = validaConvidar({ nome: '  ', email: '', papel: 'operador' }, PERMITIDOS);
    expect(valido).toBe(false);
    expect(erros.nome).toBeTruthy();
  });

  it('e-mail malformado bloqueia; bem formado passa', () => {
    expect(
      validaConvidar({ nome: 'Ana', email: 'ana@', papel: 'operador' }, PERMITIDOS).erros.email,
    ).toBeTruthy();
    expect(
      validaConvidar({ nome: 'Ana', email: 'ana@x.com', papel: 'operador' }, PERMITIDOS).valido,
    ).toBe(true);
  });

  it('papel fora dos permitidos bloqueia (organizador nunca é convidável)', () => {
    expect(
      validaConvidar({ nome: 'Ana', email: '', papel: 'organizador' }, PERMITIDOS).erros.papel,
    ).toBeTruthy();
    expect(
      validaConvidar({ nome: 'Ana', email: '', papel: 'xpto' }, PERMITIDOS).erros.papel,
    ).toBeTruthy();
  });
});
