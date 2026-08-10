// =============================================================================
// Derivações do Engajamento — o que a tela pode afirmar a partir do dado real.
//
// Cada bloco de casos trava uma afirmação que a tela faz em português para o
// organizador. Se a asserção cair, a frase na tela virou mentira — é esse o
// contrato, não "a função devolve um array".
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  RANKING_MAX_DESAFIOS,
  ranquearDesafios,
  resumirComunidade,
  resumirEntrada,
  resumirPilares,
  resumirPonteComEventos,
  resumirSituacao,
} from '../engajamento';
import type { DesafioComClube } from '../engajamento';
import { mkDesafio, mkMembro } from '../../../_test/fixtures';
import type { Desafio } from '@leela/core';

const doClube = (desafio: Desafio, clubeId = 'floripa-run'): DesafioComClube => ({
  clubeId,
  desafio,
});

describe('resumirComunidade · os quatro números do topo', () => {
  it('soma os contadores fechados por Function, sem recontar nada', () => {
    const r = resumirComunidade(
      [{ qtdMembrosAtivos: 120 }, { qtdMembrosAtivos: 18 }],
      [
        doClube(mkDesafio({ status: 'ativo', qtdParticipantes: 42 })),
        doClube(mkDesafio({ status: 'ativo', qtdParticipantes: 9 })),
      ]
    );
    expect(r).toEqual({
      clubes: 2,
      membrosAtivos: 138,
      desafiosAtivos: 2,
      participacoes: 51,
    });
  });

  it('rascunho e encerrado não contam como desafio ativo nem como participação', () => {
    const r = resumirComunidade(
      [{ qtdMembrosAtivos: 10 }],
      [
        doClube(mkDesafio({ status: 'ativo', qtdParticipantes: 5 })),
        doClube(mkDesafio({ status: 'rascunho', qtdParticipantes: 100 })),
        doClube(mkDesafio({ status: 'encerrado', qtdParticipantes: 100 })),
      ]
    );
    expect(r.desafiosAtivos).toBe(1);
    expect(r.participacoes).toBe(5);
  });

  it('tenant sem club devolve zeros — e zero é zero, não ausência', () => {
    expect(resumirComunidade([], [])).toEqual({
      clubes: 0,
      membrosAtivos: 0,
      desafiosAtivos: 0,
      participacoes: 0,
    });
  });
});

describe('resumirPilares · a assinatura do produto', () => {
  it('soma atual e meta de cada pilar entre os desafios que reportam pilar', () => {
    const r = resumirPilares([
      doClube(
        mkDesafio({
          progressoPorPilar: {
            fisico: { atual: 100, meta: 200 },
            mental: { atual: 30, meta: 100 },
          },
        })
      ),
      doClube(
        mkDesafio({
          progressoPorPilar: {
            fisico: { atual: 50, meta: 100 },
            espiritual: { atual: 10, meta: 60 },
          },
        })
      ),
    ]);
    expect(r.desafiosComPilar).toBe(2);
    expect(r.linhas).toEqual([
      { pilar: 'fisico', rotulo: 'Físico', atual: 150, meta: 300 },
      { pilar: 'mental', rotulo: 'Mental', atual: 30, meta: 100 },
      { pilar: 'espiritual', rotulo: 'Espiritual', atual: 10, meta: 60 },
    ]);
  });

  it('sempre devolve os três pilares, na ordem do produto', () => {
    const r = resumirPilares([
      doClube(mkDesafio({ progressoPorPilar: { mental: { atual: 5, meta: 10 } } })),
    ]);
    expect(r.linhas.map((l) => l.pilar)).toEqual(['fisico', 'mental', 'espiritual']);
  });

  it('nenhum desafio com pilar = SEM BASE, não "equilíbrio em zero"', () => {
    const r = resumirPilares([doClube(mkDesafio()), doClube(mkDesafio({ modelo: 'A' }))]);
    expect(r.desafiosComPilar).toBe(0);
    expect(r.linhas.every((l) => l.atual === 0 && l.meta === 0)).toBe(true);
  });

  it('chave de pilar vazia no agregado não conta como base', () => {
    const r = resumirPilares([doClube(mkDesafio({ progressoPorPilar: {} }))]);
    expect(r.desafiosComPilar).toBe(0);
  });
});

describe('resumirSituacao · RN-102', () => {
  it('conta por status na ordem da narrativa (novo, ativo, inativo)', () => {
    const membros = [
      mkMembro({ status: 'ativo' }),
      mkMembro({ status: 'ativo' }),
      mkMembro({ status: 'novo' }),
      mkMembro({ status: 'inativo' }),
    ];
    expect(resumirSituacao(membros)).toEqual([
      { id: 'novo', rotulo: 'Novos (7 dias)', total: 1 },
      { id: 'ativo', rotulo: 'Ativos', total: 2 },
      { id: 'inativo', rotulo: 'Inativos (30 dias+)', total: 1 },
    ]);
  });

  it('mantém as três faixas mesmo zeradas — a ausência de inativo é informação', () => {
    expect(resumirSituacao([mkMembro({ status: 'ativo' })])).toHaveLength(3);
  });
});

