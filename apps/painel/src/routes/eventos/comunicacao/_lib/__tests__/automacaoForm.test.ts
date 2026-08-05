// =============================================================================
// Testes puros do form de automação (E06 · S402). Behavior-first: os limites
// que a Rule/Function espelham (gatilho/canal/offset/template).
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  AUTOMACAO_VALORES_INICIAIS,
  gatilhoUsaOffset,
  paraAutomacaoInput,
  toggleCanal,
  validarAutomacaoForm,
} from '../automacaoForm';

describe('gatilhoUsaOffset', () => {
  it('só véspera/pós usam offset', () => {
    expect(gatilhoUsaOffset('vespera_evento')).toBe(true);
    expect(gatilhoUsaOffset('pos_evento')).toBe(true);
    expect(gatilhoUsaOffset('novo_inscrito')).toBe(false);
    expect(gatilhoUsaOffset('kit_disponivel')).toBe(false);
  });
});

describe('toggleCanal', () => {
  it('adiciona e remove, mas nunca esvazia (mín. 1)', () => {
    expect(toggleCanal(['push'], 'email')).toEqual(['push', 'email']);
    expect(toggleCanal(['push', 'email'], 'push')).toEqual(['email']);
    expect(toggleCanal(['push'], 'push')).toEqual(['push']); // não esvazia
  });
});

describe('paraAutomacaoInput', () => {
  it('omite offset em gatilho sem relógio', () => {
    const input = paraAutomacaoInput({
      ...AUTOMACAO_VALORES_INICIAIS,
      gatilho: 'novo_inscrito',
      templateRef: 'camp-1',
      offsetHoras: '48',
    });
    expect(input.offsetHoras).toBeUndefined();
  });

  it('inclui offset inteiro em véspera', () => {
    const input = paraAutomacaoInput({
      ...AUTOMACAO_VALORES_INICIAIS,
      gatilho: 'vespera_evento',
      templateRef: 'camp-1',
      offsetHoras: '48',
    });
    expect(input.offsetHoras).toBe(48);
  });
});

describe('validarAutomacaoForm', () => {
  it('reprova sem template', () => {
    const erros = validarAutomacaoForm({ ...AUTOMACAO_VALORES_INICIAIS, templateRef: '' });
    expect(erros.some((e) => e.toLowerCase().includes('campanha-modelo'))).toBe(true);
  });

  it('aprova gatilho novo_inscrito com template + canal', () => {
    const erros = validarAutomacaoForm({
      ...AUTOMACAO_VALORES_INICIAIS,
      gatilho: 'novo_inscrito',
      templateRef: 'camp-1',
      canal: ['push'],
    });
    expect(erros).toEqual([]);
  });

  it('reprova offset fora de 1..720 na véspera', () => {
    const erros = validarAutomacaoForm({
      ...AUTOMACAO_VALORES_INICIAIS,
      gatilho: 'vespera_evento',
      templateRef: 'camp-1',
      offsetHoras: '9999',
    });
    expect(erros.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // FIX-PARSE-MILHAR — o offset lê a mesma pontuação de vaga e capacidade.
  //
  // O teto do campo é 720, então mil horas não é um offset legítimo. O que
  // muda é a POSTURA: "1.000" era lido como UMA hora e disparava a campanha no
  // dia errado sem avisar; agora bate na faixa e o organizador vê o problema.
  // -------------------------------------------------------------------------

  it('"1.000" horas não vira 1 hora calada — bate na faixa e acusa', () => {
    expect(Number('1.000')).toBe(1);
    const erros = validarAutomacaoForm({
      ...AUTOMACAO_VALORES_INICIAIS,
      gatilho: 'vespera_evento',
      templateRef: 'camp-1',
      offsetHoras: '1.000',
    });
    expect(erros.length).toBeGreaterThan(0);
  });
});
