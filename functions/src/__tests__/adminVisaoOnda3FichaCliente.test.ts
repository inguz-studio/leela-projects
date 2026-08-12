/**
 * adminVisaoOnda3FichaCliente.test.ts — ADMIN-VISAO onda 3 · S1612-T6
 *
 * O dono decidiu (ADMINVISAO-2, leva 6 de 11/08) que a aba de clientes mostra
 * a ficha COMPLETA por indivíduo: CPF, e-mail, telefone, cidade, endereço,
 * restrições e pedidos. Este arquivo prova as quatro coisas que a decisão
 * dele NÃO dispensou:
 *
 *   1. quem não é platform_admin é negado E a negativa é registrada;
 *   2. a ficha monta o contato das fontes que já guardam o dado
 *      (`inscritos.dadosPessoais` e `pedidos.responsavel`/`pedidos.endereco`),
 *      e NUNCA de `pessoas`, que é a coleção que a Rule fecha para todo mundo;
 *   3. campo que a fonte não guarda vira `null` declarado, nunca string vazia
 *      e nunca zero;
 *   4. histórico maior que o teto declara que truncou.
 *
 * Admin SDK falso (sem emulator): o `db` responde a `doc(path).get()` por um
 * mapa de caminhos, e a coleção de auditoria acumula o que foi gravado. A
 * prova de Rule vive na suíte de integração; esta é sobre o CONTRATO.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import type * as admin from 'firebase-admin';
import {
  obterFichaDoClienteCore,
  FICHA_CLIENTE_MAX_INSCRICOES,
} from '../platform/obterFichaDoCliente';
import type { AuthClaims } from '@leela/core';

type Raw = Record<string, unknown>;

const ADMIN: { uid: string; claims: AuthClaims } = {
  uid: 'uid-admin',
  claims: { role: 'platform_admin' } as unknown as AuthClaims,
};

const ORGANIZADOR: { uid: string; claims: AuthClaims } = {
  uid: 'uid-organizador',
  claims: { role: 'tenant_owner', tenantId: 'castelo' } as unknown as AuthClaims,
};

/** Registros gravados em `auditoriaAcessos` durante a chamada. */
let auditoria: Raw[] = [];
/** Caminhos que a Function realmente leu — a prova de que `pessoas` não entra. */
let lidos: string[] = [];

function fakeDb(docs: Record<string, Raw>): admin.firestore.Firestore {
  return {
    doc(path: string) {
      return {
        get: async () => {
          lidos.push(path);
          const data = docs[path];
          return {
            id: path.split('/').pop() ?? '',
            exists: data !== undefined,
            data: () => data,
          };
        },
      };
    },
    collection(nome: string) {
      return {
        add: async (registro: Raw) => {
          if (nome === 'auditoriaAcessos') auditoria.push(registro);
          return { id: 'reg' };
        },
      };
    },
  } as unknown as admin.firestore.Firestore;
}

/** Doc CRM com um ledger de N inscrições, todas do mesmo evento. */
function crmCom(inscricoes: Raw): Raw {
  return {
    tenantId: 'castelo',
    chaveTipo: 'cpf',
    nome: 'Ana Prado',
    genero: 'feminino',
    nascimento: '1990-04-12',
    aniversario: '04-12',
    qtdEventos: 1,
    qtdInscricoes: Object.keys(inscricoes).length,
    valorGasto: 240,
    ltv: 240,
    eventos: {
      'ev-1': { nome: 'Trail do Castelo', qtdInscricoes: 1, qtdEstornadas: 0, valorPago: 240 },
    },
    inscricoes,
  };
}

/** Entrada do ledger com TODOS os campos que `parseEntry` exige. */
function entry(over: Raw = {}): Raw {
  return {
    eventoId: 'ev-1',
    eventoNome: 'Trail do Castelo',
    status: 'confirmado',
    valorPago: 240,
    taxaRepassada: 0,
    nome: 'Ana Prado',
    nascimento: '1990-04-12',
    genero: 'feminino',
    atualizadoEmMs: 1_700_000_000_000,
    ...over,
  };
}

const LEDGER_UM = { 'ev-1_insc-1': entry() };

const INSCRITO_COMPLETO: Raw = {
  pedidoRef: 'ped-1',
  dadosPessoais: {
    cpf: '12345678901',
    telefone: '48999990000',
    nascimento: '1990-04-12',
    genero: 'feminino',
    cidade: 'Florianópolis',
    uf: 'SC',
    restricoesMedicas: 'asma leve',
    contatoEmergencia: { nome: 'Bruno Prado', telefone: '48988880000' },
  },
};

const PEDIDO_COMPLETO: Raw = {
  status: 'pago',
  responsavel: {
    atletaId: 'atl-1',
    nome: 'Ana Prado',
    email: 'ana@exemplo.com',
    telefone: '48977770000',
  },
  endereco: {
    cep: '88010000',
    logradouro: 'Rua das Flores',
    bairro: 'Centro',
    cidade: 'Florianópolis',
    uf: 'SC',
    numero: '120',
    complemento: 'apto 3',
  },
};

