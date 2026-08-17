// =============================================================================
// TRAVA DE ROLAGEM — a suíte que impede a QUARTA reincidência.
//
// O dono reportou "scroll duplo" três vezes: menu secundário do evento, CRM e
// kits. As duas primeiras ganharam conserto pontual; o defeito voltou em tela
// nova porque a causa é de CLASSE, não de tela. Pela CSS Overflow 3 §3.1,
// declarar um eixo promove o outro de `visible` para `auto` — então todo
// contêiner que declarava um eixo só tinha uma segunda barra à espera de
// conteúdo que a acendesse.
//
// Esta suíte trava as duas metades do conserto:
//
//   1. CONTRATO — cada contêiner de rolagem do DS declara os DOIS eixos.
//      jsdom não faz layout, então isto é contrato de estilo, não pixel.
//   2. OVERRIDE — a trava vem DEPOIS do `className` no `cn()`, então um
//      consumidor não a apaga. Foi o buraco achado na REV-LOTES (c2b19244):
//      `cn` é `twMerge` e resolve pelo ÚLTIMO da lista, e com a trava antes um
//      `className="overflow-y-auto"` a apagava em silêncio — com o teste de
//      contrato ainda VERDE, porque ele renderiza sem `className`.
//
// Cada componente aparece nas duas metades. O que a suíte NÃO prova está dito
// no cabeçalho de utils/scroll.ts: aparência real em navegador.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Table } from '../../components/Table/Table';
import type { TableColumn } from '../../components/Table/Table';
import { Modal } from '../../components/Modal/Modal';
import { Dialog } from '../../components/Dialog/Dialog';
import { Tabs, type TabItem } from '../../components/Tabs/Tabs';
import { LayoutDashboard } from 'lucide-react';
import { Sidebar, sidebarNavIcon } from '../../components/Sidebar/Sidebar';
import { SCROLL_Y_ONLY, SCROLL_X_ONLY, SCROLL_X_ONLY_SEM_CROMO } from '../scroll';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Row = { id: string; nome: string };
const COLUNAS: TableColumn<Row>[] = [{ key: 'nome', header: 'Nome', render: (r) => r.nome }];
const LINHAS: Row[] = [{ id: '1', nome: 'Meia Floripa' }];

const ABAS: TabItem[] = [
  { id: 'a', label: 'Inscritos', content: <p>a</p> },
  { id: 'b', label: 'Kits', content: <p>b</p> },
];

/** Wrap da Table — o elemento que rola é o pai da <table>. */
function wrapDaTable(): HTMLElement {
  const tabela = screen.getByRole('table');
  const wrap = tabela.parentElement;
  if (wrap === null) throw new Error('wrap da Table não encontrado');
  return wrap;
}

/** Classes de eixo presentes num elemento. */
function eixosDe(el: HTMLElement): { x: string | undefined; y: string | undefined } {
  const tokens = el.className.split(/\s+/);
  return {
    x: tokens.find((t) => t.startsWith('overflow-x-')),
    y: tokens.find((t) => t.startsWith('overflow-y-')),
  };
}

// ---------------------------------------------------------------------------
// 1. CONTRATO — os dois eixos, sempre
// ---------------------------------------------------------------------------

