// =============================================================================
// LoteModal — criar/editar um lote DENTRO de uma modalidade (S300-T4 · ADR-012).
// A modalidade é contexto (não se escolhe aqui — o lote pertence à modalidade do
// grupo); campos: nome, ordem, janela (inicioEm/fimEm via datetime-local), vaga
// e PREÇO (money-config). 4 vias de fechamento (DS Modal). Salvar → Toast.
//
// MONEY-CONFIG (o que a Fable-review checa): quando o lote já vendeu
// (`vendidos > 0`), preço, janela e ordem ficam DESABILITADOS — espelho do
// congelamento da Rule. A VAGA tem porta autorizada (RN-304, `ajustarCapacidade`
// com motivo na auditoria) e ganha um atalho daqui. A validação é do KERNEL
// (validarFormLote → core); nada de regra de preço/lote reinventada aqui.
//
// BUILD-LOTES-UX (dono, 2026-08-04) — três mudanças de comportamento:
//   A. o erro acende NO CAMPO pendente. Antes, `validarFormLote` devolvia uma
//      string e ela era pendurada no input de preço (o último do formulário):
//      vaga vazia acusava "Preço da inscrição". Agora cada pendência tem
//      endereço, todas aparecem juntas, e o foco vai para a primeira.
//   D. o formulário mostra OS LOTES QUE JÁ EXISTEM na modalidade enquanto se
//      cadastra mais um, com vendidos · disponíveis · total configurado por
//      lote. A linha do lote em edição acompanha o total DIGITADO — trocar 50
//      por 20 com 19 vendidos mostra 1 disponível na hora, não 31.
//   C. lote com venda ganha o atalho para o ajuste de capacidade, em vez de um
//      campo cinza sem explicação.
// =============================================================================

import * as React from 'react';
import { Badge, Button, Input, Modal, useToast } from '@leela/design-system';
import { DateTimeField } from '@/components/fields/DateTimeField';
import type { CapacidadeLote, Lote } from '@leela/core';
import { formatDataHoraCurta, formatDinheiro, formatInt } from '../_lib/format';
import {
  MSG_LOTE_VENDIDO,
  capacidadePrevista,
  erroDoCampo,
  estadoLoteBadge,
  loteImutavel,
  mensagemErroServidor,
  novoLoteId,
  proximaOrdem,
  timestampParaInputLocal,
  validarFormLote,
  type LoteFormValues,
  type LotePayload,
  type ResultadoValidacao,
} from './_lib/loteForm';

export interface LoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Modalidade dona do lote (contexto do grupo — ADR-012). */
  modalidade: string;
  /** Lote a editar; null = novo lote na modalidade. */
  lote: Lote | null;
  /** Todos os lotes do evento (para validar sobreposição na modalidade). */
  lotesDoEvento: readonly Lote[];
  onSalvar: (loteId: string, input: LotePayload, criar: boolean) => Promise<void>;
  onSaved?: () => void;
  /**
   * Abre o ajuste de capacidade do lote (RN-304) — a ÚNICA porta de escrita de
   * vaga em lote com venda. Sem o callback o atalho não aparece.
   */
  onAjustarCapacidade?: (lote: Lote) => void;
  /** Instante de referência (default `new Date()`) — injetável para teste. */
  agora?: Date;
}

const VALORES_VAZIOS: LoteFormValues = {
  nome: '',
  ordem: '',
  inicioEm: '',
  fimEm: '',
  quantidadeLimite: '',
  preco: '',
};

/** id do controle de cada campo — usado para acender o erro e mover o foco. */
const ID_DO_CAMPO = {
  nome: 'lote-nome',
  ordem: 'lote-ordem',
  quantidadeLimite: 'lote-quantidade',
  inicioEm: 'lote-inicio',
  fimEm: 'lote-fim',
  preco: 'lote-preco',
} as const;

