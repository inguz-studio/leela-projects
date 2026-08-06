// =============================================================================
// Teste do LAÇO DO RUNNER — não do planejador.
//
// A rodada 2 da review antagonista foi explícita: "a metade consertada é a que
// estava testada". O checkpoint, a chave da operação e a retomada viviam
// dentro de `main()`, num arquivo de `scripts/` que o vitest nem coleta, e
// nenhum teste mencionava `checkpoint`, `chaveDaOp`, `--retomar` ou
// `digitalDoPlano`. Este arquivo cobre exatamente esse buraco.
//
// O protocolo é sempre o mesmo, e é o que a review exigiu: aplicar
// parcialmente, matar o processo num ponto arbitrário, retomar até o fim, e
// conferir que a SOMA das duas rodadas é o plano — sem faltar nada e sem
// repetir o que importa. Rodado em TODOS os cortes possíveis, e não numa
// amostra.
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  ORDEM,
  aplicarMudancas,
  planejarLimpeza,
  type AlvoLimpeza,
  type DocInventario,
  type Operacao,
} from '../limpeza/planoLimpeza';
import { chaveDaOp, digitalDoPlano, executarPlano, validarReguaDoBackup } from '../limpeza/execucaoLimpeza';
import { chaveDaOpAntiga, executarPlanoAntigo } from './fixtures/execucaoLimpeza.73e2c593';

const ALVO: AlvoLimpeza = {
  tenantsMantidos: ['leela-tenant'],
  eventosMantidos: ['evento-fica'],
  eventosCondenados: ['evento-morre'],
  tenantsCondenados: ['tenant-morto'],
  uidsProtegidos: ['uid-dono'],
  nomeNovo: 'Leela',
  nomeAntigo: 'Castelo Produções',
  linksARemover: ['instagram.com/casteloproducoes', 'castelo-producoes.example.com'],
};

const doc = (caminho: string, campos: Record<string, unknown> = {}): DocInventario => ({ caminho, campos });

/**
 * Mundo com a FORMA do plano real: onze grupos de ordem e — o que importa
 * aqui — os DOIS pares de operações que dividem `tipo:caminho`:
 *
 *   editar:perfis/castelo     nome (Passo 4) + linksExternos (Passo 4b)
 *   editar:platform/rollups   poda de chave (Passo 3b) + nome (Passo 4)
 */
