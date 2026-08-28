/**
 * modalidadesCore.test.ts — S316 · E04 · RN-578, RN-501, RN-502, RN-505
 * (a RN-500 foi REVOGADA pelo dono em 28/08 — V2708-25; a fronteira desceu do
 * evento para a modalidade, e nasceram os estados inativa/oculta)
 *
 * Duas metades:
 *
 * 1. O KERNEL PURO (`packages/core/src/eventos/modalidades.ts`) — as recusas
 *    que a tela e o servidor compartilham. Se este arquivo e a tela divergirem,
 *    o organizador vê uma mensagem e recebe outra.
 *
 * 2. O NÚCLEO DA FUNCTION contra dublês, sem emulator. Um dublê prova
 *    honestamente: a ORDEM das guardas, que a lista sai do DOCUMENTO e nunca do
 *    cliente (RN-505), que o acréscimo usa `arrayUnion`, que a renomeação emite
 *    as cinco escritas DENTRO de uma única transação (RN-501), e que a recusa
 *    da remoção NOMEIA quem impede (RN-502).
 *
 * ⚠️ O que o dublê NÃO prova, e por isso existe o irmão
 *    `editarModalidadesEvento.integration.test.ts`: a atomicidade REAL do
 *    Firestore (falha injetada no meio não deixa nada escrito). Aquela suíte
 *    **não foi executada nesta máquina**: `firebase-tools` 15 exige JDK 21+ e
 *    esta máquina tem JDK 17 — a mesma limitação declarada pela SERV1-BUILD.
 *    Ela roda no CI, que provisiona Java 21.
 */
import { describe, expect, it, vi } from 'vitest';
import { FieldValue } from 'firebase-admin/firestore';
import type * as admin from 'firebase-admin';
import {
  MODALIDADES_MAX,
  MODALIDADE_NOME_MAX,
  estadoModalidade,
  mensagemRecusaRemocao,
  modalidadesDaTela,
  modalidadesOfertaveis,
  msgModalidadeComVenda,
  msgModalidadeIndisponivel,
  normalizarNomeModalidade,
  validarAcrescentarModalidade,
  validarNomeModalidade,
  validarRemoverModalidade,
  validarRenomearModalidade,
  validarTransicaoModalidade,
  type AuthClaims,
} from '@leela/core';
import {
  editarModalidadesEventoCore,
  validarEditarModalidadesInput,
  TIPO_AUDITORIA_MODALIDADES,
} from '../eventos/editarModalidadesEvento';
import { AUDITORIA_ACESSOS_COL } from '../shared/auditoriaAcessos';

type Raw = Record<string, unknown>;

// ===========================================================================
// 1. Kernel puro
// ===========================================================================

describe('kernel de modalidades — normalização e nome', () => {
  it('apara as pontas e colapsa espaço interno', () => {
    expect(normalizarNomeModalidade('  Meia   maratona ')).toBe('Meia maratona');
  });

  it('NÃO faz casefold — "21K" e "21k" são nomes diferentes', () => {
    // A igualdade que vale é a do `modalidadeExisteNoEventoPai` das Rules, que
    // é comparação de string crua. Fazer casefold aqui deixaria a tela aceitar
    // o que o servidor recusa.
    expect(normalizarNomeModalidade('21K')).toBe('21K');
    expect(normalizarNomeModalidade('21K')).not.toBe(normalizarNomeModalidade('21k'));
  });

  it('recusa nome vazio, longo demais e com barra', () => {
    expect(validarNomeModalidade('   ')).toMatch(/não pode ficar vazio/);
    expect(validarNomeModalidade('x'.repeat(MODALIDADE_NOME_MAX + 1))).toMatch(
      new RegExp(String(MODALIDADE_NOME_MAX)),
    );
    expect(validarNomeModalidade('21k/meia')).toMatch(/"\/"/);
    expect(validarNomeModalidade('21k')).toBeNull();
  });
});

describe('kernel de modalidades — acrescentar (RN-578: sempre permitido)', () => {
  it('aceita nome novo e recusa nome já presente', () => {
    expect(validarAcrescentarModalidade(['5k', '10k'], '21k')).toBeNull();
    expect(validarAcrescentarModalidade(['5k', '10k'], ' 10k ')).toMatch(/já está na lista/);
  });

  it('recusa quando o teto de modalidades já foi atingido', () => {
    const cheia = Array.from({ length: MODALIDADES_MAX }, (_, i) => `m${i}`);
    expect(validarAcrescentarModalidade(cheia, 'mais uma')).toMatch(
      new RegExp(String(MODALIDADES_MAX)),
    );
  });
});

