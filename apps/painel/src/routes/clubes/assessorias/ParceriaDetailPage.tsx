// =============================================================================
// ParceriaDetailPage (`/clubes/assessorias/:parceriaId`) — detalhe da parceria
// (E18 · S1803) + editor da condição de desconto (S1802). A condição
// materializa-se como CUPOM escopado `club_parceiro` num evento do tenant
// (ADR-012 — sem split, sem segundo caminho). Só parceria ATIVA aceita condição
// (RN-364); pendente/encerrada mostram estado honesto, não o form.
//
// Escrita SÓ por callable (definirCondicaoDesconto); o kernel valida
// código/valor/janela — a validação local é UX/fail-fast espelho do servidor.
// =============================================================================

import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Input,
  Select,
  Skeleton,
  useToast,
  type SelectOption,
} from '@leela/design-system';
import { DateTimeField } from '@/components/fields/DateTimeField';
import { definirCondicaoDesconto } from '@leela/api-client';
import { AuthAlert } from '../../conta/auth/AuthAlert';
import { mensagemDeContagem, mensagemDeValor } from '../../../lib/mensagemDoParser';
import { useTenantSession } from '../../../lib/session/tenantSession';
import { useEventosDoOrganizador, useParceriasAssessoria } from './_data/assessorias';
import {
  CONDICAO_VALORES_INICIAIS,
  formatarDocumentoValor,
  millisDeInputLocal,
  parseValorCondicao,
  statusParceriaBadge,
  tetoUsoParaNumero,
  validarCondicaoDesconto,
  type CondicaoDescontoValues,
} from './_lib/assessoriaForm';

const SECAO =
  'flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-6)]';
const SECAO_TITULO =
  'text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]';

function mensagemErro(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const msg = (err as { message?: string })?.message ?? '';
  if (code.includes('already-exists')) {
    return 'Já existe um cupom com esse código neste evento (outro escopo/parceria). Use outro código.';
  }
  if (code.includes('failed-precondition')) {
    return msg || 'A parceria precisa estar ativa para definir a condição (RN-364).';
  }
  if (code.includes('permission-denied')) {
    return 'Você não tem permissão para definir a condição neste evento.';
  }
  if (code.includes('not-found')) {
    return 'Parceria ou evento não encontrado.';
  }
  if (code.includes('invalid-argument')) {
    return msg || 'Dados inválidos — revise código, valor e janela.';
  }
  return 'Não foi possível salvar a condição de desconto. Tente novamente.';
}

