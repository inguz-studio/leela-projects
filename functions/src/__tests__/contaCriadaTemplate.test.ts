/**
 * contaCriadaTemplate.test.ts — LEELA-CK2-T3 (RN-155 · template do e-mail
 * "conta criada, defina sua senha"). Mesma disciplina anti-phishing dos
 * templates existentes: escape total, link só http(s) montado pelo servidor,
 * caps de tamanho.
 */

import { describe, expect, it } from 'vitest';
import { renderContaCriadaEmail } from '../email/templates';

const LINK_OK = 'https://leela.app/__/auth/action?mode=resetPassword&oobCode=abc123';

describe('renderContaCriadaEmail (RN-155)', () => {
  it('renderiza assunto/html/texto com o link oficial', () => {
    const r = renderContaCriadaEmail({
      nomeComprador: 'Davi Estreante',
      nomeEvento: 'Meia de Floripa',
      linkDefinirSenha: LINK_OK,
    });
    expect(r.assunto).toContain('defina sua senha');
    expect(r.html).toContain('Davi Estreante');
    // No HTML o link vai ESCAPADO (& → &amp; — atributo href seguro)
    expect(r.html).toContain(LINK_OK.replace(/&/g, '&amp;'));
    // No texto puro o link vai literal (copiável)
    expect(r.texto).toContain(LINK_OK);
  });

  it('escapa HTML de nome/evento (anti-injeção — texto do organizador/comprador)', () => {
    const r = renderContaCriadaEmail({
      nomeComprador: '<script>alert(1)</script>',
      nomeEvento: 'Prova <img src=x onerror=1>',
      linkDefinirSenha: LINK_OK,
    });
    expect(r.html).not.toContain('<script>');
    // A moldura da marca (lane IDENTIDADE-EMAIL) traz um <img> legítimo: a
    // logo. O que não pode sobreviver é a TAG INJETADA pelo comprador.
    expect(r.html).not.toContain('<img src=x');
    expect(r.html).toContain('&lt;img src=x onerror=1&gt;');
    expect(r.html).toContain('&lt;script&gt;');
  });

  it('link fora do padrão do servidor LANÇA (nunca URL de terceiro)', () => {
    for (const link of ['javascript:alert(1)', 'ftp://x', '', 'https://x y"z']) {
      expect(() =>
        renderContaCriadaEmail({
          nomeComprador: 'A',
          nomeEvento: 'B',
          linkDefinirSenha: link,
        })
      ).toThrow(/linkDefinirSenha/);
    }
  });
});
