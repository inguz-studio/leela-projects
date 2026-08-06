// =============================================================================
// Teste do PLANO de limpeza contra dado sintético.
//
// Lógica de exclusão sem teste é como se chama um incidente. O que estes casos
// travam não é "o código roda": é que a ORDEM protege contra o fan-out de
// e-mail, que o par pedido↔código nunca se separa, que o ledger do CRM não
// guarda dinheiro de evento morto, e que o pedido real do dono sobrevive.
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  ORDEM,
  planejarLimpeza,
  recomputarCrm,
  referenciasA,
  trocarNome,
  type AlvoLimpeza,
  type DocInventario,
} from '../limpeza/planoLimpeza';

const ALVO: AlvoLimpeza = {
  tenantsMantidos: ['leela-tenant'],
  eventosMantidos: ['evento-fica', 'evento-teste'],
  uidsProtegidos: ['uid-dono'],
  nomeNovo: 'Leela',
  nomeAntigo: 'Castelo Produções',
};

const doc = (caminho: string, campos: Record<string, unknown> = {}): DocInventario => ({
  caminho,
  campos,
});

/** Um mundo mínimo com as duas formas que importam: o que fica e o que morre. */
function mundo(): DocInventario[] {
  return [
    doc('tenants/leela-tenant', { nome: 'Castelo Produções', slug: 'leela-tenant' }),
    doc('tenants/tenant-vazio', { nome: 'Some Aí', slug: 'tenant-vazio' }),

    doc('eventos/evento-fica', { tenantId: 'leela-tenant', status: 'publicado' }),
    doc('eventos/evento-teste', { tenantId: 'leela-tenant', status: 'publicado' }),
    doc('eventos/evento-morre', { tenantId: 'leela-tenant', status: 'encerrado' }),

    doc('eventos/evento-morre/automacoes/a1', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/comunicacoes/c1', { tenantId: 'leela-tenant', eventoId: 'evento-morre' }),
    doc('eventos/evento-morre/inscritos/i1', { tenantId: 'leela-tenant', atletaId: 'uid-semente' }),
    doc('eventos/evento-morre/lotes/l1', { tenantId: 'leela-tenant' }),

    doc('eventos/evento-teste/inscritos/ped-real-i1', {
      tenantId: 'leela-tenant',
      atletaId: 'uid-dono',
      codigoIngresso: 'T93N7F',
    }),
    doc('eventos/evento-teste/ingressoCodigos/T93N7F', {
      tenantId: 'leela-tenant',
      eventoId: 'evento-teste',
      inscritoId: 'ped-real-i1',
    }),

    doc('pedidos/ped-real', {
      tenantId: 'leela-tenant',
      eventoId: 'evento-teste',
      codigoPedido: '8CDHM',
      status: 'pago',
    }),
    doc('pedidos/ped-morto', {
      tenantId: 'leela-tenant',
      eventoId: 'evento-morre',
      codigoPedido: 'JBA4X',
      status: 'pago',
    }),
    doc('pedidoCodigos/8CDHM', { pedidoId: 'ped-real' }),
    doc('pedidoCodigos/JBA4X', { pedidoId: 'ped-morto' }),

    doc('atletas/uid-dono', { nome: 'Dono' }),
    doc('atletas/uid-semente', { nome: 'uid-semente' }),
  ];
}

const caminhos = (p: ReturnType<typeof planejarLimpeza>, tipo: 'apagar' | 'editar'): string[] =>
  p.operacoes.filter((o) => o.tipo === tipo).map((o) => o.caminho);

describe('planejarLimpeza · o que morre e o que fica', () => {
  it('apaga o evento condenado com todo o subtree, e não encosta no que fica', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const apagados = caminhos(p, 'apagar');

    expect(apagados).toContain('eventos/evento-morre');
    expect(apagados).toContain('eventos/evento-morre/inscritos/i1');
    expect(apagados).toContain('eventos/evento-morre/lotes/l1');
    expect(apagados).toContain('eventos/evento-morre/automacoes/a1');

    expect(apagados).not.toContain('eventos/evento-fica');
    expect(apagados).not.toContain('eventos/evento-teste');
  });

  it('preserva o pedido real pago, o inscrito e a reserva do código do ingresso', () => {
    const apagados = caminhos(planejarLimpeza(mundo(), ALVO), 'apagar');
    expect(apagados).not.toContain('pedidos/ped-real');
    expect(apagados).not.toContain('pedidoCodigos/8CDHM');
    expect(apagados).not.toContain('eventos/evento-teste/inscritos/ped-real-i1');
    expect(apagados).not.toContain('eventos/evento-teste/ingressoCodigos/T93N7F');
  });

  it('apaga o tenant sem evento nenhum', () => {
    expect(caminhos(planejarLimpeza(mundo(), ALVO), 'apagar')).toContain('tenants/tenant-vazio');
  });
});

