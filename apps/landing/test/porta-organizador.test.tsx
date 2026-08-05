/**
 * porta-organizador.test.tsx — LEELA-S1213-T1
 *
 * A entrada do organizador na landing (RN da rodada SPEC-ONBOARD · P10).
 * Antes desta story não havia, em nenhum ponto da superfície pública, um
 * caminho até o painel: a URL era conhecimento oral.
 *
 * O que trava aqui:
 *   - o header mostra "Criar conta de organizador" e o rodapé repete os dois
 *     caminhos do organizador ("Entrar" e "Criar conta de organizador");
 *   - os rótulos ficam visíveis também no mobile (nenhuma classe `hidden` sem
 *     contraparte responsiva os esconde);
 *   - o destino sai de `NEXT_PUBLIC_PAINEL_URL` — nunca de URL fixa.
 *
 * ATUALIZADO PELA S1221-T1: o "Entrar" do HEADER deixou de ser link para o
 * painel e virou o botão que abre o overlay de login da própria landing. A
 * porta direta do organizador não morreu — ela ficou onde o rodapé já a
 * repetia, e é isso que este arquivo passa a travar. O overlay tem prova
 * própria em `entrar-overlay-s1221.test.tsx`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

// O header passou a puxar o barrel do DS pelo `ContaHeader`; com o teto
// default de 5s o primeiro render do arquivo estoura por IMPORT, não por
// comportamento — e um caso que estoura pula o `cleanup`, contaminando o
// seguinte com o DOM anterior.
vi.setConfig({ testTimeout: 20_000 });

// S1221-T1: o header passou a montar o `ContaHeader`, que assina o estado de
// autenticação. O teste da PORTA não sobe Firebase — o SDK fica mockado numa
// sessão deslogada, que é o estado em que os rótulos do organizador aparecem.
vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (u: unknown) => void) => {
    cb(null);
    return () => undefined;
  },
  logout: async () => undefined,
  loginComEmail: async () => undefined,
  emailValido: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()),
  mensagemErroLogin: () => 'E-mail ou senha inválidos.',
}));

vi.mock('@/lib/leelaClient', () => ({ ensureLeela: () => undefined }));

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
  it('mostra Criar conta de organizador apontando para o painel', async () => {
    await renderHeader();
    const criar = screen.getByRole('link', { name: 'Criar conta de organizador' });
    expect(criar.getAttribute('href')).toBe('https://painel.exemplo.dev/cadastrar');
  });

  it('o rótulo sobrevive ao mobile (sem `hidden` puro)', async () => {
    await renderHeader();
    const classes = screen.getByRole('link', { name: 'Criar conta de organizador' }).className;
    expect(classes.split(/\s+/)).not.toContain('hidden');
  });

  // S1221-T1: nenhum LINK "Entrar" no header — a entrada virou botão. Se
  // alguém restaurar o link para o painel, este caso morre e a regressão
  // aparece antes do deploy.
  it('não existe mais link "Entrar" no header (a entrada virou overlay)', async () => {
    await renderHeader();
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Entrar' })).not.toBeNull();
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
