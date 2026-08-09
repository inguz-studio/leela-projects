// =============================================================================
// A VITRINE NÃO CONSULTA NADA (ONBOARD-VITRINE · RN-510) — prova executável.
//
// Este é o critério de aceite que a lane não podia entregar por leitura. A
// razão de o desenho anterior NÃO montar a rota da conta sem tenant era exata:
// montar a rota real dispara as queries da tela, que voltam `permission-denied`
// atrás do véu — round-trip pago, 403 no log e uma intenção anunciada ao
// servidor por quem não tem crachá. Trocar a parede pela vitrine só é honesto
// se a propriedade sobreviver à troca.
//
// COMO SE MEDE, e por que assim. A afirmação NÃO é "estas N funções não foram
// chamadas" — uma lista de proibições envelhece: a query nova de amanhã não
// está nela e passa calada. A afirmação é o inverso, e é fechada: **com a conta
// em vitrine, o painel chama do api-client SÓ o que está na allowlist**.
// Qualquer leitura nova, em qualquer tela, em qualquer lane futura, aparece
// aqui como nome desconhecido e derruba o caso.
//
// O `App` é o REAL, com `RequireSessao` ativo (ambiente de produção mockado) e
// sessão viva sem `tenantId` — o crachá exato das duas contas de 06/08.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { CONTATO_ONBOARDING_PADRAO } from '@leela/core';
import { usuario } from '@/test/usuario';

// Ambiente de PRODUÇÃO: o guarda da fronteira morde (o mesmo mock do contrato
// da FRONTEIRA-AUTH). Sem isto o guard fica inerte e o teste mediria o preview.
vi.mock('../../../lib/firebase', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isModoEmulador: () => false,
  initFirebase: () => undefined,
}));

const registro = vi.hoisted(() => ({ nomes: new Set<string>() }));

// O api-client inteiro vira espelho instrumentado: toda função exportada
// registra o próprio nome ao ser chamada. As quatro portas que a vitrine PODE
// usar ganham implementação; o resto devolve `undefined` e fica no registro.
vi.mock('@leela/api-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const espelho: Record<string, unknown> = {};
  for (const [nome, valor] of Object.entries(original)) {
    espelho[nome] =
      typeof valor === 'function'
        ? (..._args: unknown[]) => {
            registro.nomes.add(nome);
            return undefined;
          }
        : valor;
  }
  return {
    ...espelho,
    onSessionChange: (cb: (u: { uid: string } | null) => void) => {
      registro.nomes.add('onSessionChange');
      cb({ uid: 'u-vitrine' });
      return () => {};
    },
    // Crachá VAZIO: autenticada, sem papel, sem tenant. É o estado da conta que
    // se cadastrou e ainda não resgatou código nenhum.
    getClaims: async () => {
      registro.nomes.add('getClaims');
      return {};
    },
    getLeelaDb: () => {
      registro.nomes.add('getLeelaDb');
      return {};
    },
    getLeelaFunctions: () => {
      registro.nomes.add('getLeelaFunctions');
      return {};
    },
    // Canal do CTA (RN-417): doc `platform/configOnboarding`, legível por
    // qualquer conta autenticada. NÃO é tenant-scoped — por isso está na lista.
    getContatoOnboarding: async () => {
      registro.nomes.add('getContatoOnboarding');
      return CONTATO_ONBOARDING_PADRAO;
    },
  };
});

const { App } = await import('../../../App');

/**
 * As ÚNICAS portas do api-client que a conta em vitrine pode abrir.
 *
 * Nenhuma delas lê dado de tenant:
 *  - `onSessionChange` / `getClaims` — o crachá, do próprio token, sem rede de
 *    Firestore (o `getClaims` sem `force` nem sai do dispositivo);
 *  - `getLeelaDb` — o handle do Firestore, que a query do contato precisa ter
 *    em mãos; abrir o handle não lê documento nenhum;
 *  - `getContatoOnboarding` — `platform/configOnboarding`, doc de plataforma
 *    aberto a toda conta autenticada (RN-417, reconciliada em 03/08).
 */
const PORTAS_PERMITIDAS: ReadonlySet<string> = new Set([
  'onSessionChange',
  'getClaims',
  'getLeelaDb',
  'getContatoOnboarding',
]);

/**
 * As rotas que a pessoa alcança pelo menu, mais o desconhecido, mais `/conta`.
 *
 * `/conta` entrou na review antagonista (REV-VITRINE · DEF-R4) e é a mais
 * importante da lista, não a última: ela é a ÚNICA rota liberada
 * (`ROTAS_LIBERADAS` do gate), e portanto o único endereço onde a conta em
 * vitrine monta uma tela REAL, com hooks de dados de verdade, em vez da
 * `VitrinePainel`. Faltar aqui era o inverso exato do que a lista deveria
 * cobrir: mediam-se seis rotas onde nenhuma tela monta e deixava-se de fora a
 * única onde alguma monta.
 *
 * Dentro de `/conta` vivem a `RecebimentoSection` (RN-366) e o editor de perfil
 * público — duas telas que uma lane futura pode ligar a dado de tenant sem que
 * nada reclame. Hoje as duas estão limpas, e é isso que estes dois casos
 * congelam.
 */
