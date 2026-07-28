// =============================================================================
// EstornosAdminRoute — container de `/plataforma/estornos` (T4 · decisão 43-b).
//
// Duas superfícies, porque o admin tem dois problemas diferentes:
//
//   1. FILA — os reembolsos de todos os produtores que pedem decisão. Aprovar/
//      recusar entram por `decideRefund`, que ganhou o ramo admin: o tenant vem
//      do doc, não do claim.
//   2. AÇÃO DIRETA — o caso que NUNCA chega à fila. Um pedido bloqueado pelo
//      corte de véspera não cria doc nenhum (a abertura é recusada), então não
//      há linha para clicar: o admin precisa apontar o pedido e o inscrito e
//      dizer o que fazer. É por aqui que entram furar a véspera (RN-376) e
//      cancelar sem devolver dinheiro (RN-377).
//
// Toda ação é Cloud Function; o cliente não transiciona estado nem calcula
// valor. Sucesso ⇒ reloadKey++ (a fila revalida) + Toast honesto sobre o que
// de fato aconteceu. O erro do callable sobe INTACTO (§2.12) — as guardas do
// servidor já falam português de operador.
// =============================================================================

import { useState } from 'react';
import { Button, ConfirmModal, Field, Input, useToast } from '@leela/design-system';
import { formatBRL } from '../../eventos/repasses/_lib/format';
import { EstornosFilaView } from './EstornosFilaView';
import { useEstornoAdminActions, useFilaEstornos } from './_data/estornosAdmin';
import { mensagemDaRecusa } from '../_lib/errors';
import type { EstornoFilaItem } from '../../../lib/query/queries';

type AcaoDireta = 'estornar' | 'cancelar';

interface FormDireto {
  pedidoId: string;
  inscritoId: string;
  motivo: string;
  motivoOverride: string;
}

const FORM_VAZIO: FormDireto = {
  pedidoId: '',
  inscritoId: '',
  motivo: '',
  motivoOverride: '',
};

/**
 * O formulário está completo para a ação escolhida? Estornar furando a véspera
 * exige DUAS justificativas: o motivo do reembolso e o motivo do furo — a
 * segunda é a que responde "por que a plataforma passou por cima da regra do
 * produtor". @pure
 */
export function formularioCompleto(acao: AcaoDireta, form: FormDireto): boolean {
  const base =
    form.pedidoId.trim().length > 0 &&
    form.inscritoId.trim().length > 0 &&
    form.motivo.trim().length >= 3;
  if (!base) return false;
  return acao === 'estornar' ? form.motivoOverride.trim().length >= 3 : true;
}

