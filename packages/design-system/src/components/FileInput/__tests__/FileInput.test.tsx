import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileInput } from '../FileInput';

function arquivo(nome = 'foto.png', tipo = 'image/png'): File {
  return new File(['x'], nome, { type: tipo });
}

describe('FileInput', () => {
  it('renderiza gatilho Button + input file oculto com nome acessível', () => {
    render(<FileInput label="Enviar foto" onFileSelected={() => {}} />);
    expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toBeInTheDocument();
    const input = screen.getByLabelText('Enviar foto');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp,image/gif,image/avif',
    );
  });

  it('seleção de arquivo dispara onFileSelected com o File', async () => {
    const onFileSelected = vi.fn();
    render(<FileInput label="Enviar foto" onFileSelected={onFileSelected} />);
    const file = arquivo();
    await userEvent.upload(screen.getByLabelText('Enviar foto'), file);
    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it('limpa o value após a seleção — o MESMO arquivo dispara de novo', async () => {
    const onFileSelected = vi.fn();
    render(<FileInput label="Enviar foto" onFileSelected={onFileSelected} />);
    const input = screen.getByLabelText<HTMLInputElement>('Enviar foto');
    const file = arquivo();
    await userEvent.upload(input, file);
    expect(input.value).toBe('');
    await userEvent.upload(input, file);
    expect(onFileSelected).toHaveBeenCalledTimes(2);
  });

  it('busy desabilita e mostra o busyLabel', () => {
    render(<FileInput label="Enviar foto" busy onFileSelected={() => {}} />);
    const botao = screen.getByRole('button', { name: 'Enviando…' });
    expect(botao).toBeDisabled();
    expect(screen.getByLabelText('Enviar foto')).toBeDisabled();
  });

  it('erro inline: role=alert associado por aria-describedby', () => {
    render(
      <FileInput
        id="up"
        label="Enviar foto"
        errorMessage="A imagem deve ter no máximo 5MB."
        hint="JPG, PNG, WebP, GIF ou AVIF até 5MB."
        onFileSelected={() => {}}
      />,
    );
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('A imagem deve ter no máximo 5MB.');
    const input = screen.getByLabelText('Enviar foto');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'up-hint up-error');
    expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toHaveAttribute(
      'aria-describedby',
      'up-hint up-error',
    );
  });

  it('sem label, o input herda o nome do gatilho', () => {
    render(<FileInput buttonLabel="Enviar capa" onFileSelected={() => {}} />);
    expect(screen.getByLabelText('Enviar capa')).toHaveAttribute('type', 'file');
  });
});
