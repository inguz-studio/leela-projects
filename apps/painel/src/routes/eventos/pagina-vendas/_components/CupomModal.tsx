// =============================================================================
// CupomModal — criar/editar um cupom simples (S300-T5 · E04). Cupom SEM afiliado.
// Campos: código (único no evento, imutável em edição), tipo (percentual|fixo),
// valor, teto de usos (opcional) e janela de validade (início/fim). 4 vias de
// fechamento (DS Modal: cancelar/X/overlay/Esc). Salvar → Toast.
//
// A validação é do KERNEL (`validarFormCupom` → core): regex de código,
// coerência tipo↔valor, unicidade por evento (contra os códigos carregados),
// janela. Nada de regra de cupom reinventada no componente. `usos` (∑ de
// Function/checkout — E12) é read-only: o modal nunca o edita nem o envia.
//
// DIVERGÊNCIA vs. brief/épico (registrada): o kernel S300-T1 modela a validade
// como JANELA OBRIGATÓRIA (`inicioEm` < `fimEm`), não como `validadeAte?`
// opcional; e o tipo é `percentual|fixo` (não `percentual|valor`). O modal
// segue o kernel (autoridade). Não há campo `tetoDesconto`: o teto de desconto
// é DERIVADO no core (`descontoDoCupom` nunca abate mais que o preço-base).
// =============================================================================

import * as React from 'react';
import { Button, Input, Modal, Radio, RadioGroup, useToast } from '@leela/design-system';
import type { Cupom, TipoCupom } from '@leela/core';
import {
  dateParaInputLocal,
  timestampParaInputLocal,
  validarFormCupom,
  type CampoCupom,
  type CupomFormValues,
  type CupomPayload,
} from '../_lib/cupomForm';

export interface CupomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cupom a editar; null = novo cupom. */
  cupom: Cupom | null;
  /** Códigos (docIds) já existentes no evento — unicidade na criação. */
  codigosExistentes: readonly string[];
  onSalvar: (cupomId: string, input: CupomPayload, criar: boolean) => Promise<void>;
  onSaved?: () => void;
}

interface ErroForm {
  campo: CampoCupom;
  msg: string;
}

/** Janela padrão de um cupom novo: agora → +30 dias (o kernel exige a janela). */
function valoresIniciais(): CupomFormValues {
  const agora = new Date();
  const em30dias = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    codigo: '',
    tipo: 'percentual',
    valor: '',
    tetoUso: '',
    inicioEm: dateParaInputLocal(agora),
    fimEm: dateParaInputLocal(em30dias),
  };
}

export function CupomModal({
  open,
  onOpenChange,
  cupom,
  codigosExistentes,
  onSalvar,
  onSaved,
}: CupomModalProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<CupomFormValues>(valoresIniciais);
  const [erro, setErro] = React.useState<ErroForm | null>(null);
  const [busy, setBusy] = React.useState(false);

  const editando = cupom !== null;

  // (Re)carrega o form ao abrir. Novo cupom parte da janela padrão (30 dias).
  React.useEffect(() => {
    if (!open) return;
    if (cupom) {
      setValues({
        codigo: cupom.codigo,
        tipo: cupom.tipo,
        valor:
          cupom.tipo === 'fixo' ? String(cupom.valor).replace('.', ',') : String(cupom.valor),
        tetoUso: cupom.tetoUso === null ? '' : String(cupom.tetoUso),
        inicioEm: timestampParaInputLocal(cupom.inicioEm),
        fimEm: timestampParaInputLocal(cupom.fimEm),
      });
    } else {
      setValues(valoresIniciais());
    }
    setErro(null);
  }, [open, cupom]);

  function set<K extends keyof CupomFormValues>(campo: K, valor: CupomFormValues[K]): void {
    setValues((prev) => ({ ...prev, [campo]: valor }));
  }

  async function salvar(): Promise<void> {
    const resultado = validarFormCupom({
      values,
      codigosExistentes,
      cupomEmEdicaoId: cupom?.id ?? null,
    });
    if (!resultado.ok) {
      setErro({ campo: resultado.campo, msg: resultado.erro });
      return;
    }
    setErro(null);
    setBusy(true);
    try {
      const criar = cupom === null;
      // docId = código normalizado (unicidade por chave — kernel).
      await onSalvar(resultado.input.codigo, resultado.input, criar);
      toast({ title: criar ? 'Cupom criado' : 'Cupom atualizado', variant: 'success' });
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: 'Falha ao salvar o cupom', variant: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  const percentual = values.tipo === 'percentual';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editando ? `Editar cupom ${cupom.codigo}` : 'Novo cupom'}
      description="Desconto simples aplicado no checkout. Sem vínculo com afiliado."
      footer={
        <div className="flex justify-end gap-[var(--spacing-3)]">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void salvar()} disabled={busy}>
            Salvar cupom
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <Input
            id="cupom-codigo"
            label="Código"
            value={values.codigo}
            onChange={(e) => set('codigo', e.target.value.toUpperCase())}
            placeholder="Ex.: CORRIDA10"
            maxLength={20}
            disabled={editando}
            {...(erro?.campo === 'codigo' ? { errorMessage: erro.msg } : {})}
          />
          {editando && (
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              O código não pode ser alterado depois de criado.
            </span>
          )}
        </div>

        <RadioGroup
          name="cupom-tipo"
          label="Tipo de desconto"
          orientation="horizontal"
          value={values.tipo}
          onValueChange={(v) => set('tipo', v as TipoCupom)}
        >
          <Radio value="percentual" label="Percentual (%)" />
          <Radio value="fixo" label="Valor fixo (R$)" />
        </RadioGroup>

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Input
            id="cupom-valor"
            label={percentual ? 'Desconto (%)' : 'Desconto (R$)'}
            type="text"
            inputMode="decimal"
            placeholder={percentual ? 'Ex.: 10' : 'Ex.: 50,00'}
            value={values.valor}
            onChange={(e) => set('valor', e.target.value)}
            {...(erro?.campo === 'valor' ? { errorMessage: erro.msg } : {})}
          />
          <Input
            id="cupom-teto-uso"
            label="Limite de usos (opcional)"
            type="number"
            min={1}
            placeholder="Vazio = ilimitado"
            value={values.tetoUso}
            onChange={(e) => set('tetoUso', e.target.value)}
            {...(erro?.campo === 'tetoUso' ? { errorMessage: erro.msg } : {})}
          />
        </div>

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Input
            id="cupom-inicio"
            label="Válido a partir de"
            type="datetime-local"
            value={values.inicioEm}
            onChange={(e) => set('inicioEm', e.target.value)}
          />
          <Input
            id="cupom-fim"
            label="Válido até"
            type="datetime-local"
            value={values.fimEm}
            onChange={(e) => set('fimEm', e.target.value)}
          />
        </div>
        {erro?.campo === 'janela' && (
          <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
            {erro.msg}
          </p>
        )}
      </div>
    </Modal>
  );
}

CupomModal.displayName = 'CupomModal';
