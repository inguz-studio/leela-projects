// =============================================================================
// FilterChips — a faceta de um filtro de listagem. Sempre LISTA.
//
// ⛔ ESTE ARQUIVO MUDOU DE CONTRATO EM 2026-08-17 (leva 20, lane FILTROS-LISTA).
// Até 16/08 ele travava o LIMIAR: três valores desenhavam fileira de chips,
// quatro viravam menu, e havia teste falsificando os dois lados do corte. O
// dono decidiu que filtro de listagem é lista em qualquer contagem, então o
// corte não existe mais e os testes dele foram REESCRITOS, não removidos em
// silêncio — o que era "com 3 valores desenha a fileira" virou "com 3 valores
// desenha a lista igual", que é a mesma pergunta com a resposta nova.
//
// O que este arquivo trava agora:
//
//   - A FORMA NÃO DEPENDE DA CONTAGEM. É o coração da decisão: três e quatro
//     valores produzem a mesma anatomia. Um teste por contagem, para que
//     reintroduzir o limiar quebre aqui e não em produção.
//   - O NOME DA FACETA É VISÍVEL. É o motivo MEDIDO da troca: a fileira só
//     nomeava a faceta no `aria-label`, e Membros mostrava dois "Todos" colados
//     sem dizer qual era Status e qual era Papel. O gatilho da lista carrega o
//     nome em texto.
//   - QUAL LISTA. `multiple` é `FilterMenu` (menuitemcheckbox), exclusiva é
//     `Combobox` — usar o menu de checkbox para escolha exclusiva anunciaria
//     "marcado" onde a semântica é "selecionado".
//   - O `disabled`, que o ADR-020 nomeou como condição de reabertura e que
//     esta lane pagou.
//   - A COMPOSIÇÃO: a peça não desenha popover nem lista próprios.
// =============================================================================

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChips, type FilterChipsOption } from '../FilterChips';

const TRES: FilterChipsOption[] = [
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'agendado', label: 'Agendado' },
  { id: 'enviado', label: 'Enviado' },
];

const QUATRO: FilterChipsOption[] = [...TRES, { id: 'cancelado', label: 'Cancelado' }];

/** Harness controlado — o pai é a fonte única de `selected` (uso real). */
function Controlada({
  options = TRES,
  multiple = false,
  onChangeSpy,
  ...resto
}: {
  options?: FilterChipsOption[];
  multiple?: boolean;
  onChangeSpy?: (next: string[]) => void;
  allLabel?: string;
  allCount?: number;
  disabled?: boolean;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  return (
    <FilterChips
      label="Status"
      options={options}
      multiple={multiple}
      selected={selected}
      onChange={(next) => {
        onChangeSpy?.(next);
        setSelected(next);
      }}
      {...resto}
    />
  );
}

describe('FilterChips · a forma não depende da contagem', () => {
  // O teste que substitui o antigo "com 3 valores desenha a fileira". A fileira
  // de chips era reconhecível pelo `role="group"`; nenhuma contagem a produz
  // mais.
  it('com 3 valores, faceta exclusiva é lista — nunca fileira de chips', () => {
    render(<Controlada options={TRES} />);
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument();
  });

  it('com 3 valores, faceta empilhável é lista — nunca fileira de chips', () => {
    render(<Controlada options={TRES} multiple />);
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByRole('button', { name: /Status: Todos/ })).toBeInTheDocument();
  });

  it('três e quatro valores produzem a MESMA anatomia (exclusiva)', () => {
    const { unmount } = render(<Controlada options={TRES} />);
    const comTres = screen.getByRole('button', { name: 'Status' }).className;
    unmount();

    render(<Controlada options={QUATRO} />);
    expect(screen.getByRole('button', { name: 'Status' }).className).toBe(comTres);
  });

  it('três e quatro valores produzem a MESMA anatomia (empilhável)', () => {
    const { unmount } = render(<Controlada options={TRES} multiple />);
    const comTres = screen.getByRole('button', { name: /Status: Todos/ }).className;
    unmount();

    render(<Controlada options={QUATRO} multiple />);
    expect(screen.getByRole('button', { name: /Status: Todos/ }).className).toBe(comTres);
  });

  // Uma opção só continua sendo lista. O limiar antigo teria desenhado um chip
  // solto; este caso existe para que ninguém reintroduza um corte "pequeno".
  it('com 1 valor ainda é lista', () => {
    render(<Controlada options={[TRES[0]!]} multiple />);
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByRole('button', { name: /Status: Todos/ })).toBeInTheDocument();
  });
});

