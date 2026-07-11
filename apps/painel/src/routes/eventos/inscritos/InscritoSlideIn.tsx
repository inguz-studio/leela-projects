// =============================================================================
// InscritoSlideIn — painel deslizante RICO de detalhe do inscrito (S203-T3).
//
// Abre à direita ao clicar numa linha. Acessível (role=dialog, aria-modal,
// foco no título, fecha por overlay / botão / Esc). PRESENTATIONAL: recebe o
// inscrito (`[reg]`) e o join pedido→pagamento (`[pag]`) já resolvidos por
// props — o fetch vive no container `InscritoSlideInConnected` (ADR-010).
//
// 4 abas (§2.7): Geral `[reg]` + Pagamento `[pag]` com DADO REAL; Comunicação
// `[com]` e Histórico `[hist]` dependem do módulo de comunicação (FABLE-G, não
// feito) → EmptyState honesto, NUNCA dado falso.
//
// PII/LGPD (S203-T3): CPF e telefone MASCARADOS por padrão, com toggle de
// revelação explícito; restrições médicas (dado SENSÍVEL) atrás de disclosure
// — não renderizadas de cara. Nada de PII no console. Máscara é UX, não
// controle de acesso (as Rules já barram quem não é organizador do tenant).
//
// Reuso-first: DS (Avatar, Badge, Button, IconButton, EmptyState, Skeleton,
// Tabs, Divider) + helpers puros do _lib (format, pii). Nenhum primitivo novo
// de DS foi criado — as peças de PII (CampoMascarado/DisclosureSaude) compõem
// primitivos existentes e são específicas desta feature (a11y de revelação).
// =============================================================================

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  EmptyState,
  IconButton,
  Skeleton,
  Tabs,
  type BadgeProps,
  type TabItem,
} from '@leela/design-system';
import {
  FUSO_EVENTO,
  idadeNaData,
  pedidoDeGrupo,
  type GeneroInscrito,
  type Inscrito,
  type Pagamento,
  type StatusPagamento,
  type StatusPedido,
} from '@leela/core';
import type { PedidoEPagamentoDoInscrito } from '@leela/api-client';
import { kitInscritoBadge } from '../_lib/kitLabels';
import { statusInscritoBadge } from '../_lib/statusInscrito';
import {
  formatDataCurta,
  formatDataHoraCurta,
  formatDinheiro,
  formatNascimento,
} from '../_lib/format';
import {
  formatarCpf,
  formatarTelefone,
  mascararCpf,
  mascararTelefone,
} from '../_lib/pii';

export interface InscritoSlideInProps {
  /** Inscrito em foco; null = painel fechado. */
  inscrito: Inscrito | null;
  /** Join `[pag]` (pedido + pagamento) — null enquanto carrega/idle. */
  pedidoEPagamento: PedidoEPagamentoDoInscrito | null;
  loadingPagamento: boolean;
  erroPagamento: Error | null;
  onClose: () => void;
  /** "Agora" injetável (determinismo do cálculo de idade). */
  agora?: Date;
}

const GENERO_LABEL: Record<GeneroInscrito, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
  nao_informado: 'Não informado',
};

const STATUS_PEDIDO_VARIANT: Record<StatusPedido, NonNullable<BadgeProps['variant']>> = {
  pendente: 'alerta',
  pago: 'vitoria',
  falhou: 'vulcao',
  cancelado: 'neutro',
};

const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  falhou: 'Falhou',
  cancelado: 'Cancelado',
};

const STATUS_PAGAMENTO_VARIANT: Record<StatusPagamento, NonNullable<BadgeProps['variant']>> = {
  pendente: 'alerta',
  confirmado: 'vitoria',
  falhou: 'vulcao',
  estornado: 'neutro',
  cancelado: 'neutro',
};

const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  falhou: 'Falhou',
  estornado: 'Estornado',
  cancelado: 'Cancelado',
};

