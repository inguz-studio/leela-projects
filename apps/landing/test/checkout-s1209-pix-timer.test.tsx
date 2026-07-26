// =============================================================================
// PROVA do S1209-T2 (trace leela-build-2d6ee98d · decisão D-6 · RN-157).
//
// O que está sob prova — o timer do PIX não pode MENTIR:
//   - com o carimbo do servidor (`pixExpiraEmMillis`), a tela conta 30 min e
//     mostra QR + copia-e-cola enquanto a cobrança vale;
//   - quando a contagem zera, QR e copia-e-cola SOMEM, a tela avisa que o
//     código expirou e oferece cobrança NOVA (RN-157: nunca reusa a mesma);
//   - a expiração é comunicada ao consumidor (`onExpirar`) para materializar
//     no SERVIDOR — a tela não decide sozinha que a cobrança morreu;
//   - sem carimbo do servidor, NÃO existe contagem inventada no cliente;
//   - o botão copia a chave inteira num clique e dispara o toast com o
//     verbatim do Vitor ("a chave para pagamento foi copiada");
//   - o MESMO bloco aparece nas DUAS telas: pagamento e pedido pendente.
//
// Relógio controlado com fake timers — nada de sleep de 30 minutos no CI.
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import type {
  ConfirmarPagamentoSandboxResult,
  CreateInscricaoChargeResult,
} from '@leela/api-client';
import {
  PixCobranca,
  formatarContagem,
  payloadPix,
} from '../app/(public)/[eventSlug]/inscricao/checkout/PixCobranca';
import { StepConfirmacao } from '../app/(public)/[eventSlug]/inscricao/checkout/StepConfirmacao';
import { ToastProvider } from '../app/_ds/ds';

const MEIA_HORA_MS = 30 * 60 * 1000;
const T0 = new Date('2026-03-15T12:00:00-03:00').getTime();

function chargeFixture(over: Partial<CreateInscricaoChargeResult> = {}): CreateInscricaoChargeResult {
  return {
    pedidoId: 'ped_1',
    pagamentoId: 'pag_1',
    inscritoIds: ['ins_1'],
    chargeId: 'chg_1',
    qrCode: 'PIX-COPIA-E-COLA-PAYLOAD',
    pixExpiraEmMillis: T0 + MEIA_HORA_MS,
    statusPedido: 'pendente',
    valores: {
      valorBase: 5000,
      desconto: 0,
      valorFinal: 5000,
      taxaServico: 0,
      totalCobrado: 5000,
      parcelas: 1,
      valorParcela: 5000,
    },
    ...over,
  };
}

function renderPix(over: Partial<Parameters<typeof PixCobranca>[0]> = {}): void {
  const charge = chargeFixture();
  render(
    <ToastProvider>
      <PixCobranca
        codigo={payloadPix(charge)}
        expiraEmMillis={charge.pixExpiraEmMillis}
        {...over}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('S1209-T2 · formatarContagem — mm:ss honesto', () => {
  it('formata a janela cheia de 30 minutos', () => {
    expect(formatarContagem(MEIA_HORA_MS)).toBe('30:00');
  });

  it('arredonda para cima o segundo em curso (nunca mostra 0 com tempo restante)', () => {
    expect(formatarContagem(1500)).toBe('00:02');
    expect(formatarContagem(1)).toBe('00:01');
  });

  it('nunca vira negativo', () => {
    expect(formatarContagem(-90_000)).toBe('00:00');
  });
});

describe('S1209-T2 · PixCobranca — cobrança viva', () => {
  it('mostra QR, copia-e-cola e a contagem de 30 min a partir do carimbo do servidor', async () => {
    renderPix();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(await screen.findByAltText(/qr code para pagamento via pix/i)).toBeTruthy();
    expect(screen.getByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeTruthy();
    expect(screen.getByTestId('pix-timer').textContent).toMatch(/30:00/);
  });

  it('a contagem anda com o relógio', async () => {
    renderPix();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId('pix-timer').textContent).toMatch(/30:00/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByTestId('pix-timer').textContent).toMatch(/29:00/);
  });

  it('SEM carimbo do servidor não existe contagem inventada (só QR e copia-e-cola)', async () => {
    renderPix({ expiraEmMillis: undefined });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(screen.getByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeTruthy();
    expect(screen.queryByTestId('pix-timer')).toBeNull();
  });
});

describe('S1209-T2 · PixCobranca — expiração dentro da janela de 30 min', () => {
  it('ao zerar: QR e copia-e-cola SOMEM e a tela diz que o código expirou', async () => {
    renderPix();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MEIA_HORA_MS + 1_000);
    });

    expect(screen.getByText(/código pix expirado/i)).toBeTruthy();
    expect(screen.queryByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeNull();
    expect(screen.queryByAltText(/qr code para pagamento via pix/i)).toBeNull();
    expect(screen.queryByTestId('pix-timer')).toBeNull();
  });

  it('a 29 minutos ainda está VIVO (não expira antes da hora)', async () => {
    renderPix();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    });

    expect(screen.getByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeTruthy();
    expect(screen.queryByText(/código pix expirado/i)).toBeNull();
  });

  it('avisa o consumidor UMA vez para materializar a expiração no servidor', async () => {
    const onExpirar = vi.fn();
    renderPix({ onExpirar });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MEIA_HORA_MS + 5_000);
    });
    expect(onExpirar).toHaveBeenCalledTimes(1);

    // Mais tiques do relógio não re-disparam (nada de martelar o callable).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(onExpirar).toHaveBeenCalledTimes(1);
  });

  it('expiração vinda do consumidor (servidor já cancelou) mostra o mesmo estado', async () => {
    renderPix({ expirado: true });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText(/código pix expirado/i)).toBeTruthy();
    expect(screen.queryByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeNull();
  });

  it('oferece cobrança NOVA (nunca a mesma) e o clique chama o consumidor', async () => {
    const onNovaCobranca = vi.fn();
    renderPix({ expirado: true, onNovaCobranca });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    fireEvent.click(screen.getByRole('button', { name: /gerar nova cobrança/i }));
    expect(onNovaCobranca).toHaveBeenCalledTimes(1);
  });
});

