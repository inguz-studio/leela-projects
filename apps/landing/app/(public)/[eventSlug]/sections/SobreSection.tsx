import { CalendarDays, Clock, MapPin, Layers, Info, type LucideIcon } from 'lucide-react';
import type { EventoPublico } from '@/lib/tipos';
import { Card } from '@leela/design-system/server';
import { Dobra } from './Dobra';
import { TituloSecao, iconeDoEsporte } from './marca';

/**
 * Seção "Sobre" (S1201-T2 · LEELA-R12): a descrição publicada + os fatos-chave
 * do evento. R12 (Frente 1/2): a MODALIDADE esportiva entra como PRIMEIRO fato
 * (destaque igual ao percurso), cada tile ganha ícone Lucide de apoio, e a
 * prosa "cronometrada por chip" foi removida (pedido do Vitor). Dado real do
 * leitor.
 */
export function SobreSection({ evento }: { evento: EventoPublico }): React.JSX.Element {
  const IconeEsporte: LucideIcon = iconeDoEsporte(evento.modalidadeEsporte);
  const fatos: { rotulo: string; valor: string; icone: LucideIcon }[] = [
    { rotulo: 'Modalidade', valor: evento.modalidadeEsporte, icone: IconeEsporte },
    { rotulo: 'Data', valor: evento.dataLabel, icone: CalendarDays },
    // X1 (D-0802-1 §3): era "Largada". O tile mostra a HORA de início e é
    // servido em todo evento — um retiro de respiração não tem largada.
    { rotulo: 'Início', valor: evento.horaLabel, icone: Clock },
    { rotulo: 'Local', valor: evento.local, icone: MapPin },
    // S1254-T2 (rodada 2026-08-12-copy-landing · achado M4) · o campo conta
    // MODALIDADES e o rótulo prometia PERCURSOS: num retiro com duas práticas,
    // a página anunciava duas distâncias que não existem. Mesma lacuna do B2 —
    // a varredura S1218-T3 corrigiu `ModalidadesSection` e pulou esta.
    //
    // O valor virou o número puro, sem repetir o rótulo logo abaixo dele: é a
    // mesma régua que o achado L2 aplica ao estado vazio de Clubs. O ícone
    // deixou de ser `Route` pela mesma razão do rótulo — um pictograma de
    // trajeto é a promessa de percurso desenhada.
    //
    // ⛔ Fica um vetável NOVO para o dono, registrado na rodada: "modalidade"
    // tem dois sentidos vivos no produto (a prática do evento em
    // `modalidadeEsporte` e as opções de inscrição em `modalidades`), e os dois
    // tiles agora ficam lado a lado. Qual dos dois fica com a palavra é escolha
    // de vocabulário de marca, não de esteira.
    {
      rotulo: 'Modalidades',
      valor: `${evento.modalidades.length}`,
      icone: Layers,
    },
  ];

  return (
    <Dobra>
      <TituloSecao icone={Info}>Sobre o evento</TituloSecao>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-text-secondary">
        {evento.seo.descricao}
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {fatos.map((f) => (
          <Card
            key={f.rotulo}
            className="rounded-ds-md border-border-subtle p-4"
          >
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              <f.icone size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
              {f.rotulo}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-text-primary">{f.valor}</dd>
          </Card>
        ))}
      </dl>
    </Dobra>
  );
}
