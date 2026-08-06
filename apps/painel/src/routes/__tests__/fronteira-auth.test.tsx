// =============================================================================
// CONTRATO DA FRONTEIRA DE AUTENTICAÇÃO (FRONTEIRA-AUTH).
//
// O requisito do dono, verbatim: "ninguém deve entrar no sistema sem estar
// autenticado". Este arquivo mede isso no `App` REAL — o roteador de verdade,
// com o `RequireSessao` de verdade e o ambiente de PRODUÇÃO (guarda ativo) —
// e não numa árvore de rotas montada à mão para o teste.
//
// Por que isso importa: `RequireSessao.test.tsx` já prova que o guarda decide
// certo, mas monta um `<Routes>` próprio. Ele passaria verde com o `App.tsx`
// inteiro aberto ao mundo, porque nunca olha para o `App.tsx`. A tabela abaixo
// olha: cada linha é uma URL que o navegador de um anônimo pode digitar, e a
// afirmação é sempre a mesma — a barra de endereço termina em `/entrar`, com o
// destino guardado em `state.from` para o login devolver a pessoa onde ela
// tentou entrar.
//
// A última linha da tabela autenticada é uma rota que NÃO EXISTE. Ela prova o
// catch-all: o `/*` é greedy, então qualquer caminho novo que ninguém pensou
// nasce guardado. A única maneira de escapar é montar um `<Route>` IRMÃO do
// bloco guardado em `App.tsx` — e é isso que o lint
// `leela-auth/rota-fora-da-fronteira` barra, porque nenhum teste pode adivinhar
// o path de uma rota que ainda não existe.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';

// Ambiente de PRODUÇÃO: guarda ativo (`guardAtivo = !isModoEmulador()`). É o
// único ponto do app que decide se a fronteira morde — mockar aqui é mockar o
// build de produção sem precisar dele.
vi.mock('../../lib/firebase', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isModoEmulador: () => false,
  initFirebase: () => undefined,
}));

// Sessão: o api-client REAL, com só a assinatura de sessão trocada. Spread do
// módulo original de propósito — uma dublagem parcial escrita à mão quebraria
// em qualquer export novo que o `App` passasse a importar, e o teste morreria
// por motivo errado.
const { sessao } = vi.hoisted(() => ({
  // `emite: false` reproduz o instante REAL em que o navegador ainda não disse
  // se há sessão (restauração do IndexedDB pendente) — o Firebase simplesmente
  // não chamou o callback ainda.
  sessao: { user: null as { uid: string } | null, emite: true },
}));

vi.mock('@leela/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  onSessionChange: (cb: (user: { uid: string } | null) => void) => {
    if (sessao.emite) cb(sessao.user);
    return () => {};
  },
}));

const { App } = await import('../../App');

/** Coloca o navegador na URL antes de montar o `App` (ele usa BrowserRouter). */
function abrir(url: string): void {
  window.history.pushState({}, '', url);
  render(<App />);
}

// ---------------------------------------------------------------------------
// A tabela: toda superfície autenticada do painel, uma linha por subárvore.
// ---------------------------------------------------------------------------
const ROTAS_AUTENTICADAS: readonly string[] = [
  '/', // OverviewRoutes (E02) — a raiz do painel
  '/health', // HealthRoute — dentro da fronteira, não é sonda pública
  '/eventos', // EventosRoutes (E03)
  '/eventos/novo',
  '/eventos/meia-floripa-2026/inscritos?f=pendentes', // rota profunda + query
  '/eventos/repasses',
  '/clubes', // ClubesRoutes (E05)
  '/clubes/corrida-perfeita/membros',
  '/crm', // CrmRoutes (RN-233)
  '/crm/clientes',
  '/marcas', // MarcasRoutes (E10)
  '/plataforma', // PlataformaRoutes (E16) — a rota do relato do dono
  '/plataforma/tenants',
  '/plataforma/macro',
  '/conta', // ContaRoutes (S020-T4)
  '/conta/perfil-publico',
  '/financeiro/repasses', // rota LEGADA (RN-234) — o redirect também é guardado
  '/rota-que-ninguem-criou-ainda', // catch-all: o desconhecido nasce guardado
];

/** As quatro telas que o anônimo PRECISA alcançar — e só elas. */
const ROTAS_PUBLICAS: readonly string[] = [
  '/entrar',
  '/cadastrar',
  '/recuperar-senha',
  '/redefinir-senha',
];

beforeEach(() => {
  sessao.user = null;
  sessao.emite = true;
});

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('fronteira de autenticação · anônimo em produção', () => {
  it.each(ROTAS_AUTENTICADAS)('%s → /entrar (ninguém entra sem estar autenticado)', (url) => {
    abrir(url);
    expect(window.location.pathname).toBe('/entrar');
  });

  it('o destino não se perde no caminho: /entrar recebe state.from', () => {
    abrir('/plataforma/tenants');
    expect(window.location.pathname).toBe('/entrar');
    expect((window.history.state as { usr?: { from?: string } } | null)?.usr?.from).toBe(
      '/plataforma/tenants',
    );
  });

  it('nada do painel pinta antes da decisão: restauração pendente é espera, não conteúdo', () => {
    // O caminho que a classe de defeito costuma abrir: renderizar o conteúdo
    // enquanto a sessão "ainda está resolvendo". Aqui o `onSessionChange` nunca
    // emite — e o que aparece é o estado de espera, não o shell.
    sessao.emite = false;
    abrir('/plataforma');
    expect(screen.getByRole('status', { name: 'Verificando sessão' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/plataforma');
  });
});

describe('fronteira de autenticação · o que o anônimo PRECISA alcançar', () => {
  it.each(ROTAS_PUBLICAS)('%s abre sem sessão (senão o login vira laço)', (url) => {
    abrir(url);
    // Nem redirecionou, nem ficou preso no estado de espera do guarda.
    expect(window.location.pathname).toBe(url);
    expect(screen.queryByRole('status', { name: 'Verificando sessão' })).toBeNull();
  });

  it('a moldura pública é a do AuthLayout, não o shell do app', () => {
    abrir('/entrar');
    expect(screen.getByAltText('Leela')).toBeInTheDocument();
  });
});

describe('fronteira de autenticação · com sessão o painel volta a abrir', () => {
  it.each(['/', '/plataforma', '/eventos'])('%s renderiza para quem tem sessão', async (url) => {
    sessao.user = { uid: 'uid-teste' };
    abrir(url);
    // As sessões de claim resolvem em microtask (getClaims); drenar antes de
    // afirmar evita medir o app no meio de um estado que não é o dele.
    await act(async () => {
      await Promise.resolve();
    });
    // A fronteira não interfere: continua na URL pedida, sem quicar em /entrar.
    expect(window.location.pathname).toBe(url);
  });
});