describe('kernel de modalidades — renomear (RN-501)', () => {
  it('aceita o rename honesto', () => {
    expect(validarRenomearModalidade(['5k', '21k'], '21k', 'Meia maratona')).toBeNull();
  });

  it('recusa renomear o que não está na lista', () => {
    expect(validarRenomearModalidade(['5k'], '21k', 'Meia')).toMatch(/não está na lista/);
  });

  it('recusa o nome igual ao atual (no-op disfarçado)', () => {
    expect(validarRenomearModalidade(['5k'], '5k', ' 5k ')).toMatch(/igual ao atual/);
  });

  it('recusa renomear PARA um nome já presente — isso é fusão, não rename', () => {
    const recusa = validarRenomearModalidade(['5k', '10k'], '5k', '10k');
    expect(recusa).toMatch(/já existe neste evento/);
    expect(recusa).toMatch(/mesma sequência de virada/);
  });
});

describe('kernel de modalidades — remover (RN-502)', () => {
  const vazio = { lotes: [], kits: [], campanhas: [] };

  it('passa quando ninguém aponta', () => {
    expect(validarRemoverModalidade(['5k', '21k'], '21k', vazio)).toBeNull();
  });

  it('a recusa NOMEIA cada lote, kit e campanha — nunca frase genérica', () => {
    const recusa = validarRemoverModalidade(['21k'], '21k', {
      lotes: ['Lote 1', 'Lote 2'],
      kits: ['Kit Prata'],
      campanhas: ['Lembrete 21k'],
    });
    expect(recusa).toContain('Lote 1');
    expect(recusa).toContain('Lote 2');
    expect(recusa).toContain('Kit Prata');
    expect(recusa).toContain('Lembrete 21k');
    expect(recusa).toContain('2 lotes');
    expect(recusa).toContain('1 kit');
    expect(recusa).toContain('1 campanha');
    // O que a mensagem NÃO pode ser.
    expect(recusa).not.toMatch(/falha ao salvar/i);
  });

  it('concorda o verbo no singular quando é um só', () => {
    expect(mensagemRecusaRemocao('21k', { lotes: ['Lote 1'], kits: [], campanhas: [] })).toContain(
      'aponta para ela',
    );
    expect(
      mensagemRecusaRemocao('21k', { lotes: ['L1', 'L2'], kits: [], campanhas: [] }),
    ).toContain('apontam para ela');
  });
});

describe('kernel de modalidades — estado da oferta (RN-578)', () => {
  it('ausente nos dois arrays = ativa (evento existente entra na regra sem migração)', () => {
    expect(estadoModalidade('5k', [], [])).toBe('ativa');
    expect(estadoModalidade('5k', ['5k'], [])).toBe('inativa');
    expect(estadoModalidade('5k', [], ['5k'])).toBe('oculta');
  });

  it('num doc corrompido com o nome nos DOIS arrays, oculta prevalece (fail-closed)', () => {
    expect(estadoModalidade('5k', ['5k'], ['5k'])).toBe('oculta');
  });

  it('a vitrine só oferta as ativas, na ordem do documento', () => {
    expect(modalidadesOfertaveis(['5k', '10k', '21k'], ['10k'], ['21k'])).toEqual(['5k']);
    expect(modalidadesOfertaveis(['5k', '10k'], [], [])).toEqual(['5k', '10k']);
  });

  it('a recusa do checkout usa UMA frase e não vaza o vocabulário interno', () => {
    const msg = msgModalidadeIndisponivel('10k');
    expect(msg).toMatch(/não está disponível para novas inscrições/);
    expect(msg).not.toMatch(/inativa|oculta/i);
  });

  it('transição exige a modalidade na lista', () => {
    expect(validarTransicaoModalidade(['5k'], '5k')).toBeNull();
    expect(validarTransicaoModalidade(['5k'], '21k')).toMatch(/não está na lista/);
  });
});

describe('kernel de modalidades — fronteira POR modalidade (RN-578)', () => {
  it('a recusa de renomear/remover modalidade vendida nomeia o caminho vivo', () => {
    const renomear = msgModalidadeComVenda('10k', 'renomear');
    const remover = msgModalidadeComVenda('10k', 'remover');
    expect(renomear).toMatch(/já tem inscrição registrada/);
    expect(renomear).toMatch(/PIX\s+pendente/);
    expect(renomear).toMatch(/renomeada/);
    expect(remover).toMatch(/removida/);
    expect(remover).toMatch(/inative/i);
  });
});

