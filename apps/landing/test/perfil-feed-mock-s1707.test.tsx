// =============================================================================
// PROVA da S1707-T4 (RN-445 · D-ACH-19) — o feed do perfil é mock ROTULADO em
// preview e vazio digno em produção.
//
// O risco desta task não é o mock não aparecer; é ele aparecer onde não devia,
// ou aparecer sem dizer que é mock. Uma página de produtor circula como link na
// bio: exibir publicação que o produtor não escreveu é inventar conteúdo em
// nome dele.
//
// Por isso as asserções são pareadas — o MESMO componente, com e sem preview.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SecaoFeed } from '../app/(public)/_perfil/SecaoFeed';
import { FEED_MOCK } from '@/lib/mockImagem';

const CHAVES = [
  'LEELA_USE_EMULATOR',
  'NEXT_PUBLIC_USE_EMULATOR',
  'FIRESTORE_EMULATOR_HOST',
] as const;

const guardado: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of CHAVES) {
    guardado[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of CHAVES) {
    if (guardado[k] === undefined) delete process.env[k];
    else process.env[k] = guardado[k];
  }
  cleanup();
});

describe('produção · a página não inventa o que o produtor não publicou', () => {
  it('sem preview, mostra estado vazio e NENHUMA publicação de exemplo', () => {
    const { container } = render(<SecaoFeed />);
    expect(screen.getByText('Ainda não há publicações')).toBeTruthy();
    expect(screen.queryByText('Exemplo')).toBeNull();
    for (const post of FEED_MOCK) {
      expect(container.textContent).not.toContain(post.texto);
    }
  });

  it('o estado vazio é digno: diz o que vai aparecer e não pede desculpa', () => {
    const { container } = render(<SecaoFeed />);
    const texto = container.textContent ?? '';
    expect(texto).toMatch(/aparecem aqui/i);
    expect(texto).not.toMatch(/desculpe|infelizmente|lamentamos/i);
  });
});

describe('preview · o mock aparece e se declara mock', () => {
  beforeEach(() => {
    process.env['LEELA_USE_EMULATOR'] = 'true';
  });

  it('mostra as publicações de exemplo no lugar do estado vazio', () => {
    const { container } = render(<SecaoFeed />);
    expect(screen.queryByText('Ainda não há publicações')).toBeNull();
    for (const post of FEED_MOCK) {
      expect(container.textContent).toContain(post.texto);
    }
  });

  it('cada publicação carrega o rótulo de exemplo — sobrevive a recorte de tela', () => {
    render(<SecaoFeed />);
    expect(screen.getAllByText('Exemplo')).toHaveLength(FEED_MOCK.length);
  });

  it('a seção também declara o mock no topo, antes da primeira publicação', () => {
    render(<SecaoFeed />);
    expect(screen.getByText(/Publicações de exemplo/i)).toBeTruthy();
  });

  it('a imagem de exemplo é decorativa (mesma lição da galeria, X1)', () => {
    const { container } = render(<SecaoFeed />);
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of Array.from(imgs)) {
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('loading')).toBe('lazy');
    }
  });

  it('as três chaves de preview ligam o mock, uma a uma', () => {
    for (const chave of CHAVES) {
      for (const k of CHAVES) delete process.env[k];
      process.env[chave] = chave === 'FIRESTORE_EMULATOR_HOST' ? '127.0.0.1:8180' : 'true';
      const { container, unmount } = render(<SecaoFeed />);
      expect(container.textContent).toContain(FEED_MOCK[0]?.texto);
      unmount();
    }
  });
});

describe('vocabulário do mock (D-0802-1)', () => {
  it('nenhuma publicação de exemplo chama a experiência de corrida', () => {
    for (const post of FEED_MOCK) {
      expect(post.texto).not.toMatch(/corrida|prova|atleta/i);
    }
  });

  it('nenhuma publicação usa "pequena vitória" — termo interno, cliente nunca lê', () => {
    for (const post of FEED_MOCK) {
      expect(post.texto).not.toMatch(/pequena vit[óo]ria/i);
    }
  });
});
