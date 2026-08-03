// =============================================================================
// PROVA das três posições de foto do kit no painel (S212-T2 · RN-425/427).
//
// O que estes casos cobram, em ordem de dano:
//
//   1. "Tornar principal" TROCA. Se copiasse, a mesma foto entraria duas vezes
//      no documento e o checkout mostraria a foto grande repetida na fita de
//      miniaturas.
//   2. O upload não grava em cima do objeto que OUTRA posição está usando.
//      Depois de uma troca, a posição 1 pode apontar para o objeto do slot 2;
//      reenviar a posição 2 naquele slot invalidaria o token da URL da
//      principal e mataria a foto grande de uma tela que ninguém tocou.
//   3. Galeria não tocada NÃO entra no payload — merge não pode apagar o que o
//      organizador já tinha.
//   4. Remover a principal promove a primeira secundária: kit com galeria e sem
//      foto de listagem é estado que a RN-426 não sabe exibir.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { slotDeUploadFotoKit, slotDaUrlFotoKit } from '@leela/api-client';
import type * as ApiClient from '@leela/api-client';
import { KitEditor } from '../KitEditor';
import { mkEvento, ts } from '../../_test/fixtures';
import type { Evento, ItemKit, Kit } from '@leela/core';

const uploadImagemKit = vi.hoisted(() => vi.fn());
vi.mock('@leela/api-client', async () => {
  const real = await vi.importActual<typeof ApiClient>('@leela/api-client');
  return { ...real, uploadImagemKit };
});

const EVENTO_ID = 'e1';
const KIT_ID = 'kit_ouro';

