import { CalendarDays, Clock, MapPin, Route, Info, type LucideIcon } from 'lucide-react';
import type { EventoPublico } from '@/lib/tipos';
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
    {
      rotulo: 'Percursos',
      valor: `${evento.modalidades.length} ${evento.modalidades.length === 1 ? 'distância' : 'distâncias'}`,
      icone: Route,
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
          <div
            key={f.rotulo}
            className="rounded-ds-md border border-border-subtle bg-surface-raised p-4"
          >
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              <f.icone size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-brand" />
              {f.rotulo}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-text-primary">{f.valor}</dd>
          </div>
        ))}
      </dl>
    </Dobra>
  );
}
