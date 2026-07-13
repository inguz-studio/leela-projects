// =============================================================================
// demografiaMock (RN-820) — dados de EXEMPLO da demografia. O teste trava o
// CONTRATO (marcador de proveniência + nota obrigatória) e a forma dos dados,
// não os números (são ilustrativos por design).
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  DEMOGRAFIA_FONTE,
  NOTA_DADOS_EXEMPLO,
  distribuicaoSexoExemplo,
  faixasEtariasExemplo,
} from '../demografiaMock';

describe('demografiaMock', () => {
  it('declara a proveniência como exemplo e carrega a nota honesta', () => {
    expect(DEMOGRAFIA_FONTE).toBe('exemplo');
    expect(NOTA_DADOS_EXEMPLO.toLowerCase()).toContain('exemplo');
  });

  it('faixas etárias: buckets não-vazios com valores positivos', () => {
    const faixas = faixasEtariasExemplo();
    expect(faixas.length).toBeGreaterThanOrEqual(3);
    expect(faixas.every((f) => f.value > 0 && f.label.length > 0)).toBe(true);
  });

  it('sexo: rótulos do enum canônico (Feminino/Masculino/Outro), valores positivos', () => {
    const sexo = distribuicaoSexoExemplo();
    expect(sexo.map((s) => s.label)).toEqual(['Feminino', 'Masculino', 'Outro']);
    expect(sexo.every((s) => s.value > 0)).toBe(true);
  });
});
