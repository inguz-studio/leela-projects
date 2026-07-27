import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usuario } from '../../../../test/usuario';
import { ToastProvider } from '@leela/design-system';
import { EventoForm } from '../EventoForm';

function renderForm(onCriarEvento = vi.fn().mockResolvedValue({ eventoId: 'e1', slug: 'e1' })) {
  const onSuccess = vi.fn();
  render(
    <ToastProvider>
      <EventoForm onCriarEvento={onCriarEvento} onSuccess={onSuccess} />
    </ToastProvider>,
  );
  return { onCriarEvento, onSuccess };
}

// LEELA-DEBT-T3 — este era o arquivo mais lento da suíte (17,4s de tempo de
// teste), e a conta não era o React: era o user-event esperando um relógio
// CONGELADO andar sozinho, 20ms de parede por tecla. A instância criada por
// `usuario()` empurra o relógio falso ela mesma (a explicação inteira mora em
// src/test/usuario.ts). Mesmas interações, mesmas asserções — 4,9s.
let user: ReturnType<typeof usuario>;

// A "Data da prova" agora é o DatePicker do DS (§8/F-01) — não há mais input
// nativo p/ setar valor via fireEvent. O relógio é congelado em abr/2099
// (beforeEach) para o calendário abrir nesse mês; clicar o dia 27 reproduz o
// mesmo '2099-04-27' que as asserções já esperavam — asserções intocadas.
async function escolherDataDaProva(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Data da prova' }));
  await user.click(screen.getByRole('button', { name: /27 de abril de 2099/ }));
}

