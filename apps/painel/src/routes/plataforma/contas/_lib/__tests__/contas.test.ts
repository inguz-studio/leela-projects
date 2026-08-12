// =============================================================================
// Puros do diretório de contas (ADMIN-VISAO onda 5 · S1615-T2). Os casos são os
// do gate da onda: ausência DECLARADA em vez de célula vazia, causa NOMEADA por
// motivo, e o padrão sendo o modo mais fechado.
// =============================================================================

import { describe, expect, it } from 'vitest';
import type { ContaProfissionalView } from '@leela/api-client';
import {
  AVISO_CONSULTA_REGISTRADA,
  CAUSA_DOCUMENTO_ESTRANGEIRO,
  MODOS_DE_CONTAS,
  MODO_PADRAO,
  estadoDaResposta,
  formatarTelefone,
  ouTraco,
  podeLiberar,
  rotuloDoPapel,
} from '../contas';

function mkProfissional(
  over: Partial<ContaProfissionalView> = {}
): ContaProfissionalView {
  return {
    id: 'uid-marina',
    papel: 'organizador',
    nome: 'Marina Duarte',
    email: 'marina@castelo.com.br',
    organizacao: 'Castelo Produções',
    telefone: '48999998888',
    statusOnboarding: 'aguardando_convite',
    criadoEm: null,
    ...over,
  };
}

describe('modos', () => {
  it('o padrão é a Fila — o recorte mais fechado abre primeiro', () => {
    expect(MODO_PADRAO).toBe('fila');
    expect(MODOS_DE_CONTAS.map((m) => m.id)).toEqual(['fila', 'diretorio']);
  });
});

describe('rotuloDoPapel', () => {
  it('vem da COLEÇÃO de origem, não da claim', () => {
    expect(rotuloDoPapel(mkProfissional())).toBe('Organizador');
    expect(
      rotuloDoPapel({
        id: 'uid-atleta',
        papel: 'atleta',
        nome: 'Atleta',
        email: 'a@a.com',
        criadoEm: null,
      })
    ).toBe('Atleta');
  });
});

describe('ouTraco', () => {
  it.each([
    ['Castelo', 'Castelo'],
    ['', '—'],
    ['   ', '—'],
    [undefined, '—'],
    [null, '—'],
  ])('%s → %s', (entrada, esperado) => {
    expect(ouTraco(entrada)).toBe(esperado);
  });
});

describe('formatarTelefone', () => {
  it('11 dígitos vira celular pt-BR', () => {
    expect(formatarTelefone('48999998888')).toBe('(48) 99999-8888');
  });

  it('10 dígitos vira fixo pt-BR', () => {
    expect(formatarTelefone('4833334444')).toBe('(48) 3333-4444');
  });

  it('comprimento estranho volta como veio — máscara inventada esconderia o dado torto', () => {
    expect(formatarTelefone('123')).toBe('123');
  });

  it('vazio vira traço, não string vazia', () => {
    expect(formatarTelefone('')).toBe('—');
  });
});

describe('estadoDaResposta (V-4)', () => {
  it('documento presente vira CPF formatado', () => {
    const estado = estadoDaResposta({
      documento: { tipo: 'cpf', numero: '11144477735' },
      motivoAusencia: null,
      haMaisDeUmRegistro: false,
    });

    expect(estado).toEqual({
      situacao: 'revelado',
      texto: '111.444.777-35',
      ambiguo: false,
    });
  });

  it('mais de um registro é sinalizado — a identificação não é única e a tela diz', () => {
    const estado = estadoDaResposta({
      documento: { tipo: 'cpf', numero: '11144477735' },
      motivoAusencia: null,
      haMaisDeUmRegistro: true,
    });

    expect(estado).toMatchObject({ situacao: 'revelado', ambiguo: true });
  });

  it('sem registro e registro quebrado têm causas DIFERENTES — mandam o operador a lugares diferentes', () => {
    const semRegistro = estadoDaResposta({
      documento: null,
      motivoAusencia: 'sem_registro_de_identificacao',
      haMaisDeUmRegistro: false,
    });
    const quebrado = estadoDaResposta({
      documento: null,
      motivoAusencia: 'registro_sem_documento',
      haMaisDeUmRegistro: false,
    });

    expect(semRegistro.situacao).toBe('ausente');
    expect(quebrado.situacao).toBe('ausente');
    expect((semRegistro as { causa: string }).causa).not.toBe(
      (quebrado as { causa: string }).causa
    );
  });

  it('a ausência nunca vira string vazia nem "—" — ela tem frase', () => {
    const estado = estadoDaResposta({
      documento: null,
      motivoAusencia: 'sem_registro_de_identificacao',
      haMaisDeUmRegistro: false,
    });

    expect((estado as { causa: string }).causa.length).toBeGreaterThan(20);
  });
});

describe('avisos', () => {
  it('o aviso de consulta registrada nomeia quem, quando e sobre quem', () => {
    expect(AVISO_CONSULTA_REGISTRADA).toContain('registrada');
    expect(AVISO_CONSULTA_REGISTRADA).toContain('quando');
  });

  it('a causa do documento estrangeiro NOMEIA a fonte que falta — não é "em breve" vago', () => {
    expect(CAUSA_DOCUMENTO_ESTRANGEIRO).toContain('documento estrangeiro');
    expect(CAUSA_DOCUMENTO_ESTRANGEIRO).toContain('CPF');
  });
});

describe('podeLiberar', () => {
  it('só quem ainda aguarda convite recebe o botão', () => {
    expect(podeLiberar(mkProfissional())).toBe(true);
    expect(podeLiberar(mkProfissional({ statusOnboarding: 'ativo' }))).toBe(false);
    expect(podeLiberar(mkProfissional({ statusOnboarding: undefined }))).toBe(false);
  });
});
