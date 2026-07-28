// =============================================================================
// InscritosView — lista densa de inscritos (S203 · §2.5/§2.7).
//
// JOB primeiro (brief FID-EVT-INSCRITOS). Decisões e a que servem:
//  • Filtros CONSOLIDADOS (chrome mínimo p/ a tabela dominar): Status fica
//    VISÍVEL como controle segmentado COM CONTAGENS — é a faceta de pagamento
//    (dor #1: "não sei quem pagou"). Kit e Modalidade colapsam em Selects
//    compactos (design-principles: 4-15 → Select). De 13 chips (3 linhas) → 4
//    chips de status + 2 selects numa linha.
//  • Banner de inadimplência: "N com pagamento pendente" com atalho p/ filtrar
//    os pendentes — serve a dor #1 sem checar manual (S203 §Pagamento).
//  • Colunas fiéis ao job: avatar, check-in, "inscrito em" (RN-205/222/§2.5).
//  • Clique na LINHA abre o slide-in (S203 critério 5) — além do "Detalhe".
//  • Seleção em massa (checkbox + selecionar todos) + barra de ação
//    (Enviar mensagem / Exportar CSV) — "gerenciar a operação" (JTBD S203).
//  • 4 tabs no DOM (§2.7); a aba Pagamento mostra a inadimplência de verdade.
//
// Presentational: recebe todos os inscritos e deriva filtro + paginação
// client-side. Reuso-first: DS (Table, Badge, Avatar, Chip, Select, Checkbox,
// Pagination, SearchInput, Tabs, Button, useToast) + helpers puros do _lib.
// =============================================================================

import * as React from 'react';
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Chip,
  Combobox,
  Pagination,
  SearchInput,
  Skeleton,
  Table,
  Tabs,
  useToast,
  type ComboboxOption,
  type TableColumn,
} from '@leela/design-system';
import { INSCRITOS_PAGE_SIZE } from '@leela/api-client';
import {
  KITS_INSCRITO,
  STATUS_INSCRITO,
  type Inscrito,
  type KitInscrito,
  type StatusInscrito,
} from '@leela/core';
import { kitInscritoBadge } from '../_lib/kitLabels';
import { statusInscritoBadge } from '../_lib/statusInscrito';
import { formatDataCurta } from '../_lib/format';
import { montarCsvInscritos } from '../_lib/inscritosCsv';
import {
  contadorInscritos,
  contarPendentesAntigos,
  contarPorStatus,
  filtrarInscritos,
  inadimplentes,
  paginar,
} from '../_lib/inscritosFiltro';
import { InscritoSlideInConnected } from './InscritoSlideInConnected';
import { QrIngressoModal } from './QrIngressoModal';

export interface InscritosViewProps {
  inscritos: Inscrito[];
  loading: boolean;
  error: Error | null;
  /** Evento dono das inscrições (docId = slug) — chave do join `[pag]` do slide-in. */
  eventoId: string;
  /** Percursos do evento — origem do filtro de modalidade. */
  modalidades: string[];
  /** "Agora" injetável (determinismo do recorte de inadimplência >72h). */
  agora?: Date;
}

// Sentinela de "sem filtro" compartilhada pelos selects de kit E modalidade
// (o Select exige value string; null não trafega pelo DOM).
const TODOS_VALUE = '__todos__';

