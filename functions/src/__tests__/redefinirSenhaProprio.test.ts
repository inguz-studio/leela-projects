/**
 * redefinirSenhaProprio.test.ts — lane IDENTIDADE-EMAIL (trace
 * leela-build-2d6ee98d · T3 + T4)
 *
 * O fluxo de senha deixou de ser do Firebase e passou a ser nosso. As
 * propriedades que este teste guarda:
 *
 *   S1. O e-mail enviado é o NOSSO template, com a marca, pela Brevo.
 *   S2. ANTI-ENUMERAÇÃO POR MENSAGEM: a resposta é idêntica exista ou não a
 *       conta, e nenhum erro sobe para o cliente em nenhum desfecho.
 *   S3. ANTI-ENUMERAÇÃO POR RELÓGIO: o caminho caro (conta existe, e-mail sai)
 *       e o barato (conta não existe) levam o MESMO tempo. Sem o
 *       acolchoamento, a diferença é oráculo tão bom quanto uma mensagem.
 *   S4. Rate limit por e-mail hasheado, e o estouro também responde neutro.
 *   S5. O link do e-mail cai numa TELA NOSSA, levando o `oobCode` junto.
 *   S6. `actionCodeSettings` existe e aponta para o painel (a lacuna que o
 *       laudo INV-EMAIL-INGRESSO marcou como P2).
 *   S7. Degradação honesta: link torto ou sem `oobCode` volta o original, em
 *       vez de produzir um link de recuperação quebrado.
 */
import type * as admin from 'firebase-admin';
import type { EmailProvider } from '@leela/core';
import { describe, expect, it, vi } from 'vitest';
import {
  actionCodeSettingsSenha,
  basePainel,
  PAINEL_URL_PADRAO,
  ROTA_APOS_DEFINIR_SENHA,
  ROTA_REDEFINIR_SENHA,
  reescreverParaOPainel,
} from '../auth/linkDeAcao';
import {
  janelaDoEmail,
  LIMITE_POR_EMAIL,
  solicitarRedefinicaoComTempoConstante,
  solicitarRedefinicaoCore,
  type RedefinicaoAuth,
} from '../auth/solicitarRedefinicaoSenha';

// ---------------------------------------------------------------------------
// Dublês
// ---------------------------------------------------------------------------

const PAINEL = 'https://painel.test';
const ENV = { LEELA_PAINEL_URL: PAINEL };

/** Firestore mínimo para o `consumirRateLimit` — balde sempre vazio. */
function dbQueLibera(): admin.firestore.Firestore {
  return {
    collection: () => ({ doc: (id: string) => ({ id }) }),
    runTransaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({ get: async () => ({ get: () => undefined }), set: () => undefined }),
  } as unknown as admin.firestore.Firestore;
}

/** Firestore que faz o balde estourar (transação sempre com marcos cheios). */
function dbQueEstoura(): admin.firestore.Firestore {
  const marcos = Array.from({ length: LIMITE_POR_EMAIL }, () => Date.now());
  return {
    collection: () => ({ doc: (id: string) => ({ id }) }),
    runTransaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        get: async () => ({ get: (campo: string) => (campo === 'marcos' ? marcos : undefined) }),
        set: () => undefined,
      }),
  } as unknown as admin.firestore.Firestore;
}

const LINK_FIREBASE =
  'https://leela-hub.firebaseapp.com/__/auth/action' +
  '?mode=resetPassword&oobCode=OOB-abc123&apiKey=AIzaFake&lang=pt-BR';

function authComConta(nome = 'Marina Alves'): RedefinicaoAuth {
  return {
    gerarLinkRedefinicao: async () => LINK_FIREBASE,
    nomeDaConta: async () => nome,
  };
}

const authSemConta: RedefinicaoAuth = {
  gerarLinkRedefinicao: async () => null,
  nomeDaConta: async () => '',
};

function providerFake(): EmailProvider & { enviados: unknown[] } {
  const enviados: unknown[] = [];
  return {
    enviados,
    sendTransactional: async (msg: unknown) => {
      enviados.push(msg);
      return { id: 'fake' } as never;
    },
  } as unknown as EmailProvider & { enviados: unknown[] };
}

// ---------------------------------------------------------------------------
// S1 — o e-mail é o nosso
// ---------------------------------------------------------------------------

