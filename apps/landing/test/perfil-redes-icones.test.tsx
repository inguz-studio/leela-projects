// =============================================================================
// PROVA da S1707-T2 (RN-444 · D-ACH-17/18) — o link externo do perfil vira
// ícone pelo ENDEREÇO, e o rótulo digitado vira nome acessível.
//
// Duas frentes, porque são dois riscos diferentes:
//   1. a inferência é uma função pura e o risco dela é casar domínio de outro
//      dono (`instagram.com.golpe.net`) ou perder subdomínio legítimo;
//   2. a redução para ícone é onde a informação some — o teste afirma que ela
//      NÃO some: continua no nome acessível e na dica.
// =============================================================================

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PerfilView } from '../app/(public)/_perfil/PerfilView';
import { inferirRede, nomeAcessivelDoLink } from '../app/(public)/_perfil/redes';
import type { PerfilPublicoCompleto } from '@/lib/leitorPerfil';

afterEach(cleanup);

function perfilCom(
  linksExternos: { label: string; url: string }[],
): PerfilPublicoCompleto {
  return {
    perfil: {
      handle: 'castelo',
      nome: 'Castelo Experiências',
      indexavel: true,
      linksExternos,
    },
    eventos: [],
    clubes: [],
    patrocinadores: [],
  };
}

describe('inferirRede · a rede sai do endereço', () => {
  it.each([
    ['https://instagram.com/castelo', 'instagram'],
    ['https://www.instagram.com/castelo', 'instagram'],
    ['http://br.instagram.com/castelo', 'instagram'],
    ['https://facebook.com/castelo', 'facebook'],
    ['https://fb.me/castelo', 'facebook'],
    ['https://twitter.com/castelo', 'twitter'],
    ['https://x.com/castelo', 'twitter'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://www.youtube.com/@castelo', 'youtube'],
    ['https://linkedin.com/in/castelo', 'linkedin'],
    ['https://github.com/castelo', 'github'],
    ['https://twitch.tv/castelo', 'twitch'],
    ['https://wa.me/5548999999999', 'whatsapp'],
    ['https://api.whatsapp.com/send?phone=5548999999999', 'whatsapp'],
    ['https://www.tiktok.com/@castelo', 'tiktok'],
    ['https://strava.com/clubs/castelo', 'strava'],
  ])('%s → %s', (url, esperado) => {
    expect(inferirRede(url)).toBe(esperado);
  });

  it('endereço desconhecido não some da fileira: vira o genérico', () => {
    expect(inferirRede('https://casteloexperiencias.com.br')).toBe('site');
  });

  it('não casa domínio de OUTRO dono que só carrega o nome da rede', () => {
    // O sufixo tem de ser de RÓTULO: `.instagram.com`, não `instagram.com`
    // solto no meio do hostname.
    expect(inferirRede('https://instagram.com.golpe.net/castelo')).toBe('site');
    expect(inferirRede('https://notinstagram.com/castelo')).toBe('site');
    expect(inferirRede('https://meu-strava.com.br')).toBe('site');
  });

  it('só http(s) é rede; o resto é genérico', () => {
    expect(inferirRede('javascript:alert(1)')).toBe('site');
    expect(inferirRede('mailto:contato@instagram.com')).toBe('site');
    expect(inferirRede('nao é uma url')).toBe('site');
    expect(inferirRede('')).toBe('site');
  });
});

describe('nomeAcessivelDoLink · o rótulo digitado é o nome', () => {
  it('usa o rótulo do organizador', () => {
    expect(nomeAcessivelDoLink('Nosso Insta', 'https://instagram.com/x')).toBe('Nosso Insta');
  });

  it('rótulo vazio cai no hostname, nunca em nome mudo', () => {
    expect(nomeAcessivelDoLink('   ', 'https://www.instagram.com/x')).toBe('instagram.com');
    expect(nomeAcessivelDoLink('', 'lixo')).toBe('Link externo');
  });
});

describe('a fileira de ícones do perfil', () => {
  const links = [
    { label: 'Nosso Instagram', url: 'https://instagram.com/castelo' },
    { label: 'Fala com a gente', url: 'https://wa.me/5548999999999' },
    { label: 'TikTok', url: 'https://www.tiktok.com/@castelo' },
    { label: 'Strava do clube', url: 'https://strava.com/clubs/castelo' },
    { label: 'Site oficial', url: 'https://casteloexperiencias.com.br' },
  ];

  it('cada link tem o RÓTULO digitado como nome acessível', () => {
    render(<PerfilView dados={perfilCom(links)} shareUrl="https://leela/@castelo" qrSvg="<svg/>" />);
    for (const link of links) {
      const a = screen.getByRole('link', { name: link.label });
      expect(a.getAttribute('href')).toBe(link.url);
      expect(a.getAttribute('title')).toBe(link.label);
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('o rótulo sai do TEXTO visível — a pílula de texto virou ícone', () => {
    const { container } = render(
      <PerfilView dados={perfilCom(links)} shareUrl="https://leela/@castelo" qrSvg="<svg/>" />,
    );
    const lista = container.querySelector('ul');
    expect(lista?.textContent).toBe('');
    // Um ícone por link, e todos decorativos (quem nomeia é o `a`).
    const svgs = container.querySelectorAll('a[aria-label] svg');
    expect(svgs).toHaveLength(links.length);
    for (const svg of Array.from(svgs)) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('os três que o lucide não tem desenham SVG local com dois traços', () => {
    render(<PerfilView dados={perfilCom(links)} shareUrl="https://leela/@castelo" qrSvg="<svg/>" />);
    for (const rotulo of ['Fala com a gente', 'TikTok', 'Strava do clube']) {
      const svg = screen.getByRole('link', { name: rotulo }).querySelector('svg');
      expect(svg?.querySelectorAll('path')).toHaveLength(2);
    }
  });

  it('o alvo do link tem 44px — WCAG 2.2 §2.5.8 numa fileira de ícones', () => {
    render(<PerfilView dados={perfilCom(links)} shareUrl="https://leela/@castelo" qrSvg="<svg/>" />);
    const a = screen.getByRole('link', { name: 'TikTok' });
    expect(a.className).toContain('h-11');
    expect(a.className).toContain('w-11');
  });

  it('perfil sem link não renderiza fileira vazia', () => {
    const { container } = render(
      <PerfilView dados={perfilCom([])} shareUrl="https://leela/@castelo" qrSvg="<svg/>" />,
    );
    expect(container.querySelectorAll('a[aria-label][title]')).toHaveLength(0);
  });
});