describe('planejarLimpeza · ordem', () => {
  it('mata a automação ANTES do inscrito — senão o delete dispara e-mail', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const automacao = p.operacoes.findIndex((o) => o.caminho === 'eventos/evento-morre/automacoes/a1');
    const inscrito = p.operacoes.findIndex((o) => o.caminho === 'eventos/evento-morre/inscritos/i1');
    expect(automacao).toBeGreaterThanOrEqual(0);
    expect(automacao).toBeLessThan(inscrito);
  });

  it('mata as folhas ANTES do documento do evento — senão o agregado congela', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const folha = p.operacoes.findIndex((o) => o.caminho === 'eventos/evento-morre/lotes/l1');
    const evento = p.operacoes.findIndex((o) => o.caminho === 'eventos/evento-morre');
    expect(folha).toBeLessThan(evento);
  });

  it('mata o documento do tenant por último entre os condenados', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const tenant = p.operacoes.find((o) => o.caminho === 'tenants/tenant-vazio');
    expect(tenant?.ordem).toBe(ORDEM.TENANT);
  });
});

describe('planejarLimpeza · o par pedido ↔ código', () => {
  it('apaga pedidoCodigos junto com o pedido condenado', () => {
    const apagados = caminhos(planejarLimpeza(mundo(), ALVO), 'apagar');
    expect(apagados).toContain('pedidos/ped-morto');
    expect(apagados).toContain('pedidoCodigos/JBA4X');
  });

  it('nunca deixa código sem pedido nem pedido sem código', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const apagados = new Set(caminhos(p, 'apagar'));
    for (const d of mundo()) {
      if (!d.caminho.startsWith('pedidoCodigos/')) continue;
      const pedido = `pedidos/${String(d.campos['pedidoId'])}`;
      expect(apagados.has(d.caminho)).toBe(apagados.has(pedido));
    }
  });
});

