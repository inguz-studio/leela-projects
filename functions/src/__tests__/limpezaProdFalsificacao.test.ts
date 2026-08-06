// =============================================================================
// FALSIFICAÇÃO — a prova de que os testes novos não são enfeite.
//
// Cada caso aqui roda a MESMA asserção contra o planejador ANTIGO (commit
// d887528e, o que a review antagonista bloqueou) e contra o novo. O antigo
// tem de FALHAR e o novo tem de PASSAR. Se algum dia o antigo passar, a
// asserção correspondente parou de medir o defeito e não vale mais nada.
//
// O arquivo antigo vive CONGELADO em `fixtures/planoLimpeza.d887528e.ts`,
// extraído com `git show d887528e:functions/src/limpeza/planoLimpeza.ts`.
// Não o edite: um fixture que acompanha o código deixa de ser regressão.
// =============================================================================

import { describe, expect, it } from 'vitest';
import * as novo from '../limpeza/planoLimpeza';
import * as antigo from './fixtures/planoLimpeza.d887528e';
import * as rev2 from './fixtures/planoLimpeza.73e2c593';
import { digitalDoPlano } from '../limpeza/execucaoLimpeza';
import { digitalDoPlanoAntiga } from './fixtures/execucaoLimpeza.73e2c593';

type Doc = { caminho: string; campos: Record<string, unknown> };
const doc = (caminho: string, campos: Record<string, unknown> = {}): Doc => ({ caminho, campos });

const ALVO = {
  tenantsMantidos: ['leela-tenant'],
  eventosMantidos: ['evento-fica'],
  eventosCondenados: ['evento-morre'],
  tenantsCondenados: ['tenant-vazio'],
  uidsProtegidos: ['uid-dono'],
  nomeNovo: 'Leela',
  nomeAntigo: 'Castelo Produções',
};

function mundo(): Doc[] {
  return [
    doc('tenants/leela-tenant', { nome: 'Castelo Produções', slug: 'leela-tenant' }),
    doc('tenants/tenant-vazio', { nome: 'Some Aí' }),
    doc('eventos/evento-fica', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/financeiro/current', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/inscritos/i1', { tenantId: 'leela-tenant' }),
    doc('pedidos/ped-morto', { tenantId: 'leela-tenant', eventoId: 'evento-morre', status: 'pago' }),
    doc('pedidoCodigos/JBA4X', { pedidoId: 'ped-morto' }),
    doc('atletas/uid-dono', {}),
  ];
}

const pos = (p: { operacoes: readonly { caminho: string }[] }, c: string): number =>
  p.operacoes.findIndex((o) => o.caminho === c);
const apagados = (p: { operacoes: readonly { tipo: string; caminho: string }[] }): string[] =>
  p.operacoes.filter((o) => o.tipo === 'apagar').map((o) => o.caminho);

describe('[B1] agregado antes do inscrito que o ressuscita', () => {
  it('ANTIGO falha: o financeiro sai ANTES dos inscritos', () => {
    const p = antigo.planejarLimpeza(mundo() as never, ALVO as never);
    expect(pos(p, 'eventos/evento-morre/financeiro/current')).toBeLessThan(pos(p, 'eventos/evento-morre/inscritos/i1'));
  });

  it('NOVO corrige: o financeiro sai DEPOIS dos inscritos e do evento', () => {
    const p = novo.planejarLimpeza(mundo() as never, ALVO as never);
    expect(pos(p, 'eventos/evento-morre/financeiro/current')).toBeGreaterThan(pos(p, 'eventos/evento-morre/inscritos/i1'));
    expect(pos(p, 'eventos/evento-morre/financeiro/current')).toBeGreaterThan(pos(p, 'eventos/evento-morre'));
  });
});

