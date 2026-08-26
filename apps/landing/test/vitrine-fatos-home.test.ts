// =============================================================================
// apps/landing/test/vitrine-fatos-home.test.ts — lane leela-landing-awwwards-20260826
//
// A faixa de números da home é a ÚNICA prova social da landing, e ela é
// derivada de texto livre digitado por organizador. Um número torto na primeira
// dobra vale menos que nenhum número — daí estes casos travarem as três formas
// reais de `local` medidas no seed e nos fixtures, mais os dois jeitos de
// inflar a contagem por acidente (caixa e acento).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { cidadeDoLocal, cidadesDaVitrine } from '@/lib/fatosVitrine';

describe('cidadeDoLocal — as formas reais de `local`', () => {
  it('extrai a cidade de "local, Cidade/UF"', () => {
    expect(cidadeDoLocal('Parque de Coqueiros, Florianópolis/SC')).toBe('Florianópolis');
  });

  it('aceita "Cidade/UF" puro', () => {
    expect(cidadeDoLocal('Florianópolis/SC')).toBe('Florianópolis');
  });

  it('aceita bairro separado por travessão', () => {
    expect(cidadeDoLocal('Campeche — Florianópolis/SC')).toBe('Florianópolis');
  });

  it('sem separador nenhum, devolve o texto inteiro em vez de inventar corte', () => {
    expect(cidadeDoLocal('Ilha do Mel')).toBe('Ilha do Mel');
  });

  it('não confunde barra de nome com sigla de UF', () => {
    expect(cidadeDoLocal('Embu/Guaçu')).toBe('Embu/Guaçu');
  });

  it('tolera espaço sobrando dos dois lados', () => {
    expect(cidadeDoLocal('  Av. Beira-Mar Norte ,  Florianópolis / SC ')).toBe('Florianópolis');
  });
});

describe('cidadesDaVitrine — a contagem que vai para a primeira dobra', () => {
  it('conta cidades DISTINTAS, não eventos', () => {
    const cidades = cidadesDaVitrine([
      { local: 'Parque de Coqueiros, Florianópolis/SC' },
      { local: 'Av. Beira-Mar Norte, Florianópolis/SC' },
      { local: 'Costa da Lagoa, Florianópolis/SC' },
    ]);
    expect(cidades).toEqual(['Florianópolis']);
  });

  it('não infla a prova social por diferença de caixa ou de acento do organizador', () => {
    const cidades = cidadesDaVitrine([
      { local: 'Praia Mole, Florianópolis/SC' },
      { local: 'Centro, FLORIANOPOLIS/SC' },
      { local: 'Lagoa, florianopolis/sc' },
    ]);
    expect(cidades).toHaveLength(1);
    // A grafia devolvida é a PRIMEIRA vista — a que a pessoa reconhece.
    expect(cidades[0]).toBe('Florianópolis');
  });

  it('soma cidades de verdade quando elas existem', () => {
    const cidades = cidadesDaVitrine([
      { local: 'Parque de Coqueiros, Florianópolis/SC' },
      { local: 'Parque Ibirapuera, São Paulo/SP' },
      { local: 'Aterro do Flamengo, Rio de Janeiro/RJ' },
    ]);
    expect(cidades).toHaveLength(3);
  });

  it('vitrine vazia conta zero — e a faixa some, em vez de anunciar três zeros', () => {
    expect(cidadesDaVitrine([])).toEqual([]);
  });
});
