import { describe, it, expect } from 'vitest';
import { PUBLIC_BASE, linkEventoPublico } from '../linkPublico';

describe('linkPublico', () => {
  it('linkEventoPublico monta a URL da landing na RAIZ (sem prefixo /e/)', () => {
    // Regressão do bug R10: o link antigo era `${origin}/e/${slug}` no painel.
    // A landing serve o evento na raiz: `${PUBLIC_BASE}/${slug}`.
    expect(linkEventoPublico('meia-floripa-2026')).toBe(`${PUBLIC_BASE}/meia-floripa-2026`);
    expect(linkEventoPublico('x')).not.toContain('/e/');
  });

  it('PUBLIC_BASE nunca termina em barra', () => {
    expect(PUBLIC_BASE.endsWith('/')).toBe(false);
  });
});
