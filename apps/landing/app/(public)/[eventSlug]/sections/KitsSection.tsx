import type { EventoPublico } from '@/lib/tipos';
import { formatarPreco } from '@/lib/formato';
import { imagemDoKit, rotuloKit } from '@/lib/kitImagem';
import { ehPreview } from '@/lib/mockImagem';
import { KitImagem } from '@/app/components/KitImagem';
import { Dobra } from './Dobra';

/** Rótulo do delta do kit (RN-211: negativo = desconto; 0 = incluso). */
function labelDeltaKit(preco: number): string {
  if (preco === 0) return 'Incluso no valor';
  if (preco < 0) return `Desconto de ${formatarPreco(Math.abs(preco))}`;
  return `+ ${formatarPreco(preco)}`;
}

/**
 * Seção de kits do evento (S1201-T2 · RN-210/211). Cada kit lista as
 * modalidades onde é ofertado (a mesma regra que o checkout filtra) e o delta
 * de preço — negativo é desconto, honesto. Sem kits → não renderiza (regra
 * "sem dado → sem seção"; nunca placeholder fabricado). Cards, não tabela
 * (heurística design-principles (c): item heterogêneo, descoberta visual).
 */
export function KitsSection({ evento }: { evento: EventoPublico }): React.JSX.Element | null {
  if (evento.kits.length === 0) return null;

  // Preview (Emulator) resolvido no SERVIDOR — mesma leitura de env que o client
  // (NEXT_PUBLIC_USE_EMULATOR), então o card da LP e o detalhe do checkout
  // decidem a mesma cascata (real → mock preview → placeholder Leela).
  const preview = ehPreview();

  return (
    <Dobra id="kits">
      <h2 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">Kits</h2>
      <p className="mt-2 text-text-secondary">
        Escolha o kit na inscrição. Cada kit vale para as modalidades indicadas.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {evento.kits.map((k) => {
          const img = imagemDoKit(
            { nome: k.nome, modalidades: k.modalidades, imagemUrl: k.imagemUrl },
            preview,
          );
          return (
          <li
            key={k.id}
            className="flex flex-col justify-between rounded-ds-lg border border-border-subtle bg-surface-raised p-6"
          >
            <div>
              {/* Imagem 1:1 do kit — clicável p/ ampliar quando é foto (T2). */}
              <KitImagem src={img.src} alt={rotuloKit(k.nome)} ampliavel={img.ampliavel} />
              <p className="mt-4 font-display text-xl font-extrabold tracking-tight text-text-primary">
                {k.nome}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {k.modalidades.map((m) => (
                  <span
                    key={m}
                    className="rounded-ds-pill border border-border-default px-2.5 py-0.5 text-xs font-semibold text-text-secondary"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <p
              className={
                k.preco < 0
                  ? 'mt-6 text-sm font-semibold text-feedback-success-fg'
                  : 'mt-6 text-sm font-semibold text-text-primary'
              }
            >
              {labelDeltaKit(k.preco)}
            </p>
          </li>
          );
        })}
      </ul>
    </Dobra>
  );
}
