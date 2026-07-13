// =============================================================================
// ComunicacaoView (E06-L3) — cobre: contadores lidos do ∑, timeline desc, PII
// mascarada na superfície (ref nunca em claro), EmptyState honesto e CTA de
// envio desabilitado honesto (sem callable de envio na V1).
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LogComunicacao, ResumoComunicacoes, Timestamp } from '@leela/core';
import { ComunicacaoView } from '../ComunicacaoView';

const ts = (iso: string): Timestamp =>
  ({ toDate: () => new Date(iso), toMillis: () => new Date(iso).getTime() }) as unknown as Timestamp;

function mkResumo(over: Partial<ResumoComunicacoes> = {}): ResumoComunicacoes {
  return {
    tenantId: 'castelo',
    total: 12,
    porStatus: { enfileirado: 1, enviado: 2, entregue: 4, aberto: 4, falhou: 1 },
    porCanal: { push: 3, email: 9 },
    porTipo: { ingresso: 8, campanha: 3, transacional: 1 },
    ...over,
  };
}

function mkLog(over: Partial<LogComunicacao> = {}): LogComunicacao {
  return {
    id: 'ins1_ingresso_email',
    tenantId: 'castelo',
    eventoId: 'e1',
    destinatario: { tipo: 'inscrito', ref: 'inscrito-ABC12345' },
    canal: 'email',
    tipo: 'ingresso',
    chave: 'ingresso',
    status: 'entregue',
    assunto: 'Seu ingresso para a Corrida',
    enfileiradoEm: ts('2026-02-01T14:30:00Z'),
    enviadoEm: ts('2026-02-01T14:30:05Z'),
    entregueEm: ts('2026-02-01T14:31:00Z'),
    ...over,
  };
}

describe('ComunicacaoView (E06-L3)', () => {
  it('sem ∑ (null) → EmptyState honesto', () => {
    render(<ComunicacaoView resumo={null} timeline={[]} loading={false} error={null} podeEnviar={false} />);
    expect(screen.getByText('Nenhuma comunicação enviada ainda')).toBeInTheDocument();
  });

  it('∑ zerado → EmptyState honesto (não conta logs no cliente)', () => {
    render(
      <ComunicacaoView
        resumo={mkResumo({ total: 0, porStatus: { enfileirado: 0, enviado: 0, entregue: 0, aberto: 0, falhou: 0 } })}
        timeline={[]}
        loading={false}
        error={null}
        podeEnviar={false}
      />,
    );
    expect(screen.getByText('Nenhuma comunicação enviada ainda')).toBeInTheDocument();
  });

  it('loading → região de status; error → mensagem honesta', () => {
    const { rerender } = render(
      <ComunicacaoView resumo={null} timeline={null} loading error={null} podeEnviar={false} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando comunicação' })).toBeInTheDocument();

    rerender(
      <ComunicacaoView resumo={null} timeline={null} loading={false} error={new Error('x')} podeEnviar={false} />,
    );
    expect(screen.getByText(/Não foi possível carregar a comunicação/i)).toBeInTheDocument();
  });

  it('com ∑ → mostra os 4 contadores lidos do agregado', () => {
    render(
      <ComunicacaoView resumo={mkResumo()} timeline={[mkLog()]} loading={false} error={null} podeEnviar={false} />,
    );
    expect(screen.getByText('Total enviado')).toBeInTheDocument();
    expect(screen.getByText('Entregues')).toBeInTheDocument();
    expect(screen.getByText('Abertos')).toBeInTheDocument();
    expect(screen.getByText('Falhas')).toBeInTheDocument();
  });

  it('timeline mostra o assunto e o status, com a ref do destinatário MASCARADA (PII)', () => {
    const { container } = render(
      <ComunicacaoView resumo={mkResumo()} timeline={[mkLog()]} loading={false} error={null} podeEnviar={false} />,
    );
    expect(screen.getByText('Seu ingresso para a Corrida')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();
    // A ref crua NUNCA aparece em claro; só a máscara ••••{4 últimos}.
    expect(container.textContent).not.toContain('inscrito-ABC12345');
    expect(container.textContent).toContain('••••2345');
  });

  it('CTA de envio DESABILITADO e honesto quando não há callable de envio', () => {
    render(
      <ComunicacaoView resumo={mkResumo()} timeline={[mkLog()]} loading={false} error={null} podeEnviar={false} />,
    );
    const cta = screen.getByRole('button', { name: /enviar comunicação/i });
    expect(cta).toBeDisabled();
    expect(screen.getByText(/entra com as campanhas do evento/i)).toBeInTheDocument();
  });

  it('CTA habilitado quando houver capacidade de envio (sem hint)', () => {
    render(
      <ComunicacaoView resumo={mkResumo()} timeline={[mkLog()]} loading={false} error={null} podeEnviar />,
    );
    expect(screen.getByRole('button', { name: /enviar comunicação/i })).toBeEnabled();
    expect(screen.queryByText(/entra com as campanhas do evento/i)).not.toBeInTheDocument();
  });
});
