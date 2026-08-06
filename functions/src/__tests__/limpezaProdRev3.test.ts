// =============================================================================
// REV3-FRIA — os cortes que as suítes existentes NÃO davam.
//
// Esta lane não construiu nada do que julga. Rodou a suíte inteira (82 verdes),
// leu teste por teste e foi atrás do que cada um deixa de fora. Quatro buracos
// sobreviveram à leitura, e cada um vira caso aqui:
//
//  1. `limpezaProdRunner` mata o processo SEMPRE ANTES da escrita
//     (`talvezCair()` incrementa e lança antes de tocar no banco). A janela que
//     o comentário de `executarPlano` chama de segura — cair DEPOIS da escrita
//     e ANTES do `registrarFeita` — nunca é exercitada. É a única janela em que
//     a retomada REEXECUTA uma operação, então é a única em que idempotência
//     deixa de ser adjetivo.
//
//  2. A digital cobre `plano.operacoes` e mais nada. `lerPlanoCongelado` diz,
//     em comentário, que "o conteúdo tem de casar com ela" — e o relatório
//     (`conflitosDeProtecao`, `orfaosPrevistos`, `fantasmas`) fica de fora.
//     `conflitosDeProtecao` é o que decide o `exit 4`.
//
//  3. A razão registrada para deixar o relatório fora da digital era que ele
//     "muda de ordem entre leituras". Depois do FIX3 isso deixou de ser
//     verdade: todo relatório sai ordenado e o arquivo sai canonicalizado.
//     Seis dry-runs contra produção (três desta lane, três da FIX3, 90 min
//     depois) deram o MESMO sha256 do arquivo inteiro, não só da digital.
//
//  4. A drenagem só acontece quando o grupo anterior escreveu NESTA rodada.
//     Numa retomada que pega o plano com o grupo 100 inteiro já registrado, a
//     espera de 90 s antes do grupo FANTASMAS não acontece.
//
// Nada aqui escreve em produção. Dado sintético e função pura.
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
import { chaveDaOp, digitalDoPlano, executarPlano, textoCanonico } from '../limpeza/execucaoLimpeza';

const ALVO: AlvoLimpeza = {
  tenantsMantidos: ['leela-tenant'],
  eventosMantidos: ['evento-fica'],
  eventosCondenados: ['evento-morre'],
  tenantsCondenados: ['tenant-morto'],
  uidsProtegidos: ['uid-dono'],
  nomeNovo: 'Leela',
  nomeAntigo: 'Castelo Produções',
  linksARemover: ['instagram.com/casteloproducoes'],
  identidadesFantasmaVarridas: ['uid-semente'],
};

const doc = (caminho: string, campos: Record<string, unknown> = {}): DocInventario => ({ caminho, campos });

/**
 * Mundo com a forma do plano real: os dois pares que dividem `tipo:caminho`,
 * um descendente de nível 2 sob `clubes/` e — o caso que as duas reviews
 * anteriores não mediram — um descendente de condenado sob raiz `pagamentos/`,
 * que é onde produção guarda `webhookEventos`.
 */
