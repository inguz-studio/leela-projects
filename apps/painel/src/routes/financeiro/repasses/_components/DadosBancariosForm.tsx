// =============================================================================
// DadosBancariosForm — cadastro/edição dos dados bancários (E09s-L3-T2).
// Presentational + controlado internamente (campos locais + validação pura).
// Submit válido chama onSubmit(input); a cifra + máscara acontecem NO SERVIDOR
// (RN-354) — o número em claro trafega só no callable e nunca volta ao cliente.
//
// Editar reusa este MESMO form (aceite T2). Como o número salvo é mascarado, a
// edição prefilla apenas os campos não-sensíveis (banco/agência/tipo/titular —
// guardados em claro) e pede reentrada de conta/CPF-CNPJ/PIX (nunca tivemos o
// valor em claro no cliente). Estados §2.12; §2.16 (Input/Select = exceção flat).
// =============================================================================

import * as React from 'react';
import { Button, Input, Select } from '@leela/design-system';
import type { SaveDadosBancariosInput } from '@leela/api-client';
import {
  DADOS_BANCARIOS_INICIAIS,
  toSaveDadosBancariosInput,
  validarDadosBancarios,
  type DadosBancariosFormValues,
} from '../_lib/dadosBancariosForm';

export interface DadosBancariosFormProps {
  /** Prefill dos campos não-sensíveis ao editar (banco/agência/tipo/titular). */
  initial?: DadosBancariosFormValues;
  /** true = editando dado existente (mostra a nota de reentrada dos sensíveis). */
  editando: boolean;
  saving: boolean;
  /** Erro do callable (traduzido pelo container) — alerta inline honesto. */
  saveError?: string | undefined;
  onSubmit: (input: SaveDadosBancariosInput) => void;
  /** Cancelar edição (só quando já havia dado salvo). */
  onCancel?: (() => void) | undefined;
}

export function DadosBancariosForm({
  initial,
  editando,
  saving,
  saveError,
  onSubmit,
  onCancel,
}: DadosBancariosFormProps): JSX.Element {
  const [values, setValues] = React.useState<DadosBancariosFormValues>(
    () => initial ?? DADOS_BANCARIOS_INICIAIS,
  );
  const [erros, setErros] = React.useState<string[]>([]);
  const [enviado, setEnviado] = React.useState(false);

  function set<K extends keyof DadosBancariosFormValues>(
    campo: K,
    valor: DadosBancariosFormValues[K],
  ) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviado(true);
    const validationErrors = validarDadosBancarios(values);
    setErros(validationErrors);
    if (validationErrors.length > 0) return; // erro inline, sem submit (aceite T2)
    onSubmit(toSaveDadosBancariosInput(values));
  }

  const notaSensivel = editando
    ? 'Reinsira — o valor salvo fica mascarado por segurança (RN-354).'
    : undefined;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Dados bancários para repasse"
      className="flex max-w-2xl flex-col gap-[var(--spacing-4)]"
    >
      <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <Input
          id="db-banco"
          label="Banco"
          value={values.banco}
          onChange={(e) => set('banco', e.target.value)}
          placeholder="260 — Nubank"
          disabled={saving}
        />
        <Input
          id="db-agencia"
          label="Agência"
          value={values.agencia}
          onChange={(e) => set('agencia', e.target.value)}
          placeholder="0001"
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <Input
          id="db-conta"
          label="Número da conta"
          value={values.conta}
          onChange={(e) => set('conta', e.target.value)}
          placeholder="12345-6"
          disabled={saving}
          {...(notaSensivel ? { 'aria-describedby': 'db-conta-nota' } : {})}
        />
        <Select
          id="db-tipo"
          label="Tipo de conta"
          value={values.tipo}
          onChange={(e) => set('tipo', e.target.value as DadosBancariosFormValues['tipo'])}
          disabled={saving}
          options={[
            { value: 'corrente', label: 'Corrente' },
            { value: 'poupanca', label: 'Poupança' },
          ]}
        />
      </div>
      {notaSensivel && (
        <p id="db-conta-nota" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          {notaSensivel}
        </p>
      )}

      <Input
        id="db-titular"
        label="Titular"
        value={values.titular}
        onChange={(e) => set('titular', e.target.value)}
        placeholder="Marina Castelo"
        disabled={saving}
      />

      <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <Input
          id="db-cpfcnpj"
          label="CPF/CNPJ do titular"
          value={values.cpfCnpj}
          onChange={(e) => set('cpfCnpj', e.target.value)}
          placeholder="000.000.000-00"
          disabled={saving}
        />
        <Input
          id="db-pix"
          label="Chave PIX (opcional)"
          value={values.pix}
          onChange={(e) => set('pix', e.target.value)}
          placeholder="e-mail, telefone, CPF ou aleatória"
          disabled={saving}
        />
      </div>

      {enviado && erros.length > 0 && (
        <ul
          role="alert"
          className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-danger)]"
        >
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
          {saveError}
        </div>
      )}

      <div className="flex items-center gap-[var(--spacing-3)]">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar dados bancários'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

DadosBancariosForm.displayName = 'DadosBancariosForm';
