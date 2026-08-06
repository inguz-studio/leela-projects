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

// =============================================================================
// AS DUAS PERNAS DO CRACHÁ na porta de entrada (FRONTEIRA-AUTH · PAPEL-DUPLO).
//
// Esta função comparava `role === 'platform_admin'` em DOIS lugares: na barra
// da conta órfã e no destino. Com a administração da plataforma virando
// CAPACIDADE, o administrador nomeado assim — que não tem tenant nem doc de
// profissional — era barrado na porta como se fosse uma conta de atleta que
// descobriu a URL do painel.
// =============================================================================

describe('destinoPosLogin · crachá de duas pernas (RN-401)', () => {
  const SEM_ORIGEM = null;

  it('admin por CAPACIDADE, sem tenant e sem doc: ENTRA e cai na plataforma', () => {
    // Pela regra antiga (comparando `role`) esta conta levava o aviso de conta
    // sem acesso e a sessão caía — o administrador novo trancado do lado de fora.
    const decisao = destinoPosLogin(
      { role: 'athlete', tenantId: null, platformAdmin: true, temPerfilProfissional: false },
      SEM_ORIGEM,
    );
    expect(decisao).toEqual({ tipo: 'rota', destino: ROTA_PLATAFORMA });
  });

  it('o DONO (tenant_owner + capacidade) entra na Visão Geral, onde ele trabalha', () => {
    // Ele alcança os dois painéis. A porta de entrada é a do trabalho dele; o
    // painel master fica a um clique no alternador, e não na cara dele todo
    // login. Este caso é o que trava a regra contra "melhorar" o destino.
    const decisao = destinoPosLogin(
      {
        role: 'tenant_owner',
        tenantId: 'castelo-producoes',
        platformAdmin: true,
        temPerfilProfissional: true,
      },
      SEM_ORIGEM,
    );
    expect(decisao).toEqual({ tipo: 'rota', destino: ROTA_VISAO_GERAL });
  });

  it('o crachá LEGADO segue caindo na plataforma — nada mudou para ele', () => {
    const decisao = destinoPosLogin(
      { role: 'platform_admin', tenantId: null, temPerfilProfissional: false },
      SEM_ORIGEM,
    );
    expect(decisao).toEqual({ tipo: 'rota', destino: ROTA_PLATAFORMA });
  });

  it('conta órfã de verdade continua barrada — a capacidade não afrouxou a porta', () => {
    const decisao = destinoPosLogin(
      { role: 'athlete', tenantId: null, temPerfilProfissional: false },
      SEM_ORIGEM,
    );
    expect(decisao.tipo).toBe('barrar');
  });

  it('`platformAdmin` que não é `true` não abre nada', () => {
    const decisao = destinoPosLogin(
      {
        role: 'athlete',
        tenantId: null,
        platformAdmin: 'true' as unknown as true,
        temPerfilProfissional: false,
      },
      SEM_ORIGEM,
    );
    expect(decisao.tipo).toBe('barrar');
  });

  it('deep-link continua vencendo o default, inclusive para quem alcança os dois', () => {
    const decisao = destinoPosLogin(
      {
        role: 'tenant_owner',
        tenantId: 'castelo-producoes',
        platformAdmin: true,
        temPerfilProfissional: true,
      },
      '/eventos/meia-floripa-2026/inscritos',
    );
    expect(decisao).toEqual({
      tipo: 'rota',
      destino: '/eventos/meia-floripa-2026/inscritos',
    });
  });
});
