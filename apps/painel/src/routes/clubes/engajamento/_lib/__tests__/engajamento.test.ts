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
  derivarInsights,
  resumirComunidade,
  resumirEntrada,
  resumirModalidades,
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
      { id: 'inativo', rotulo: 'Parados há 30 dias ou mais', total: 1 },
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

describe('resumirModalidades · para onde a comunidade pende (estudo · bloco 4, versão honesta)', () => {
  const clube = (modalidade: string, qtdMembrosAtivos: number) => ({
    modalidade,
    qtdMembrosAtivos,
  });

  it('soma os contadores fechados por Function por modalidade do club, do maior para o menor', () => {
    const r = resumirModalidades([
      clube('Corrida de rua', 60),
      clube('Ciclismo', 44),
      clube('Corrida de rua', 30),
    ]);
    expect(r).toEqual([
      { id: 'Corrida de rua', rotulo: 'Corrida de rua', membros: 90 },
      { id: 'Ciclismo', rotulo: 'Ciclismo', membros: 44 },
    ]);
  });

  it('club na janela pré-Function (sem o agregado) não vira NaN (D-7, mesmo guarda do KPI)', () => {
    const semAgregado = { modalidade: 'Trail' } as unknown as {
      modalidade: string;
      qtdMembrosAtivos: number;
    };
    const r = resumirModalidades([semAgregado, clube('Trail', 5)]);
    expect(r).toEqual([{ id: 'Trail', rotulo: 'Trail', membros: 5 }]);
  });

  it('modalidade sem ninguém sai da lista — barra zerada não informa', () => {
    expect(resumirModalidades([clube('Natação', 0), clube('Funcional', 3)])).toEqual([
      { id: 'Funcional', rotulo: 'Funcional', membros: 3 },
    ]);
  });

  it('empate desempata por nome — a ordem não pode oscilar entre renders', () => {
    const r = resumirModalidades([clube('Trail', 7), clube('Caminhada', 7)]);
    expect(r.map((m) => m.rotulo)).toEqual(['Caminhada', 'Trail']);
  });

  it('devolve a lista inteira: o corte "Top 5" é recorte de card, não de derivação (item 9)', () => {
    const seis = ['Corrida de rua', 'Trail', 'Ciclismo', 'MTB', 'Caminhada', 'Triatlo'].map(
      (m, i) => clube(m, 10 - i)
    );
    expect(resumirModalidades(seis)).toHaveLength(6);
  });

  it('sem club devolve vazio — a tela mostra o convite, não zeros', () => {
    expect(resumirModalidades([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Insights da Leela
// ---------------------------------------------------------------------------

/**
 * O contrato aqui é o mesmo do resto do arquivo, com um agravante: um insight
 * é uma FRASE que a Leela afirma sobre o negócio da pessoa. Número errado num
 * gráfico é um gráfico errado; número errado num insight é a plataforma
 * mentindo com voz de conselho.
 */
describe('derivarInsights', () => {
  const situacao = [
    { id: 'novo', rotulo: 'Novos (7 dias)', total: 8 },
    { id: 'ativo', rotulo: 'Ativos', total: 120 },
    { id: 'inativo', rotulo: 'Parados há 30 dias ou mais', total: 10 },
  ];
  const ponte = [
    { id: 'com-evento', rotulo: 'Ligados a um evento', total: 2 },
    { id: 'sem-evento', rotulo: 'Sem evento vinculado', total: 1 },
  ];

  it('o denominador dos parados é a SOMA DAS SITUAÇÕES, nunca o agregado de ativos', () => {
    const [parados] = derivarInsights(situacao, null);
    // 8 + 120 + 10 = 138. Se um dia alguém trocar por `qtdMembrosAtivos`, os
    // dois caminhos de cálculo divergem e a frase passa a mentir — foi esse
    // par que fez a RN-573 nascer.
    expect(parados?.titulo).toBe('10 de 138 membros estão parados');
    expect(parados?.tom).toBe('atencao');
  });

  it('todo insight carrega o caminho para a casa do fato (RN-573)', () => {
    const insights = derivarInsights(situacao, ponte);
    expect(insights).toHaveLength(2);
    for (const i of insights) {
      expect(i.destino).toBeTruthy();
      expect(i.caminho).toBeTruthy();
    }
    // A casa dos dois fatos é um bloco MAIS ABAIXO nesta mesma tela — por isso
    // âncora, e não rota (a união do tipo carrega as duas formas desde a leva 23).
    expect(insights[0]?.destino).toEqual({ tipo: 'ancora', id: 'situacao-dos-membros' });
    expect(insights[1]?.destino).toEqual({ tipo: 'ancora', id: 'ponte-com-eventos' });
  });

  it('desafios sem evento viram oportunidade, com o total da própria banda', () => {
    const [oportunidade] = derivarInsights(null, ponte);
    expect(oportunidade?.titulo).toBe('1 de 3 desafios não apontam para um evento');
    expect(oportunidade?.tom).toBe('oportunidade');
  });

  it('zero não vira insight — aviso sem fato é ruído com cara de alerta', () => {
    const semParados = situacao.map((c) => (c.id === 'inativo' ? { ...c, total: 0 } : c));
    const tudoLigado = ponte.map((c) => (c.id === 'sem-evento' ? { ...c, total: 0 } : c));
    expect(derivarInsights(semParados, tudoLigado)).toEqual([]);
  });

  it('sem dado nenhum devolve vazio — a tela diz "nada pedindo atenção", não inventa', () => {
    expect(derivarInsights(null, null)).toEqual([]);
    expect(derivarInsights([], [])).toEqual([]);
  });

  it('a frase dos parados não afirma a ÚLTIMA atividade (D-2), que o dado não sustenta', () => {
    const [parados] = derivarInsights(situacao, null);
    expect(parados?.detalhe).toMatch(/não teve nenhum registro de atividade desde então/i);
    expect(parados?.detalhe).not.toMatch(/última atividade|treinou/i);
  });

  it('a ponte segue rotulada como intenção, nunca como inscrição confirmada', () => {
    const [oportunidade] = derivarInsights(null, ponte);
    expect(oportunidade?.detalhe).toMatch(/intenção declarada no desafio, não inscrição confirmada/i);
  });

  it('milhar sai em pt-BR — a frase é para o organizador, não para o console', () => {
    const muitos = [
      { id: 'ativo', rotulo: 'Ativos', total: 9000 },
      { id: 'inativo', rotulo: 'Parados há 30 dias ou mais', total: 1500 },
    ];
    expect(derivarInsights(muitos, null)[0]?.titulo).toBe(
      '1.500 de 10.500 membros estão parados'
    );
  });
});
