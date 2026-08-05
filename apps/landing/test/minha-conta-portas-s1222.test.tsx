/**
 * minha-conta-portas-s1222.test.tsx — LEELA-S1222-T5 · RN-449/RN-450
 *
 * As duas portas do fim da área do cliente, e o caso que a fila exige com este
 * nome: **nenhum caminho da área do cliente alcança `/plataforma`**. É o ponto
 * em que a RN-449 vira tela.
 *
 * Aceite falsificável da task:
 *   - conta SÓ cliente não encontra o botão de organizador;
 *   - conta que ACUMULA encontra e chega ao painel do ORGANIZADOR;
 *   - nenhuma das duas alcança `/plataforma`;
 *   - "criar conta de organizador" termina na máquina que já existe (o
 *     `/cadastrar` do painel, que grava `statusOnboarding: 'aguardando_convite'`
 *     e entrega a pessoa no overlay travado), e não num segundo caminho.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { portaDaConta } from '@/lib/portaOrganizador';

vi.setConfig({ testTimeout: 20_000 });

const getClaims = vi.fn();
vi.mock('@leela/api-client', () => ({ getClaims: () => getClaims() }));

async function montar(): Promise<void> {
  const { PortasDaConta } = await import('@/app/(public)/minha-conta/PortasDaConta');
  await act(async () => {
    render(<PortasDaConta />);
  });
}

beforeEach(() => {
  getClaims.mockReset();
});

afterEach(cleanup);

// ---------------------------------------------------------------------------
// A regra, pura — falsificável sem montar componente nenhum
// ---------------------------------------------------------------------------

describe('S1222-T5 · quem enxerga qual porta', () => {
  it('conta só cliente (`athlete`) enxerga "criar conta de organizador"', () => {
    expect(portaDaConta({ role: 'athlete' })).toBe('criar');
  });

  it('conta sem claim nenhuma também — ela é só cliente', () => {
    expect(portaDaConta({})).toBe('criar');
  });

  it('conta que ACUMULA cliente e organizador enxerga a porta do painel', () => {
    expect(portaDaConta({ role: 'tenant_owner', tenantId: 'castelo' })).toBe('organizador');
    expect(portaDaConta({ role: 'tenant_staff', tenantId: 'castelo' })).toBe('organizador');
  });

  it('token velho sem papel mas com tenant carimbado conta como organizadora (RN-401)', () => {
    expect(portaDaConta({ tenantId: 'castelo' })).toBe('organizador');
  });

  it('⚔ RN-449 · conta de ADMINISTRAÇÃO da plataforma não enxerga porta nenhuma', () => {
    expect(portaDaConta({ role: 'platform_admin' })).toBeNull();
    // Nem quando o token vier com tenant junto — estado que a RN-449 proíbe,
    // e que esta função não pode legitimar desenhando um botão.
    expect(portaDaConta({ role: 'platform_admin', tenantId: 'castelo' })).toBeNull();
  });

  it('claims ainda não lidas não desenham nada — não desenhar é reversível', () => {
    expect(portaDaConta(null)).toBeNull();
  });

  it('claim de papel não-string não vira organizador por acidente', () => {
    expect(portaDaConta({ role: { toString: () => 'tenant_owner' } })).toBe('criar');
    expect(portaDaConta({ role: ['tenant_owner'] })).toBe('criar');
    expect(portaDaConta({ tenantId: 123 })).toBe('criar');
    expect(portaDaConta({ tenantId: '' })).toBe('criar');
  });
});

// ---------------------------------------------------------------------------
// A tela
// ---------------------------------------------------------------------------

describe('S1222-T5 · as portas na tela', () => {
  it('conta só cliente NÃO encontra o botão de organizador', async () => {
    getClaims.mockResolvedValue({ role: 'athlete' });
    await montar();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /criar conta de organizador/i })).toBeTruthy()
    );
    expect(screen.queryByRole('link', { name: /ir para o painel do organizador/i })).toBeNull();
  });

  it('conta que acumula encontra a porta e ela leva ao PAINEL do organizador', async () => {
    getClaims.mockResolvedValue({ role: 'tenant_owner', tenantId: 'castelo' });
    await montar();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /ir para o painel do organizador/i })).toBeTruthy()
    );
    const link = screen.getByRole('link', { name: /ir para o painel do organizador/i });
    expect(link.getAttribute('href')).toMatch(/\/entrar$/);
    expect(screen.queryByRole('link', { name: /criar conta de organizador/i })).toBeNull();
  });

  it('⚔ conta de administração não vê porta alguma', async () => {
    getClaims.mockResolvedValue({ role: 'platform_admin' });
    await montar();
    await waitFor(() => expect(getClaims).toHaveBeenCalled());
    expect(screen.queryAllByRole('link')).toEqual([]);
  });

  it('falha ao ler o token não desenha porta', async () => {
    getClaims.mockRejectedValue(new Error('token'));
    await montar();
    await waitFor(() => expect(getClaims).toHaveBeenCalled());
    expect(screen.queryAllByRole('link')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ⚔ O caso com o nome que a fila pede
// ---------------------------------------------------------------------------

describe('⚔ RN-449 · nenhum caminho da área do cliente alcança /plataforma', () => {
  it('nenhum href renderizado por qualquer papel aponta para /plataforma', async () => {
    for (const claims of [
      { role: 'athlete' },
      { role: 'tenant_owner', tenantId: 'castelo' },
      { role: 'tenant_staff', tenantId: 'castelo' },
      { role: 'promoter' },
      { role: 'platform_admin' },
      {},
    ]) {
      getClaims.mockResolvedValue(claims);
      await montar();
      await waitFor(() => expect(getClaims).toHaveBeenCalled());
      for (const a of Array.from(document.querySelectorAll('a[href]'))) {
        expect(a.getAttribute('href') ?? '').not.toContain('/plataforma');
      }
      cleanup();
      getClaims.mockReset();
    }
  });

  it('a string `/plataforma` não existe em NENHUMA superfície da área do cliente', () => {
    const dir = resolve(__dirname, '../app/(public)/minha-conta');
    for (const arquivo of readdirSync(dir)) {
      if (!arquivo.endsWith('.tsx')) continue;
      const fonte = readFileSync(resolve(dir, arquivo), 'utf8');
      const semComentarios = fonte
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' ');
      expect(semComentarios).not.toContain('/plataforma');
    }
  });

  it('a proibição é do COMPILADOR: `RotaPainel` só admite /entrar e /cadastrar', () => {
    // Não é preferência de código: não existe valor de `RotaPainel` que
    // produza uma URL de plataforma. Uma refatoração que ampliasse o tipo
    // mataria este caso antes de chegar à tela.
    const fonte = readFileSync(resolve(__dirname, '../lib/painel.ts'), 'utf8');
    expect(fonte).toContain("export type RotaPainel = '/entrar' | '/cadastrar';");
  });

  it('"criar conta de organizador" termina na máquina que já existe, não numa nova', async () => {
    getClaims.mockResolvedValue({ role: 'athlete' });
    await montar();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /criar conta de organizador/i })).toBeTruthy()
    );
    const link = screen.getByRole('link', { name: /criar conta de organizador/i });
    // É o `/cadastrar` do painel — quem grava `statusOnboarding:
    // 'aguardando_convite'` (RN-411) e entrega a pessoa no overlay travado
    // (RN-416). A landing não constrói um segundo caminho de cadastro: dois
    // caminhos divergem na primeira mudança de termo LGPD.
    expect(link.getAttribute('href')).toMatch(/\/cadastrar$/);
    // E nenhuma superfície da área provisiona nada por conta própria.
    const dir = resolve(__dirname, '../app/(public)/minha-conta');
    for (const arquivo of readdirSync(dir)) {
      if (!arquivo.endsWith('.tsx')) continue;
      const fonte = readFileSync(resolve(dir, arquivo), 'utf8');
      expect(fonte).not.toContain('criarPerfilOrganizador');
      expect(fonte).not.toContain('provisionTenant');
    }
  });
});
