'use client';

import { useState } from 'react';

// Gradiente de capa — IDÊNTICO ao fallback dos cards da home (CardEvento):
// linear-gradient(135deg, --action-primary, --surface-high). Fonte única do
// "placeholder de capa" da superfície pública.
const GRADIENTE =
  'h-full w-full bg-[image:linear-gradient(135deg,var(--action-primary),var(--surface-high))]';

/**
 * Capa do hero da página de evento. Sem URL de capa (caso do seed e da maioria
 * dos eventos) → gradiente de tokens, igual aos cards da home. Com URL, tenta a
 * imagem e, se ela FALHAR (link morto / domínio fora do next.config), cai no
 * MESMO gradiente via `onError` — nunca resta um `<img>` quebrado com o alt à
 * mostra. Client leaf mínimo (só o onError precisa de cliente).
 */
export function HeroCover({
  imagemUrl,
  nome,
}: {
  imagemUrl: string | undefined;
  nome: string;
}): React.JSX.Element {
  const url = imagemUrl?.trim();
  const [falhou, setFalhou] = useState(false);

  if (!url || falhou) {
    return <div aria-hidden className={GRADIENTE} />;
  }

  return (
    // next/image exige allowlist de domínio (remotePatterns), fora do escopo
    // V1; <img> puro com fallback resiliente cobre o caso do organizador.
    <img
      src={url}
      alt={`Capa de ${nome}`}
      className="h-full w-full object-cover"
      onError={() => setFalhou(true)}
    />
  );
}
