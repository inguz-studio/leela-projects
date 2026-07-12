import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventoPublicado } from '@/lib/leitor';
import { rotuloEstadoVenda } from '@/lib/estadoVenda';
import { ATRIBUICAO_KEYS } from '../ctaStyles';

// Rota de destino do CTA "Garantir inscrição". O checkout de 5 etapas (S1203)
// é o PRÓXIMO lote — aqui é um stub HONESTO ("em construção") que já: (1) aplica
// o gate de 404 (evento rascunho/inexistente), (2) bloqueia entrada quando a
// venda está fechada, (3) confirma a captura dos parâmetros de atribuição que o
// checkout vai consumir. Lê searchParams → dinâmico.
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

  const atribuicao: { chave: string; valor: string }[] = [];
  for (const chave of ATRIBUICAO_KEYS) {
    const valor = primeiro(searchParams[chave]);
    if (valor !== undefined && valor.length > 0) atribuicao.push({ chave, valor });
  }

  const aberta = evento.estadoVenda === 'aberto';

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

      {!aberta ? (
        <div className="mt-6 rounded-ds-lg border border-border-default bg-surface-raised p-6">
          <p className="text-lg font-semibold text-text-primary">
            {rotuloEstadoVenda(evento.estadoVenda)}
          </p>
          <p className="mt-2 text-text-secondary">
            As inscrições deste evento não estão abertas no momento, então o
            checkout está bloqueado. Você ainda pode consultar todas as
            informações na página do evento.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-ds-lg border border-border-subtle bg-surface-raised p-6">
            <p className="text-lg font-semibold text-text-primary">
              Checkout em construção
            </p>
            <p className="mt-2 text-text-secondary">
              O fluxo guiado de 5 etapas (dados, modalidade e kit, resumo,
              pagamento e confirmação) chega no próximo lote. Sua vaga ainda não
              foi reservada.
            </p>
          </div>

          <div className="mt-6 rounded-ds-md border border-border-subtle bg-surface-sunken p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
              Atribuição capturada
            </h2>
            {atribuicao.length > 0 ? (
              <dl className="mt-3 space-y-2">
                {atribuicao.map((p) => (
                  <div key={p.chave} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="font-mono text-text-secondary">{p.chave}</dt>
                    <dd className="font-mono font-semibold text-text-primary">{p.valor}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-text-tertiary">
                Nenhum parâmetro de atribuição na URL — acesso direto/orgânico.
              </p>
            )}
            <p className="mt-4 text-xs text-text-tertiary">
              Estes parâmetros são o que o checkout (S1203) e a atribuição de
              afiliado (S1204) vão consumir para resolver comissão dentro da
              janela.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
