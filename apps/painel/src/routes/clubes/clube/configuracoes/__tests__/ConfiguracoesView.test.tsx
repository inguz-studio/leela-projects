import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfiguracoesView } from '../ConfiguracoesView';
import { mkClube } from '../../../_test/fixtures';

const noop = () => {};

function renderView(over = {}) {
  return render(
    <ConfiguracoesView clube={mkClube()} onSalvar={noop} onDeletar={noop} {...over} />,
  );
}

describe('ConfiguracoesView', () => {
  it('renderiza a navegação âncora com 5 seções e as 5 seções', () => {
    renderView();
    const nav = screen.getByRole('navigation', { name: 'Seções das configurações' });
    expect(within(nav).getAllByRole('button')).toHaveLength(5);
    expect(screen.getByRole('region', { name: 'Identidade' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Admin avançada' })).toBeInTheDocument();
  });

  it('clique na âncora marca a seção como ativa (scroll spy)', async () => {
    renderView();
    const nav = screen.getByRole('navigation', { name: 'Seções das configurações' });
    const btnRegras = within(nav).getByRole('button', { name: 'Regras' });
    await userEvent.click(btnRegras);
    expect(btnRegras).toHaveAttribute('aria-current', 'true');
  });

  it('slug sanitiza em tempo real', async () => {
    renderView();
    const slug = screen.getByLabelText('Slug público');
    await userEvent.clear(slug);
    await userEvent.click(slug);
    await userEvent.paste('Nova Corrida!!');
    expect(slug).toHaveValue('nova-corrida');
  });

  it('modelo Pago vem desabilitado com badge "Em breve" (RN-104)', () => {
    renderView();
    expect(screen.getByRole('button', { name: 'Pago' })).toBeDisabled();
    expect(screen.getByText('Em breve')).toBeInTheDocument();
  });

  it('mostra as 6 permissões independentes (RN-142)', () => {
    renderView();
    const grupo = screen.getByRole('group', { name: 'Permissões de admin' });
    expect(within(grupo).getAllByRole('checkbox')).toHaveLength(6);
  });

  it('salvar identidade persiste o patch', async () => {
    const onSalvar = vi.fn();
    renderView({ onSalvar });
    const secao = screen.getByRole('region', { name: 'Identidade' });
    await userEvent.click(within(secao).getByRole('button', { name: 'Salvar alterações' }));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ nome: expect.any(String) }));
  });

  it('card crítico "Deletar clube" dispara onDeletar', async () => {
    const onDeletar = vi.fn();
    renderView({ onDeletar });
    const secao = screen.getByRole('region', { name: 'Deletar clube' });
    await userEvent.click(within(secao).getByRole('button', { name: 'Deletar clube' }));
    expect(onDeletar).toHaveBeenCalledOnce();
  });
});
