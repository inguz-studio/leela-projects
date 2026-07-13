// =============================================================================
// LoteModal — criar/editar um lote DENTRO de uma modalidade (S300-T4 · ADR-012).
// A modalidade é contexto (não se escolhe aqui — o lote pertence à modalidade do
// grupo); campos: nome, ordem, janela (inicioEm/fimEm via datetime-local), vaga
// e PREÇO (money-config). 4 vias de fechamento (DS Modal). Salvar → Toast.
//
// MONEY-CONFIG (o que a Fable-review checa): quando o lote já vendeu
// (`vendidos > 0`), os campos comerciais (preço, janela, vaga, ordem) ficam
// DESABILITADOS — espelho do congelamento da Rule (RN-200/300). O nome segue
// editável. A validação é do KERNEL (validarFormLote → core); nada de regra de
// preço/lote reinventada no componente.
// =============================================================================

import * as React from 'react';
import { Button, Input, Modal, useToast } from '@leela/design-system';
import type { Lote } from '@leela/core';
import {
  MSG_LOTE_VENDIDO,
  loteImutavel,
  novoLoteId,
  proximaOrdem,
  timestampParaInputLocal,
  validarFormLote,
  type LoteFormValues,
  type LotePayload,
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
}

const VALORES_VAZIOS: LoteFormValues = {
  nome: '',
  ordem: '',
  inicioEm: '',
  fimEm: '',
  quantidadeLimite: '',
  preco: '',
};

export function LoteModal({
  open,
  onOpenChange,
  modalidade,
  lote,
  lotesDoEvento,
  onSalvar,
  onSaved,
}: LoteModalProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<LoteFormValues>(VALORES_VAZIOS);
  const [erro, setErro] = React.useState<string | null>(null);
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
    setErro(null);
  }, [open, lote, modalidade, lotesDoEvento]);

  function set<K extends keyof LoteFormValues>(campo: K, valor: string): void {
    setValues((prev) => ({ ...prev, [campo]: valor }));
  }

  async function salvar(): Promise<void> {
    // `congelado` → validarFormLote devolve payload SÓ-NOME (review S300-T4
    // #1): os campos comerciais nunca tocam o wire de um lote vendido.
    const resultado = validarFormLote({
      values,
      modalidade,
      loteId: lote?.id ?? null,
      lotesDoEvento,
      congelado,
    });
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    setBusy(true);
    try {
      const criar = lote === null;
      // Criação nunca é congelada (lote === null ⇒ congelado false), então o
      // payload de create é sempre o completo — o guard é só narrowing de tipo.
      const loteId =
        lote?.id ??
        novoLoteId(modalidade, 'ordem' in resultado.input ? resultado.input.ordem : 1);
      await onSalvar(loteId, resultado.input, criar);
      toast({ title: criar ? 'Lote criado' : 'Lote atualizado', variant: 'success' });
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: 'Falha ao salvar o lote', variant: 'danger' });
    } finally {
      setBusy(false);
    }
  }

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
          id="lote-nome"
          label="Nome do lote"
          value={values.nome}
          onChange={(e) => set('nome', e.target.value)}
        />

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Input
            id="lote-ordem"
            label="Ordem na modalidade"
            type="number"
            min={1}
            value={values.ordem}
            onChange={(e) => set('ordem', e.target.value)}
            disabled={congelado}
          />
          <Input
            id="lote-quantidade"
            label="Vaga (quantidade limite)"
            type="number"
            min={1}
            value={values.quantidadeLimite}
            onChange={(e) => set('quantidadeLimite', e.target.value)}
            disabled={congelado}
          />
        </div>

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Input
            id="lote-inicio"
            label="Início da venda"
            type="datetime-local"
            value={values.inicioEm}
            onChange={(e) => set('inicioEm', e.target.value)}
            disabled={congelado}
          />
          <Input
            id="lote-fim"
            label="Fim da venda"
            type="datetime-local"
            value={values.fimEm}
            onChange={(e) => set('fimEm', e.target.value)}
            disabled={congelado}
          />
        </div>

        <Input
          id="lote-preco"
          label={`Preço da inscrição em ${modalidade} (R$)`}
          type="text"
          inputMode="decimal"
          placeholder="Ex.: 99,90"
          value={values.preco}
          onChange={(e) => set('preco', e.target.value)}
          disabled={congelado}
          {...(erro ? { errorMessage: erro } : {})}
        />
        {erro && (
          <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
            {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}

LoteModal.displayName = 'LoteModal';
