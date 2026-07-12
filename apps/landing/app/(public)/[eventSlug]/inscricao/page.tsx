import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventoPublicado } from '@/lib/leitor';
import { rotuloEstadoVenda } from '@/lib/estadoVenda';
import { CheckoutFlow } from './checkout/CheckoutFlow';

// Checkout do atleta anônimo (S1203). Server Component: aplica o gate de 404
// (evento rascunho/inexistente) e o bloqueio de venda fechada, lê o evento
// publicado (leitor server-side) e captura a atribuição da URL; o fluxo
// interativo de 5 etapas roda no <CheckoutFlow> (Client Component). Lê
// searchParams → dinâmico.
export const dynamic = 'force-dynamic';

interface Props {
  params: { eventSlug: string };
  searchParams: Record<string, string | string[] | undefined>;
}

function primeiro(valor: string | string[] | undefined): string | undefined {
  if (Array.isArray(valor)) return valor[0];
  return valor;
}

export default async function InscricaoPage({ params, searchParams }: Props): Promise<React.JSX.Element> {
  const evento = await getEventoPublicado(params.eventSlug);
  if (evento === null) {
    notFound();
  }

  const aberta = evento.estadoVenda === 'aberto';

  // Atribuição preservada pelo CTA (cupom pré-preenche o campo; c/ref/utm
  // seguem para a resolução de afiliado — S1204, fora deste lote).
  const cupom = primeiro(searchParams['cupom']);
  const atribuicao = cupom !== undefined && cupom.length > 0 ? { cupom } : {};

  if (!aberta) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Link
          href={`/${evento.slug}`}
          className="text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          ← Voltar para {evento.nome}
        </Link>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-text-primary">
          Inscrição · {evento.nome}
        </h1>
        <div className="mt-6 rounded-ds-lg border border-border-default bg-surface-raised p-6">
          <p className="text-lg font-semibold text-text-primary">
            {rotuloEstadoVenda(evento.estadoVenda)}
          </p>
          <p className="mt-2 text-text-secondary">
            As inscrições deste evento não estão abertas no momento, então o checkout está
            bloqueado. Você ainda pode consultar todas as informações na página do evento.
          </p>
        </div>
      </div>
    );
  }

  return <CheckoutFlow evento={evento} atribuicao={atribuicao} />;
}
