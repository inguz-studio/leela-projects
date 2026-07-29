// =============================================================================
// apps/landing/test/ingresso-privacidade-rota.test.ts
//
// Os TRÊS cabeçalhos da RN-422 e o `robots.txt` — provados sobre a configuração
// de verdade, não sobre uma cópia da intenção (S1214-T2).
//
// Por que testar config em vez de resposta HTTP: `headers()` do Next é a fonte
// única desses cabeçalhos, e um teste que sobe o servidor para conferir três
// strings custa minutos de suíte para provar o mesmo. A prova de que o Next
// aplica o que está declarado ali vem do curl pós-deploy, que está no handoff.
// =============================================================================

import { describe, expect, it } from 'vitest';
import robots from '../app/robots';

interface RegraHeaders {
  source: string;
  headers: { key: string; value: string }[];
}

// `next.config.js` é CJS e é a FONTE dos cabeçalhos — o teste lê o arquivo de
// verdade, não uma cópia da intenção.
const nextConfig = require('../next.config.js') as {
  headers?: () => Promise<RegraHeaders[]>;
};

describe('cabeçalhos de privacidade da rota do ingresso (RN-422)', () => {
  it('a rota `/ingresso/:token*` está declarada no headers() do Next', async () => {
    const regras = (await nextConfig.headers?.()) ?? [];
    const regra = regras.find((r) => r.source.startsWith('/ingresso'));
    expect(regra).toBeDefined();
    // O `*` é o que faz a regra cobrir também a versão imprimível (T4).
    expect(regra?.source).toBe('/ingresso/:token*');
  });

  it.each([
    ['Cache-Control', 'no-store'],
    ['Referrer-Policy', 'no-referrer'],
    ['X-Robots-Tag', 'noindex, nofollow'],
  ])('%s = %s', async (chave, valor) => {
    const regras = (await nextConfig.headers?.()) ?? [];
    const regra = regras.find((r) => r.source.startsWith('/ingresso'));
    const encontrado = regra?.headers.find((h) => h.key === chave);
    expect(encontrado?.value).toBe(valor);
  });

  it('os três cabeçalhos estão TODOS presentes — nenhum sobrou pelo caminho', async () => {
    const regras = (await nextConfig.headers?.()) ?? [];
    const regra = regras.find((r) => r.source.startsWith('/ingresso'));
    expect((regra?.headers ?? []).map((h) => h.key).sort()).toEqual([
      'Cache-Control',
      'Referrer-Policy',
      'X-Robots-Tag',
    ]);
  });
});

describe('robots.txt (RN-422)', () => {
  it('`/ingresso` está no disallow, junto das demais transacionais', () => {
    const regras = robots().rules as { disallow?: string[] };
    expect(regras.disallow).toContain('/ingresso');
    // As que já existiam continuam lá — a regra é acréscimo, não reescrita.
    expect(regras.disallow).toContain('/convite');
    expect(regras.disallow).toContain('/*/inscricao');
    expect(regras.disallow).toContain('/health');
  });
});