const CAMINHO_CRM = 'tenants/castelo/crmClientes/cli-1';

beforeEach(() => {
  auditoria = [];
  lidos = [];
});

describe('obterFichaDoClienteCore · autorização e rastro', () => {
  it('nega quem não é platform_admin e REGISTRA a negativa', async () => {
    const db = fakeDb({ [CAMINHO_CRM]: crmCom(LEDGER_UM) });

    await expect(
      obterFichaDoClienteCore(db, { tenantId: 'castelo', clienteKey: 'cli-1' }, ORGANIZADOR)
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]).toMatchObject({
      tipo: 'acesso_ficha_cliente',
      resultado: 'negado_papel',
      uid: 'uid-organizador',
      clienteKey: 'cli-1',
    });
  });

  it('não lê PII nenhuma antes de negar', async () => {
    const db = fakeDb({ [CAMINHO_CRM]: crmCom(LEDGER_UM) });
    await expect(
      obterFichaDoClienteCore(db, { tenantId: 'castelo', clienteKey: 'cli-1' }, ORGANIZADOR)
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(lidos).toEqual([]);
  });

  it('registra o acesso CONCEDIDO com o cliente consultado', async () => {
    const db = fakeDb({
      [CAMINHO_CRM]: crmCom(LEDGER_UM),
      'eventos/ev-1/inscritos/insc-1': INSCRITO_COMPLETO,
      'pedidos/ped-1': PEDIDO_COMPLETO,
    });

    await obterFichaDoClienteCore(db, { tenantId: 'castelo', clienteKey: 'cli-1' }, ADMIN);

    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]).toMatchObject({
      tipo: 'acesso_ficha_cliente',
      resultado: 'concedido',
      uid: 'uid-admin',
      tenantId: 'castelo',
      clienteKey: 'cli-1',
    });
  });

  it('recusa clienteKey com "/" em vez de deixar o Admin SDK estourar', async () => {
    const db = fakeDb({});
    await expect(
      obterFichaDoClienteCore(db, { tenantId: 'castelo', clienteKey: 'a/b/c' }, ADMIN)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('cliente inexistente é not-found, não ficha vazia', async () => {
    const db = fakeDb({});
    await expect(
      obterFichaDoClienteCore(db, { tenantId: 'castelo', clienteKey: 'cli-1' }, ADMIN)
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('obterFichaDoClienteCore · a ficha que o dono pediu', () => {
  it('monta CPF, e-mail, telefone, cidade, endereço, restrições e pedidos', async () => {
    const db = fakeDb({
      [CAMINHO_CRM]: crmCom(LEDGER_UM),
      'eventos/ev-1/inscritos/insc-1': INSCRITO_COMPLETO,
      'pedidos/ped-1': PEDIDO_COMPLETO,
    });

    const ficha = await obterFichaDoClienteCore(
      db,
      { tenantId: 'castelo', clienteKey: 'cli-1' },
      ADMIN
    );

    expect(ficha.cpf).toBe('12345678901');
    expect(ficha.email).toBe('ana@exemplo.com');
    expect(ficha.cidade).toBe('Florianópolis');
    expect(ficha.uf).toBe('SC');
    expect(ficha.endereco).toMatchObject({
      logradouro: 'Rua das Flores',
      numero: '120',
      cep: '88010000',
    });
    expect(ficha.restricoesMedicas).toBe('asma leve');
    expect(ficha.contatoEmergencia).toMatchObject({ nome: 'Bruno Prado' });
    expect(ficha.pedidos).toHaveLength(1);
    expect(ficha.pedidos[0]).toMatchObject({
      pedidoId: 'ped-1',
      eventoNome: 'Trail do Castelo',
      statusNoCrm: 'confirmado',
      statusDoPedido: 'pago',
      valorPago: 240,
    });
  });

  it('o telefone do responsável do pedido vem na frente do telefone do inscrito', async () => {
    const db = fakeDb({
      [CAMINHO_CRM]: crmCom(LEDGER_UM),
      'eventos/ev-1/inscritos/insc-1': INSCRITO_COMPLETO,
      'pedidos/ped-1': PEDIDO_COMPLETO,
    });

    const ficha = await obterFichaDoClienteCore(
      db,
      { tenantId: 'castelo', clienteKey: 'cli-1' },
      ADMIN
    );

    // 48977770000 é o do responsável; 48999990000 é o do inscrito.
    expect(ficha.telefone).toBe('48977770000');
  });

  it('NUNCA lê `pessoas` — a coleção que a Rule fecha para todo mundo', async () => {
    const db = fakeDb({
      [CAMINHO_CRM]: crmCom(LEDGER_UM),
      'eventos/ev-1/inscritos/insc-1': { ...INSCRITO_COMPLETO, pessoaRef: 'cpf_abc' },
      'pedidos/ped-1': PEDIDO_COMPLETO,
    });

    await obterFichaDoClienteCore(db, { tenantId: 'castelo', clienteKey: 'cli-1' }, ADMIN);

    expect(lidos.some((p) => p.startsWith('pessoas/'))).toBe(false);
  });

  it('campo que a fonte não guarda vira null declarado, nunca string vazia', async () => {
    const db = fakeDb({
      [CAMINHO_CRM]: crmCom(LEDGER_UM),
      'eventos/ev-1/inscritos/insc-1': {
        pedidoRef: 'ped-1',
        // O checkout §5 grava bloco PARCIAL: cidade, uf e restrições vêm ''.
        dadosPessoais: {
          cpf: '12345678901',
          telefone: '',
          nascimento: '',
          genero: 'nao_informado',
          cidade: '',
          uf: '',
        },
      },
      'pedidos/ped-1': { status: 'pago', responsavel: { atletaId: 'atl-1', nome: 'Ana' } },
    });

    const ficha = await obterFichaDoClienteCore(
      db,
      { tenantId: 'castelo', clienteKey: 'cli-1' },
      ADMIN
    );

    expect(ficha.email).toBeNull();
    expect(ficha.telefone).toBeNull();
    expect(ficha.endereco).toBeNull();
    expect(ficha.restricoesMedicas).toBeNull();
    expect(ficha.contatoEmergencia).toBeNull();
    // E nenhum deles virou string vazia, que na tela parece dado em branco.
    expect(ficha.email).not.toBe('');
    expect(ficha.telefone).not.toBe('');
  });

  it('inscrição ilegível não derruba a ficha — o pedido aparece com o que se sabe', async () => {
    const db = fakeDb({
      [CAMINHO_CRM]: crmCom(LEDGER_UM),
      // O doc do inscrito não existe (expurgado): a leitura devolve exists=false.
      'pedidos/ped-1': PEDIDO_COMPLETO,
    });

    const ficha = await obterFichaDoClienteCore(
      db,
      { tenantId: 'castelo', clienteKey: 'cli-1' },
      ADMIN
    );

    expect(ficha.pedidos).toHaveLength(1);
    expect(ficha.pedidos[0]).toMatchObject({ eventoNome: 'Trail do Castelo' });
    expect(ficha.cpf).toBeNull();
  });
});

describe('obterFichaDoClienteCore · o histórico não mente sobre o tamanho', () => {
  it('ledger dentro do teto não declara truncagem', async () => {
    const db = fakeDb({
      [CAMINHO_CRM]: crmCom(LEDGER_UM),
      'eventos/ev-1/inscritos/insc-1': INSCRITO_COMPLETO,
      'pedidos/ped-1': PEDIDO_COMPLETO,
    });

    const ficha = await obterFichaDoClienteCore(
      db,
      { tenantId: 'castelo', clienteKey: 'cli-1' },
      ADMIN
    );

    expect(ficha.pedidosTruncados).toBe(false);
    expect(ficha.pedidos).toHaveLength(1);
  });

  it('ledger acima do teto corta E DIZ que cortou', async () => {
    const inscricoes: Raw = {};
    const total = FICHA_CLIENTE_MAX_INSCRICOES + 5;
    for (let i = 0; i < total; i += 1) {
      inscricoes[`ev-1_insc-${i}`] = entry({
        valorPago: 10,
        atualizadoEmMs: 1_700_000_000_000 + i,
      });
    }
    const db = fakeDb({ [CAMINHO_CRM]: crmCom(inscricoes) });

    const ficha = await obterFichaDoClienteCore(
      db,
      { tenantId: 'castelo', clienteKey: 'cli-1' },
      ADMIN
    );

    expect(ficha.pedidos).toHaveLength(FICHA_CLIENTE_MAX_INSCRICOES);
    expect(ficha.pedidosTruncados).toBe(true);
  });

  it('o corte fica com as inscrições MAIS RECENTES', async () => {
    const inscricoes: Raw = {};
    const total = FICHA_CLIENTE_MAX_INSCRICOES + 2;
    for (let i = 0; i < total; i += 1) {
      inscricoes[`ev-1_insc-${i}`] = entry({
        eventoNome: `Prova ${i}`,
        valorPago: 10,
        atualizadoEmMs: 1_700_000_000_000 + i,
      });
    }
    const db = fakeDb({ [CAMINHO_CRM]: crmCom(inscricoes) });

    const ficha = await obterFichaDoClienteCore(
      db,
      { tenantId: 'castelo', clienteKey: 'cli-1' },
      ADMIN
    );

    expect(ficha.pedidos[0]?.eventoNome).toBe(`Prova ${total - 1}`);
  });
});
