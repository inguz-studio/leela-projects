// =============================================================================
// Teste do PLANO de limpeza contra dado sintético.
//
// Cada bloco marcado [B1]…[B4]/[A1] cobre um bloqueador da review antagonista
// `leela-rev-limpeza-20260806.md`, e cada um desses testes FALHA na versão
// anterior do planejador. É isso que os torna prova de correção, e não enfeite.
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  ORDEM,
  aplicarMudancas,
  intocavel,
  planejarLimpeza,
  podarChavesCondenadas,
  recomputarCrm,
  referenciasA,
  renomeavel,
  trocarNome,
  type AlvoLimpeza,
  type DocInventario,
  type Operacao,
} from '../limpeza/planoLimpeza';

const ALVO: AlvoLimpeza = {
  tenantsMantidos: ['leela-tenant'],
  eventosMantidos: ['evento-fica', 'evento-teste'],
  eventosCondenados: ['evento-morre'],
  tenantsCondenados: ['tenant-vazio'],
  uidsProtegidos: ['uid-dono'],
  nomeNovo: 'Leela',
  nomeAntigo: 'Castelo Produções',
};

const doc = (caminho: string, campos: Record<string, unknown> = {}): DocInventario => ({ caminho, campos });

function mundo(): DocInventario[] {
  return [
    doc('tenants/leela-tenant', { nome: 'Castelo Produções', slug: 'leela-tenant' }),
    doc('tenants/tenant-vazio', { nome: 'Some Aí', slug: 'tenant-vazio' }),

    doc('eventos/evento-fica', { tenantId: 'leela-tenant', status: 'publicado' }),
    doc('eventos/evento-teste', { tenantId: 'leela-tenant', status: 'publicado' }),
    doc('eventos/evento-morre', { tenantId: 'leela-tenant', status: 'encerrado' }),

    doc('eventos/evento-morre/automacoes/a1', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/comunicacoes/c1', { tenantId: 'leela-tenant', eventoId: 'evento-morre' }),
    doc('eventos/evento-morre/comunicacoesResumo/current', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/financeiro/current', { tenantId: 'leela-tenant', receitaBruta: 510 }),
    doc('eventos/evento-morre/demografia/current', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/aprovisionamento/camiseta', { tenantId: 'leela-tenant', estado: 'em_estoque' }),
    doc('eventos/evento-morre/inscritos/i1', { tenantId: 'leela-tenant', atletaId: 'uid-semente' }),
    doc('eventos/evento-morre/lotes/l1', { tenantId: 'leela-tenant' }),

    doc('eventos/evento-teste/inscritos/ped-real-i1', { tenantId: 'leela-tenant', atletaId: 'uid-dono' }),
    doc('eventos/evento-teste/ingressoCodigos/T93N7F', {
      tenantId: 'leela-tenant',
      eventoId: 'evento-teste',
      inscritoId: 'ped-real-i1',
    }),

    doc('pedidos/ped-real', { tenantId: 'leela-tenant', eventoId: 'evento-teste', codigoPedido: '8CDHM', status: 'pago' }),
    doc('pedidos/ped-morto', { tenantId: 'leela-tenant', eventoId: 'evento-morre', codigoPedido: 'JBA4X', status: 'pago' }),
    doc('pagamentos/pag-morto', { tenantId: 'leela-tenant', eventoId: 'evento-morre' }),
    doc('carrinhos/c-morto', { tenantId: 'leela-tenant', eventoId: 'evento-morre' }),
    doc('pedidoCodigos/8CDHM', { pedidoId: 'ped-real' }),
    doc('pedidoCodigos/JBA4X', { pedidoId: 'ped-morto' }),

    doc('atletas/uid-dono', { nome: 'Dono' }),
    doc('atletas/uid-semente', { nome: 'uid-semente' }),
  ];
}

const caminhos = (p: { operacoes: readonly Operacao[] }, tipo: 'apagar' | 'editar'): string[] =>
  p.operacoes.filter((o) => o.tipo === tipo).map((o) => o.caminho);
const posicao = (p: { operacoes: readonly Operacao[] }, caminho: string): number =>
  p.operacoes.findIndex((o) => o.caminho === caminho);

// ===========================================================================
// [B1] Os agregados não podem morrer antes de quem os ressuscita
// ===========================================================================
describe('[B1] ordem — o evento morre primeiro e desarma os gates de recompute', () => {
  it('o documento do evento sai ANTES de qualquer folha dele', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const evento = posicao(p, 'eventos/evento-morre');
    for (const folha of [
      'eventos/evento-morre/inscritos/i1',
      'eventos/evento-morre/lotes/l1',
      'eventos/evento-morre/comunicacoes/c1',
      'eventos/evento-morre/automacoes/a1',
    ]) {
      expect(posicao(p, folha), `${folha} deveria sair depois do evento`).toBeGreaterThan(evento);
    }
  });

  // Este é o teste que falha na versão anterior: lá os quatro agregados
  // saíam no MESMO grupo dos inscritos, com desempate alfabético, e portanto
  // ANTES deles — sendo reescritos por gatilho a cada delete de inscrito.
  it('os QUATRO agregados saem depois dos inscritos e depois do evento', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const inscrito = posicao(p, 'eventos/evento-morre/inscritos/i1');
    const comunicacao = posicao(p, 'eventos/evento-morre/comunicacoes/c1');
    const evento = posicao(p, 'eventos/evento-morre');
    for (const ag of [
      'eventos/evento-morre/financeiro/current',
      'eventos/evento-morre/demografia/current',
      'eventos/evento-morre/aprovisionamento/camiseta',
      'eventos/evento-morre/comunicacoesResumo/current',
    ]) {
      expect(posicao(p, ag), `${ag} tem de sair depois do evento`).toBeGreaterThan(evento);
      expect(posicao(p, ag), `${ag} tem de sair depois dos inscritos`).toBeGreaterThan(inscrito);
      expect(posicao(p, ag), `${ag} tem de sair depois das comunicações`).toBeGreaterThan(comunicacao);
    }
  });

  it('o agregado recebe a ordem AGREGADOS, não a das folhas', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const ag = p.operacoes.find((o) => o.caminho === 'eventos/evento-morre/financeiro/current');
    expect(ag?.ordem).toBe(ORDEM.AGREGADOS);
    expect(ORDEM.AGREGADOS).toBeGreaterThan(ORDEM.EVENTO);
    expect(ORDEM.AGREGADOS).toBeGreaterThan(ORDEM.FOLHAS_EVENTO);
  });

  // A ordem dos disparos é defesa em profundidade. O teste afirma SÓ isso —
  // a versão anterior tinha um teste chamado "senão o delete dispara e-mail",
  // afirmando uma causalidade que nem ele nem o código verificavam.
  it('os disparos saem antes das folhas (defesa em profundidade, não garantia de e-mail)', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    expect(posicao(p, 'eventos/evento-morre/automacoes/a1')).toBeLessThan(
      posicao(p, 'eventos/evento-morre/inscritos/i1')
    );
  });
});

