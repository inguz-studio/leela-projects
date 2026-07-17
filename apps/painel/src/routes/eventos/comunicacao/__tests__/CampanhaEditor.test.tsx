// =============================================================================
// CampanhaEditor (S401-T3 · E06-L3) — cobre: preview push/e-mail, estimativa AO
// VIVO via callable injetado (debounced), truncamento de push (RN-134), capa só
// com e-mail (RN-135), segmento vazio bloqueia o envio e estado HONESTO da cota
// (limite_push vindo de enviarCampanha · RN-133).
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { EnviarCampanhaResult } from '@leela/api-client';
import { CampanhaEditor } from '../CampanhaEditor';

const noop = (): void => {};

function renderEditor(over: Record<string, unknown> = {}): ReturnType<typeof render> {
  const props = {
    modo: 'create' as const,
    onEstimar: vi.fn().mockResolvedValue(50),
    onSalvar: vi.fn().mockResolvedValue(undefined),
    onEnviar: vi.fn().mockResolvedValue({ ok: true, alcance: 50, jaEnviada: false } as EnviarCampanhaResult),
    onCancelar: noop,
    ...over,
  };
  return render(
    <ToastProvider>
      <CampanhaEditor {...props} />
    </ToastProvider>,
  );
}

describe('CampanhaEditor', () => {
  it('mostra o editor + prévia por canal e estima ao vivo (callable debounced)', async () => {
    const onEstimar = vi.fn().mockResolvedValue(42);
    renderEditor({ onEstimar });
    expect(screen.getByRole('heading', { name: 'Nova campanha', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Push' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'E-mail' })).toBeInTheDocument();
    // Estimativa ao vivo: default todos_inscritos → count() no servidor.
    await waitFor(() => expect(onEstimar).toHaveBeenCalledWith({ tipo: 'todos_inscritos' }));
    expect(await screen.findByText(/Alcance estimado: 42 inscritos/)).toBeInTheDocument();
  });

  it('push trunca em 160 e avisa (RN-134)', () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'a'.repeat(161) } });
    // Contador sob o campo avisa que será truncado…
    expect(screen.getByText(/será truncado/)).toBeInTheDocument();
    // …e a prévia do push confirma o corte.
    const previa = screen.getByLabelText('Prévia da campanha');
    expect(within(previa).getByText(/truncado no push/)).toBeInTheDocument();
  });

  it('capa aparece só quando e-mail está selecionado (RN-135)', async () => {
    renderEditor();
    expect(screen.queryByLabelText(/Imagem de capa/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'E-mail' }));
    expect(screen.getByLabelText(/Imagem de capa/)).toBeInTheDocument();
  });

  it('segmento sem inscritos (estimativa 0) desabilita "Enviar agora"', async () => {
    const onEstimar = vi.fn().mockResolvedValue(0);
    renderEditor({ onEstimar });
    // Campos válidos: isola o bloqueio no segmento vazio (não em pendência de form).
    await userEvent.type(screen.getByLabelText('Título'), 'Campanha teste');
    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Retire seu kit no balcão até sexta.');
    await waitFor(() => expect(onEstimar).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Enviar agora' })).toBeDisabled(),
    );
    expect(screen.getByText(/nada a enviar/i)).toBeInTheDocument();
  });

  it('envio bloqueado pela cota → estado honesto (limite_push vindo de enviarCampanha)', async () => {
    const onEnviar = vi
      .fn()
      .mockResolvedValue({ bloqueado: 'limite_push', pushNaJanela: 4 } as EnviarCampanhaResult);
    renderEditor({ onEnviar, onEstimar: vi.fn().mockResolvedValue(50) });
    await userEvent.type(screen.getByLabelText('Título'), 'Campanha teste');
    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Retire seu kit no balcão até sexta.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar agora' }));
    expect(onEnviar).toHaveBeenCalled();
    expect(await screen.findByText(/Limite de 4 pushes por semana atingido/)).toBeInTheDocument();
  });

  it('toggle de automação (S402-T2) só aparece ao agendar e é honesto (Em breve, desabilitado)', async () => {
    renderEditor();
    // Não aparece no default ("Agora").
    expect(screen.queryByLabelText(/Disparar automaticamente/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));
    const toggle = screen.getByLabelText(/Disparar automaticamente/);
    expect(toggle).toBeDisabled();
    // Estado honesto: badge "Em breve" + copy que NÃO promete envio automático.
    expect(screen.getByText('Em breve')).toBeInTheDocument();
    expect(screen.getByText(/não promete envio automático/i)).toBeInTheDocument();
  });

  it('"Salvar rascunho" persiste como rascunho', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    renderEditor({ onSalvar });
    await userEvent.type(screen.getByLabelText('Título'), 'Aviso importante');
    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Conteúdo com mais de dez chars.');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Aviso importante' }),
      'rascunho',
    );
  });
});
