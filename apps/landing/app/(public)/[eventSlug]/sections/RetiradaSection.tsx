import type { EventoPublico } from '@/lib/tipos';

/**
 * Seção de retirada de kit (S1201-T2): as janelas de retirada (dia/horário/
 * local) do cronograma do evento. Sem janelas → não renderiza (regra "sem dado
 * → sem seção"). No seed atual o `id` "retirada" não está na config de seções,
 * então esta seção fica dormente até o organizador ativá-la — mas já consome
 * `janelasEntrega` real quando presente.
 */
export function RetiradaSection({ evento }: { evento: EventoPublico }): React.JSX.Element | null {
  if (evento.janelasRetirada.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h2 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
        Retirada do kit
      </h2>
      <p className="mt-2 text-text-secondary">
        Leve um documento com foto. Confira os horários por dia:
      </p>
      <ul className="mt-6 space-y-3">
        {evento.janelasRetirada.map((j, i) => (
          <li
            key={`${j.diaLabel}-${i}`}
            className="flex flex-col gap-1 rounded-ds-md border border-border-subtle bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-semibold text-text-primary">{j.diaLabel}</span>
            <span className="text-sm text-text-secondary">
              {j.horaInicio}–{j.horaFim}
            </span>
            <span className="text-sm text-text-secondary">{j.local}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