// ===========================================================================
// [B2] Retomada: rodar duas vezes é seguro, e a segunda não mente
// ===========================================================================
describe('[B2] retomada idempotente', () => {
  /** Aplica as `n` primeiras operações a um inventário e devolve o resultado. */
  function aplicarParcial(inv: DocInventario[], ops: readonly Operacao[], n: number): DocInventario[] {
    let saida = inv.map((d) => ({ ...d, campos: { ...d.campos } }));
    for (const op of ops.slice(0, n)) {
      if (op.tipo === 'apagar') saida = saida.filter((d) => d.caminho !== op.caminho);
      else {
        saida = saida.map((d) =>
          d.caminho === op.caminho ? { ...d, campos: aplicarMudancas(d.campos, op.mudancas) } : d
        );
      }
    }
    return saida;
  }

  // O teste que a review executou e que falhava: depois de uma queda logo
  // após o documento do evento, a rodada 2 planejava ~nada e dizia "0 órfãos"
  // sobre um banco pela metade, deixando um pedido PAGO pendurado.
  it('queda logo depois do documento do evento: a rodada 2 ainda apaga o resto', () => {
    const p1 = planejarLimpeza(mundo(), ALVO);
    const ateOEvento = p1.operacoes.findIndex((o) => o.caminho === 'eventos/evento-morre') + 1;
    const meio = aplicarParcial(mundo(), p1.operacoes, ateOEvento);

    const p2 = planejarLimpeza(meio, ALVO);
    const apagados2 = caminhos(p2, 'apagar');
    expect(apagados2).toContain('pedidos/ped-morto');
    expect(apagados2).toContain('pedidoCodigos/JBA4X');
    expect(apagados2).toContain('pagamentos/pag-morto');
    expect(apagados2).toContain('carrinhos/c-morto');
    expect(apagados2).toContain('eventos/evento-morre/inscritos/i1');
  });

  it('nenhum pedido PAGO de evento condenado sobrevive a uma queda no meio', () => {
    const p1 = planejarLimpeza(mundo(), ALVO);
    for (let corte = 0; corte <= p1.operacoes.length; corte += 1) {
      const meio = aplicarParcial(mundo(), p1.operacoes, corte);
      const p2 = planejarLimpeza(meio, ALVO);
      const final = aplicarParcial(meio, p2.operacoes, p2.operacoes.length);
      const pendurado = final.find((d) => d.caminho === 'pedidos/ped-morto');
      expect(pendurado, `queda no corte ${corte} deixou um pedido pago pendurado`).toBeUndefined();
    }
  });

  it('rodar o plano completo duas vezes converge e a segunda não inventa trabalho', () => {
    const p1 = planejarLimpeza(mundo(), ALVO);
    const depois1 = aplicarParcial(mundo(), p1.operacoes, p1.operacoes.length);
    const p2 = planejarLimpeza(depois1, ALVO);
    expect(caminhos(p2, 'apagar')).toEqual([]);
    const depois2 = aplicarParcial(depois1, p2.operacoes, p2.operacoes.length);
    expect(depois2.map((d) => d.caminho).sort()).toEqual(depois1.map((d) => d.caminho).sort());
  });

  it('a poda de chave não desaparece do plano por o tenant já ter morrido', () => {
    const inv = [
      ...mundo(),
      doc('platform/rollups', { tenants: { 'leela-tenant': { gmv: 60 }, 'tenant-vazio': { gmv: 40 } } }),
    ];
    // Cenário da review: queda entre a última exclusão e as edições.
    const semTenant = inv.filter((d) => d.caminho !== 'tenants/tenant-vazio');
    const p = planejarLimpeza(semTenant, ALVO);
    const poda = p.operacoes.find((o) => o.caminho === 'platform/rollups' && o.motivo.includes('chave'));
    expect(poda, 'a poda sumiu quando o tenant já não existia').toBeDefined();
  });

  it('recusa alvo incoerente — o mesmo id mantido e condenado', () => {
    expect(() =>
      planejarLimpeza(mundo(), { ...ALVO, eventosCondenados: ['evento-fica'] })
    ).toThrow(/mantido E condenado/);
  });
});