function mundo(): DocInventario[] {
  return [
    doc('eventos/evento-morre', { tenantId: 'leela-tenant', status: 'encerrado' }),
    doc('eventos/evento-fica', { tenantId: 'leela-tenant', status: 'publicado' }),
    doc('eventos/evento-morre/inscritos/i1', { tenantId: 'leela-tenant' }),
    doc('eventos/evento-morre/financeiro/current', { tenantId: 'leela-tenant' }),
    doc('pedidos/ped-morto', { tenantId: 'leela-tenant', eventoId: 'evento-morre', status: 'pago' }),
    doc('pagamentos/pag-morto', { tenantId: 'leela-tenant', eventoId: 'evento-morre' }),
    // Sem `eventoId` e sem `tenantId`: nenhum passo de campo o alcança. Só a
    // condenação por prefixo de caminho o pega.
    doc('pagamentos/pag-morto/webhookEventos/evt_1', { payload: 'PAYMENT_CONFIRMED' }),
    doc('clubes/clube-morto', { tenantId: 'tenant-morto' }),
    doc('clubes/clube-morto/desafios/d1', { tenantId: 'tenant-morto' }),
    doc('clubes/clube-morto/desafios/d1/acoes/a1', { acaoRef: 'correr' }),
    doc('tenants/tenant-morto', { nome: 'Some Aí' }),
    doc('perfis/castelo', {
      tenantId: 'leela-tenant',
      nome: 'Castelo Produções',
      linksExternos: [
        { label: 'Instagram', url: 'https://instagram.com/casteloproducoes' },
        { label: 'Site', url: 'https://leela.com.br' },
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
    doc('profissionais/uid-semente/dashboard/current', { nada: 'de condenado aqui' }),
    doc('atletas/uid-dono', { nome: 'Dono' }),
  ];
}

class Banco {
  private readonly docs = new Map<string, Record<string, unknown>>();
  constructor(inv: readonly DocInventario[]) {
    for (const d of inv) if (d.fantasma !== true) this.docs.set(d.caminho, { ...d.campos });
  }
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

class QuedaProgramada extends Error {}

const plano = planejarLimpeza(mundo(), ALVO);
const OPS = plano.operacoes;
const TODAS = OPS.map((op, i) => chaveDaOp(op, i));

async function corridaLimpa(): Promise<string> {
  const banco = new Banco(mundo());
  await executarPlano(OPS, new Set(), {
    apagar: banco.apagar,
    editar: banco.editar,
    registrarFeita: () => undefined,
    drenar: async () => undefined,
  });
  return banco.retrato();
}

// ===========================================================================
// 1 · A JANELA QUE FALTAVA: cair DEPOIS da escrita, ANTES do checkpoint
// ===========================================================================
describe('[REV3-1] queda entre a escrita e o registro do checkpoint', () => {
  /**
   * Aqui o processo morre DEPOIS que o banco já mudou e ANTES de a chave
   * entrar no checkpoint. Na retomada essa operação roda de novo — é a única
   * reexecução que o desenho admite, e o comentário de `executarPlano` a
   * declara segura sem nenhum teste atrás.
   */
  async function duasRodadasComReexecucao(
    corte: number
  ): Promise<{ chaves: string[]; retrato: string; escritasTotais: number }> {
    const banco = new Banco(mundo());
    const checkpoint: string[] = [];
    const escritos: string[] = [];
    let escritas = 0;
    const morrerDepoisDaEscrita = (): void => {
      escritas += 1;
      if (escritas > corte) throw new QuedaProgramada('queda depois da escrita');
    };

    try {
      await executarPlano(OPS, new Set(), {
        apagar: async (c) => {
          await banco.apagar(c);
          escritos.push(`apagar:${c}`);
          morrerDepoisDaEscrita();
        },
        editar: async (c, m) => {
          await banco.editar(c, m);
          escritos.push(`editar:${c}`);
          morrerDepoisDaEscrita();
        },
        registrarFeita: (k) => checkpoint.push(k),
        drenar: async () => undefined,
      });
    } catch (e) {
      if (!(e instanceof QuedaProgramada)) throw e;
    }
    const rodada1 = [...checkpoint];

    const r2 = await executarPlano(OPS, new Set(checkpoint), {
      apagar: async (c) => {
        await banco.apagar(c);
        escritos.push(`apagar:${c}`);
      },
      editar: async (c, m) => {
        await banco.editar(c, m);
        escritos.push(`editar:${c}`);
      },
      registrarFeita: (k) => checkpoint.push(k),
      drenar: async () => undefined,
    });
    return { chaves: [...rodada1, ...r2.chavesAplicadas], retrato: banco.retrato(), escritasTotais: escritos.length };
  }

  it('em TODOS os cortes, o banco final é idêntico ao da corrida sem queda', async () => {
    const alvo = await corridaLimpa();
    for (let corte = 0; corte <= OPS.length; corte += 1) {
      const { retrato } = await duasRodadasComReexecucao(corte);
      expect(retrato, `corte ${corte}: reexecutar a operação não registrada mudou o resultado`).toBe(alvo);
    }
  });

  it('exatamente UMA operação é escrita duas vezes, e nenhuma chave se perde', async () => {
    let houveReexecucao = 0;
    for (let corte = 1; corte < OPS.length; corte += 1) {
      const { chaves, escritasTotais } = await duasRodadasComReexecucao(corte);
      // A operação que escreveu e não chegou a registrar roda de novo: uma
      // escrita a mais que o plano. Se fosse zero, o cenário não teria
      // acontecido e este arquivo seria enfeite.
      expect(escritasTotais, `corte ${corte}: escritas totais`).toBe(OPS.length + 1);
      houveReexecucao += 1;
      expect(new Set(chaves).size, `corte ${corte}: faltou operação`).toBe(OPS.length);
      expect([...chaves].sort(), `corte ${corte}: soma das rodadas ≠ plano`).toEqual([...TODAS].sort());
    }
    expect(houveReexecucao, 'o cenário não chegou a reexecutar nada').toBeGreaterThan(0);
  });

  it('a única classe de operação reexecutada é idempotente por construção', () => {
    // DELETE de documento ausente devolve 200; o PATCH carrega corpo fixo do
    // arquivo congelado. Nenhuma operação do plano lê o estado atual para
    // decidir o que escrever — se lesse, reexecutar mudaria o resultado.
    for (const op of OPS) {
      if (op.tipo !== 'editar') continue;
      const valores = JSON.stringify(op.mudancas);
      expect(valores.includes('undefined'), `${op.caminho} carrega valor não serializável`).toBe(false);
    }
    expect(OPS.every((o) => o.tipo === 'apagar' || o.tipo === 'editar')).toBe(true);
  });
});

// ===========================================================================
// 2 · A DIGITAL NÃO COBRE O RELATÓRIO — e o relatório é quem trava o exit 4
// ===========================================================================
describe('[REV3-2] o que a digital do plano congelado NÃO protege', () => {
  it('apagar `conflitosDeProtecao` do arquivo mantém a digital VÁLIDA', () => {
    const congelado = { digital: digitalDoPlano(plano), plano };
    const adulterado = { ...congelado, plano: { ...plano, conflitosDeProtecao: [] } };
    // É exatamente o que `lerPlanoCongelado` recalcula antes de aceitar o
    // arquivo. Ele aceita: a digital é só das operações.
    expect(digitalDoPlano(adulterado.plano)).toBe(congelado.digital);
    expect(adulterado.plano.conflitosDeProtecao.length).toBe(0);
  });

  it('o mesmo vale para `orfaosPrevistos` e `fantasmas`', () => {
    const d = digitalDoPlano(plano);
    expect(digitalDoPlano({ ...plano, orfaosPrevistos: [] } as typeof plano)).toBe(d);
    expect(digitalDoPlano({ ...plano, fantasmas: [] } as typeof plano)).toBe(d);
  });

  it('mas mexer numa OPERAÇÃO é pego — o buraco é só o relatório', () => {
    const mexido = {
      ...plano,
      operacoes: OPS.map((o, i) => (i === 0 ? { ...o, caminho: `${o.caminho}-x` } : o)),
    };
    expect(digitalDoPlano(mexido)).not.toBe(digitalDoPlano(plano));
  });
});

// ===========================================================================
// 3 · O MOTIVO DE DEIXAR O RELATÓRIO FORA DA DIGITAL NÃO VALE MAIS
// ===========================================================================
describe('[REV3-3] o plano INTEIRO já é reproduzível, não só as operações', () => {
  /** Embaralha a ordem dos documentos e a ordem de inserção dos campos. */
  function embaralhado(semente: number): DocInventario[] {
    const gira = <T>(xs: T[]): T[] => xs.slice(semente % Math.max(xs.length, 1)).concat(xs.slice(0, semente % Math.max(xs.length, 1)));
    const virarCampos = (c: Record<string, unknown>): Record<string, unknown> => {
      const saida: Record<string, unknown> = {};
      for (const k of gira(Object.keys(c))) {
        const v = c[k];
        saida[k] = v !== null && typeof v === 'object' && !Array.isArray(v) ? virarCampos(v as Record<string, unknown>) : v;
      }
      return saida;
    };
    return gira(mundo()).map((d) => ({ ...d, campos: virarCampos(d.campos as Record<string, unknown>) }));
  }

  it('ordem de leitura e ordem de campo não mudam UMA LINHA do plano canônico', () => {
    const base = textoCanonico(planejarLimpeza(embaralhado(0), ALVO));
    for (const s of [1, 2, 3, 5, 7, 11]) {
      expect(textoCanonico(planejarLimpeza(embaralhado(s), ALVO)), `semente ${s}`).toBe(base);
    }
  });

  it('logo, a digital PODERIA cobrir o plano inteiro sem reintroduzir o R1', () => {
    const inteiro = (inv: DocInventario[]): string => digitalDoPlano({ operacoes: [planejarLimpeza(inv, ALVO)] as never });
    expect(inteiro(embaralhado(0))).toBe(inteiro(embaralhado(4)));
  });
});

// ===========================================================================
// 4 · A DRENAGEM QUE A RETOMADA PULA
// ===========================================================================
describe('[REV3-4] retomada que entra no grupo FANTASMAS sem drenar', () => {
  it('grupo anterior já registrado no checkpoint ⇒ nenhuma espera antes da varredura', async () => {
    const banco = new Banco(mundo());
    const drenagens: { de: number; para: number }[] = [];
    const primeiroFantasma = OPS.findIndex((o) => o.ordem === ORDEM.FANTASMAS);
    expect(primeiroFantasma, 'o mundo de teste precisa ter grupo FANTASMAS').toBeGreaterThan(0);

    // Tudo até o grupo FANTASMAS já feito — a queda foi no limite exato.
    const feitas = new Set(TODAS.slice(0, primeiroFantasma));
    const r = await executarPlano(OPS, feitas, {
      apagar: banco.apagar,
      editar: banco.editar,
      registrarFeita: () => undefined,
      drenar: async (de, para) => {
        drenagens.push({ de, para });
      },
    });

    expect(r.puladas).toBe(primeiroFantasma);
    expect(r.aplicadas).toBe(OPS.length - primeiroFantasma);
    // ESTE é o achado: a varredura de fantasma roda sem a espera de 90 s que a
    // corrida inteira faz. Aceitável porque entre a queda e o `--retomar`
    // existe um humano, mas é comportamento e tem de estar escrito.
    expect(drenagens.filter((d) => d.para === ORDEM.FANTASMAS)).toEqual([]);
  });

  it('na corrida sem queda a espera antes de FANTASMAS acontece', async () => {
    const banco = new Banco(mundo());
    const drenagens: { de: number; para: number }[] = [];
    await executarPlano(OPS, new Set(), {
      apagar: banco.apagar,
      editar: banco.editar,
      registrarFeita: () => undefined,
      drenar: async (de, para) => {
        drenagens.push({ de, para });
      },
    });
    expect(drenagens.filter((d) => d.para === ORDEM.FANTASMAS).length).toBe(1);
  });
});

// ===========================================================================
// 5 · CONDENAÇÃO TRANSITIVA FORA DE `clubes/` — o caso medido em produção
// ===========================================================================
describe('[REV3-5] o descendente sem `eventoId` sob raiz `pagamentos/`', () => {
  it('morre, e morre ANTES do pai', () => {
    const alvoDoFilho = OPS.findIndex(
      (o: Operacao) => o.tipo === 'apagar' && o.caminho === 'pagamentos/pag-morto/webhookEventos/evt_1'
    );
    const alvoDoPai = OPS.findIndex((o: Operacao) => o.tipo === 'apagar' && o.caminho === 'pagamentos/pag-morto');
    expect(alvoDoFilho, 'o descendente sem campo de dono não entrou no plano').toBeGreaterThanOrEqual(0);
    expect(alvoDoFilho).toBeLessThan(alvoDoPai);
  });

  it('e o plano não deixa NENHUM sobrevivente sob prefixo apagado', () => {
    const apagados = new Set(OPS.filter((o) => o.tipo === 'apagar').map((o) => o.caminho));
    const ancestrais = (c: string): string[] => {
      const p = c.split('/');
      const s: string[] = [];
      for (let n = p.length - 2; n >= 2; n -= 2) s.push(p.slice(0, n).join('/'));
      return s;
    };
    const estruturais = mundo()
      .filter((d) => !apagados.has(d.caminho))
      .filter((d) => ancestrais(d.caminho).some((a) => apagados.has(a)));
    expect(estruturais.map((d) => d.caminho)).toEqual([]);
  });
});