export function InscritoSlideIn({
  inscrito,
  pedidoEPagamento,
  loadingPagamento,
  erroPagamento,
  onClose,
  agora = new Date(),
}: InscritoSlideInProps): JSX.Element | null {
  const tituloRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    if (!inscrito) return;
    tituloRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inscrito, onClose]);

  if (!inscrito) return null;

  const status = statusInscritoBadge(inscrito.status);

  const tabs: TabItem[] = [
    {
      id: 'geral',
      label: 'Geral',
      content: <AbaGeral inscrito={inscrito} agora={agora} />,
    },
    {
      id: 'pagamento',
      label: 'Pagamento',
      content: (
        <AbaPagamento
          inscrito={inscrito}
          dados={pedidoEPagamento}
          loading={loadingPagamento}
          erro={erroPagamento}
        />
      ),
    },
    {
      id: 'comunicacao',
      label: 'Comunicação',
      content: (
        <EmptyState
          title="Comunicação indisponível"
          description="O histórico de e-mails e mensagens ao atleta chega com o módulo de comunicação."
        />
      ),
    },
    {
      id: 'historico',
      label: 'Histórico',
      content: (
        <EmptyState
          title="Histórico indisponível"
          description="A trilha de eventos da inscrição chega com o módulo de comunicação e auditoria."
        />
      ),
    },
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Fechar detalhe"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[var(--modal-overlay-bg)] backdrop-blur-[var(--modal-overlay-blur)]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="inscrito-slidein-titulo"
        className="fixed right-0 top-0 z-50 flex h-full w-[var(--modal-width-md)] max-w-[calc(100vw-var(--spacing-8))] flex-col gap-[var(--spacing-5)] overflow-y-auto bg-[var(--surface-raised)] p-[var(--spacing-6)] shadow-[var(--elevation-3)]"
      >
        <div className="flex items-start justify-between gap-[var(--spacing-4)]">
          <div className="flex items-center gap-[var(--spacing-3)]">
            <Avatar size="md" name={inscrito.atletaNome} />
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <h2
                ref={tituloRef}
                id="inscrito-slidein-titulo"
                tabIndex={-1}
                className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)] focus:outline-none"
              >
                {inscrito.atletaNome}
              </h2>
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                {inscrito.modalidade || 'Modalidade não definida'}
              </span>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <Tabs tabs={tabs} aria-label="Seções do detalhe do inscrito" />

        <div className="mt-auto pt-[var(--spacing-2)]">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Aba Geral [reg] — dados pessoais do titular (PII mascarada + disclosure)
// ---------------------------------------------------------------------------

function AbaGeral({ inscrito, agora }: { inscrito: Inscrito; agora: Date }): JSX.Element {
  const dp = inscrito.dadosPessoais;
  const kit = kitInscritoBadge(inscrito.kit);

  if (!dp) {
    return (
      <EmptyState
        title="Dados pessoais indisponíveis"
        description="Coletados no checkout — inscrição legada ou ainda sem cadastro completo."
      />
    );
  }

  const tamanhosEntries = Object.entries(inscrito.tamanhos);

  return (
    <dl className="flex flex-col gap-[var(--spacing-4)]">
      <CampoMascarado
        termo="CPF"
        valorMascarado={mascararCpf(dp.cpf)}
        valorRevelado={formatarCpf(dp.cpf)}
      />
      <CampoMascarado
        termo="Telefone"
        valorMascarado={mascararTelefone(dp.telefone)}
        valorRevelado={formatarTelefone(dp.telefone)}
      />
      <Campo termo="Nascimento" valor={`${formatNascimento(dp.nascimento)} (${idadeSegura(dp.nascimento, agora)})`} />
      <Campo termo="Gênero" valor={GENERO_LABEL[dp.genero]} />
      <Campo termo="Cidade/UF" valor={`${dp.cidade}/${dp.uf}`} />
      <Campo termo="Modalidade" valor={inscrito.modalidade || '—'} />
      <Campo termo="Kit" valor={<Badge variant={kit.variant}>{kit.label}</Badge>} />
      <Campo
        termo="Tamanhos do kit"
        valor={
          tamanhosEntries.length > 0
            ? tamanhosEntries.map(([item, t]) => `${item}: ${t}`).join(' · ')
            : 'Kit sem item tamanhado'
        }
      />
      {dp.contatoEmergencia && (
        <CampoMascarado
          termo={`Contato de emergência (${dp.contatoEmergencia.nome})`}
          valorMascarado={mascararTelefone(dp.contatoEmergencia.telefone)}
          valorRevelado={formatarTelefone(dp.contatoEmergencia.telefone)}
        />
      )}

      <Divider />
      <DisclosureSaude restricoes={dp.restricoesMedicas} />
    </dl>
  );
}

