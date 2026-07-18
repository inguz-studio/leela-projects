/**
 * emailProvider.test.ts — LEELA-R9E · S-R9-14-T1/T3 (RN-137)
 *
 * Unit (sem emulator, sem rede): port EmailProvider + BrevoProvider com HTTP
 * MOCKADO (TODO da spec — a chave real NÃO existe; e2e é opt-in BREVO_E2E) +
 * seletor fail-closed.
 *
 * Invariantes:
 *   E1. selectEmailProvider SEM chave → null (fail-closed: consumidores
 *       mantêm o comportamento vigente).
 *   E2. COM chave inválida (prefixo/sender) → LANÇA (nunca null/mock).
 *   E3. COM chave válida → BrevoProvider memoizado por fingerprint.
 *   E4. Envio feliz: POST no endpoint com header api-key, body com
 *       sender/to/subject/htmlContent; devolve messageId.
 *   E5. HTTP não-2xx → BrevoSendError com STATUS, mensagem SEM chave e SEM
 *       eco do corpo.
 *   E6. Erro de rede → mensagem opaca (sem URL/headers).
 *   E7. Assunto multi-linha vira linha única na borda (defesa em
 *       profundidade — o template já sanitiza).
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  BREVO_SMTP_ENDPOINT,
  BrevoConfigError,
  BrevoSendError,
  brevoConfigFromEnv,
  createBrevoProvider,
} from '../email/brevoProvider';
import {
  hasBrevoKey,
  resetEmailProviderCache,
  selectEmailProvider,
} from '../email/selectEmailProvider';

const KEY = 'xkeysib-0123456789abcdef-teste';
const ENV_OK = {
  BREVO_API_KEY: KEY,
  BREVO_SENDER_EMAIL: 'noreply@leela.dev',
  BREVO_SENDER_NAME: 'Leela',
};

type Chamada = { url: string; init: { method: string; headers: Record<string, string>; body: string } };

function fetchMock(status: number, jsonBody: unknown) {
  const chamadas: Chamada[] = [];
  const fn = async (url: string, init: Chamada['init']) => {
    chamadas.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => jsonBody,
      text: async () => JSON.stringify(jsonBody),
    };
  };
  return { fn, chamadas };
}

const paramsOk = {
  to: { email: 'destino@exemplo.com', nome: 'Destino' },
  assunto: 'Convite para divulgar',
  html: '<p>oi</p>',
  texto: 'oi',
  tag: 'teste',
};

afterEach(() => resetEmailProviderCache());

describe('brevoConfigFromEnv (E2 — fail-hard)', () => {
  it('chave ausente lança', () => {
    expect(() => brevoConfigFromEnv({})).toThrow(BrevoConfigError);
  });

  it('prefixo estranho lança (colagem de chave errada) SEM ecoar o valor', () => {
    const err = (() => {
      try {
        brevoConfigFromEnv({ ...ENV_OK, BREVO_API_KEY: 'sk-outro-provedor-123' });
        return null;
      } catch (e) {
        return e as Error;
      }
    })();
    expect(err).toBeInstanceOf(BrevoConfigError);
    expect(err?.message).not.toContain('sk-outro');
  });

  it('sender ausente/inválido lança (remetente verificado é obrigatório)', () => {
    expect(() =>
      brevoConfigFromEnv({ BREVO_API_KEY: KEY })
    ).toThrow(/BREVO_SENDER_EMAIL/);
    expect(() =>
      brevoConfigFromEnv({ BREVO_API_KEY: KEY, BREVO_SENDER_EMAIL: 'nao-eh-email' })
    ).toThrow(BrevoConfigError);
  });

  it('config válida deriva sender + nome default', () => {
    const c = brevoConfigFromEnv({ BREVO_API_KEY: KEY, BREVO_SENDER_EMAIL: 'x@y.dev' });
    expect(c.senderName).toBe('Leela');
    expect(c.senderEmail).toBe('x@y.dev');
  });
});

describe('selectEmailProvider (E1/E3)', () => {
  it('sem chave → null (fail-closed); chave vazia/whitespace idem', () => {
    expect(selectEmailProvider({})).toBeNull();
    expect(selectEmailProvider({ BREVO_API_KEY: '   ' })).toBeNull();
    expect(hasBrevoKey({ BREVO_API_KEY: '' })).toBe(false);
  });

  it('chave presente + config inválida → LANÇA (nunca null)', () => {
    expect(() => selectEmailProvider({ BREVO_API_KEY: 'lixo' })).toThrow(
      BrevoConfigError
    );
  });

  it('chave válida → provider brevo, memoizado por fingerprint', () => {
    const p1 = selectEmailProvider(ENV_OK);
    const p2 = selectEmailProvider({ ...ENV_OK });
    expect(p1?.name).toBe('brevo');
    expect(p2).toBe(p1);
    // Rotação de chave invalida a memoização
    const p3 = selectEmailProvider({ ...ENV_OK, BREVO_API_KEY: `${KEY}-v2` });
    expect(p3).not.toBe(p1);
  });
});

describe('createBrevoProvider.sendTransactional (E4..E7 — HTTP mockado)', () => {
  const config = brevoConfigFromEnv(ENV_OK);

  it('E4: envio feliz — endpoint, header api-key, body correto, messageId', async () => {
    const { fn, chamadas } = fetchMock(201, { messageId: '<msg-1@brevo>' });
    const provider = createBrevoProvider(config, fn);
    const r = await provider.sendTransactional(paramsOk);
    expect(r).toEqual({ ok: true, messageId: '<msg-1@brevo>' });
    expect(chamadas).toHaveLength(1);
    const c = chamadas[0]!;
    expect(c.url).toBe(BREVO_SMTP_ENDPOINT);
    expect(c.init.method).toBe('POST');
    expect(c.init.headers['api-key']).toBe(KEY);
    const body = JSON.parse(c.init.body) as Record<string, unknown>;
    expect(body['sender']).toEqual({ email: 'noreply@leela.dev', name: 'Leela' });
    expect(body['to']).toEqual([{ email: 'destino@exemplo.com', name: 'Destino' }]);
    expect(body['subject']).toBe('Convite para divulgar');
    expect(body['htmlContent']).toBe('<p>oi</p>');
    expect(body['tags']).toEqual(['teste']);
  });

  it('E5: 4xx → BrevoSendError com status; mensagem sem chave e sem corpo', async () => {
    const { fn } = fetchMock(401, { code: 'unauthorized', message: 'Key not found' });
    const provider = createBrevoProvider(config, fn);
    const err = await provider.sendTransactional(paramsOk).catch((e) => e as BrevoSendError);
    expect(err).toBeInstanceOf(BrevoSendError);
    expect((err as BrevoSendError).httpStatus).toBe(401);
    expect((err as BrevoSendError).message).not.toContain(KEY);
    expect((err as BrevoSendError).message).not.toContain('Key not found');
  });

  it('E6: erro de rede → mensagem opaca', async () => {
    const provider = createBrevoProvider(config, async () => {
      throw new Error(`connect ECONNREFUSED ${BREVO_SMTP_ENDPOINT}?apikey=${KEY}`);
    });
    const err = await provider.sendTransactional(paramsOk).catch((e) => e as BrevoSendError);
    expect(err).toBeInstanceOf(BrevoSendError);
    expect((err as BrevoSendError).message).not.toContain(KEY);
    expect((err as BrevoSendError).message).toMatch(/rede/i);
  });

  it('E7: assunto com CR/LF vira linha única; destinatário/conteúdo vazios negam', async () => {
    const { fn, chamadas } = fetchMock(201, {});
    const provider = createBrevoProvider(config, fn);
    await provider.sendTransactional({
      ...paramsOk,
      assunto: 'linha1\r\nBcc: vilao@mal.dev\nlinha2',
    });
    const body = JSON.parse(chamadas[0]!.init.body) as { subject: string };
    expect(body.subject).toBe('linha1 Bcc: vilao@mal.dev linha2');
    expect(body.subject).not.toMatch(/[\r\n]/);

    await expect(
      provider.sendTransactional({ ...paramsOk, to: { email: 'sem-arroba' } })
    ).rejects.toThrow(BrevoSendError);
    await expect(
      provider.sendTransactional({ ...paramsOk, html: '' })
    ).rejects.toThrow(BrevoSendError);
  });
});
