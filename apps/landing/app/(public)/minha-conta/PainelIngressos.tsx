'use client';
// =============================================================================
// PainelIngressos — Meus Ingressos, em próximos e passados (S1222-T2 · RN-451).
//
// O RECORTE JÁ VEM PRONTO DO SERVIDOR e este componente não o recalcula. Se
// ele decidisse aqui "já passou?", o fuso e o relógio da máquina de quem lê
// entrariam numa regra de negócio, e duas pessoas veriam listas diferentes do
// mesmo dado. A tela só desenha o que o servidor separou.
//
// O CARTÃO É UM ATALHO, NÃO UM SUBSTITUTO. O ingresso de verdade — com QR,
// versão de impressão e PDF — continua sendo a página `/ingresso/{token}`, que
// funciona SEM conta (RN-452) e é a que está no e-mail. Aqui a lista dá o
// caminho até ela; não repete a credencial nem desenha um segundo QR.
//
// AUSÊNCIA É AUSÊNCIA. Ingresso ainda não emitido não ganha código inventado
// nem link morto: ganha a frase que diz o que está acontecendo.
// =============================================================================

import type { IngressoDaConta } from '@leela/api-client';
import { Badge, EmptyState } from '@/app/_ds/ds';
import { formatarDataEvento } from '@/lib/ingresso';

const CARTAO =
  'flex flex-col gap-3 rounded-ds-lg border border-border-default bg-surface-raised p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5';

const LINK =
  'inline-flex items-center whitespace-nowrap rounded-ds-pill border border-border-default px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';

/** Rótulo do estado da inscrição — o vocabulário é de participante (D-0802-1). */
const ROTULO_STATUS: Record<IngressoDaConta['status'], string> = {
  confirmado: 'Confirmado',
  pendente: 'Aguardando pagamento',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
};

const VARIANTE_STATUS: Record<IngressoDaConta['status'], 'vitoria' | 'alerta' | 'neutro'> = {
  confirmado: 'vitoria',
  pendente: 'alerta',
  cancelado: 'neutro',
  estornado: 'neutro',
};

function CartaoIngresso({ ingresso }: { ingresso: IngressoDaConta }): React.JSX.Element {
  const quando = formatarDataEvento(ingresso.eventoDataIso);
  return (
    <li className={CARTAO} data-slot="ingresso-cartao">
      <div className="min-w-0">
        <p className="text-base font-semibold text-text-primary">
          {ingresso.eventoNome.length > 0 ? ingresso.eventoNome : 'Experiência'}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {[quando, ingresso.eventoLocal].filter((t) => t.length > 0).join(' · ')}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          <span className="text-text-primary">{ingresso.titular}</span>
          {ingresso.modalidade.length > 0 ? ` · ${ingresso.modalidade}` : ''}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={VARIANTE_STATUS[ingresso.status]}>
            {ROTULO_STATUS[ingresso.status]}
          </Badge>
          {ingresso.codigoIngresso !== null ? (
            <span className="font-mono text-sm text-text-secondary">
              {ingresso.codigoIngresso}
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0">
        {ingresso.linkIngresso !== null ? (
          <a className={LINK} href={ingresso.linkIngresso}>
            Ver ingresso
          </a>
        ) : (
          <p className="text-sm text-text-secondary">
            {ingresso.emitido
              ? 'O ingresso está no e-mail da compra.'
              : 'Estamos preparando seu ingresso.'}
          </p>
        )}
      </div>
    </li>
  );
}

export interface PainelIngressosProps {
  proximos: IngressoDaConta[];
  passados: IngressoDaConta[];
  /** false = a lista pode estar incompleta, e a tela precisa dizer isso. */
  listaCompleta: boolean;
  /** false = o servidor não conseguiu assinar nenhum link (config faltando). */
  linksDisponiveis: boolean;
}

export function PainelIngressos({
  proximos,
  passados,
  listaCompleta,
  linksDisponiveis,
}: PainelIngressosProps): React.JSX.Element {
  const vazio = proximos.length === 0 && passados.length === 0;
  return (
    <div className="flex flex-col gap-8" data-slot="painel-ingressos">
      {!linksDisponiveis && !vazio ? (
        // O servidor ficou sem o keyring de assinatura. Falha de CONFIGURAÇÃO,
        // e ela aparece: link ausente calado foi o que fez o primeiro PIX real
        // passar sem ninguém notar.
        <p
          role="status"
          data-slot="ingressos-sem-link"
          className="rounded-ds-lg border border-border-default bg-surface-raised p-4 text-sm text-text-secondary"
        >
          Não conseguimos abrir seus ingressos por aqui agora. O ingresso que chegou no e-mail da
          compra continua valendo, com o mesmo código.
        </p>
      ) : null}

      {!listaCompleta ? (
        // Degradação DECLARADA (ver `meusIngressos.ts`): a busca por ficha de
        // pessoa falhou e a lista pode não ter tudo. Calar aqui produziria a
        // lista vazia que mente.
        <p
          role="status"
          data-slot="ingressos-lista-parcial"
          className="rounded-ds-lg border border-border-default bg-surface-raised p-4 text-sm text-text-secondary"
        >
          Pode estar faltando algum ingresso nesta lista. O que está no e-mail da compra continua
          valendo.
        </p>
      ) : null}

      {vazio ? (
        <EmptyState
          title="Você ainda não tem ingressos"
          description="Quando você se inscrever numa experiência, o ingresso aparece aqui."
        />
      ) : null}

      {proximos.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Próximos
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {proximos.map((i) => (
              <CartaoIngresso key={`${i.eventoId}/${i.inscritoId}`} ingresso={i} />
            ))}
          </ul>
        </section>
      ) : null}

      {passados.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Passados
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {passados.map((i) => (
              <CartaoIngresso key={`${i.eventoId}/${i.inscritoId}`} ingresso={i} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