describe('[B2] retomada depois de queda parcial', () => {
  /** O banco depois de apagar o documento do evento — a queda da review. */
  const meio = (): Doc[] => mundo().filter((d) => d.caminho !== 'eventos/evento-morre');

  it('ANTIGO falha: rodada 2 não enxerga mais o pedido pago condenado', () => {
    const p = antigo.planejarLimpeza(meio() as never, ALVO as never);
    expect(apagados(p)).not.toContain('pedidos/ped-morto');
    expect(p.orfaosPrevistos).toEqual([]); // e ainda diz que está tudo limpo
  });

  it('NOVO corrige: rodada 2 continua apagando o pedido pago e o código dele', () => {
    const p = novo.planejarLimpeza(meio() as never, ALVO as never);
    expect(apagados(p)).toContain('pedidos/ped-morto');
    expect(apagados(p)).toContain('pedidoCodigos/JBA4X');
  });
});

describe('[B3] uid protegido no caminho de exclusão', () => {
  const comDocDoDono = (): Doc[] => [
    ...mundo(),
    doc('atletas/uid-dono/registros/r1', { tenantId: 'tenant-vazio' }),
  ];

  it('ANTIGO falha: apaga documento sob uid protegido', () => {
    const p = antigo.planejarLimpeza(comDocDoDono() as never, ALVO as never);
    expect(apagados(p)).toContain('atletas/uid-dono/registros/r1');
  });

  it('NOVO corrige: o documento é intocável e sai do plano', () => {
    const p = novo.planejarLimpeza(comDocDoDono() as never, ALVO as never);
    expect(apagados(p)).not.toContain('atletas/uid-dono/registros/r1');
    expect(p.intocaveis).toContain('atletas/uid-dono/registros/r1');
  });
});

describe('[B4] poda de chave aninhada', () => {
  const campos = {
    raiz: { 'tenant-vazio': { gmv: 40 }, vivo: { porEvento: { 'evento-morre': { t: 9 }, 'evento-fica': { t: 1 } } } },
  };
  const condenados = new Set(['tenant-vazio', 'evento-morre']);

  it('ANTIGO falha: para no primeiro ramo e deixa a chave morta lá no fundo', () => {
    const m = antigo.podarChavesCondenadas(campos, condenados) as Record<string, Record<string, { porEvento?: object }>>;
    expect(Object.keys(m['raiz']?.['vivo']?.porEvento ?? {})).toContain('evento-morre');
  });

  it('NOVO corrige: desce e poda em qualquer profundidade', () => {
    const m = novo.podarChavesCondenadas(campos, condenados) as Record<string, Record<string, { porEvento?: object }>>;
    expect(Object.keys(m['raiz']?.['vivo']?.porEvento ?? {})).toEqual(['evento-fica']);
  });
});

describe('[A1] snapshot financeiro no renomeador', () => {
  const comSnapshot = (): Doc[] => [
    ...mundo(),
    doc('tenants/leela-tenant/repasses/r1', {
      tenantId: 'leela-tenant',
      dadosBancariosSnapshot: { titular: 'Castelo Produções LTDA' },
    }),
  ];

  it('ANTIGO falha: reescreve o titular do snapshot', () => {
    const p = antigo.planejarLimpeza(comSnapshot() as never, ALVO as never);
    const op = p.operacoes.find((o) => o.caminho === 'tenants/leela-tenant/repasses/r1');
    expect(op?.tipo === 'editar' && op.mudancas['dadosBancariosSnapshot.titular']).toBe('Leela LTDA');
  });

  it('NOVO corrige: snapshot fica intacto', () => {
    const p = novo.planejarLimpeza(comSnapshot() as never, ALVO as never);
    expect(p.operacoes.find((o) => o.caminho === 'tenants/leela-tenant/repasses/r1')).toBeUndefined();
  });
});

// ===========================================================================
// FIX3 — os bloqueadores da SEGUNDA review (`leela-rev2-fria-20260806.md`).
// Aqui o "antigo" é o commit `73e2c593`, o alvo daquela rodada.
// ===========================================================================

