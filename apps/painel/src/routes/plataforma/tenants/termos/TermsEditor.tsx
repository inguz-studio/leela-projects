// =============================================================================
// TermsEditor — editor de termos comerciais do tenant (S1602-T2).
// Presentational + controlado. platform_admin edita e salva (bump de versão
// no servidor); tenant_owner vê read-only sem botão salvar (RN-404).
// saasMonthlyFee=0 é válido e mostra aviso de isenção (RN-405). Antecipação
// aparece como campo com badge "disponível em breve" (RN-410, mecânica pós-V1).
// Validação inline via validateCommercialTerms; estados §2.12; flat §2.16.
// =============================================================================

import * as React from 'react';
import { Badge, Button, Input, PageHeader, Skeleton } from '@leela/design-system';
import {
  DEFAULT_COMMERCIAL_TERMS,
  validateCommercialTerms,
  type CommercialTerms,
  type CommercialTermsInput,
} from '@leela/core';

export interface TermsEditorProps {
  terms: CommercialTerms | null;
  loading: boolean;
  error: Error | null;
  /** RN-404: tenant_owner vê somente leitura (sem botão salvar). */
  readOnly: boolean;
  saving: boolean;
  saveError: Error | null;
  onSave: (input: CommercialTermsInput) => void;
  onVoltar: () => void;
}

interface FormValues {
  platformFeePct: string;
  saasMonthlyFee: string;
  maxParcelas: string;
  jurosAoMes: string;
  parcelaMinima: string;
  communityMonthlyEnabled: boolean;
  anticipationDisponivel: boolean;
}

function toForm(terms: CommercialTerms | null): FormValues {
  const t = terms ?? { ...DEFAULT_COMMERCIAL_TERMS, versao: 0, atualizadoPor: '', atualizadoEm: null as never };
  return {
    platformFeePct: String(t.platformFeePct),
    saasMonthlyFee: String(t.saasMonthlyFee),
    maxParcelas: String(t.installmentRules.maxParcelas),
    jurosAoMes: String(t.installmentRules.jurosAoMes),
    parcelaMinima: String(t.installmentRules.parcelaMinima),
    communityMonthlyEnabled: t.communityMonthlyEnabled,
    anticipationDisponivel: t.anticipation.disponivel,
  };
}

function toInput(v: FormValues): CommercialTermsInput {
  return {
    platformFeePct: Number(v.platformFeePct),
    saasMonthlyFee: Number(v.saasMonthlyFee),
    installmentRules: {
      maxParcelas: Number(v.maxParcelas),
      jurosAoMes: Number(v.jurosAoMes),
      parcelaMinima: Number(v.parcelaMinima),
    },
    // Antecipação é campo só-leitura na V1 (RN-410) — preserva o valor atual.
    anticipation: { disponivel: v.anticipationDisponivel },
    communityMonthlyEnabled: v.communityMonthlyEnabled,
  };
}

