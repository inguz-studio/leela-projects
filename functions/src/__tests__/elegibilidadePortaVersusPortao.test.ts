/**
 * elegibilidadePortaVersusPortao.test.ts — PONTE-ELEGIVEL-1 ⚔
 *
 * A PORTA RECUSA O QUE O PORTÃO RECUSA — provado COMPARANDO as duas, e não
 * repetindo a lista de papéis à mão.
 *
 * O buraco que este arquivo fecha (medido pela `PONTE-REV`): a porta
 * (`promoverParaProfissional`) recusava só a conta de plataforma, enquanto o
 * portão (`contaElegivelParaResgate`, dentro do `resgatarConviteOrganizador`)
 * recusa cinco estados. O divulgador e a ex-organizadora rebaixada de propósito
 * atravessavam a porta, esperavam o convite e ouviam a recusa genérica da
 * RN-414 dias depois — indistinguível de "código inválido".
 *
 * POR QUE COMPARAR EM VEZ DE LISTAR
 * Um teste que escrevesse "promoter é recusado" verifica a porta contra a
 * memória de quem escreveu o teste. Este verifica a porta contra o PORTÃO: a
 * expectativa de cada linha da tabela vem de `contaElegivelParaResgate`, a
 * função de verdade, chamada com um Auth de mentira que devolve o crachá.
 * Mudar a régua num dos lados e esquecer o outro mata este arquivo.
 *
 * ⛔ O que ele NÃO prova: nada sobre Rules, transporte ou banco. O portão aqui
 * é exercitado só na sua decisão de elegibilidade — o resto dele (rate-limit,
 * reserva CAS, compensação) é do `resgateConvite.integration.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin', () => ({ firestore: vi.fn(), auth: vi.fn() }));
vi.mock('firebase-functions/logger', () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));

import type * as admin from 'firebase-admin';
import {
  promoverParaProfissionalCore,
  type CallerPromocao,
} from '../platform/promoverParaProfissional';
import { contaElegivelParaResgate } from '../platform/resgatarConviteOrganizador';

// ---------------------------------------------------------------------------
// Os dois lados, cada um lendo o crachá como lê em produção
// ---------------------------------------------------------------------------

/** O crachá de uma conta, do jeito que ele existe no Auth. */
interface Cracha {
  role?: string;
  demotedFromRole?: string;
  tenantId?: string;
}

/** O Auth de mentira do portão: devolve o crachá e nada mais. */
function authComCracha(cracha: Cracha): admin.auth.Auth {
  return {
    getUser: async () => ({ customClaims: { ...cracha } }),
  } as unknown as admin.auth.Auth;
}

/** O caller da porta: o MESMO crachá, lido do token. */
function callerComCracha(cracha: Cracha): CallerPromocao {
  return {
    uid: 'uid-quem-clicou',
    ehAnonimo: false,
    email: 'quem@exemplo.dev',
    nome: 'Quem Clicou',
    role: cracha.role ?? null,
    demotedFromRole: cracha.demotedFromRole,
    tenantId: cracha.tenantId ?? null,
  };
}

interface Escrita {
  colecao: string;
  id: string;
}

/** Firestore de mentira que só registra ONDE escreveu. */
function dbFake(docExiste: boolean): {
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
        get: (r: { __colecao: string; __id: string }) => Promise<{ exists: boolean }>;
        set: (r: { __colecao: string; __id: string }, d: Record<string, unknown>) => void;
      }) => Promise<T>
    ): Promise<T> =>
      fn({
        get: async () => ({ exists: docExiste }),
        set: (ref) => {
          escritas.push({ colecao: ref.__colecao, id: ref.__id });
        },
      }),
  };
  return { db: db as unknown as Parameters<typeof promoverParaProfissionalCore>[0], escritas };
}

const ACEITE = { aceiteTermo: true };

/** O que a porta fez com esta conta. */
type DesfechoDaPorta =
  | { tipo: 'criou' }
  | { tipo: 'ja_era' }
  | { tipo: 'recusou'; motivo: string | undefined };

async function baterNaPorta(cracha: Cracha, docExiste = false): Promise<DesfechoDaPorta> {
  const { db, escritas } = dbFake(docExiste);
  try {
    await promoverParaProfissionalCore(db, callerComCracha(cracha), ACEITE);
    return escritas.length > 0 ? { tipo: 'criou' } : { tipo: 'ja_era' };
  } catch (e) {
    const motivo = (e as { details?: { motivo?: string } }).details?.motivo;
    // A recusa continua sendo recusa mesmo que o motivo mude de nome; o que
    // não pode acontecer é escrever antes de recusar.
    expect(escritas).toHaveLength(0);
    return { tipo: 'recusou', motivo };
  }
}

// ---------------------------------------------------------------------------
// A tabela: todo papel × marcador × tenant que o produto sabe produzir
// ---------------------------------------------------------------------------

const PAPEIS = [
  undefined,
  'athlete',
  'promoter',
  'tenant_staff',
  'tenant_owner',
  'platform_admin',
] as const;

