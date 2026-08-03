/**
 * porta-organizador.test.tsx — LEELA-S1213-T1
 *
 * A entrada do organizador na landing (RN da rodada SPEC-ONBOARD · P10).
 * Antes desta story não havia, em nenhum ponto da superfície pública, um
 * caminho até o painel: a URL era conhecimento oral.
 *
 * O que trava aqui:
 *   - header e footer mostram "Entrar" e "Criar conta de organizador";
 *   - os dois rótulos ficam visíveis também no mobile (nenhuma classe
 *     `hidden` sem contraparte responsiva os esconde);
 *   - o destino sai de `NEXT_PUBLIC_PAINEL_URL` — nunca de URL fixa.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

const ENV_PAINEL = 'NEXT_PUBLIC_PAINEL_URL';

async function renderHeader(): Promise<void> {
  const { PublicHeader } = await import('@/app/components/PublicHeader');
  render(<PublicHeader />);
}

async function renderFooter(): Promise<void> {
  const { PublicFooter } = await import('@/app/components/PublicFooter');
  render(<PublicFooter />);
}

const envOriginal = process.env[ENV_PAINEL];

beforeEach(() => {
  process.env[ENV_PAINEL] = 'https://painel.exemplo.dev';
});

afterEach(() => {
  // A suíte da landing roda sem `globals` — o auto-cleanup do RTL não se
  // registra sozinho e o DOM do teste anterior sobreviveria à próxima query.
  cleanup();
  if (envOriginal === undefined) delete process.env[ENV_PAINEL];
  else process.env[ENV_PAINEL] = envOriginal;
});

describe('painelUrl (P10)', () => {
  it('usa a env pública e apara a barra final', async () => {
    process.env[ENV_PAINEL] = 'https://painel.exemplo.dev/';
    const { painelUrl } = await import('@/lib/painel');
    expect(painelUrl('/entrar')).toBe('https://painel.exemplo.dev/entrar');
    expect(painelUrl('/cadastrar')).toBe('https://painel.exemplo.dev/cadastrar');
  });

  it('sem env cai no default (link vivo, nunca href vazio)', async () => {
    delete process.env[ENV_PAINEL];
    const { painelUrl, PAINEL_URL_PADRAO } = await import('@/lib/painel');
    expect(painelUrl('/entrar')).toBe(`${PAINEL_URL_PADRAO}/entrar`);
    expect(PAINEL_URL_PADRAO.startsWith('https://')).toBe(true);
  });

  it('env em branco não produz URL relativa', async () => {
    process.env[ENV_PAINEL] = '   ';
    const { painelUrl } = await import('@/lib/painel');
    expect(painelUrl('/cadastrar').startsWith('https://')).toBe(true);
  });
});

describe('PublicHeader — porta do organizador', () => {
  it('mostra Entrar e Criar conta de organizador apontando para o painel', async () => {
    await renderHeader();
    const entrar = screen.getByRole('link', { name: 'Entrar' });
    const criar = screen.getByRole('link', { name: 'Criar conta de organizador' });
    expect(entrar.getAttribute('href')).toBe('https://painel.exemplo.dev/entrar');
    expect(criar.getAttribute('href')).toBe('https://painel.exemplo.dev/cadastrar');
  });

  it('os dois rótulos sobrevivem ao mobile (sem `hidden` puro)', async () => {
    await renderHeader();
    for (const nome of ['Entrar', 'Criar conta de organizador']) {
      const classes = screen.getByRole('link', { name: nome }).className;
      expect(classes.split(/\s+/)).not.toContain('hidden');
    }
  });
});

describe('PublicFooter — eco da porta', () => {
  it('repete os dois caminhos no rodapé', async () => {
    await renderFooter();
    const nav = screen.getByRole('navigation', { name: 'Organizador' });
    expect(
      within(nav).getByRole('link', { name: 'Entrar' }).getAttribute('href'),
    ).toBe('https://painel.exemplo.dev/entrar');
    expect(
      within(nav)
        .getByRole('link', { name: 'Criar conta de organizador' })
        .getAttribute('href'),
    ).toBe('https://painel.exemplo.dev/cadastrar');
  });
});