describe('S1 · o e-mail de senha é o nosso template, pela Brevo', () => {
  it('envia com a marca, com o assunto da casa e a tag do fluxo', async () => {
    const provider = providerFake();
    const desfecho = await solicitarRedefinicaoCore(
      dbQueLibera(),
      authComConta(),
      provider,
      { email: 'Marina@Exemplo.TEST' }
    );

    expect(desfecho).toBe('enviado');
    expect(provider.enviados).toHaveLength(1);
    const msg = provider.enviados[0] as {
      to: { email: string; nome?: string };
      assunto: string;
      html: string;
      texto: string;
      tag: string;
    };
    expect(msg.to.email).toBe('marina@exemplo.test'); // normalizado
    expect(msg.to.nome).toBe('Marina Alves');
    expect(msg.tag).toBe('redefinir-senha');
    expect(msg.assunto).toContain('Leela');
    // A moldura da marca — o que o template do Firebase nunca teve.
    expect(msg.html).toContain('leela-wordmark-email.png');
    expect(msg.html).toContain('alt="Leela"');
    expect(msg.texto).toContain('Leela');
  });

  it('conta sem nome de exibição não quebra a saudação', async () => {
    const provider = providerFake();
    await solicitarRedefinicaoCore(
      dbQueLibera(),
      { gerarLinkRedefinicao: async () => LINK_FIREBASE, nomeDaConta: async () => '' },
      provider,
      { email: 'anon@exemplo.test' }
    );
    const msg = provider.enviados[0] as { to: { nome?: string }; texto: string };
    expect(msg.to.nome).toBeUndefined();
    expect(msg.texto.startsWith('Recebemos um pedido')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// S2 — anti-enumeração por mensagem
// ---------------------------------------------------------------------------

describe('S2 · a resposta não revela se a conta existe', () => {
  const casos: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
    [
      'conta existe',
      () =>
        solicitarRedefinicaoComTempoConstante(
          dbQueLibera(),
          authComConta(),
          providerFake(),
          { email: 'existe@exemplo.test' },
          new Date(),
          5
        ),
    ],
    [
      'conta não existe',
      () =>
        solicitarRedefinicaoComTempoConstante(
          dbQueLibera(),
          authSemConta,
          providerFake(),
          { email: 'naoexiste@exemplo.test' },
          new Date(),
          5
        ),
    ],
    [
      'e-mail inválido',
      () =>
        solicitarRedefinicaoComTempoConstante(
          dbQueLibera(),
          authComConta(),
          providerFake(),
          { email: 'nao-e-email' },
          new Date(),
          5
        ),
    ],
    [
      'sem chave da Brevo (fail-closed RN-137)',
      () =>
        solicitarRedefinicaoComTempoConstante(
          dbQueLibera(),
          authComConta(),
          null,
          { email: 'existe@exemplo.test' },
          new Date(),
          5
        ),
    ],
    [
      'limite estourado',
      () =>
        solicitarRedefinicaoComTempoConstante(
          dbQueEstoura(),
          authComConta(),
          providerFake(),
          { email: 'existe@exemplo.test' },
          new Date(),
          5
        ),
    ],
    [
      'Auth fora do ar',
      () =>
        solicitarRedefinicaoComTempoConstante(
          dbQueLibera(),
          {
            gerarLinkRedefinicao: async () => {
              throw new Error('auth indisponível');
            },
            nomeDaConta: async () => '',
          },
          providerFake(),
          { email: 'existe@exemplo.test' },
          new Date(),
          5
        ),
    ],
    [
      'entrada sem campo email',
      () =>
        solicitarRedefinicaoComTempoConstante(
          dbQueLibera(),
          authComConta(),
          providerFake(),
          {},
          new Date(),
          5
        ),
    ],
  ];

  for (const [nome, executar] of casos) {
    it(`${nome}: responde { ok: true } e não lança`, async () => {
      await expect(executar()).resolves.toEqual({ ok: true });
    });
  }

  it('conta inexistente não gasta a Brevo', async () => {
    const provider = providerFake();
    const desfecho = await solicitarRedefinicaoCore(
      dbQueLibera(),
      authSemConta,
      provider,
      { email: 'naoexiste@exemplo.test' }
    );
    expect(desfecho).toBe('conta_inexistente');
    expect(provider.enviados).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// S3 — anti-enumeração por relógio
// ---------------------------------------------------------------------------

describe('S3 · o tempo de resposta não vira oráculo', () => {
  it('caminho caro e caminho barato levam o mesmo tempo', async () => {
    const PISO = 260;

    // Conta existente com um envio LENTO de propósito: é essa lentidão que,
    // sem acolchoamento, denunciaria a existência da conta.
    const lento = {
      sendTransactional: async () => {
        await new Promise((r) => setTimeout(r, 120));
        return { id: 'fake' } as never;
      },
    } as unknown as EmailProvider;

    const t0 = Date.now();
    await solicitarRedefinicaoComTempoConstante(
      dbQueLibera(),
      authComConta(),
      lento,
      { email: 'existe@exemplo.test' },
      new Date(),
      PISO
    );
    const comConta = Date.now() - t0;

    const t1 = Date.now();
    await solicitarRedefinicaoComTempoConstante(
      dbQueLibera(),
      authSemConta,
      providerFake(),
      { email: 'naoexiste@exemplo.test' },
      new Date(),
      PISO
    );
    const semConta = Date.now() - t1;

    expect(comConta).toBeGreaterThanOrEqual(PISO - 20);
    expect(semConta).toBeGreaterThanOrEqual(PISO - 20);
    // A janela de 120ms do envio lento SUMIU dentro do piso.
    expect(Math.abs(comConta - semConta)).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// S4 — rate limit
// ---------------------------------------------------------------------------

describe('S4 · rate limit por e-mail hasheado', () => {
  it('a chave do balde nunca carrega o e-mail cru', () => {
    const janela = janelaDoEmail('marina@exemplo.test');
    expect(janela.chave.startsWith('reset-senha:')).toBe(true);
    expect(janela.chave).not.toContain('marina');
    expect(janela.chave).not.toContain('@');
    expect(janela.limite).toBe(LIMITE_POR_EMAIL);
  });

  it('e-mails diferentes caem em baldes diferentes', () => {
    expect(janelaDoEmail('a@x.test').chave).not.toBe(janelaDoEmail('b@x.test').chave);
  });

  it('estouro não gasta Auth nem Brevo', async () => {
    const provider = providerFake();
    const gerar = vi.fn(async () => LINK_FIREBASE);
    const desfecho = await solicitarRedefinicaoCore(
      dbQueEstoura(),
      { gerarLinkRedefinicao: gerar, nomeDaConta: async () => '' },
      provider,
      { email: 'existe@exemplo.test' }
    );
    expect(desfecho).toBe('limite_estourado');
    expect(gerar).not.toHaveBeenCalled();
    expect(provider.enviados).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// S5/S6/S7 — o link cai numa tela nossa
// ---------------------------------------------------------------------------

describe('S5 · o link do e-mail aterrissa numa tela da Leela', () => {
  it('reescreve o link do Firebase para a tela do painel, com o oobCode', () => {
    const reescrito = reescreverParaOPainel(LINK_FIREBASE, ENV);
    const url = new URL(reescrito);
    expect(url.origin).toBe(PAINEL);
    expect(url.pathname).toBe(ROTA_REDEFINIR_SENHA);
    expect(url.searchParams.get('oobCode')).toBe('OOB-abc123');
    expect(url.searchParams.get('mode')).toBe('resetPassword');
    expect(url.searchParams.get('lang')).toBe('pt-BR');
    expect(reescrito).not.toContain('firebaseapp.com');
  });

  it('o e-mail sai com o link do painel, não com o do Firebase', async () => {
    const provider = providerFake();
    await solicitarRedefinicaoCore(dbQueLibera(), authComConta(), provider, {
      email: 'marina@exemplo.test',
    });
    const msg = provider.enviados[0] as { html: string; texto: string };
    // O default do `basePainel` (sem env) é o canal live do painel.
    expect(msg.texto).toContain(`${PAINEL_URL_PADRAO}${ROTA_REDEFINIR_SENHA}`);
    expect(msg.texto).toContain('oobCode=OOB-abc123');
    expect(msg.html).not.toContain('firebaseapp.com');
  });
});

describe('S6 · actionCodeSettings existe e aponta para o painel', () => {
  it('monta a URL de continuação na base do painel', () => {
    // S1223-T2: a assinatura ganhou a ORIGEM na frente do env. Sem origem, o
    // default é `organizador` — o comportamento que este caso sempre afirmou.
    expect(actionCodeSettingsSenha('organizador', ENV)).toEqual({
      url: `${PAINEL}${ROTA_APOS_DEFINIR_SENHA}`,
      handleCodeInApp: false,
    });
  });

  it('sem env, cai no canal live do painel (nunca em link morto)', () => {
    expect(basePainel({})).toBe(PAINEL_URL_PADRAO);
  });

  it('aceita a MESMA variável que a landing já usa', () => {
    expect(basePainel({ NEXT_PUBLIC_PAINEL_URL: PAINEL })).toBe(PAINEL);
  });

  it('base torta não vira link torto em massa', () => {
    for (const torta of ['', '   ', 'painel.test', 'http://inseguro.test', 'https://a b']) {
      expect(basePainel({ LEELA_PAINEL_URL: torta })).toBe(PAINEL_URL_PADRAO);
    }
    expect(basePainel({ LEELA_PAINEL_URL: `${PAINEL}///` })).toBe(PAINEL);
  });
});

describe('S7 · degradação honesta da reescrita', () => {
  it('link sem oobCode volta intacto (melhor feio que quebrado)', () => {
    const semCodigo = 'https://leela-hub.firebaseapp.com/__/auth/action?mode=resetPassword';
    expect(reescreverParaOPainel(semCodigo, ENV)).toBe(semCodigo);
  });

  it('link que não parseia volta intacto', () => {
    expect(reescreverParaOPainel('nao-e-url', ENV)).toBe('nao-e-url');
  });

  it('o link reescrito continua válido para o template', async () => {
    // `isLinkDeAppValido` recusa espaço, aspas e afins; se a reescrita
    // produzisse algo torto, o template lançaria em vez de enviar.
    const provider = providerFake();
    const desfecho = await solicitarRedefinicaoCore(
      dbQueLibera(),
      authComConta(),
      provider,
      { email: 'marina@exemplo.test' }
    );
    expect(desfecho).toBe('enviado');
  });
});