describe('recomputarCrm · o ledger fechado', () => {
  const cliente = {
    nome: 'Manuela',
    tenantId: 'leela-tenant',
    qtdInscricoes: 2,
    qtdEventos: 2,
    valorGasto: 150,
    ltv: 150,
    eventos: {
      'evento-fica': { qtdInscricoes: 1, valorPago: 50, nome: 'Fica' },
      'evento-morre': { qtdInscricoes: 1, valorPago: 100, nome: 'Morre' },
    },
    inscricoes: {
      'evento-fica_i1': { eventoId: 'evento-fica', valorPago: 50, status: 'confirmado' },
      'evento-morre_i9': { eventoId: 'evento-morre', valorPago: 100, status: 'confirmado' },
    },
  };

  it('remove a inscrição do evento morto e recalcula o dinheiro', () => {
    const { mudancas, vazio } = recomputarCrm(cliente, new Set(['evento-fica', 'evento-teste']));
    expect(vazio).toBe(false);
    expect(Object.keys(mudancas['inscricoes'] as object)).toEqual(['evento-fica_i1']);
    expect(Object.keys(mudancas['eventos'] as object)).toEqual(['evento-fica']);
    expect(mudancas['qtdInscricoes']).toBe(1);
    expect(mudancas['qtdEventos']).toBe(1);
    expect(mudancas['valorGasto']).toBe(50);
    expect(mudancas['ltv']).toBe(50);
  });

  it('marca como vazio o cliente que só tinha evento condenado', () => {
    const { vazio } = recomputarCrm(cliente, new Set(['outro-evento']));
    expect(vazio).toBe(true);
  });

  it('apaga o cliente vazio e edita o que tem inscrição sobrevivente', () => {
    const inv = [
      ...mundo(),
      doc('tenants/leela-tenant/crmClientes/c-misto', cliente),
      doc('tenants/leela-tenant/crmClientes/c-morto', {
        tenantId: 'leela-tenant',
        eventos: { 'evento-morre': { qtdInscricoes: 1, valorPago: 10 } },
        inscricoes: { 'evento-morre_i2': { eventoId: 'evento-morre', valorPago: 10 } },
      }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    expect(caminhos(p, 'apagar')).toContain('tenants/leela-tenant/crmClientes/c-morto');
    expect(caminhos(p, 'editar')).toContain('tenants/leela-tenant/crmClientes/c-misto');
  });
});

describe('planejarLimpeza · o nome da produtora', () => {
  it('troca o nome de exibição e não encosta no identificador', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    const op = p.operacoes.find((o) => o.caminho === 'tenants/leela-tenant');
    expect(op?.tipo).toBe('editar');
    expect(op?.tipo === 'editar' && op.mudancas['nome']).toBe('Leela');
    expect(op?.tipo === 'editar' && op.mudancas['slug']).toBeUndefined();
  });

  it('troca o nome dentro de texto corrido, sem comer o resto da frase', () => {
    expect(trocarNome('Clube da Castelo Produções na Beira-Mar.', 'Castelo Produções', 'Leela')).toBe(
      'Clube da Leela na Beira-Mar.'
    );
  });

  it('alcança nome escondido em mapa denormalizado', () => {
    const inv = [
      ...mundo(),
      doc('platform/rollups', { tenants: { 'leela-tenant': { nome: 'Castelo Produções' } } }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    const op = p.operacoes.find((o) => o.caminho === 'platform/rollups');
    expect(op?.tipo === 'editar' && op.mudancas['tenants.leela-tenant.nome']).toBe('Leela');
  });
});

describe('planejarLimpeza · órfãos', () => {
  it('não prevê nenhum órfão no mundo bem formado', () => {
    expect(planejarLimpeza(mundo(), ALVO).orfaosPrevistos).toEqual([]);
  });

  it('denuncia sobrevivente que continua apontando para evento morto', () => {
    const inv = [...mundo(), doc('clubes/c1', { tenantId: 'leela-tenant', eventoVinculadoId: 'evento-morre' })];
    const p = planejarLimpeza(inv, ALVO);
    // O clube pertence ao evento condenado pelo campo, logo ele MORRE — e por
    // isso não sobra órfão. É o comportamento que queremos travar.
    expect(caminhos(p, 'apagar')).toContain('clubes/c1');
    expect(p.orfaosPrevistos).toEqual([]);
  });

  it('denuncia órfão quando o ponteiro está num campo que não é de evento', () => {
    const inv = [...mundo(), doc('platform/config', { destaque: 'evento-morre' })];
    const p = planejarLimpeza(inv, ALVO);
    expect(p.orfaosPrevistos).toContainEqual({
      caminho: 'platform/config',
      campo: 'destaque',
      valor: 'evento-morre',
    });
  });
});

describe('planejarLimpeza · chave de mapa que é o id do condenado', () => {
  it('poda a entrada do tenant morto no rollup e preserva a do vivo', () => {
    const inv = [
      ...mundo(),
      doc('platform/rollups', {
        gmvTotal: 100,
        tenants: {
          'leela-tenant': { tenantId: 'leela-tenant', nome: 'Castelo Produções', gmv: 60 },
          'tenant-vazio': { tenantId: 'tenant-vazio', nome: 'Some Aí', gmv: 40 },
        },
      }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    const op = p.operacoes.find(
      (o) => o.caminho === 'platform/rollups' && o.motivo.includes('chave de entidade condenada')
    );
    const tenants = op?.tipo === 'editar' ? (op.mudancas['tenants'] as Record<string, unknown>) : {};
    expect(Object.keys(tenants)).toEqual(['leela-tenant']);
    // O irmão que fica não pode ser perdido na poda.
    expect((tenants['leela-tenant'] as Record<string, unknown>)['gmv']).toBe(60);
  });

  it('não sobra órfão depois da poda — a varredura olha o estado pós-plano', () => {
    const inv = [
      ...mundo(),
      doc('platform/rollups', {
        tenants: { 'tenant-vazio': { tenantId: 'tenant-vazio', nome: 'Some Aí' } },
      }),
    ];
    expect(planejarLimpeza(inv, ALVO).orfaosPrevistos).toEqual([]);
  });
});

describe('planejarLimpeza · contas', () => {
  it('nunca lista uma identidade protegida como conta sem lastro', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    expect(p.contasSemLastro).not.toContain('uid-dono');
  });

  it('aponta a conta de semente que perdeu o último vínculo', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    expect(p.contasSemLastro).toContain('uid-semente');
  });

  it('não apaga conta nenhuma — contas são decisão do dono', () => {
    const p = planejarLimpeza(mundo(), ALVO);
    expect(caminhos(p, 'apagar').filter((c) => c.startsWith('atletas/'))).toEqual([]);
  });
});

describe('referenciasA · casa valor, não nome de campo', () => {
  it('acha ponteiro dentro de mapa dinâmico e de lista', () => {
    const achados = referenciasA(
      {
        inscricoes: { 'x_y': { eventoId: 'evento-morre' } },
        transicoes: [{ por: 'evento-morre' }],
      },
      new Set(['evento-morre'])
    );
    expect(achados.map((a) => a.campo).sort()).toEqual([
      'inscricoes.x_y.eventoId',
      'transicoes[0].por',
    ]);
  });
});

describe('planejarLimpeza · não contamina o que recebeu', () => {
  // Regressão: a simulação de órfãos enxertava no documento o MESMO objeto que
  // a operação carregava e depois escrevia dentro dele. O plano passava a
  // mentir sobre si mesmo — e o --apply mandaria um corpo que ninguém revisou.
  it('não muta o inventário de entrada', () => {
    const inv = [
      ...mundo(),
      doc('platform/rollups', {
        tenants: {
          'leela-tenant': { tenantId: 'leela-tenant', nome: 'Castelo Produções' },
          'tenant-vazio': { tenantId: 'tenant-vazio', nome: 'Some Aí' },
        },
      }),
    ];
    const antes = JSON.stringify(inv);
    planejarLimpeza(inv, ALVO);
    expect(JSON.stringify(inv)).toBe(antes);
  });

  it('a poda não carrega o nome já trocado pela edição seguinte', () => {
    const inv = [
      ...mundo(),
      doc('platform/rollups', {
        tenants: {
          'leela-tenant': { tenantId: 'leela-tenant', nome: 'Castelo Produções' },
          'tenant-vazio': { tenantId: 'tenant-vazio', nome: 'Some Aí' },
        },
      }),
    ];
    const p = planejarLimpeza(inv, ALVO);
    const poda = p.operacoes.find(
      (o) => o.caminho === 'platform/rollups' && o.motivo.includes('chave de entidade condenada')
    );
    const tenants = poda?.tipo === 'editar' ? (poda.mudancas['tenants'] as Record<string, unknown>) : {};
    // A poda é uma operação só sobre chaves: ela não decide nome.
    expect((tenants['leela-tenant'] as Record<string, unknown>)['nome']).toBe('Castelo Produções');
  });
});

describe('planejarLimpeza · determinismo', () => {
  it('mesma entrada produz exatamente o mesmo plano, na mesma ordem', () => {
    const a = planejarLimpeza(mundo(), ALVO);
    const b = planejarLimpeza([...mundo()].reverse(), ALVO);
    expect(a.operacoes).toEqual(b.operacoes);
  });
});