describe('S1209-T2 · auto-copy com toast (verbatim D-6)', () => {
  it('um clique copia a chave inteira e dispara o toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    renderPix();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copiar código/i }));
    });

    expect(writeText).toHaveBeenCalledWith('PIX-COPIA-E-COLA-PAYLOAD');
    await waitFor(() => {
      expect(screen.getByText(/a chave para pagamento foi copiada/i)).toBeTruthy();
    });
  });
});

describe('S1209-T2 · tela do PEDIDO PENDENTE — o mesmo bloco vivo', () => {
  function renderConfirmacao(
    confirmacao: ConfirmarPagamentoSandboxResult | null,
    over: Partial<Parameters<typeof StepConfirmacao>[0]> = {},
  ): void {
    render(
      <ToastProvider>
        <StepConfirmacao
          charge={chargeFixture()}
          confirmacao={confirmacao}
          eventoNome="Corrida Teste"
          slug="corrida-teste"
          responsavelEmail="atleta@example.com"
          linhas={[{ titulo: 'Você', modalidade: '5k', kitLabel: 'Sem kit' }]}
          forma="pix"
          {...over}
        />
      </ToastProvider>,
    );
  }

  const pendente: ConfirmarPagamentoSandboxResult = {
    pedidoId: 'ped_1',
    pagamentoId: 'pag_1',
    chargeId: 'chg_1',
    statusGateway: 'PENDING',
    duplicado: false,
    ignorado: false,
    statusPedido: 'pendente',
  };

  it('pedido PENDENTE: QR, copia-e-cola e a MESMA contagem de 30 min', async () => {
    renderConfirmacao(pendente);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText(/pagamento pendente/i)).toBeTruthy();
    expect(await screen.findByAltText(/qr code para pagamento via pix/i)).toBeTruthy();
    expect(screen.getByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeTruthy();
    expect(screen.getByTestId('pix-timer').textContent).toMatch(/30:00/);
  });

  it('pedido PENDENTE que expira: o bloco vira o aviso de expirado aqui também', async () => {
    renderConfirmacao(pendente);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MEIA_HORA_MS + 1_000);
    });

    expect(screen.getByText(/código pix expirado/i)).toBeTruthy();
    expect(screen.queryByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeNull();
  });

  it('pedido PAGO não mostra cobrança nenhuma (não há mais o que pagar)', async () => {
    renderConfirmacao({ ...pendente, statusPedido: 'pago' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText(/inscrição confirmada/i)).toBeTruthy();
    expect(screen.queryByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeNull();
    expect(screen.queryByTestId('pix-timer')).toBeNull();
  });

  it('pedido pendente no CARTÃO não mostra bloco de PIX', async () => {
    renderConfirmacao(pendente, { forma: 'cartao_credito' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByText('PIX-COPIA-E-COLA-PAYLOAD')).toBeNull();
  });
});
