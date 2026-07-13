import { describe, it, expect } from 'vitest';
import { secoesVendasPadrao, type SecaoVendas } from '@leela/core';
import { agruparSecoes, labelSecao, urlAmigavelExibida, DOMINIO_LEELA } from '../paginaVendasView';

describe('paginaVendasView helpers', () => {
  it('agrupa as seções na ordem canônica essenciais → landing → sistema', () => {
    const grupos = agruparSecoes(secoesVendasPadrao());
    expect(grupos.map((g) => g.canal)).toEqual(['essenciais', 'landing', 'sistema']);
    // O grupo sistema contém o checkout travado.
    const sistema = grupos.find((g) => g.canal === 'sistema')!;
    expect(sistema.secoes.some((s) => s.id === 'checkout' && s.travada)).toBe(true);
  });

  it('omite grupos vazios', () => {
    const soEssenciais: SecaoVendas[] = [
      { id: 'hero', canal: 'essenciais', ativa: true, travada: false },
    ];
    const grupos = agruparSecoes(soEssenciais);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]!.canal).toBe('essenciais');
  });

  it('labelSecao usa o rótulo humano e faz fallback capitalizado', () => {
    expect(labelSecao('checkout')).toBe('Checkout');
    expect(labelSecao('desconhecida')).toBe('Desconhecida');
  });

  it('urlAmigavelExibida prefixa {DOMINIO_LEELA} e nunca vaza host legado', () => {
    expect(urlAmigavelExibida('{DOMINIO_LEELA}/meia-floripa', 'ev')).toBe(
      `${DOMINIO_LEELA}/meia-floripa`,
    );
    // Host legado no slug bruto → só o último segmento sobrevive.
    expect(urlAmigavelExibida('be-hero.com.br/x-run', 'ev')).toBe(`${DOMINIO_LEELA}/x-run`);
    // Slug vazio → cai no slug do evento.
    expect(urlAmigavelExibida('', 'ev-slug')).toBe(`${DOMINIO_LEELA}/ev-slug`);
  });
});
