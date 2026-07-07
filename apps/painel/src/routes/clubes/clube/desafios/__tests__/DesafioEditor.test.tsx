import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { DesafioEditor } from '../DesafioEditor';

const noop = () => {};

function renderEditor(over: Record<string, unknown> = {}) {
  return render(
    <ToastProvider>
      <DesafioEditor
        modo="create"
        onPublicar={noop}
        onSalvarRascunho={noop}
        onCancelar={noop}
        {...over}
      />
    </ToastProvider>,
  );
}

describe('DesafioEditor', () => {
  it('modo create mostra o título "Novo desafio" e o resumo ao vivo', () => {
    renderEditor();
    expect(screen.getByRole('heading', { name: 'Novo desafio', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Resumo do desafio')).toBeInTheDocument();
    expect(screen.getByLabelText('Prévia do card no app')).toBeInTheDocument();
  });

  it('Modelo C revela o mínimo por pilar (RN-111)', async () => {
    renderEditor();
    await userEvent.click(screen.getByRole('radio', { name: /Modelo C/ }));
    const meta = screen.getByRole('group', { name: 'Mínimo por pilar (RN-111)' });
    expect(within(meta).getByLabelText('Físico')).toBeInTheDocument();
    expect(within(meta).getByLabelText('Mental')).toBeInTheDocument();
    expect(within(meta).getByLabelText('Espiritual')).toBeInTheDocument();
  });

  it('marcar ação recalcula o resumo ao vivo (C16)', async () => {
    renderEditor();
    const resumo = screen.getByLabelText('Resumo do desafio');
    expect(within(resumo).getByText(/0 ação\(ões\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Selecionar Correr'));
    expect(within(resumo).getByText(/1 ação\(ões\)/)).toBeInTheDocument();
    expect(within(resumo).getByText(/Físico 1/)).toBeInTheDocument();
  });

  it('publicar Modelo C sem mínimo por pilar → erro (RN-111), não chama onPublicar', async () => {
    const onPublicar = vi.fn();
    renderEditor({ onPublicar });
    await userEvent.click(screen.getByRole('radio', { name: /Modelo C/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar desafio' }));
    expect(onPublicar).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('salvar rascunho não exige validação e chama onSalvarRascunho', async () => {
    const onSalvarRascunho = vi.fn();
    renderEditor({ onSalvarRascunho });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(onSalvarRascunho).toHaveBeenCalledOnce();
  });

  it('cancelar dispara o callback', async () => {
    const onCancelar = vi.fn();
    renderEditor({ onCancelar });
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalledOnce();
  });
});