describe('kernel de modalidades — compat do acervo (S316-T4)', () => {
  it('a modalidade do evento aparece na ordem do documento', () => {
    expect(modalidadesDaTela(['5k', '10k'], ['5k'])).toEqual([
      { nome: '5k', orfa: false },
      { nome: '10k', orfa: false },
    ]);
  });

  it('lote cuja modalidade saiu da lista VOLTA a aparecer, marcado como órfã', () => {
    // Este é o defeito de compat que a tela antiga tinha: `lotes.filter(l =>
    // l.modalidade === m)` sobre `evento.modalidades` fazia o lote sumir sem
    // erro e sem aviso, com o preço dele ainda no documento.
    expect(modalidadesDaTela(['5k'], ['5k', '21k'])).toEqual([
      { nome: '5k', orfa: false },
      { nome: '21k', orfa: true },
    ]);
  });

  it('não duplica quando o mesmo nome órfão aparece em vários lotes', () => {
    expect(modalidadesDaTela([], ['21k', '21k', '5k'])).toEqual([
      { nome: '21k', orfa: true },
      { nome: '5k', orfa: true },
    ]);
  });
});

// ===========================================================================
// 2. Validação do input da Function
// ===========================================================================

describe('validarEditarModalidadesInput', () => {
  const base = { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '21k', motivo: 'typo' };

  it('aceita o input mínimo', () => {
    expect(validarEditarModalidadesInput(base)).toEqual([]);
  });

  it('rejeita eventoId com "/" — devolve invalid-argument honesto, não internal', () => {
    expect(validarEditarModalidadesInput({ ...base, eventoId: 'a/b' })).toContain(
      '"eventoId" é obrigatório (sem "/").',
    );
  });

  it('rejeita operação fora das seis', () => {
    expect(validarEditarModalidadesInput({ ...base, operacao: 'fundir' })).toContain(
      '"operacao" deve ser acrescentar, renomear, remover, inativar, ocultar ou reativar.',
    );
  });

  it('aceita as três operações de estado (RN-578)', () => {
    for (const operacao of ['inativar', 'ocultar', 'reativar']) {
      expect(validarEditarModalidadesInput({ ...base, operacao })).toEqual([]);
    }
  });

  it('exige novoNome em renomear', () => {
    expect(validarEditarModalidadesInput({ ...base, operacao: 'renomear' })).toContain(
      '"novoNome" é obrigatório em renomear.',
    );
  });

  it('motivo é OPCIONAL (V2708-26) — ausente e vazio passam; o teto continua', () => {
    const { motivo: _m, ...semMotivo } = base;
    expect(validarEditarModalidadesInput(semMotivo)).toEqual([]);
    expect(validarEditarModalidadesInput({ ...base, motivo: '' })).toEqual([]);
    expect(validarEditarModalidadesInput({ ...base, motivo: 'x'.repeat(501) }).join(' ')).toMatch(
      /excede 500/,
    );
    expect(validarEditarModalidadesInput({ ...base, motivo: 42 }).join(' ')).toMatch(
      /deve ser texto/,
    );
  });
});

// ===========================================================================
// 3. O núcleo contra dublês
// ===========================================================================

const OWNER: AuthClaims = { role: 'tenant_owner', tenantId: 'tn-1' } as AuthClaims;
const CALLER = { uid: 'uid-owner', claims: OWNER };

interface Escrita {
  path: string;
  patch: Raw;
}

interface Cenario {
  tenantStatus?: string;
  evento?: Raw | null;
  lotes?: { id: string; data: Raw }[];
  kits?: { id: string; data: Raw }[];
  campanhas?: { id: string; data: Raw }[];
  /** Inscritos do evento — a fronteira POR MODALIDADE (RN-578) os consulta. */
  inscritos?: { id: string; data: Raw }[];
}

interface Dubles {
  db: admin.firestore.Firestore;
  escritas: Escrita[];
  trilha: Raw[];
  /** Quantas transações foram abertas — a RN-501 exige exatamente UMA. */
  transacoes: number;
  /** Escritas que aconteceram FORA da transação (tem de ser zero). */
  escritasForaDaTransacao: number;
}

