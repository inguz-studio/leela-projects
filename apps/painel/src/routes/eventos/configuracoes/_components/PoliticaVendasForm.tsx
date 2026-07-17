// =============================================================================
// PoliticaVendasForm — form da Política de vendas do evento (LEELA-S305-T2/T3 ·
// E04). Presentational + controlado (padrão ConfigGeraisForm). Três blocos:
//   T2 Reembolso — janela de arrependimento (dias), corte (horas), SLA (dias);
//   T3 Transferência de titularidade — flag + janela (horas) + taxa (R$);
//   T3 Troca de ingresso — flag + janela (horas) + reembolso no downgrade.
// Os DEFAULTS legais e a validação vêm do kernel (`politicaForm` → @leela/core);
// esta tela nunca decide roteamento nem executa a máquina (isso é E09-S904).
//
// GATE: só o OWNER do tenant grava (Rules) — `podeEditar` reflete o papel de
// evento (organizador/administrador) para a UX; a Rule é a autoridade final e o
// `permission-denied` sobe honesto no Toast (§2.12). Números fora de faixa são
// barrados por `validaPoliticaVendas` (kernel) ANTES do submit.
// =============================================================================

import * as React from 'react';
import { Button, Input, Switch, useToast } from '@leela/design-system';
import type { SalvarPoliticaVendasInput } from '@leela/api-client';
import type { PoliticaVendas } from '@leela/core';
import {
  construirPolitica,
  valoresDaPolitica,
  validaPoliticaVendas,
  type PoliticaVendasValues,
} from '../_lib/politicaForm';

export interface PoliticaVendasFormProps {
  /** Política gravada (ou null → o form parte dos defaults legais do kernel). */
  politica: PoliticaVendas | null;
  /** Papel pode editar? (desabilita os controles + o Salvar quando false). */
  podeEditar: boolean;
  /** Persiste a política (tenantId injetado pelo container). */
  onSalvar: (input: Omit<SalvarPoliticaVendasInput, 'tenantId'>) => Promise<void>;
}