/** Idade sem vazar a data em log de erro (fail-soft na exibição). */
function idadeSegura(nascimentoISO: string, agora: Date): string {
  try {
    return `${idadeNaData(nascimentoISO, agora, FUSO_EVENTO)} anos`;
  } catch {
    return 'idade indisponível';
  }
}

// ---------------------------------------------------------------------------
// Aba Pagamento [pag] — pedido + pagamento REAIS (join ADR-011)
// ---------------------------------------------------------------------------

function AbaPagamento({
  inscrito,
  dados,
  loading,
  erro,
}: {
  inscrito: Inscrito;
  dados: PedidoEPagamentoDoInscrito | null;
  loading: boolean;
  erro: Error | null;
}): JSX.Element {
  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--spacing-3)]" role="status" aria-label="Carregando pagamento">
        <Skeleton variant="rect" className="h-16" />
        <Skeleton variant="rect" className="h-24" />
      </div>
    );
  }
  if (erro) {
    // Sem vazar detalhe do erro (pode conter refs/ids) — mensagem honesta.
    return (
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
        Não foi possível carregar o pedido deste inscrito.
      </p>
    );
  }

  const pedido = dados?.pedido ?? null;
  const pagamento = dados?.pagamento ?? null;

  if (!pedido) {
    return (
      <EmptyState
        title="Sem pedido vinculado"
        description="Inscrição anterior ao modelo de pedido (legada) ou ainda sem checkout concluído."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <dl className="flex flex-col gap-[var(--spacing-4)]">
        <Campo termo="Pedido" valor={<span className="font-mono text-[length:var(--font-size-sm)]">{pedido.id}</span>} />
        <Campo
          termo="Status do pedido"
          valor={<Badge variant={STATUS_PEDIDO_VARIANT[pedido.status]}>{STATUS_PEDIDO_LABEL[pedido.status]}</Badge>}
        />
        {inscrito.ehResponsavel && pedidoDeGrupo(pedido) && (
          <Campo
            termo="Responsável"
            valor={`Responsável pelo pedido de ${pedido.inscritoRefs.length} inscritos`}
          />
        )}
      </dl>

      {pagamento ? (
        <BlocoPagamento pagamento={pagamento} />
      ) : (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Pagamento ainda não gerado — pedido pendente de cobrança.
        </p>
      )}

      {pedido.status === 'pago' && (
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <Button variant="secondary" disabled>
            Reembolsar inscrição
          </Button>
          <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
            Reembolso com confirmação e histórico chega no próximo lote (B-T2).
          </span>
        </div>
      )}
    </div>
  );
}

function BlocoPagamento({ pagamento }: { pagamento: Pagamento }): JSX.Element {
  const lote = pagamento.loteNome ? ` · ${pagamento.loteNome}` : '';
  const conc = pagamento.conciliacao;

  return (
    <>
      <Divider />
      <dl className="flex flex-col gap-[var(--spacing-4)]">
        <Campo termo="Valor da inscrição" valor={`${formatDinheiro(pagamento.valorBase)}${lote}`} />
        {pagamento.cupom && (
          <Campo
            termo="Cupom aplicado"
            valor={`${pagamento.cupom.codigo}${
              pagamento.cupom.descontoPct !== undefined ? ` · ${pagamento.cupom.descontoPct}%` : ''
            } · Aplicado`}
          />
        )}
        {pagamento.desconto > 0 && (
          <Campo termo="Desconto" valor={`– ${formatDinheiro(pagamento.desconto)}`} />
        )}
        <Campo
          termo="Valor final pago"
          valor={
            <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
              {formatDinheiro(pagamento.valorFinal)}
            </span>
          }
        />
        {pagamento.pagoEm && (
          <Campo termo="Data do pagamento" valor={formatDataHoraCurta(pagamento.pagoEm)} />
        )}
        <Campo termo="Forma de pagamento" valor={<FormaPagamentoValor pagamento={pagamento} />} />
        <Campo
          termo="Status do pagamento"
          valor={
            <Badge variant={STATUS_PAGAMENTO_VARIANT[pagamento.status]}>
              {STATUS_PAGAMENTO_LABEL[pagamento.status]}
            </Badge>
          }
        />
      </dl>

      {conc && (
        <>
          <Divider />
          <dl className="flex flex-col gap-[var(--spacing-4)]">
            <Campo termo="Taxa Be Hero" valor={`– ${formatDinheiro(conc.taxaValor)}`} />
            <Campo termo="Repasse ao organizador" valor={formatDinheiro(conc.repasseOrganizador)} />
            {conc.repassePrevistoEm && (
              <Campo termo="Previsão de repasse" valor={formatDataCurta(conc.repassePrevistoEm)} />
            )}
          </dl>
        </>
      )}
    </>
  );
}

