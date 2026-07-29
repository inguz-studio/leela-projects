/**
 * ingresso-sentry-scrub.test.ts — review INGPAGE-REV, achado 2 (RN-419/RN-422).
 *
 * O token de `/ingresso/{token}` é credencial portadora e não expira (D-ING-5).
 * A lane S1214 fechou os quatro vazamentos que a RN-419 listou (`Referer`,
 * cache/CDN, índice de buscador, histórico), e deixou aberto o quinto: o SDK de
 * observabilidade já montado nesta aplicação, com `tracesSampleRate: 1.0` — uma
 * transação por pageview, cada uma carregando `request.url`.
 *
 * Estes casos prendem o scrubber. Se alguém remover `beforeSend`/
 * `beforeSendTransaction` dos configs, ou afrouxar o regex, o token volta a
 * aparecer e estas asserções mordem.
 */

import { describe, expect, it } from 'vitest';
import {
  redigirProfundo,
  redigirTokenIngresso,
  scrubSentryEvent,
} from '../lib/sentryScrub';

/** Token com a forma real do `LLIP1` (4 partes, alfabeto base64url). */
const TOKEN =
  'LLIP1.k1.eyJpIjoiaW5zYy0xIiwiZSI6ImV2LTEiLCJ0IjoidGVuLTEifQ.Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4';

describe('scrubber do token do ingresso', () => {
  it('redige o token dentro de uma URL', () => {
    const saida = redigirTokenIngresso(`https://leela.app/ingresso/${TOKEN}`);
    expect(saida).not.toContain(TOKEN);
    expect(saida).toContain('/ingresso/[token]');
  });

  it('redige o token SOLTO, fora de uma URL', () => {
    const saida = redigirTokenIngresso(`falhou ao verificar ${TOKEN} no keyring`);
    expect(saida).not.toContain(TOKEN);
  });

  it('redige a versão imprimível, que também carrega o token', () => {
    const saida = redigirTokenIngresso(`/ingresso/${TOKEN}/imprimir`);
    expect(saida).not.toContain(TOKEN);
  });

  it('redige QUALQUER segmento após /ingresso/, mesmo se o formato do token mudar', () => {
    const saida = redigirTokenIngresso('/ingresso/LLIP2.qualquer.coisa.nova');
    expect(saida).toBe('/ingresso/[token]');
  });

  it('não estraga uma URL que não é da rota do ingresso', () => {
    const url = 'https://leela.app/corrida-inverno-floripa-2026';
    expect(redigirTokenIngresso(url)).toBe(url);
  });

  it('varre o evento INTEIRO: url, transaction, breadcrumb, tag e extra', () => {
    const evento = {
      transaction: `GET /ingresso/${TOKEN}`,
      request: {
        url: `https://leela.app/ingresso/${TOKEN}`,
        headers: { referer: `https://leela.app/ingresso/${TOKEN}` },
      },
      tags: { rota: `/ingresso/${TOKEN}` },
      contexts: { trace: { data: { 'http.url': `https://leela.app/ingresso/${TOKEN}` } } },
      breadcrumbs: [
        { category: 'navigation', data: { to: `/ingresso/${TOKEN}`, from: '/' } },
      ],
      extra: { nested: { deep: [{ valor: `/ingresso/${TOKEN}/imprimir` }] } },
      message: `erro renderizando /ingresso/${TOKEN}`,
    };

    const limpo = scrubSentryEvent(evento);

    // A prova que importa: o token não sobrevive em NENHUM lugar do payload.
    expect(JSON.stringify(limpo)).not.toContain(TOKEN);
    // …e o evento continua útil para depurar (a rota permanece legível).
    expect(JSON.stringify(limpo)).toContain('/ingresso/[token]');
    // A forma do objeto é preservada — o scrubber não pode destruir o evento.
    expect(limpo.breadcrumbs[0]?.data.from).toBe('/');
    expect(limpo.request.headers.referer).not.toContain(TOKEN);
  });

  it('preserva tipos não-string (números, booleanos, null)', () => {
    const entrada = { n: 42, b: true, z: null, s: `/ingresso/${TOKEN}` };
    const saida = redigirProfundo(entrada);
    expect(saida.n).toBe(42);
    expect(saida.b).toBe(true);
    expect(saida.z).toBeNull();
    expect(saida.s).toBe('/ingresso/[token]');
  });

  it('os TRÊS configs do Sentry declaram o scrubber (client, server, edge)', async () => {
    // Lê os arquivos de verdade, não uma cópia da intenção: remover o
    // `beforeSend` de qualquer um dos três derruba este caso.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    for (const arquivo of [
      'sentry.client.config.ts',
      'sentry.server.config.ts',
      'sentry.edge.config.ts',
    ]) {
      const fonte = readFileSync(resolve(__dirname, '..', arquivo), 'utf8');
      expect(fonte, `${arquivo} sem scrubber`).toContain('beforeSend: scrubSentryEvent');
      expect(fonte, `${arquivo} sem scrubber de transação`).toContain(
        'beforeSendTransaction: scrubSentryEvent'
      );
    }
  });
});
