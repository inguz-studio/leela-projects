// =============================================================================
// InfluenciadoresPage — `/parcerias/afiliacoes` (R9-E · S-R9-11-T8 ·
// RN-319, lado do ORGANIZADOR). Vendas/conversões de clube-influenciador e
// influenciador PF de TODOS os eventos do tenant, na aba Clubs. FASE 2 (COMF2):
// comissão acumulada/repassada/saldo por afiliado + registro de repasse MANUAL
// (registrarRepasseComissao — pagamento feito FORA da plataforma, idempotente).
// Dados via reader server-side (getAfiliadosDoTenant — escopo da claim).
//
// S705-T2 · RN-385 — repasse PARCIAL: o modal deixou de mandar o saldo inteiro
// e passou a mandar um VALOR informado, que nasce igual ao saldo (um clique
// continua quitando tudo) e é editável para baixo. A guarda de tela é espelho,
// não autoridade: quem compara valor × saldo é a transação do servidor.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ConfirmModal,
  EmptyState,
  FilterBar,
  Input,
  Modal,
  ResultCount,
  SearchInput,
  KpiCard,
  PageHeader,
  Skeleton,
  Table,
  useToast,
} from '@leela/design-system';
import type { TableColumn } from '@leela/design-system';
import {
  getAfiliadosDoTenant,
  registrarRepasseComissao,
  type AfiliadoDoTenant,
} from '@leela/api-client';
import { REGUA_PONTO_E_VIRGULA } from '../../../lib/textosDeCampo';
import { avaliarRepasse, textoInicialRepasse } from './_lib/repasseForm';
import { ExtratoRepasses } from './_components/ExtratoRepasses';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function badgeDoStatus(status: string): JSX.Element {
  if (status === 'ativo') return <Badge variant="vitoria">Ativo</Badge>;
  if (status === 'convite_pendente') return <Badge variant="heroico">Convite pendente</Badge>;
  return <Badge variant="neutro">Inativo</Badge>;
}

function mensagemErroRepasse(err: unknown): string {
  const code = (err as { code?: string; message?: string })?.code ?? '';
  const msg = (err as { message?: string })?.message ?? '';
  if (code.includes('permission-denied')) {
    return 'Você não tem permissão para registrar repasses deste afiliado.';
  }
  if (code.includes('failed-precondition') || msg.includes('saldo')) {
    return 'O valor excede o saldo de comissão disponível.';
  }
  return 'Não foi possível registrar o repasse. Tente novamente.';
}

