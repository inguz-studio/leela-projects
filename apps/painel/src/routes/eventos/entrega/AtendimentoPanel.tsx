// =============================================================================
// AtendimentoPanel — coluna esquerda (60%) do balcão (S204-T1): busca do
// atleta, Stepper de 3 passos (entregar kit → vincular chip → check-in) e
// ações por passo. Retirar o kit já registra presença (RN-205). Passo de chip
// suprimido quando usaChip=false (RN-207). Conflito de chip abre ConfirmModal
// de sobrescrita (§2.15 · RN-206). Escrita SEMPRE via Function (injetada).
//
// CRED-BUSCA (17/08): a busca casa CPF além de nome e códigos, a linha de
// resultado mostra a modalidade (homônimo desempatado antes do clique) e o
// cabeçalho de três campos virou `CardConferenciaConnected` — o dono achou EM
// USO que quem credencia não via lote, kit incluso, tamanho nem contato de
// compra da pessoa parada na frente dele.
// =============================================================================

import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  Input,
  SearchInput,
  Stepper,
  useToast,
} from '@leela/design-system';
import type { Evento, Inscrito, ItemKit, Kit } from '@leela/core';
import { chipVinculado, presencaRegistrada } from '@leela/core';
import type { VincularChipResult, RegistrarEntregaResult } from '@leela/api-client';
import { filtrarInscritos } from '../_lib/inscritosFiltro';
import { kitInscritoBadge } from '../_lib/kitLabels';
import { itensDoKit, passoAtual, passosStepper } from '../_lib/balcao';
import { rotuloSufixo } from '../_lib/gradeTamanhos';
import { CardConferenciaConnected } from './CardConferenciaConnected';

export interface AtendimentoPanelProps {
  evento: Evento;
  /** Pool de inscritos para a busca por nome, código ou CPF. */
  inscritos: Inscrito[];
  /** Catálogo de itens do evento — compõe o checklist do kit (S205 · RN-215). */
  itensKit: ItemKit[];
  /** Kits do evento — o card de conferência lê "o que está incluso" daqui. */
  kits: Kit[];
  onVincular: (
    inscritoId: string,
    chip: string,
    sobrescrever?: boolean,
  ) => Promise<VincularChipResult>;
  onRegistrar: (inscritoId: string) => Promise<RegistrarEntregaResult>;
  /** Notifica o painel operacional que um atleta foi atendido. */
  onAtendido?: (nome: string) => void;
}