describe('FilterChips · o nome da faceta é visível', () => {
  // O fato medido em 17/08: na fileira, Membros mostrava
  // `Todos · Ativos · Novos · Inativos · Todos · Owner · Admins · Membros` —
  // dois "Todos" colados, sem nada dizendo onde acaba uma faceta e começa a
  // outra. O nome existia só no `aria-label`. Aqui ele é TEXTO.
  it('empilhável: o gatilho mostra o nome da faceta e o que está aplicado', () => {
    render(<Controlada multiple />);
    expect(screen.getByRole('button', { name: /Status: Todos/ })).toHaveTextContent('Status: Todos');
  });

  it('exclusiva: o gatilho mostra o nome como nome acessível e o valor como texto', () => {
    render(<Controlada />);
    const gatilho = screen.getByRole('button', { name: 'Status' });
    expect(gatilho).toHaveTextContent('Todos');
  });

  it('empilhável: o gatilho resume quantos recortes estão aplicados', async () => {
    render(<Controlada multiple />);
    const gatilho = screen.getByRole('button', { name: /Status: Todos/ });
    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Rascunho/ }));
    expect(screen.getByRole('button', { name: /Status: 1/ })).toBeInTheDocument();
  });
});

describe('FilterChips · qual lista, e o que ela devolve', () => {
  it('empilhável abre um FilterMenu de menuitemcheckbox', async () => {
    render(<Controlada options={QUATRO} multiple />);
    await userEvent.click(screen.getByRole('button', { name: /Status: Todos/ }));
    const menu = screen.getByRole('menu', { name: 'Status' });
    expect(within(menu).getAllByRole('menuitemcheckbox')).toHaveLength(4);
  });

  it('empilhável: marca e desmarca cada valor sem tocar nos vizinhos', async () => {
    const spy = vi.fn();
    render(<Controlada multiple onChangeSpy={spy} />);
    const gatilho = () => screen.getByRole('button', { name: /Status:/ });
    await userEvent.click(gatilho());
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Rascunho/ }));
    expect(spy).toHaveBeenLastCalledWith(['rascunho']);
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Enviado/ }));
    expect(spy).toHaveBeenLastCalledWith(['rascunho', 'enviado']);
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Rascunho/ }));
    expect(spy).toHaveBeenLastCalledWith(['enviado']);
  });

  it('exclusiva abre o Combobox do DS, não a caixa do sistema operacional', async () => {
    render(<Controlada options={QUATRO} />);
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    expect(await screen.findByPlaceholderText('Buscar…')).toBeInTheDocument();
  });

  it('exclusiva: escolher troca o recorte, e "Todos" limpa', async () => {
    const spy = vi.fn();
    render(<Controlada options={QUATRO} onChangeSpy={spy} />);
    const gatilho = screen.getByRole('button', { name: 'Status' });
    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByText('Agendado'));
    expect(spy).toHaveBeenLastCalledWith(['agendado']);

    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByText('Todos'));
    expect(spy).toHaveBeenLastCalledWith([]);
  });

  // O id do "tudo" é interno e não pode escapar para o consumidor: quem lê
  // `selected` recebe [] quando nada está aplicado, nunca um id sentinela.
  it('o id sentinela do "Todos" nunca escapa em onChange', async () => {
    const spy = vi.fn();
    render(<Controlada options={QUATRO} onChangeSpy={spy} />);
    const gatilho = screen.getByRole('button', { name: 'Status' });
    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByText('Agendado'));
    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByText('Todos'));
    expect(spy.mock.calls.length).toBeGreaterThan(1);
    for (const chamada of spy.mock.calls) {
      expect(JSON.stringify(chamada[0])).not.toContain('__todos__');
    }
  });

  it('formata a contagem numa grafia só — "Rascunho · 12"', async () => {
    render(
      <Controlada options={[{ id: 'rascunho', label: 'Rascunho', count: 12 }]} allCount={64} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    expect(await screen.findByText('Rascunho · 12')).toBeInTheDocument();
    // "Todos · 64" aparece DUAS vezes de propósito, e é o desenho certo: no
    // gatilho (o que está aplicado) e na lista (a opção que limpa o filtro).
    expect(await screen.findAllByText('Todos · 64')).toHaveLength(2);
  });
});

