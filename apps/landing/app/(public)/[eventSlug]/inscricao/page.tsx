import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cupomDaEntrada } from '@leela/core';
import { Card } from '@leela/design-system/server';
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

  // Atribuição preservada pelo CTA: cupom pré-preenche o campo; `ref`
  // (R9-E · RN-313) segue para o checkout — o clique original (localStorage,
  // RefTracker) tem precedência de instante; utm_* ficam informativos.
  //
  // S1215-T1/T2 (RN-429/430): o cupom sai do leitor ÚNICO do core, que aceita
  // `cupom` e o apelido histórico `c` — link já impresso com `?c=` continua
  // aplicando desconto. Código podre vira `null` aqui e não viaja até a
  // cotação para ser recusado lá. Sem cupom na URL, o `CheckoutFlow` ainda
  // procura o que o `CupomTracker` guardou na página do evento.
  const cupom = cupomDaEntrada((chave) => primeiro(searchParams[chave]) ?? null);
  const ref = primeiro(searchParams['ref']);
  const atribuicao = {
    ...(cupom !== null ? { cupom } : {}),
    ...(ref !== undefined && ref.length > 0 ? { ref } : {}),
  };

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
        <Card className="mt-6 p-6">
          <p className="text-lg font-semibold text-text-primary">
            {rotuloEstadoVenda(evento.estadoVenda)}
          </p>
          <p className="mt-2 text-text-secondary">
            As inscrições deste evento não estão abertas no momento, então o checkout está
            bloqueado. Você ainda pode consultar todas as informações na página do evento.
          </p>
        </Card>
      </div>
    );
  }

  return <CheckoutFlow evento={evento} atribuicao={atribuicao} />;
}
