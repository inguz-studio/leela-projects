import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClubeShell } from '../ClubeShell';
import { mkClube } from '../../_test/fixtures';

const noop = () => {};

describe('ClubeShell', () => {
  it('renderiza header com nome, categoria e metadados', () => {
    render(
      <ClubeShell clube={mkClube()} ativa="overview" onCopiarCodigo={noop}>
        <p>conteúdo</p>
      </ClubeShell>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /Corrida Perfeita Sul/i })).toBeInTheDocument();
    expect(screen.getByText('Assessoria')).toBeInTheDocument();
    expect(screen.getByText(/120 membros/)).toBeInTheDocument();
  });

  it('mostra o código de convite 8A3K9 e o botão de copiar (RN-101)', async () => {
    const onCopiarCodigo = vi.fn();
    render(
      <ClubeShell clube={mkClube({ codigoConvite: '8A3K9' })} ativa="overview" onCopiarCodigo={onCopiarCodigo}>
        <p>c</p>
      </ClubeShell>,
    );
    expect(screen.getByText('8A3K9')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar código de convite' }));
    expect(onCopiarCodigo).toHaveBeenCalledOnce();
  });

  it('marca a aba ativa da sub-nav com aria-current e mostra contadores pill', () => {
    render(
      <ClubeShell clube={mkClube({ qtdMembrosAtivos: 120, qtdDesafiosAtivos: 3 })} ativa="membros" onCopiarCodigo={noop}>
        <p>c</p>
      </ClubeShell>,
    );
    const membros = screen.getByRole('link', { name: /Membros/i });
    expect(membros).toHaveAttribute('aria-current', 'page');
    const overview = screen.getByRole('link', { name: 'Overview' });
    expect(overview).not.toHaveAttribute('aria-current');
    // Sub-nav lista as 6 tabs do clube.
    expect(screen.getByRole('link', { name: 'Parcerias' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('renderiza o conteúdo (children)', () => {
    render(
      <ClubeShell clube={mkClube()} ativa="overview" onCopiarCodigo={noop}>
        <p>conteúdo do overview</p>
      </ClubeShell>,
    );
    expect(screen.getByText('conteúdo do overview')).toBeInTheDocument();
  });
});