function montar(cenario: Cenario): Dubles {
  const escritas: Escrita[] = [];
  const trilha: Raw[] = [];
  const estado = { transacoes: 0, dentroDaTransacao: false, foraDaTransacao: 0 };

  const snapDe = (data: Raw | null | undefined, path: string) => ({
    exists: data !== null && data !== undefined,
    id: path.split('/').pop() ?? path,
    ref: { path },
    get: (campo: string) => data?.[campo],
  });

  function subcolecao(nome: string, docs: { id: string; data: Raw }[], eventoId: string) {
    return {
      where(campo: string, op: string, valor: unknown) {
        const casa = (d: { data: Raw }) => {
          const bruto = campo.includes('.')
            ? campo.split('.').reduce<unknown>((acc, k) => (acc as Raw | undefined)?.[k], d.data)
            : d.data[campo];
          if (op === 'array-contains') return Array.isArray(bruto) && bruto.includes(valor);
          return bruto === valor;
        };
        const casados = docs.filter(casa);
        const snapDos = (lista: { id: string; data: Raw }[]) => ({
          size: lista.length,
          docs: lista.map((d) => snapDe(d.data, `eventos/${eventoId}/${nome}/${d.id}`)),
        });
        return {
          __snap: snapDos(casados),
          // `.limit(n)` — a fronteira por modalidade (RN-578) só pergunta a
          // EXISTÊNCIA de inscrito (`limit(1)`).
          limit: (n: number) => ({ __snap: snapDos(casados.slice(0, n)) }),
        };
      },
    };
  }

  const db = {
    collection(nome: string) {
      if (nome === AUDITORIA_ACESSOS_COL) {
        return {
          add: async (registro: Raw) => {
            trilha.push(registro);
            return { id: `audit-${trilha.length}` };
          },
        };
      }
      if (nome === 'tenants') {
        return {
          doc: (id: string) => ({
            get: async () => snapDe({ status: cenario.tenantStatus ?? 'ativo' }, `tenants/${id}`),
          }),
        };
      }
      if (nome === 'eventos') {
        return {
          doc: (id: string) => ({
            path: `eventos/${id}`,
            collection: (sub: string) =>
              subcolecao(
                sub,
                sub === 'lotes'
                  ? (cenario.lotes ?? [])
                  : sub === 'kits'
                    ? (cenario.kits ?? [])
                    : sub === 'inscritos'
                      ? (cenario.inscritos ?? [])
                      : (cenario.campanhas ?? []),
                id,
              ),
          }),
        };
      }
      throw new Error(`coleção inesperada no dublê: ${nome}`);
    },

    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      estado.transacoes += 1;
      estado.dentroDaTransacao = true;
      const tx = {
        get: async (alvo: Raw) => {
          if ('__snap' in alvo) return alvo['__snap'];
          const path = alvo['path'] as string;
          return snapDe(cenario.evento, path);
        },
        update: (ref: Raw, patch: Raw) => {
          if (!estado.dentroDaTransacao) estado.foraDaTransacao += 1;
          escritas.push({ path: ref['path'] as string, patch });
        },
      };
      try {
        return await fn(tx);
      } finally {
        estado.dentroDaTransacao = false;
      }
    },
  } as unknown as admin.firestore.Firestore;

  return {
    db,
    escritas,
    trilha,
    get transacoes() {
      return estado.transacoes;
    },
    get escritasForaDaTransacao() {
      return estado.foraDaTransacao;
    },
  } as Dubles;
}

const EVENTO_BASE: Raw = {
  tenantId: 'tn-1',
  qtdInscritos: 0,
  modalidades: ['5k', '21k'],
  percursos: [
    { nome: '5k', preco: 0 },
    { nome: '21k', preco: 90 },
  ],
};

describe('editarModalidadesEventoCore — guardas', () => {
  it('nega quem não é tenant_owner', async () => {
    const { db } = montar({ evento: EVENTO_BASE });
    await expect(
      editarModalidadesEventoCore(db, { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '10k', motivo: 'faltou' }, {
        uid: 'uid-staff',
        claims: { role: 'tenant_staff', tenantId: 'tn-1' } as AuthClaims,
      }),
    ).rejects.toThrow(/tenant_owner/);
  });

  it('nega evento de OUTRO tenant (RN-400)', async () => {
    const { db } = montar({ evento: { ...EVENTO_BASE, tenantId: 'tn-outro' } });
    await expect(
      editarModalidadesEventoCore(db, { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '10k', motivo: 'faltou' }, CALLER),
    ).rejects.toThrow(/outro tenant/);
  });

  it('nega tenant inativo (RN-402)', async () => {
    const { db } = montar({ evento: EVENTO_BASE, tenantStatus: 'suspenso' });
    await expect(
      editarModalidadesEventoCore(db, { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '10k', motivo: 'faltou' }, CALLER),
    ).rejects.toThrow(/não está ativo/);
  });

  it('✅ RN-578: acrescentar PASSA mesmo com o evento vendido (a RN-500 foi revogada)', async () => {
    // FALSIFICAÇÃO da revogação (V2708-25, verbatim: "registrar novas
    // modalidades quando quiser"): o evento com venda registrada ACEITA a
    // modalidade nova. A fronteira que sobrou é POR MODALIDADE, e vale só
    // para renomear/remover — testada nos describes delas.
    const { db, escritas } = montar({
      evento: { ...EVENTO_BASE, qtdInscritos: 7 },
      inscritos: [{ id: 'i1', data: { modalidade: '21k' } }],
    });
    const res = await editarModalidadesEventoCore(
      db,
      { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '10k' },
      CALLER,
    );
    expect(res.alterado).toBe(true);
    expect(res.modalidades).toEqual(['5k', '21k', '10k']);
    expect(escritas).toHaveLength(1);
  });

  it('nega evento inexistente', async () => {
    const { db } = montar({ evento: null });
    await expect(
      editarModalidadesEventoCore(db, { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '10k', motivo: 'faltou' }, CALLER),
    ).rejects.toThrow(/não existe/);
  });
});

