// =============================================================================
// A regra de superfície (REDESIGN-DS · decisão do dono de 09/08).
//
// O que está sob teste NÃO é "um atributo é escrito", é a decisão de produto:
// o painel do organizador tem vidro, a administração da plataforma não tem —
// para que os dois sejam distinguíveis à primeira vista. Por isso os casos
// falam de ROTAS REAIS do painel, não de strings inventadas.
//
// O caso que mais paga o próprio custo é o do prefixo: `startsWith('/plataforma')`
// classificaria `/plataformas-legais` como área admin e desligaria o vidro numa
// rota do organizador. A regra casa por SEGMENTO.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { superficieDaRota, vidroDaRota, vidroDaSuperficie } from '../superficie';

describe('superficieDaRota · onde a pessoa está', () => {
  it.each([
    ['/', 'a Visão Geral'],
    ['/eventos', 'o hub de eventos'],
    ['/eventos/meia-floripa-2026', 'a operação de um evento'],
    ['/clubes', 'o hub de clubs'],
    ['/clubes/engajamento', 'a análise de engajamento'],
    ['/crm', 'a visão geral do CRM'],
    ['/marcas', 'o módulo de marcas'],
    ['/conta', 'as configurações da conta'],
    ['/entrar', 'a porta de entrada (sem shell)'],
    ['/cadastrar', 'o cadastro (sem shell)'],
  ])('%s é do organizador — %s', (rota) => {
    expect(superficieDaRota(rota)).toBe('organizador');
  });

  it.each([
    ['/plataforma'],
    ['/plataforma/tenants'],
    ['/plataforma/tenants/abc/termos'],
    ['/plataforma/macro'],
  ])('%s é da administração da plataforma', (rota) => {
    expect(superficieDaRota(rota)).toBe('plataforma');
  });

  it('não confunde prefixo com segmento: /plataformas-legais segue do organizador', () => {
    expect(superficieDaRota('/plataformas-legais')).toBe('organizador');
  });
});

describe('vidroDaSuperficie · a decisão do dono', () => {
  it('organizador roda com a camada de vidro LIGADA', () => {
    expect(vidroDaSuperficie('organizador')).toBe('on');
  });

  it('plataforma roda com a camada DESLIGADA (fundo preto opaco)', () => {
    expect(vidroDaSuperficie('plataforma')).toBe('off');
  });
});

describe('vidroDaRota · o atalho que o efeito consome', () => {
  it('a Visão Geral do organizador liga o vidro', () => {
    expect(vidroDaRota('/')).toBe('on');
  });

  it('a lista de tenants do super-admin desliga', () => {
    expect(vidroDaRota('/plataforma/tenants')).toBe('off');
  });
});
