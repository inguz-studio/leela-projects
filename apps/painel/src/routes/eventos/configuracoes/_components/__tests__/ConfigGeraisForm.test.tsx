// =============================================================================
// Testes do ConfigGeraisForm (S304-T2). Aceites de UI: usaChip=false persiste
// (RN-207), URL pública read-only usa {DOMINIO_LEELA}, papel sem permissão vê
// leitura (sem Salvar), nome vazio bloqueia (§2.12).
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { Evento, Timestamp } from '@leela/core';
import { ConfigGeraisForm } from '../ConfigGeraisForm';

function ts(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  } as Timestamp;
}

function fakeEvento(over: Partial<Evento> = {}): Evento {
  return {
    id: 'meia-floripa-2026',
    tenantId: 'tnt',
    organizadorId: 'uid-dono',
    nome: 'Meia Floripa 2026',
    data: ts(Date.UTC(2026, 3, 19, 12)),
    local: 'Florianópolis, SC',
    modalidades: ['5k', '10k', '21k'],
    percursos: [],
    slug: 'meia-floripa-2026',
    status: 'rascunho',
    usaChip: true,
    criadoEm: ts(0),
    atualizadoEm: ts(0),
    qtdInscritos: 0,
    receitaConfirmada: 0,
    capacidade: 500,
    janelasEntrega: [],
    faixaChips: null,
    ...over,
  };
}

function setup(opts: { evento?: Evento; podeEditar?: boolean } = {}) {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  const onUploadCapa = vi
    .fn()
    .mockResolvedValue('https://storage.leela.dev/eventos/meia-floripa-2026/capa');
  render(
    <ToastProvider>
      <ConfigGeraisForm
        evento={opts.evento ?? fakeEvento()}
        podeEditar={opts.podeEditar ?? true}
        onSalvar={onSalvar}
        onUploadCapa={onUploadCapa}
      />
    </ToastProvider>,
  );
  return { onSalvar, onUploadCapa };
}