describe('editarModalidadesEventoCore — acrescentar (RN-578 · RN-505)', () => {
  it('usa arrayUnion em modalidades e leitura-e-checagem em percursos', async () => {
    const { db, escritas, trilha } = montar({ evento: EVENTO_BASE });
    const res = await editarModalidadesEventoCore(
      db,
      { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: ' 10k ', motivo: 'faltou a de 10' },
      CALLER,
    );

    expect(res.alterado).toBe(true);
    expect(res.modalidades).toEqual(['5k', '21k', '10k']);
    expect(escritas).toHaveLength(1);
    // `arrayUnion` não apaga o que outra aba escreveu (RN-505).
    expect(escritas[0]?.patch['modalidades']).toEqual(FieldValue.arrayUnion('10k'));
    // O percurso é objeto: a igualdade estrutural do arrayUnion não dedupica
    // por nome, então ele vai por leitura-e-checagem, com preco 0 = "a definir".
    expect(escritas[0]?.patch['percursos']).toEqual([
      { nome: '5k', preco: 0 },
      { nome: '21k', preco: 90 },
      { nome: '10k', preco: 0 },
    ]);
    // Auditoria (RN-304): quem, operação, de → para, motivo.
    expect(trilha).toHaveLength(1);
    expect(trilha[0]).toMatchObject({
      tipo: TIPO_AUDITORIA_MODALIDADES,
      operacao: 'acrescentar',
      para: '10k',
      motivo: 'faltou a de 10',
      uid: 'uid-owner',
    });
  });

  it('não duplica o percurso quando o nome já está lá (só a lista estava furada)', async () => {
    const { db, escritas } = montar({
      evento: { ...EVENTO_BASE, modalidades: ['5k'], percursos: [{ nome: '5k', preco: 0 }, { nome: '10k', preco: 50 }] },
    });
    await editarModalidadesEventoCore(
      db,
      { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '10k', motivo: 'reconciliar' },
      CALLER,
    );
    expect(escritas[0]?.patch).not.toHaveProperty('percursos');
  });

  it('recusa nome já presente, sem escrever nada', async () => {
    const { db, escritas } = montar({ evento: EVENTO_BASE });
    await expect(
      editarModalidadesEventoCore(db, { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '5k', motivo: 'duplicar' }, CALLER),
    ).rejects.toThrow(/já está na lista/);
    expect(escritas).toHaveLength(0);
  });

  it('⛔ a lista sai do DOCUMENTO — mandar lista vazia no payload não apaga nada (RN-505)', async () => {
    // A projeção degradada devolve `modalidades: []`. Se o contrato aceitasse
    // a lista do cliente, este payload apagaria "5k" e "21k" passando em todas
    // as Rules, porque lista vazia é lista válida.
    const { db, escritas } = montar({ evento: EVENTO_BASE });
    await editarModalidadesEventoCore(
      db,
      {
        eventoId: 'ev-1',
        operacao: 'acrescentar',
        modalidade: '10k',
        motivo: 'a projecao estava vazia',
        modalidades: [],
        percursos: [],
      } as unknown,
      CALLER,
    );
    expect(escritas[0]?.patch['percursos']).toEqual([
      { nome: '5k', preco: 0 },
      { nome: '21k', preco: 90 },
      { nome: '10k', preco: 0 },
    ]);
  });
});

