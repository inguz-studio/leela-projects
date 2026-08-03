/**
 * contatoOnboardingCore.test.ts — LEELA-S1609-T2 · RN-417
 *
 * O CTA "Falar com o time Leela" é a ÚNICA saída da conta travada que não
 * depende de ela ter um código. Um destino inválido vindo da config não pode
 * virar link morto na cara de quem já está do lado de fora — daí a
 * normalização cair sempre em pé.
 */
import { describe, expect, it } from 'vitest';
import {
  CONTATO_ONBOARDING_PADRAO,
  hrefContatoOnboarding,
  resolverContatoOnboarding,
} from '@leela/core';

describe('resolverContatoOnboarding — config ausente ou suja cai no padrão', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['string solta', 'contato@leela.app'],
    ['objeto vazio', {}],
    ['valor vazio', { tipo: 'email', valor: '   ' }],
    ['tipo desconhecido', { tipo: 'telegram', valor: '@leela' }],
    ['e-mail sem @', { tipo: 'email', valor: 'contato-leela.app' }],
    ['whatsapp curto demais', { tipo: 'whatsapp', valor: '4899' }],
  ])('%s → padrão', (_rotulo, bruto) => {
    expect(resolverContatoOnboarding(bruto)).toEqual(CONTATO_ONBOARDING_PADRAO);
  });
});

describe('resolverContatoOnboarding — config válida vence o padrão', () => {
  it('e-mail configurado é usado como está (aparado)', () => {
    expect(resolverContatoOnboarding({ tipo: 'email', valor: '  time@leela.app ' })).toEqual({
      tipo: 'email',
      valor: 'time@leela.app',
    });
  });

  it('whatsapp é reduzido a dígitos (a máscara do admin não vai para a URL)', () => {
    expect(
      resolverContatoOnboarding({ tipo: 'whatsapp', valor: '+55 (48) 99999-9999' }),
    ).toEqual({ tipo: 'whatsapp', valor: '5548999999999' });
  });
});

describe('hrefContatoOnboarding — o botão sempre tem para onde ir', () => {
  it('whatsapp vira wa.me (abre app ou web, sem SDK)', () => {
    expect(hrefContatoOnboarding({ tipo: 'whatsapp', valor: '5548999999999' })).toBe(
      'https://wa.me/5548999999999',
    );
  });

  it('e-mail vira mailto COM assunto (quem recebe sabe do que se trata)', () => {
    const href = hrefContatoOnboarding({ tipo: 'email', valor: 'time@leela.app' });
    expect(href).toContain('mailto:time@leela.app');
    expect(href).toContain('subject=');
  });

  it('o padrão gera um href utilizável', () => {
    expect(hrefContatoOnboarding(CONTATO_ONBOARDING_PADRAO)).toContain(
      'mailto:contato@leela.app',
    );
  });
});
