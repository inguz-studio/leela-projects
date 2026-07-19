// =============================================================================
// InfluenciadoresPage — `/clubes/influenciadores` (R9-E · S-R9-11-T8 ·
// RN-319, lado do ORGANIZADOR). Vendas/conversões de clube-influenciador e
// influenciador PF de TODOS os eventos do tenant, na aba Clubs. FASE 2 (COMF2):
// comissão acumulada/repassada/saldo por afiliado + registro de repasse MANUAL
// (registrarRepasseComissao — pagamento feito FORA da plataforma, idempotente).
// Dados via reader server-side (getAfiliadosDoTenant — escopo da claim).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  SearchInput,
  KpiCard,
  PageHeader,
  Skeleton,
  Table,
  useToast,
} from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import {
  getAfiliadosDoTenant,
  registrarRepasseComissao,
  type AfiliadoDoTenant,
} from '@leela/api-client';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function badgeDoStatus(status: string): JSX.Element {
  if (status === 'ativo') return <Badge variant="vitoria">Ativo</Badge>;
  if (status === 'convite_pendente') return <Badge variant="heroico">Convite pendente</Badge>;
  return <Badge variant="neutro">Inativo</Badge>;
}

function mensagemErroRepasse(err: unknown): string {
  const code = (err as { code?: string; message?: string })?.code ?? '';
  const msg = (err as { message?: string })?.message ?? '';
  if (code.includes('permission-denied')) {
    return 'Você não tem permissão para registrar repasses deste afiliado.';
  }
  if (code.includes('failed-precondition') || msg.includes('saldo')) {
    return 'O valor excede o saldo de comissão disponível.';
  }
  return 'Não foi possível registrar o repasse. Tente novamente.';
}

