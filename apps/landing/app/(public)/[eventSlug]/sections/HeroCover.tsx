import { CoverImage } from '@/app/components/CoverImage';

/**
 * Capa do hero da página de evento (S1201-T2 · S1702-T2). Delega ao leaf
 * compartilhado `CoverImage` — fonte única do gradiente de fallback, reusada
 * também pelos cards da home. Sem URL (seed/maioria) → gradiente de tokens; com
 * URL, imagem com fallback resiliente ao MESMO gradiente se o link falhar.
 */
export function HeroCover({
  imagemUrl,
  nome,
}: {
  imagemUrl: string | undefined;
  nome: string;
}): React.JSX.Element {
  return <CoverImage src={imagemUrl} alt={`Capa de ${nome}`} />;
}