export function InfluenciadoresPage(): JSX.Element {
  const { toast } = useToast();
  const [afiliados, setAfiliados] = useState<AfiliadoDoTenant[] | null>(null);
  const [erro, setErro] = useState<Error | null>(null);
  const [busca, setBusca] = useState('');

  // Repasse manual (FASE 2): idempotência amigável — o repasseId nasce ao ABRIR
  // o modal e é REUSADO em qualquer retry (replay não debita 2×).
  const [alvoRepasse, setAlvoRepasse] = useState<AfiliadoDoTenant | null>(null);
  const [repasseId, setRepasseId] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [processando, setProcessando] = useState(false);
  // Extrato do lado de QUEM PAGA (S705-T3): antes de adiantar mais um pedaço,
  // o organizador precisa ver o que já adiantou.
  const [alvoExtrato, setAlvoExtrato] = useState<AfiliadoDoTenant | null>(null);

  // Identidade ESTÁVEL de propósito, não estética: o focus trap do Modal
  // (`useDialogBehavior`) tem `onClose` na lista de dependências do efeito e
  // devolve o foco ao botão de fechar toda vez que ele roda. Com um handler
  // inline (nova função a cada render) o efeito re-roda a cada tecla e o campo
  // de valor perde o foco depois do PRIMEIRO caractere — só "2" de "200"
  // entraria. Achado desta lane, provado pelo teste de repasse parcial.
  const fecharRepasse = useCallback(
    (aberto: boolean) => {
      if (!aberto && !processando) setAlvoRepasse(null);
    },
    [processando],
  );

  const fecharExtrato = useCallback((aberto: boolean) => {
    if (!aberto) setAlvoExtrato(null);
  }, []);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const r = await getAfiliadosDoTenant();
      setAfiliados(r.afiliados);
    } catch (e) {
      setErro(e instanceof Error ? e : new Error('falha'));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const lista = afiliados ?? [];
    const q = busca.trim().toLowerCase();
    if (q === '') return lista;
    return lista.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) ||
        a.refCodigo.toLowerCase().includes(q) ||
        a.eventoNome.toLowerCase().includes(q),
    );
  }, [afiliados, busca]);

  const kpis = useMemo(() => {
    const lista = afiliados ?? [];
    return {
      afiliados: lista.length,
      inscricoes: lista.reduce((acc, a) => acc + a.conversoes, 0),
      valor: lista.reduce((acc, a) => acc + a.valorAtribuido, 0),
      // Saldo em aberto = só os saldos POSITIVOS (dívidas não abatem o total a pagar).
      saldoAberto: lista.reduce((acc, a) => acc + Math.max(0, a.saldoComissao), 0),
    };
  }, [afiliados]);

  function abrirRepasse(a: AfiliadoDoTenant): void {
    setRepasseId(crypto.randomUUID());
    // RN-385: o campo já nasce com o saldo integral — quem quer quitar tudo
    // continua a um clique; quem quer adiantar parte edita para baixo.
    setValorTexto(textoInicialRepasse(a.saldoComissao));
    setAlvoRepasse(a);
  }

  // Espelho da guarda do servidor (`_lib/repasseForm`) — UX, nunca autoridade:
  // `registrarRepasseComissaoCore` reconfere o teto DENTRO da transação.
  const avaliacao = avaliarRepasse(valorTexto, alvoRepasse?.saldoComissao ?? 0);

  async function confirmarRepasse(observacao: string): Promise<void> {
    if (alvoRepasse === null) return;
    if (!avaliacao.podeEnviar || avaliacao.valor === null) {
      // Bloqueia ANTES da chamada. O hint já está sob o campo; o toast existe
      // para que o clique nunca seja silencioso.
      toast({
        variant: 'danger',
        title: avaliacao.hint ?? 'Informe um valor válido para o repasse.',
      });
      return;
    }
    setProcessando(true);
    try {
      const obs = observacao.trim();
      const r = await registrarRepasseComissao({
        eventoId: alvoRepasse.eventoId,
        afiliadoId: alvoRepasse.refCodigo,
        repasseId,
        valor: avaliacao.valor,
        ...(obs !== '' ? { observacao: obs } : {}),
      });
      toast({
        variant: 'success',
        title: r.duplicado ? 'Repasse já estava registrado' : 'Repasse registrado',
        description: `Novo saldo de comissão: ${formatBRL(r.saldoComissao)}`,
      });
      setAlvoRepasse(null);
      await carregar();
    } catch (err) {
      toast({ variant: 'danger', title: mensagemErroRepasse(err) });
    } finally {
      setProcessando(false);
    }
  }

  const colunas: TableColumn<AfiliadoDoTenant>[] = [
    {
      key: 'afiliado',
      header: 'Influenciador',
      render: (a) => (
        <div className="flex flex-col">
          <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">{a.nome}</span>
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {a.tipo === 'clube' ? 'Clube' : 'Pessoa física'} · <code>{a.refCodigo}</code>
          </span>
        </div>
      ),
    },
    { key: 'evento', header: 'Evento', render: (a) => a.eventoNome },
    { key: 'status', header: 'Status', render: (a) => badgeDoStatus(a.status) },
    {
      key: 'inscricoes',
      header: 'Inscrições',
      align: 'right',
      render: (a) =>
        `${a.conversoes.toLocaleString('pt-BR')}${a.minimoInscricoes !== null ? ` / mín. ${a.minimoInscricoes}` : ''}`,
    },
    {
      key: 'comissao',
      header: 'Comissão (saldo)',
      align: 'right',
      render: (a) => {
        const devendo = a.saldoComissao < 0;
        return (
          <div className="flex flex-col items-end">
            <span
              className={
                devendo
                  ? 'font-[var(--font-weight-semibold)] text-[var(--feedback-danger-fg)]'
                  : 'font-[var(--font-weight-semibold)] text-[var(--text-primary)]'
              }
            >
              {formatBRL(a.saldoComissao)}
              {devendo ? ' (dívida)' : ''}
            </span>
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              acum. {formatBRL(a.comissaoAcumulada)} · repass. {formatBRL(a.comissaoRepassada)}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      {/* D-1008-R8: frase de apoio cortada — a tabela abaixo tem as colunas. */}
      {/* D-1008-R9: o menu secundário da área substituiu o botão solto "Voltar
          para Clubes"; desde o D-1008-R16 quem o desenha é a MOLDURA
          (ParceriasAreaLayout, D-1008-R17) — as abas da área são o caminho entre frentes. */}
      <PageHeader title="Influenciadores" />
      <div className="flex flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)]">
        {afiliados === null && erro === null ? (
          <div role="status" aria-label="Carregando influenciadores" className="flex flex-col gap-[var(--spacing-4)]">
            <Skeleton variant="rect" className="h-24" />
            <Skeleton variant="rect" className="h-48" />
          </div>
        ) : erro !== null ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            Não foi possível carregar os influenciadores. Tente novamente.
          </div>
        ) : (afiliados ?? []).length === 0 ? (
          <EmptyState
            title="Nenhum influenciador ainda"
            description="Crie afiliados na aba Afiliados de um evento — clubes e pessoas físicas aparecem aqui com as conversões e a comissão."
          />
        ) : (
          <>
            <section
              aria-label="Indicadores de influenciadores"
              className="grid grid-cols-1 gap-[var(--spacing-4)] md:grid-cols-4"
            >
              <KpiCard label="Afiliados" value={String(kpis.afiliados)} />
              <KpiCard label="Inscrições atribuídas" value={kpis.inscricoes.toLocaleString('pt-BR')} />
              <KpiCard label="Valor atribuído (bruto)" value={formatBRL(kpis.valor)} hint="antes de comissão" />
              <KpiCard label="Comissão em aberto" value={formatBRL(kpis.saldoAberto)} hint="saldo a repassar" />
            </section>

            <FilterBar
              label="influenciadores"
              search={
                <SearchInput
                  aria-label="Buscar influenciador"
                  placeholder="Buscar por nome, código ou evento"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  shortcutLabel={null}
                />
              }
              count={
                <ResultCount
                  visiveis={filtrados.length}
                  total={(afiliados ?? []).length}
                  substantivo={{ singular: 'influenciador', plural: 'influenciadores' }}
                />
              }
            />

            {filtrados.length === 0 ? (
              <EmptyState title="Nada encontrado" description="Nenhum influenciador casa com a busca." />
            ) : (
              <Table
                columns={colunas}
                data={filtrados}
                keyExtractor={(a) => `${a.eventoId}:${a.refCodigo}`}
                caption="Influenciadores do organizador"
                renderActions={(a) => (
                  <div className="flex items-center justify-end gap-[var(--spacing-2)]">
                    {a.ultimosRepasses.length > 0 ? (
                      <Button
                        variant="ghost"
                        onClick={() => setAlvoExtrato(a)}
                        aria-label={`Ver repasses de ${a.nome}`}
                      >
                        Ver repasses ({a.ultimosRepasses.length})
                      </Button>
                    ) : null}
                    {a.saldoComissao > 0 ? (
                      <Button variant="ghost" onClick={() => abrirRepasse(a)}>
                        Registrar repasse
                      </Button>
                    ) : (
                      <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                        {a.saldoComissao < 0 ? 'Em dívida' : 'Sem saldo'}
                      </span>
                    )}
                  </div>
                )}
              />
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={alvoRepasse !== null}
        onOpenChange={fecharRepasse}
        title="Registrar repasse de comissão"
        // UXW-FIX · BLQ-14: "idempotente" é termo de engenharia num modal de
        // dinheiro. A garantia é a mesma; quem lê agora entende qual é.
        description="Registra que você já pagou a comissão fora da plataforma (nenhum dinheiro é movido aqui). Pode ser o saldo inteiro ou parte dele — o resto continua a receber. Se você reenviar, o valor não é debitado duas vezes."
        target={
          alvoRepasse ? (
            <div className="flex flex-col gap-[var(--spacing-3)]">
              <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                {alvoRepasse.nome} · {alvoRepasse.eventoNome}
              </span>
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                Saldo de comissão: {formatBRL(alvoRepasse.saldoComissao)}
              </span>
              {/* `errorMessage` do DS já entrega o pacote de estado inválido:
                  aria-invalid, borda-danger (a11y do erro não depende só de
                  cor) e a mensagem com role="alert" associada por id. */}
              {/* `type="text"` de propósito, e não `number` como no repasse do
                  organizador: num campo de CENTAVOS o controlled number input
                  perde o texto no meio da digitação — "700." não é número
                  válido, o `value` volta vazio e o campo se apaga quando a
                  pessoa digita o separador decimal. Com texto o que foi
                  digitado sobrevive, o parse aceita vírgula e ponto, e a
                  terceira casa chega inteira para ser reprovada (que é o que
                  a S705-T2 pede). O teclado numérico segue por `inputMode`. */}
              <Input
                id="repasse-comissao-valor"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                label="Valor do repasse (R$)"
                hint={REGUA_PONTO_E_VIRGULA}
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                placeholder="0,00"
                disabled={processando}
                {...(avaliacao.hint !== null ? { errorMessage: avaliacao.hint } : {})}
              />
              {/* O que já foi adiantado, na hora de decidir o próximo parcial. */}
              <ExtratoRepasses
                repasses={alvoRepasse.ultimosRepasses}
                chaveBase={`modal-${alvoRepasse.refCodigo}`}
                caption={`Repasses já registrados para ${alvoRepasse.nome}`}
                titulo="Já repassado antes"
              />
            </div>
          ) : undefined
        }
        loses={[
          alvoRepasse !== null && avaliacao.valor !== null && avaliacao.podeEnviar
            ? `${formatBRL(avaliacao.valor)} do saldo em aberto (restam ${formatBRL(
                Math.round((alvoRepasse.saldoComissao - avaliacao.valor) * 100) / 100,
              )})`
            : 'A parte do saldo em aberto que você informar',
        ]}
        keeps={[
          'O histórico de conversões e a comissão acumulada',
          'O resto do saldo, que continua a receber',
          'O extrato deste repasse (uma linha própria nos dois lados)',
        ]}
        reasonLabel="Observação (opcional) — ex.: comprovante/PIX"
        confirmLabel="Confirmar repasse"
        loading={processando}
        onConfirm={(d) => void confirmarRepasse(d.reason)}
      />

      <Modal
        open={alvoExtrato !== null}
        onOpenChange={fecharExtrato}
        title="Repasses registrados"
        description={
          alvoExtrato !== null
            ? `${alvoExtrato.nome} · ${alvoExtrato.eventoNome}`
            : undefined
        }
      >
        {alvoExtrato !== null ? (
          <div className="flex flex-col gap-[var(--spacing-4)]">
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              Acumulada {formatBRL(alvoExtrato.comissaoAcumulada)} · repassada{' '}
              {formatBRL(alvoExtrato.comissaoRepassada)} · saldo{' '}
              {formatBRL(alvoExtrato.saldoComissao)}
            </p>
            <ExtratoRepasses
              repasses={alvoExtrato.ultimosRepasses}
              chaveBase={`org-${alvoExtrato.refCodigo}`}
              caption={`Repasses de ${alvoExtrato.nome} em ${alvoExtrato.eventoNome}`}
              titulo="Cada registro, uma linha"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

InfluenciadoresPage.displayName = 'InfluenciadoresPage';
