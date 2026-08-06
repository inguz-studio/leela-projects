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
 *
 * Acrescentado pela lane DIAG-SENHA (trace leela-pixreal-diag-20260804), a
 * partir da falha REAL de 2026-08-05T11:43:11Z:
 *
 *   S8. Endereço sem conta continua sendo "conta inexistente" mesmo com a
 *       proteção de enumeração do Auth ligada — que é quando o SDK devolve um
 *       assert genérico em vez de `auth/user-not-found`.
 *   S9. O rótulo do desfecho não mente: exceção antes do envio não se chama
 *       `falha_envio`.
 *  S10. Falha aqui é INCIDENTE, com o campo que a política de alerta casa.
 */
import type * as admin from 'firebase-admin';
import type { EmailProvider } from '@leela/core';
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as logger from 'firebase-functions/logger';
import { ALERTA_EMAIL_TRANSACIONAL } from '../email/incidenteEmail';
import {
  actionCodeSettingsSenha,
  basePainel,
  classificarFalhaDeLink,
  MSG_SEM_OOB_LINK,
  PAINEL_URL_PADRAO,
  ROTA_APOS_DEFINIR_SENHA,
  ROTA_REDEFINIR_SENHA,
  reescreverParaOPainel,
} from '../auth/linkDeAcao';
import {
  janelaDoEmail,
  LIMITE_POR_EMAIL,
  redefinicaoAuthAdmin,
  solicitarRedefinicaoComTempoConstante,
  solicitarRedefinicaoCore,
  type AuthSdkDeLinkSenha,
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

// ---------------------------------------------------------------------------
// S8/S9/S10 — a falha de 2026-08-05T11:43:11Z (lane DIAG-SENHA)
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * O erro EXATO que a produção cuspiu. `code` e `message` são os que o
 * `firebase-admin` monta em `auth-api-request.js` quando o Identity Toolkit
 * responde 200 SEM `oobLink` — o que a proteção de enumeração faz para
 * endereço sem conta.
 */
function erroDaProtecaoDeEnumeracao(): Error {
  const err = new Error(
    'INTERNAL ASSERT FAILED: Unable to create the email action link'
  );
  (err as Error & { code: string }).code = 'auth/internal-error';
  return err;
}

function erroComCodigo(code: string, message = 'erro do auth'): Error {
  const err = new Error(message);
  (err as Error & { code: string }).code = code;
  return err;
}

/** Costura do SDK que sempre falha do mesmo jeito. */
function sdkQueFalha(err: Error, aoDegradar?: Error | string): AuthSdkDeLinkSenha {
  return {
    gerarLink: async (_email, settings) => {
      if (settings === undefined) {
        if (aoDegradar instanceof Error) throw aoDegradar;
        if (typeof aoDegradar === 'string') return aoDegradar;
      }
      throw err;
    },
    nomeExibicao: async () => 'Marina Alves',
  };
}

describe('S8 · endereço sem conta é "sem conta", não é falha de infra', () => {
  it('a frase do assert do SDK é lida como conta inexistente', () => {
    expect(classificarFalhaDeLink(erroDaProtecaoDeEnumeracao())).toBe('sem_conta');
    // A constante e a mensagem real não podem divergir: é a única evidência
    // que o SDK entrega, e o ramo inteiro depende dela.
    expect(erroDaProtecaoDeEnumeracao().message).toContain(MSG_SEM_OOB_LINK);
  });

  it('o dialeto clássico do Auth continua valendo', () => {
    expect(classificarFalhaDeLink(erroComCodigo('auth/user-not-found'))).toBe('sem_conta');
    expect(classificarFalhaDeLink(erroComCodigo('auth/email-not-found'))).toBe('sem_conta');
  });

  it('continueUrl recusada é a SUA causa, não "sem conta"', () => {
    for (const code of [
      'auth/invalid-continue-uri',
      'auth/unauthorized-continue-uri',
      'auth/missing-continue-uri',
    ]) {
      expect(classificarFalhaDeLink(erroComCodigo(code))).toBe('continue_uri_recusada');
    }
  });

  it('infra de verdade NÃO vira "sem conta" silenciosa', () => {
    // O par código+frase é o que decide. `auth/internal-error` sozinho é o
    // código genérico do SDK: engoli-lo esconderia quota, IAM e rede.
    expect(classificarFalhaDeLink(erroComCodigo('auth/internal-error'))).toBe('desconhecida');
    expect(classificarFalhaDeLink(new Error(MSG_SEM_OOB_LINK))).toBe('desconhecida');
    expect(classificarFalhaDeLink(erroComCodigo('auth/quota-exceeded'))).toBe('desconhecida');
    expect(classificarFalhaDeLink(null)).toBe('desconhecida');
    expect(classificarFalhaDeLink('string solta')).toBe('desconhecida');
  });

  it('o adapter devolve null (não lança) para o erro real de produção', async () => {
    const auth = redefinicaoAuthAdmin(ENV, sdkQueFalha(erroDaProtecaoDeEnumeracao()));
    await expect(auth.gerarLinkRedefinicao('naoexiste@exemplo.test', 'organizador'))
      .resolves.toBeNull();
  });

  it('e o desfecho volta a ser conta_inexistente, sem gastar a Brevo', async () => {
    const provider = providerFake();
    const desfecho = await solicitarRedefinicaoCore(
      dbQueLibera(),
      redefinicaoAuthAdmin(ENV, sdkQueFalha(erroDaProtecaoDeEnumeracao())),
      provider,
      { email: 'naoexiste@exemplo.test' }
    );
    expect(desfecho).toBe('conta_inexistente');
    expect(provider.enviados).toHaveLength(0);
  });

  it('erro desconhecido continua SUBINDO pelo adapter', async () => {
    const auth = redefinicaoAuthAdmin(ENV, sdkQueFalha(erroComCodigo('auth/quota-exceeded')));
    await expect(
      auth.gerarLinkRedefinicao('existe@exemplo.test', 'organizador')
    ).rejects.toThrow('erro do auth');
  });

  it('continueUrl recusada degrada para o link sem settings', async () => {
    const auth = redefinicaoAuthAdmin(
      ENV,
      sdkQueFalha(erroComCodigo('auth/unauthorized-continue-uri'), LINK_FIREBASE)
    );
    await expect(
      auth.gerarLinkRedefinicao('existe@exemplo.test', 'organizador')
    ).resolves.toBe(LINK_FIREBASE);
  });

  it('degradação que esbarra na proteção de enumeração também devolve null', async () => {
    const auth = redefinicaoAuthAdmin(
      ENV,
      sdkQueFalha(
        erroComCodigo('auth/unauthorized-continue-uri'),
        erroDaProtecaoDeEnumeracao()
      )
    );
    await expect(
      auth.gerarLinkRedefinicao('naoexiste@exemplo.test', 'organizador')
    ).resolves.toBeNull();
  });

  it('nomeDaConta engole a falha do SDK e não derruba o fluxo', async () => {
    const auth = redefinicaoAuthAdmin(ENV, {
      gerarLink: async () => LINK_FIREBASE,
      nomeExibicao: async () => {
        throw erroComCodigo('auth/user-not-found');
      },
    });
    await expect(auth.nomeDaConta('x@exemplo.test')).resolves.toBe('');
  });
});

describe('S9 · o rótulo do desfecho não mente', () => {
  it('exceção antes do envio NÃO se chama falha_envio', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await solicitarRedefinicaoComTempoConstante(
      dbQueLibera(),
      {
        gerarLinkRedefinicao: async () => {
          throw erroComCodigo('auth/quota-exceeded');
        },
        nomeDaConta: async () => '',
      },
      providerFake(),
      { email: 'existe@exemplo.test' },
      new Date(),
      5
    );
    expect(info).toHaveBeenCalledWith('reset_senha', { desfecho: 'erro_inesperado' });
  });

  it('a Brevo recusando CONTINUA se chamando falha_envio', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const recusa = {
      sendTransactional: async () => {
        throw new Error('401 unauthorized');
      },
    } as unknown as EmailProvider;
    const desfecho = await solicitarRedefinicaoCore(
      dbQueLibera(),
      authComConta(),
      recusa,
      { email: 'existe@exemplo.test' }
    );
    expect(desfecho).toBe('falha_envio');
  });
});