describe('editarModalidadesEventoCore — renomear (RN-501)', () => {
  const cenarioRico: Cenario = {
    evento: EVENTO_BASE,
    lotes: [
      { id: '21k-lote-1', data: { modalidade: '21k', nome: 'Lote 1' } },
      { id: '21k-lote-2', data: { modalidade: '21k', nome: 'Lote 2' } },
      { id: '5k-lote-1', data: { modalidade: '5k', nome: 'Lote 1' } },
    ],
    kits: [{ id: 'kit-prata', data: { nome: 'Kit Prata', modalidades: ['5k', '21k'] } }],
    campanhas: [
      { id: 'camp-1', data: { nome: 'Lembrete 21k', segmento: { tipo: 'por_modalidade', referencia: '21k' } } },
    ],
  };

  it('migra os CINCO alvos dentro de UMA transação, e o docId do lote não muda', async () => {
    const dubles = montar(cenarioRico);
    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'renomear', modalidade: '21k', novoNome: 'Meia maratona', motivo: 'nome comercial' },
      CALLER,
    );

    expect(res.migracao).toEqual({ lotes: 2, kits: 1, campanhas: 1 });
    expect(res.modalidades).toEqual(['5k', 'Meia maratona']);

    // UMA transação, zero escritas fora dela: duas escritas separadas deixariam
    // os lotes apontando para nome fora da lista, e a
    // `modalidadeExisteNoEventoPai` (create E update) os inutilizaria.
    expect(dubles.transacoes).toBe(1);
    expect(dubles.escritasForaDaTransacao).toBe(0);

    const porPath = new Map(dubles.escritas.map((e) => [e.path, e.patch]));
    // 1 e 2 — as duas cópias no doc do evento, no MESMO patch.
    expect(porPath.get('eventos/ev-1')).toMatchObject({
      modalidades: ['5k', 'Meia maratona'],
      percursos: [
        { nome: '5k', preco: 0 },
        { nome: 'Meia maratona', preco: 90 },
      ],
    });
    // 3 — os lotes da modalidade, e SÓ eles (o 5k não é tocado).
    expect(porPath.get('eventos/ev-1/lotes/21k-lote-1')).toMatchObject({ modalidade: 'Meia maratona' });
    expect(porPath.get('eventos/ev-1/lotes/21k-lote-2')).toMatchObject({ modalidade: 'Meia maratona' });
    expect(porPath.has('eventos/ev-1/lotes/5k-lote-1')).toBe(false);
    // 4 — o kit, preservando as outras modalidades dele.
    expect(porPath.get('eventos/ev-1/kits/kit-prata')).toMatchObject({
      modalidades: ['5k', 'Meia maratona'],
    });
    // 5 — a campanha, por campo aninhado (não reescreve o segmento inteiro,
    // para não apagar `tipo`).
    expect(porPath.get('eventos/ev-1/campanhas/camp-1')).toMatchObject({
      'segmento.referencia': 'Meia maratona',
    });
    // ⛔ O docId do lote continua com o nome antigo — mover uma chave primária
    // que `pedidos/{id}.itens[].loteId` referencia está recusado por escrito.
    expect([...porPath.keys()]).toContain('eventos/ev-1/lotes/21k-lote-1');
  });

  it('recusa renomear para um nome que já existe, sem escrever nada', async () => {
    const dubles = montar(cenarioRico);
    await expect(
      editarModalidadesEventoCore(
        dubles.db,
        { eventoId: 'ev-1', operacao: 'renomear', modalidade: '21k', novoNome: '5k', motivo: 'fundir' },
        CALLER,
      ),
    ).rejects.toThrow(/já existe neste evento/);
    expect(dubles.escritas).toHaveLength(0);
  });

  it('⛔ RN-578: recusa renomear modalidade com INSCRITO (qualquer status), sem escrever nada', async () => {
    // FALSIFICAÇÃO da fronteira por modalidade: remover a guarda do núcleo
    // tem de deixar ESTE caso vermelho. O inscrito basta — nenhum lote
    // precisa acusar venda.
    const dubles = montar({
      evento: EVENTO_BASE,
      inscritos: [{ id: 'i1', data: { modalidade: '21k', status: 'pendente' } }],
    });
    await expect(
      editarModalidadesEventoCore(
        dubles.db,
        { eventoId: 'ev-1', operacao: 'renomear', modalidade: '21k', novoNome: 'Meia' },
        CALLER,
      ),
    ).rejects.toThrow(/já tem inscrição registrada/);
    expect(dubles.escritas).toHaveLength(0);
  });

  it('⛔ RN-578: lote com vendidos > 0 também fecha o renome (defesa em profundidade)', async () => {
    const dubles = montar({
      evento: EVENTO_BASE,
      lotes: [{ id: 'l1', data: { modalidade: '21k', nome: 'Lote 1', vendidos: 3 } }],
    });
    await expect(
      editarModalidadesEventoCore(
        dubles.db,
        { eventoId: 'ev-1', operacao: 'renomear', modalidade: '21k', novoNome: 'Meia' },
        CALLER,
      ),
    ).rejects.toThrow(/já tem inscrição registrada/);
    expect(dubles.escritas).toHaveLength(0);
  });

  it('a OUTRA modalidade continua renomeável — a fronteira é da modalidade, não do evento', async () => {
    // O evento vendeu na 21k; a 5k nunca vendeu e renomeia normalmente.
    const dubles = montar({
      evento: { ...EVENTO_BASE, qtdInscritos: 3 },
      inscritos: [{ id: 'i1', data: { modalidade: '21k' } }],
    });
    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'renomear', modalidade: '5k', novoNome: 'Kids 5k' },
      CALLER,
    );
    expect(res.alterado).toBe(true);
    expect(res.modalidades).toEqual(['Kids 5k', '21k']);
  });

  it('renomear migra o nome também nos arrays de ESTADO (RN-578)', async () => {
    const dubles = montar({
      evento: { ...EVENTO_BASE, modalidadesInativas: ['21k'] },
    });
    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'renomear', modalidade: '21k', novoNome: 'Meia' },
      CALLER,
    );
    expect(res.modalidadesInativas).toEqual(['Meia']);
    const porPath = new Map(dubles.escritas.map((e) => [e.path, e.patch]));
    expect(porPath.get('eventos/ev-1')).toMatchObject({ modalidadesInativas: ['Meia'] });
  });
});

