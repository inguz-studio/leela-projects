// =============================================================================
// linkSenhaPorOrigem.test.ts — LEELA-S1223-T2 · RN-453 item 2
//
// "O link gerado por cada origem carrega `continueUrl` para o domínio certo, e
// o teste afirma o DOMÍNIO, não a string inteira."
//
// Falsificação escrita na fila: remover o parâmetro em cada origem mata o caso
// correspondente e só ele. Por isso cada afirmação é por origem, e existe o
// caso cruzado que prova que as duas NÃO aterrissam na mesma casa.
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  actionCodeSettingsSenha,
  baseDaOrigem,
  origemDeLinkValida,
  PAINEL_URL_PADRAO,
  reescreverParaOPainel,
  reescreverParaTelaDeSenha,
  ROTA_APOS_DEFINIR_SENHA,
  ROTA_DEFINIR_SENHA_LANDING,
  ROTA_REDEFINIR_SENHA,
  rotaDaOrigem,
} from '../auth/linkDeAcao';

const PAINEL = 'https://painel.exemplo.test';
const LANDING = 'https://leela.exemplo.test';

const ENV = {
  LEELA_PAINEL_URL: PAINEL,
  LEELA_PUBLIC_URL: LANDING,
};

/** Um link do Firebase, no formato que `generatePasswordResetLink` devolve. */
const LINK_FIREBASE =
  'https://leela-hub.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=OOB-abc123&apiKey=AIza-x&lang=pt-BR';

function dominio(url: string): string {
  return new URL(url).origin;
}

describe('S1223-T2 · o comprador aterrissa na landing', () => {
  it('o `continueUrl` do comprador tem o domínio da LANDING', () => {
    const { url } = actionCodeSettingsSenha('comprador', ENV);
    expect(dominio(url)).toBe(LANDING);
    expect(new URL(url).pathname).toBe(ROTA_DEFINIR_SENHA_LANDING);
  });

  it('o link reescrito do comprador abre a tela da landing, com o oobCode', () => {
    const link = reescreverParaTelaDeSenha(LINK_FIREBASE, 'comprador', ENV);
    expect(dominio(link)).toBe(LANDING);
    expect(new URL(link).pathname).toBe(ROTA_DEFINIR_SENHA_LANDING);
    // A credencial é o código, não a URL que o entregou.
    expect(new URL(link).searchParams.get('oobCode')).toBe('OOB-abc123');
  });
});

describe('S1223-T2 · o organizador continua no painel', () => {
  it('o `continueUrl` do organizador tem o domínio do PAINEL', () => {
    const { url } = actionCodeSettingsSenha('organizador', ENV);
    expect(dominio(url)).toBe(PAINEL);
    expect(new URL(url).pathname).toBe(ROTA_APOS_DEFINIR_SENHA);
  });

  it('o link reescrito do organizador abre a tela do painel', () => {
    const link = reescreverParaTelaDeSenha(LINK_FIREBASE, 'organizador', ENV);
    expect(dominio(link)).toBe(PAINEL);
    expect(new URL(link).pathname).toBe(ROTA_REDEFINIR_SENHA);
  });

  it('sem origem declarada, o default é o comportamento anterior à task', () => {
    expect(actionCodeSettingsSenha(undefined, ENV).url).toBe(
      actionCodeSettingsSenha('organizador', ENV).url,
    );
    expect(reescreverParaOPainel(LINK_FIREBASE, ENV)).toBe(
      reescreverParaTelaDeSenha(LINK_FIREBASE, 'organizador', ENV),
    );
  });
});

describe('S1223-T2 · as duas casas são MESMO diferentes', () => {
  it('comprador e organizador não aterrissam no mesmo domínio', () => {
    const comprador = actionCodeSettingsSenha('comprador', ENV).url;
    const organizador = actionCodeSettingsSenha('organizador', ENV).url;
    expect(dominio(comprador)).not.toBe(dominio(organizador));
  });
});

describe('S1223-T2 · degradação: link feio recupera conta, link quebrado não', () => {
  it('sem base pública, o comprador cai INTEIRO no painel — base e rota', () => {
    const semLanding = { LEELA_PAINEL_URL: PAINEL };
    expect(baseDaOrigem('comprador', semLanding)).toBe(PAINEL);
    // A rota acompanha a base: `/definir-senha` no domínio do painel seria 404.
    expect(rotaDaOrigem('comprador', semLanding)).toBe(ROTA_APOS_DEFINIR_SENHA);
    const link = reescreverParaTelaDeSenha(LINK_FIREBASE, 'comprador', semLanding);
    expect(dominio(link)).toBe(PAINEL);
    expect(new URL(link).pathname).toBe(ROTA_REDEFINIR_SENHA);
  });

  it('sem env nenhuma, ninguém fica com link morto', () => {
    expect(baseDaOrigem('comprador', {})).toBe(PAINEL_URL_PADRAO);
    expect(baseDaOrigem('organizador', {})).toBe(PAINEL_URL_PADRAO);
  });

  it('base pública torta não vira link torto em massa', () => {
    for (const torta of ['', '   ', 'leela.test', 'https://a b']) {
      expect(baseDaOrigem('comprador', { ...ENV, LEELA_PUBLIC_URL: torta })).toBe(PAINEL);
    }
  });
});

describe('S1223-T2 · a origem é dica de destino, nunca credencial', () => {
  it('só as duas origens conhecidas passam', () => {
    expect(origemDeLinkValida('comprador')).toBe(true);
    expect(origemDeLinkValida('organizador')).toBe(true);
    for (const lixo of ['admin', '', null, undefined, 42, { origem: 'comprador' }]) {
      expect(origemDeLinkValida(lixo)).toBe(false);
    }
  });

  it('origem desconhecida não inventa domínio — cai no painel', () => {
    // O parser da callable resolve isto antes de chegar aqui; o caso trava a
    // propriedade de que nenhum valor de terceiro escolhe um domínio novo.
    const dominios = new Set([
      dominio(actionCodeSettingsSenha('comprador', ENV).url),
      dominio(actionCodeSettingsSenha('organizador', ENV).url),
    ]);
    expect(dominios).toEqual(new Set([LANDING, PAINEL]));
  });
});