describe('[R1] a digital do plano tem de ser reproduzível', () => {
  // A API REST do Firestore devolve o mapa `fields` em ordem ALEATÓRIA: doze
  // leituras do mesmo documento, com `updateTime` idêntico e sem escrita há
  // oito dias, deram doze ordens distintas. `JSON.stringify` serializa na
  // ordem de inserção, então o hash dançava e o portão do `--apply` recusava
  // sempre — `exit 3` num plano que não tinha mudado uma vírgula.
  const rollups = (ordem: 'a' | 'b'): Doc =>
    doc(
      'platform/rollups',
      ordem === 'a'
        ? { tenants: { 'tenant-vazio': { gmv: 40, nome: 'Some Aí' }, 'leela-tenant': { nome: 'X', gmv: 60 } } }
        : { tenants: { 'leela-tenant': { gmv: 60, nome: 'X' }, 'tenant-vazio': { nome: 'Some Aí', gmv: 40 } } }
    );

  const planoCom = (ordem: 'a' | 'b'): { operacoes: readonly novo.Operacao[] } =>
    novo.planejarLimpeza([...mundo(), rollups(ordem)] as never, ALVO as never);

  it('ANTIGO falha: trocar a ORDEM DOS CAMPOS do mesmo documento muda a digital', () => {
    expect(digitalDoPlanoAntiga(planoCom('a').operacoes)).not.toBe(digitalDoPlanoAntiga(planoCom('b').operacoes));
  });

  it('NOVO corrige: canonicalizada, a digital é a mesma', () => {
    expect(digitalDoPlano(planoCom('a'))).toBe(digitalDoPlano(planoCom('b')));
  });

  it('e continua sensível ao que importa: mudar um VALOR muda a digital', () => {
    const outro = novo.planejarLimpeza(
      [...mundo(), doc('platform/rollups', { tenants: { 'tenant-vazio': { gmv: 41 }, 'leela-tenant': {} } })] as never,
      ALVO as never
    );
    expect(digitalDoPlano(outro)).not.toBe(digitalDoPlano(planoCom('a')));
  });
});

describe('[N1] a condenação tem de ser transitiva em QUALQUER raiz', () => {
  // Sob `eventos/` e `tenants/` a condenação já descia por prefixo de caminho,
  // porque o dono saía do próprio caminho. Sob `clubes/` ele só saía de CAMPO,
  // e o modelo para de carregar `tenantId` no nível 1 — o que deixava, medido
  // em produção, 45 documentos de nível 2 vivos sob pai apagado: 33 `acoes` e
  // 12 `conversoes`, todos sem citar id condenado nenhum.
  const comNetos = (): Doc[] => [
    ...mundo(),
    doc('clubes/clube-morto', { tenantId: 'tenant-vazio' }),
    doc('clubes/clube-morto/desafios/verao-leve', { tenantId: 'tenant-vazio' }),
    doc('clubes/clube-morto/desafios/verao-leve/acoes/meditar', { acaoRef: 'meditar' }),
    doc('clubes/clube-morto/parcerias/p1', { tenantId: 'tenant-vazio' }),
    doc('clubes/clube-morto/parcerias/p1/conversoes/c1', { valorComissao: 66 }),
    // CONTROLE — mesma profundidade, raiz `eventos`. Tem de morrer nos dois.
    doc('eventos/evento-morre/inscritos/i1/saude/config', { tenantId: 'leela-tenant' }),
  ];

  it('ANTIGO falha: apaga o pai sob clubes/ e deixa o neto vivo', () => {
    const p = rev2.planejarLimpeza(comNetos() as never, ALVO as never);
    const mortos = apagados(p);
    expect(mortos).toContain('clubes/clube-morto/desafios/verao-leve');
    expect(mortos).not.toContain('clubes/clube-morto/desafios/verao-leve/acoes/meditar');
    expect(mortos).not.toContain('clubes/clube-morto/parcerias/p1/conversoes/c1');
    // E o controle sob `eventos` morre — a única diferença é a raiz.
    expect(mortos).toContain('eventos/evento-morre/inscritos/i1/saude/config');
    // Pior: ele ainda anuncia que não há órfão nenhum.
    expect(p.orfaosPrevistos).toEqual([]);
  });

  it('NOVO corrige: o neto morre nas duas raízes, e o filho sai antes do pai', () => {
    const p = novo.planejarLimpeza(comNetos() as never, ALVO as never);
    const mortos = apagados(p);
    for (const c of [
      'clubes/clube-morto/desafios/verao-leve/acoes/meditar',
      'clubes/clube-morto/parcerias/p1/conversoes/c1',
      'eventos/evento-morre/inscritos/i1/saude/config',
    ]) {
      expect(mortos, `${c} deveria ser condenado por prefixo de caminho`).toContain(c);
    }
    expect(p.orfaosPrevistos).toEqual([]);
    const pos = (c: string): number => p.operacoes.findIndex((o) => o.caminho === c);
    expect(pos('clubes/clube-morto/desafios/verao-leve/acoes/meditar')).toBeLessThan(
      pos('clubes/clube-morto/desafios/verao-leve')
    );
  });

  it('NOVO: sobrevivente sob prefixo apagado é DENUNCIADO, nunca calado', () => {
    // A trava de proteção ganha do prefixo — e é justamente aí que a lane tem
    // de falar, em vez de terminar anunciando zero órfãos.
    const inv = [
      ...mundo(),
      doc('clubes/clube-morto', { tenantId: 'tenant-vazio' }),
      doc('clubes/clube-morto/membros/uid-dono', { tenantId: 'tenant-vazio' }),
    ];
    const p = novo.planejarLimpeza(inv as never, ALVO as never);
    expect(apagados(p)).not.toContain('clubes/clube-morto/membros/uid-dono');
    expect(p.orfaosPrevistos).toContainEqual({
      caminho: 'clubes/clube-morto/membros/uid-dono',
      campo: '(caminho sob prefixo apagado)',
      valor: 'clubes/clube-morto',
    });
  });
});