// ===========================================================================
// [B3] uid protegido é intocável no caminho de EXCLUSÃO, não só no relatório
// ===========================================================================
describe('[B3] gate de proteção de uid', () => {
  it('documento cujo caminho é do uid protegido nunca entra no plano', () => {
    const inv = [
      ...mundo(),
      doc('atletas/uid-dono/registros/r1', { tenantId: 'tenant-vazio', eventoId: 'evento-morre' }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    expect(caminhos(p, 'apagar')).not.toContain('atletas/uid-dono/registros/r1');
    expect(p.intocaveis).toContain('atletas/uid-dono/registros/r1');
  });

  it('condenado que REFERENCIA uid protegido vira conflito declarado', () => {
    const inv = [...mundo(), doc('pedidos/ped-do-dono', { tenantId: 'leela-tenant', eventoId: 'evento-morre', compradorUid: 'uid-dono' })];
    const p = planejarLimpeza(inv, ALVO);
    expect(p.conflitosDeProtecao).toContainEqual({
      caminho: 'pedidos/ped-do-dono',
      uid: 'uid-dono',
      campo: 'compradorUid',
    });
  });

  it('sem uid protegido envolvido, não há conflito nenhum', () => {
    expect(planejarLimpeza(mundo(), ALVO).conflitosDeProtecao).toEqual([]);
  });

  it('o inscrito do dono num evento que FICA continua fora de qualquer conflito', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    expect(caminhos(p, 'apagar')).not.toContain('eventos/evento-teste/inscritos/ped-real-i1');
    expect(p.conflitosDeProtecao).toEqual([]);
  });

  it('intocavel() casa o uid como id de segmento, não como substring', () => {
    const prot = new Set(['uid-dono']);
    expect(intocavel('atletas/uid-dono', prot)).toBe(true);
    expect(intocavel('atletas/uid-dono/registros/r1', prot)).toBe(true);
    expect(intocavel('atletas/uid-dono-outro', prot)).toBe(false);
    expect(intocavel('pedidos/uid-dono', prot)).toBe(true);
  });
});

// ===========================================================================
// [B4] Poda de chave desce até o fundo
// ===========================================================================
describe('[B4] poda de chave condenada em qualquer profundidade', () => {
  // Falha na versão anterior: ela reescrevia o ramo mais alto e dava `return`,
  // então a chave morta mais funda sobrevivia.
  it('poda chave morta aninhada abaixo de um ramo já podado', () => {
    const campos = {
      raiz: {
        'tenant-vazio': { gmv: 40 },
        vivo: { porEvento: { 'evento-morre': { total: 9 }, 'evento-fica': { total: 1 } } },
      },
    };
    const m = podarChavesCondenadas(campos, new Set(['tenant-vazio', 'evento-morre']));
    const raiz = m['raiz'] as Record<string, { porEvento?: Record<string, unknown> } | undefined>;
    expect(Object.keys(raiz)).toEqual(['vivo']);
    expect(Object.keys(raiz['vivo']?.porEvento ?? {})).toEqual(['evento-fica']);
  });

  it('não inventa mudança quando não há chave condenada', () => {
    expect(podarChavesCondenadas({ a: { b: 1 } }, new Set(['x']))).toEqual({});
  });

  it('preserva os irmãos vivos e seus valores', () => {
    const m = podarChavesCondenadas(
      { tenants: { 'leela-tenant': { gmv: 60 }, 'tenant-vazio': { gmv: 40 } } },
      new Set(['tenant-vazio'])
    );
    expect(m['tenants']).toEqual({ 'leela-tenant': { gmv: 60 } });
  });

  it('declara os recomputes que o plano NÃO faz', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const texto = p.recomputesObrigatorios.join(' ');
    expect(texto).toContain('recomputePlatformRollups');
    expect(texto).toContain('saldo/current');
    expect(texto).toContain('dashboard');
  });
});