export function TermsEditor({
  terms,
  loading,
  error,
  readOnly,
  saving,
  saveError,
  onSave,
  onVoltar,
}: TermsEditorProps): JSX.Element {
  const [values, setValues] = React.useState<FormValues>(() => toForm(terms));
  const [erros, setErros] = React.useState<string[]>([]);
  const [enviado, setEnviado] = React.useState(false);
  const carregado = React.useRef(false);

  // Sincroniza o form com os termos carregados (uma vez, ao chegar do servidor).
  React.useEffect(() => {
    if (terms && !carregado.current) {
      carregado.current = true;
      setValues(toForm(terms));
    }
  }, [terms]);

  if (loading) {
    return (
      <div role="status" aria-label="Carregando termos" className="flex flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]">
        <Skeleton variant="rect" className="h-[var(--header-height)]" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]">
        <div role="alert" className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]">
          Não foi possível carregar os termos comerciais.
        </div>
        <div>
          <Button variant="ghost" onClick={onVoltar}>← Voltar</Button>
        </div>
      </div>
    );
  }

  function set<K extends keyof FormValues>(campo: K, valor: FormValues[K]) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setEnviado(true);
    const input = toInput(values);
    const validationErrors = validateCommercialTerms(input);
    setErros(validationErrors);
    if (validationErrors.length > 0) return;
    onSave(input);
  }

  const saasIsento = values.saasMonthlyFee.trim() !== '' && Number(values.saasMonthlyFee) === 0;
  const versaoLabel = terms ? `Versão ${terms.versao}` : 'Sem termos ainda';

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Termos comerciais"
        subtitle="Economia do tenant — taxa, parcelamento e mensalidade"
        badges={<Badge variant="neutro">{versaoLabel}</Badge>}
      />

      <form
        noValidate
        onSubmit={handleSubmit}
        aria-label="Termos comerciais"
        className="flex max-w-2xl flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)]"
      >
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={onVoltar}>← Voltar para o tenant</Button>
        </div>

        {readOnly && (
          <div role="note" className="rounded-[var(--card-radius)] bg-[var(--surface-overlay)] p-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Somente leitura. A economia do tenant é definida pelo administrador da plataforma (RN-404).
          </div>
        )}

        <Input
          id="platformFeePct"
          type="number"
          inputMode="decimal"
          step="0.1"
          label="Taxa da plataforma (%)"
          value={values.platformFeePct}
          onChange={(e) => set('platformFeePct', e.target.value)}
          disabled={readOnly || saving}
        />

        <div className="flex flex-col gap-[var(--spacing-2)]">
          <Input
            id="saasMonthlyFee"
            type="number"
            inputMode="decimal"
            step="0.01"
            label="Mensalidade SaaS (R$)"
            value={values.saasMonthlyFee}
            onChange={(e) => set('saasMonthlyFee', e.target.value)}
            disabled={readOnly || saving}
          />
          {saasIsento && (
            <p role="note" className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              Produtor isento de mensalidade SaaS.
            </p>
          )}
        </div>

        <fieldset className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
          <legend className="mb-[var(--spacing-2)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Parcelamento
          </legend>
          <Input
            id="maxParcelas"
            type="number"
            inputMode="numeric"
            step="1"
            label="Máx. parcelas"
            value={values.maxParcelas}
            onChange={(e) => set('maxParcelas', e.target.value)}
            disabled={readOnly || saving}
          />
          <Input
            id="jurosAoMes"
            type="number"
            inputMode="decimal"
            step="0.1"
            label="Juros ao mês (%)"
            value={values.jurosAoMes}
            onChange={(e) => set('jurosAoMes', e.target.value)}
            disabled={readOnly || saving}
          />
          <Input
            id="parcelaMinima"
            type="number"
            inputMode="decimal"
            step="1"
            label="Parcela mínima (R$)"
            value={values.parcelaMinima}
            onChange={(e) => set('parcelaMinima', e.target.value)}
            disabled={readOnly || saving}
          />
        </fieldset>

        <label className="flex items-center gap-[var(--spacing-2)]">
          <input
            type="checkbox"
            checked={values.communityMonthlyEnabled}
            disabled={readOnly || saving}
            onChange={(e) => set('communityMonthlyEnabled', e.target.checked)}
            className="h-[var(--spacing-4)] w-[var(--spacing-4)] accent-[var(--action-primary)]"
          />
          <span className="text-[length:var(--font-size-base)] text-[var(--text-primary)]">
            Habilitar mensalidade da comunidade
          </span>
        </label>

        {/* Antecipação — campo existe, mecânica é pós-V1 (RN-410) */}
        <div className="flex items-center gap-[var(--spacing-3)] opacity-70">
          <label className="flex items-center gap-[var(--spacing-2)]">
            <input
              type="checkbox"
              checked={values.anticipationDisponivel}
              disabled
              readOnly
              className="h-[var(--spacing-4)] w-[var(--spacing-4)] accent-[var(--action-primary)]"
            />
            <span className="text-[length:var(--font-size-base)] text-[var(--text-primary)]">
              Antecipação de recebíveis
            </span>
          </label>
          <Badge variant="alerta">disponível em breve</Badge>
        </div>

        {enviado && erros.length > 0 && (
          <ul role="alert" className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        {saveError && (
          <div role="alert" className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            Não foi possível salvar os termos. Verifique os dados e tente novamente.
          </div>
        )}

        {!readOnly && (
          <div className="flex items-center gap-[var(--spacing-3)]">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar termos'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

TermsEditor.displayName = 'TermsEditor';