const ROTAS_DA_VITRINE: readonly string[] = [
  '/',
  '/eventos',
  '/clubes',
  '/crm',
  '/marcas',
  '/plataforma',
  '/conta',
  '/conta/perfil-publico',
  '/rota-que-ninguem-criou-ainda',
];

function abrir(url: string): void {
  window.history.pushState({}, '', url);
  render(<App />);
}

/** Nomes chamados que NÃO estão na allowlist. Vazio é o contrato. */
function forasteiras(): string[] {
  return [...registro.nomes].filter((nome) => !PORTAS_PERMITIDAS.has(nome)).sort();
}

beforeEach(() => {
  registro.nomes.clear();
});

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('vitrine · nenhuma query tenant-scoped sai do painel (RN-510)', () => {
  it.each(ROTAS_DA_VITRINE)('%s abre em vitrine sem consultar dado de tenant', async (url) => {
    abrir(url);
    // Deixa os efeitos de sessão assentarem: é DEPOIS de resolver o crachá que
    // um hook mal guardado dispararia a query.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(forasteiras()).toEqual([]);
  });

  it('enquanto o crachá é lido, a rota real NÃO monta (a janela que vazava)', () => {
    // Sem este estado, `/crm` disparava `getOverview` e `/marcas` disparava
    // `listarMarcas` antes de o crachá voltar — as duas telas guardam o
    // `enabled` por `uid`/`eventoId`, nunca por `tenantId`.
    abrir('/crm');
    expect(screen.getByRole('status', { name: 'Carregando o painel' })).toBeInTheDocument();
    expect(forasteiras()).toEqual([]);
  });

  it('a tela da vitrine renderiza no lugar da rota real', async () => {
    abrir('/eventos');
    await act(async () => {
      await Promise.resolve();
    });
    // O conteúdo acompanha o endereço (o menu continua navegando), e o que
    // aparece é a vitrine, não a página de eventos.
    expect(screen.getByText(/Esta área abre com o código Leela/i)).toBeInTheDocument();
  });

  it('a espera do crachá TEM prazo: leitura pendurada acaba em vitrine, não em skeleton eterno', async () => {
    // REV-VITRINE · DEF-R3. `getClaims` que nunca assenta (a aba que o celular
    // suspendeu no meio do refresh do token) deixava a pessoa num retângulo
    // cinza para sempre: promessa pendurada não rejeita, então o `catch` que
    // trata a leitura com ERRO nunca rodava. Medido antes do conserto: cinco
    // minutos de relógio simulado, skeleton ainda na tela, vitrine nunca.
    //
    // Depois do prazo o estado é o MESMO em que a leitura com erro já
    // aterrissava — autenticada sem papel, que é vitrine. Fail-closed: nada se
    // abre por decurso de prazo.
    vi.resetModules();
    vi.doMock('@leela/api-client', async (importOriginal) => {
      const original = await importOriginal<Record<string, unknown>>();
      const espelho: Record<string, unknown> = {};
      for (const [nome, valor] of Object.entries(original)) {
        espelho[nome] =
          typeof valor === 'function'
            ? (..._args: unknown[]) => {
                registro.nomes.add(nome);
                return undefined;
              }
            : valor;
      }
      return {
        ...espelho,
        onSessionChange: (cb: (u: { uid: string } | null) => void) => {
          cb({ uid: 'u-pendurada' });
          return () => {};
        },
        getClaims: () => new Promise(() => {}),
        getLeelaDb: () => ({}),
        getLeelaFunctions: () => ({}),
        getContatoOnboarding: async () => CONTATO_ONBOARDING_PADRAO,
      };
    });
    const { App: AppPendurado } = await import('../../../App');
    vi.useFakeTimers();
    try {
      window.history.pushState({}, '', '/crm');
      render(<AppPendurado />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByRole('status', { name: 'Carregando o painel' })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(13_000);
      });
      expect(screen.queryByRole('status', { name: 'Carregando o painel' })).toBeNull();
      expect(screen.getByText(/Esta área abre com o código Leela/i)).toBeInTheDocument();
      // E o prazo não abriu porta nenhuma: a rota real de /crm continua sem
      // montar, e nenhuma query tenant-scoped saiu.
      expect(forasteiras()).toEqual([]);
    } finally {
      vi.useRealTimers();
      vi.doUnmock('@leela/api-client');
      vi.resetModules();
    }
  });

  it('o aviso sobe no CLIQUE e a vitrine segue sem consultar nada', async () => {
    abrir('/');
    await act(async () => {
      await Promise.resolve();
    });
    await usuario().click(screen.getByRole('button', { name: /Como receber o código Leela/i }));
    expect(screen.getByRole('heading', { name: /Boas-vindas à Leela/i })).toBeInTheDocument();
    expect(forasteiras()).toEqual([]);
  });
});