const CRACHAS: { nome: string; cracha: Cracha }[] = [];
for (const role of PAPEIS) {
  for (const demotedFromRole of [undefined, 'tenant_owner'] as const) {
    for (const tenantId of [undefined, 'castelo'] as const) {
      CRACHAS.push({
        nome:
          `role=${role ?? '(nenhum)'}` +
          `${demotedFromRole === undefined ? '' : ' +demovida'}` +
          `${tenantId === undefined ? '' : ' +tenant'}`,
        cracha: {
          ...(role === undefined ? {} : { role }),
          ...(demotedFromRole === undefined ? {} : { demotedFromRole }),
          ...(tenantId === undefined ? {} : { tenantId }),
        },
      });
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('⚔ PONTE-ELEGIVEL-1 · a porta e o portão recusam a MESMA lista', () => {
  it('a tabela cobre os seis papéis, com e sem marcador, com e sem tenant', () => {
    // Se um papel novo nascer no core sem entrar aqui, este número muda e a
    // omissão aparece — a alternativa seria descobri-la em produção.
    expect(CRACHAS).toHaveLength(24);
  });

  for (const { nome, cracha } of CRACHAS) {
    it(`${nome} — a porta não cria doc para quem o portão recusaria`, async () => {
      const portaoAceita = await contaElegivelParaResgate(
        authComCracha(cracha),
        'uid-quem-clicou'
      );
      const desfecho = await baterNaPorta(cracha);

      if (portaoAceita) {
        // Elegível pelo portão: a porta não pode recusar. O contrário desta
        // lane — a porta mais dura que o portão — barraria o caso legítimo
        // mais comum do produto, que é a participante `athlete` limpa.
        expect(desfecho.tipo, nome).not.toBe('recusou');
        // E, quando ela não tem tenant no crachá, a travessia é a criação do
        // doc: é para isso que a ponte existe.
        if (cracha.tenantId === undefined) expect(desfecho.tipo, nome).toBe('criou');
        return;
      }

      // Inelegível pelo portão: em nenhuma hipótese a porta cria o documento
      // que faz a pessoa aterrissar no painel à espera de um código que o
      // portão nunca vai aceitar.
      expect(desfecho.tipo, nome).not.toBe('criou');
    });
  }
});

describe('⚔ PONTE-ELEGIVEL-1 · e a recusa tem nome, sem apagar as guardas anteriores', () => {
  it('quem já tem tenant continua atravessando com `jaExistia`, sem recusa nova', async () => {
    // `tenant_owner` e `tenant_staff` são inelegíveis pelo portão — e é certo
    // que sejam, porque já resgataram. A porta não pode virar uma recusa para
    // eles: eles JÁ estão do outro lado.
    for (const role of ['tenant_owner', 'tenant_staff']) {
      expect(await contaElegivelParaResgate(authComCracha({ role }), 'uid-quem-clicou')).toBe(
        false
      );
      expect(await baterNaPorta({ role, tenantId: 'castelo' })).toEqual({ tipo: 'ja_era' });
    }
  });

  it('a conta de plataforma continua caindo na recusa DELA, e não na nova', async () => {
    // RN-449 tem frase própria e papel literal. A régua de elegibilidade veio
    // depois dela e não a substitui.
    expect(await baterNaPorta({ role: 'platform_admin' })).toEqual({
      tipo: 'recusou',
      motivo: 'conta_de_plataforma',
    });
  });

  it('o divulgador e a rebaixada caem em `conta_inelegivel`, com nome', async () => {
    expect(await baterNaPorta({ role: 'promoter' })).toEqual({
      tipo: 'recusou',
      motivo: 'conta_inelegivel',
    });
    expect(await baterNaPorta({ role: 'athlete', demotedFromRole: 'tenant_owner' })).toEqual({
      tipo: 'recusou',
      motivo: 'conta_inelegivel',
    });
  });

  it('a participante comum e a conta sem papel algum continuam atravessando', async () => {
    expect(await baterNaPorta({ role: 'athlete' })).toEqual({ tipo: 'criou' });
    expect(await baterNaPorta({})).toEqual({ tipo: 'criou' });
  });
});

describe('⚔ PONTE-ELEGIVEL-1 · a régua é UMA, e o portão não guarda cópia', () => {
  it('o fail-open do portão é dele, e não vaza para a porta', async () => {
    // Ler o crachá pode falhar no portão (I/O de Auth), e lá o fail-open é
    // seguro porque o `provisionTenantCore` ainda guarda o caminho. A porta
    // não tem esse risco: ela lê o token que já chegou, sem I/O nenhum.
    const authQueFalha = {
      getUser: async () => {
        throw new Error('Auth fora do ar');
      },
    } as unknown as admin.auth.Auth;
    expect(await contaElegivelParaResgate(authQueFalha, 'uid-quem-clicou')).toBe(true);
  });

  it('nenhum dos dois arquivos reescreve a lista de papéis', async () => {
    // A prova mais barata contra a divergência voltar: a lista existe em UM
    // arquivo. Se alguém recopiar `promoter` ou `demotedFromRole` para dentro
    // da porta ou do portão, este caso cai.
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const semComentarios = (caminho: string): string =>
      readFileSync(resolve(__dirname, caminho), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' ');

    for (const arquivo of [
      '../platform/promoverParaProfissional.ts',
      '../platform/resgatarConviteOrganizador.ts',
    ]) {
      const fonte = semComentarios(arquivo);
      expect(fonte, arquivo).toContain('contaElegivelParaPapelDeOrganizador');
      expect(fonte, arquivo).not.toContain("'promoter'");
      expect(fonte, arquivo).not.toContain('demotedFromRole ===');
    }
  });
});
