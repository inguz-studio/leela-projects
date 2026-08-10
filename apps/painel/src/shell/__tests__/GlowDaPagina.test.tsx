// =============================================================================
// GlowDaPagina — a regra não-negociável nº 1 do REDESIGN-DS §2.
//
// "O glow de fundo é fixo no viewport. Se ele rolar com o conteúdo, o desfoque
// perde o referencial e o efeito morre." É uma regra que só existe porque a
// alternativa (glow rolando junto) parece funcionar em tela parada e falha no
// primeiro scroll — o tipo de defeito que nenhum gate pega e o olho do dono
// pega na hora.
//
// Duas coisas ficam travadas aqui, e as duas são de CONTRATO, não de pixel
// (jsdom não faz layout — a conferência visual está listada no handoff):
//
//   1. o glow é pintado NO CONTÊINER QUE ROLA, e ancorado no viewport;
//   2. o valor vem do token `--page-glow`, nunca de um gradiente escrito à mão.
//
// O item 2 é o que sustenta a decisão do dono sem um `if` no código: fora do
// modo vidro o token vale `none`, então a MESMA linha não desenha nada na
// administração da plataforma.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RootShell } from '../RootShell';

vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (u: { uid: string; displayName: string | null } | null) => void) => {
    cb({ uid: 'uid-marina', displayName: 'Marina Castelo' });
    return () => {};
  },
  getClaims: () => Promise.resolve({ tenantId: 'castelo', role: 'tenant_admin' }),
  getLeelaDb: () => ({}),
  listarEventosDoOrganizador: () => Promise.resolve([]),
}));

function montarConteudo(): HTMLElement {
  render(
    <MemoryRouter initialEntries={['/']}>
      <RootShell>
        <p>conteúdo da página</p>
      </RootShell>
    </MemoryRouter>,
  );
  // O contêiner de rolagem é o pai do conteúdo da página (mesma âncora que o
  // teste de scroll usa) — subimos por ele para não depender de test-id novo.
  const alvo = screen.getByText('conteúdo da página').parentElement;
  if (!alvo) throw new Error('contêiner de rolagem da página não encontrado');
  return alvo;
}

describe('glow da página', () => {
  it('é pintado no contêiner que rola', () => {
    const rolador = montarConteudo();
    expect(rolador.className).toMatch(/overflow-y-auto/);
    expect(rolador.className).toContain('[background-image:var(--page-glow)]');
  });

  it('fica ancorado no viewport, não no conteúdo', () => {
    expect(montarConteudo().className).toContain('[background-attachment:fixed]');
  });

  it('não escreve gradiente nem cor crua — só o token', () => {
    const classes = montarConteudo().className;
    expect(classes).not.toMatch(/radial-gradient|linear-gradient|#[0-9a-fA-F]{3,8}|rgba?\(/);
  });
});
