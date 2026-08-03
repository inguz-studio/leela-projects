// =============================================================================
// destinoPosLogin — item 57 do painel de decisões (roteamento pós-login).
//
// O que estes testes protegem, em uma frase: o item 57 NÃO pode barrar na porta
// o organizador que a RN-411 manda entrar. É a colisão que a premissa 9 desta
// lane resolveu, e é a que volta se alguém "simplificar" a regra para
// "sem tenant ⇒ fora".
// =============================================================================

import { describe, expect, it } from 'vitest';
import {
  AVISO_CONTA_SEM_ACESSO,
  ROTA_PLATAFORMA,
  ROTA_VISAO_GERAL,
  destinoPosLogin,
  type SessaoPosLogin,
} from '../_lib/destinoPosLogin';

const organizador: SessaoPosLogin = {
  role: 'tenant_owner',
  tenantId: 'castelo-producoes',
  temPerfilProfissional: true,
};

const admin: SessaoPosLogin = {
  role: 'platform_admin',
  tenantId: null,
  temPerfilProfissional: false,
};

/** Acabou de se cadastrar: tem doc, ainda não resgatou código (RN-411). */
const travado: SessaoPosLogin = {
  role: 'athlete',
  tenantId: null,
  temPerfilProfissional: true,
};

/** Conta do ecossistema que achou a URL do painel: sem tenant e sem doc. */
const orfa: SessaoPosLogin = {
  role: 'athlete',
  tenantId: null,
  temPerfilProfissional: false,
};

describe('destinoPosLogin — default por papel (item 57)', () => {
  it('platform_admin aterrissa na plataforma', () => {
    expect(destinoPosLogin(admin, null)).toEqual({
      tipo: 'rota',
      destino: ROTA_PLATAFORMA,
    });
  });

  it('organizador com tenant aterrissa na Visão Geral', () => {
    expect(destinoPosLogin(organizador, null)).toEqual({
      tipo: 'rota',
      destino: ROTA_VISAO_GERAL,
    });
  });

  // Decisão do dono de 03/08 (ratificação do item 57): conta que acumula
  // admin + organizador tem ACESSO ÚNICO — vai para `/plataforma` por
  // PRECEDÊNCIA, sem seletor de papel e sem tela de escolha. O caso vive aqui
  // porque a decisão é do dono e o comentário do arquivo sozinho não impede
  // ninguém de trocar a precedência por um `if` novo.
  //
  // Nota de modelo: `setTenantClaims` põe `platform_admin` em
  // ROLES_WITHOUT_TENANT, então a claim NUNCA carrega os dois ao mesmo tempo.
  // O caso `platform_admin` + `tenantId` está aqui como defesa de contrato:
  // se um dia o modelo aceitar os dois, a precedência tem de continuar valendo.
  it('conta admin + organizador vai para /plataforma por PRECEDÊNCIA (acesso único)', () => {
    expect(
      destinoPosLogin(
        { role: 'platform_admin', tenantId: 'castelo-producoes', temPerfilProfissional: true },
        null,
      ),
    ).toEqual({ tipo: 'rota', destino: ROTA_PLATAFORMA });
  });

  it('o super-admin NUNCA é barrado na porta, com ou sem doc de profissional', () => {
    for (const temPerfilProfissional of [true, false]) {
      expect(
        destinoPosLogin({ role: 'platform_admin', tenantId: null, temPerfilProfissional }, null),
      ).toEqual({ tipo: 'rota', destino: ROTA_PLATAFORMA });
    }
  });
});

describe('destinoPosLogin — a conta travada ENTRA (RN-411 × item 57)', () => {
  it('sem tenant mas COM doc de profissional: entra na home e encontra o overlay', () => {
    expect(destinoPosLogin(travado, null)).toEqual({
      tipo: 'rota',
      destino: ROTA_VISAO_GERAL,
    });
  });

  it('sem tenant e SEM doc: fica na porta com o aviso', () => {
    expect(destinoPosLogin(orfa, null)).toEqual({
      tipo: 'barrar',
      aviso: AVISO_CONTA_SEM_ACESSO,
    });
  });

  it('a conta órfã é barrada mesmo com deep-link guardado', () => {
    // O `from` é navegação, não autorização — não pode virar bypass da porta.
    expect(destinoPosLogin(orfa, '/eventos')).toEqual({
      tipo: 'barrar',
      aviso: AVISO_CONTA_SEM_ACESSO,
    });
  });

  it('sem papel algum mas com doc (token defasado): entra em vez de ser barrado', () => {
    // Regressão do pior modo de falha: claim ainda não propagada não pode
    // trancar do lado de fora quem acabou de resgatar o convite.
    expect(
      destinoPosLogin(
        { role: null, tenantId: null, temPerfilProfissional: true },
        null,
      ),
    ).toEqual({ tipo: 'rota', destino: ROTA_VISAO_GERAL });
  });
});

describe('destinoPosLogin — deep-link do RequireSessao (FIX-AUTHGUARD)', () => {
  it('a origem guardada vence o default do organizador', () => {
    expect(destinoPosLogin(organizador, '/eventos/abc')).toEqual({
      tipo: 'rota',
      destino: '/eventos/abc',
    });
  });

  it('a origem guardada vence até o default do super-admin', () => {
    // Sem isto, todo link salvo do painel viraria atalho para a home.
    expect(destinoPosLogin(admin, '/plataforma/convites')).toEqual({
      tipo: 'rota',
      destino: '/plataforma/convites',
    });
  });

  it('origem vazia não conta como origem', () => {
    expect(destinoPosLogin(admin, '')).toEqual({
      tipo: 'rota',
      destino: ROTA_PLATAFORMA,
    });
  });
});
