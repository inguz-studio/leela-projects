import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InscritosView } from '../InscritosView';
import { mkInscrito } from '../../_test/fixtures';

function muitosInscritos(n: number) {
  return Array.from({ length: n }, (_, i) =>
    mkInscrito({
      id: `i${i}`,
      atletaNome: i === 0 ? 'Marina Silva' : `Atleta ${String(i).padStart(3, '0')}`,
      modalidade: '10k',
    }),
  );
}

describe('InscritosView', () => {
  it('mostra ~18 linhas por página e contador com o total', () => {
    render(
      <InscritosView inscritos={muitosInscritos(453)} loading={false} error={null} modalidades={['10k']} />,
    );
    // header + 18 linhas de dados
    expect(screen.getAllByRole('row')).toHaveLength(19);
    expect(screen.getByText('Mostrando 453 de 453')).toBeInTheDocument();
  });

  it('busca "Marina" filtra e atualiza o contador', async () => {
    render(
      <InscritosView inscritos={muitosInscritos(50)} loading={false} error={null} modalidades={['10k']} />,
    );
    await userEvent.type(screen.getByLabelText('Buscar atleta'), 'Marina');
    expect(screen.getByText('Mostrando 1 de 50')).toBeInTheDocument();
    expect(screen.getByText('Marina Silva')).toBeInTheDocument();
  });

  it('filtro sem correspondência mostra EmptyState', async () => {
    render(
      <InscritosView inscritos={muitosInscritos(20)} loading={false} error={null} modalidades={['10k']} />,
    );
    await userEvent.type(screen.getByLabelText('Buscar atleta'), 'Zzzzz');
    expect(screen.getByText('Nenhum inscrito encontrado')).toBeInTheDocument();
  });

  it('clicar em Detalhe abre o slide-in do inscrito', async () => {
    render(
      <InscritosView inscritos={muitosInscritos(3)} loading={false} error={null} modalidades={['10k']} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ver detalhe de Marina Silva' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Marina Silva')).toBeInTheDocument();
  });

  it('mantém as 4 tabs no DOM (§2.7)', () => {
    render(
      <InscritosView inscritos={muitosInscritos(3)} loading={false} error={null} modalidades={['10k']} />,
    );
    for (const label of ['Geral', 'Pagamento', 'Comunicação', 'Histórico']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('renderiza skeleton enquanto carrega', () => {
    render(<InscritosView inscritos={[]} loading error={null} modalidades={[]} />);
    expect(screen.getByRole('status', { name: 'Carregando inscritos' })).toBeInTheDocument();
  });
});
