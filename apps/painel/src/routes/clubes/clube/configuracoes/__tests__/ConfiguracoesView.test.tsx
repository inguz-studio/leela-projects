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

  it('slug é read-only com hint — docId não é editável (fix S4)', () => {
    renderView();
    const slug = screen.getByLabelText('Slug público');
    expect(slug).toHaveAttribute('readonly');
    expect(slug).toHaveValue('corrida-perfeita-sul');
    expect(screen.getByText(/não pode ser alterado/)).toBeInTheDocument();
  });

  it('modelo Pago vem desabilitado com badge "Em breve" (RN-104)', () => {
    renderView();
    expect(screen.getByRole('button', { name: 'Pago' })).toBeDisabled();
    const regras = screen.getByRole('region', { name: 'Regras' });
    expect(within(regras).getByText('Em breve')).toBeInTheDocument();
  });

  it('mostra as 6 permissões independentes (RN-142)', () => {
    renderView();
    const grupo = screen.getByRole('group', { name: 'Permissões de admin' });
    expect(within(grupo).getAllByRole('checkbox')).toHaveLength(6);
  });

  it('Moderação e Permissões são "Em breve": inputs desabilitados, sem botão de salvar ativo (fix S4 — nunca sucesso falso)', () => {
    renderView();
    for (const nome of ['Moderação', 'Admin avançada']) {
      const secao = screen.getByRole('region', { name: nome });
      expect(within(secao).getByText('Em breve')).toBeInTheDocument();
      expect(within(secao).getByRole('button', { name: 'Disponível em breve' })).toBeDisabled();
      expect(within(secao).queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument();
    }
    const radios = within(screen.getByRole('group', { name: 'Comportamento dos membros' })).getAllByRole('radio');
    radios.forEach((r) => expect(r).toBeDisabled());
    const checks = within(screen.getByRole('group', { name: 'Permissões de admin' })).getAllByRole('checkbox');
    checks.forEach((c) => expect(c).toBeDisabled());
  });

  it('nome vazio desabilita o salvar da Identidade (espelho do guard das Rules)', async () => {
    renderView();
    const secao = screen.getByRole('region', { name: 'Identidade' });
    await userEvent.clear(within(secao).getByLabelText('Nome do clube'));
    expect(within(secao).getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('salvar identidade persiste o patch', async () => {
    const onSalvar = vi.fn();
    renderView({ onSalvar });
    const secao = screen.getByRole('region', { name: 'Identidade' });
    await userEvent.click(within(secao).getByRole('button', { name: 'Salvar alterações' }));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ nome: expect.any(String) }));
  });

  it('capa (imagemUrl) entra no patch da Identidade; nova URL mostra prévia (RN-166)', async () => {
    const onSalvar = vi.fn();
    renderView({ onSalvar });
    const secao = screen.getByRole('region', { name: 'Identidade' });
    const capa = within(secao).getByLabelText('Imagem de capa (URL)');
    await userEvent.clear(capa);
    await userEvent.type(capa, 'https://cdn.exemplo.com/capa.jpg');
    expect(within(secao).getByAltText('Prévia da capa do clube')).toHaveAttribute(
      'src',
      'https://cdn.exemplo.com/capa.jpg',
    );
    await userEvent.click(within(secao).getByRole('button', { name: 'Salvar alterações' }));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ imagemUrl: 'https://cdn.exemplo.com/capa.jpg' }),
    );
  });

  it('card crítico "Deletar clube" dispara onDeletar', async () => {
    const onDeletar = vi.fn();
    renderView({ onDeletar });
    const secao = screen.getByRole('region', { name: 'Deletar clube' });
    await userEvent.click(within(secao).getByRole('button', { name: 'Deletar clube' }));
    expect(onDeletar).toHaveBeenCalledOnce();
  });
});
