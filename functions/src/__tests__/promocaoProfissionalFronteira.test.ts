/**
 * promocaoProfissionalFronteira.test.ts — LEELA-S1234-T3 · RN-512 ⚔
 *
 * A PROVA DE FRONTEIRA da ponte, em nome próprio: atravessar da área do
 * cliente para o painel profissional **não** produz claim de tenant, **não**
 * produz `platform_admin` e **não** altera o papel da conta.
 *
 * Por que este arquivo existe separado do teste de comportamento: a RN-512
 * escreve que a fronteira é "provada por teste, não presumida" (molde da
 * RN-480). Uma promoção que um dia passasse a setar claim seria uma elevação
 * de privilégio silenciosa — o tipo de mudança que passa em review de fluxo
 * feliz e só aparece quando alguém alcança o painel de outra produtora.
 *
 * Sem emulator: o Firestore é um duplo de teste e o Auth Admin não é nem
 * importado — a ausência dele no módulo é, ela própria, metade da prova.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('firebase-admin', () => ({ firestore: vi.fn() }));
vi.mock('firebase-functions/logger', () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

import * as logger from 'firebase-functions/logger';
import {
  callerDaPromocao,
  normalizarIntencao,
  nomeProfissionalDoPayload,
  promoverParaProfissionalCore,
  type CallerPromocao,
} from '../platform/promoverParaProfissional';

// ---------------------------------------------------------------------------
// Duplo do Firestore — registra tudo o que foi escrito, e onde
// ---------------------------------------------------------------------------

interface Escrita {
  colecao: string;
  id: string;
  dados: Record<string, unknown>;
}

function dbFake(docExiste = false): {
  db: Parameters<typeof promoverParaProfissionalCore>[0];
  escritas: Escrita[];
} {
  const escritas: Escrita[] = [];
  const db = {
    collection: (colecao: string) => ({
      doc: (id: string) => ({ __colecao: colecao, __id: id }),
    }),
    runTransaction: async <T>(
      fn: (tx: {
        get: (ref: { __colecao: string; __id: string }) => Promise<{ exists: boolean }>;
        set: (ref: { __colecao: string; __id: string }, dados: Record<string, unknown>) => void;
      }) => Promise<T>
    ): Promise<T> =>
      fn({
        get: async () => ({ exists: docExiste }),
        set: (ref, dados) => {
          escritas.push({ colecao: ref.__colecao, id: ref.__id, dados });
        },
      }),
  };
  return { db: db as unknown as Parameters<typeof promoverParaProfissionalCore>[0], escritas };
}

const CLIENTE: CallerPromocao = {
  uid: 'uid-ana',
  ehAnonimo: false,
  email: 'ana@exemplo.dev',
  nome: 'Ana',
  role: 'athlete',
  // A participante comum: `athlete` LIMPO, que é o papel que o `onCreateUser`
  // dá a toda conta nova. O marcador de demoção é o que separa ela da
  // ex-organizadora rebaixada (PONTE-ELEGIVEL-1).
  demotedFromRole: undefined,
  tenantId: null,
};

const ACEITE = { aceiteTermo: true };

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// ⚔ A fronteira
// ---------------------------------------------------------------------------

describe('⚔ S1234-T3 · a ponte não concede tenant, papel nem capacidade', () => {
  it('a promoção escreve UM doc, em `profissionais`, e nada mais', async () => {
    const { db, escritas } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, ACEITE);

    expect(escritas).toHaveLength(1);
    expect(escritas[0]?.colecao).toBe('profissionais');
    expect(escritas[0]?.id).toBe('uid-ana');
  });

  it('o doc criado NÃO carrega tenantId, papéis nem capacidade de plataforma', async () => {
    const { db, escritas } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, ACEITE);

    const dados = escritas[0]?.dados ?? {};
    expect(dados['tenantId']).toBeUndefined();
    expect(dados['papeis']).toBeUndefined();
    expect(dados['role']).toBeUndefined();
    expect(dados['isPlatformAdmin']).toBeUndefined();
    expect(dados['capacidades']).toBeUndefined();
    // O único estado que ela concede, e ele é o do convite pendente (RN-411).
    expect(dados['statusOnboarding']).toBe('aguardando_convite');
  });

  it('o módulo não tem como setar claim: `setCustomUserClaims` não aparece nele', () => {
    // A prova mais barata e a mais durável. Um refactor que introduzisse
    // concessão de claim aqui mataria este caso antes de chegar a produção,
    // sem depender de emulator nem de conta de teste.
    const fonte = readFileSync(
      resolve(__dirname, '../platform/promoverParaProfissional.ts'),
      'utf8'
    );
    const semComentarios = fonte
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    expect(semComentarios).not.toContain('setCustomUserClaims');
    expect(semComentarios).not.toContain('provisionTenant');
    expect(semComentarios).not.toContain('admin.auth');
  });

  it('o papel `athlete` da conta não é tocado — o `onCreateUser` continua dono dele', async () => {
    const { db, escritas } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, ACEITE);
    // `profissionais/{uid}` é OUTRO documento: o `onCreateUser` grava
    // `atletas/{uid}` e a claim `athlete`, e nada aqui colide com os dois.
    expect(escritas.every((e) => e.colecao !== 'atletas')).toBe(true);
    expect(escritas[0]?.dados['id']).toBe('uid-ana');
  });

  it('⚔ RN-449 · conta de administração da plataforma é recusada, e nomeadamente', async () => {
    const { db, escritas } = dbFake();
    await expect(
      promoverParaProfissionalCore(db, { ...CLIENTE, role: 'platform_admin' }, ACEITE)
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(escritas).toHaveLength(0);
  });

  it('a leitura da RN-449 é do PAPEL LITERAL: quem administra E organiza atravessa', async () => {
    // O dono é `tenant_owner` da produtora dele E administra a plataforma.
    // Com `isPlatformAdmin` ele cairia na recusa acima e perderia a ponte —
    // é o mesmo ponto cego pinado em `apps/landing/lib/portaOrganizador.ts`.
    const { db } = dbFake();
    const r = await promoverParaProfissionalCore(
      db,
      { ...CLIENTE, role: 'tenant_owner', tenantId: 'castelo' },
      ACEITE
    );
    expect(r.jaExistia).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Idempotência — o duplo clique da área do cliente
// ---------------------------------------------------------------------------

describe('S1234-T1 · a promoção repetida não duplica nada (RN-512, fluxo C)', () => {
  it('doc já existente devolve sucesso SEM escrever e sem recolher consentimento', async () => {
    const { db, escritas } = dbFake(true);
    const r = await promoverParaProfissionalCore(db, CLIENTE, ACEITE);
    expect(r).toEqual({ statusOnboarding: 'aguardando_convite', jaExistia: true });
    expect(escritas).toHaveLength(0);
  });

  it('conta que JÁ tem tenant não é rebaixada para `aguardando_convite`', async () => {
    const { db, escritas } = dbFake();
    const r = await promoverParaProfissionalCore(db, { ...CLIENTE, tenantId: 'castelo' }, ACEITE);
    expect(r.jaExistia).toBe(true);
    expect(escritas).toHaveLength(0);
  });

  it('⚔ PONTE-ELEGIVEL-1 · a rebaixada COM doc antigo é recusada, não recebe `jaExistia`', async () => {
    // A ordem das guardas é a regra: a inelegibilidade é decidida ANTES da
    // transação. Se ela fosse decidida depois, a ex-organizadora — que tem
    // `profissionais/{uid}` de quando organizava — receberia sucesso, cairia
    // na vitrine e voltaria ao mesmo beco, agora sem nem uma frase.
    const { db, escritas } = dbFake(true);
    const erro = await promoverParaProfissionalCore(
      db,
      { ...CLIENTE, demotedFromRole: 'tenant_owner' },
      ACEITE
    ).then(
      () => null,
      (e: unknown) => e as { details?: { motivo?: string } }
    );
    expect(erro?.details?.motivo).toBe('conta_inelegivel');
    expect(escritas).toHaveLength(0);
  });

  it('a decisão "existe ou não" acontece DENTRO da transação', async () => {
    // Se a leitura saísse da transação, duas chamadas simultâneas leriam
    // "não existe" e as duas escreveriam. O duplo clique da área do cliente é
    // exatamente esse cenário.
    let dentro = false;
    const db = {
      collection: () => ({ doc: () => ({}) }),
      runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> =>
        fn({
          get: async () => {
            dentro = true;
            return { exists: false };
          },
          set: () => undefined,
        }),
    } as unknown as Parameters<typeof promoverParaProfissionalCore>[0];
    await promoverParaProfissionalCore(db, CLIENTE, ACEITE);
    expect(dentro).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// As recusas, nomeadas — nenhuma sai como `internal` (lição do DEF-B)
// ---------------------------------------------------------------------------

describe('S1234-T1 · as recusas têm nome e nenhuma é `internal`', () => {
  const casos: { nome: string; caller: CallerPromocao; input: unknown; motivo: string }[] = [
    {
      nome: 'sessão anônima do checkout',
      caller: { ...CLIENTE, ehAnonimo: true },
      input: ACEITE,
      motivo: 'sessao_anonima',
    },
    {
      nome: 'conta nomeada sem e-mail (fail-closed)',
      caller: { ...CLIENTE, email: null },
      input: ACEITE,
      motivo: 'sessao_anonima',
    },
    {
      nome: 'administração da plataforma',
      caller: { ...CLIENTE, role: 'platform_admin' },
      input: ACEITE,
      motivo: 'conta_de_plataforma',
    },
    {
      nome: 'divulgador (PONTE-ELEGIVEL-1)',
      caller: { ...CLIENTE, role: 'promoter' },
      input: ACEITE,
      motivo: 'conta_inelegivel',
    },
    {
      nome: 'ex-organizadora rebaixada de propósito (PONTE-ELEGIVEL-1)',
      // Rebaixar APAGA o `tenantId` e grava o marcador (`mergeTenantClaims`):
      // ela reaparece como participante e o `portaDaConta` lhe mostra a ponte.
      caller: { ...CLIENTE, role: 'athlete', demotedFromRole: 'tenant_owner' },
      input: ACEITE,
      motivo: 'conta_inelegivel',
    },
    {
      nome: 'aceite ausente',
      caller: CLIENTE,
      input: {},
      motivo: 'aceite_ausente',
    },
    {
      nome: 'aceite falso',
      caller: CLIENTE,
      input: { aceiteTermo: 'sim' },
      motivo: 'aceite_ausente',
    },
    {
      nome: 'aceite DATADO pelo cliente (RN-446)',
      caller: CLIENTE,
      input: { aceiteTermo: true, aceitoEm: '2020-01-01' },
      motivo: 'aceite_datado_pelo_cliente',
    },
    {
      nome: 'versão do termo mandada pela tela (RN-466)',
      caller: CLIENTE,
      input: { aceiteTermo: true, versao: '1999-01-01' },
      motivo: 'aceite_datado_pelo_cliente',
    },
  ];

  for (const caso of casos) {
    it(`${caso.nome} → recusa \`${caso.motivo}\`, nunca internal`, async () => {
      const { db, escritas } = dbFake();
      const erro = await promoverParaProfissionalCore(db, caso.caller, caso.input).then(
        () => null,
        (e: unknown) => e as { code?: string; details?: { motivo?: string }; message?: string }
      );
      expect(erro).not.toBeNull();
      expect(erro?.code).not.toBe('internal');
      expect(erro?.details?.motivo).toBe(caso.motivo);
      expect((erro?.message ?? '').length).toBeGreaterThan(0);
      expect(escritas).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// A tradução do token
// ---------------------------------------------------------------------------

describe('S1234-T1 · o token lido sem inferência', () => {
  it('provedor ausente é tratado como anônimo (fail-closed)', () => {
    expect(callerDaPromocao({ uid: 'u', token: {} }).ehAnonimo).toBe(true);
  });

  it('provedor `anonymous` é anônimo; `password` não é', () => {
    expect(
      callerDaPromocao({ uid: 'u', token: { firebase: { sign_in_provider: 'anonymous' } } })
        .ehAnonimo
    ).toBe(true);
    expect(
      callerDaPromocao({ uid: 'u', token: { firebase: { sign_in_provider: 'password' } } })
        .ehAnonimo
    ).toBe(false);
  });

  it('o marcador de demoção atravessa cru — só a PRESENÇA dele decide', () => {
    // Estreitar para `string` faria um marcador malformado sumir no caminho, e
    // sumir num campo que existe para dizer "não" é fail-open.
    expect(
      callerDaPromocao({
        uid: 'u',
        token: { demotedFromRole: 'tenant_owner', firebase: { sign_in_provider: 'password' } },
      }).demotedFromRole
    ).toBe('tenant_owner');
    expect(
      callerDaPromocao({ uid: 'u', token: { firebase: { sign_in_provider: 'password' } } })
        .demotedFromRole
    ).toBeUndefined();
  });

  it('papel e tenant não-string não viram papel nem tenant por acidente', () => {
    const c = callerDaPromocao({
      uid: 'u',
      token: { role: ['platform_admin'], tenantId: 123, firebase: { sign_in_provider: 'password' } },
    });
    expect(c.role).toBeNull();
    expect(c.tenantId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PONTE-CTA-1 · a intenção é carimbada, e ela NUNCA recusa ninguém
// ---------------------------------------------------------------------------

describe('⚔ PONTE-CTA-1 · o campo `intencao` mede sem cobrar', () => {
  it('as duas intenções atravessam e chegam ao log com o próprio nome', async () => {
    for (const intencao of ['eventos', 'clube'] as const) {
      expect(normalizarIntencao(intencao)).toBe(intencao);
      const { db, escritas } = dbFake();
      const r = await promoverParaProfissionalCore(db, CLIENTE, { ...ACEITE, intencao });
      expect(r.jaExistia).toBe(false);
      expect(escritas).toHaveLength(1);
      const log = vi.mocked(logger.info).mock.calls.at(-1);
      expect(log?.[0]).toBe('promocao_profissional');
      expect((log?.[1] as { intencao?: string })?.intencao).toBe(intencao);
      vi.clearAllMocks();
    }
  });

  it('⚔ o cliente VELHO — que não conhece o campo — atravessa igual, como `nao_declarada`', async () => {
    // A landing no ar hoje manda só `{ aceiteTermo: true }`. Se o campo novo
    // recusasse a ausência, o deploy das functions derrubaria a ponte antes de
    // o deploy da landing subir.
    const { db, escritas } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, ACEITE);
    expect(escritas).toHaveLength(1);
    expect(
      (vi.mocked(logger.info).mock.calls.at(-1)?.[1] as { intencao?: string })?.intencao
    ).toBe('nao_declarada');
  });

  it('⚔ o typo do cliente NOVO vira `invalida`, e não se funde com o silêncio do velho', async () => {
    // Esta é a regra, e não detalhe: fundir os dois faria um erro de deploy
    // novo desaparecer dentro do volume do deploy velho, e a medição diria
    // que ninguém clicou. A pessoa, essa, atravessa do mesmo jeito.
    expect(normalizarIntencao('clubes')).toBe('invalida');
    expect(normalizarIntencao(42)).toBe('invalida');
    expect(normalizarIntencao(undefined)).toBe('nao_declarada');
    expect(normalizarIntencao(null)).toBe('nao_declarada');

    const { db, escritas } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, { ...ACEITE, intencao: 'painel' });
    expect(escritas).toHaveLength(1);
    expect(
      (vi.mocked(logger.info).mock.calls.at(-1)?.[1] as { intencao?: string })?.intencao
    ).toBe('invalida');
  });

  it('⚔ quem JÁ tem tenant também carimba a intenção — o retorno cedo não perde a medição', async () => {
    // O passo do tenant retorna antes da transação. Um log sem `intencao` aí
    // faria a conversão de quem já atravessou sumir da conta.
    const { db, escritas } = dbFake();
    const r = await promoverParaProfissionalCore(
      db,
      { ...CLIENTE, role: 'tenant_owner', tenantId: 'castelo' },
      { ...ACEITE, intencao: 'clube' }
    );
    expect(r.jaExistia).toBe(true);
    expect(escritas).toHaveLength(0);
    const dados = vi.mocked(logger.info).mock.calls.at(-1)?.[1] as {
      intencao?: string;
      viaTenant?: boolean;
    };
    expect(dados?.viaTenant).toBe(true);
    expect(dados?.intencao).toBe('clube');
  });
});

// ---------------------------------------------------------------------------
// PONTE-NOME-1 · o nome da produtora escolhido na porta
// ---------------------------------------------------------------------------

describe('⚔ PONTE-NOME-1 · `organizacao` deixa de nascer sempre vazia', () => {
  it('o nome escolhido desce até `organizacao`, aparado', async () => {
    const { db, escritas } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, {
      ...ACEITE,
      nomeProfissional: '  Castelo Produções  ',
    });
    expect(escritas[0]?.dados['organizacao']).toBe('Castelo Produções');
  });

  it('⚔ sem nome declarado, `organizacao` continua vazia — o cliente velho não muda', async () => {
    const { db, escritas } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, ACEITE);
    expect(escritas[0]?.dados['organizacao']).toBe('');
  });

  it('campo apagado pela pessoa (string vazia) é escolha de não escolher, não erro', async () => {
    const { db, escritas } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, { ...ACEITE, nomeProfissional: '   ' });
    expect(escritas).toHaveLength(1);
    expect(escritas[0]?.dados['organizacao']).toBe('');
  });

  it('⚔ nome que não vira slug é RECUSADO, não descartado em silêncio', async () => {
    // `"!!"` tem dois caracteres e passa no comprimento; o slug derivado dele
    // é vazio. Aceitá-lo devolveria à pessoa a semente do nome pessoal com
    // cara de escolha feita — e o slug é cunhado uma vez.
    for (const ruim of ['!', '!!', '   ---   ', 'x'.repeat(81), 42, { nome: 'x' }]) {
      const { db, escritas } = dbFake();
      const erro = await promoverParaProfissionalCore(db, CLIENTE, {
        ...ACEITE,
        nomeProfissional: ruim,
      }).then(
        () => null,
        (e: unknown) => e as { code?: string; details?: { motivo?: string } }
      );
      expect(erro).not.toBeNull();
      expect(erro?.code).toBe('invalid-argument');
      expect(erro?.details?.motivo).toBe('nome_profissional_invalido');
      expect(escritas).toHaveLength(0);
    }
  });

  it('a régua pura, isolada: o que passa, o que vira null e o que estoura', () => {
    expect(nomeProfissionalDoPayload('Castelo')).toBe('Castelo');
    expect(nomeProfissionalDoPayload('Zé')).toBe('Zé');
    expect(nomeProfissionalDoPayload(undefined)).toBeNull();
    expect(nomeProfissionalDoPayload(null)).toBeNull();
    expect(nomeProfissionalDoPayload('')).toBeNull();
    expect(() => nomeProfissionalDoPayload('a')).toThrow();
    expect(() => nomeProfissionalDoPayload('%%')).toThrow();
  });

  it('⚔ o nome NÃO vai para o log — o log leva um booleano', async () => {
    // `organizacao` é dado de titular. Ele vai para o documento; o Cloud
    // Logging fica com "declarou ou não".
    const { db } = dbFake();
    await promoverParaProfissionalCore(db, CLIENTE, {
      ...ACEITE,
      nomeProfissional: 'Castelo Produções',
    });
    const dados = vi.mocked(logger.info).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(dados['nomeDeclarado']).toBe(true);
    expect(JSON.stringify(dados)).not.toContain('Castelo');
  });

  it('⚔ o nome não abre porta nenhuma: a recusa de conta inelegível vem ANTES da escrita', async () => {
    // O divulgador que mandasse um nome bonito continua parando na porta, e o
    // Firestore continua intacto (PONTE-ELEGIVEL-1 não é afrouxado por este
    // campo novo).
    const { db, escritas } = dbFake();
    const erro = await promoverParaProfissionalCore(
      db,
      { ...CLIENTE, role: 'promoter' },
      { ...ACEITE, nomeProfissional: 'Produtora do Téo', intencao: 'eventos' }
    ).then(
      () => null,
      (e: unknown) => e as { details?: { motivo?: string } }
    );
    expect(erro?.details?.motivo).toBe('conta_inelegivel');
    expect(escritas).toHaveLength(0);
  });
});
