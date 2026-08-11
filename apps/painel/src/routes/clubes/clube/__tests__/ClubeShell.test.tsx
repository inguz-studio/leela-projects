import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// LEELA-NAVFIX-T2: a casca passou a fiar `preventDefault` + `navigate` nas abas,
// então precisa de um Router em volta. As asserções abaixo são as mesmas de
// antes — só o invólucro mudou.
import { MemoryRouter } from 'react-router-dom';
import { ClubeShell } from '../ClubeShell';
import { mkClube } from '../../_test/fixtures';
import { clicarNoDom } from '../../../../test/clique';

const noop = () => {};

describe('ClubeShell', () => {
  it('renderiza header com nome, categoria e metadados', () => {
    render(
      <MemoryRouter>
        <ClubeShell clube={mkClube()} ativa="overview" onCopiarCodigo={noop}>
          <p>conteúdo</p>
        </ClubeShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /Corrida Perfeita Sul/i })).toBeInTheDocument();
    expect(screen.getByText('Assessoria esportiva')).toBeInTheDocument();
    expect(screen.getByText(/120 membros/)).toBeInTheDocument();
  });

  // D-1008-R10: dentro do painel de um club, a volta para a listagem geral é a
  // trilha canônica "Clubes › {nome}" — âncora de VERDADE (href navegável, lei
  // navegacao-spa) com clique simples interceptado para SPA.
  it('trilha "Clubes › {nome}": âncora real para /clubes que navega por SPA (D-1008-R10)', () => {
    render(
      <MemoryRouter>
        <ClubeShell clube={mkClube()} ativa="overview" onCopiarCodigo={noop}>
          <p>c</p>
        </ClubeShell>
      </MemoryRouter>,
    );
    const volta = screen.getByRole('link', { name: 'Clubes' });
    expect(volta).toHaveAttribute('href', '/clubes');
    // Clique simples: preventDefault (SPA) — o documento não recarrega.
    expect(clicarNoDom(volta).defaultPrevented).toBe(true);
    // Ctrl+clique pertence ao NAVEGADOR (nova aba) — o default sobrevive.
    expect(clicarNoDom(volta, { ctrlKey: true }).defaultPrevented).toBe(false);
    // O nome do club fecha a trilha como página atual (texto, não link).
    expect(screen.queryByRole('link', { name: /Corrida Perfeita Sul/i })).not.toBeInTheDocument();
  });

  it('mostra o código de convite 8A3K9 e o botão de copiar (RN-101)', async () => {
    const onCopiarCodigo = vi.fn();
    render(
      <MemoryRouter>
        <ClubeShell clube={mkClube({ codigoConvite: '8A3K9' })} ativa="overview" onCopiarCodigo={onCopiarCodigo}>
          <p>c</p>
        </ClubeShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('8A3K9')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar código de convite' }));
    expect(onCopiarCodigo).toHaveBeenCalledOnce();
  });

  it('marca a aba ativa da sub-nav com aria-current e mostra contadores pill', () => {
    render(
      <MemoryRouter>
        <ClubeShell clube={mkClube({ qtdMembrosAtivos: 120, qtdDesafiosAtivos: 3 })} ativa="membros" onCopiarCodigo={noop}>
          <p>c</p>
        </ClubeShell>
      </MemoryRouter>,
    );
    const membros = screen.getByRole('link', { name: /Membros/i });
    expect(membros).toHaveAttribute('aria-current', 'page');
    const overview = screen.getByRole('link', { name: 'Overview' });
    expect(overview).not.toHaveAttribute('aria-current');
    // Sub-nav lista as 6 tabs do club.
    expect(screen.getByRole('link', { name: 'Parcerias' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('renderiza o conteúdo (children)', () => {
    render(
      <MemoryRouter>
        <ClubeShell clube={mkClube()} ativa="overview" onCopiarCodigo={noop}>
          <p>conteúdo do overview</p>
        </ClubeShell>
      </MemoryRouter>,
    );
    expect(screen.getByText('conteúdo do overview')).toBeInTheDocument();
  });

  it('aplica a divisória padrão na sub-nav (RN-229 · DEC-0719 item 21)', () => {
    render(
      <MemoryRouter>
        <ClubeShell clube={mkClube()} ativa="overview" onCopiarCodigo={noop}>
          <p>c</p>
        </ClubeShell>
      </MemoryRouter>,
    );
    // Mesmo token/padrão (border-b em --border-subtle) das terciárias de eventos.
    expect(screen.getByRole('navigation', { name: 'Seções do clube' })).toHaveClass('border-b');
  });
});
