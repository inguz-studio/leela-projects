import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventRow } from '../EventRow';

describe('EventRow', () => {
  it('renderiza nome, contagem x/y e rótulo uppercase', () => {
    render(
      <EventRow
        name="Meia Maratona Floripa 2026"
        thumbVariant="corrida"
        count={{ value: '453', total: '500', label: 'Inscrições' }}
      />,
    );
    expect(screen.getByText('Meia Maratona Floripa 2026')).toBeInTheDocument();
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(screen.getByText('/ 500')).toBeInTheDocument();
    expect(screen.getByText('Inscrições')).toHaveClass('uppercase');
  });

  it('contagem sem total omite o "/ total" (estado honesto)', () => {
    render(
      <EventRow
        name="Corrida de Inverno"
        thumbVariant="corrida"
        count={{ value: '90', label: 'Inscrições' }}
      />,
    );
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.queryByText(/\//)).toBeNull();
  });

  it('thumb usa a classe de gradiente token da variante + ícone default aria-hidden', () => {
    const { container } = render(<EventRow name="MTB" thumbVariant="ciclismo" />);
    const thumb = container.querySelector('[class*="--thumb-ciclismo"]');
    expect(thumb).not.toBeNull();
    expect(thumb).toHaveAttribute('aria-hidden');
    expect(thumb!.querySelector('svg')).not.toBeNull();
  });

  it('thumbImage renderiza a FOTO da capa (decorativa) no lugar do gradiente', () => {
    const { container } = render(
      <EventRow
        name="Meia Maratona Floripa 2026"
        thumbVariant="corrida"
        thumbImage={{ src: '/seed-images/meia-maratona.jpg' }}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/seed-images/meia-maratona.jpg');
    // Decorativa: nome da linha já rotula → alt vazio, sem ícone/gradiente
    expect(img).toHaveAttribute('alt', '');
    expect(container.querySelector('[class*="--thumb-corrida"]')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('metrics renderiza o grupo inline de KPIs (Inscritos/Receita/Vagas)', () => {
    render(
      <EventRow
        name="Meia Maratona Floripa 2026"
        thumbVariant="corrida"
        metrics={[
          { value: '453', label: 'Inscritos' },
          { value: 'R$ 85.617', label: 'Receita' },
          { value: '47', label: 'Vagas' },
        ]}
      />,
    );
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(screen.getByText('R$ 85.617')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('Receita')).toHaveClass('uppercase');
  });

  it('cada métrica ocupa uma COLUNA de largura mínima fixa alinhada à direita (alinhamento entre linhas)', () => {
    const { container } = render(
      <EventRow
        name="Meia Maratona Floripa 2026"
        thumbVariant="corrida"
        metrics={[
          { value: '0', label: 'Inscritos' },
          { value: 'R$ 167.277', label: 'Receita' },
          { value: '80', label: 'Vagas' },
        ]}
      />,
    );
    // As 3 colunas carregam a mesma largura mínima tokenizada + text-right:
    // é o que garante Inscritos/Receita/Vagas batendo na vertical entre linhas,
    // independentemente do tamanho do valor ("0" vs "R$ 167.277").
    const cols = container.querySelectorAll(
      '[class*="--eventrow-metric-col-min-w"]',
    );
    expect(cols).toHaveLength(3);
    cols.forEach((c) => expect(c).toHaveClass('text-right'));
  });

  it('metrics tem precedência sobre count quando ambos são passados', () => {
    render(
      <EventRow
        name="Evento"
        thumbVariant="corrida"
        count={{ value: '999', label: 'Inscrições' }}
        metrics={[{ value: '453', label: 'Inscritos' }]}
      />,
    );
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(screen.queryByText('999')).toBeNull();
  });

  it('metaItems são intercalados com dot-sep decorativo', () => {
    const { container } = render(
      <EventRow
        name="Evento"
        thumbVariant="corrida"
        metaItems={['27 Abr · Floripa', 'extra']}
      />,
    );
    expect(screen.getByText('27 Abr · Floripa')).toBeInTheDocument();
    expect(screen.getByText('extra')).toBeInTheDocument();
    // 1 dot entre 2 itens (além do dot do thumb não existir: só o separador)
    const dots = container.querySelectorAll('[class*="--eventrow-dot-size"]');
    expect(dots).toHaveLength(1);
    expect(dots[0]).toHaveAttribute('aria-hidden');
  });

  it('onClick na row é atalho de mouse; clique na ação NÃO propaga', async () => {
    const onRow = vi.fn();
    const onAction = vi.fn();
    render(
      <EventRow
        name="Evento"
        thumbVariant="corrida"
        onClick={onRow}
        action={
          <button type="button" onClick={onAction}>
            Gerenciar
          </button>
        }
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Gerenciar' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onRow).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('Evento'));
    expect(onRow).toHaveBeenCalledTimes(1);
  });

  it('badge e action renderizam nos slots', () => {
    render(
      <EventRow
        name="Evento"
        thumbVariant="yoga"
        badge={<span>Publicado</span>}
        action={<button type="button">Gerenciar</button>}
      />,
    );
    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerenciar' })).toBeInTheDocument();
  });
});
