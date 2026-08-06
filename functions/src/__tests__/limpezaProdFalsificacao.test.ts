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
