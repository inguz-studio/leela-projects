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
 *
 * X1 (D-0802-1 §3 · a11y antes do vocabulário). Os três `alt` afirmavam
 * corredores, largada e prova — numa galeria de EXEMPLO servida a QUALQUER
 * evento. Na página de um retiro de respiração, o leitor de tela anunciava
 * corredores que não existem: isso não é vocabulário torto, é informação falsa
 * entregue a quem só tem ela.
 *
 * A saída é tratar as imagens como DECORATIVAS (`alt=""`), que é o que elas
 * são: placeholders sem relação com este evento. O conteúdo informativo já está
 * no texto da seção ("Imagens de exemplo — as fotos do organizador aparecem
 * aqui") e no rótulo de cada figura, agora em momentos que valem para qualquer
 * experiência. Descrever a foto com precisão seria pior: reintroduziria a
 * afirmação de corrida, só que mais detalhada.
 */
const IMAGENS_EXEMPLO: readonly { src: string; rotulo: string }[] = [
  { src: '/gallery/leela-galeria-largada.jpg', rotulo: 'Antes' },
  { src: '/gallery/leela-galeria-percurso.jpg', rotulo: 'Durante' },
  { src: '/gallery/leela-galeria-chegada.jpg', rotulo: 'Depois' },
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
            {/* Rótulo SOBRE a imagem (rodada awwwards-20260826): a faixa de
                legenda abaixo da foto acrescentava 40px de superfície cinza a
                cada figura e quebrava o ritmo da dobra. Sobre a foto, o rótulo
                custa zero altura e a galeria vira uma tira de imagem contínua —
                que é o que ela é. O contraste do texto vem de um véu de token
                (`--surface-base` em gradiente + `opacity-*`), não de uma caixa. */}
            <figure className="group relative overflow-hidden rounded-ds-lg bg-surface-raised shadow-elev-1">
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                {/* Abaixo da dobra → lazy; dimensão intrínseca 4:3 (zero CLS). */}
                <img
                  src={img.src}
                  // Decorativa: o `figcaption` rotula e a seção já declarou que
                  // são imagens de exemplo. Ver a nota no topo do arquivo.
                  alt=""
                  width={1200}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-slow ease-ds-default motion-safe:group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent opacity-90"
                />
              </div>
              <figcaption className="absolute bottom-0 left-0 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-text-primary">
                {img.rotulo}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Dobra>
  );
}
