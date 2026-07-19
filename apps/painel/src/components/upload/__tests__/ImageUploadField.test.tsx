// =============================================================================
// ImageUploadField — upload-only compartilhado (RN-168/RN-170). Verifica: sem
// input de URL; label "Trocar imagem" quando já há imagem; rejeição de
// formato/tamanho ANTES do upload; erro inline em falha do upload; onChange
// recebe a downloadURL; preview aparece. (jsdom degrada o crop para o original.)
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploadField } from '../ImageUploadField';

function renderField(over: Partial<Parameters<typeof ImageUploadField>[0]> = {}) {
  const props = {
    id: 'capa',
    label: 'Enviar imagem de capa',
    value: '',
    onChange: vi.fn(),
    onUpload: vi.fn().mockResolvedValue('https://storage.leela.dev/img'),
    aspecto: { w: 16, h: 9 },
    previewAlt: 'Prévia da capa',
    ...over,
  };
  render(<ImageUploadField {...props} />);
  return props;
}

const png = new File(['x'], 'foto.png', { type: 'image/png' });

describe('ImageUploadField — upload-only (RN-168)', () => {
  it('NÃO renderiza nenhum input de URL (só o seletor de arquivo)', () => {
    renderField();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // O input real é type=file, alcançável pelo label.
    expect(screen.getByLabelText('Enviar imagem de capa')).toHaveAttribute('type', 'file');
  });

  it('label do gatilho é "Escolher arquivo" sem imagem e "Trocar imagem" com imagem', () => {
    const { rerender } = render(
      <ImageUploadField
        id="capa"
        label="Enviar imagem de capa"
        value=""
        onChange={vi.fn()}
        onUpload={vi.fn()}
        aspecto={{ w: 16, h: 9 }}
        previewAlt="Prévia da capa"
      />
    );
    expect(screen.getByRole('button', { name: 'Escolher arquivo' })).toBeInTheDocument();
    rerender(
      <ImageUploadField
        id="capa"
        label="Enviar imagem de capa"
        value="https://storage.leela.dev/img"
        onChange={vi.fn()}
        onUpload={vi.fn()}
        aspecto={{ w: 16, h: 9 }}
        previewAlt="Prévia da capa"
      />
    );
    expect(screen.getByRole('button', { name: 'Trocar imagem' })).toBeInTheDocument();
  });

  it('upload resolve → onChange recebe a downloadURL', async () => {
    const onChange = vi.fn();
    const onUpload = vi.fn().mockResolvedValue('https://storage.leela.dev/users/u1/perfil-capa');
    renderField({ onChange, onUpload });
    await userEvent.upload(screen.getByLabelText('Enviar imagem de capa'), png);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://storage.leela.dev/users/u1/perfil-capa'));
    expect(onUpload).toHaveBeenCalledTimes(1);
    // jsdom degrada o crop → sobe um File (o mesmo, sem canvas).
    expect(onUpload.mock.calls[0]?.[0]).toBeInstanceOf(File);
  });

  it('SVG banido: o input tem accept sem svg (bloqueia no seletor do SO)', () => {
    renderField();
    const accept = screen.getByLabelText('Enviar imagem de capa').getAttribute('accept') ?? '';
    expect(accept).not.toMatch(/svg/i);
    expect(accept).toContain('image/png');
  });

  it('formato fora da allowlist chegando por bypass do accept (ex.: drag&drop) é barrado pelo guard, não sobe', async () => {
    const onUpload = vi.fn();
    renderField({ onUpload });
    const svg = new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' });
    // applyAccept:false simula o caminho que NÃO passa pelo filtro do seletor
    // (drag&drop / set programático) — prova que o guard client-side segura.
    await userEvent.upload(screen.getByLabelText('Enviar imagem de capa'), svg, { applyAccept: false });
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/JPG, PNG, WebP, GIF ou AVIF/i);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('rejeita arquivo acima de 5MB ANTES de subir', async () => {
    const onUpload = vi.fn();
    renderField({ onUpload });
    const grande = new File([new Uint8Array(6 * 1024 * 1024)], 'grande.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Enviar imagem de capa'), grande);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/no máximo 5MB/i);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('falha no upload vira erro inline (role=alert) com a mensagem do Error', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('Sem sessão ativa para enviar a imagem.'));
    renderField({ onUpload });
    await userEvent.upload(screen.getByLabelText('Enviar imagem de capa'), png);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Sem sessão ativa para enviar a imagem.');
  });

  it('preview aparece quando value é URL válida', () => {
    renderField({ value: 'https://storage.leela.dev/img', previewAlt: 'Prévia da capa' });
    expect(screen.getByAltText('Prévia da capa')).toHaveAttribute('src', 'https://storage.leela.dev/img');
  });

  it('preview aceita object URL blob: (modo DEFERRED da capa de evento — CEV)', () => {
    renderField({ value: 'blob:https://painel.leela.dev/abc-123', previewAlt: 'Prévia da capa' });
    expect(screen.getByAltText('Prévia da capa')).toHaveAttribute(
      'src',
      'blob:https://painel.leela.dev/abc-123'
    );
    // Com prévia local o gatilho já oferece a troca.
    expect(screen.getByRole('button', { name: 'Trocar imagem' })).toBeInTheDocument();
  });

  it('sem permiteRemover: não mostra botão Remover', () => {
    renderField({ value: 'https://storage.leela.dev/img' });
    expect(screen.queryByRole('button', { name: 'Remover imagem' })).not.toBeInTheDocument();
  });

  it('permiteRemover: "Remover" limpa o campo via onChange("") (preserva o clear das capas)', async () => {
    const onChange = vi.fn();
    renderField({ value: 'https://storage.leela.dev/img', onChange, permiteRemover: true });
    await userEvent.click(screen.getByRole('button', { name: 'Remover imagem' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
