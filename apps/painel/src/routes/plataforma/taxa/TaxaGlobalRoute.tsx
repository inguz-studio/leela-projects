// =============================================================================
// TaxaGlobalRoute — `/plataforma/taxa` (LEELA-S1606 · TAXAFLEX · RN-178/404).
//
// Tabela GLOBAL de taxa da plataforma por meio de pagamento: o DEFAULT que
// vale para todos os organizadores ({pix|cartao|boleto} → percentual +
// fixo por venda). A exceção negociada por organizador vive nos termos do
// tenant (TermsEditor). LEITURA direta de `platform/config` (Rules: só
// platform_admin); ESCRITA exclusivamente pelo callable
// `setTaxaPlataformaGlobal` (client NUNCA grava — postura pós-19c8afe).
//
// RN-179: mudar a tabela NUNCA reprecifica pedido feito — a taxa é
// congelada por venda no ato da compra (aviso explícito na tela).
// Validação REUSA `validarTabelaTaxaPlataforma` (core — fonte única).
// =============================================================================

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Checkbox, Input, PageHeader, Skeleton, useToast } from '@leela/design-system';
import {
  MEIOS_TAXA,
  validarTabelaTaxaPlataforma,
  type MeioTaxa,
  type TabelaTaxaPlataforma,
} from '@leela/core';
import {
  getLeelaDb,
  getLeelaFunctions,
  getTaxaPlataformaGlobal,
  setTaxaPlataformaGlobal,
} from '@leela/api-client';
// Lógica PURA do form (guardas F1 da review antagonista) — testável em _lib
import {
  errosDeFormularioGlobal,
  ROTULO_MEIO,
  temZeroAtivoExplicito,
  toForm,
  toTabela,
  type FormTabela,
  type LinhaForm,
} from './_lib/taxaGlobalForm';

export function TaxaGlobalRoute(): JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['plataforma', 'taxa-global'],
    queryFn: () => getTaxaPlataformaGlobal(getLeelaDb()),
  });

  const [form, setForm] = React.useState<FormTabela>(() => toForm(null));
  const [erros, setErros] = React.useState<string[]>([]);
  const [confirmaZero, setConfirmaZero] = React.useState(false);
  const carregado = React.useRef(false);
  React.useEffect(() => {
    if (query.data !== undefined && !carregado.current) {
      carregado.current = true;
      setForm(toForm(query.data));
    }
  }, [query.data]);

  const saver = useMutation({
    mutationFn: (tabela: TabelaTaxaPlataforma) =>
      setTaxaPlataformaGlobal(getLeelaFunctions(), tabela),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plataforma', 'taxa-global'] });
      toast({
        variant: 'success',
        title: 'Tabela global salva',
        description: 'Vale para as PRÓXIMAS vendas — pedidos feitos não mudam.',
      });
    },
    onError: () => {
      toast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        description: 'Verifique os valores e tente novamente.',
      });
    },
  });

  function setLinha(meio: MeioTaxa, campo: keyof LinhaForm, valor: string): void {
    setForm((f) => ({ ...f, [meio]: { ...f[meio], [campo]: valor } }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    // F1: guardas de formulário ANTES da conversão (vazio nunca vira 0)
    const errosForm = errosDeFormularioGlobal(form, confirmaZero);
    if (errosForm.length > 0) {
      setErros(errosForm);
      return;
    }
    const tabela = toTabela(form);
    const validationErrors = validarTabelaTaxaPlataforma(tabela);
    setErros(validationErrors);
    if (validationErrors.length > 0) return;
    saver.mutate(tabela);
  }

  // Confirmação de taxa zero só aparece quando algum meio ATIVO está 0+0
  const temZeroAtivo = temZeroAtivoExplicito(form);

  if (query.isPending) {
    return (
      <div role="status" aria-label="Carregando tabela de taxa" className="flex flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]">
        <Skeleton variant="rect" className="h-[var(--header-height)]" />
        <Skeleton variant="rect" className="h-60" />
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="p-[var(--spacing-6)]">
        <div role="alert" className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]">
          Não foi possível carregar a tabela de taxa da plataforma.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <PageHeader
        title="Taxa da plataforma"
        subtitle="Tabela global por meio de pagamento — percentual + valor fixo por venda"
        badges={
          <Badge variant="neutro">
            {query.data ? 'Tabela configurada' : 'Ainda não configurada'}
          </Badge>
        }
      />

      <form
        noValidate
        onSubmit={handleSubmit}
        aria-label="Tabela global de taxa"
        className="flex max-w-2xl flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)]"
      >
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Este é o padrão de TODOS os organizadores (ex.: 6% no PIX + R$ 2,00 por venda). A
          exceção negociada de um organizador é editada nos termos comerciais dele. A taxa é
          congelada em cada compra: mudar a tabela vale só para as próximas vendas.
        </p>
        {!query.data && (
          <p role="note" className="rounded-[var(--card-radius)] bg-[var(--surface-overlay)] p-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Sem tabela configurada, o checkout usa a taxa percentual dos termos de cada tenant
            (sem componente fixo).
          </p>
        )}

        {MEIOS_TAXA.map((meio) => (
          <fieldset key={meio} className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
            <legend className="mb-[var(--spacing-2)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              {ROTULO_MEIO[meio]}
            </legend>
            <Input
              id={`global-${meio}-pct`}
              type="number"
              inputMode="decimal"
              step="0.01"
              label="Percentual (%)"
              value={form[meio].percentual}
              onChange={(e) => setLinha(meio, 'percentual', e.target.value)}
              disabled={saver.isPending}
            />
            <Input
              id={`global-${meio}-fixo`}
              type="number"
              inputMode="decimal"
              step="0.01"
              label="Fixo por venda (R$)"
              value={form[meio].fixoReais}
              onChange={(e) => setLinha(meio, 'fixoReais', e.target.value)}
              disabled={saver.isPending}
            />
          </fieldset>
        ))}

        {temZeroAtivo && (
          <label className="flex items-center gap-[var(--spacing-2)]">
            <Checkbox
              checked={confirmaZero}
              disabled={saver.isPending}
              onChange={(e) => setConfirmaZero(e.target.checked)}
            />
            <span className="text-[length:var(--font-size-base)] text-[var(--text-primary)]">
              Confirmo taxa ZERO no(s) meio(s) marcado(s) — a plataforma não cobrará nada nessas
              vendas
            </span>
          </label>
        )}

        {erros.length > 0 && (
          <ul role="alert" className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            {erros.map((erro) => (
              <li key={erro}>{erro}</li>
            ))}
          </ul>
        )}

        <div>
          <Button type="submit" disabled={saver.isPending}>
            {saver.isPending ? 'Salvando…' : 'Salvar tabela global'}
          </Button>
        </div>
      </form>
    </div>
  );
}

TaxaGlobalRoute.displayName = 'TaxaGlobalRoute';
