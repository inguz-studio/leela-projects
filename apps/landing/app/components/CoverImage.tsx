'use client';

import { useState } from 'react';

// Gradiente de capa — fonte ÚNICA do "placeholder de capa" da superfície
// pública. Idêntico ao fallback embutido do CardEvento (DS) e ao antigo
// HeroCover: linear-gradient(135deg, --action-primary, --surface-high). Com um
// campo `categoria` no doc público (hoje inexistente na projeção) este poderia
// variar por categoria (RN-166); até lá, o gradiente padronizado é o fallback.
const GRADIENTE =
  'h-full w-full bg-[image:linear-gradient(135deg,var(--action-primary),var(--surface-high))]';

/**
 * Capa resiliente de clube/evento (RN-166 · S1702-T2). Sem URL → gradiente de
 * tokens. Com URL, tenta a imagem e, se ela FALHAR (link morto / domínio fora
 * do next.config), cai no MESMO gradiente via `onError` — nunca resta um `<img>`
 * quebrado com o alt à mostra. Client leaf mínimo (só o `onError` exige cliente);
 * reusado pelo hero da página de evento e pelos cards da home marketplace.
 */
export function CoverImage({
  src,
  alt,
  className,
}: {
  src: string | undefined;
  alt: string;
  className?: string;
}): React.JSX.Element {
  const url = src?.trim();
  const [falhou, setFalhou] = useState(false);

  if (url === undefined || url.length === 0 || falhou) {
    return <div aria-hidden className={GRADIENTE} />;
  }

  return (
    // next/image exige allowlist de domínio (remotePatterns), fora do escopo
    // V1; <img> puro com fallback resiliente cobre o caso do organizador.
    <img
      src={url}
      alt={alt}
      className={className ?? 'h-full w-full object-cover'}
      onError={() => setFalhou(true)}
    />
  );
}
