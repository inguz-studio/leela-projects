// =============================================================================
// apps/landing/test/ingresso-imprimir.test.tsx
//
// A folha A4 do ingresso (S1214-T4 · RN-424, que amplia a RN-220).
//
// A rota é um Server Component `async`, então o teste exercita o que dá para
// exercitar de forma determinística: o CSS de impressão do arquivo de verdade
// (lido do fonte) e o `IngressoView` no modo impressão. A prova de que o
// navegador gera o PDF é o próprio navegador — não se testa Chrome aqui.
// =============================================================================

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { IngressoView } from '../app/(public)/ingresso/[token]/IngressoView';
import type { IngressoProjetado } from '../lib/ingresso';

afterEach(cleanup);

const FONTE_IMPRIMIR = readFileSync(
  resolve(__dirname, '../app/(public)/ingresso/[token]/imprimir/page.tsx'),
  'utf8'
);

const QR_FAKE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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

describe('folha A4 do ingresso (RN-424)', () => {
  it('a página declara papel A4 com margem de impressão', () => {
    expect(FONTE_IMPRIMIR).toContain('@page{size:A4;margin:14mm}');
  });

  it('SEM navegação: header e footer públicos somem pelo marcador do shell', () => {
    expect(FONTE_IMPRIMIR).toContain('[data-shell-publico]{display:none !important}');
  });

  it('a rota é sempre dinâmica e fora do índice, como a página principal', () => {
    expect(FONTE_IMPRIMIR).toContain("export const dynamic = 'force-dynamic'");
    expect(FONTE_IMPRIMIR).toContain('robots: { index: false, follow: false, nocache: true }');
  });

  it('reusa a MESMA leitura e a MESMA matriz — nada de segundo conjunto de regras', () => {
    expect(FONTE_IMPRIMIR).toContain('buscarIngressoPorLink');
    expect(FONTE_IMPRIMIR).toContain('IngressoView');
    expect(FONTE_IMPRIMIR).toContain('paraImpressao');
  });

  it('as instruções de tela não vão para o papel', () => {
    expect(FONTE_IMPRIMIR).toContain('data-print-esconder');
    expect(FONTE_IMPRIMIR).toContain('[data-print-esconder]{display:none !important}');
  });
});

describe('conteúdo da folha (RN-422/RN-424)', () => {
  it('a folha leva QR, código e os dados mínimos', () => {
    render(<IngressoView ingresso={projecao()} paraImpressao />);
    expect(screen.getByTestId('ingresso-qr')).toBeTruthy();
    expect(screen.getByTestId('ingresso-codigo').textContent).toBe('AB2CD3');
    expect(screen.getByText('Marina Corredora')).toBeTruthy();
    expect(screen.getByText('Meia Maratona Floripa 2026')).toBeTruthy();
    expect(screen.getByText(/13 de setembro de 2026/)).toBeTruthy();
    expect(screen.getByText(/Beira-Mar Norte/)).toBeTruthy();
  });

  it('e nada além do que a RN-422 permite, mesmo com projeção contaminada', () => {
    const contaminada = {
      ...projecao(),
      cpf: '12345678909',
      telefone: '48999990000',
      email: 'marina@exemplo.test',
      valorPago: 18900,
    } as unknown as IngressoProjetado;
    const { container } = render(<IngressoView ingresso={contaminada} paraImpressao />);
    for (const proibido of ['12345678909', '48999990000', 'marina@exemplo.test', '18900']) {
      expect(container.innerHTML).not.toContain(proibido);
    }
  });

  it.each(['cancelado', 'estornado', 'pendente', 'emitindo', 'encerrado'] as const)(
    'estado %s continua SEM QR na impressão',
    (estado) => {
      render(<IngressoView ingresso={projecao({ estado, qrDataUri: undefined })} paraImpressao />);
      expect(screen.queryByTestId('ingresso-qr')).toBeNull();
      expect(screen.getByTestId('ingresso').getAttribute('data-estado')).toBe(estado);
    }
  );

  it('o aviso de "guarde este link" não entra na folha (é conselho de tela)', () => {
    const { container } = render(<IngressoView ingresso={projecao()} paraImpressao />);
    expect(container.innerHTML).not.toContain('Guarde este link');
  });
});
