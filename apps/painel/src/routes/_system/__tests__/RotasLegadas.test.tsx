// =============================================================================
// GATE DETERMINÍSTICO DA RN-234 (IAM-T6) — um teste POR LINHA do mapa DE→PARA.
//
// Este arquivo É a condição da task. A tabela abaixo é copiada de
// `leela-specs/02-rodadas/2026-07-19-ia-menu/01-mapa-de-para.md` e o teste monta
// o ROTEADOR REAL (as rotas legadas de App.tsx + as subárvores reais de CRM e
// Eventos) para afirmar o destino RESOLVIDO de cada entrada.
//
// O que ele fecha, em ordem de quanto morde:
//   · POSITIVOS — toda URL antiga continua abrindo (link salvo, favorito, o
//     preview local do Vitor com a URL na mão);
//   · NEGATIVOS — `/crm/clientes` e `/crm/comunicacao` NÃO redirecionam. É aqui
//     que o erro de verdade aparece: a rota legada `/crm/:clienteKey` casa com
//     qualquer segmento, e sem precedência explícita `/crm/clientes` entraria
//     em laço de redirecionamento;
//   · MÁXIMO UM SALTO — guarda anti-laço. O histórico do MemoryRouter é
//     inspecionado: nenhuma entrada pode redirecionar duas vezes.
//
// As telas-folha viram marcadores: o que está sob teste é o ROTEAMENTO.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { rotasLegadas } from '../RotasLegadas';

vi.mock('../../crm/visao-geral/AnaliseVendasPage', () => ({
  AnaliseVendasPage: () => <div data-testid="alvo">crm:visao-geral</div>,
}));
vi.mock('../../crm/ClientesPage', () => ({
  ClientesPage: () => <div data-testid="alvo">crm:clientes</div>,
}));
vi.mock('../../crm/ClienteDetailPage', () => ({
  ClienteDetailPage: () => {
    const { clienteKey } = useParams();
    return <div data-testid="alvo">{`crm:ficha:${clienteKey ?? ''}`}</div>;
  },
}));
vi.mock('../../eventos/repasses/RepassesPage', () => ({
  RepassesPage: () => <div data-testid="alvo">eventos:repasses</div>,
}));
vi.mock('../../eventos/hub/HubRoute', () => ({
  HubRoute: () => <div data-testid="alvo">eventos:lista</div>,
}));
vi.mock('../../eventos/evento/EventoLayout', () => ({
  EventoLayout: () => <div data-testid="alvo">eventos:evento</div>,
}));
vi.mock('../../eventos/novo/NovoEventoRoute', () => ({
  NovoEventoRoute: () => <div data-testid="alvo">eventos:novo</div>,
}));

const { CrmRoutes } = await import('../../crm/CrmRoutes');
const { EventosRoutes } = await import('../../eventos/EventosRoutes');

/** Registra cada pathname por onde o roteador passou (conta os saltos). */
function Sonda({ trilha }: { trilha: string[] }): null {
  const { pathname } = useLocation();
  if (trilha[trilha.length - 1] !== pathname) trilha.push(pathname);
  return null;
}

/**
 * Monta a árvore REAL: as rotas legadas exatamente como o App.tsx as monta,
 * mais as subárvores de destino. Devolve o marcador da tela que resolveu e a
 * trilha de pathnames percorrida.
 */
function resolver(entrada: string): { tela: string; trilha: string[] } {
  const trilha: string[] = [];
  const { unmount } = render(
    <MemoryRouter initialEntries={[entrada]}>
      <Sonda trilha={trilha} />
      <Routes>
        <Route path="/crm/*" element={<CrmRoutes />} />
        <Route path="/eventos/*" element={<EventosRoutes />} />
        {rotasLegadas()}
      </Routes>
    </MemoryRouter>,
  );
  // Nem toda rota resolve num marcador: `/crm/comunicacao` abre o estado
  // honesto real (sem mock). A trilha de pathnames é a asserção principal;
  // o marcador é o reforço quando existe.
  const tela = screen.queryByTestId('alvo')?.textContent ?? '';
  unmount();
  return { tela, trilha };
}

