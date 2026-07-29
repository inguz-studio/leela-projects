// =============================================================================
// apps/landing/test/ingresso-pagina.test.tsx
//
// A matriz de estados da RN-421 renderizada, mais as invariantes de privacidade
// da RN-422 (S1214-T2 · ⚔ vetores 6 e 7 do lado da página).
//
// O componente é Server Component PURO (sem hook, sem estado), então roda no
// RTL direto — que é exatamente a prova de que ele não precisa de cliente.
// =============================================================================

import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { EstadoIngressoPagina } from '@leela/core';
import {
  IngressoIndisponivel,
  IngressoNaoEncontrado,
  IngressoView,
} from '../app/(public)/ingresso/[token]/IngressoView';
import {
  baseFunctions,
  buscarIngressoPorLink,
  formatarCarimbo,
  formatarDataEvento,
  type IngressoProjetado,
} from '../lib/ingresso';

// `globals: false` no vitest.config ⇒ o auto-cleanup do RTL não se registra
// sozinho. Mesmo padrão dos demais testes da landing.
afterEach(cleanup);

const QR_FAKE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** Overrides que PODEM zerar um opcional (o repo roda exactOptionalPropertyTypes). */
type Override = { [K in keyof IngressoProjetado]?: IngressoProjetado[K] | undefined };

function projecao(over: Override = {}): IngressoProjetado {
  return {
    estado: 'valido',
    titular: 'Marina Corredora',
    evento: {
      nome: 'Meia Maratona Floripa 2026',
      dataISO: '2026-09-13T09:00:00.000Z',
      local: 'Beira-Mar Norte, Florianópolis/SC',
    },
    modalidade: '21k',
    kit: 'Kit Prata',
    tamanho: 'M',
    codigo: 'AB2CD3',
    qrDataUri: QR_FAKE,
    ...over,
  } as IngressoProjetado;
}

describe('matriz de estados na página (RN-421)', () => {
  it('valido: QR, código e dados mínimos', () => {
    render(<IngressoView ingresso={projecao()} />);
    expect(screen.getByTestId('ingresso-qr').getAttribute('src')).toBe(QR_FAKE);
    expect(screen.getByTestId('ingresso-codigo').textContent).toBe('AB2CD3');
    expect(screen.getByText('Marina Corredora')).toBeTruthy();
    expect(screen.getByText('Meia Maratona Floripa 2026')).toBeTruthy();
    expect(screen.getByText(/21k/)).toBeTruthy();
    expect(screen.getByText(/Kit Prata · tamanho M/)).toBeTruthy();
    expect(screen.getByText('Ingresso válido')).toBeTruthy();
  });

  it('credenciado: estado em destaque, carimbo, e o QR CONTINUA visível', () => {
    render(
      <IngressoView
        ingresso={projecao({
          estado: 'credenciado',
          credenciadoEm: '2026-09-13T09:12:00.000Z',
        })}
      />
    );
    expect(screen.getByText('Credenciado')).toBeTruthy();
    expect(screen.getByTestId('ingresso-qr')).toBeTruthy();
    expect(screen.getByText('Credenciado em')).toBeTruthy();
  });

  it.each(['cancelado', 'estornado'] as const)(
    '⚔ 6 — %s: SEM QR, com o que aconteceu em texto e o código para atendimento',
    (estado) => {
      // A projeção NÃO traz qrDataUri nesses estados (a guarda é do servidor);
      // aqui provamos que a página também não fabrica um.
      render(<IngressoView ingresso={projecao({ estado, qrDataUri: undefined })} />);
      expect(screen.queryByTestId('ingresso-qr')).toBeNull();
      expect(screen.getByTestId('ingresso-codigo').textContent).toBe('AB2CD3');
      expect(screen.getByTestId('ingresso').getAttribute('data-estado')).toBe(estado);
      expect(screen.getByText(/não dá acesso ao evento/)).toBeTruthy();
    }
  );

  it('⚔ 6 — mesmo se um qrDataUri vazasse para um estado sem QR, o servidor é a tranca', () => {
    // Contrato explícito: a página renderiza o que recebe. A prova de que
    // estornado/cancelado não recebem imagem está na suíte das Functions
    // (`estadoMostraQr` roda ANTES de gerar o QR). Este teste documenta a
    // fronteira para que ninguém mova a guarda para cá e ache que basta.
    render(<IngressoView ingresso={projecao({ estado: 'estornado', qrDataUri: QR_FAKE })} />);
    expect(screen.getByTestId('ingresso-qr')).toBeTruthy();
  });

  it('emitindo: aviso de emissão em andamento e NENHUM QR quebrado', () => {
    render(
      <IngressoView ingresso={projecao({ estado: 'emitindo', qrDataUri: undefined, codigo: '' })} />
    );
    expect(screen.queryByTestId('ingresso-qr')).toBeNull();
    expect(screen.getByText(/Estamos emitindo seu ingresso/)).toBeTruthy();
    expect(screen.getByText(/O código chega junto com a emissão/)).toBeTruthy();
  });

  it('pendente: sem QR, pagamento ainda não confirmado', () => {
    render(<IngressoView ingresso={projecao({ estado: 'pendente', qrDataUri: undefined })} />);
    expect(screen.queryByTestId('ingresso-qr')).toBeNull();
    expect(screen.getByText(/pagamento ainda não foi confirmado/i)).toBeTruthy();
  });

  it('evento encerrado: histórico com aviso, sem QR', () => {
    render(<IngressoView ingresso={projecao({ estado: 'encerrado', qrDataUri: undefined })} />);
    expect(screen.queryByTestId('ingresso-qr')).toBeNull();
    expect(screen.getByText(/Este evento já aconteceu/)).toBeTruthy();
  });

  it('todos os sete estados renderizam sem quebrar (a matriz é exaustiva)', () => {
    const estados: readonly EstadoIngressoPagina[] = [
      'valido',
      'credenciado',
      'emitindo',
      'pendente',
      'cancelado',
      'estornado',
      'encerrado',
    ];
    for (const estado of estados) {
      const { unmount } = render(<IngressoView ingresso={projecao({ estado })} />);
      expect(screen.getByTestId('ingresso').getAttribute('data-estado')).toBe(estado);
      unmount();
    }
  });
});