export function AtendimentoPanel({
  evento,
  inscritos,
  itensKit,
  kits,
  onVincular,
  onRegistrar,
  onAtendido,
}: AtendimentoPanelProps): JSX.Element {
  const { toast } = useToast();
  const [busca, setBusca] = React.useState('');
  const [atual, setAtual] = React.useState<Inscrito | null>(null);
  const [chipInput, setChipInput] = React.useState('');
  const [conflito, setConflito] = React.useState<{ atletaNome: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  // V2708-13: permite ao operador voltar ao passo de chip depois do chip
  // já estar vinculado (e.g., corrigir antes de fechar o atendimento).
  const [overrideChipStep, setOverrideChipStep] = React.useState(false);

  // Atalhos do balcão (barra ⌘K/Esc): ⌘K/Ctrl+K foca a busca; Esc limpa o
  // atendimento em curso (nunca com o modal de conflito aberto — ele tem o
  // próprio Esc). Teclas de fila = velocidade no dia (design-principles · L-005).
  React.useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        document
          .querySelector<HTMLInputElement>('input[aria-label="Buscar atleta"]')
          ?.focus();
        return;
      }
      if (e.key === 'Escape' && conflito === null && atual !== null) {
        setAtual(null);
        setChipInput('');
        setConflito(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [conflito, atual]);

  const resultados = busca.trim()
    ? filtrarInscritos(inscritos, { busca }).slice(0, 6)
    : [];

  function selecionar(inscrito: Inscrito): void {
    setAtual(inscrito);
    setBusca('');
    setChipInput(inscrito.chipNumero ?? '');
    setOverrideChipStep(false);
  }

  function reset(): void {
    setAtual(null);
    setChipInput('');
    setConflito(null);
    setOverrideChipStep(false);
  }

  async function aplicarVinculo(sobrescrever: boolean): Promise<void> {
    if (!atual) return;
    setBusy(true);
    try {
      const res = await onVincular(atual.id, chipInput, sobrescrever);
      if (res.ok) {
        setAtual({ ...atual, chipNumero: res.chip });
        setConflito(null);
        toast({ title: 'Chip vinculado', variant: 'success' });
      } else {
        setConflito({ atletaNome: res.conflito.atletaNome });
      }
    } catch {
      toast({ title: 'Falha ao vincular chip', variant: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  async function fechar(): Promise<void> {
    if (!atual) return;
    setBusy(true);
    try {
      await onRegistrar(atual.id);
      // Espelho otimista dos carimbos que a Function grava (RN-205): presença
      // sempre; kitEntregueEm só quando havia kit a retirar (sem_kit não seta).
      const fechado: Inscrito = { ...atual, checkinEm: atual.criadoEm };
      if (atual.kit !== 'sem_kit') fechado.kitEntregueEm = atual.criadoEm;
      setAtual(fechado);
      onAtendido?.(atual.atletaNome);
      toast({ title: 'Presença registrada', variant: 'success' });
    } catch {
      toast({ title: 'Falha ao fechar atendimento', variant: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  // ── Sem atleta identificado (estado vazio inline) ──────────────────────────
  if (!atual) {
    return (
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <BuscaAtleta
          busca={busca}
          onBusca={setBusca}
          resultados={resultados}
          onSelecionar={selecionar}
        />
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Busque um atleta pelo nome para iniciar o atendimento.
        </p>
      </div>
    );
  }

  const passos = passosStepper(atual.kit, evento.usaChip);
  const current = passoAtual(
    passos.map((p) => p.id),
    atual,
    evento.usaChip,
  );
  const concluido = presencaRegistrada(atual);
  const kit = kitInscritoBadge(atual.kit);
  // V2708-13: passo efetivo considera o override — permite ao operador voltar
  // ao chip sem perder o número digitado (preserva chipInput).
  const chipIdx = passos.findIndex((p) => p.id === 'chip');
  const effectiveCurrent = overrideChipStep && chipIdx >= 0
    ? chipIdx
    : (concluido ? passos.length : current);
  const passoId = overrideChipStep && chipIdx >= 0
    ? 'chip'
    : passos[current]?.id;
  const itens = itensDoKit(itensKit, atual.kit);

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <BuscaAtleta
        busca={busca}
        onBusca={setBusca}
        resultados={resultados}
        onSelecionar={selecionar}
      />

      {/* V2708-13: "Cancelar atendimento" é o voltar principal — limpa o
          inscrito atual e volta para a busca sem perder o pool em memória. */}
      <div className="flex items-center justify-between gap-[var(--spacing-3)]">
        <Button variant="ghost" size="sm" onClick={reset}>
          ← Cancelar atendimento
        </Button>
      </div>

      {/* O card de conferência ocupa o lugar do cabeçalho antigo (nome +
          modalidade + selo): ele já carrega os três e mais o que faltava para
          o operador conferir quem está na frente dele. */}
      <CardConferenciaConnected eventoId={evento.id} inscrito={atual} kits={kits} />

      {/* QA m3: conclusão REAL por passo — a escrita do kit acontece no
          fechamento (RN-205), então o ✓ segue os carimbos do inscrito, nunca
          a posição do passo atual. Operador não lê "kit entregue" p/ pendente.
          V2708-13: effectiveCurrent espelha o override de chip. */}
      <Stepper
        steps={passos}
        current={effectiveCurrent}
        completed={passos.map((p) =>
          p.id === 'kit'
            ? Boolean(atual.kitEntregueEm)
            : p.id === 'chip'
              ? chipVinculado(atual)
              : presencaRegistrada(atual),
        )}
        aria-label="Passos do atendimento"
      />

      {/* V2708-14: mostra checklist quando há itens OU quando o inscrito já
          tem tamanho registrado — o operador vê o tamanho certo mesmo quando
          o catálogo itensKit não está disponível para o papel de evento. */}
      {!concluido && atual.kit !== 'sem_kit' &&
        (itens.length > 0 || Object.keys(atual.tamanhos).length > 0) && (
        <ChecklistKit itens={itens} kitLabel={kit.label} tamanhos={atual.tamanhos} />
      )}

      {concluido ? (
        <div className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--radius-md)] bg-[var(--feedback-success-surface)] p-[var(--spacing-4)]">
          <p className="text-[length:var(--font-size-base)] text-[var(--feedback-success-fg)]">
            Atendimento concluído — presença registrada.
          </p>
          <Button variant="secondary" onClick={reset}>
            Novo atendimento
          </Button>
        </div>
      ) : passoId === 'chip' ? (
        <div className="flex flex-col gap-[var(--spacing-3)]">
          <Input
            label="Número do chip"
            aria-label="Número do chip"
            placeholder="Digite ou leia o chip"
            value={chipInput}
            onChange={(e) => setChipInput(e.target.value)}
          />
          <Button
            variant="primary"
            disabled={busy || chipInput.trim().length === 0}
            onClick={() => { setOverrideChipStep(false); void aplicarVinculo(false); }}
          >
            {overrideChipStep ? 'Atualizar chip' : 'Vincular chip'}
          </Button>
          {/* V2708-13: quando override ativo, "Cancelar" restaura o passo normal */}
          {overrideChipStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setChipInput(atual.chipNumero ?? ''); setOverrideChipStep(false); }}
            >
              ← Manter chip atual
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-3)]">
          <Button variant="primary" disabled={busy} onClick={() => void fechar()}>
            {atual.kit === 'sem_kit'
              ? 'Registrar presença'
              : 'Entregar kit e registrar presença'}
          </Button>
          {/* V2708-13: operador pode voltar ao passo de chip para corrigir antes
              do fechamento — chipInput é preservado (estado local intacto). */}
          {evento.usaChip && chipVinculado(atual) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOverrideChipStep(true)}
            >
              ← Alterar chip
            </Button>
          )}
        </div>
      )}

      <ConfirmModal
        open={conflito !== null}
        onOpenChange={(o) => !o && setConflito(null)}
        title="Chip já vinculado a outro atleta"
        description="Este chip está em uso. Confirme a sobrescrita para reatribuí-lo (RN-206)."
        target={conflito ? <strong>{conflito.atletaNome}</strong> : undefined}
        loses={conflito ? [`${conflito.atletaNome} perde o chip ${chipInput}`] : []}
        keeps={[`${atual.atletaNome} passa a usar o chip ${chipInput}`]}
        confirmLabel="Sobrescrever chip"
        loading={busy}
        onConfirm={() => void aplicarVinculo(true)}
      />
    </div>
  );
}

function BuscaAtleta({
  busca,
  onBusca,
  resultados,
  onSelecionar,
}: {
  busca: string;
  onBusca: (v: string) => void;
  resultados: Inscrito[];
  onSelecionar: (i: Inscrito) => void;
}): JSX.Element {
  return (
    <div className="relative flex flex-col gap-[var(--spacing-2)]">
      <SearchInput
        aria-label="Buscar atleta"
        // O placeholder anterior prometia "dorsal", que a busca nunca casou, e
        // calava as três chaves que ela casa de verdade. Quem opera o balcão
        // precisa SABER que pode digitar o CPF — capacidade que ninguém
        // descobre por tentativa com a fila andando.
        placeholder="Nome, CPF ou código"
        value={busca}
        onChange={(e) => onBusca(e.target.value)}
        shortcutLabel={null}
        className="w-full"
      />
      {resultados.length > 0 && (
        <ul className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-2)] shadow-[var(--elevation-2)]">
          {resultados.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => onSelecionar(i)}
                className="flex w-full flex-col gap-[var(--spacing-1)] rounded-[var(--radius-sm)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-left hover:bg-[var(--action-ghost-hover)]"
              >
                <span className="text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
                  {i.atletaNome}
                </span>
                {/* A modalidade desempata homônimo ANTES do clique. Fila de
                    balcão tem Marina Silva no 5k e Marina Silva no 21k, e o
                    operador só descobria a troca depois de abrir a ficha. */}
                {i.modalidade && (
                  <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
                    {i.modalidade}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Checklist de conferência do kit — os itens REAIS que compõem o kit do atleta
 * (catálogo `itensKit` do evento, RN-215). Auxílio visual do operador: confira
 * e entregue. Não persiste marcação (a escrita da entrega é RN-205 no fechar).
 */
function ChecklistKit({
  itens,
  kitLabel,
  tamanhos,
}: {
  itens: ItemKit[];
  kitLabel: string;
  /** Escolhas do inscrito (`tamanhos[itemId]` = sufixo de SKU — RN-223/231). */
  tamanhos: Record<string, string>;
}): JSX.Element {
  // V2708-14: quando o operador não tem papel de tenant (itensKit=[]), mas o
  // inscrito já tem tamanho registrado no checkout, exibe o resumo de tamanhos
  // em lugar do checklist completo — o mínimo necessário para a entrega física.
  const tamanhoEntradas = Object.entries(tamanhos);
  if (itens.length === 0 && tamanhoEntradas.length > 0) {
    return (
      <Card
        as="section"
        aria-label={`Tamanhos para entrega · ${kitLabel}`}
        className="flex flex-col gap-[var(--spacing-2)] p-[var(--spacing-4)]"
      >
        <h4 className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
          Tamanho para entrega · {kitLabel}
        </h4>
        <div className="flex flex-wrap gap-[var(--spacing-2)]">
          {tamanhoEntradas.map(([itemId, sufixo]) => (
            <Badge key={itemId} variant="neutro">
              {rotuloSufixo(sufixo)}
            </Badge>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <section
      aria-label={`Itens do ${kitLabel}`}
      className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-[var(--spacing-4)]"
    >
      <h4 className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        Conferir e entregar · {kitLabel}
      </h4>
      <ul className="flex flex-col gap-[var(--spacing-2)]">
        {itens.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-[var(--spacing-2)] rounded-[var(--radius-sm)] bg-[var(--surface-base)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-[length:var(--font-size-sm)]"
          >
            <span
              aria-hidden="true"
              className="h-[var(--spacing-3)] w-[var(--spacing-3)] shrink-0 rounded-[var(--radius-sm)] border-[length:var(--card-critical-border)] border-[var(--border-strong)]"
            />
            <span className="flex-1 text-[var(--text-primary)]">
              {item.nome}
              {/* RN-231: mostra o corte+tamanho ESCOLHIDOS pelo atleta (entrega
                  por corte×tamanho); sem escolha registrada, conferir à mão. */}
              {item.tamanhado &&
                (tamanhos[item.id] !== undefined ? (
                  <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                    {' '}· {rotuloSufixo(tamanhos[item.id]!)}
                  </span>
                ) : (
                  <span className="text-[var(--text-tertiary)]"> · tamanho a conferir</span>
                ))}
            </span>
            {item.origem === 'patrocinador' && item.marca && (
              <Badge variant="neutro">{item.marca}</Badge>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

AtendimentoPanel.displayName = 'AtendimentoPanel';
