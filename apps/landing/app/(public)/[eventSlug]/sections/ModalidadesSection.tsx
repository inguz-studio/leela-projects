import { Route } from 'lucide-react';
import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { Card } from '@leela/design-system/server';
import { Dobra } from './Dobra';
import { TituloSecao } from './marca';

/**
 * Seção de percursos/modalidades (S1201-T2 · RN-301 · LEELA-R12): as distâncias
 * lado a lado, cada uma com o PREÇO VIGENTE derivado do lote ativo
 * (`precoVigente`). Preço `null` (venda fechada) vira texto honesto, nunca
 * valor fabricado. Cards (descoberta/comparação), não tabela — heurística
 * design-principles (c). R12: título com ícone de apoio; subtítulo do card
 * carrega a modalidade esportiva (não mais "cronometrado por chip").
 */
export function ModalidadesSection({ evento }: { evento: EventoPublico }): React.JSX.Element | null {
  if (evento.modalidades.length === 0) return null;

  return (
    <Dobra id="percursos">
      {/* S1218-T3 · B8 · D-0802-1: "Escolha seu percurso" nomeava a página do
          evento pela corrida. A Leela é hub de EXPERIÊNCIAS de bem-estar —
          percurso é o que uma corrida tem, não o que a plataforma vende, e
          esta seção lista as modalidades de QUALQUER experiência. O título
          passa a DESCREVER o que está ali em vez de dar uma ordem. */}
      <TituloSecao icone={Route}>Modalidades disponíveis</TituloSecao>
      <p className="mt-2 text-text-secondary">
        {evento.modalidades.length} modalidades, cada uma com preço próprio por lote.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {evento.modalidades.map((m) => {
          const disponivel = m.precoVigente !== null;
          return (
            <li key={m.nome} className="flex">
              {/* Preço em escala de destaque e borda que reage (rodada
                  awwwards-20260826): o card comparava distâncias, mas o número
                  que decide a compra estava dois degraus abaixo do nome da
                  modalidade. Preço escondido é abandono imediato — é o
                  antipadrão nº 5 do 01-research, e o único jeito de a
                  comparação lado a lado funcionar é o valor ter peso de valor. */}
              <Card className="flex flex-1 flex-col justify-between border-border-subtle p-6 transition-colors duration-normal ease-ds-default hover:border-border-brand">
              <div>
                <p className="font-display text-3xl font-extrabold uppercase tracking-tight text-text-primary">
                  {m.nome}
                </p>
                <p className="mt-1 text-sm text-text-tertiary">{evento.modalidadeEsporte}</p>
              </div>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                  {disponivel ? 'Preço vigente' : 'Status'}
                </p>
                <p
                  className={
                    disponivel
                      ? 'mt-1 font-display text-2xl font-extrabold text-text-primary'
                      : 'mt-1 text-base font-semibold text-text-tertiary'
                  }
                >
                  {formatarPreco(m.precoVigente)}
                </p>
              </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </Dobra>
  );
}