describe('ConfigGeraisForm (S304-T2)', () => {
  it('salva usaChip=false → payload reflete (RN-207)', async () => {
    const { onSalvar } = setup();
    await userEvent.click(screen.getByRole('switch', { name: /Usa chip/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ usaChip: false }));
  });

  it('URL pública read-only usa {DOMINIO_LEELA} e nunca o host legado', () => {
    setup();
    const url = screen.getByLabelText('URL pública') as HTMLInputElement;
    expect(url.value).toBe('{DOMINIO_LEELA}/meia-floripa-2026');
    expect(url.value).not.toContain('be-hero');
    expect(url).toHaveAttribute('readonly');
  });

  it('papel sem permissão vê leitura: sem botão Salvar, campos desabilitados', () => {
    setup({ podeEditar: false });
    expect(screen.queryByRole('button', { name: 'Salvar configurações' })).toBeNull();
    expect(screen.getByLabelText('Nome do evento')).toBeDisabled();
    expect(screen.getByText(/Seu papel não permite editar/)).toBeInTheDocument();
  });

  it('nome vazio bloqueia o submit (§2.12)', async () => {
    const { onSalvar } = setup();
    await userEvent.clear(screen.getByLabelText('Nome do evento'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    expect(await screen.findByText('Informe o nome do evento.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('sem venda: ligar a taxa persiste taxaModo=repassada (RN-347)', async () => {
    const { onSalvar } = setup({ evento: fakeEvento({ qtdInscritos: 0 }) });
    const taxa = screen.getByRole('switch', { name: 'Repassar a taxa de serviço ao comprador' });
    expect(taxa).toBeEnabled();
    await userEvent.click(taxa);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ taxaModo: 'repassada' }));
  });

  it('sem venda + toggle desligado: persiste taxaModo=incorporada', async () => {
    const { onSalvar } = setup({ evento: fakeEvento({ qtdInscritos: 0, taxaModo: 'incorporada' }) });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ taxaModo: 'incorporada' }));
  });

  it('com venda: o modo da taxa CONGELA — switch desabilitado, hint, e não envia taxaModo', async () => {
    const { onSalvar } = setup({
      evento: fakeEvento({ qtdInscritos: 5, taxaModo: 'repassada' }),
    });
    const taxa = screen.getByRole('switch', { name: 'Repassar a taxa de serviço ao comprador' });
    expect(taxa).toBeDisabled();
    // Reflete o modo vigente do evento (repassada → ligado).
    expect(taxa).toBeChecked();
    expect(screen.getByText(/Travado: este evento já tem inscrições/)).toBeInTheDocument();

    // Salvar os demais campos ainda funciona; taxaModo é OMITIDO (a Rule congela).
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    const [payload] = onSalvar.mock.calls[0] ?? [];
    expect(payload).toBeDefined();
    expect(payload).not.toHaveProperty('taxaModo');
  });

  // ── Capa do evento (CEV · RN-228 · RN-168 upload-only) ────────────────────

  it('capa: NÃO há input de URL; upload → onUploadCapa → Salvar persiste a downloadURL', async () => {
    const { onSalvar, onUploadCapa } = setup();
    // Upload-only (RN-168): nenhum textbox de URL de imagem na tela de capa.
    // O nome é casado por palavra inteira desde o PARSE-1: "Capacidade (vagas)"
    // virou `type="text"` e passou a ser um textbox, e o `/capa/i` solto casava
    // com o começo da palavra — o teste acusaria a capacidade como se fosse um
    // campo de URL de capa.
    expect(
      screen.queryByRole('textbox', { name: /\b(capa|imagem)\b/i }),
    ).not.toBeInTheDocument();
    const arquivo = new File(['x'], 'capa.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Imagem de capa'), arquivo);
    await waitFor(() => expect(onUploadCapa).toHaveBeenCalledTimes(1));
    // jsdom degrada o crop 1.9:1 → sobe um File (o seam re-valida RN-228).
    expect(onUploadCapa.mock.calls[0]?.[0]).toBeInstanceOf(File);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        imagemUrl: 'https://storage.leela.dev/eventos/meia-floripa-2026/capa',
      }),
    );
  });

  it('capa existente: gatilho vira "Trocar imagem" e prévia aparece; sem mudar, Salvar re-envia a URL vigente', async () => {
    const { onSalvar } = setup({
      evento: fakeEvento({ imagemUrl: 'https://cdn.x/capa-atual.jpg' }),
    });
    expect(screen.getByRole('button', { name: 'Trocar imagem' })).toBeInTheDocument();
    expect(screen.getByAltText('Prévia da capa do evento')).toHaveAttribute(
      'src',
      'https://cdn.x/capa-atual.jpg',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ imagemUrl: 'https://cdn.x/capa-atual.jpg' }),
    );
  });

  it('capa: "Remover capa" limpa e o Salvar envia null (deleteField → gradiente)', async () => {
    const { onSalvar } = setup({
      evento: fakeEvento({ imagemUrl: 'https://cdn.x/capa-atual.jpg' }),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Remover capa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ imagemUrl: null }));
  });

  it('capa: falha do upload vira erro inline (role=alert) e nada persiste', async () => {
    const onSalvar = vi.fn().mockResolvedValue(undefined);
    const onUploadCapa = vi.fn().mockRejectedValue(new Error('A capa deve ser JPG, PNG ou GIF (RN-228).'));
    render(
      <ToastProvider>
        <ConfigGeraisForm
          evento={fakeEvento()}
          podeEditar
          onSalvar={onSalvar}
          onUploadCapa={onUploadCapa}
        />
      </ToastProvider>,
    );
    const arquivo = new File(['x'], 'capa.webp', { type: 'image/webp' });
    await userEvent.upload(screen.getByLabelText('Imagem de capa'), arquivo);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/JPG, PNG ou GIF/);
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('capa: papel sem edição NÃO vê o seletor de arquivo — só a prévia', () => {
    setup({
      podeEditar: false,
      evento: fakeEvento({ imagemUrl: 'https://cdn.x/capa-atual.jpg' }),
    });
    expect(screen.queryByLabelText('Imagem de capa')).not.toBeInTheDocument();
    expect(screen.getByAltText('Prévia da capa do evento')).toBeInTheDocument();
  });

  // ── Miniatura da capa ATUAL (RN-228 · RN-236) ────────────────────────────
  // O pedido do Vitor: saber QUAL capa está lá antes de trocar. A capa já
  // aparecia; o que muda é que ela aparece como MINIATURA na razão 1.9:1, sem
  // empurrar o resto do formulário para fora da tela.
  describe('miniatura da capa atual (RN-228 · RN-236)', () => {
    it('a capa atual aparece como miniatura 1.9:1, carregada de saída', () => {
      setup({ evento: fakeEvento({ imagemUrl: 'https://cdn.x/capa-atual.jpg' }) });
      const img = screen.getByAltText('Prévia da capa do evento');
      expect(img).toHaveAttribute('src', 'https://cdn.x/capa-atual.jpg');
      // Fora de lista: adiar a única imagem que a pessoa veio conferir seria
      // atrasar justamente o alvo da tela.
      expect(img).not.toHaveAttribute('loading');
      // A caixa é o Thumb do DS na razão da capa (RN-228), não um bloco solto.
      const caixa = img.parentElement as HTMLElement;
      expect(caixa.className).toContain('aspect-[1.9/1]');
      expect(caixa.className).toContain('w-[var(--thumb-size-lg)]');
    });

    it('a miniatura NÃO carrega estilo cru — a medida vem de token', () => {
      setup({ evento: fakeEvento({ imagemUrl: 'https://cdn.x/capa-atual.jpg' }) });
      const caixa = screen.getByAltText('Prévia da capa do evento').parentElement as HTMLElement;
      expect(caixa.getAttribute('style')).toBeNull();
    });

    it('papel sem edição também vê a capa atual como miniatura', () => {
      setup({
        podeEditar: false,
        evento: fakeEvento({ imagemUrl: 'https://cdn.x/capa-atual.jpg' }),
      });
      const img = screen.getByAltText('Prévia da capa do evento');
      expect(img).toHaveAttribute('src', 'https://cdn.x/capa-atual.jpg');
      expect((img.parentElement as HTMLElement).className).toContain('aspect-[1.9/1]');
    });

    it('evento SEM capa não inventa miniatura (a landing usa o gradiente)', () => {
      setup({ evento: fakeEvento() });
      expect(screen.queryByAltText('Prévia da capa do evento')).not.toBeInTheDocument();
    });

    it.each([true, false])(
      'capa com URL morta degrada para o fallback em vez de deixar caixa vazia (podeEditar=%s)',
      (podeEditar) => {
        setup({ podeEditar, evento: fakeEvento({ imagemUrl: 'https://cdn.x/revogada.jpg' }) });
        const img = screen.getByAltText('Prévia da capa do evento');
        const caixa = img.parentElement as HTMLElement;
        fireEvent.error(img);
        expect(screen.queryByAltText('Prévia da capa do evento')).not.toBeInTheDocument();
        // Sumir a img não basta: sem `fallback` o Thumb renderiza caixa VAZIA, e
        // a pessoa lê "não tem capa" bem quando existe uma capa salva que o
        // navegador não baixou. Esta miniatura só monta com imagemUrl
        // preenchida, então o fallback aqui significa exatamente "URL morta".
        expect(caixa.querySelector('svg')).not.toBeNull();
      },
    );
  });
});

// =============================================================================
// PARSE-1 · o campo de capacidade do evento (um dos dezoito).
// =============================================================================

describe('PARSE-1 · a recusa do parser tem onde aparecer na capacidade do evento', () => {
  it('é campo de TEXTO com teclado numérico', () => {
    setup();
    const campo = screen.getByLabelText('Capacidade (vagas)');
    expect(campo).toHaveAttribute('type', 'text');
    expect(campo).toHaveAttribute('inputmode', 'numeric');
  });

  it('capacidade com casa decimal diz o que fazer, e nada é salvo', async () => {
    const { onSalvar } = setup();
    const campo = screen.getByLabelText('Capacidade (vagas)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '2,5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    expect(
      await screen.findByText(
        'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.',
      ),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('BASELINE colar de planilha: "1.000" vagas continuam sendo mil', async () => {
    const { onSalvar } = setup();
    fireEvent.change(screen.getByLabelText('Capacidade (vagas)'), { target: { value: '1.000' } });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(onSalvar.mock.calls[0]?.[0]).toMatchObject({ capacidade: 1000 });
  });
});