function FormaPagamentoValor({ pagamento }: { pagamento: Pagamento }): JSX.Element {
  if (pagamento.forma === 'pix') {
    return <span>Pix</span>;
  }
  const c = pagamento.cartao;
  if (!c) return <span>Cartão de crédito</span>;
  return (
    <span className="flex flex-col gap-[var(--spacing-1)]">
      <span>{`${c.bandeira} •••• ${c.ultimos4} · ${c.parcelas}× de ${formatDinheiro(c.valorParcela)}`}</span>
      {c.parcelas > 1 && (
        <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
          {`Total com juros ${formatDinheiro(c.valorTotalComJuros)} — à vista p/ organizador, parcelado p/ atleta.`}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Campos — reuso do padrão dt/dd; CampoMascarado adiciona toggle de PII
// ---------------------------------------------------------------------------

function Campo({ termo, valor }: { termo: string; valor: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">{termo}</dt>
      <dd className="text-[length:var(--font-size-base)] text-[var(--text-primary)]">{valor}</dd>
    </div>
  );
}

/**
 * Campo de PII mascarado por padrão (LGPD). O valor REAL só entra no DOM
 * quando o organizador clica em "mostrar" — reduz exposição de ombro e de
 * screenshot. `aria-label` do toggle descreve a ação e o campo.
 */
function CampoMascarado({
  termo,
  valorMascarado,
  valorRevelado,
}: {
  termo: string;
  valorMascarado: string;
  valorRevelado: string;
}): JSX.Element {
  const [revelado, setRevelado] = React.useState(false);
  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">{termo}</dt>
      <dd className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-base)] text-[var(--text-primary)]">
        <span className={revelado ? undefined : 'font-mono'}>
          {revelado ? valorRevelado : valorMascarado}
        </span>
        <IconButton
          aria-label={`${revelado ? 'Ocultar' : 'Mostrar'} ${termo}`}
          aria-pressed={revelado}
          onClick={() => setRevelado((v) => !v)}
        >
          {revelado ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </IconButton>
      </dd>
    </div>
  );
}

/**
 * Restrições médicas (dado SENSÍVEL — LGPD art. 5º, II) atrás de disclosure:
 * o texto NÃO é renderizado até o organizador clicar em "Ver dados de saúde".
 * Mesmo a ausência de restrição fica atrás do gesto (consistência + nudge de
 * cuidado com dado de saúde).
 */
function DisclosureSaude({ restricoes }: { restricoes: string | undefined }): JSX.Element {
  const [aberto, setAberto] = React.useState(false);
  const regiaoId = React.useId();
  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
        Dados de saúde
      </dt>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={regiaoId}
        onClick={() => setAberto((v) => !v)}
        className="w-fit text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-brand)] hover:underline"
      >
        {aberto ? 'Ocultar dados de saúde' : 'Ver dados de saúde'}
      </button>
      {aberto && (
        <dd
          id={regiaoId}
          className="rounded-[var(--radius-md)] bg-[var(--surface-sunken,var(--surface-base))] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
        >
          {restricoes && restricoes.length > 0 ? restricoes : 'Nenhuma restrição médica informada.'}
        </dd>
      )}
    </div>
  );
}

InscritoSlideIn.displayName = 'InscritoSlideIn';
