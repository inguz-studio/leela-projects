import { describe, it, expect } from 'vitest';
import { abaAtiva, clubeSubNavTabs } from '../subnav';

const SLUG = 'corrida-perfeita-sul';

describe('abaAtiva', () => {
  it('rota-base → overview', () => {
    expect(abaAtiva(`/clubes/${SLUG}`, SLUG)).toBe('overview');
    expect(abaAtiva(`/clubes/${SLUG}/`, SLUG)).toBe('overview');
  });

  it('casa o segmento da sub-rota (6 tabs)', () => {
    expect(abaAtiva(`/clubes/${SLUG}/membros`, SLUG)).toBe('membros');
    expect(abaAtiva(`/clubes/${SLUG}/desafios`, SLUG)).toBe('desafios');
    expect(abaAtiva(`/clubes/${SLUG}/parcerias`, SLUG)).toBe('parcerias');
    expect(abaAtiva(`/clubes/${SLUG}/comunicacao`, SLUG)).toBe('comunicacao');
    expect(abaAtiva(`/clubes/${SLUG}/configuracoes`, SLUG)).toBe('configuracoes');
  });

  it('segmento desconhecido → overview (fallback)', () => {
    expect(abaAtiva(`/clubes/${SLUG}/xpto`, SLUG)).toBe('overview');
  });
});

describe('clubeSubNavTabs', () => {
  it('monta 6 abas e marca só a ativa', () => {
    const tabs = clubeSubNavTabs(SLUG, 'membros');
    expect(tabs).toHaveLength(6);
    const ativas = tabs.filter((t) => t.active);
    expect(ativas).toHaveLength(1);
    expect(ativas[0]?.id).toBe('membros');
  });

  it('monta hrefs corretos (overview é a rota-base)', () => {
    const tabs = clubeSubNavTabs(SLUG, 'overview');
    expect(tabs.find((t) => t.id === 'overview')?.href).toBe(`/clubes/${SLUG}`);
    expect(tabs.find((t) => t.id === 'membros')?.href).toBe(`/clubes/${SLUG}/membros`);
    expect(tabs.find((t) => t.id === 'configuracoes')?.href).toBe(`/clubes/${SLUG}/configuracoes`);
  });

  it('coloca contador pill em Membros e Desafios', () => {
    const tabs = clubeSubNavTabs(SLUG, 'overview', { membros: 120, desafios: 3 });
    expect(tabs.find((t) => t.id === 'membros')?.count).toBe(120);
    expect(tabs.find((t) => t.id === 'desafios')?.count).toBe(3);
    expect(tabs.find((t) => t.id === 'parcerias')?.count).toBeUndefined();
  });
});