describe('privacidade da página (RN-422 · ⚔ 7)', () => {
  it('nenhum campo proibido aparece no HTML, mesmo que chegue na projeção', () => {
    // Projeção CONTAMINADA de propósito: se alguém acrescentar um campo
    // proibido ao contrato lá atrás, a página não pode ser o lugar onde ele
    // vaza por descuido de spread.
    const contaminada = {
      ...projecao(),
      cpf: '12345678909',
      telefone: '48999990000',
      email: 'marina@exemplo.test',
      nascimento: '1990-04-01',
      contatoEmergencia: 'João 48988887777',
      respostasFormulario: { camisa: 'sim' },
      valorPago: 18900,
      qrToken: 'LLQR1.k1.abc.def',
    } as unknown as IngressoProjetado;

    const { container } = render(<IngressoView ingresso={contaminada} />);
    const html = container.innerHTML;
    for (const proibido of [
      '12345678909',
      '48999990000',
      'marina@exemplo.test',
      '1990-04-01',
      '48988887777',
      'camisa',
      '18900',
      'LLQR1',
    ]) {
      expect(html).not.toContain(proibido);
    }
  });

  it('a negativa é uma só, e não conta qual das causas aconteceu', () => {
    const { container } = render(<IngressoNaoEncontrado />);
    const html = container.innerHTML.toLowerCase();
    for (const oraculo of ['assinatura', 'token inválido', 'expirado', 'cancelad', 'inexistente']) {
      expect(html).not.toContain(oraculo);
    }
    expect(screen.getByText(/Não encontramos este ingresso/)).toBeTruthy();
  });

  it('indisponível NÃO diz que o ingresso não existe (degradação honesta)', () => {
    render(<IngressoIndisponivel />);
    expect(screen.getByText(/O problema é nosso, não do seu link/)).toBeTruthy();
    expect(screen.queryByText(/Não encontramos este ingresso/)).toBeNull();
  });
});

describe('leitor server-side do ingresso (RN-418/419)', () => {
  const OLD_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD_ENV };
    vi.restoreAllMocks();
  });

  it('o token vai no CORPO do POST, nunca na URL', async () => {
    const spy = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, ...projecao() }), { status: 200 })
    );
    await buscarIngressoPorLink('LLIP1.k1.abc.def', spy as unknown as typeof fetch);

    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain('LLIP1');
    expect(url.endsWith('/ingressoPorLink')).toBe(true);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ token: 'LLIP1.k1.abc.def' });
    expect(init.cache).toBe('no-store');
  });

  it('404 vira `nao_encontrado`; 5xx e falha de rede viram `indisponivel`', async () => {
    const r404 = await buscarIngressoPorLink(
      'LLIP1.k1.a.b',
      (async () => new Response('{"ok":false}', { status: 404 })) as unknown as typeof fetch
    );
    expect(r404.situacao).toBe('nao_encontrado');

    const r503 = await buscarIngressoPorLink(
      'LLIP1.k1.a.b',
      (async () => new Response('{"ok":false}', { status: 503 })) as unknown as typeof fetch
    );
    expect(r503.situacao).toBe('indisponivel');

    const rRede = await buscarIngressoPorLink(
      'LLIP1.k1.a.b',
      (async () => {
        throw new Error('ECONNREFUSED');
      }) as unknown as typeof fetch
    );
    expect(rRede.situacao).toBe('indisponivel');
  });

  it('token vazio ou gigante não vira request', async () => {
    const spy = vi.fn();
    expect((await buscarIngressoPorLink('', spy as unknown as typeof fetch)).situacao).toBe(
      'nao_encontrado'
    );
    expect(
      (await buscarIngressoPorLink('x'.repeat(513), spy as unknown as typeof fetch)).situacao
    ).toBe('nao_encontrado');
    expect(spy).not.toHaveBeenCalled();
  });

  it('a base das Functions sai do ambiente, sem domínio cravado', () => {
    process.env['LEELA_FUNCTIONS_BASE'] = 'https://exemplo.test/fn/';
    expect(baseFunctions()).toBe('https://exemplo.test/fn');

    delete process.env['LEELA_FUNCTIONS_BASE'];
    process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] = 'leela-hub';
    delete process.env['GOOGLE_CLOUD_PROJECT'];
    delete process.env['GCLOUD_PROJECT'];
    process.env['NEXT_PUBLIC_USE_EMULATOR'] = 'false';
    expect(baseFunctions()).toBe('https://us-central1-leela-hub.cloudfunctions.net');

    process.env['NEXT_PUBLIC_USE_EMULATOR'] = 'true';
    expect(baseFunctions()).toBe('http://127.0.0.1:5001/leela-hub/us-central1');
  });
});

describe('formatação no fuso da prova', () => {
  it('data do evento sai legível em pt-BR', () => {
    expect(formatarDataEvento('2026-09-13T09:00:00.000Z')).toBe('13 de setembro de 2026, 06h00');
  });

  it('data ausente ou inválida vira string vazia, nunca "Invalid Date"', () => {
    expect(formatarDataEvento(null)).toBe('');
    expect(formatarDataEvento('nao-e-data')).toBe('');
    expect(formatarCarimbo(undefined)).toBe('');
  });
});