export function LoteModal({
  open,
  onOpenChange,
  modalidade,
  lote,
  lotesDoEvento,
  onSalvar,
  onSaved,
  onAjustarCapacidade,
  agora = new Date(),
}: LoteModalProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<LoteFormValues>(VALORES_VAZIOS);
  const [resultado, setResultado] = React.useState<ResultadoValidacao | null>(null);
  const [busy, setBusy] = React.useState(false);

  const congelado = lote !== null && loteImutavel(lote);

  // (Re)carrega o form ao abrir. Novo lote sugere a próxima ordem da modalidade.
  React.useEffect(() => {
    if (!open) return;
    if (lote) {
      setValues({
        nome: lote.nome,
        ordem: String(lote.ordem),
        inicioEm: timestampParaInputLocal(lote.inicioEm),
        fimEm: timestampParaInputLocal(lote.fimEm),
        quantidadeLimite: String(lote.quantidadeLimite),
        preco: String(lote.preco).replace('.', ','),
      });
    } else {
      const daModalidade = lotesDoEvento.filter((l) => l.modalidade === modalidade);
      setValues({ ...VALORES_VAZIOS, ordem: String(proximaOrdem(daModalidade)) });
    }
    setResultado(null);
  }, [open, lote, modalidade, lotesDoEvento]);

  function set<K extends keyof LoteFormValues>(campo: K, valor: string): void {
    setValues((prev) => ({ ...prev, [campo]: valor }));
  }

  /** Mensagem do campo (null quando ele está ok). */
  function erro(campo: keyof typeof ID_DO_CAMPO): string | null {
    return resultado ? erroDoCampo(resultado, campo) : null;
  }

  const erroDeFormulario = resultado ? erroDoCampo(resultado, 'formulario') : null;

  async function salvar(): Promise<void> {
    // `congelado` → validarFormLote devolve payload SÓ-NOME (review S300-T4
    // #1): os campos comerciais nunca tocam o wire de um lote vendido.
    const veredito = validarFormLote({
      values,
      modalidade,
      loteId: lote?.id ?? null,
      lotesDoEvento,
      congelado,
    });
    setResultado(veredito);
    if (!veredito.ok) {
      // Foco no PRIMEIRO campo pendente (a lista já vem em ordem visual). Sem
      // isto, num formulário com dois campos vazios o organizador tem de caçar
      // qual deles acendeu. Campo de data é composto (DatePicker + hora), então
      // o alvo é o id do controle, não uma ref de input.
      const primeiro = veredito.erros[0];
      if (primeiro && primeiro.campo !== 'formulario') {
        const alvo = document.getElementById(ID_DO_CAMPO[primeiro.campo]);
        alvo?.focus();
      }
      return;
    }
    setBusy(true);
    try {
      const criar = lote === null;
      // Criação nunca é congelada (lote === null ⇒ congelado false), então o
      // payload de create é sempre o completo — o guard é só narrowing de tipo.
      const loteId =
        lote?.id ??
        novoLoteId(modalidade, 'ordem' in veredito.input ? veredito.input.ordem : 1);
      await onSalvar(loteId, veredito.input, criar);
      toast({ title: criar ? 'Lote criado' : 'Lote atualizado', variant: 'success' });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      // REV-LOTES · achado #2: o erro do SERVIDOR também precisa de endereço.
      // Antes o `catch` era cego (`catch {}`) e a causa morria aqui — o modal
      // ficava aberto com todos os campos verdes e um toast que não dizia nada.
      // Agora a recusa vira uma mensagem de FORMULÁRIO (não de campo: a Rule
      // reprova o documento, não um input), e o modal segue aberto com o texto
      // à vista depois que o toast some.
      const mensagem = mensagemErroServidor(e);
      setResultado({ ok: false, erros: [{ campo: 'formulario', mensagem }], erro: mensagem });
      toast({ title: 'Falha ao salvar o lote', description: mensagem, variant: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  const daModalidade = lotesDoEvento
    .filter((l) => l.modalidade === modalidade)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={lote ? `Editar ${lote.nome}` : `Novo lote · ${modalidade}`}
      description={`Modalidade ${modalidade} · lote-por-modalidade (ADR-012)`}
      footer={
        <div className="flex justify-end gap-[var(--spacing-3)]">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void salvar()} disabled={busy}>
            Salvar lote
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        {congelado && (
          <p
            role="note"
            className="rounded-[var(--radius-md)] border-l-2 border-[var(--feedback-warning-fg)] bg-[var(--surface-high)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]"
          >
            {MSG_LOTE_VENDIDO}
          </p>
        )}

        <Input
          id={ID_DO_CAMPO.nome}
          label="Nome do lote"
          value={values.nome}
          onChange={(e) => set('nome', e.target.value)}
          {...(erro('nome') ? { errorMessage: erro('nome') as string } : {})}
        />

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Input
            id={ID_DO_CAMPO.ordem}
            label="Ordem na modalidade"
            type="number"
            min={1}
            value={values.ordem}
            onChange={(e) => set('ordem', e.target.value)}
            disabled={congelado}
            {...(erro('ordem') ? { errorMessage: erro('ordem') as string } : {})}
          />
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <Input
              id={ID_DO_CAMPO.quantidadeLimite}
              label="Vaga (quantidade limite)"
              type="number"
              min={1}
              value={values.quantidadeLimite}
              onChange={(e) => set('quantidadeLimite', e.target.value)}
              disabled={congelado}
              {...(erro('quantidadeLimite')
                ? { errorMessage: erro('quantidadeLimite') as string }
                : {})}
            />
            {congelado && lote && onAjustarCapacidade && (
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => onAjustarCapacidade(lote)}
              >
                Ajustar capacidade
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <DateTimeField
            id={ID_DO_CAMPO.inicioEm}
            label="Início da venda"
            value={values.inicioEm}
            onChange={(inicioEm) => set('inicioEm', inicioEm)}
            disabled={congelado}
            {...(erro('inicioEm') ? { errorMessage: erro('inicioEm') as string } : {})}
          />
          <DateTimeField
            id={ID_DO_CAMPO.fimEm}
            label="Fim da venda"
            value={values.fimEm}
            onChange={(fimEm) => set('fimEm', fimEm)}
            disabled={congelado}
            {...(erro('fimEm') ? { errorMessage: erro('fimEm') as string } : {})}
          />
        </div>

        <Input
          id={ID_DO_CAMPO.preco}
          label={`Preço da inscrição em ${modalidade} (R$)`}
          type="text"
          inputMode="decimal"
          placeholder="Ex.: 99,90"
          value={values.preco}
          onChange={(e) => set('preco', e.target.value)}
          disabled={congelado}
          {...(erro('preco') ? { errorMessage: erro('preco') as string } : {})}
        />

        {erroDeFormulario && (
          <p
            role="alert"
            className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]"
          >
            {erroDeFormulario}
          </p>
        )}

        <LotesDaModalidade
          modalidade={modalidade}
          lotes={daModalidade}
          loteEmEdicao={lote}
          totalDigitado={values.quantidadeLimite}
          agora={agora}
        />
      </div>
    </Modal>
  );
}

LoteModal.displayName = 'LoteModal';

// ---------------------------------------------------------------------------
// Painel dos lotes já existentes na modalidade (frente D)
// ---------------------------------------------------------------------------

interface LotesDaModalidadeProps {
  modalidade: string;
  /** Lotes da modalidade, já ordenados por `ordem`. */
  lotes: readonly Lote[];
  /** Lote sendo editado (null = criando) — a linha dele reflete o que se digita. */
  loteEmEdicao: Lote | null;
  /** Total de vagas digitado agora no formulário. */
  totalDigitado: string;
  agora: Date;
}

/**
 * Lotes que já existem na modalidade, com a contagem de vagas por lote. Fica
 * DENTRO do formulário porque a pergunta "quanto ainda tem em pé nos outros?"
 * nasce exatamente quando se está cadastrando o próximo — e o modal tapava a
 * tabela que respondia isso.
 */
function LotesDaModalidade({
  modalidade,
  lotes,
  loteEmEdicao,
  totalDigitado,
  agora,
}: LotesDaModalidadeProps): JSX.Element | null {
  if (lotes.length === 0) return null;

  return (
    <section
      aria-label={`Lotes já configurados em ${modalidade}`}
      className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-[var(--spacing-3)]"
    >
      <h4 className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Lotes já configurados em {modalidade}
      </h4>
      <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
        {lotes.map((l) => {
          const emEdicao = loteEmEdicao?.id === l.id;
          // A linha do lote em edição usa o total DIGITADO; as outras usam o
          // que está gravado. É o que torna visível, ainda no formulário, que
          // baixar o total baixa o disponível — não o contrário.
          const capacidade = emEdicao
            ? capacidadePrevista(l, totalDigitado)
            : capacidadePrevista(l, String(l.quantidadeLimite));
          const badge = estadoLoteBadge(l, lotes, agora);
          return (
            <li
              key={l.id}
              aria-label={`Lote ${l.nome}`}
              className="flex flex-wrap items-center justify-between gap-[var(--spacing-2)] rounded-[var(--radius-sm)] bg-[var(--surface-raised)] px-[var(--spacing-3)] py-[var(--spacing-2)]"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                  L{l.ordem} · {l.nome}
                  {emEdicao ? ' (em edição)' : ''}
                </span>
                <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
                  {formatDataHoraCurta(l.inicioEm)} → {formatDataHoraCurta(l.fimEm)} ·{' '}
                  {formatDinheiro(l.preco)}
                </span>
              </div>
              <div className="flex items-center gap-[var(--spacing-3)]">
                <ContagemVagas capacidade={capacidade} />
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Os três números da vaga, sempre juntos e sempre nesta ordem (aceite RN-304):
 * vendidos, disponíveis, total configurado. Separá-los deixaria "disponível"
 * flutuando sem o total que o explica.
 */
export function ContagemVagas({ capacidade }: { capacidade: CapacidadeLote }): JSX.Element {
  return (
    <span className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-xs)] [font-variant-numeric:tabular-nums]">
      <span className="text-[var(--text-secondary)]">
        {formatInt(capacidade.vendido)} vendidos
      </span>
      <span aria-hidden className="text-[var(--text-tertiary)]">
        ·
      </span>
      <span className="font-[var(--font-weight-semibold)] text-[var(--text-success)]">
        {formatInt(capacidade.disponivel)} disponíveis
      </span>
      <span aria-hidden className="text-[var(--text-tertiary)]">
        ·
      </span>
      <span className="text-[var(--text-secondary)]">
        {formatInt(capacidade.configurado)} no total
      </span>
    </span>
  );
}