export function ParceriaDetailPage(): JSX.Element {
  const { parceriaId = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const session = useTenantSession();
  const { data: parcerias, loading, refetch } = useParceriasAssessoria(session.tenantId);
  const { data: eventos } = useEventosDoOrganizador(session.tenantId, session.uid);

  const parceria = useMemo(
    () => parcerias.find((p) => p.id === parceriaId) ?? null,
    [parcerias, parceriaId]
  );

  const [values, setValues] = useState<CondicaoDescontoValues>(CONDICAO_VALORES_INICIAIS);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof CondicaoDescontoValues>(campo: K, valor: CondicaoDescontoValues[K]): void {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  const erros = useMemo(() => validarCondicaoDesconto(values), [values]);
  const podeSalvar = erros.length === 0 && !enviando && parceria?.status === 'ativa';

  // PARSE-1: os dois campos numéricos desta tela liam pelos parsers do core e
  // não tinham NENHUMA mensagem — `erros` só desabilitava o botão, e quem
  // digitasse "1,234.56" ficava olhando um botão morto sem uma palavra. O
  // branco não acusa: os dois são preenchidos aos poucos e o teto é opcional.
  const erroValor = mensagemDeValor(values.valor);
  const erroTeto = mensagemDeContagem(values.tetoUso);

  const eventoOpcoes: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Selecione um evento' },
      ...eventos.map((e) => ({ value: e.id, label: e.nome })),
    ],
    [eventos]
  );

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeSalvar) return;
    const inicio = millisDeInputLocal(values.inicio);
    const fim = millisDeInputLocal(values.fim);
    if (inicio === null || fim === null) return;
    // O MESMO parse que `validarCondicaoDesconto` usou para liberar o botão —
    // não um segundo `Number(...)` que pode discordar dele (FIX-PARSE-DINHEIRO).
    const valor = parseValorCondicao(values.tipo, values.valor);
    if (valor === null) return;
    setErro(null);
    setEnviando(true);
    try {
      const r = await definirCondicaoDesconto({
        parceriaId,
        eventoId: values.eventoId,
        codigo: values.codigo,
        tipo: values.tipo,
        valor,
        tetoUso: tetoUsoParaNumero(values.tetoUso),
        inicioEmMillis: inicio,
        fimEmMillis: fim,
      });
      toast({
        variant: 'success',
        title: 'Condição de desconto definida',
        description: `Cupom ${r.codigo} ativo no evento selecionado.`,
      });
      refetch();
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setEnviando(false);
    }
  }

  if (loading || session.status === 'loading') {
    return (
      <div className="mx-auto w-full max-w-2xl p-[var(--spacing-6)]" role="status" aria-label="Carregando parceria">
        <Skeleton variant="rect" className="h-56" />
      </div>
    );
  }

  if (!parceria) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]">
        <AuthAlert tone="info" message="Parceria não encontrada. Ela pode ter sido removida ou você não tem acesso." />
        <div>
          <Button variant="secondary" onClick={() => navigate('/clubes/assessorias')}>
            Voltar para assessorias
          </Button>
        </div>
      </div>
    );
  }

  const statusBadge = statusParceriaBadge(parceria.status);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
      <header className="flex flex-col gap-[var(--spacing-2)]">
        <button
          type="button"
          onClick={() => navigate('/clubes/assessorias')}
          className="w-fit text-[length:var(--font-size-sm)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ← Assessorias
        </button>
        <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
          <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
            {parceria.nome}
          </h1>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </div>
      </header>

      {/* Dados da parceria */}
      <section className={SECAO} aria-label="Dados da parceria">
        <span className={SECAO_TITULO}>Dados</span>
        <dl className="grid grid-cols-1 gap-[var(--spacing-3)] sm:grid-cols-2">
          <Campo termo="Documento" valor={formatarDocumentoValor(parceria.documento.tipo, parceria.documento.valor)} />
          <Campo termo="Responsável" valor={parceria.responsavelEmail} />
          <Campo termo="Clube parceiro" valor={parceria.clubeRef} />
          <Campo
            termo="Condição vigente"
            valor={
              parceria.condicaoDesconto
                ? `${parceria.condicaoDesconto.codigo} · ${
                    parceria.condicaoDesconto.tipo === 'percentual'
                      ? `${parceria.condicaoDesconto.valor}%`
                      : `R$ ${parceria.condicaoDesconto.valor.toFixed(2)}`
                  }`
                : 'Sem condição definida'
            }
          />
        </dl>
      </section>

      {/* Editor da condição de desconto (S1802) — só parceria ATIVA */}
      {parceria.status === 'ativa' ? (
        <form className={SECAO} onSubmit={(e) => void onSubmit(e)} aria-label="Condição de desconto">
          <span className={SECAO_TITULO}>
            {parceria.condicaoDesconto ? 'Redefinir condição de desconto' : 'Definir condição de desconto'}
          </span>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            A condição vira um cupom exclusivo do club parceiro num evento seu — sem comissão e sem
            split. Redefinir desativa a condição anterior sem apagar a trilha.
          </p>
          {erro ? <AuthAlert message={erro} /> : null}

          <Select
            id="condicao-evento"
            label="Evento"
            value={values.eventoId}
            onChange={(e) => set('eventoId', e.target.value)}
            options={eventoOpcoes}
          />
          <Input
            id="condicao-codigo"
            label="Código do cupom"
            value={values.codigo}
            onChange={(e) => set('codigo', e.target.value.toUpperCase())}
            placeholder="PARCEIRO10"
          />
          <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
            <Select
              id="condicao-tipo"
              label="Tipo"
              value={values.tipo}
              onChange={(e) => set('tipo', e.target.value as CondicaoDescontoValues['tipo'])}
              options={[
                { value: 'percentual', label: 'Percentual (%)' },
                { value: 'fixo', label: 'Valor fixo (R$)' },
              ]}
            />
            <Input
              id="condicao-valor"
              label={values.tipo === 'percentual' ? 'Percentual (0–100)' : 'Valor em R$'}
              type="text"
              inputMode="decimal"
              value={values.valor}
              onChange={(e) => set('valor', e.target.value)}
              placeholder={values.tipo === 'percentual' ? '10' : '25,00'}
              {...(erroValor !== null ? { errorMessage: erroValor } : {})}
            />
          </div>
          <Input
            id="condicao-teto"
            label="Teto de usos (vazio = ilimitado)"
            type="text"
            inputMode="numeric"
            value={values.tetoUso}
            onChange={(e) => set('tetoUso', e.target.value)}
            placeholder="Deixe vazio para ilimitado"
            {...(erroTeto !== null ? { errorMessage: erroTeto } : {})}
          />
          <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
            <DateTimeField
              id="condicao-inicio"
              label="Início da validade"
              value={values.inicio}
              onChange={(inicio) => set('inicio', inicio)}
            />
            <DateTimeField
              id="condicao-fim"
              label="Fim da validade"
              value={values.fim}
              onChange={(fim) => set('fim', fim)}
            />
          </div>

          <div>
            <Button type="submit" variant="primary" disabled={!podeSalvar}>
              {enviando ? 'Salvando…' : 'Salvar condição'}
            </Button>
          </div>
        </form>
      ) : (
        <section className={SECAO} aria-label="Condição de desconto indisponível">
          <span className={SECAO_TITULO}>Condição de desconto</span>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {parceria.status === 'convite_pendente'
              ? 'A condição de desconto só pode ser definida depois que o responsável aceitar o convite e a parceria ficar ativa (RN-364).'
              : 'Esta parceria foi encerrada — não é possível definir condição de desconto.'}
          </p>
        </section>
      )}
    </div>
  );
}

function Campo({ termo, valor }: { termo: string; valor: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">{termo}</dt>
      <dd className="text-[length:var(--font-size-sm)] text-[var(--text-primary)] break-words">{valor}</dd>
    </div>
  );
}

ParceriaDetailPage.displayName = 'ParceriaDetailPage';