// ===========================================================================
// [A1] Snapshot financeiro e identidade bancária ficam fora do renomeador
// ===========================================================================
describe('[A1] o renomeador não adultera registro histórico', () => {
  it('não reescreve dadosBancariosSnapshot.titular', () => {
    const inv = [
      ...mundo(),
      doc('tenants/leela-tenant/repasses/r1', {
        tenantId: 'leela-tenant',
        dadosBancariosSnapshot: { titular: 'Castelo Produções LTDA', pixMascarado: '***@castelo***.com' },
      }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    expect(caminhos(p, 'editar')).not.toContain('tenants/leela-tenant/repasses/r1');
  });

  it('não reescreve titular de dados bancários correntes', () => {
    const inv = [...mundo(), doc('tenants/leela-tenant/dadosBancarios/current', { tenantId: 'leela-tenant', titular: 'Castelo Produções LTDA' })];
    const p = planejarLimpeza(inv, ALVO);
    expect(caminhos(p, 'editar')).not.toContain('tenants/leela-tenant/dadosBancarios/current');
  });

  it('continua renomeando texto de exibição comum', () => {
    const inv = [...mundo(), doc('clubes/c1', { tenantId: 'leela-tenant', descricao: 'Clube da Castelo Produções.' })];
    const p = planejarLimpeza(inv, ALVO);
    const op = p.operacoes.find((o) => o.caminho === 'clubes/c1');
    expect(op?.tipo === 'editar' && op.mudancas['descricao']).toBe('Clube da Leela.');
  });

  it('renomeavel() separa exibição de registro', () => {
    expect(renomeavel('descricao')).toBe(true);
    expect(renomeavel('nome')).toBe(true);
    expect(renomeavel('dadosBancariosSnapshot.titular')).toBe(false);
    expect(renomeavel('titular')).toBe(false);
    expect(renomeavel('pixMascarado')).toBe(false);
  });
});

// ===========================================================================
// Invariantes que já valiam e continuam valendo
// ===========================================================================
describe('o que morre e o que fica', () => {
  it('apaga o evento condenado com todo o subtree e não encosta no que fica', () => {
    const apagados = caminhos(planejarLimpeza(mundo(), ALVO), 'apagar');
    expect(apagados).toContain('eventos/evento-morre');
    expect(apagados).toContain('eventos/evento-morre/inscritos/i1');
    expect(apagados).not.toContain('eventos/evento-fica');
    expect(apagados).not.toContain('eventos/evento-teste');
  });

  it('preserva o pedido real pago, o inscrito e a reserva do ingresso', () => {
    const apagados = caminhos(planejarLimpeza(mundo(), ALVO), 'apagar');
    for (const vivo of [
      'pedidos/ped-real',
      'pedidoCodigos/8CDHM',
      'eventos/evento-teste/inscritos/ped-real-i1',
      'eventos/evento-teste/ingressoCodigos/T93N7F',
    ]) {
      expect(apagados).not.toContain(vivo);
    }
  });

  it('apaga o tenant sem evento nenhum, por último entre os condenados', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    expect(caminhos(p, 'apagar')).toContain('tenants/tenant-vazio');
    expect(p.operacoes.find((o) => o.caminho === 'tenants/tenant-vazio')?.ordem).toBe(ORDEM.TENANT);
  });

  it('nunca deixa código sem pedido nem pedido sem código', () => {
    const apagados = new Set(caminhos(planejarLimpeza(mundo(), ALVO), 'apagar'));
    for (const d of mundo()) {
      if (!d.caminho.startsWith('pedidoCodigos/')) continue;
      expect(apagados.has(d.caminho)).toBe(apagados.has(`pedidos/${String(d.campos['pedidoId'])}`));
    }
  });
});

describe('cirurgia no CRM', () => {
  const cliente = {
    tenantId: 'leela-tenant',
    qtdInscricoes: 2,
    qtdEventos: 2,
    valorGasto: 150,
    ltv: 150,
    eventos: { 'evento-fica': { valorPago: 50 }, 'evento-morre': { valorPago: 100 } },
    inscricoes: {
      'evento-fica_i1': { eventoId: 'evento-fica', valorPago: 50 },
      'evento-morre_i9': { eventoId: 'evento-morre', valorPago: 100 },
    },
  };

  it('remove a inscrição do evento morto e recalcula o dinheiro', () => {
    const { mudancas, vazio } = recomputarCrm(cliente, new Set(['evento-fica', 'evento-teste']));
    expect(vazio).toBe(false);
    expect(Object.keys(mudancas['inscricoes'] as object)).toEqual(['evento-fica_i1']);
    expect(mudancas['qtdInscricoes']).toBe(1);
    expect(mudancas['valorGasto']).toBe(50);
    expect(mudancas['ltv']).toBe(50);
  });

  it('apaga o cliente que só tinha evento condenado', () => {
    const inv = [
      ...mundo(),
      doc('tenants/leela-tenant/crmClientes/c-morto', {
        tenantId: 'leela-tenant',
        eventos: { 'evento-morre': { valorPago: 10 } },
        inscricoes: { 'evento-morre_i2': { eventoId: 'evento-morre', valorPago: 10 } },
      }),
    ];
    expect(caminhos(planejarLimpeza(inv, ALVO), 'apagar')).toContain('tenants/leela-tenant/crmClientes/c-morto');
  });
});

describe('nome da produtora', () => {
  it('troca o nome e não encosta no identificador', () => {
    const op = planejarLimpeza(mundo(), ALVO).operacoes.find((o) => o.caminho === 'tenants/leela-tenant');
    expect(op?.tipo === 'editar' && op.mudancas['nome']).toBe('Leela');
    expect(op?.tipo === 'editar' && op.mudancas['slug']).toBeUndefined();
  });

  it('troca dentro de texto corrido sem comer o resto da frase', () => {
    expect(trocarNome('Clube da Castelo Produções na Beira-Mar.', 'Castelo Produções', 'Leela')).toBe(
      'Clube da Leela na Beira-Mar.'
    );
  });
});

describe('órfãos e contas', () => {
  it('não prevê órfão no mundo bem formado', () => {
    expect(planejarLimpeza(mundo(), ALVO).orfaosPrevistos).toEqual([]);
  });

  it('denuncia órfão em campo que não é de evento', () => {
    const p = planejarLimpeza([...mundo(), doc('platform/config', { destaque: 'evento-morre' })], ALVO);
    expect(p.orfaosPrevistos).toContainEqual({ caminho: 'platform/config', campo: 'destaque', valor: 'evento-morre' });
  });

  it('nunca lista identidade protegida como conta sem lastro, e aponta a de semente', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    expect(p.contasSemLastro).not.toContain('uid-dono');
    expect(p.contasSemLastro).toContain('uid-semente');
  });

  it('não apaga conta nenhuma — contas são decisão do dono', () => {
    expect(caminhos(planejarLimpeza(mundo(), ALVO), 'apagar').filter((c) => c.startsWith('atletas/'))).toEqual([]);
  });

  it('reporta documento-fantasma recebido do inventário', () => {
    const inv: DocInventario[] = [...mundo(), { caminho: 'profissionais/uid-x', campos: {}, fantasma: true }];
    expect(planejarLimpeza(inv, ALVO).fantasmas).toContain('profissionais/uid-x');
  });

  // Estes eram invisíveis: sem showMissing o inventário nunca via o subtree,
  // e o plano terminava deixando órfão que ele mesmo não enxergava.
  it('varre lixo sob fantasma que aponta para condenado, e por último', () => {
    const inv: DocInventario[] = [
      ...mundo(),
      { caminho: 'profissionais/uid-semente', campos: {}, fantasma: true },
      doc('profissionais/uid-semente/dashboard/current', { eventoEmRisco: { slug: 'evento-morre' } }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    expect(caminhos(p, 'apagar')).toContain('profissionais/uid-semente/dashboard/current');
    expect(p.operacoes.find((o) => o.caminho === 'profissionais/uid-semente/dashboard/current')?.ordem).toBe(
      ORDEM.FANTASMAS
    );
    expect(p.orfaosPrevistos).toEqual([]);
  });

  it('não varre o fantasma de identidade protegida — ali o pai ausente é lacuna', () => {
    const inv: DocInventario[] = [
      ...mundo(),
      { caminho: 'profissionais/uid-dono', campos: {}, fantasma: true },
      doc('profissionais/uid-dono/dashboard/current', { eventoEmRisco: { slug: 'evento-morre' } }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    expect(caminhos(p, 'apagar')).not.toContain('profissionais/uid-dono/dashboard/current');
    expect(p.intocaveis).toContain('profissionais/uid-dono/dashboard/current');
  });

  it('conflito de proteção também pega uid dentro de chave composta', () => {
    const inv = [
      ...mundo(),
      doc('pedidos/ped-uid-dono-chk-abc', { tenantId: 'leela-tenant', eventoId: 'evento-morre' }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    expect(p.conflitosDeProtecao).toContainEqual({
      caminho: 'pedidos/ped-uid-dono-chk-abc',
      uid: 'uid-dono',
      campo: '(chave composta)',
    });
  });
});

describe('referenciasA · casa valor, não nome de campo', () => {
  it('acha ponteiro dentro de mapa dinâmico e de lista', () => {
    const achados = referenciasA(
      { inscricoes: { x_y: { eventoId: 'evento-morre' } }, transicoes: [{ por: 'evento-morre' }] },
      new Set(['evento-morre'])
    );
    expect(achados.map((a) => a.campo).sort()).toEqual(['inscricoes.x_y.eventoId', 'transicoes[0].por']);
  });
});

describe('higiene do planejador', () => {
  it('mesma entrada produz o mesmo plano, na mesma ordem', () => {
    expect(planejarLimpeza(mundo(), ALVO).operacoes).toEqual(planejarLimpeza([...mundo()].reverse(), ALVO).operacoes);
  });

  it('não muta o inventário de entrada', () => {
    const inv = [...mundo(), doc('platform/rollups', { tenants: { 'leela-tenant': { nome: 'Castelo Produções' }, 'tenant-vazio': {} } })];
    const antes = JSON.stringify(inv);
    planejarLimpeza(inv, ALVO);
    expect(JSON.stringify(inv)).toBe(antes);
  });

  it('a poda não carrega o nome já trocado pela edição seguinte', () => {
    const inv = [
      ...mundo(),
      doc('platform/rollups', { tenants: { 'leela-tenant': { nome: 'Castelo Produções' }, 'tenant-vazio': {} } }),
    ];
    const poda = planejarLimpeza(inv, ALVO).operacoes.find(
      (o) => o.caminho === 'platform/rollups' && o.motivo.includes('chave')
    );
    const tenants = poda?.tipo === 'editar' ? (poda.mudancas['tenants'] as Record<string, Record<string, unknown>>) : {};
    expect(tenants['leela-tenant']?.['nome']).toBe('Castelo Produções');
  });
});
