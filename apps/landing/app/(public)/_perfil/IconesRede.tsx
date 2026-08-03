// =============================================================================
// apps/landing/app/(public)/_perfil/IconesRede.tsx
//
// Ícone por rede social — S1707-T2 · RN-444 · D-ACH-17/D-ACH-18.
//
// Sete redes vêm do `lucide`, que a landing já usa: Instagram, Facebook,
// Twitter, YouTube, LinkedIn, GitHub e Twitch. Três não existem lá e são
// justamente as que um produtor de experiências de bem-estar usa — WhatsApp,
// TikTok e Strava —, então entram como SVG local (D-ACH-18). O genérico é o
// `Link` do lucide: endereço não reconhecido continua na fileira.
//
// Os três locais são desenhos SIMPLIFICADOS na mesma grade do lucide (24×24,
// traço `currentColor`, sem preenchimento, pontas arredondadas), para que a
// fileira tenha um peso visual só. Não são as marcas oficiais: se o dono
// quiser o glifo exato de cada empresa, é trocar os `d` destes três paths —
// nada mais nesta frente depende deles.
//
// Server-safe: SVG puro, sem estado, sem hook. O ícone é sempre DECORATIVO
// (`aria-hidden`) — quem carrega o nome acessível é o link que o embrulha, com
// o rótulo que o organizador digitou.
// =============================================================================

import {
  Facebook,
  Github,
  Instagram,
  Link as LinkGenerico,
  Linkedin,
  Twitch,
  Twitter,
  Youtube,
} from 'lucide-react';
import type { RedeId } from './redes';

interface PropsIcone {
  size: number;
  strokeWidth: number;
  className?: string | undefined;
}

/** Moldura comum dos três SVGs locais — mesma grade e mesmo traço do lucide. */
function SvgLocal({
  size,
  strokeWidth,
  className,
  children,
}: PropsIcone & { children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** WhatsApp: balão com rabicho à esquerda + fone simplificado. */
function IconeWhatsApp(props: PropsIcone): React.JSX.Element {
  return (
    <SvgLocal {...props}>
      <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.86L3.5 20.5l4.2-1.13A8.5 8.5 0 1 0 12 3.5Z" />
      <path d="M9.3 8.7c.3-.2.7-.1.9.2l.8 1.2c.2.3.1.6-.1.8l-.5.5a5.7 5.7 0 0 0 2.2 2.2l.5-.5c.2-.2.6-.3.8-.1l1.2.8c.3.2.4.6.2.9-.5.7-1.4 1-2.2.7a9 9 0 0 1-4.5-4.5c-.3-.8 0-1.7.7-2.2Z" />
    </SvgLocal>
  );
}

/** TikTok: haste da nota com a laçada embaixo + a curva do topo. */
function IconeTikTok(props: PropsIcone): React.JSX.Element {
  return (
    <SvgLocal {...props}>
      <path d="M14.6 3.5v10.6a4.4 4.4 0 1 1-3.6-4.3" />
      <path d="M14.6 3.5a5.3 5.3 0 0 1 5.3 5.3" />
    </SvgLocal>
  );
}

/** Strava: os dois chevrons, o de baixo deslocado como na marca. */
function IconeStrava(props: PropsIcone): React.JSX.Element {
  return (
    <SvgLocal {...props}>
      <path d="M11.6 3 5.5 14.5h3.7L11.6 10l2.4 4.5h3.7L11.6 3Z" />
      <path d="M14 14.5 12.3 17.8 10.6 14.5H8.1l4.2 6.5 4.2-6.5H14Z" />
    </SvgLocal>
  );
}

/**
 * Ícone da rede. Sempre decorativo: o nome acessível mora no link, não aqui —
 * dois nomes para o mesmo alvo fariam o leitor de tela anunciar duas vezes.
 */
export function IconeRede({
  rede,
  size = 20,
  strokeWidth = 1.75,
  className,
}: {
  rede: RedeId;
  size?: number;
  strokeWidth?: number;
  className?: string;
}): React.JSX.Element {
  const props: PropsIcone = { size, strokeWidth, className };
  const comuns = { size, strokeWidth, className, 'aria-hidden': true } as const;

  switch (rede) {
    case 'instagram':
      return <Instagram {...comuns} />;
    case 'facebook':
      return <Facebook {...comuns} />;
    case 'twitter':
      return <Twitter {...comuns} />;
    case 'youtube':
      return <Youtube {...comuns} />;
    case 'linkedin':
      return <Linkedin {...comuns} />;
    case 'github':
      return <Github {...comuns} />;
    case 'twitch':
      return <Twitch {...comuns} />;
    case 'whatsapp':
      return <IconeWhatsApp {...props} />;
    case 'tiktok':
      return <IconeTikTok {...props} />;
    case 'strava':
      return <IconeStrava {...props} />;
    case 'site':
    default:
      return <LinkGenerico {...comuns} />;
  }
}
