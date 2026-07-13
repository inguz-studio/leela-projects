import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AppErrorBoundary } from '../AppErrorBoundary';

// Mock do wrapper de observabilidade (vi.hoisted evita TDZ na fábrica do mock).
const { captureMock } = vi.hoisted(() => ({
  captureMock: vi.fn((): string => 'evt-abc-123'),
}));
vi.mock('../../../lib/observability', () => ({
  captureException: captureMock,
}));

function Boom({ throwError }: { throwError: boolean }): JSX.Element {
  if (throwError) throw new Error('SEGREDO_TECNICO_STACK');
  return <div>Conteúdo recuperado</div>;
}

function Harness(): JSX.Element {
  const [boom, setBoom] = useState(true);
  return (
    <AppErrorBoundary layout="shell" onReset={() => setBoom(false)}>
      <Boom throwError={boom} />
    </AppErrorBoundary>
  );
}

describe('AppErrorBoundary (500 · Painel · S502-T1)', () => {
  let consoleErr: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    captureMock.mockClear();
    // React loga o erro capturado no console.error — silenciar p/ não poluir.
    consoleErr = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleErr.mockRestore();
  });

  it('captura o erro, mostra o 500 com eventId e NÃO vaza stack/message', () => {
    render(
      <AppErrorBoundary layout="shell">
        <Boom throwError />
      </AppErrorBoundary>,
    );
    expect(
      screen.getByRole('heading', { name: 'Tropeçamos aqui, não foi você' }),
    ).toBeInTheDocument();
    // eventId visível (id de erro auxiliar)
    expect(screen.getByText(/evt-abc-123/)).toBeInTheDocument();
    // captureException chamado exatamente 1x
    expect(captureMock).toHaveBeenCalledTimes(1);
    // message/stack técnicos ausentes do DOM
    expect(screen.queryByText(/SEGREDO_TECNICO_STACK/)).toBeNull();
  });

  it('role="alert" presente na tela de erro (severidade não só por cor)', () => {
    render(
      <AppErrorBoundary layout="shell">
        <Boom throwError />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('"Tentar novamente" reseta o boundary e re-renderiza os filhos', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(
      screen.getByRole('heading', { name: 'Tropeçamos aqui, não foi você' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(screen.getByText('Conteúdo recuperado')).toBeInTheDocument();
  });
});