// ---------------------------------------------------------------------------
// POSITIVOS — a tabela do mapa DE→PARA, linha a linha
// ---------------------------------------------------------------------------

describe('RN-234 · positivos: toda rota legada resolve', () => {
  it.each([
    // entrada                     destino final        tela que abre
    ['/financeiro', '/crm', 'crm:visao-geral'],
    ['/financeiro/repasses', '/eventos/repasses', 'eventos:repasses'],
    ['/financeiro/qualquer-coisa', '/crm', 'crm:visao-geral'],
    ['/crm/abc123', '/crm/clientes/abc123', 'crm:ficha:abc123'],
  ])('%s → %s', (entrada, destino, tela) => {
    const r = resolver(entrada);
    expect(r.trilha[r.trilha.length - 1]).toBe(destino);
    expect(r.tela).toBe(tela);
  });

  it('a chave legada sobrevive ao salto, inclusive com caractere especial', () => {
    expect(resolver('/crm/tipo_abc%2F123').tela).toBe('crm:ficha:tipo_abc/123');
  });

  it('caminho fundo do módulo morto também cai no CRM (o 404 dele morreu junto)', () => {
    expect(resolver('/financeiro/analise/detalhe/9').trilha.at(-1)).toBe('/crm');
  });
});

// ---------------------------------------------------------------------------
// NEGATIVOS — a parte que pega o erro de verdade
// ---------------------------------------------------------------------------

describe('RN-234 · negativos: o que NÃO pode redirecionar', () => {
  it('/crm/clientes NÃO redireciona — resolve na lista', () => {
    const r = resolver('/crm/clientes');
    expect(r.trilha).toEqual(['/crm/clientes']); // zero salto
    expect(r.tela).toBe('crm:clientes');
  });

  it('/crm/comunicacao NÃO redireciona — resolve na subdivisão', () => {
    const r = resolver('/crm/comunicacao');
    expect(r.trilha).toEqual(['/crm/comunicacao']); // zero salto
    // Resolve na subdivisão real (estado honesto), não numa tela mockada nem
    // na ficha de um cliente de chave "comunicacao".
    expect(r.tela).toBe('');
  });

  it('/crm resolve na Visão geral, sem passar por redirect', () => {
    const r = resolver('/crm');
    expect(r.trilha).toEqual(['/crm']); // zero salto
    expect(r.tela).toBe('crm:visao-geral');
  });

  it('/crm/visao-geral NÃO vira ficha de um cliente chamado "visao-geral"', () => {
    const r = resolver('/crm/visao-geral');
    expect(r.trilha).toEqual(['/crm/visao-geral']); // zero salto
    expect(r.tela).toBe('crm:visao-geral');
  });

  it('/eventos/repasses NÃO redireciona — é destino, não origem', () => {
    const r = resolver('/eventos/repasses');
    expect(r.trilha).toEqual(['/eventos/repasses']);
    expect(r.tela).toBe('eventos:repasses');
  });
});

// ---------------------------------------------------------------------------
// GUARDA ANTI-LAÇO — no máximo um salto, para toda entrada da tabela
// ---------------------------------------------------------------------------