describe('S10 · a falha vira incidente com o campo que a política casa', () => {
  it('a recusa da Brevo carrega alerta, severidade e tipo', async () => {
    const erro = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const recusa = {
      sendTransactional: async () => {
        throw new Error('401 unauthorized');
      },
    } as unknown as EmailProvider;
    await solicitarRedefinicaoCore(dbQueLibera(), authComConta(), recusa, {
      email: 'marina@exemplo.test',
    });

    expect(erro).toHaveBeenCalledTimes(1);
    const [evento, payload] = erro.mock.calls[0] as [string, Record<string, unknown>];
    // O NOME do evento é preservado — quem já consulta por ele continua achando.
    expect(evento).toBe('reset_senha_email_falhou');
    expect(payload['alerta']).toBe(ALERTA_EMAIL_TRANSACIONAL);
    expect(payload['severidade']).toBe('critico');
    expect(payload['tipo']).toBe('redefinir_senha');
    // LGPD: nem o e-mail nem o nome entram no incidente.
    const serializado = JSON.stringify(payload);
    expect(serializado).not.toContain('marina@exemplo.test');
    expect(serializado).not.toContain('Marina');
  });

  it('a exceção inesperada também dispara alerta (o silêncio de 05/08)', async () => {
    const erro = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    await solicitarRedefinicaoComTempoConstante(
      dbQueLibera(),
      {
        gerarLinkRedefinicao: async () => {
          throw erroComCodigo('auth/quota-exceeded');
        },
        nomeDaConta: async () => '',
      },
      providerFake(),
      { email: 'existe@exemplo.test' },
      new Date(),
      5
    );
    const [evento, payload] = erro.mock.calls[0] as [string, Record<string, unknown>];
    expect(evento).toBe('reset_senha_falhou');
    expect(payload['alerta']).toBe(ALERTA_EMAIL_TRANSACIONAL);
    expect(payload['severidade']).toBe('critico');
  });

  it('o caminho de 05/08 não alerta mais — porque não é mais falha', async () => {
    const erro = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    await solicitarRedefinicaoComTempoConstante(
      dbQueLibera(),
      redefinicaoAuthAdmin(ENV, sdkQueFalha(erroDaProtecaoDeEnumeracao())),
      providerFake(),
      { email: 'naoexiste@exemplo.test' },
      new Date(),
      5
    );
    expect(erro).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('reset_senha', { desfecho: 'conta_inexistente' });
  });
});
