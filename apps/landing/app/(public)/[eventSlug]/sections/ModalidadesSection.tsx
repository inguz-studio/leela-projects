import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { Dobra } from './Dobra';

/**
 * Seção de percursos/modalidades (S1201-T2 · RN-301): as distâncias lado a
 * lado, cada uma com o PREÇO VIGENTE derivado do lote ativo (`precoVigente`).
 * Preço `null` (venda fechada) vira texto honesto, nunca valor fabricado.
 * Cards (descoberta/comparação), não tabela — heurística design-principles (c).
 */
export function ModalidadesSection({ evento }: { evento: EventoPublico }): React.JSX.Element | null {
  if (evento.modalidades.length === 0) return null;

  return (
    <Dobra id="percursos">
      <h2 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
        Escolha seu percurso
      </h2>
      <p className="mt-2 text-text-secondary">
        {evento.modalidades.length} distâncias, cada uma com preço próprio por lote.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {evento.modalidades.map((m) => {
          const disponivel = m.precoVigente !== null;
          return (
            <li
              key={m.nome}
              className="flex flex-col justify-between rounded-ds-lg border border-border-subtle bg-surface-raised p-6"
            >
              <div>
                <p className="font-display text-3xl font-extrabold uppercase tracking-tight text-text-primary">
                  {m.nome}
                </p>
                <p className="mt-1 text-sm text-text-tertiary">Percurso cronometrado</p>
              </div>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {disponivel ? 'Preço vigente' : 'Status'}
                </p>
                <p
                  className={
                    disponivel
                      ? 'text-xl font-bold text-text-primary'
                      : 'text-base font-semibold text-text-tertiary'
                  }
                >
                  {formatarPreco(m.precoVigente)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Dobra>
  );
}