describe('resumirEntrada · a porta de cada membro', () => {
  it('conta por via e descarta canal sem ninguém', () => {
    const membros = [
      mkMembro({ entrouVia: 'codigo' }),
      mkMembro({ entrouVia: 'codigo' }),
      mkMembro({ entrouVia: 'link' }),
    ];
    expect(resumirEntrada(membros)).toEqual([
      { id: 'codigo', rotulo: 'Código do club', total: 2 },
      { id: 'link', rotulo: 'Link', total: 1 },
    ]);
  });

  it('sem membros devolve lista vazia (a tela mostra vazio, não três zeros)', () => {
    expect(resumirEntrada([])).toEqual([]);
  });
});

describe('ranquearDesafios · quem move a comunidade', () => {
  it('ordena por participantes, do maior para o menor', () => {
    const r = ranquearDesafios([
      doClube(mkDesafio({ nome: 'Pequeno', qtdParticipantes: 3 })),
      doClube(mkDesafio({ nome: 'Grande', qtdParticipantes: 90 })),
      doClube(mkDesafio({ nome: 'Médio', qtdParticipantes: 40 })),
    ]);
    expect(r.map((d) => d.nome)).toEqual(['Grande', 'Médio', 'Pequeno']);
  });

  it('não ranqueia desafio encerrado ao lado de um em andamento', () => {
    const r = ranquearDesafios([
      doClube(mkDesafio({ nome: 'Ativo', status: 'ativo', qtdParticipantes: 5 })),
      doClube(mkDesafio({ nome: 'Encerrado', status: 'encerrado', qtdParticipantes: 900 })),
    ]);
    expect(r.map((d) => d.nome)).toEqual(['Ativo']);
  });

  it('desafio sem ninguém dentro não vira barra', () => {
    expect(ranquearDesafios([doClube(mkDesafio({ qtdParticipantes: 0 }))])).toEqual([]);
  });

  it('empate desempata por nome — a ordem não pode oscilar entre renders', () => {
    const r = ranquearDesafios([
      doClube(mkDesafio({ nome: 'Zebra', qtdParticipantes: 10 })),
      doClube(mkDesafio({ nome: 'Abelha', qtdParticipantes: 10 })),
    ]);
    expect(r.map((d) => d.nome)).toEqual(['Abelha', 'Zebra']);
  });

  it('corta no teto do ranking', () => {
    const muitos = Array.from({ length: 12 }, (_, i) =>
      doClube(mkDesafio({ nome: `D${i}`, qtdParticipantes: i + 1 }))
    );
    expect(ranquearDesafios(muitos)).toHaveLength(RANKING_MAX_DESAFIOS);
  });

  it('leva o club de origem junto (o fan-out perde o pai)', () => {
    const r = ranquearDesafios([doClube(mkDesafio({ qtdParticipantes: 4 }), 'pedal-norte')]);
    expect(r[0]!.clubeId).toBe('pedal-norte');
  });
});

describe('resumirPonteComEventos · intenção declarada, não conversão', () => {
  it('separa desafios em andamento com e sem evento vinculado', () => {
    const r = resumirPonteComEventos([
      doClube(mkDesafio({ eventoVinculadoId: 'meia-floripa-2026' })),
      doClube(mkDesafio({ eventoVinculadoId: 'meia-floripa-2026' })),
      doClube(mkDesafio()),
    ]);
    expect(r).toEqual([
      { id: 'com-evento', rotulo: 'Ligados a um evento', total: 2 },
      { id: 'sem-evento', rotulo: 'Sem evento vinculado', total: 1 },
    ]);
  });

  it('ignora desafio fora de andamento', () => {
    const r = resumirPonteComEventos([
      doClube(mkDesafio({ status: 'encerrado', eventoVinculadoId: 'x' })),
      doClube(mkDesafio({ status: 'ativo' })),
    ]);
    expect(r).toEqual([
      { id: 'com-evento', rotulo: 'Ligados a um evento', total: 0 },
      { id: 'sem-evento', rotulo: 'Sem evento vinculado', total: 1 },
    ]);
  });

  it('sem desafio em andamento devolve vazio (a tela diz isso em português)', () => {
    expect(resumirPonteComEventos([doClube(mkDesafio({ status: 'rascunho' }))])).toEqual([]);
  });
});