export function EstornosAdminRoute(): JSX.Element {
  const { toast } = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmFila, setConfirmFila] = useState<{
    kind: 'aprovar' | 'recusar';
    item: EstornoFilaItem;
  } | null>(null);
  const [acao, setAcao] = useState<AcaoDireta>('estornar');
  const [form, setForm] = useState<FormDireto>(FORM_VAZIO);
  const [confirmDireto, setConfirmDireto] = useState(false);

  const fila = useFilaEstornos(reloadKey);
  const acoes = useEstornoAdminActions();

  function revalidar(): void {
    setReloadKey((k) => k + 1);
  }

  async function handleConfirmFila(): Promise<void> {
    if (!confirmFila) return;
    const { kind, item } = confirmFila;
    const res = await acoes.decidir(item.eventoId, item.reembolso.inscritoId, kind);
    if (res) {
      setConfirmFila(null);
      revalidar();
      toast(
        res.estado === 'estornado'
          ? {
              variant: 'success',
              title: 'Estorno concluído',
              description: `${item.tenantNome} · o valor voltou ao pagador.`,
            }
          : res.estado === 'recusado'
            ? {
                variant: 'success',
                title: 'Pedido recusado',
                description: `${item.tenantNome} · nenhum dinheiro foi movido.`,
              }
            : {
                variant: 'info',
                title: 'Estorno solicitado ao gateway',
                description:
                  'A devolução foi enviada e aguarda a confirmação. Não repita: ' +
                  'a solicitação fecha sozinha quando o gateway confirmar.',
              },
      );
    } else {
      toast({
        variant: 'danger',
        title: kind === 'aprovar' ? 'Não foi possível aprovar' : 'Não foi possível recusar',
        description: mensagemDaRecusa(acoes.ultimoErro()),
      });
    }
  }

  async function handleConfirmDireto(): Promise<void> {
    const alvo = { pedidoId: form.pedidoId.trim(), inscritoId: form.inscritoId.trim() };
    const res =
      acao === 'estornar'
        ? await acoes.estornarFurandoCorte(
            alvo.pedidoId,
            alvo.inscritoId,
            form.motivo.trim(),
            form.motivoOverride.trim(),
          )
        : await acoes.cancelarSemEstornar(alvo.pedidoId, alvo.inscritoId, form.motivo.trim());

    if (res) {
      setConfirmDireto(false);
      setForm(FORM_VAZIO);
      revalidar();
      toast(
        acao === 'estornar'
          ? {
              variant: 'success',
              title: 'Estorno aberto pela plataforma',
              description:
                'O furo do corte ficou registrado no reembolso, com o motivo e o seu usuário.',
            }
          : {
              variant: 'success',
              title: 'Inscrição cancelada sem estorno',
              description:
                'O atleta saiu do evento e o dinheiro NÃO foi devolvido. A trilha ficou no evento.',
            },
      );
    } else {
      toast({
        variant: 'danger',
        title: acao === 'estornar' ? 'Não foi possível estornar' : 'Não foi possível cancelar',
        description: mensagemDaRecusa(acoes.ultimoErro()),
      });
    }
  }

  return (
    <>
      <div className="flex flex-col gap-[var(--spacing-8)] pb-[var(--spacing-8)]">
        <EstornosFilaView
          fila={fila.data}
          loading={fila.loading}
          error={fila.error}
          running={acoes.running}
          onRetry={fila.refetch}
          onAprovar={(item) => setConfirmFila({ kind: 'aprovar', item })}
          onRecusar={(item) => setConfirmFila({ kind: 'recusar', item })}
        />

        <section
          aria-labelledby="acao-direta-titulo"
          className="flex flex-col gap-[var(--spacing-4)] rounded-[var(--radius-md)] border border-[var(--border-default)] p-[var(--spacing-5)]"
        >
          <div className="flex flex-col gap-[var(--spacing-1)]">
            <h2
              id="acao-direta-titulo"
              className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]"
            >
              Ação direta sobre uma inscrição
            </h2>
            <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              Para o que não chega à fila: pedido bloqueado pelo corte de véspera (a abertura
              normal é recusada e não cria registro) e saída sem devolução de dinheiro.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="O que fazer com a inscrição"
            className="flex flex-wrap gap-[var(--spacing-2)]"
          >
            <Button
              role="radio"
              aria-checked={acao === 'estornar'}
              variant={acao === 'estornar' ? 'primary' : 'secondary'}
              onClick={() => setAcao('estornar')}
            >
              Estornar furando a véspera
            </Button>
            <Button
              role="radio"
              aria-checked={acao === 'cancelar'}
              variant={acao === 'cancelar' ? 'primary' : 'secondary'}
              onClick={() => setAcao('cancelar')}
            >
              Cancelar sem devolver dinheiro
            </Button>
          </div>

          <div className="grid gap-[var(--spacing-4)] md:grid-cols-2">
            <Field label="ID do pedido" required>
              <Input
                value={form.pedidoId}
                onChange={(e) => setForm((f) => ({ ...f, pedidoId: e.target.value }))}
              />
            </Field>
            <Field label="ID do inscrito" required>
              <Input
                value={form.inscritoId}
                onChange={(e) => setForm((f) => ({ ...f, inscritoId: e.target.value }))}
              />
            </Field>
          </div>

          <Field
            label="Motivo (vai para a auditoria)"
            description="Mínimo de 3 caracteres. Fica gravado no registro da ação."
            required
          >
            <Input
              value={form.motivo}
              onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
            />
          </Field>

          {acao === 'estornar' && (
            <Field
              label="Por que a plataforma está passando por cima do corte de véspera"
              description="Obrigatório (RN-376). É esta frase que responde pela exceção depois."
              required
            >
              <Input
                value={form.motivoOverride}
                onChange={(e) => setForm((f) => ({ ...f, motivoOverride: e.target.value }))}
              />
            </Field>
          )}

          <div>
            <Button
              disabled={!formularioCompleto(acao, form) || acoes.running}
              onClick={() => setConfirmDireto(true)}
            >
              {acao === 'estornar' ? 'Estornar inscrição' : 'Cancelar inscrição'}
            </Button>
          </div>
        </section>
      </div>

      {confirmFila && (
        <ConfirmModal
          open
          onOpenChange={(aberto) => {
            if (!aberto) setConfirmFila(null);
          }}
          title={confirmFila.kind === 'aprovar' ? 'Aprovar estorno' : 'Recusar estorno'}
          description={
            confirmFila.kind === 'aprovar'
              ? 'O valor é devolvido ao pagador pelo gateway. Você está decidindo no lugar do produtor.'
              : 'O pedido é recusado e nenhum dinheiro se move. A recusa é terminal — reabrir é decisão manual.'
          }
          target={
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                {confirmFila.item.tenantNome}
              </span>
              <span className="text-[var(--text-secondary)]">
                {confirmFila.item.eventoNome} · {confirmFila.item.reembolso.inscritoId}
              </span>
              {/* Item 53: o número que o comprador RECEBE, no ponto exato da
                  decisão. Confirmar um estorno sem ver quanto volta era o
                  mesmo defeito da coluna, um clique adiante. */}
              <span className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                {formatBRL(
                  confirmFila.item.devolucao?.valorDevolvido ??
                    confirmFila.item.reembolso.valorSolicitado,
                )}
              </span>
            </div>
          }
          loses={
            confirmFila.kind === 'aprovar'
              ? [
                  'O valor sai da conta do produtor',
                  'A vaga NÃO volta ao lote sozinha',
                  ...(confirmFila.item.devolucao && confirmFila.item.devolucao.taxaRetida > 0
                    ? [
                        `O comprador NÃO recebe ${formatBRL(confirmFila.item.devolucao.taxaRetida)} de taxa de serviço (fora da janela de arrependimento — RN-374)`,
                      ]
                    : []),
                ]
              : ['O atleta não recebe o dinheiro de volta']
          }
          keeps={
            confirmFila.kind === 'aprovar'
              ? ['Os demais inscritos do mesmo pedido']
              : ['O registro do pedido, com o motivo da recusa']
          }
          confirmLabel={confirmFila.kind === 'aprovar' ? 'Aprovar' : 'Recusar'}
          loading={acoes.running}
          onConfirm={handleConfirmFila}
        />
      )}

      {confirmDireto && (
        <ConfirmModal
          open
          onOpenChange={(aberto) => {
            if (!aberto) setConfirmDireto(false);
          }}
          title={
            acao === 'estornar'
              ? 'Estornar furando o corte de véspera'
              : 'Cancelar sem devolver dinheiro'
          }
          description={
            acao === 'estornar'
              ? 'A regra do produtor bloqueia reembolso nesta janela. A exceção fica registrada com o seu usuário e o motivo.'
              : 'O atleta sai do evento e o dinheiro FICA com o produtor. Use para cortesia, no-show ou fraude — não para desistência.'
          }
          target={
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <span className="font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                Inscrito {form.inscritoId.trim()}
              </span>
              <span className="text-[var(--text-secondary)]">
                Pedido {form.pedidoId.trim()}
              </span>
            </div>
          }
          loses={
            acao === 'estornar'
              ? ['O valor sai da conta do produtor, fora da regra dele']
              : ['A inscrição do atleta (deixa de correr e de receber o kit)']
          }
          keeps={
            acao === 'estornar'
              ? ['A trilha do furo, com motivo e autor']
              : [
                  'O dinheiro do produtor — esta ação não estorna nada',
                  'A vaga usada no lote (ela não volta sozinha)',
                ]
          }
          confirmLabel={acao === 'estornar' ? 'Estornar mesmo assim' : 'Cancelar inscrição'}
          loading={acoes.running}
          onConfirm={handleConfirmDireto}
        />
      )}
    </>
  );
}

EstornosAdminRoute.displayName = 'EstornosAdminRoute';
