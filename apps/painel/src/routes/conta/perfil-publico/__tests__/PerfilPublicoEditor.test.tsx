// =============================================================================
// PerfilPublicoEditor (DN-1-T1) — comportamento: CREATE deixa o handle editável
// com aviso de imutabilidade + feedback inline de reservado; EDIT trava o handle
// (leitura pura + badge); salvar chama a porta e revela o link público.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { PerfilPublicoEditor } from '../PerfilPublicoEditor';
import { PERFIL_VALORES_INICIAIS, type PerfilFormValues } from '../perfilForm';

function renderEditor(over: Partial<Parameters<typeof PerfilPublicoEditor>[0]> = {}) {
  const props = {
    modo: 'create' as const,
    linkPublicoBase: 'https://be-hero.com.br',
    onSalvar: vi.fn().mockResolvedValue({ handle: 'corrida', criado: true }),
    ...over,
  };
  render(
    <ToastProvider>
      <PerfilPublicoEditor {...props} />
    </ToastProvider>,
  );
  return props;
}

const inicialEdit: PerfilFormValues = {
  ...PERFIL_VALORES_INICIAIS,
  handle: 'corrida',
  nome: 'Corrida do Campeche',
  visibilidade: 'publica',
};

describe('PerfilPublicoEditor', () => {
  it('CREATE: handle editável + aviso de imutabilidade antes de salvar', () => {
    renderEditor();
    expect(screen.getByLabelText('Seu @ (handle)')).toBeEnabled();
    expect(screen.getByText(/Não pode ser alterado depois de criado/i)).toBeInTheDocument();
  });

  it('CREATE: handle reservado dá feedback inline (copy do core)', async () => {
    renderEditor();
    await userEvent.type(screen.getByLabelText('Seu @ (handle)'), 'admin');
    expect(await screen.findByText(/reservado/i)).toBeInTheDocument();
  });

  it('EDIT: handle vira leitura pura (imutável) — sem input editável', () => {
    renderEditor({ modo: 'edit', inicial: inicialEdit });
    expect(screen.queryByLabelText('Seu @ (handle)')).not.toBeInTheDocument();
    expect(screen.getByText('@corrida')).toBeInTheDocument();
    expect(screen.getByText('Imutável')).toBeInTheDocument();
  });

  it('salvar chama a porta e revela o link público final', async () => {
    const onSalvar = vi.fn().mockResolvedValue({ handle: 'corrida', criado: true });
    renderEditor({ modo: 'edit', inicial: inicialEdit, onSalvar });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const link = await screen.findByRole('link', { name: 'https://be-hero.com.br/@corrida' });
    expect(link).toHaveAttribute('href', 'https://be-hero.com.br/@corrida');
  });

  it('bloqueia salvar quando o nome está vazio (validação do core)', async () => {
    const onSalvar = vi.fn().mockResolvedValue({ handle: 'x', criado: true });
    renderEditor({ modo: 'edit', inicial: { ...inicialEdit, nome: '' }, onSalvar });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

describe('PerfilPublicoEditor — upload de avatar/capa (LEELA-R5)', () => {
  const arquivo = new File(['x'], 'foto.png', { type: 'image/png' });

  it('sem onUpload*: só o caminho de URL (comportamento anterior intacto)', () => {
    renderEditor({ modo: 'edit', inicial: inicialEdit });
    expect(screen.queryByLabelText('Enviar foto')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Enviar imagem de capa')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Foto (URL)')).toBeInTheDocument();
    expect(screen.getByLabelText('Imagem de capa (URL)')).toBeInTheDocument();
  });

  it('upload do avatar resolve → downloadURL preenche avatarUrl e mostra prévia', async () => {
    const onUploadAvatar = vi.fn().mockResolvedValue('https://storage.leela.dev/users/u1/perfil-avatar');
    renderEditor({ modo: 'edit', inicial: inicialEdit, onUploadAvatar });
    await userEvent.upload(screen.getByLabelText('Enviar foto'), arquivo);
    expect(onUploadAvatar).toHaveBeenCalledWith(arquivo);
    const campo = await screen.findByLabelText('Ou cole uma URL');
    expect(campo).toHaveValue('https://storage.leela.dev/users/u1/perfil-avatar');
    expect(screen.getByAltText('Prévia da foto do perfil')).toHaveAttribute(
      'src',
      'https://storage.leela.dev/users/u1/perfil-avatar'
    );
  });

  it('upload da capa resolve → downloadURL preenche imagemUrl e mostra prévia', async () => {
    const onUploadCapa = vi.fn().mockResolvedValue('https://storage.leela.dev/users/u1/perfil-capa');
    renderEditor({ modo: 'edit', inicial: inicialEdit, onUploadCapa });
    await userEvent.upload(screen.getByLabelText('Enviar imagem de capa'), arquivo);
    expect(onUploadCapa).toHaveBeenCalledWith(arquivo);
    await waitFor(() =>
      expect(screen.getByAltText('Prévia da capa do perfil')).toHaveAttribute(
        'src',
        'https://storage.leela.dev/users/u1/perfil-capa'
      )
    );
  });

  it('upload que falha → erro inline com a mensagem do Error', async () => {
    const onUploadAvatar = vi.fn().mockRejectedValue(new Error('Use uma imagem JPG, PNG, WebP, GIF ou AVIF.'));
    renderEditor({ modo: 'edit', inicial: inicialEdit, onUploadAvatar });
    await userEvent.upload(screen.getByLabelText('Enviar foto'), arquivo);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Use uma imagem JPG, PNG, WebP, GIF ou AVIF.');
  });
});
