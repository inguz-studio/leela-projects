import type { EventoPublico } from '@/lib/tipos';

/**
 * Seção "Sobre" (S1201-T2): a descrição publicada + os fatos-chave do evento
 * (data, local, nº de percursos, chip). Tudo dado real do leitor.
 */
export function SobreSection({ evento }: { evento: EventoPublico }): React.JSX.Element {
  const fatos: { rotulo: string; valor: string }[] = [
    { rotulo: 'Data', valor: evento.dataLabel },
    { rotulo: 'Largada', valor: evento.horaLabel },
    { rotulo: 'Local', valor: evento.local },
    {
      rotulo: 'Percursos',
      valor: `${evento.modalidades.length} ${evento.modalidades.length === 1 ? 'distância' : 'distâncias'}`,
    },
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h2 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
        Sobre o evento
      </h2>
      <p className="mt-3 text-lg leading-relaxed text-text-secondary">{evento.seo.descricao}</p>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fatos.map((f) => (
          <div
            key={f.rotulo}
            className="rounded-ds-md border border-border-subtle bg-surface-raised p-4"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {f.rotulo}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-text-primary">{f.valor}</dd>
          </div>
        ))}
      </dl>

      {evento.usaChip ? (
        <p className="mt-4 text-sm text-text-secondary">
          Prova cronometrada por chip — seu tempo oficial sai automaticamente.
        </p>
      ) : null}
    </section>
  );
}
