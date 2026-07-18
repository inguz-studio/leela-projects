import { CoverImage } from '@/app/components/CoverImage';

/**
 * Capa NÍTIDA do hero da página de evento (S1201-T2 · LEELA-R7). Recebe a fonte
 * já resolvida (`resolverCapa` no HeroSection): capa http(s) do organizador ou a
 * capa mock local. Delega ao leaf `CoverImage`, que mantém o fallback resiliente
 * ao gradiente de tokens caso o `src` falhe em runtime (link morto).
 */
export function HeroCover({ src, nome }: { src: string; nome: string }): React.JSX.Element {
  return <CoverImage src={src} alt={`Capa de ${nome}`} />;
}
