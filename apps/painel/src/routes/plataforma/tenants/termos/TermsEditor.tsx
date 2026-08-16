// =============================================================================
// TermsEditor — editor de termos comerciais do tenant (S1602-T2).
// Presentational + controlado. platform_admin edita e salva (bump de versão
// no servidor); tenant_owner vê read-only sem botão salvar (RN-404).
// saasMonthlyFee=0 é válido e mostra aviso de isenção (RN-405). Antecipação
// aparece como campo com badge "disponível em breve" (RN-410, mecânica pós-V1).
// Validação inline via validateCommercialTerms; estados §2.12; flat §2.16.
// =============================================================================

import * as React from 'react';
import {
  Badge,
  Button,
  CheckboxField,
  FieldGroup,
  Input,
  PageHeader,
  Skeleton,
} from '@leela/design-system';
import {
  DEFAULT_COMMERCIAL_TERMS,
  MEIOS_TAXA,
  validateCommercialTerms,
  type CommercialTerms,
  type CommercialTermsInput,
  type MeioTaxa,
  type TaxaTabelaOverride,
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

/** Rótulos das linhas do override por meio (TAXAFLEX · RN-178). */
const ROTULO_MEIO: Record<MeioTaxa, string> = {
  pix: 'PIX',
  cartao: 'Cartão',
  boleto: 'Boleto (inativo no checkout)',
};

/** Par de campos de UMA linha do override (strings; vazio = herda a global). */
interface LinhaTaxaForm {
  percentual: string;
  fixoReais: string;
}

interface FormValues {
  platformFeePct: string;
  saasMonthlyFee: string;
  maxParcelas: string;
  jurosAoMes: string;
  parcelaMinima: string;
  communityMonthlyEnabled: boolean;
  anticipationDisponivel: boolean;
  /** TAXAFLEX (RN-178): override por meio — linha vazia herda a GLOBAL. */
  taxaTabela: Record<MeioTaxa, LinhaTaxaForm>;
}

function toForm(terms: CommercialTerms | null): FormValues {
  const t = terms ?? { ...DEFAULT_COMMERCIAL_TERMS, versao: 0, atualizadoPor: '', atualizadoEm: null as never };
  const linha = (meio: MeioTaxa): LinhaTaxaForm => {
    const o = t.taxaTabela?.[meio];
    return o
      ? { percentual: String(o.percentual), fixoReais: (o.fixoCentavos / 100).toFixed(2) }
      : { percentual: '', fixoReais: '' };
  };
  return {
    platformFeePct: String(t.platformFeePct),
    saasMonthlyFee: String(t.saasMonthlyFee),
    maxParcelas: String(t.installmentRules.maxParcelas),
    jurosAoMes: String(t.installmentRules.jurosAoMes),
    parcelaMinima: String(t.installmentRules.parcelaMinima),
    communityMonthlyEnabled: t.communityMonthlyEnabled,
    anticipationDisponivel: t.anticipation.disponivel,
    taxaTabela: { pix: linha('pix'), cartao: linha('cartao'), boleto: linha('boleto') },
  };
}

/**
 * Linhas do override PREENCHIDAS (par completo) → `taxaTabela` do termo.
 * Linha vazia fica FORA (herda a global). Linha meio-preenchida devolve
 * erro explícito (nunca gravar par incompleto em doc de dinheiro).
 */
function overrideDoForm(
  v: FormValues
): { tabela: TaxaTabelaOverride | undefined; erros: string[] } {
  const tabela: TaxaTabelaOverride = {};
  const erros: string[] = [];
  for (const meio of MEIOS_TAXA) {
    const linha = v.taxaTabela[meio];
    const temPct = linha.percentual.trim() !== '';
    const temFixo = linha.fixoReais.trim() !== '';
    if (!temPct && !temFixo) continue; // herda a global
    if (!temPct || !temFixo) {
      erros.push(
        `Exceção do Serviço (${ROTULO_MEIO[meio]}): preencha percentual E valor fixo, ou deixe os dois vazios para herdar a tabela global.`
      );
      continue;
    }
    tabela[meio] = {
      percentual: Number(linha.percentual),
      fixoCentavos: Math.round(Number(linha.fixoReais) * 100),
    };
  }
  return { tabela: Object.keys(tabela).length > 0 ? tabela : undefined, erros };
}

/**
 * Monta o input do save. `atual` PRESERVA os campos opcionais que este form
 * não edita (retenção/D+N, taxaPorMetodo/tabelaTaxasParcela legados,
 * modoTaxaDefault, rastro de plano) — antes deste fix, salvar pelo editor
 * APAGAVA esses campos do termo (footgun TAXAFLEX-9).
 */
function toInput(v: FormValues, atual: CommercialTerms | null): CommercialTermsInput {
  const { tabela } = overrideDoForm(v);
  return {
    // Opcionais NÃO editados aqui — preservados do termo vigente
    ...(atual?.retencaoRepassePct !== undefined ? { retencaoRepassePct: atual.retencaoRepassePct } : {}),
    ...(atual?.disponibilizacaoDiasUteis !== undefined ? { disponibilizacaoDiasUteis: atual.disponibilizacaoDiasUteis } : {}),
    ...(atual?.taxaPorMetodo !== undefined ? { taxaPorMetodo: atual.taxaPorMetodo } : {}),
    ...(atual?.tabelaTaxasParcela !== undefined ? { tabelaTaxasParcela: atual.tabelaTaxasParcela } : {}),
    ...(atual?.modoTaxaDefault !== undefined ? { modoTaxaDefault: atual.modoTaxaDefault } : {}),
    ...(atual?.planoAplicadoId !== undefined ? { planoAplicadoId: atual.planoAplicadoId } : {}),
    ...(atual?.planoAplicadoEm !== undefined ? { planoAplicadoEm: atual.planoAplicadoEm } : {}),
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
    // TAXAFLEX (RN-178): só as linhas negociadas; ausente = herda a global
    ...(tabela !== undefined ? { taxaTabela: tabela } : {}),
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
    // Linha de override meio-preenchida = erro EXPLÍCITO antes do parse
    // numérico (nunca gravar par incompleto em doc de dinheiro).
    const { erros: errosOverride } = overrideDoForm(values);
    const input = toInput(values, terms);
    const validationErrors = [...errosOverride, ...validateCommercialTerms(input)];
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
        subtitle="Economia do tenant — Serviço, parcelamento e mensalidade"
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
          label="Serviço (%)"
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

        <FieldGroup legend="Parcelamento">
          <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
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
          </div>
        </FieldGroup>

        {/* TAXAFLEX (RN-178 · S1606): exceção NEGOCIADA por meio — linha
            vazia herda a tabela GLOBAL da plataforma (config em
            /plataforma/taxa). Congelada por venda no ato da compra (RN-179):
            mudar aqui nunca reprecifica pedido feito. */}
        <FieldGroup
          legend="Exceção do Serviço por meio de pagamento"
          description="Condição negociada por contrato. Linha vazia herda a tabela global da plataforma; preenchida, vale percentual + valor fixo por venda (ex.: 6% + R$ 2,00). Vendas já feitas não são reprecificadas."
        >
          {MEIOS_TAXA.map((meio) => (
            <div key={meio} className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
              <Input
                id={`taxa-${meio}-pct`}
                type="number"
                inputMode="decimal"
                step="0.01"
                label={`${ROTULO_MEIO[meio]} — percentual (%)`}
                value={values.taxaTabela[meio].percentual}
                onChange={(e) =>
                  set('taxaTabela', {
                    ...values.taxaTabela,
                    [meio]: { ...values.taxaTabela[meio], percentual: e.target.value },
                  })
                }
                disabled={readOnly || saving}
              />
              <Input
                id={`taxa-${meio}-fixo`}
                type="number"
                inputMode="decimal"
                step="0.01"
                label={`${ROTULO_MEIO[meio]} — fixo por venda (R$)`}
                value={values.taxaTabela[meio].fixoReais}
                onChange={(e) =>
                  set('taxaTabela', {
                    ...values.taxaTabela,
                    [meio]: { ...values.taxaTabela[meio], fixoReais: e.target.value },
                  })
                }
                disabled={readOnly || saving}
              />
            </div>
          ))}
        </FieldGroup>

        <CheckboxField
          checked={values.communityMonthlyEnabled}
          disabled={readOnly || saving}
          onChange={(e) => set('communityMonthlyEnabled', e.target.checked)}
          label="Habilitar mensalidade da comunidade"
        />

        {/* Antecipação — campo existe, mecânica é pós-V1 (RN-410) */}
        <div className="flex items-center gap-[var(--spacing-3)] opacity-70">
          <CheckboxField
            checked={values.anticipationDisponivel}
            disabled
            readOnly
            label="Antecipação de recebíveis"
          />
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