describe('FilterChips · disabled (a condição de reabertura do ADR-020)', () => {
  // O diretório global de eventos desliga o recorte por status enquanto o
  // recorte por tenant está ativo. Sem esta prop, o ADR-020 tinha razão de
  // existir; com ela, a exceção morre.
  it('exclusiva desabilitada não abre a lista', async () => {
    render(<Controlada options={QUATRO} disabled />);
    const gatilho = screen.getByRole('button', { name: 'Status' });
    expect(gatilho).toBeDisabled();
    await userEvent.click(gatilho);
    expect(screen.queryByPlaceholderText('Buscar…')).toBeNull();
  });

  it('empilhável desabilitada não abre o menu', async () => {
    render(<Controlada options={QUATRO} multiple disabled />);
    const gatilho = screen.getByRole('button', { name: /Status: Todos/ });
    expect(gatilho).toBeDisabled();
    await userEvent.click(gatilho);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('sem a prop, a faceta continua ativa', () => {
    render(<Controlada options={QUATRO} />);
    expect(screen.getByRole('button', { name: 'Status' })).not.toBeDisabled();
  });
});

describe('FilterChips · composição (zero motor próprio)', () => {
  // A peça não pode desenhar lista, popover nem campo próprio: ela compõe
  // `FilterMenu` e `Combobox`. Um `<select>` aqui seria a violação que o cânone
  // proíbe com todas as letras ("filtro nunca é Select").
  it('não desenha select nativo em nenhum dos dois modos', () => {
    const { container, unmount } = render(<Controlada options={QUATRO} />);
    expect(container.querySelector('select')).toBeNull();
    unmount();

    const { container: c2 } = render(<Controlada options={QUATRO} multiple />);
    expect(c2.querySelector('select')).toBeNull();
  });

  it('fechada, a faceta ocupa um controle só — a lista vive no portal', () => {
    const { container } = render(<Controlada options={QUATRO} multiple />);
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });

  // ⚠️ ASSIMETRIA HERDADA, registrada em vez de escondida: `className` chega ao
  // GATILHO na faceta exclusiva (`Combobox`) e ao PAINEL do menu na empilhável
  // (`DropdownMenu.className` é documentado como "classe extra do PAINEL"). Com
  // o menu fechado, a classe da empilhável não existe no DOM. Não é defeito
  // desta lane e não foi consertado aqui — mexer na semântica do `DropdownMenu`
  // atinge todos os consumidores dele. Fica o teste do caso que se pode
  // afirmar, e o aviso para quem estilizar uma faceta empilhável e não vir
  // efeito no gatilho.
  it('aceita className na faceta exclusiva (chega ao gatilho)', () => {
    render(
      <FilterChips
        label="Faceta"
        options={TRES}
        selected={[]}
        onChange={() => {}}
        className="teste-faceta"
      />,
    );
    expect(document.querySelector('.teste-faceta')).not.toBeNull();
  });
});
