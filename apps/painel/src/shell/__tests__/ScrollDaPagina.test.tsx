// =============================================================================
// ScrollDaPagina — o contêiner de rolagem da PÁGINA é um só, e vertical.
//
// O dono reportou "scroll duplo" três vezes: menu secundário do evento, CRM e
// kits. As duas primeiras ganharam conserto pontual no componente; o defeito
// voltou em tela nova porque a causa mora um nível acima, no shell.
//
// A causa está na especificação do CSS, não em bug de navegador: pela CSS
// Overflow 3 §3.1, declarar um eixo promove o outro de `visible` para `auto`.
// O `overflow-y-auto` sozinho do RootShell não entregava UM contêiner de
// rolagem, entregava dois — e o segundo, o horizontal, acendia toda vez que
// alguma tela estourava a largura. No Windows/Chrome essa barra é clássica:
// come ~15px da altura útil e empurra o conteúdo a estourar na vertical
// também. Por isso o defeito reaparecia em lugar diferente a cada rodada.
//
// A regra da casa e as três constantes estão no DS, em `utils/scroll.ts`.
// Aqui se trava o que é do painel:
//
//   1. existe UM contêiner de rolagem de página, e ele é o do RootShell;
//   2. ele declara os DOIS eixos — rola em y, fecha x;
//   3. a moldura em volta (AppShell) não rola, para não haver um segundo.
//
// jsdom não faz layout: nada aqui prova pixel. É contrato de estilo, e o que
// ele NÃO prova está na lista de conferência visual do handoff.
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SCROLL_Y_ONLY } from '@leela/design-system';
import { RootShell } from '../RootShell';

// Mesma sessão mockada dos outros testes do shell — sem Firebase real.
vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (u: { uid: string; displayName: string | null } | null) => void) => {
    cb({ uid: 'uid-marina', displayName: 'Marina Castelo' });
    return () => {};
  },
  getClaims: () => Promise.resolve({ tenantId: 'castelo', role: 'tenant_admin' }),
  getLeelaDb: () => ({}),
  listarEventosDoOrganizador: () => Promise.resolve([]),
}));

function montar(): HTMLElement {
  render(
    <MemoryRouter initialEntries={['/']}>
      <RootShell>
        <p>conteúdo da página</p>
      </RootShell>
    </MemoryRouter>,
  );
  return screen.getByRole('main');
}

/** Elementos que declaram QUALQUER eixo de overflow dentro de um nó. */
function roladores(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>('*')).filter((el) =>
    /(^|\s)overflow-(x|y)-(auto|scroll)(\s|$)/.test(el.className.toString()),
  );
}

describe('o contêiner de rolagem da página', () => {
  it('rola na vertical e FECHA a horizontal (senão o CSS promove o x a `auto`)', () => {
    const main = montar();
    const scroller = main.querySelector<HTMLElement>('.overflow-y-auto');
    expect(scroller).not.toBeNull();
    for (const classe of SCROLL_Y_ONLY.split(' ')) {
      expect(scroller).toHaveClass(classe);
    }
    // O eixo x fechado é a metade que faltava: com ele `visible`, qualquer tela
    // larga desenhava a barra horizontal no painel INTEIRO.
    expect(scroller).toHaveClass('overflow-x-hidden');
    expect(scroller).not.toHaveClass('overflow-x-auto');
  });

  it('usa a constante do DS, não uma cópia local', () => {
    // Se alguém reescrever as classes na mão aqui, o `eslint`
    // (leela-scroll/no-scroll-de-um-eixo) já derruba — este teste é a segunda
    // via, para o caso de a regra ser desligada por engano na configuração.
    const main = montar();
    const scroller = main.querySelector<HTMLElement>('.overflow-y-auto');
    expect(scroller?.className).toContain(SCROLL_Y_ONLY);
  });

  it('é o ÚNICO rolador da moldura — a página não tem um segundo por baixo', () => {
    const main = montar();
    // A sidebar do desktop e o drawer vivem FORA do `main`; o que estiver aqui
    // dentro com eixo rolável, com uma página trivial, é a área de conteúdo e
    // mais nada. Widget largo (tabela, sub-nav, tira de abas) traz o próprio
    // contêiner, mas só aparece quando a tela o renderiza.
    expect(roladores(main)).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // REV-SCROLL-RET — o caminho para a segunda barra que NÃO passa por `overflow`.
  //
  // Fechar os dois eixos resolve a barra que o próprio contêiner desenha. Não
  // resolve a que o DOCUMENTO desenha. Um descendente `position:absolute` cujos
  // ancestrais são todos `static` tem o `<html>` como bloco de contenção: nenhum
  // `overflow-hidden` do caminho o recorta (recorte só alcança quem tem aquele
  // elemento como bloco de contenção) e o scrollHeight do documento estica até
  // ele. É o `.sr-only` da `Pagination`, da `Table` e do `Stepper` — e o da
  // paginação cai DEPOIS de uma tabela longa, bem abaixo da dobra, em inscritos.
  // Resultado: barra vertical do documento ao lado da barra da página.
  //
  // O showroom mediu isto primeiro e travou o `<html>` (showcase.css). No painel
  // esse remédio envenena: as telas de autenticação (`AuthLayout`, `min-h-screen`)
  // vivem FORA do AppShell e rolam no documento de propósito. Por isso a trava é
  // por bloco de contenção, não por lock global.
  // ---------------------------------------------------------------------------
  it('o contêiner de rolagem é bloco de contenção do que rola dentro dele', () => {
    const main = montar();
    const scroller = main.querySelector<HTMLElement>('.overflow-y-auto');
    // Sem `relative`, um absoluto do conteúdo escapa deste contêiner: não rola
    // junto com o conteúdo E acende a barra do documento.
    expect(scroller).toHaveClass('relative');
  });

  it('a moldura em volta é bloco de contenção — o absoluto não chega ao `<html>`', () => {
    const main = montar();
    // O `main` do AppShell é a barreira de fora. Com ele `static`, o
    // `overflow-hidden` dele não alcança absoluto nenhum, e o documento estica.
    expect(main).toHaveClass('relative');
  });

  it('a moldura em volta NÃO rola (o `main` do AppShell é `overflow-hidden`)', () => {
    const main = montar();
    expect(main).toHaveClass('overflow-hidden');
    // `min-w-0` é o par do eixo x fechado: ele deixa o `main` encolher abaixo do
    // conteúdo em vez de empurrar a largura ("a constraint IMPEDE, não só
    // esconde", palavra do próprio AppShell).
    expect(main).toHaveClass('min-w-0');
  });
});