describe('editarModalidadesEventoCore — inativar/ocultar/reativar (RN-578)', () => {
  const CAMPOS_DE_ESTADO = ['modalidadesInativas', 'modalidadesOcultas', 'atualizadoEm'];

  it('inativar escreve SÓ os dois arrays de estado — nada de inscrito/pedido/lote', async () => {
    // A PROVA DE DINHEIRO da lane: inativar não cancela nem invalida o que já
    // foi vendido. No dublê isso é literal — a ÚNICA escrita é no doc do
    // evento, e o patch só carrega os dois arrays + atualizadoEm.
    const dubles = montar({
      evento: { ...EVENTO_BASE, qtdInscritos: 5 },
      inscritos: [{ id: 'i1', data: { modalidade: '21k', status: 'confirmado' } }],
      lotes: [{ id: 'l1', data: { modalidade: '21k', nome: 'Lote 1', vendidos: 5 } }],
    });
    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'inativar', modalidade: '21k' },
      CALLER,
    );
    expect(res.alterado).toBe(true);
    expect(res.modalidadesInativas).toEqual(['21k']);
    expect(res.modalidades).toEqual(['5k', '21k']);
    expect(dubles.escritas).toHaveLength(1);
    expect(dubles.escritas[0]?.path).toBe('eventos/ev-1');
    expect(Object.keys(dubles.escritas[0]?.patch ?? {}).sort()).toEqual(
      [...CAMPOS_DE_ESTADO].sort(),
    );
    expect(dubles.escritas[0]?.patch['modalidadesInativas']).toEqual(
      FieldValue.arrayUnion('21k'),
    );
    expect(dubles.escritas[0]?.patch['modalidadesOcultas']).toEqual(
      FieldValue.arrayRemove('21k'),
    );
  });

  it('ocultar e inativar são mutuamente exclusivos por construção', async () => {
    const dubles = montar({ evento: { ...EVENTO_BASE, modalidadesInativas: ['21k'] } });
    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'ocultar', modalidade: '21k' },
      CALLER,
    );
    expect(res.modalidadesInativas).toEqual([]);
    expect(res.modalidadesOcultas).toEqual(['21k']);
    expect(dubles.escritas[0]?.patch['modalidadesOcultas']).toEqual(FieldValue.arrayUnion('21k'));
    expect(dubles.escritas[0]?.patch['modalidadesInativas']).toEqual(
      FieldValue.arrayRemove('21k'),
    );
  });

  it('reativar limpa os dois arrays e a modalidade volta a ser ofertada', async () => {
    const dubles = montar({ evento: { ...EVENTO_BASE, modalidadesOcultas: ['21k'] } });
    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'reativar', modalidade: '21k' },
      CALLER,
    );
    expect(res.modalidadesInativas).toEqual([]);
    expect(res.modalidadesOcultas).toEqual([]);
  });

  it('transição repetida é no-op declarado — nada gravado, nada auditado, nunca erro', async () => {
    const dubles = montar({ evento: { ...EVENTO_BASE, modalidadesInativas: ['21k'] } });
    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'inativar', modalidade: '21k' },
      CALLER,
    );
    expect(res.alterado).toBe(false);
    expect(dubles.escritas).toHaveLength(0);
    expect(dubles.trilha).toHaveLength(0);
  });

  it('recusa transição de modalidade fora da lista', async () => {
    const dubles = montar({ evento: EVENTO_BASE });
    await expect(
      editarModalidadesEventoCore(
        dubles.db,
        { eventoId: 'ev-1', operacao: 'inativar', modalidade: '42k' },
        CALLER,
      ),
    ).rejects.toThrow(/não está na lista/);
  });

  it('a auditoria registra a transição com de→para de ESTADO e sem motivo quando não veio', async () => {
    const dubles = montar({ evento: EVENTO_BASE });
    await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'ocultar', modalidade: '21k' },
      CALLER,
    );
    expect(dubles.trilha).toHaveLength(1);
    expect(dubles.trilha[0]).toMatchObject({
      tipo: TIPO_AUDITORIA_MODALIDADES,
      operacao: 'ocultar',
      modalidade: '21k',
      de: 'ativa',
      para: 'oculta',
      uid: 'uid-owner',
    });
    expect(dubles.trilha[0]).not.toHaveProperty('motivo');
  });
});

