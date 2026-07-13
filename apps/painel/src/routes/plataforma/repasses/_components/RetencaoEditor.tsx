// =============================================================================
// RetencaoEditor — editor da retenção % de repasse POR TENANT (E09s-L4-T1,
// RN-350). SÓ o platform_admin edita aqui; a escrita vai por `setRetencaoRepasse`
// (Function — bump de versão do termo, RN-404). O valor exibido vem de
// `commercialTerms.retencaoRepassePct`; ausente ⇒ default global, sinalizado.
//
// A retenção é contingência anti-fraude sobre o LÍQUIDO do produtor até o evento
// encerrar (o organizador NÃO libera o próprio retido — cron L2-T6). Presentational
// + controlado: seletor de tenant + campo % + salvar; validação inline 0..100.
// =============================================================================

import * as React from 'react';
import { Badge, Button, Input, Select } from '@leela/design-system';
import type { SelectOption } from '@leela/design-system';
import type { RetencaoTenant } from '../_data/repassesAdmin';

export interface RetencaoEditorTenant {
  id: string;
  nome: string;
}

export interface RetencaoEditorProps {
  tenants: RetencaoEditorTenant[] | null;
  tenantsLoading: boolean;
  selectedTenantId: string;
  onSelectTenant: (id: string) => void;
  retencao: RetencaoTenant;
  saving: boolean;
  saveError: Error | null;
  onSave: (tenantId: string, pct: number) => void;
}

function validarPct(raw: string): string | null {
  if (raw.trim() === '') return 'Informe a retenção (%).';
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return 'A retenção deve estar entre 0 e 100.';
  return null;
}

export function RetencaoEditor({
  tenants,
  tenantsLoading,
  selectedTenantId,
  onSelectTenant,
  retencao,
  saving,
  saveError,
  onSave,
}: RetencaoEditorProps): JSX.Element {
  const [input, setInput] = React.useState('');
  const [enviado, setEnviado] = React.useState(false);

  // Sincroniza o campo com o valor vigente do tenant selecionado (ao trocar de
  // tenant ou quando a leitura chega/atualiza) — nunca durante o load.
  React.useEffect(() => {
    if (!retencao.loading) {
      setInput(String(retencao.value));
      setEnviado(false);
    }
  }, [selectedTenantId, retencao.value, retencao.loading]);

  const tenantOptions: SelectOption[] = (tenants ?? []).map((t) => ({ value: t.id, label: t.nome }));
  const erro = enviado ? validarPct(input) : null;
  const podeSalvar = selectedTenantId !== '' && !saving && !retencao.loading;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviado(true);
    const msg = validarPct(input);
    if (msg !== null || selectedTenantId === '') return;
    onSave(selectedTenantId, Number(input));
  }

  return (
    <section aria-label="Retenção de repasse por tenant" className="px-[var(--spacing-6)]">
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex max-w-2xl flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)] shadow-[var(--elevation-1)]"
      >
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Retenção de repasse
          </h2>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            % retido do líquido do produtor até o evento encerrar (RN-350). Configurável por tenant.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Select
            id="retencao-tenant"
            label="Tenant"
            options={tenantOptions}
            value={selectedTenantId}
            onChange={(e) => onSelectTenant(e.target.value)}
            disabled={tenantsLoading || saving}
          />

          <div className="flex flex-col gap-[var(--spacing-1)]">
            <Input
              id="retencao-pct"
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              max={100}
              label="Retenção (%)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!selectedTenantId || retencao.loading || saving}
            />
            {retencao.usandoDefault && !retencao.loading && selectedTenantId !== '' && (
              <span className="flex items-center gap-[var(--spacing-2)]">
                <Badge variant="neutro">default global</Badge>
                <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
                  Este tenant ainda usa o padrão da plataforma.
                </span>
              </span>
            )}
          </div>
        </div>

        {erro && (
          <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
            {erro}
          </p>
        )}

        {saveError && (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
          >
            Não foi possível salvar a retenção. Tente novamente.
          </div>
        )}

        <div>
          <Button type="submit" variant="primary" disabled={!podeSalvar}>
            {saving ? 'Salvando…' : 'Salvar retenção'}
          </Button>
        </div>
      </form>
    </section>
  );
}

RetencaoEditor.displayName = 'RetencaoEditor';