export function PoliticaVendasForm({
  politica,
  podeEditar,
  onSalvar,
}: PoliticaVendasFormProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<PoliticaVendasValues>(() =>
    valoresDaPolitica(politica),
  );
  const [salvando, setSalvando] = React.useState(false);

  // Reidrata quando a política muda (read-your-writes após salvar).
  React.useEffect(() => {
    setValues(valoresDaPolitica(politica));
  }, [politica]);

  function set<K extends keyof PoliticaVendasValues>(campo: K, valor: PoliticaVendasValues[K]) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEditar) return;
    const erros = validaPoliticaVendas(values);
    if (erros.length > 0) {
      toast({
        variant: 'danger',
        title: 'Revise a política',
        description: erros[0] ?? 'Confira os valores informados.',
      });
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(construirPolitica(values));
      toast({ variant: 'success', title: 'Política de vendas salva' });
    } catch {
      toast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        description:
          'A política de reembolso é gravada pelo dono da conta. Verifique sua permissão.',
      });
    } finally {
      setSalvando(false);
    }
  }

  const disabled = !podeEditar || salvando;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Política de vendas do evento"
      className="flex max-w-3xl flex-col gap-[var(--spacing-6)]"
    >
      {!podeEditar ? (
        <p role="status" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Seu papel não permite editar a política — os campos estão em leitura.
        </p>
      ) : null}

      {/* Reembolso (T2 · RN-338/339/340 — defaults CDC Art. 49). */}
      <Bloco
        titulo="Reembolso"
        descricao="Reembolso integral automático dentro da janela de arrependimento; solicitações muito perto do evento são bloqueadas; o restante entra em análise dentro do SLA."
      >
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
          <CampoNumero
            id="pol-janela-arrependimento"
            label="Janela de arrependimento (dias)"
            hint="Dias corridos da compra com reembolso integral automático (CDC: 7)."
            value={values.janelaArrependimentoDias}
            min="0"
            step="1"
            inputMode="numeric"
            disabled={disabled}
            onChange={(v) => set('janelaArrependimentoDias', v)}
          />
          <CampoNumero
            id="pol-corte-horas"
            label="Corte antes do evento (horas)"
            hint="Solicitações a menos disto do evento são bloqueadas (padrão 48)."
            value={values.corteHoras}
            min="0"
            step="1"
            inputMode="numeric"
            disabled={disabled}
            onChange={(v) => set('corteHoras', v)}
          />
          <CampoNumero
            id="pol-sla-analise"
            label="SLA de análise (dias)"
            hint="Prazo para decidir o que cai em análise (padrão 3)."
            value={values.slaAnaliseDias}
            min="0"
            step="1"
            inputMode="numeric"
            disabled={disabled}
            onChange={(v) => set('slaAnaliseDias', v)}
          />
        </div>
      </Bloco>

      {/* Transferência de titularidade (T3 · RN-343) — nasce desligada. */}
      <Bloco
        titulo="Transferência de titularidade"
        descricao="Permite passar a inscrição a outro atleta (o pagamento permanece na mesma inscrição). Bloqueada após kit entregue, chip vinculado ou check-in."
      >
        <Switch
          id="pol-transferencia-habilitada"
          label="Permitir transferência de titularidade"
          checked={values.transferenciaHabilitada}
          disabled={disabled}
          onCheckedChange={(checked) => set('transferenciaHabilitada', checked)}
        />
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <CampoNumero
            id="pol-transferencia-janela"
            label="Janela antes do evento (horas)"
            hint="Até quando a transferência fica aberta (padrão 72)."
            value={values.transferenciaJanelaHoras}
            min="1"
            step="1"
            inputMode="numeric"
            disabled={disabled || !values.transferenciaHabilitada}
            onChange={(v) => set('transferenciaJanelaHoras', v)}
          />
          <CampoNumero
            id="pol-transferencia-taxa"
            label="Taxa de transferência (R$)"
            hint="Cobrada na troca de titular (padrão R$ 0)."
            value={values.transferenciaTaxa}
            min="0"
            step="0.01"
            inputMode="decimal"
            disabled={disabled || !values.transferenciaHabilitada}
            onChange={(v) => set('transferenciaTaxa', v)}
          />
        </div>
      </Bloco>

      {/* Troca de ingresso — mesmo titular (T3 · RN-344) — nasce desligada. */}
      <Bloco
        titulo="Troca de ingresso"
        descricao="Permite ao mesmo titular trocar de percurso (upgrade/downgrade). A cobrança da diferença acontece no checkout — aqui só a regra."
      >
        <Switch
          id="pol-troca-habilitada"
          label="Permitir troca de ingresso"
          checked={values.trocaHabilitada}
          disabled={disabled}
          onCheckedChange={(checked) => set('trocaHabilitada', checked)}
        />
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
          <CampoNumero
            id="pol-troca-janela"
            label="Janela antes do evento (horas)"
            hint="Até quando a troca fica aberta (padrão 48)."
            value={values.trocaJanelaHoras}
            min="1"
            step="1"
            inputMode="numeric"
            disabled={disabled || !values.trocaHabilitada}
            onChange={(v) => set('trocaJanelaHoras', v)}
          />
        </div>
        <Switch
          id="pol-troca-downgrade"
          label="Reembolsar a diferença em downgrade"
          description="Ligado: trocar para um percurso mais barato devolve a diferença. Desligado (padrão): downgrade não gera reembolso."
          checked={values.permiteReembolsoDowngrade}
          disabled={disabled || !values.trocaHabilitada}
          onCheckedChange={(checked) => set('permiteReembolsoDowngrade', checked)}
        />
      </Bloco>

      {podeEditar ? (
        <div className="flex items-center gap-[var(--spacing-3)]">
          <Button type="submit" variant="primary" disabled={disabled}>
            {salvando ? 'Salvando…' : 'Salvar política'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

/** Campo numérico com dica (o Input do DS não tem slot de hint — compõe aqui). */
function CampoNumero({
  id,
  label,
  hint,
  value,
  min,
  step,
  inputMode,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  min: string;
  step: string;
  inputMode: 'numeric' | 'decimal';
  disabled: boolean;
  onChange: (valor: string) => void;
}): JSX.Element {
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <Input
        id={id}
        type="number"
        inputMode={inputMode}
        min={min}
        step={step}
        label={label}
        value={value}
        disabled={disabled}
        aria-describedby={hintId}
        onChange={(e) => onChange(e.target.value)}
      />
      <span id={hintId} className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
        {hint}
      </span>
    </div>
  );
}

function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-5)]"
    >
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {titulo}
        </h3>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

PoliticaVendasForm.displayName = 'PoliticaVendasForm';