describe('editarModalidadesEventoCore — remover (RN-502)', () => {
  it('recusa NOMEANDO cada lote, kit e campanha — e a mensagem chega inteira', async () => {
    const dubles = montar({
      evento: EVENTO_BASE,
      lotes: [
        { id: 'a', data: { modalidade: '21k', nome: 'Lote 1' } },
        { id: 'b', data: { modalidade: '21k', nome: 'Lote 2' } },
      ],
      kits: [{ id: 'k', data: { nome: 'Kit Prata', modalidades: ['21k'] } }],
      campanhas: [{ id: 'c', data: { nome: 'Lembrete 21k', segmento: { referencia: '21k' } } }],
    });
    await expect(
      editarModalidadesEventoCore(
        dubles.db,
        { eventoId: 'ev-1', operacao: 'remover', modalidade: '21k', motivo: 'errei' },
        CALLER,
      ),
    ).rejects.toThrow(/Lote 1.*Lote 2.*Kit Prata.*Lembrete 21k/s);
    expect(dubles.escritas).toHaveLength(0);
  });

  it('⛔ RN-578: NUNCA remove modalidade com inscrição — "só não pode apagar" protege o vendido', async () => {
    const dubles = montar({
      evento: { ...EVENTO_BASE, qtdInscritos: 1 },
      inscritos: [{ id: 'i1', data: { modalidade: '21k', status: 'pendente' } }],
    });
    await expect(
      editarModalidadesEventoCore(
        dubles.db,
        { eventoId: 'ev-1', operacao: 'remover', modalidade: '21k' },
        CALLER,
      ),
    ).rejects.toThrow(/já tem inscrição registrada/);
    expect(dubles.escritas).toHaveLength(0);
  });

  it('passa depois que os lotes foram apagados, e tira o nome das listas E dos arrays de estado', async () => {
    const dubles = montar({ evento: { ...EVENTO_BASE, modalidadesOcultas: ['21k'] } });
    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'remover', modalidade: '21k', motivo: 'errei o nome' },
      CALLER,
    );
    expect(res.modalidades).toEqual(['5k']);
    expect(res.modalidadesOcultas).toEqual([]);
    expect(dubles.escritas[0]?.patch).toMatchObject({
      modalidades: ['5k'],
      percursos: [{ nome: '5k', preco: 0 }],
      // Limpeza de estado (RN-578): estado de modalidade removida é lixo.
      modalidadesInativas: FieldValue.arrayRemove('21k'),
      modalidadesOcultas: FieldValue.arrayRemove('21k'),
    });
  });

  it('recusa remover o que não está na lista', async () => {
    const dubles = montar({ evento: EVENTO_BASE });
    await expect(
      editarModalidadesEventoCore(
        dubles.db,
        { eventoId: 'ev-1', operacao: 'remover', modalidade: '42k', motivo: 'nao existe' },
        CALLER,
      ),
    ).rejects.toThrow(/não está na lista/);
  });
});

describe('editarModalidadesEventoCore — a operação sobrevive à auditoria quebrada', () => {
  it('falha do registro pós-commit não desfaz a escrita (loga alto e segue)', async () => {
    const dubles = montar({ evento: EVENTO_BASE });
    const colecaoOriginal = dubles.db.collection.bind(dubles.db);
    vi.spyOn(dubles.db, 'collection').mockImplementation(((nome: string) => {
      if (nome === AUDITORIA_ACESSOS_COL) {
        return { add: async () => { throw new Error('auditoria fora do ar'); } } as never;
      }
      return colecaoOriginal(nome);
    }) as typeof dubles.db.collection);

    const res = await editarModalidadesEventoCore(
      dubles.db,
      { eventoId: 'ev-1', operacao: 'acrescentar', modalidade: '10k', motivo: 'faltou' },
      CALLER,
    );
    expect(res.alterado).toBe(true);
    expect(dubles.escritas).toHaveLength(1);
  });
});
