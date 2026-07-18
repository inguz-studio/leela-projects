import { Images } from 'lucide-react';
import { Dobra } from './Dobra';
import { TituloSecao } from './marca';

/**
 * Galeria de imagens de EXEMPLO da página de evento (LEELA-R12 · Frente 2.4).
 *
 * Pedido do Vitor: "mockar com imagens de exemplo nas páginas dos eventos para
 * facilitar a visualização". Os assets são LOCAIS, brasa, event-agnostic (mesmo
 * padrão da capa mock do R7) e resolvidos APP-SIDE — nada de URL no doc do
 * evento (respeita a guarda RN-153/decisão do R7: default app-side). Quando o
 * organizador subir fotos reais (Onda futura), esta seção passa a consumir o
 * campo de galeria do doc; até lá, o mock comunica o formato da página.
 *
 * Rotulada como EXEMPLO (`figcaption`) para ser honesta: não são fotos reais do
 * evento. Server Component; `<img>` de asset local estático.
 */
const IMAGENS_EXEMPLO: readonly { src: string; alt: string; rotulo: string }[] = [
  { src: '/gallery/leela-galeria-largada.svg', alt: 'Imagem de exemplo: largada', rotulo: 'Largada' },
  { src: '/gallery/leela-galeria-percurso.svg', alt: 'Imagem de exemplo: percurso', rotulo: 'No percurso' },
  { src: '/gallery/leela-galeria-chegada.svg', alt: 'Imagem de exemplo: chegada', rotulo: 'Chegada' },
];

export function GaleriaSection(): React.JSX.Element {
  return (
    <Dobra>
      <TituloSecao icone={Images}>Galeria</TituloSecao>
      <p className="mt-2 text-sm text-text-tertiary">
        Imagens de exemplo — as fotos do organizador aparecem aqui.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {IMAGENS_EXEMPLO.map((img) => (
          <li key={img.src}>
            <figure className="overflow-hidden rounded-ds-lg border border-border-subtle bg-surface-raised shadow-elev-1">
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
              </div>
              <figcaption className="px-4 py-3 text-sm font-semibold text-text-secondary">
                {img.rotulo}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Dobra>
  );
}