describe('todo contêiner de rolagem do DS declara os DOIS eixos', () => {
  it('Table (dado largo): rola em x COM barra, fecha y', () => {
    render(<Table columns={COLUNAS} data={LINHAS} keyExtractor={(r) => r.id} responsive="scroll" />);
    const wrap = wrapDaTable();
    // A rolagem horizontal da grade densa é LEGÍTIMA e continua de pé — o alvo
    // nunca foi a capacidade de rolar, foi a barra que ninguém pediu.
    expect(wrap).toHaveClass('overflow-x-auto');
    expect(wrap).toHaveClass('overflow-y-hidden');
    // E a barra da tabela mantém o cromo: numa grade é a única pista de que
    // existe mais coluna para o lado.
    expect(wrap.className).not.toContain('scrollbar-width:none');
  });

  it('Modal: rola em y, fecha x — na wrapper do CORPO, não na moldura', () => {
    // MODAL-LOTE (17/08): a trava morou no `role="dialog"` (a moldura
    // inteira — header+corpo+footer) até esta lane. Um formulário mais alto
    // que `max-h` rolava os TRÊS juntos: a barra cortava o canto arredondado
    // de cima e escondia o rodapé (Cancelar/Salvar) abaixo da dobra. Agora só
    // o wrapper do corpo (pai do filho renderizado abaixo) tem a trava —
    // header e footer ficam fora da rolagem, sempre visíveis. Mesmo padrão
    // já provado pelo `Dialog` público, no teste logo abaixo.
    render(
      <Modal open onOpenChange={vi.fn()} title="Editar">
        <span data-testid="filho-do-modal">conteúdo</span>
      </Modal>,
    );
    const corpo = screen.getByTestId('filho-do-modal').parentElement;
    expect(corpo).toHaveClass('overflow-y-auto');
    expect(corpo).toHaveClass('overflow-x-hidden');
    // A MOLDURA não carrega overflow nenhum — quem rola é só o corpo.
    const moldura = screen.getByRole('dialog');
    expect(moldura.className).not.toMatch(/overflow-[xy]-/);
  });

  it('Dialog (corpo): rola em y, fecha x', () => {
    render(
      <Dialog open onOpenChange={vi.fn()} title="Título" bodyClassName="corpo">
        <span data-testid="filho-do-dialog">conteúdo</span>
      </Dialog>,
    );
    const corpo = screen.getByTestId('filho-do-dialog').parentElement;
    expect(corpo).toHaveClass('overflow-y-auto');
    expect(corpo).toHaveClass('overflow-x-hidden');
  });

  it('Tabs (tira de abas): rola em x SEM cromo, fecha y', () => {
    render(<Tabs tabs={ABAS} />);
    const tira = screen.getByRole('tablist');
    // Sem contêiner próprio, a tira `whitespace-nowrap` empurrava a PÁGINA na
    // horizontal — e agora que o RootShell fecha o eixo x, empurrar viraria aba
    // recortada. Cada widget largo carrega a própria rolagem.
    expect(tira).toHaveClass('overflow-x-auto');
    expect(tira).toHaveClass('overflow-y-hidden');
    expect(tira).toHaveClass('[scrollbar-width:none]');
    expect(tira).toHaveClass('[&::-webkit-scrollbar]:hidden');
    // Guarda contra o "conserto" errado: esconder o eixo x cortaria as abas.
    expect(tira).not.toHaveClass('overflow-x-hidden');
  });

  it('Sidebar (lista de seções): rola em y, fecha x', () => {
    render(
      <Sidebar
        sections={[
          {
            label: 'Geral',
            items: [
              { id: 'i', label: 'Início', icon: sidebarNavIcon(LayoutDashboard) },
            ],
          },
        ]}
      />,
    );
    const menu = screen.getByRole('navigation', { name: 'Navegação principal' });
    const rolador = within(menu)
      .getByText('Geral')
      .closest('div');
    expect(rolador).toHaveClass('overflow-y-auto');
    expect(rolador).toHaveClass('overflow-x-hidden');
  });

  it('nenhum deles fica com um eixo indefinido', () => {
    render(<Table columns={COLUNAS} data={LINHAS} keyExtractor={(r) => r.id} responsive="scroll" />);
    const { x, y } = eixosDe(wrapDaTable());
    expect(x).toBeDefined();
    expect(y).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. OVERRIDE — a trava não cai por um className de fora
// ---------------------------------------------------------------------------

/**
 * Os quatro overrides que o twMerge resolve a favor de quem vem por último.
 * Com a trava ANTES do `className`, cada um destes ressuscitava o defeito com a
 * suíte verde.
 */
const OVERRIDES_HOSTIS = [
  'overflow-y-auto',
  'overflow-x-auto',
  'overflow-auto',
  'overflow-visible',
] as const;

describe('a trava sobrevive a override do consumidor (twMerge resolve pelo último)', () => {
  it.each(OVERRIDES_HOSTIS)('Table com className="%s" mantém o eixo travado', (override) => {
    render(
      <Table
        columns={COLUNAS}
        data={LINHAS}
        keyExtractor={(r) => r.id}
        responsive="scroll"
        className={override}
      />,
    );
    const wrap = wrapDaTable();
    expect(wrap).toHaveClass('overflow-x-auto');
    expect(wrap).toHaveClass('overflow-y-hidden');
    expect(wrap).not.toHaveClass('overflow-y-auto');
  });

  it.each(OVERRIDES_HOSTIS)('Modal com className="%s" mantém o eixo travado', (override) => {
    // `className` do consumidor cai na MOLDURA (paridade com o `Dialog`
    // público), que não é mais quem rola — não há como colidir com a trava
    // do corpo, porque as duas classes vivem em elementos diferentes agora.
    render(
      <Modal open onOpenChange={vi.fn()} title="Editar" className={override}>
        <span data-testid="filho-do-modal">conteúdo</span>
      </Modal>,
    );
    const corpo = screen.getByTestId('filho-do-modal').parentElement;
    expect(corpo).toHaveClass('overflow-y-auto');
    expect(corpo).toHaveClass('overflow-x-hidden');
    expect(corpo).not.toHaveClass('overflow-x-auto');
    expect(screen.getByRole('dialog')).toHaveClass(override);
  });

  it.each(OVERRIDES_HOSTIS)('Dialog com bodyClassName="%s" mantém o eixo travado', (override) => {
    render(
      <Dialog open onOpenChange={vi.fn()} title="Título" bodyClassName={override}>
        <span data-testid="filho-do-dialog">conteúdo</span>
      </Dialog>,
    );
    const corpo = screen.getByTestId('filho-do-dialog').parentElement;
    expect(corpo).toHaveClass('overflow-y-auto');
    expect(corpo).toHaveClass('overflow-x-hidden');
    expect(corpo).not.toHaveClass('overflow-x-auto');
  });
});

describe('o que NÃO é eixo continua sobrescrevível', () => {
  // A trava não pode virar uma parede que ninguém consegue ajustar: ela só
  // vence no grupo de overflow do twMerge. Fundo, radius e padding seguem do
  // consumidor.
  it('Table aceita fundo do consumidor sem perder a trava', () => {
    render(
      <Table
        columns={COLUNAS}
        data={LINHAS}
        keyExtractor={(r) => r.id}
        responsive="scroll"
        className="bg-[var(--surface-sunken)]"
      />,
    );
    const wrap = wrapDaTable();
    expect(wrap).toHaveClass('bg-[var(--surface-sunken)]');
    expect(wrap).not.toHaveClass('bg-[var(--surface-raised)]');
    expect(wrap).toHaveClass('overflow-y-hidden');
  });

  it('Modal aceita padding do consumidor sem perder a trava', () => {
    render(
      <Modal open onOpenChange={vi.fn()} title="Editar" className="p-[var(--spacing-2)]">
        <span data-testid="filho-do-modal">conteúdo</span>
      </Modal>,
    );
    const painel = screen.getByRole('dialog');
    expect(painel).toHaveClass('p-[var(--spacing-2)]');
    expect(painel).not.toHaveClass('p-[var(--spacing-6)]');
    const corpo = screen.getByTestId('filho-do-modal').parentElement;
    expect(corpo).toHaveClass('overflow-x-hidden');
  });
});

// ---------------------------------------------------------------------------
// 3. As constantes usadas aqui são as MESMAS do padrão
// ---------------------------------------------------------------------------

describe('os componentes usam as constantes do padrão, não cópias', () => {
  it('Table carrega o SCROLL_X_ONLY inteiro', () => {
    render(<Table columns={COLUNAS} data={LINHAS} keyExtractor={(r) => r.id} responsive="scroll" />);
    for (const classe of SCROLL_X_ONLY.split(' ')) {
      expect(wrapDaTable()).toHaveClass(classe);
    }
  });

  it('Modal carrega o SCROLL_Y_ONLY inteiro (no corpo)', () => {
    render(
      <Modal open onOpenChange={vi.fn()} title="Editar">
        <span data-testid="filho-do-modal">conteúdo</span>
      </Modal>,
    );
    const corpo = screen.getByTestId('filho-do-modal').parentElement;
    for (const classe of SCROLL_Y_ONLY.split(' ')) {
      expect(corpo).toHaveClass(classe);
    }
  });

  it('Tabs carrega o SCROLL_X_ONLY_SEM_CROMO inteiro', () => {
    render(<Tabs tabs={ABAS} />);
    for (const classe of SCROLL_X_ONLY_SEM_CROMO.split(' ')) {
      expect(screen.getByRole('tablist')).toHaveClass(classe);
    }
  });
});
