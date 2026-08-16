// =============================================================================
// ProvisionTenantModal — provisiona/aprova um tenant de ponta a ponta (S1601-T4).
// Presentational + controlado: form com validação inline pura
// (validateProvisionInput) sobre o Modal base (§2.15). Submit válido chama
// onProvision(input); a escrita atômica (tenant + owner + claims — RN-403)
// acontece na Cloud Function. Erro de callable (ex.: failed-precondition da
// guarda de papel) chega por `errorMessage` e vira alerta inline.
// =============================================================================

import * as React from 'react';
import { Button, Input, Modal, Select } from '@leela/design-system';
import { validateProvisionInput, type ProvisionInput, type TenantTipo } from '@leela/core';

export interface ProvisionTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  running: boolean;
  /** Mensagem de erro da callable (traduzida pelo container). */
  errorMessage?: string | undefined;
  onProvision: (input: ProvisionInput) => void;
}

interface FormValues {
  nome: string;
  slug: string;
  tipo: TenantTipo;
  ownerEmail: string;
  platformFeePct: string;
  saasMonthlyFee: string;
}

const INICIAIS: FormValues = {
  nome: '',
  slug: '',
  tipo: 'produtor',
  ownerEmail: '',
  platformFeePct: '',
  saasMonthlyFee: '',
};

/** Deriva um slug kebab-case a partir do nome (sugestão editável). */
function slugify(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Monta o ProvisionInput a partir do form (campos numéricos opcionais). */
function toInput(v: FormValues): ProvisionInput {
  const input: ProvisionInput = {
    nome: v.nome.trim(),
    slug: v.slug.trim(),
    tipo: v.tipo,
    ownerEmail: v.ownerEmail.trim(),
  };
  if (v.platformFeePct.trim() !== '') input.platformFeePct = Number(v.platformFeePct);
  if (v.saasMonthlyFee.trim() !== '') input.saasMonthlyFee = Number(v.saasMonthlyFee);
  return input;
}

export function ProvisionTenantModal({
  open,
  onOpenChange,
  running,
  errorMessage,
  onProvision,
}: ProvisionTenantModalProps): JSX.Element {
  const [values, setValues] = React.useState<FormValues>(INICIAIS);
  const [slugTocado, setSlugTocado] = React.useState(false);
  const [erros, setErros] = React.useState<string[]>([]);
  const [enviado, setEnviado] = React.useState(false);

  // Zera o form a cada abertura
  React.useEffect(() => {
    if (open) {
      setValues(INICIAIS);
      setSlugTocado(false);
      setErros([]);
      setEnviado(false);
    }
  }, [open]);

  function set<K extends keyof FormValues>(campo: K, valor: FormValues[K]) {
    setValues((v) => {
      const next = { ...v, [campo]: valor };
      // Sugere o slug a partir do nome até o admin editar o slug manualmente
      if (campo === 'nome' && !slugTocado) next.slug = slugify(valor as string);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviado(true);
    const input = toInput(values);
    const validationErrors = validateProvisionInput(input);
    setErros(validationErrors);
    if (validationErrors.length > 0) return;
    onProvision(input);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Provisionar tenant"
      description="Cria o tenant, a conta do responsável e as permissões numa operação atômica."
      size="md"
      footer={
        <>
          <Button variant="secondary" disabled={running} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="provision-tenant-form" variant="primary" disabled={running}>
            {running ? 'Provisionando…' : 'Provisionar'}
          </Button>
        </>
      }
    >
      <form id="provision-tenant-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-4)]">
        <Input
          id="prov-nome"
          label="Nome do tenant"
          value={values.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Castelo Produções"
        />
        <Input
          id="prov-slug"
          label="Slug (identificador único)"
          value={values.slug}
          onChange={(e) => {
            setSlugTocado(true);
            set('slug', e.target.value);
          }}
          placeholder="castelo-producoes"
        />

        <Select
          id="prov-tipo"
          label="Tipo"
          options={[
            { value: 'produtor', label: 'Produtor' },
            { value: 'promotor', label: 'Promotor' },
          ]}
          value={values.tipo}
          onChange={(e) => set('tipo', e.target.value as TenantTipo)}
        />

        <Input
          id="prov-email"
          type="email"
          label="E-mail do responsável"
          value={values.ownerEmail}
          onChange={(e) => set('ownerEmail', e.target.value)}
          placeholder="responsavel@exemplo.com"
        />

        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <Input
            id="prov-fee"
            type="number"
            inputMode="decimal"
            step="0.1"
            label="Serviço (%) — opcional"
            value={values.platformFeePct}
            onChange={(e) => set('platformFeePct', e.target.value)}
            placeholder="10.5"
          />
          <Input
            id="prov-saas"
            type="number"
            inputMode="decimal"
            step="0.01"
            label="Mensalidade SaaS (R$) — opcional"
            value={values.saasMonthlyFee}
            onChange={(e) => set('saasMonthlyFee', e.target.value)}
            placeholder="0"
          />
        </div>

        {enviado && erros.length > 0 && (
          <ul role="alert" className="flex flex-col gap-[var(--spacing-1)] text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-overlay)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
          >
            {errorMessage}
          </div>
        )}
      </form>
    </Modal>
  );
}

ProvisionTenantModal.displayName = 'ProvisionTenantModal';