export function InfluenciadoresPage(): JSX.Element {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [afiliados, setAfiliados] = useState<AfiliadoDoTenant[] | null>(null);
  const [erro, setErro] = useState<Error | null>(null);
  const [busca, setBusca] = useState('');

  // Repasse manual (FASE 2): idempotência amigável — o repasseId nasce ao ABRIR
  // o modal e é REUSADO em qualquer retry (replay não debita 2×).
  const [alvoRepasse, setAlvoRepasse] = useState<AfiliadoDoTenant | null>(null);
  const [repasseId, setRepasseId] = useState('');
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const r = await getAfiliadosDoTenant();
      setAfiliados(r.afiliados);
    } catch (e) {
      setErro(e instanceof Error ? e : new Error('falha'));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const lista = afiliados ?? [];
    const q = busca.trim().toLowerCase();
    if (q === '') return lista;
    return lista.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) ||
        a.refCodigo.toLowerCase().includes(q) ||
        a.eventoNome.toLowerCase().includes(q),
    );
  }, [afiliados, busca]);

  const kpis = useMemo(() => {
    const lista = afiliados ?? [];
    return {
      afiliados: lista.length,
      inscricoes: lista.reduce((acc, a) => acc + a.conversoes, 0),
      valor: lista.reduce((acc, a) => acc + a.valorAtribuido, 0),
      // Saldo em aberto = só os saldos POSITIVOS (dívidas não abatem o total a pagar).
      saldoAberto: lista.reduce((acc, a) => acc + Math.max(0, a.saldoComissao), 0),
    };
  }, [afiliados]);

  function abrirRepasse(a: AfiliadoDoTenant): void {
    setRepasseId(crypto.randomUUID());
    setAlvoRepasse(a);
  }

  async function confirmarRepasse(observacao: string): Promise<void> {
    if (alvoRepasse === null) return;
    setProcessando(true);
    try {
      const obs = observacao.trim();
      const r = await registrarRepasseComissao({
        eventoId: alvoRepasse.eventoId,
        afiliadoId: alvoRepasse.refCodigo,
        repasseId,
        valor: alvoRepasse.saldoComissao,
        ...(obs !== '' ? { observacao: obs } : {}),
      });
      toast({
        variant: 'success',
        title: r.duplicado ? 'Repasse já estava registrado' : 'Repasse registrado',
        description: `Novo saldo de comissão: ${formatBRL(r.saldoComissao)}`,
      });
      setAlvoRepasse(null);
      await carregar();
    } catch (err) {
      toast({ variant: 'danger', title: mensagemErroRepasse(err) });
    } finally {
      setProcessando(false);
    }
  }

  const colunas: TableColumn<AfiliadoDoTenant>[] = [
    {
      key: 'afiliado',
      header: 'Influenciador',
      render: (a) => (
        <div className="flex flex-col">
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{a.nome}</span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {a.tipo === 'clube' ? 'Clube' : 'Pessoa física'} · <code>{a.refCodigo}</code>
          </span>
        </div>
      ),
    },
    { key: 'evento', header: 'Evento', render: (a) => a.eventoNome },
    { key: 'status', header: 'Status', render: (a) => badgeDoStatus(a.status) },
    {
      key: 'inscricoes',
      header: 'Inscrições',
      align: 'right',
      render: (a) =>
        `${a.conversoes.toLocaleString('pt-BR')}${a.minimoInscricoes !== null ? ` / mín. ${a.minimoInscricoes}` : ''}`,
    },
    {
      key: 'comissao',
      header: 'Comissão (saldo)',
      align: 'right',
      render: (a) => {
        const devendo = a.saldoComissao < 0;
        return (
          <div className="flex flex-col items-end">
            <span
              className={
                devendo
                  ? 'font-[var(--font-weight-semibold)] text-[var(--feedback-danger-fg)]'
                  : 'font-[var(--font-weight-semibold)] text-[var(--text-primary)]'
              }
            >
              {formatBRL(a.saldoComissao)}
              {devendo ? ' (dívida)' : ''}
            </span>
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              acum. {formatBRL(a.comissaoAcumulada)} · repass. {formatBRL(a.comissaoRepassada)}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Influenciadores"
        subtitle="Conversões e comissão de clubes-influenciadores e pessoas físicas por evento"
        actions={
          <Button variant="secondary" onClick={() => navigate('/clubes')}>
            Voltar para Clubes
          </Button>
        }
      />
      <div className="flex flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)]">
        {afiliados === null && erro === null ? (
          <div role="status" aria-label="Carregando influenciadores" className="flex flex-col gap-[var(--spacing-4)]">
            <Skeleton variant="rect" className="h-24" />
            <Skeleton variant="rect" className="h-48" />
          </div>
        ) : erro !== null ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar os influenciadores. Tente novamente.
          </div>
        ) : (afiliados ?? []).length === 0 ? (
          <EmptyState
            title="Nenhum influenciador ainda"
            description="Crie afiliados na aba Afiliados de um evento — clubes e pessoas físicas aparecem aqui com as conversões e a comissão."
          />
        ) : (
          <>
            <section
              aria-label="Indicadores de influenciadores"
              className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-4"
            >
              <KpiCard label="Afiliados" value={String(kpis.afiliados)} />
              <KpiCard label="Inscrições atribuídas" value={kpis.inscricoes.toLocaleString('pt-BR')} />
              <KpiCard label="Valor atribuído (bruto)" value={formatBRL(kpis.valor)} hint="antes de comissão" />
              <KpiCard label="Comissão em aberto" value={formatBRL(kpis.saldoAberto)} hint="saldo a repassar" />
            </section>

            <SearchInput
              aria-label="Buscar influenciador"
              placeholder="Buscar por nome, código ou evento"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              shortcutLabel={null}
              className="w-full max-w-md"
            />
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
              mostrando {filtrados.length} de {(afiliados ?? []).length}
            </span>

            {filtrados.length === 0 ? (
              <EmptyState title="Nada encontrado" description="Nenhum influenciador casa com a busca." />
            ) : (
              <Table
                columns={colunas}
                data={filtrados}
                keyExtractor={(a) => `${a.eventoId}:${a.refCodigo}`}
                caption="Influenciadores do tenant"
                renderActions={(a) =>
                  a.saldoComissao > 0 ? (
                    <Button variant="ghost" onClick={() => abrirRepasse(a)}>
                      Registrar repasse
                    </Button>
                  ) : (
                    <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                      {a.saldoComissao < 0 ? 'Em dívida' : 'Sem saldo'}
                    </span>
                  )
                }
              />
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={alvoRepasse !== null}
        onOpenChange={(o) => !o && !processando && setAlvoRepasse(null)}
        title="Registrar repasse de comissão"
        description="Registra que você PAGOU a comissão fora da plataforma (nenhum dinheiro é movido aqui). O saldo do afiliado zera. A ação é idempotente — reenviar não debita duas vezes."
        target={
          alvoRepasse ? (
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                {alvoRepasse.nome} · {alvoRepasse.eventoNome}
              </span>
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                Repasse de {formatBRL(alvoRepasse.saldoComissao)} (saldo atual)
              </span>
            </div>
          ) : undefined
        }
        loses={['O saldo de comissão em aberto deste afiliado (vai a zero)']}
        keeps={[
          'O histórico de conversões e a comissão acumulada',
          'O extrato do repasse (registrado no acompanhamento do afiliado)',
        ]}
        reasonLabel="Observação (opcional) — ex.: comprovante/PIX"
        confirmLabel="Confirmar repasse"
        loading={processando}
        onConfirm={(d) => void confirmarRepasse(d.reason)}
      />
    </div>
  );
}

InfluenciadoresPage.displayName = 'InfluenciadoresPage';