/** downloadURL do Firebase, com o path do objeto URL-encodado (como em prod). */
function urlDeSlot(slot: 1 | 2 | 3, token = 'tok1'): string {
  const path = slot === 1
    ? `eventos/${EVENTO_ID}/kits/${KIT_ID}`
    : `eventos/${EVENTO_ID}/kits/${KIT_ID}/fotos/${slot}`;
  return `https://firebasestorage.googleapis.com/v0/b/leela.appspot.com/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function mkKit(over: Partial<Kit> = {}): Kit {
  return {
    id: KIT_ID,
    tenantId: 'castelo',
    nome: 'Kit Ouro',
    preco: 120,
    capacidade: 100,
    modalidades: ['21k'],
    itens: [],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}
function mkItem(): ItemKit {
  return {
    id: 'cam',
    tenantId: 'castelo',
    eventoId: EVENTO_ID,
    nome: 'Camiseta',
    tamanhado: true,
    origem: 'organizador',
    exibirLogo: false,
    modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: [],
    kits: [],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
  };
}

function setup(opts: { evento?: Partial<Evento>; kit?: Kit | null } = {}) {
  const onSalvarKit = vi.fn().mockResolvedValue(undefined);
  const onSalvarItem = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <ToastProvider>
        <KitEditor
          evento={mkEvento({ id: EVENTO_ID, ...opts.evento })}
          kit={opts.kit ?? null}
          itens={[mkItem()]}
          onSalvarKit={onSalvarKit}
          onSalvarItem={onSalvarItem}
          onConcluir={vi.fn()}
        />
      </ToastProvider>
    </MemoryRouter>,
  );
  return { onSalvarKit };
}

/** Payload do kit na primeira chamada de save. */
async function salvarELer(onSalvarKit: ReturnType<typeof vi.fn>) {
  await userEvent.click(screen.getByRole('button', { name: 'Salvar kit' }));
  await waitFor(() => expect(onSalvarKit).toHaveBeenCalled());
  return onSalvarKit.mock.calls[0]![1] as {
    imagemUrl?: string | null;
    fotosSecundarias?: string[];
  };
}

beforeEach(() => {
  uploadImagemKit.mockReset();
});

// ---------------------------------------------------------------------------
// slotDeUploadFotoKit — o núcleo puro do vetor nº 2
// ---------------------------------------------------------------------------

describe('slotDeUploadFotoKit — o upload nunca pisa no objeto de outra posição', () => {
  const args = [EVENTO_ID, KIT_ID] as const;

  it('lê o slot de dentro da downloadURL, sem campo extra no doc', () => {
    expect(slotDaUrlFotoKit(urlDeSlot(1), ...args)).toBe(1);
    expect(slotDaUrlFotoKit(urlDeSlot(2), ...args)).toBe(2);
    expect(slotDaUrlFotoKit(urlDeSlot(3), ...args)).toBe(3);
  });

  it('URL de fora do kit não casa com slot nenhum', () => {
    expect(slotDaUrlFotoKit('https://cdn.terceiro.test/foto.jpg', ...args)).toBeNull();
    expect(slotDaUrlFotoKit(null, ...args)).toBeNull();
    expect(slotDaUrlFotoKit('', ...args)).toBeNull();
  });

  it('.../fotos/2 NÃO casa como principal (sufixo, não includes)', () => {
    expect(slotDaUrlFotoKit(urlDeSlot(2), ...args)).not.toBe(1);
  });

  it('posição que já tem foto reenvia NO MESMO objeto (RN-227: sobrescreve, sem órfão)', () => {
    const posicoes = [urlDeSlot(1), urlDeSlot(2), null];
    expect(slotDeUploadFotoKit(posicoes, 1, ...args)).toBe(1);
    expect(slotDeUploadFotoKit(posicoes, 2, ...args)).toBe(2);
  });

  it('DEPOIS DA TROCA, reenviar a posição 2 não grava no objeto que a principal usa', () => {
    // Estado pós-swap: a principal é o objeto do slot 2, a secundária é o do 1.
    const posicoes = [urlDeSlot(2), urlDeSlot(1), null];
    const slot = slotDeUploadFotoKit(posicoes, 2, ...args);
    expect(slot).toBe(1); // o objeto que a própria posição 2 já usa
    expect(slot).not.toBe(slotDaUrlFotoKit(posicoes[0], ...args));
  });

  it('posição vazia pega o menor slot que ninguém está usando', () => {
    expect(slotDeUploadFotoKit([urlDeSlot(1), null, null], 2, ...args)).toBe(2);
    expect(slotDeUploadFotoKit([urlDeSlot(2), urlDeSlot(3), null], 3, ...args)).toBe(1);
    expect(slotDeUploadFotoKit([null, null, null], 1, ...args)).toBe(1);
  });

  it('o slot escolhido nunca colide com o de outra posição — as três combinações', () => {
    const cenarios: (string | null)[][] = [
      [urlDeSlot(1), urlDeSlot(2), urlDeSlot(3)],
      [urlDeSlot(2), urlDeSlot(1), urlDeSlot(3)],
      [urlDeSlot(3), urlDeSlot(2), null],
      [urlDeSlot(2), null, null],
    ];
    for (const posicoes of cenarios) {
      for (const posicao of [1, 2, 3] as const) {
        const slot = slotDeUploadFotoKit(posicoes, posicao, ...args);
        const outros = posicoes
          .filter((_, i) => i !== posicao - 1)
          .map((u) => slotDaUrlFotoKit(u, ...args));
        expect(outros).not.toContain(slot);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// KitEditor — as três posições na tela
// ---------------------------------------------------------------------------

describe('KitEditor · galeria de três posições (RN-425/427)', () => {
  it('desenha as três posições, com a primeira nomeada como principal', () => {
    setup({ kit: mkKit() });
    expect(screen.getByText('Foto principal')).toBeInTheDocument();
    expect(screen.getByText('Foto 2')).toBeInTheDocument();
    expect(screen.getByText('Foto 3')).toBeInTheDocument();
  });

  it('kit legado de UMA foto abre com a principal preenchida e as outras vazias', () => {
    setup({ kit: mkKit({ imagemUrl: urlDeSlot(1) }) });
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute('src', urlDeSlot(1));
  });

  it('galeria NÃO tocada não entra no payload — merge preserva o doc', async () => {
    const { onSalvarKit } = setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ imagemUrl: urlDeSlot(1), fotosSecundarias: [urlDeSlot(2)] }),
    });
    const payload = await salvarELer(onSalvarKit);
    expect(payload.imagemUrl).toBeUndefined();
    expect(payload.fotosSecundarias).toBeUndefined();
  });

  it('"tornar principal" TROCA as duas posições — e não copia', async () => {
    const { onSalvarKit } = setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ imagemUrl: urlDeSlot(1), fotosSecundarias: [urlDeSlot(2)] }),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Tornar principal' }));
    const payload = await salvarELer(onSalvarKit);
    expect(payload.imagemUrl).toBe(urlDeSlot(2));
    expect(payload.fotosSecundarias).toEqual([urlDeSlot(1)]);
    // Se copiasse, a mesma URL estaria nos dois lugares.
    expect(payload.fotosSecundarias).not.toContain(payload.imagemUrl);
  });

  it('remover a principal promove a primeira secundária (kit nunca fica sem foto de listagem)', async () => {
    const { onSalvarKit } = setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ imagemUrl: urlDeSlot(1), fotosSecundarias: [urlDeSlot(2), urlDeSlot(3)] }),
    });
    const [removerPrincipal] = screen.getAllByRole('button', { name: 'Remover' });
    await userEvent.click(removerPrincipal!);
    const payload = await salvarELer(onSalvarKit);
    expect(payload.imagemUrl).toBe(urlDeSlot(2));
    expect(payload.fotosSecundarias).toEqual([urlDeSlot(3)]);
  });

  it('remover a única foto deixa o kit sem foto — estado legítimo, não erro', async () => {
    const { onSalvarKit } = setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ imagemUrl: urlDeSlot(1) }),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    const payload = await salvarELer(onSalvarKit);
    expect(payload.imagemUrl).toBeNull();
    expect(payload.fotosSecundarias).toEqual([]);
  });

  it('a vaga 3 só abre depois da 2 — sem buraco no meio da fita', () => {
    setup({ kit: mkKit({ imagemUrl: urlDeSlot(1) }) });
    expect(screen.getByText('Envie a foto 2 antes')).toBeInTheDocument();
  });

  it('enviar a foto 2 grava no slot 2 e ela entra no payload como secundária', async () => {
    uploadImagemKit.mockResolvedValue(urlDeSlot(2, 'novo'));
    const { onSalvarKit } = setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ imagemUrl: urlDeSlot(1) }),
    });
    const input = document.querySelector('#kit-foto-2') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'f2.png', { type: 'image/png' }));
    await waitFor(() => expect(uploadImagemKit).toHaveBeenCalled());
    expect(uploadImagemKit.mock.calls[0]![3]).toBe(2);
    const payload = await salvarELer(onSalvarKit);
    expect(payload.imagemUrl).toBe(urlDeSlot(1));
    expect(payload.fotosSecundarias).toEqual([urlDeSlot(2, 'novo')]);
  });

  it('DEPOIS da troca, o upload da posição 2 não é mandado para o slot da principal', async () => {
    uploadImagemKit.mockResolvedValue(urlDeSlot(1, 'novo'));
    setup({
      evento: { qtdInscritos: 0 },
      kit: mkKit({ imagemUrl: urlDeSlot(1), fotosSecundarias: [urlDeSlot(2)] }),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Tornar principal' }));
    const input = document.querySelector('#kit-foto-2') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'f2.png', { type: 'image/png' }));
    await waitFor(() => expect(uploadImagemKit).toHaveBeenCalled());
    // A principal virou o objeto do slot 2 — o upload tem de ir para o 1.
    expect(uploadImagemKit.mock.calls[0]![3]).toBe(1);
  });
});
