import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { ConfirmModal } from '../ConfirmModal';
import { Checkbox } from '../../Checkbox';
import { Textarea } from '../../Textarea';

const baseProps = {
  title: 'Desativar patrocinador?',
  target: <p>Suplementos XPTO — patrocinador Ouro</p>,
  loses: ['Logo sai das páginas dos eventos', 'Cupons ativos são cancelados'],
  keeps: ['Histórico de campanhas', 'Relatórios já gerados'],
  confirmLabel: 'Desativar patrocinador',
  onConfirm: vi.fn(),
};

function Controlled(props: Partial<React.ComponentProps<typeof ConfirmModal>>) {
  const [open, setOpen] = React.useState(true);
  return <ConfirmModal {...baseProps} open={open} onOpenChange={setOpen} {...props} />;
}

describe('ConfirmModal', () => {
  it('renders target card with critical border tokens', () => {
    render(<Controlled />);
    const card = screen.getByText(/Suplementos XPTO/).parentElement!;
    expect(card.className).toContain('border-l-[length:var(--card-critical-border)]');
    expect(card.className).toContain('border-l-[color:var(--feedback-danger)]');
  });

  it('shows "perde" list with danger tone', () => {
    render(<Controlled />);
    expect(screen.getByText('O que você perde')).toBeInTheDocument();
    expect(screen.getByText('Logo sai das páginas dos eventos')).toBeInTheDocument();
    expect(screen.getByText('O que você perde').className).toContain(
      'text-[var(--text-danger)]',
    );
  });

  it('shows "mantém" list with success tone', () => {
    render(<Controlled />);
    expect(screen.getByText('O que se mantém')).toBeInTheDocument();
    expect(screen.getByText('Histórico de campanhas')).toBeInTheDocument();
    expect(screen.getByText('O que se mantém').className).toContain(
      'text-[var(--text-success)]',
    );
  });

  it('confirm button is destructive (Vulcão) and fires onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<Controlled onConfirm={onConfirm} />);
    const confirm = screen.getByRole('button', { name: 'Desativar patrocinador' });
    expect(confirm.className).toContain('bg-[var(--action-destructive)]');
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ reason: '', notify: false });
  });

  it('collects optional reason and notify checkbox', async () => {
    const onConfirm = vi.fn();
    render(
      <Controlled
        onConfirm={onConfirm}
        reasonLabel="Motivo (opcional)"
        notifyLabel="Notificar patrocinador por e-mail"
      />,
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Motivo (opcional)' }),
      'Contrato encerrado',
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Notificar patrocinador por e-mail' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Desativar patrocinador' }));
    expect(onConfirm).toHaveBeenCalledWith({
      reason: 'Contrato encerrado',
      notify: true,
    });
  });

  // ---------------------------------------------------------------------------
  // Procedência dos controles (Onda 0 · inventário §3)
  //
  // O ConfirmModal montava `<textarea>` e `<input type="checkbox">` à mão DENTRO
  // do design system. Os quatro casos abaixo provam que o motor renderizado é o
  // canônico, e não uma cópia: a assinatura de classe do controle dentro do
  // modal tem de ser IDÊNTICA à do componente renderizado sozinho. Reinlinar o
  // engine passa a quebrar aqui, que é o ponto.
  // ---------------------------------------------------------------------------
  describe('compõe os controles canônicos do DS', () => {
    it('o motivo É o Textarea do DS (mesma assinatura do componente isolado)', () => {
      const isolado = render(<Textarea aria-label="referência" rows={3} />);
      const referencia = isolado.getByRole('textbox').className;
      isolado.unmount();

      render(<Controlled reasonLabel="Motivo (opcional)" />);
      const campo = screen.getByRole('textbox', { name: 'Motivo (opcional)' });

      expect(campo.tagName).toBe('TEXTAREA');
      expect(campo.className).toBe(referencia);
      // Herda o flat default (LEELA-FLAT-DEFAULT) que o textarea cru não tinha.
      expect(campo).toHaveClass('bg-[var(--surface-sunken)]');
      expect(campo).toHaveClass('border-[color:var(--input-border-flat)]');
      // E não sobrou nada da casca à mão de antes.
      expect(campo).not.toHaveClass('bg-[var(--surface-base)]');
      expect(campo).not.toHaveClass('border-[var(--border-strong)]');
    });

    it('o notificar É o Checkbox do DS (mesma assinatura do componente isolado)', () => {
      const isolado = render(<Checkbox aria-label="referência" />);
      const referencia = isolado.getByRole('checkbox').className;
      isolado.unmount();

      render(<Controlled notifyLabel="Notificar patrocinador por e-mail" />);
      const caixa = screen.getByRole('checkbox', {
        name: 'Notificar patrocinador por e-mail',
      });

      expect(caixa.className).toBe(referencia);
      // A marca desenhada sobre appearance-none é o motor do DS; o cru pintava
      // por accent-color, que não cobre o check em todo browser.
      expect(caixa).toHaveClass('appearance-none');
      expect(caixa).toHaveClass('checked:bg-[var(--action-primary)]');
      expect(caixa).not.toHaveClass('accent-[var(--action-primary)]');
    });

    it('o estado de foco dos dois controles vem do ring canônico (AA por estado)', () => {
      render(
        <Controlled
          reasonLabel="Motivo (opcional)"
          notifyLabel="Notificar patrocinador por e-mail"
        />,
      );
      for (const controle of [
        screen.getByRole('textbox', { name: 'Motivo (opcional)' }),
        screen.getByRole('checkbox', { name: 'Notificar patrocinador por e-mail' }),
      ]) {
        expect(controle).toHaveClass('focus:ring-2');
        expect(controle).toHaveClass('focus:ring-ring');
      }
    });

    it('loading desabilita os dois controles compostos', () => {
      render(
        <Controlled
          loading
          reasonLabel="Motivo (opcional)"
          notifyLabel="Notificar patrocinador por e-mail"
        />,
      );
      expect(screen.getByRole('textbox', { name: 'Motivo (opcional)' })).toBeDisabled();
      expect(
        screen.getByRole('checkbox', { name: 'Notificar patrocinador por e-mail' }),
      ).toBeDisabled();
    });
  });

  it('does not render reason/notify when labels are absent', () => {
    render(<Controlled />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('cancel button closes the modal', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes via X, overlay and Esc (herda as 4 vias)', async () => {
    const { unmount } = render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();

    const second = render(<Controlled />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    second.unmount();

    render(<Controlled />);
    await userEvent.click(screen.getByTestId('modal-overlay'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables actions while loading', () => {
    render(<Controlled loading />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Desativar patrocinador' })).toBeDisabled();
  });

  it('onConfirm does not close the modal by itself (consumidor decide)', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Desativar patrocinador' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