describe('RN-234 · no máximo UM salto (guarda anti-laço)', () => {
  it.each([
    '/financeiro',
    '/financeiro/repasses',
    '/financeiro/qualquer-coisa',
    '/crm/abc123',
    '/crm',
    '/crm/clientes',
    '/crm/clientes/abc123',
    '/crm/comunicacao',
    '/crm/visao-geral',
    '/eventos',
    '/eventos/repasses',
  ])('%s resolve em no máximo 1 redirecionamento', (entrada) => {
    const { trilha } = resolver(entrada);
    // trilha = [entrada] sem salto, ou [entrada, destino] com um salto.
    expect(trilha.length, `trilha: ${trilha.join(' → ')}`).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// A tabela exportada é a mesma que o App.tsx monta (fonte única)
// ---------------------------------------------------------------------------

describe('RN-234 · o módulo financeiro deixou de existir', () => {
  it('nenhuma rota legada serve tela própria — todas redirecionam', () => {
    for (const entrada of ['/financeiro', '/financeiro/repasses', '/financeiro/x']) {
      const { trilha } = resolver(entrada);
      expect(trilha[0]).toBe(entrada);
      expect(trilha.length, `${entrada} não redirecionou`).toBe(2);
      expect(trilha[1]?.startsWith('/financeiro')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// A-3 (review antagonista) — o que a tabela NÃO cobria: querystring e fragmento
//
// `<Navigate to="/destino">` com string simples troca a location INTEIRA. O
// `?a=b#c` da URL antiga evaporava no salto, e nenhum dos 44 testes olhava para
// além do pathname. Quem paga primeiro é o preview local do Vitor: `?preview=`
// escolhe a identidade do seed, o autologin a lê antes do render (a primeira
// carga funciona) e o F5 seguinte, já sem o parâmetro, cai na identidade padrão
// sem avisar. A RN-234 promete o contrário: "o preview local continua abrindo
// em qualquer URL que já estivesse na mão dele".
// ---------------------------------------------------------------------------

/** Registra a location COMPLETA (pathname + search + hash) de cada passada. */
function SondaCompleta({ trilha }: { trilha: string[] }): null {
  const { pathname, search, hash } = useLocation();
  const atual = `${pathname}${search}${hash}`;
  if (trilha[trilha.length - 1] !== atual) trilha.push(atual);
  return null;
}

/** Como `resolver`, mas a trilha carrega querystring e fragmento. */
function resolverCompleto(entrada: string): string[] {
  const trilha: string[] = [];
  const { unmount } = render(
    <MemoryRouter initialEntries={[entrada]}>
      <SondaCompleta trilha={trilha} />
      <Routes>
        <Route path="/crm/*" element={<CrmRoutes />} />
        <Route path="/eventos/*" element={<EventosRoutes />} />
        {rotasLegadas()}
      </Routes>
    </MemoryRouter>,
  );
  unmount();
  return trilha;
}

describe('RN-234 · o salto preserva querystring e fragmento', () => {
  it.each([
    ['/financeiro?preview=admin', '/crm?preview=admin'],
    ['/financeiro/repasses?preview=corrida', '/eventos/repasses?preview=corrida'],
    ['/financeiro/qualquer-coisa?preview=admin', '/crm?preview=admin'],
    ['/crm/abc123?preview=admin', '/crm/clientes/abc123?preview=admin'],
  ])('%s → %s', (entrada, destino) => {
    expect(resolverCompleto(entrada).at(-1)).toBe(destino);
  });

  it('mais de um parâmetro sobrevive inteiro, na ordem', () => {
    expect(resolverCompleto('/financeiro/repasses?preview=admin&evento=meia-2026').at(-1)).toBe(
      '/eventos/repasses?preview=admin&evento=meia-2026',
    );
  });

  it('o fragmento (#) também viaja', () => {
    expect(resolverCompleto('/financeiro#saldo').at(-1)).toBe('/crm#saldo');
  });

  it('sem querystring nada é inventado — o destino sai limpo', () => {
    expect(resolverCompleto('/financeiro').at(-1)).toBe('/crm');
    expect(resolverCompleto('/crm/abc123').at(-1)).toBe('/crm/clientes/abc123');
  });

  it('preservar não reabre laço: segue em no máximo UM salto', () => {
    for (const entrada of [
      '/financeiro?preview=admin',
      '/financeiro/repasses?preview=admin',
      '/crm/abc123?preview=admin',
      '/crm/clientes?preview=admin',
    ]) {
      const trilha = resolverCompleto(entrada);
      expect(trilha.length, `trilha: ${trilha.join(' → ')}`).toBeLessThanOrEqual(2);
    }
  });
});
