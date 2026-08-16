// =============================================================================
// PlanoFormModal — cria/edita um plano de cobrança nomeado (CB-T3).
// Presentational + controlado sobre o Modal base (§2.15): nome + taxa por método
// (cartão à vista / PIX) + mensalidade SaaS + tabela de taxas por parcela 2x-12x.
// Submit válido chama onSave(input) — o container decide o docId (id existente
// na edição; slug do nome na criação) e persiste via savePlanoCobranca.
//
// VALIDAÇÃO É DO CORE: validarPlanoCobranca (RN do modelo — chaves 2..12
// completas, taxas 0..100, mensalidade ≥ 0). NADA de regra de taxa reinventada
// aqui; a tela só coleta e delega. saasMonthlyFee=0 é VÁLIDO (RN-405).
// =============================================================================

import * as React from 'react';
import { Button, FieldGroup, Input, Modal } from '@leela/design-system';
import {
  CHAVES_TABELA_PARCELAS,
  PLANO_PADRAO,
  validarPlanoCobranca,
  type PlanoCobranca,
  type PlanoCobrancaInput,
  type TabelaTaxasParcela,
} from '@leela/core';

export interface PlanoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plano em edição; null = criar um novo. */
  plano: PlanoCobranca | null;
  saving: boolean;
  saveError: Error | null;
  onSave: (input: PlanoCobrancaInput) => void;
}

interface FormValues {
  nome: string;
  taxaCartaoAVista: string;
  taxaPix: string;
  saasMonthlyFee: string;
  tabela: Record<string, string>;
}

function toForm(plano: PlanoCobranca | null): FormValues {
  const src = plano ?? PLANO_PADRAO;
  const tabela: Record<string, string> = {};
  for (const chave of CHAVES_TABELA_PARCELAS) {
    tabela[chave] = String(src.tabelaTaxasParcela[chave] ?? 0);
  }
  return {
    nome: plano ? plano.nome : '',
    taxaCartaoAVista: String(src.taxaCartaoAVista),
    taxaPix: String(src.taxaPix),
    saasMonthlyFee: String(src.saasMonthlyFee),
    tabela,
  };
}

function toInput(v: FormValues): PlanoCobrancaInput {
  const tabelaTaxasParcela: TabelaTaxasParcela = {};
  for (const chave of CHAVES_TABELA_PARCELAS) {
    tabelaTaxasParcela[chave] = Number(v.tabela[chave] ?? 0);
  }
  return {
    nome: v.nome.trim(),
    taxaCartaoAVista: Number(v.taxaCartaoAVista),
    taxaPix: Number(v.taxaPix),
    saasMonthlyFee: Number(v.saasMonthlyFee),
    tabelaTaxasParcela,
  };
}

export function PlanoFormModal({
  open,
  onOpenChange,
  plano,
  saving,
  saveError,
  onSave,
}: PlanoFormModalProps): JSX.Element {
  const [values, setValues] = React.useState<FormValues>(() => toForm(plano));
  const [erros, setErros] = React.useState<string[]>([]);
  const [enviado, setEnviado] = React.useState(false);

  // Rehidrata o form a cada abertura, a partir do plano (edição) ou dos defaults
  // canônicos (criação). Nunca durante a operação.
  React.useEffect(() => {
    if (open) {
      setValues(toForm(plano));
      setErros([]);
      setEnviado(false);
    }
  }, [open, plano]);

  function set<K extends keyof Omit<FormValues, 'tabela'>>(campo: K, valor: string) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function setTabela(chave: string, valor: string) {
    setValues((v) => ({ ...v, tabela: { ...v.tabela, [chave]: valor } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviado(true);
    const input = toInput(values);
    const validationErrors = validarPlanoCobranca(input);
    setErros(validationErrors);
    if (validationErrors.length > 0) return;
    onSave(input);
  }

  const editando = plano !== null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editando ? 'Editar plano de cobrança' : 'Novo plano de cobrança'}
      description="Modelo nomeado de taxa e mensalidade. Aplicar este plano a um organizador estampa estes valores nos termos dele."
      size="lg"
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="plano-form" variant="primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar plano'}
          </Button>
        </>
      }
    >
      <form id="plano-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-5)]">
        <Input
          id="plano-nome"
          label="Nome do plano"
          value={values.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Promoção agressiva"
        />

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
          <Input
            id="plano-cartao"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            max={100}
            label="Cartão à vista (%)"
            value={values.taxaCartaoAVista}
            onChange={(e) => set('taxaCartaoAVista', e.target.value)}
          />
          <Input
            id="plano-pix"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            max={100}
            label="PIX (%)"
            value={values.taxaPix}
            onChange={(e) => set('taxaPix', e.target.value)}
          />
          <Input
            id="plano-mensalidade"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            label="Mensalidade SaaS (R$)"
            value={values.saasMonthlyFee}
            onChange={(e) => set('saasMonthlyFee', e.target.value)}
          />
        </div>

        <FieldGroup legend="Taxa por parcela (%)">
          <div className="grid grid-cols-3 gap-[var(--spacing-3)] sm:grid-cols-4 md:grid-cols-6">
            {CHAVES_TABELA_PARCELAS.map((chave) => (
              <Input
                key={chave}
                id={`plano-parcela-${chave}`}
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={100}
                label={`${chave}x`}
                value={values.tabela[chave] ?? ''}
                onChange={(e) => setTabela(chave, e.target.value)}
              />
            ))}
          </div>
        </FieldGroup>

        {enviado && erros.length > 0 && (
          <ul role="alert" className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        {saveError && (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
          >
            Não foi possível salvar o plano. Verifique os dados e tente novamente.
          </div>
        )}
      </form>
    </Modal>
  );
}

PlanoFormModal.displayName = 'PlanoFormModal';
