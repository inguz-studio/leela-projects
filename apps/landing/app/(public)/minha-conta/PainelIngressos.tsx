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
import { Card, buttonVariants } from '@leela/design-system/server';
import { Badge, EmptyState } from '@/app/_ds/ds';
import { formatarDataEvento } from '@/lib/ingresso';
import { cn } from '@/lib/utils';

// Onda 1 do cânone: a moldura é o `Card` do DS; a constante guarda só o que
// é LAYOUT deste cartão, não a anatomia da superfície.
const CARTAO =
  'flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5';

// Onda 1 do cânone: a receita do botão vem do DS (`buttonVariants`, entrada
// Radix-free do ADR-017); a pílula é a forma de marketing da landing.
const LINK = cn(
  buttonVariants({ variant: 'secondary', size: 'sm' }),
  'whitespace-nowrap rounded-ds-pill',
);

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
    <li>
      <Card className={CARTAO} data-slot="ingresso-cartao">
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
      </Card>
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
        <Card
          role="status"
          data-slot="ingressos-sem-link"
          className="p-4 text-sm text-text-secondary"
        >
          Não conseguimos abrir seus ingressos por aqui agora. O ingresso que chegou no e-mail da
          compra continua valendo, com o mesmo código.
        </Card>
      ) : null}

      {!listaCompleta ? (
        // Degradação DECLARADA (ver `meusIngressos.ts`): a busca por ficha de
        // pessoa falhou e a lista pode não ter tudo. Calar aqui produziria a
        // lista vazia que mente.
        <Card
          role="status"
          data-slot="ingressos-lista-parcial"
          className="p-4 text-sm text-text-secondary"
        >
          Pode estar faltando algum ingresso nesta lista. O que está no e-mail da compra continua
          valendo.
        </Card>
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
