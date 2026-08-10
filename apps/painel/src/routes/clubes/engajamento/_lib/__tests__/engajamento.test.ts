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
  pilarComMaiorMedia,
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

  it('um club sem o agregado ainda (janela pré-Function) não vira NaN no KPI do tenant (D-7 · ADIÇÃO)', () => {
    const r = resumirComunidade(
      [{ qtdMembrosAtivos: 120 }, { qtdMembrosAtivos: undefined as unknown as number }],
      []
    );
    expect(r.membrosAtivos).toBe(120);
    expect(Number.isNaN(r.membrosAtivos)).toBe(false);
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
  it('cruza atual e meta de cada pilar entre desafios pela MÉDIA PONDERADA por participante, nunca soma sem peso (D-1)', () => {
    const r = resumirPilares([
      doClube(
        mkDesafio({
          qtdParticipantes: 40,
          progressoPorPilar: {
            fisico: { atual: 100, meta: 200 },
            mental: { atual: 30, meta: 100 },
          },
        })
      ),
      doClube(
        mkDesafio({
          qtdParticipantes: 40,
          progressoPorPilar: {
            fisico: { atual: 50, meta: 100 },
            espiritual: { atual: 10, meta: 60 },
          },
        })
      ),
    ]);
    expect(r.desafiosComPilar).toBe(2);
    // Pesos iguais (40 e 40) ⇒ a média ponderada equivale à média simples,
    // NUNCA à soma crua (que daria 150/300 — o defeito que a REV achou).
    expect(r.linhas).toEqual([
      { pilar: 'fisico', rotulo: 'Físico', atual: 75, meta: 150 },
      { pilar: 'mental', rotulo: 'Mental', atual: 30, meta: 100 },
      { pilar: 'espiritual', rotulo: 'Espiritual', atual: 10, meta: 60 },
    ]);
  });

  it('pondera por qtdParticipantes — um desafio de 500 não pesa igual a um de 2 (D-1, caso da REV)', () => {
    const r = resumirPilares([
      doClube(
        mkDesafio({
          qtdParticipantes: 2,
          progressoPorPilar: { fisico: { atual: 100, meta: 200 } },
        })
      ),
      doClube(
        mkDesafio({
          qtdParticipantes: 500,
          progressoPorPilar: { fisico: { atual: 10, meta: 20 } },
        })
      ),
    ]);
    const fisico = r.linhas.find((l) => l.pilar === 'fisico')!;
    // (100×2 + 10×500) / 502 = 10,358… → 10,4 | (200×2 + 20×500) / 502 = 20,717… → 20,7
    expect(fisico.atual).toBe(10.4);
    expect(fisico.meta).toBe(20.7);
    // A soma crua (o bug antigo) daria 110 — bem longe do valor ponderado certo.
    expect(fisico.atual).not.toBe(110);
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

  it('desafio sem participante não pesa (e não gera NaN)', () => {
    const r = resumirPilares([
      doClube(
        mkDesafio({ qtdParticipantes: 0, progressoPorPilar: { fisico: { atual: 100, meta: 200 } } })
      ),
    ]);
    const fisico = r.linhas.find((l) => l.pilar === 'fisico')!;
    expect(fisico.atual).toBe(0);
    expect(fisico.meta).toBe(0);
    expect(Number.isNaN(fisico.atual)).toBe(false);
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
      // Rótulo honesto (D-2): nenhuma Function grava `ultimaAtividadeEm` em
      // produção, então "inativo" aqui não é "sem atividade" — é "sem
      // registro". Ver ROTULO_SITUACAO para a prova completa.
      { id: 'inativo', rotulo: 'Sem registro (30 dias+)', total: 1 },
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

describe('pilarComMaiorMedia · onde a comunidade pesa (item 12)', () => {
  const linha = (pilar: 'fisico' | 'mental' | 'espiritual', atual: number) => ({
    pilar,
    rotulo: pilar,
    atual,
    meta: 100,
  });

  it('aponta o pilar de maior média por participante', () => {
    const r = pilarComMaiorMedia([linha('fisico', 75), linha('mental', 30), linha('espiritual', 10)]);
    expect(r?.pilar).toBe('fisico');
  });

  it('empate não elege líder — escolher no empate é o computador decidindo por fato', () => {
    expect(
      pilarComMaiorMedia([linha('fisico', 30), linha('mental', 30), linha('espiritual', 10)])
    ).toBeNull();
  });

  it('tudo em zero não é "equilíbrio perfeito", é ausência de acúmulo', () => {
    expect(
      pilarComMaiorMedia([linha('fisico', 0), linha('mental', 0), linha('espiritual', 0)])
    ).toBeNull();
  });

  it('sem linha nenhuma, não há frase para dizer', () => {
    expect(pilarComMaiorMedia([])).toBeNull();
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

  it('devolve a lista inteira: o corte é recorte de card, não de derivação (item 9)', () => {
    const muitos = Array.from({ length: 12 }, (_, i) =>
      doClube(mkDesafio({ nome: `D${i}`, qtdParticipantes: i + 1 }))
    );
    expect(ranquearDesafios(muitos)).toHaveLength(12);
  });

  it('ainda aceita um teto explícito para quem precisar dele', () => {
    const muitos = Array.from({ length: 12 }, (_, i) =>
      doClube(mkDesafio({ nome: `D${i}`, qtdParticipantes: i + 1 }))
    );
    expect(ranquearDesafios(muitos, RANKING_MAX_DESAFIOS)).toHaveLength(RANKING_MAX_DESAFIOS);
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