describe('[B4/F7] os totais da plataforma fechados no próprio PATCH', () => {
  const comRollups = (): Doc[] => [
    ...mundo(),
    doc('eventos/evento-fica', { tenantId: 'leela-tenant', status: 'publicado' }),
    doc('platform/rollups', {
      gmvTotal: 200,
      receitaLeelaTotal: 20,
      tenantsAtivos: 2,
      tenants: {
        'leela-tenant': { nome: 'X', status: 'ativo', gmv: 120, receitaLeela: 12, eventosAtivos: 9, health: 'saudavel' },
        'tenant-vazio': { nome: 'Y', status: 'ativo', gmv: 80, receitaLeela: 8, eventosAtivos: 3, health: 'saudavel' },
      },
    }),
  ];
  const edicao = (p: { operacoes: readonly novo.Operacao[] }): Record<string, unknown> => {
    const op = p.operacoes.find((o) => o.caminho === 'platform/rollups' && o.tipo === 'editar');
    return op !== undefined && op.tipo === 'editar' ? (op.mudancas as Record<string, unknown>) : {};
  };

  it('ANTIGO falha: poda a chave morta e deixa os três totais do mundo antigo', () => {
    const m = edicao(rev2.planejarLimpeza(comRollups() as never, ALVO as never) as never);
    expect(Object.keys(m['tenants'] as object)).toEqual(['leela-tenant']);
    expect(m['gmvTotal']).toBeUndefined();
    expect(m['receitaLeelaTotal']).toBeUndefined();
    expect(m['tenantsAtivos']).toBeUndefined();
  });

  it('NOVO corrige: soma os sobreviventes e conta os eventos que ficam', () => {
    const m = edicao(novo.planejarLimpeza(comRollups() as never, ALVO as never));
    expect(m['gmvTotal']).toBe(120);
    expect(m['receitaLeelaTotal']).toBe(12);
    expect(m['tenantsAtivos']).toBe(1);
    const t = (m['tenants'] as Record<string, Record<string, unknown>>)['leela-tenant'];
    expect(t?.['eventosAtivos'], 'só um evento publicado sobrevive neste mundo').toBe(1);
    expect(t?.['health']).toBe('saudavel');
    // O `gmv` de cada tenant é acumulador histórico. Não se reescreve dinheiro.
    expect(t?.['gmv']).toBe(120);
  });
});