/** Dispara o download de um CSV no navegador (efeito de borda isolado). */
function baixarCsv(nome: string, conteudo: string): void {
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function InscritosView({
  inscritos,
  loading,
  error,
  eventoId,
  modalidades,
  agora = new Date(),
}: InscritosViewProps): JSX.Element {
  const { toast } = useToast();
  const [busca, setBusca] = React.useState('');
  const [status, setStatus] = React.useState<StatusInscrito | null>(null);
  const [kit, setKit] = React.useState<KitInscrito | null>(null);
  const [modalidade, setModalidade] = React.useState<string | null>(null);
  const [pagina, setPagina] = React.useState(1);
  const [selecionado, setSelecionado] = React.useState<Inscrito | null>(null);
  // RN-397 — o QR aberto por ação na linha; null = nenhum na tela.
  const [qrAberto, setQrAberto] = React.useState<Inscrito | null>(null);
  const [marcados, setMarcados] = React.useState<ReadonlySet<string>>(new Set());

  const contagem = React.useMemo(() => contarPorStatus(inscritos), [inscritos]);
  const pendentes72h = React.useMemo(
    () => contarPendentesAntigos(inscritos, agora),
    [inscritos, agora],
  );

  const filtrados = React.useMemo(
    () => filtrarInscritos(inscritos, { busca, status, kit, modalidade }),
    [inscritos, busca, status, kit, modalidade],
  );

  // Qualquer mudança de filtro volta para a página 1 (contador coerente).
  React.useEffect(() => {
    setPagina(1);
  }, [busca, status, kit, modalidade]);

  const pageItems = paginar(filtrados, pagina, INSCRITOS_PAGE_SIZE);

  // ── Seleção em massa ──────────────────────────────────────────────────────
  const marcadosNaPagina = pageItems.filter((i) => marcados.has(i.id)).length;
  const todosMarcadosNaPagina = pageItems.length > 0 && marcadosNaPagina === pageItems.length;
  const algunsMarcadosNaPagina = marcadosNaPagina > 0 && !todosMarcadosNaPagina;

  function alternarMarcado(id: string): void {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function alternarPagina(): void {
    setMarcados((prev) => {
      const next = new Set(prev);
      if (todosMarcadosNaPagina) pageItems.forEach((i) => next.delete(i.id));
      else pageItems.forEach((i) => next.add(i.id));
      return next;
    });
  }

  function limparSelecao(): void {
    setMarcados(new Set());
  }

  const selecionados = React.useMemo(
    () => inscritos.filter((i) => marcados.has(i.id)),
    [inscritos, marcados],
  );

  function exportarSelecionados(): void {
    baixarCsv('inscritos-selecionados.csv', montarCsvInscritos(selecionados));
    toast({ title: `${selecionados.length} inscrito(s) exportado(s) em CSV`, variant: 'success' });
  }

  function enviarMensagem(): void {
    // Comunicados é E05 — ainda não há canal; damos feedback honesto.
    toast({
      title: 'Envio de mensagem chega com Comunicados (E05)',
      variant: 'info',
    });
  }

  // ── Filtros compactos ─────────────────────────────────────────────────────
  const kitOptions: ComboboxOption[] = [
    { value: TODOS_VALUE, label: 'Todos os kits' },
    ...KITS_INSCRITO.map((k) => ({ value: k, label: kitInscritoBadge(k).label })),
  ];
  const modalidadeOptions: ComboboxOption[] = [
    { value: TODOS_VALUE, label: 'Todas as modalidades' },
    ...modalidades.map((m) => ({ value: m, label: m })),
  ];

  // ── Colunas da tabela densa ───────────────────────────────────────────────
  const columns: TableColumn<Inscrito>[] = [
    {
      key: '__select',
      width: 'var(--spacing-10)',
      header: (
        <Checkbox
          aria-label="Selecionar todos os inscritos da página"
          checked={todosMarcadosNaPagina}
          indeterminate={algunsMarcadosNaPagina}
          onChange={alternarPagina}
        />
      ),
      render: (r) => (
        <Checkbox
          aria-label={`Selecionar ${r.atletaNome}`}
          checked={marcados.has(r.id)}
          onChange={() => alternarMarcado(r.id)}
        />
      ),
    },
    {
      key: 'atletaNome',
      header: 'Atleta',
      render: (r) => (
        <span className="flex items-center gap-[var(--spacing-3)]">
          <Avatar size="xs" name={r.atletaNome} />
          <span className="text-[var(--text-primary)]">{r.atletaNome}</span>
        </span>
      ),
    },
    {
      // RN-397: o código do ingresso é a coluna que faz o balcão achar a
      // pessoa sem depender do celular dela. Ingresso não emitido mostra
      // VAZIO HONESTO — nada de traço, que a essa altura da tabela pareceria
      // um código curto (aceite literal da S211).
      key: 'codigoIngresso',
      header: 'Código',
      render: (r) =>
        r.codigoIngresso !== undefined ? (
          <span className="font-mono font-[var(--font-weight-semibold)] tracking-[var(--table-header-spacing)] text-[var(--text-primary)]">
            {r.codigoIngresso}
          </span>
        ) : (
          <span className="sr-only">Ingresso ainda não emitido</span>
        ),
    },
    { key: 'modalidade', header: 'Modalidade', render: (r) => r.modalidade || '—' },
    {
      key: 'kit',
      header: 'Kit',
      render: (r) => {
        const b = kitInscritoBadge(r.kit);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const b = statusInscritoBadge(r.status);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: 'checkin',
      header: 'Check-in',
      align: 'center',
      render: (r) =>
        r.checkinEm ? (
          <span className="text-[var(--text-success)]" aria-label="Check-in realizado" role="img">
            ✓
          </span>
        ) : (
          <span className="text-[var(--text-tertiary)]" aria-hidden>
            —
          </span>
        ),
    },
    {
      key: 'criadoEm',
      header: 'Inscrito em',
      render: (r) => (
        <span className="text-[var(--text-secondary)]">{formatDataCurta(r.criadoEm)}</span>
      ),
    },
  ];

  function renderTabela(dados: Inscrito[]): JSX.Element {
    return (
      <Table
        columns={columns}
        data={dados}
        keyExtractor={(r) => r.id}
        caption="Inscritos do evento"
        emptyTitle="Nenhum inscrito encontrado"
        emptyDescription="Ajuste a busca ou os filtros para ver resultados."
        onRowClick={setSelecionado}
        renderActions={(r) => (
          <span className="flex items-center gap-[var(--spacing-3)]">
            {/* RN-397: QR SOB DEMANDA. A ação só existe para quem tem
                ingresso emitido — oferecer "ver QR" sem token abriria um
                modal vazio no meio do atendimento. `stopPropagation` porque
                a linha inteira abre o slide-in. */}
            {r.qrToken !== undefined && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQrAberto(r);
                }}
                aria-label={`Ver QR do ingresso de ${r.atletaNome}`}
                className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-brand)] hover:underline"
              >
                Ver QR
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelecionado(r)}
              aria-label={`Ver detalhe de ${r.atletaNome}`}
              className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-brand)] hover:underline"
            >
              Detalhe
            </button>
          </span>
        )}
      />
    );
  }

  // ── Aba Geral ─────────────────────────────────────────────────────────────
  const geral = loading ? (
    <div className="flex flex-col gap-[var(--spacing-2)]" role="status" aria-label="Carregando inscritos">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="rect" className="h-[var(--table-row-height)]" />
      ))}
    </div>
  ) : error ? (
    <p className="text-[var(--text-danger)]">Não foi possível carregar os inscritos.</p>
  ) : (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      {/* Banner de inadimplência (dor #1) */}
      {contagem.pendente > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] border-[length:var(--input-border-width)] border-[var(--feedback-warning-fg)] bg-[var(--feedback-warning-surface)] p-[var(--spacing-3)]"
        >
          <Badge variant="alerta">{contagem.pendente}</Badge>
          <span className="flex-1 text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">
              {contagem.pendente} inscrição(ões) com pagamento pendente
            </strong>
            {pendentes72h > 0 ? ` · ${pendentes72h} há mais de 72h` : ''}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setStatus('pendente')}>
            Ver pendentes
          </Button>
        </div>
      )}

      {/* Barra de filtros consolidada */}
      <div className="flex flex-wrap items-end justify-between gap-[var(--spacing-3)]">
        <div className="flex flex-wrap items-end gap-[var(--spacing-3)]">
          <SearchInput
            aria-label="Buscar atleta pelo nome ou código do ingresso"
            placeholder="Buscar por nome ou código"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-[var(--sidebar-width)] max-w-full"
          />
          <div className="min-w-[var(--spacing-24)]">
            <Combobox
              aria-label="Filtrar por kit"
              options={kitOptions}
              value={kit ?? TODOS_VALUE}
              onValueChange={(v) =>
                setKit((v as string) === TODOS_VALUE ? null : (v as KitInscrito))
              }
            />
          </div>
          {modalidades.length > 0 && (
            <div className="min-w-[var(--spacing-24)]">
              <Combobox
                aria-label="Filtrar por modalidade"
                options={modalidadeOptions}
                value={modalidade ?? TODOS_VALUE}
                onValueChange={(v) =>
                  setModalidade((v as string) === TODOS_VALUE ? null : (v as string))
                }
              />
            </div>
          )}
        </div>
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]" role="status">
          {contadorInscritos(filtrados.length, inscritos.length)}
        </span>
      </div>

      {/* Status: controle segmentado VISÍVEL com contagens (faceta de pagamento) */}
      <div className="flex flex-wrap items-center gap-[var(--spacing-2)]" role="group" aria-label="Filtrar por status">
        <Chip active={status === null} onClick={() => setStatus(null)}>
          {`Todos · ${contagem.total}`}
        </Chip>
        {STATUS_INSCRITO.map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {`${statusInscritoBadge(s).label} · ${contagem[s]}`}
          </Chip>
        ))}
      </div>

      {/* A1 (revisão r1) · "selecionar todos" no MOBILE: o checkbox de selecionar
          a página inteira vive no header da tabela (col.__select), e o thead some
          no card-mode (<lg). Reexpomos o MESMO controle — ligado ao mesmo estado/
          handler (todosMarcadosNaPagina / algunsMarcadosNaPagina / alternarPagina)
          — só no mobile (lg:hidden), preservando o JTBD de seleção em massa (P5
          inadimplência) no celular. No desktop o header cobre, então não duplica. */}
      {pageItems.length > 0 && (
        <label className="flex items-center gap-[var(--spacing-2)] lg:hidden">
          <Checkbox
            checked={todosMarcadosNaPagina}
            indeterminate={algunsMarcadosNaPagina}
            onChange={alternarPagina}
          />
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Selecionar todos da página
          </span>
        </label>
      )}

      {renderTabela(pageItems)}

      {filtrados.length > INSCRITOS_PAGE_SIZE && (
        <Pagination
          total={filtrados.length}
          page={pagina}
          pageSize={INSCRITOS_PAGE_SIZE}
          onPageChange={setPagina}
        />
      )}
    </div>
  );

  // ── Aba Pagamento (dor #1 servida de verdade, não placeholder) ────────────
  const listaPendentes = React.useMemo(() => inadimplentes(inscritos), [inscritos]);
  const pagamento = loading ? (
    <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">Carregando…</p>
  ) : (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <div className="flex flex-wrap gap-[var(--spacing-3)]">
        <ResumoPagamento rotulo="Confirmados" valor={contagem.confirmado} variant="vitoria" />
        <ResumoPagamento rotulo="Pendentes" valor={contagem.pendente} variant="alerta" />
        <ResumoPagamento rotulo="Cancelados" valor={contagem.cancelado} variant="vulcao" />
      </div>
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        {listaPendentes.length > 0
          ? `Inscrições aguardando pagamento (${listaPendentes.length}) — quem ainda não pagou.`
          : 'Nenhuma inscrição com pagamento pendente. Tudo em dia.'}
      </p>
      {listaPendentes.length > 0 && renderTabela(listaPendentes)}
    </div>
  );

  const tabs = [
    { id: 'geral', label: 'Geral', content: geral },
    { id: 'pagamento', label: 'Pagamento', content: pagamento },
    {
      id: 'comunicacao',
      label: 'Comunicação',
      content: (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Histórico de e-mails e mensagens ao atleta entra com Comunicados (E05).
        </p>
      ),
    },
    {
      id: 'historico',
      label: 'Histórico',
      content: (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Trilha de eventos da inscrição (alterações, check-in) chega com auditoria.
        </p>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <Tabs tabs={tabs} aria-label="Seções de inscritos" />

      {/* Barra de ação em massa — só quando há seleção */}
      {selecionados.length > 0 && (
        <div className="flex flex-wrap items-center gap-[var(--spacing-3)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-3)] shadow-elev-1">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            {selecionados.length} selecionado(s)
          </span>
          <Button variant="secondary" size="sm" onClick={enviarMensagem}>
            Enviar mensagem
          </Button>
          <Button variant="ghost" size="sm" onClick={exportarSelecionados}>
            Exportar
          </Button>
          <Button variant="ghost" size="sm" onClick={limparSelecao} className="ml-auto">
            Cancelar seleção
          </Button>
        </div>
      )}

      <InscritoSlideInConnected
        eventoId={eventoId}
        inscrito={selecionado}
        onClose={() => setSelecionado(null)}
      />

      {/* RN-397: um QR por vez, sob demanda — a tabela nunca renderiza QR. */}
      <QrIngressoModal inscrito={qrAberto} onClose={() => setQrAberto(null)} />
    </div>
  );
}

function ResumoPagamento({
  rotulo,
  valor,
  variant,
}: {
  rotulo: string;
  valor: number;
  variant: 'vitoria' | 'alerta' | 'vulcao';
}): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-4)] shadow-elev-1">
      <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">{rotulo}</span>
      <span className="flex items-center gap-[var(--spacing-2)]">
        <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          {valor}
        </span>
        <Badge variant={variant}>{rotulo}</Badge>
      </span>
    </div>
  );
}

InscritosView.displayName = 'InscritosView';
