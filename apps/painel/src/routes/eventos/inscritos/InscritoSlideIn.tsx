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
  ConfirmModal,
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
  formatarCodigoPedido,
  idadeNaData,
  pedidoDeGrupo,
  type GeneroInscrito,
  type Inscrito,
  type Pagamento,
  type Pedido,
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
import { rotuloSufixo } from '../_lib/gradeTamanhos';

export interface InscritoSlideInProps {
  /** Inscrito em foco; null = painel fechado. */
  inscrito: Inscrito | null;
  /** Join `[pag]` (pedido + pagamento) — null enquanto carrega/idle. */
  pedidoEPagamento: PedidoEPagamentoDoInscrito | null;
  loadingPagamento: boolean;
  erroPagamento: Error | null;
  onClose: () => void;
  /**
   * Dispara o estorno do inscrito em foco (mutation do backend) — injetado
   * pelo container. Recebe SÓ o motivo: o valor é decisão do servidor (RN-337).
   * Ausente = ação de estorno não é oferecida (ex.: render isolado em teste).
   * Rejeita quando o callable falha (o container mostra o Toast honesto).
   */
  onEstornar?: (motivo: string) => Promise<void>;
  /** Estorno em andamento — desabilita a confirmação (spinner do container). */
  estornando?: boolean;
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
  onEstornar,
  estornando = false,
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
          onEstornar={onEstornar}
          estornando={estornando}
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
            ? // RN-231 (fix A5 da review): o valor é o SUFIXO de SKU — exibe
              // "Feminina M" em vez do cru "feminina__M" (rotuloSufixo).
              tamanhosEntries.map(([item, t]) => `${item}: ${rotuloSufixo(t)}`).join(' · ')
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
  onEstornar,
  estornando,
}: {
  inscrito: Inscrito;
  dados: PedidoEPagamentoDoInscrito | null;
  loading: boolean;
  erro: Error | null;
  // `| undefined` explícito (exactOptionalPropertyTypes): o valor destructurado
  // do prop público opcional pode chegar undefined.
  onEstornar: ((motivo: string) => Promise<void>) | undefined;
  estornando: boolean;
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
        <CampoPedido pedido={pedido} />
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

      <AcaoEstorno
        inscrito={inscrito}
        pedido={pedido}
        pagamento={pagamento}
        onEstornar={onEstornar}
        estornando={estornando}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ação de estorno por inscrito (E04 · FABLE-B · ADR-011/RN-341)
//
// DINHEIRO: o valor exibido é `pedido.itens[].valorFinal` — a LINHA deste
// inscrito, escrita pelo servidor (a MESMA fonte que a Function usa, RN-337).
// NENHUMA aritmética de valor aqui: só leitura do campo do backend. O callable
// (via onEstornar) recebe SÓ o motivo; o quanto estornar é decisão do servidor.
// ---------------------------------------------------------------------------

function AcaoEstorno({
  inscrito,
  pedido,
  pagamento,
  onEstornar,
  estornando,
}: {
  inscrito: Inscrito;
  pedido: Pedido;
  pagamento: Pagamento | null;
  onEstornar: ((motivo: string) => Promise<void>) | undefined;
  estornando: boolean;
}): JSX.Element | null {
  const [aberto, setAberto] = React.useState(false);

  // Estado terminal (matriz canônica): já estornado — sem ação. O Badge do
  // estado vive no cabeçalho (status do inscrito) e no bloco de pagamento
  // (ambos 'estornado' → neutro); aqui fica só a nota honesta do que aconteceu.
  if (inscrito.status === 'estornado') {
    return (
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        Inscrição estornada — valor devolvido ao pagador.
      </p>
    );
  }

  // A linha do inscrito no pedido — o VALOR vem do backend (itens[].valorFinal),
  // nunca recalculado no cliente. Sem linha ou valor 0 ⇒ nada a devolver (o
  // caminho certo é cancelamento; a Function também nega, mas não oferecemos).
  const item = pedido.itens.find((i) => i.inscritoRef === inscrito.id);
  const podeEstornar =
    !!onEstornar &&
    inscrito.status === 'confirmado' &&
    pedido.status === 'pago' &&
    pagamento?.status === 'confirmado' &&
    !!item &&
    item.valorFinal > 0;

  if (!podeEstornar || !item) return null;

  const valorLabel = formatDinheiro(item.valorFinal);

  async function confirmar(motivo: string): Promise<void> {
    try {
      await onEstornar?.(motivo);
      setAberto(false); // fecha só no sucesso
    } catch {
      // Erro já sinalizado pelo container (Toast honesto do gate) — mantém o
      // modal aberto para nova tentativa com o mesmo motivo.
    }
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <Button variant="secondary" onClick={() => setAberto(true)} disabled={estornando}>
        Estornar inscrição
      </Button>
      <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
        Devolve a partir de {valorLabel} ao pagador. Os demais inscritos do pedido
        não são afetados.
      </span>

      <ConfirmModal
        open={aberto}
        onOpenChange={(o) => !o && setAberto(false)}
        title="Estornar inscrição"
        description="O valor da linha deste inscrito volta ao pagador. Dentro da janela de arrependimento o estorno sai na hora e a taxa de serviço volta junto; fora dela o pedido entra na fila de análise do organizador e a taxa fica retida. Quem decide a rota é o servidor, pela política do evento. Os demais inscritos do pedido não são afetados (estorno por inscrito)."
        target={
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              {inscrito.atletaNome}
            </span>
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              Valor a devolver:{' '}
              <strong className="text-[var(--text-primary)]">{valorLabel}</strong>
            </span>
          </div>
        }
        loses={[
          `Devolução de ${valorLabel} ao pagador (mais a taxa de serviço, dentro da janela de arrependimento)`,
          'A inscrição do atleta (deixa de correr e de receber o kit)',
        ]}
        keeps={[
          'Os demais inscritos do mesmo pedido',
          'O cadastro do atleta na Be Hero',
          'A vaga no lote — ela NÃO volta sozinha (ajuste a capacidade se quiser revender)',
        ]}
        reasonLabel="Motivo do estorno (obrigatório — registrado na auditoria)"
        confirmLabel={`Estornar ${valorLabel}`}
        loading={estornando}
        onConfirm={(d) => void confirmar(d.reason)}
      />
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
            valor={
              <span className="flex flex-wrap items-center gap-[var(--spacing-2)]">
                <span>{`${pagamento.cupom.codigo}${
                  pagamento.cupom.descontoPct !== undefined ? ` · ${pagamento.cupom.descontoPct}%` : ''
                } · Aplicado`}</span>
                {/* Cupom de club parceiro (E18 · RN-364): atribuição ao clube. */}
                {pagamento.cupom.clubeRef ? (
                  <Badge variant="neutro">{`Club parceiro · ${pagamento.cupom.clubeRef}`}</Badge>
                ) : null}
              </span>
            }
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
 * Campo "Pedido" (RN-475 · S1228-T3) — o operador lê o CÓDIGO da compra.
 *
 * POR QUE O ID INTERNO SAI DA VISTA. O id do documento é `ped-{uid}-{chave}`
 * por construção, então imprimi-lo publica o **uid da conta do comprador** —
 * o identificador que correlaciona a pessoa no sistema inteiro — numa tela que
 * o operador fotografa e cola em chamado. Setenta e três caracteres era o
 * sintoma; o uid viajando é o dano.
 *
 * AUSÊNCIA É AUSÊNCIA. Compra anterior à S1228 (o backfill da 5b ainda não
 * rodou) não tem código, e o que aparece é um travessão — nunca o id no lugar.
 * Um fallback aqui seria um ramo permanente para reintroduzir o vazamento em
 * condição rara, que é a pior forma de mantê-lo. Quem decide é
 * `formatarCodigoPedido`, do core: string vazia quando não há código válido.
 *
 * O ID CONTINUA DISPONÍVEL PARA COPIAR, e essa é a ponte que a spec exige: o
 * estorno da plataforma (`EstornosAdminRoute`) age cross-tenant e segue pedindo
 * o id interno digitado, porque aceitar o código curto ali criaria um oráculo
 * de cinco símbolos. Quem recebe um `PED-` do comprador acha a compra pela
 * busca desta tela e copia o id daqui. Copiar não é exibir: o valor vai ao
 * clipboard sem entrar no DOM.
 */
function CampoPedido({ pedido }: { pedido: Pedido }): JSX.Element {
  const codigo = formatarCodigoPedido(pedido.codigoPedido);
  const [aviso, setAviso] = React.useState('');

  async function copiarIdInterno(): Promise<void> {
    // Sem clipboard (jsdom, http sem contexto seguro, permissão negada) o
    // honesto é dizer que não copiou — nunca fingir sucesso e deixar o
    // operador colar o conteúdo anterior da área de transferência.
    const escrever = navigator.clipboard?.writeText.bind(navigator.clipboard);
    if (!escrever) {
      setAviso('Não foi possível copiar o id interno.');
      return;
    }
    try {
      await escrever(pedido.id);
      setAviso('Id interno copiado.');
    } catch {
      setAviso('Não foi possível copiar o id interno.');
    }
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-1)]">
      <dt className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">Pedido</dt>
      <dd className="flex flex-wrap items-center gap-[var(--spacing-2)] text-[length:var(--font-size-base)] text-[var(--text-primary)]">
        {codigo ? (
          <span className="font-mono text-[length:var(--font-size-sm)]">{codigo}</span>
        ) : (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">Compra sem código</span>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => void copiarIdInterno()}>
          Copiar id interno
        </Button>
        {/*
          Região viva SEMPRE montada (anúncio de região recém-inserida é
          silencioso em parte dos leitores) e DENTRO da linha do campo: vazia
          ela não gera caixa nenhuma, então não abre buraco embaixo do valor.
        */}
        <span
          aria-live="polite"
          className="text-[length:var(--font-size-xs)] text-[var(--text-secondary)]"
        >
          {aviso}
        </span>
      </dd>
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