describe('EventoForm (REVISÃO RN-153 — cadastro enriquecido)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2099, 3, 15, 12, 0, 0));
    // Depois do relógio falso: a instância nasce já acoplada a ele.
    user = usuario();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bloqueia o submit e mostra erro inline quando falta campo obrigatório', async () => {
    const { onCriarEvento } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(await screen.findByText('Informe o nome do evento.')).toBeInTheDocument();
    expect(onCriarEvento).not.toHaveBeenCalled();
  });

  it('cria rascunho com dados válidos e DERIVA percursos das modalidades (preço 0)', async () => {
    const { onCriarEvento, onSuccess } = renderForm();

    await user.type(screen.getByLabelText('Nome do evento'), 'Corrida do Campeche');
    await escolherDataDaProva();
    await user.type(screen.getByLabelText('Endereço / local'), 'Av. Campeche, 1000');

    // Modalidade por entrada livre (sem preço no cadastro).
    await user.type(screen.getByLabelText('Adicionar modalidade'), 'Trail 15k');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Corrida do Campeche',
        local: 'Av. Campeche, 1000',
        data: '2099-04-27',
        modalidades: ['Trail 15k'],
        percursos: [{ nome: 'Trail 15k', preco: 0 }],
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ eventoId: 'e1', slug: 'e1' }));
    expect(await screen.findByText('Rascunho criado')).toBeInTheDocument();
  });

  it('sugestão de modalidade adiciona por clique (5k/10k/21k/42k)', async () => {
    const { onCriarEvento } = renderForm();

    await user.type(screen.getByLabelText('Nome do evento'), 'Evento Z');
    await escolherDataDaProva();
    await user.type(screen.getByLabelText('Endereço / local'), 'SP');
    await user.click(screen.getByRole('button', { name: '5k' }));

    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ modalidades: ['5k'], percursos: [{ nome: '5k', preco: 0 }] }),
    );
  });

  it('horário opcional vira INSTANTE ISO no fuso do produto (DST-safe)', async () => {
    const { onCriarEvento } = renderForm();

    await user.type(screen.getByLabelText('Nome do evento'), 'Corrida 7h');
    await escolherDataDaProva();
    fireEvent.change(screen.getByLabelText('Horário (opcional)'), { target: { value: '07:00' } });
    await user.type(screen.getByLabelText('Endereço / local'), 'SP');
    await user.type(screen.getByLabelText('Adicionar modalidade'), '5k');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    // 07:00 em America/Sao_Paulo (UTC-3) = 10:00Z — determinístico em qualquer runner.
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ data: '2099-04-27T10:00:00.000Z' }),
    );
  });

  it('a taxa (RN-347) é um toggle ATIVO; por padrão persiste taxaModo=incorporada', async () => {
    const { onCriarEvento } = renderForm();
    const toggle = screen.getByRole('switch', { name: 'Repassar a taxa de serviço ao comprador' });
    expect(toggle).toBeEnabled();

    await user.type(screen.getByLabelText('Nome do evento'), 'Evento Taxa');
    await escolherDataDaProva();
    await user.type(screen.getByLabelText('Endereço / local'), 'SP');
    await user.click(screen.getByRole('button', { name: '10k' }));
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ taxaModo: 'incorporada' }),
    );
  });

  it('ligar o toggle persiste taxaModo=repassada (RN-347)', async () => {
    const { onCriarEvento } = renderForm();

    await user.type(screen.getByLabelText('Nome do evento'), 'Evento Repassada');
    await escolherDataDaProva();
    await user.type(screen.getByLabelText('Endereço / local'), 'SP');
    await user.click(screen.getByRole('button', { name: '10k' }));
    await user.click(
      screen.getByRole('switch', { name: 'Repassar a taxa de serviço ao comprador' }),
    );
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onCriarEvento).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ taxaModo: 'repassada' }),
    );
  });

  it('mostra Toast de erro quando a criação falha', async () => {
    renderForm(vi.fn().mockRejectedValue(new Error('backend off')));

    await user.type(screen.getByLabelText('Nome do evento'), 'Evento X');
    await escolherDataDaProva();
    await user.type(screen.getByLabelText('Endereço / local'), 'SP');
    await user.type(screen.getByLabelText('Adicionar modalidade'), '5k');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    expect(await screen.findByText('Não foi possível criar o evento')).toBeInTheDocument();
  });

  // ── Capa DEFERRED (CEV · RN-228): sobe APÓS o criarEvento ─────────────────

  function renderFormComCapa(over: {
    onCriarEvento?: ReturnType<typeof vi.fn>;
    onUploadCapa?: ReturnType<typeof vi.fn>;
    onSalvarCapa?: ReturnType<typeof vi.fn>;
  } = {}) {
    const onCriarEvento =
      over.onCriarEvento ?? vi.fn().mockResolvedValue({ eventoId: 'e1', slug: 'e1' });
    const onUploadCapa =
      over.onUploadCapa ?? vi.fn().mockResolvedValue('https://storage.leela.dev/eventos/e1/capa');
    const onSalvarCapa = over.onSalvarCapa ?? vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    render(
      <ToastProvider>
        <EventoForm
          onCriarEvento={onCriarEvento}
          onSuccess={onSuccess}
          onUploadCapa={onUploadCapa}
          onSalvarCapa={onSalvarCapa}
        />
      </ToastProvider>,
    );
    return { onCriarEvento, onUploadCapa, onSalvarCapa, onSuccess };
  }

  async function preencherObrigatorios(): Promise<void> {
    await user.type(screen.getByLabelText('Nome do evento'), 'Corrida com Capa');
    await escolherDataDaProva();
    await user.type(screen.getByLabelText('Endereço / local'), 'SP');
    await user.click(screen.getByRole('button', { name: '10k' }));
  }

  it('sem as portas de capa o bloco não renderiza (degradação honesta, sem nota falsa)', () => {
    renderForm();
    expect(screen.queryByLabelText('Imagem de capa')).not.toBeInTheDocument();
    expect(screen.queryByText(/chega em breve/)).not.toBeInTheDocument();
  });

  it('capa selecionada NÃO sobe na hora (evento não existe); sobe APÓS criar, com o eventoId, e persiste', async () => {
    const { onCriarEvento, onUploadCapa, onSalvarCapa, onSuccess } = renderFormComCapa();
    const png = new File(['x'], 'capa.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Imagem de capa'), png);
    // Deferred: nenhuma porta de upload chamada na seleção.
    expect(onUploadCapa).not.toHaveBeenCalled();

    await preencherObrigatorios();
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    await waitFor(() => expect(onSalvarCapa).toHaveBeenCalledTimes(1));
    expect(onCriarEvento).toHaveBeenCalledTimes(1);
    // Upload com o id devolvido pelo criarEvento + o File cropado (jsdom degrada
    // o crop → File); persistência com a downloadURL resolvida.
    expect(onUploadCapa).toHaveBeenCalledWith('e1', expect.any(File));
    expect(onSalvarCapa).toHaveBeenCalledWith('e1', 'https://storage.leela.dev/eventos/e1/capa');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ eventoId: 'e1', slug: 'e1' }));
  });

  it('capa webp REJEITADA inline (RN-228 jpeg/png/gif) e nada sobe no submit', async () => {
    const { onUploadCapa } = renderFormComCapa();
    const webp = new File(['x'], 'capa.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText('Imagem de capa'), webp);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/JPG, PNG ou GIF/);

    await preencherObrigatorios();
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    await waitFor(() => expect(screen.getByText('Rascunho criado')).toBeInTheDocument());
    expect(onUploadCapa).not.toHaveBeenCalled();
  });

  it('capa acima de 2MB REJEITADA inline (teto RN-228 pós-crop; jsdom não reduz)', async () => {
    const { onUploadCapa } = renderFormComCapa();
    const grande = new File([new Uint8Array(3 * 1024 * 1024)], 'capa.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Imagem de capa'), grande);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/no máximo 2MB/);
    expect(onUploadCapa).not.toHaveBeenCalled();
  });

  it('"Remover capa" esquece o arquivo pendente — criar não sobe nada', async () => {
    const { onUploadCapa, onSalvarCapa, onSuccess } = renderFormComCapa();
    const png = new File(['x'], 'capa.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Imagem de capa'), png);
    await user.click(await screen.findByRole('button', { name: 'Remover capa' }));

    await preencherObrigatorios();
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1)); // evento criado normal
    expect(onUploadCapa).not.toHaveBeenCalled();
    expect(onSalvarCapa).not.toHaveBeenCalled();
  });

  it('desmontar a tela REVOGA a object URL da prévia (review CEV BAIXO-2 — sem blob vivo)', async () => {
    // jsdom não tem create/revokeObjectURL — instala espiões e restaura no fim.
    const criarSpy = vi.fn(() => 'blob:previa-capa-teste');
    const revogarSpy = vi.fn();
    const originais = {
      criar: (URL as unknown as Record<string, unknown>)['createObjectURL'],
      revogar: (URL as unknown as Record<string, unknown>)['revokeObjectURL'],
    };
    Object.assign(URL, { createObjectURL: criarSpy, revokeObjectURL: revogarSpy });
    try {
      const { unmount } = render(
        <ToastProvider>
          <EventoForm
            onCriarEvento={vi.fn().mockResolvedValue({ eventoId: 'e1', slug: 'e1' })}
            onUploadCapa={vi.fn().mockResolvedValue('https://storage.leela.dev/eventos/e1/capa')}
            onSalvarCapa={vi.fn().mockResolvedValue(undefined)}
          />
        </ToastProvider>,
      );
      const png = new File(['x'], 'capa.png', { type: 'image/png' });
      await user.upload(screen.getByLabelText('Imagem de capa'), png);
      await waitFor(() => expect(criarSpy).toHaveBeenCalledTimes(1));
      expect(revogarSpy).not.toHaveBeenCalled(); // prévia vigente segue viva

      unmount(); // navegou/saiu da tela → cleanup effect revoga
      expect(revogarSpy).toHaveBeenCalledWith('blob:previa-capa-teste');
    } finally {
      Object.assign(URL, {
        createObjectURL: originais.criar,
        revokeObjectURL: originais.revogar,
      });
    }
  });

  it('falha no upload da capa NÃO desfaz o evento: toast honesto + onSuccess mesmo assim', async () => {
    const { onSalvarCapa, onSuccess } = renderFormComCapa({
      onUploadCapa: vi.fn().mockRejectedValue(new Error('permission-denied')),
    });
    const png = new File(['x'], 'capa.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Imagem de capa'), png);

    await preencherObrigatorios();
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    expect(await screen.findByText('A capa não foi enviada')).toBeInTheDocument();
    expect(screen.getByText('Rascunho criado')).toBeInTheDocument();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSalvarCapa).not.toHaveBeenCalled();
  });

  it('failed-precondition (RN-402) mostra toast ESPECÍFICO, não o genérico (review #34)', async () => {
    renderForm(
      vi.fn().mockRejectedValue({
        code: 'functions/failed-precondition',
        message: "Tenant 'castelo' não está ativo — operação bloqueada (RN-402).",
      }),
    );

    await user.type(screen.getByLabelText('Nome do evento'), 'Evento Y');
    await escolherDataDaProva();
    await user.type(screen.getByLabelText('Endereço / local'), 'SP');
    await user.type(screen.getByLabelText('Adicionar modalidade'), '5k');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    await user.click(screen.getByRole('button', { name: 'Criar rascunho' }));

    expect(
      await screen.findByText('Sua conta não pode criar eventos agora'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Tente novamente em instantes.')).not.toBeInTheDocument();
  });
});