function mundo(): DocInventario[] {
  return [
    doc('eventos/evento-morre', { tenantId: 'leela-tenant', status: 'encerrado' }),
    doc('eventos/evento-fica', { tenantId: 'leela-tenant', status: 'publicado' }),
    doc('eventos/evento-morre/comunicacoes/c1', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/inscritos/i1', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/inscritos/i1/saude/config', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/financeiro/current', { tenantId: 'leela-tenant' }),
    doc('pedidos/ped-morto', { tenantId: 'leela-tenant', eventoId: 'evento-morre', status: 'pago' }),
    doc('pedidoCodigos/JBA4X', { pedidoId: 'ped-morto' }),
    doc('clubes/clube-morto', { tenantId: 'tenant-morto' }),
    doc('clubes/clube-morto/desafios/d1', { tenantId: 'tenant-morto' }),
    doc('clubes/clube-morto/desafios/d1/acoes/correr', { acaoRef: 'correr' }),
    doc('tenants/tenant-morto', { nome: 'Some Aí' }),
    doc('tenants/tenant-morto/repasses/r1', { tenantId: 'tenant-morto' }),
    doc('perfis/castelo', {
      tenantId: 'leela-tenant',
      nome: 'Castelo Produções',
      linksExternos: [
        { label: 'Instagram', url: 'https://instagram.com/casteloproducoes' },
        { label: 'Site oficial', url: 'https://castelo-producoes.example.com' },
      ],
    }),
    doc('platform/rollups', {
      gmvTotal: 200,
      receitaLeelaTotal: 20,
      tenantsAtivos: 2,
      tenants: {
        'leela-tenant': { nome: 'Castelo Produções', status: 'ativo', gmv: 120, receitaLeela: 12, eventosAtivos: 9 },
        'tenant-morto': { nome: 'Some Aí', status: 'ativo', gmv: 80, receitaLeela: 8, eventosAtivos: 3 },
      },
    }),
    { caminho: 'profissionais/uid-semente', campos: {}, fantasma: true },
    doc('profissionais/uid-semente/dashboard/current', { eventoEmRisco: { slug: 'evento-morre' } }),
    doc('atletas/uid-dono', { nome: 'Dono' }),
  ];
}

// ── Um banco de mentira, com a mesma semântica do Firestore ──────────────────
class Banco {
  private readonly docs = new Map<string, Record<string, unknown>>();

  constructor(inv: readonly DocInventario[]) {
    for (const d of inv) if (d.fantasma !== true) this.docs.set(d.caminho, { ...d.campos });
  }

  /** DELETE de documento ausente devolve 200 no Firestore. Aqui, no-op. */
  apagar = async (caminho: string): Promise<void> => {
    this.docs.delete(caminho);
  };

  editar = async (caminho: string, mudancas: Readonly<Record<string, unknown>>): Promise<void> => {
    this.docs.set(caminho, aplicarMudancas(this.docs.get(caminho) ?? {}, mudancas));
  };

  retrato(): string {
    return JSON.stringify([...this.docs.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }
}

/** Efeitos que MORREM depois de `limite` escritas — a queda do processo. */
class QuedaProgramada extends Error {}

function efeitosQueCaem(banco: Banco, checkpoint: string[], limite: number, boundaries: number[] = []) {
  let escritas = 0;
  const talvezCair = (): void => {
    escritas += 1;
    if (escritas > limite) throw new QuedaProgramada('queda programada');
  };
  return {
    apagar: async (c: string) => {
      talvezCair();
      await banco.apagar(c);
    },
    editar: async (c: string, m: Readonly<Record<string, unknown>>) => {
      talvezCair();
      await banco.editar(c, m);
    },
    registrarFeita: (chave: string) => checkpoint.push(chave),
    drenar: async (de: number) => {
      boundaries.push(de);
    },
  };
}

const plano = planejarLimpeza(mundo(), ALVO);
const OPS = plano.operacoes;
const todasAsChaves = OPS.map((op, i) => chaveDaOp(op, i));

describe('o mundo de teste reproduz a forma do plano real', () => {
  it('tem os dois pares que dividem `tipo:caminho`', () => {
    const porChaveAntiga = new Map<string, number>();
    for (const op of OPS) porChaveAntiga.set(chaveDaOpAntiga(op), (porChaveAntiga.get(chaveDaOpAntiga(op)) ?? 0) + 1);
    const colididas = [...porChaveAntiga.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    expect(colididas.sort()).toEqual(['editar:perfis/castelo', 'editar:platform/rollups']);
  });

  it('cobre vários grupos de ordem, incluindo o dos fantasmas', () => {
    const ordens = [...new Set(OPS.map((o) => o.ordem))];
    expect(ordens.length).toBeGreaterThanOrEqual(8);
    expect(ordens).toContain(ORDEM.EVENTO);
    expect(ordens).toContain(ORDEM.FANTASMAS);
  });
});

// ===========================================================================
// [R3/F3] A chave de checkpoint tem de ser única por OPERAÇÃO
// ===========================================================================
describe('[R3] chave de checkpoint', () => {
  it('a chave nova é única para as 100% das operações', () => {
    expect(new Set(todasAsChaves).size).toBe(OPS.length);
  });

  it('ANTIGO falha: a chave antiga colide e o plano tem menos chaves que operações', () => {
    const antigas = new Set(OPS.map(chaveDaOpAntiga));
    expect(antigas.size).toBeLessThan(OPS.length);
  });

  it('a chave carrega o índice, e por isso é estável só contra o plano congelado', () => {
    const op = OPS[3] as Operacao;
    expect(chaveDaOp(op, 3)).toBe(`3:${op.tipo}:${op.caminho}`);
    expect(chaveDaOp(op, 4)).not.toBe(chaveDaOp(op, 3));
  });
});

// ===========================================================================
// [R2/F2] Queda em QUALQUER ponto, retomada até o fim, soma exata
// ===========================================================================
describe('[R2] retomada a partir do plano congelado', () => {
  /** Roda até cair, retoma, devolve o que aconteceu nas duas rodadas. */
  async function duasRodadas(corte: number): Promise<{ chaves: string[]; retrato: string }> {
    const banco = new Banco(mundo());
    const checkpoint: string[] = [];

    try {
      await executarPlano(OPS, new Set(), efeitosQueCaem(banco, checkpoint, corte));
    } catch (e) {
      if (!(e instanceof QuedaProgramada)) throw e;
    }
    const rodada1 = [...checkpoint];

    // A RETOMADA relê o plano CONGELADO — as mesmas `OPS`, o mesmo arquivo.
    // Não replaneja nada a partir do banco meio apagado.
    const r2 = await executarPlano(OPS, new Set(checkpoint), efeitosQueCaem(banco, checkpoint, Infinity));
    return { chaves: [...rodada1, ...r2.chavesAplicadas], retrato: banco.retrato() };
  }

  const semQueda = (async () => {
    const banco = new Banco(mundo());
    const cp: string[] = [];
    await executarPlano(OPS, new Set(), efeitosQueCaem(banco, cp, Infinity));
    return banco.retrato();
  })();

  it('a soma das duas rodadas é EXATAMENTE o plano, em todos os cortes', async () => {
    const alvo = await semQueda;
    for (let corte = 0; corte <= OPS.length; corte += 1) {
      const { chaves, retrato } = await duasRodadas(corte);
      expect(new Set(chaves).size, `corte ${corte}: chave repetida`).toBe(chaves.length);
      expect([...chaves].sort(), `corte ${corte}: sobrou ou faltou operação`).toEqual([...todasAsChaves].sort());
      expect(retrato, `corte ${corte}: o banco final divergiu da corrida sem queda`).toBe(alvo);
    }
  });

  it('cortando em TODOS os limites de grupo de ordem, o resultado é o mesmo', async () => {
    const alvo = await semQueda;
    const limites = OPS.map((op, i) => (i > 0 && op.ordem !== (OPS[i - 1] as Operacao).ordem ? i : -1)).filter(
      (i) => i >= 0
    );
    expect(limites.length).toBeGreaterThanOrEqual(7);
    for (const corte of limites) {
      const { chaves, retrato } = await duasRodadas(corte);
      expect([...chaves].sort(), `limite de grupo em ${corte}`).toEqual([...todasAsChaves].sort());
      expect(retrato, `limite de grupo em ${corte}`).toBe(alvo);
    }
  });

  it('ANTIGO falha: cortando ENTRE as duas operações de mesma chave, uma nunca roda', async () => {
    // Onde estão os dois pares.
    const paresColididos = OPS.map((op, i) => [chaveDaOpAntiga(op), i] as const).filter(
      ([k], _, todos) => todos.filter(([k2]) => k2 === k).length > 1
    );
    const cortesFeios = [...new Set(paresColididos.map(([, i]) => i))].slice(0, -1);
    expect(cortesFeios.length).toBeGreaterThan(0);

    let perdidas = 0;
    for (const corte of cortesFeios) {
      const banco = new Banco(mundo());
      const checkpoint: string[] = [];
      const executadas: string[] = [];
      const grava = (chave: string): void => {
        checkpoint.push(chave);
        executadas.push(chave);
      };
      let n = 0;
      try {
        await executarPlanoAntigo(OPS, new Set(), {
          apagar: async (c) => {
            n += 1;
            if (n > corte + 1) throw new QuedaProgramada('queda');
            await banco.apagar(c);
          },
          editar: async (c, m) => {
            n += 1;
            if (n > corte + 1) throw new QuedaProgramada('queda');
            await banco.editar(c, m);
          },
          registrarFeita: grava,
        });
      } catch (e) {
        if (!(e instanceof QuedaProgramada)) throw e;
      }
      await executarPlanoAntigo(OPS, new Set(checkpoint), {
        apagar: banco.apagar,
        editar: banco.editar,
        registrarFeita: grava,
      });
      if (executadas.length < OPS.length) perdidas += 1;
    }
    expect(perdidas, 'a chave antiga deveria PERDER operação em pelo menos um corte').toBeGreaterThan(0);
  });

  it('ANTIGO falha por outro caminho: replanejar do banco parcial diverge SEMPRE', () => {
    // É o R2 inteiro: o `--apply` relia produção, replanejava e comparava a
    // digital. Num banco meio apagado o replanejamento produz menos operações
    // e o portão mata o processo ANTES de ele chegar a ler o checkpoint.
    const digitalAprovada = digitalDoPlano(plano);
    let divergiram = 0;
    for (let corte = 1; corte < OPS.length; corte += 1) {
      const banco = new Banco(mundo());
      for (const op of OPS.slice(0, corte)) {
        if (op.tipo === 'apagar') void banco.apagar(op.caminho);
      }
      const inventarioParcial = mundo().filter(
        (d) => !OPS.slice(0, corte).some((o) => o.tipo === 'apagar' && o.caminho === d.caminho)
      );
      if (digitalDoPlano(planejarLimpeza(inventarioParcial, ALVO)) !== digitalAprovada) divergiram += 1;
    }
    expect(divergiram, 'o replanejamento deveria divergir na esmagadora maioria dos cortes').toBeGreaterThan(
      OPS.length / 2
    );
  });
});

// ===========================================================================
// Drenagem: existe, e só quando o grupo anterior escreveu de verdade
// ===========================================================================
describe('drenagem entre grupos', () => {
  it('drena uma vez por limite de grupo numa corrida inteira', async () => {
    const banco = new Banco(mundo());
    const cp: string[] = [];
    const limites: number[] = [];
    await executarPlano(OPS, new Set(), efeitosQueCaem(banco, cp, Infinity, limites));
    const gruposDistintos = new Set(OPS.map((o) => o.ordem)).size;
    expect(limites.length).toBe(gruposDistintos - 1);
  });

  it('não drena grupo que a retomada apenas pulou — minuto de janela não se queima à toa', async () => {
    const banco = new Banco(mundo());
    const cp: string[] = [];
    const limites: number[] = [];
    // Tudo já feito, menos a última operação.
    const feitas = new Set(todasAsChaves.slice(0, -1));
    await executarPlano(OPS, feitas, efeitosQueCaem(banco, cp, Infinity, limites));
    expect(limites).toEqual([]);
  });
});

// ===========================================================================
// [R4/F5] O portão do `--backup` com régua temporal
// ===========================================================================
describe('[R4] régua do backup', () => {
  // Os dois exports que existem de verdade no bucket, e o instante da
  // transferência de titularidade entre eles. É este par que o gate anterior
  // não sabia distinguir: o primeiro PASSAVA, e restaurar por ele desfaria a
  // transferência, trancando o dono fora do painel.
  const EXPORT_ANTES = '2026-08-06T13:45:46Z';
  const EXPORT_DEPOIS = '2026-08-06T15:02:29Z';
  const TRANSFERENCIA = '2026-08-06T14:22:39Z';
  const agora = Date.parse('2026-08-06T16:00:00Z');

  it('RECUSA o export de 13:45, anterior à transferência de titularidade', () => {
    expect(() =>
      validarReguaDoBackup({ tirado: EXPORT_ANTES, minimo: TRANSFERENCIA, agora, idadeMaximaMin: 180 })
    ).toThrow(/ANTERIOR ao mínimo/);
  });

  it('ACEITA o export de 15:02, posterior a ela', () => {
    expect(() =>
      validarReguaDoBackup({ tirado: EXPORT_DEPOIS, minimo: TRANSFERENCIA, agora, idadeMaximaMin: 180 })
    ).not.toThrow();
  });

  it('RECUSA export velho demais, mesmo sendo posterior ao mínimo', () => {
    expect(() =>
      validarReguaDoBackup({ tirado: EXPORT_DEPOIS, minimo: TRANSFERENCIA, agora, idadeMaximaMin: 30 })
    ).toThrow(/acima do teto/);
  });

  it('RECUSA instante ilegível e instante no futuro', () => {
    expect(() => validarReguaDoBackup({ tirado: 'x', minimo: TRANSFERENCIA, agora, idadeMaximaMin: 180 })).toThrow(
      /ilegível/
    );
    expect(() =>
      validarReguaDoBackup({
        tirado: '2026-08-06T18:00:00Z',
        minimo: TRANSFERENCIA,
        agora,
        idadeMaximaMin: 180,
      })
    ).toThrow(/FUTURO/);
  });
});
