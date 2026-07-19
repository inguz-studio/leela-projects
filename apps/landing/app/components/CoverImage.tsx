'use client';

import { useState } from 'react';

// Capa de exemplo — fonte ÚNICA do fallback de capa da superfície pública.
// LEELA-R12-FIX2-CAPA: antes era um gradiente liso (lido como placeholder). T1
// (LP-VENDAS-KIT): agora é uma FOTO semi-realista de corrida (Unsplash License,
// asset local) para que TODO slot sem capa real (cards da home, timeline do
// organizador, clubes, perfil) exiba uma imagem que parece capa de evento —
// nunca área vazia nem arte abstrata. `bg-cover`/`bg-center` cobrem o slot em
// qualquer proporção.
const FALLBACK_CAPA =
  'h-full w-full bg-[url(/covers/leela-cover-corrida-rua.jpg)] bg-cover bg-center';

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
  priority = false,
  width,
  height,
}: {
  src: string | undefined;
  alt: string;
  className?: string;
  /** Capa acima da dobra (hero/LCP) → carrega eager; o resto fica lazy. */
  priority?: boolean;
  /** Dimensão intrínseca (evita CLS mesmo fora de contêiner com aspect fixo). */
  width?: number;
  height?: number;
}): React.JSX.Element {
  const url = src?.trim();
  const [falhou, setFalhou] = useState(false);

  if (url === undefined || url.length === 0 || falhou) {
    return <div aria-hidden className={FALLBACK_CAPA} />;
  }

  return (
    // next/image exige allowlist de domínio (remotePatterns) p/ a capa http(s)
    // arbitrária do organizador — fora do escopo V1; <img> puro com fallback
    // resiliente cobre o caso. SEO/perf (adendo T1): dimensão intrínseca (sem
    // CLS), `loading` lazy por padrão e `eager` só na capa do hero (LCP).
    <img
      src={url}
      alt={alt}
      {...(width !== undefined ? { width } : {})}
      {...(height !== undefined ? { height } : {})}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className ?? 'h-full w-full object-cover'}
      onError={() => setFalhou(true)}
    />
  );
}
