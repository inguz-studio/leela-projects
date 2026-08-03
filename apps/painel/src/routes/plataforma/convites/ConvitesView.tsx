// =============================================================================
// ConvitesView — gestão dos convites de organizador (S1608-T2 · RN-413).
//
// Presentational: recebe estado async + callbacks. Tabela densa (§2.5) com
// código, status, nota, quem usou, quando e validade; formulário curto de
// geração no topo (nota + validade opcional, ambas dispensáveis — P2/P3);
// "Copiar" por linha; "Revogar" só onde faz sentido (código `ativo`).
//
// Reuso: os MESMOS primitivos e o mesmo esqueleto de estados da tela de planos
// (PageHeader/Table/Skeleton/Button/Input) e o `formatDataHora` de plataforma.
// Nada de regra nova: estado do convite e alfabeto vêm do core.
//
// O código aparece por extenso na tabela DE PROPÓSITO: quem lê esta tela é o
// dono da plataforma, único leitor autorizado (Rules), e ele precisa ditar o
// código no WhatsApp. Esconder atrás de "revelar" seria teatro.
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Badge, Button, Input, PageHeader, Skeleton, Table } from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import { NOTA_CONVITE_MAX, type ConviteOrganizador, type StatusConviteOrganizador } from '@leela/core';
import { formatDataHora } from '../_lib/format';

export interface ConvitesViewProps {
  convites: ConviteOrganizador[] | null;
  loading: boolean;
  error: Error | null;
  gerando: boolean;
  onRetry: () => void;
  onGerar: (input: { nota: string; expiraEm: string }) => void;
  onCopiar: (codigo: string) => void;
  onRevogar: (convite: ConviteOrganizador) => void;
}

const VARIANTE_STATUS: Record<StatusConviteOrganizador, 'vitoria' | 'neutro' | 'vulcao' | 'alerta'> = {
  ativo: 'vitoria',
  usado: 'neutro',
  revogado: 'vulcao',
  expirado: 'alerta',
};

const ROTULO_STATUS: Record<StatusConviteOrganizador, string> = {
  ativo: 'Ativo',
  usado: 'Usado',
  revogado: 'Revogado',
  expirado: 'Expirado',
};

export function ConvitesView({
  convites,
  loading,
  error,
  gerando,
  onRetry,
  onGerar,
  onCopiar,
  onRevogar,
}: ConvitesViewProps): JSX.Element {
  const [nota, setNota] = useState('');
  const [expiraEm, setExpiraEm] = useState('');
  const itens = convites ?? [];

  function submeter(event: FormEvent): void {
    event.preventDefault();
    if (gerando) return;
    onGerar({ nota, expiraEm });
    setNota('');
    setExpiraEm('');
  }

  const columns: TableColumn<ConviteOrganizador>[] = [
    {
      key: 'codigo',
      header: 'Código',
      render: (c) => (
        <span className="font-[var(--font-family-mono)] tracking-[var(--table-header-spacing)] text-[var(--text-primary)]">
          {c.codigo}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge variant={VARIANTE_STATUS[c.status]}>{ROTULO_STATUS[c.status]}</Badge>,
    },
    {
      key: 'nota',
      header: 'Nota',
      render: (c) => <span className="text-[var(--text-secondary)]">{c.nota ?? '—'}</span>,
    },
    {
      key: 'usadoPor',
      header: 'Quem usou',
      render: (c) => (
        <span className="text-[var(--text-secondary)]">{c.tenantId ?? c.usadoPor ?? '—'}</span>
      ),
    },
    {
      key: 'usadoEm',
      header: 'Quando',
      render: (c) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--text-secondary)]">
          {formatDataHora(c.usadoEm as never)}
        </span>
      ),
    },
    {
      key: 'expiraEm',
      header: 'Validade',
      render: (c) => (
        <span className="[font-variant-numeric:tabular-nums] text-[var(--text-secondary)]">
          {c.expiraEm ? formatDataHora(c.expiraEm as never) : 'Sem validade'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Convites de organizador"
        subtitle="Cada código libera UMA conta de organizador — gerar, acompanhar o uso e revogar o que ainda não foi usado"
      />

      <div className="flex flex-col gap-[var(--spacing-5)] px-[var(--spacing-6)]">
        <form
          className="flex flex-col gap-[var(--spacing-3)] sm:flex-row sm:items-end"
          onSubmit={submeter}
          noValidate
        >
          <div className="flex-1">
            <Input
              id="convite-nota"
              label="Para quem é (opcional)"
              type="text"
              maxLength={NOTA_CONVITE_MAX}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
          <div className="sm:w-56">
            <Input
              id="convite-validade"
              label="Validade (opcional)"
              type="date"
              value={expiraEm}
              onChange={(e) => setExpiraEm(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={gerando}>
            {gerando ? 'Gerando…' : 'Gerar código'}
          </Button>
        </form>

        {loading ? (
          <div
            role="status"
            aria-label="Carregando convites de organizador"
            className="flex flex-col gap-[var(--spacing-4)]"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-16" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-[var(--spacing-3)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            <p>Não foi possível carregar os convites.</p>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <p aria-live="polite" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {itens.length} {itens.length === 1 ? 'convite' : 'convites'}
            </p>
            <Table
              columns={columns}
              data={itens}
              keyExtractor={(c) => c.codigo}
              caption="Convites de organizador"
              emptyTitle="Nenhum convite gerado ainda"
              emptyDescription="Gere um código para liberar a primeira conta de organizador."
              renderActions={(c) => (
                <div className="flex items-center justify-end gap-[var(--spacing-2)]">
                  <Button variant="ghost" size="sm" onClick={() => onCopiar(c.codigo)}>
                    Copiar
                  </Button>
                  {c.status === 'ativo' ? (
                    <Button variant="secondary" size="sm" onClick={() => onRevogar(c)}>
                      Revogar
                    </Button>
                  ) : null}
                </div>
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}

ConvitesView.displayName = 'ConvitesView';
