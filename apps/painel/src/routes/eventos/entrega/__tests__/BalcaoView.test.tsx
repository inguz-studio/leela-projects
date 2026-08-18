/**
 * BalcaoView — os TRÊS estados de carga da tela de credenciamento
 * (INSCRITOS-READ-FIX · 17/08).
 *
 * O defeito que originou este arquivo não foi o erro: foi o SILÊNCIO. Com a
 * leitura falhando dentro do callback do listener, `loading` nunca virava e a
 * tela ficava em dois skeletons vazios por tempo indefinido — 20s sem texto,
 * sem erro, sem saída, com a fila do balcão parada. Skeleton eterno é pior que
 * erro: o erro tem botão.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { BalcaoView } from '../BalcaoView';
import { mkEvento } from '../../_test/fixtures';

vi.mock('@leela/api-client', () => ({
  getLeelaDb: () => ({}),
}));

function renderBalcao(over: Partial<Parameters<typeof BalcaoView>[0]> = {}) {
  return render(
    <ToastProvider>
      <BalcaoView
        evento={mkEvento()}
        inscritos={[]}
        itensKit={[]}
        kits={[]}
        loading={false}
        error={null}
        onVincular={vi.fn()}
        onRegistrar={vi.fn()}
        {...over}
      />
    </ToastProvider>,
  );
}

describe('BalcaoView — estados de carga', () => {
  it('carregando mostra o esqueleto ANUNCIADO (role status), não um vazio mudo', () => {
    renderBalcao({ loading: true });
    expect(screen.getByRole('status', { name: 'Carregando balcão' })).toBeInTheDocument();
  });

  it('falha de leitura vira ERRO VISÍVEL com "Tentar novamente" — nunca skeleton eterno', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderBalcao({ error: new Error('Inscrito X: status "estornado" sem estornadoEm'), onRetry });

    // O skeleton NÃO pode coexistir com a falha: era exatamente o estado que
    // o dono encontrou (dois painéis cinzas parados).
    expect(screen.queryByRole('status', { name: 'Carregando balcão' })).not.toBeInTheDocument();
    const alerta = screen.getByRole('alert');
    expect(within(alerta).getByText('Não foi possível carregar o balcão.')).toBeInTheDocument();

    await user.click(within(alerta).getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sem `onRetry` o bloco mostra a frase e nenhum botão morto', () => {
    renderBalcao({ error: new Error('boom') });
    const alerta = screen.getByRole('alert');
    expect(within(alerta).getByText('Não foi possível carregar o balcão.')).toBeInTheDocument();
    expect(within(alerta).queryByRole('button')).not.toBeInTheDocument();
  });

  it('pool carregado abre o balcão — busca do atendimento no ar', () => {
    renderBalcao();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Carregando balcão' })).not.toBeInTheDocument();
  });
});
