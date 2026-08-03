import Link from 'next/link';
import { CONTAINER_GUTTER, CONTAINER_LARGURA } from '@/lib/containerPublico';
import { painelUrl } from '@/lib/painel';

/**
 * Header público (S1200-T1). Server Component. Sem navegação de painel
 * (sidebar/breadcrumb ficam no app do organizador).
 *
 * MARCA: wordmark oficial da Leela — variante verde-limão sobre transparente
 * (exportada do Figma `112:51`/`112:5`), que casa com o tema `brasa` (dark) do
 * header. SVG em `/leela-logo-brasa.svg` (public). `<img>` puro (não next/image)
 * porque é asset estático local sem allowlist de domínio.
 *
 * Calha (achado 14 · C2): `max-w-6xl` + padding no mesmo elemento divergia da
 * calha das dobras (`max-w-5xl`, gutter no pai) — o conteúdo do header nascia
 * num x diferente do Hero/dobras da página de evento. Passa a consumir
 * `lib/containerPublico`, a MESMA fonte que `Dobra`/`HeroSection` usam.
 *
 * PORTA DO ORGANIZADOR (S1213-T1): até aqui não existia, em lugar nenhum da
 * landing, um caminho até o painel — quem quisesse entrar precisava saber a
 * URL de cor. "Entrar" e "Criar conta de organizador" vivem no header em
 * desktop E mobile; destino por `lib/painel` (env pública — P10), nunca URL
 * escrita à mão. `<a>` puro em vez de `next/link` porque o destino é OUTRA
 * origem (deploy separado): o Link não prefetcha origem externa e ainda
 * arrastaria o roteador para um caminho que ele não resolve.
 *
 * Mobile: "Eventos" some abaixo de `sm` — o wordmark já leva à home e a
 * largura de 320px não comporta os três rótulos sem quebrar a linha.
 */
export function PublicHeader(): React.JSX.Element {
  return (
    // `data-shell-publico`: marca de NAVEGAÇÃO. A versão imprimível do
    // ingresso (S1214-T4 · RN-424) some com o header e o footer por este
    // seletor — uma folha A4 de ingresso não leva menu nem rodapé
    // institucional. Marcar aqui é mais barato e menos frágil que criar um
    // segundo layout público só para uma rota.
    <header
      data-shell-publico
      className={`sticky top-0 z-40 border-b border-border-subtle bg-surface-base/90 backdrop-blur ${CONTAINER_GUTTER}`}
    >
      <div className={`${CONTAINER_LARGURA} flex h-16 items-center justify-between`}>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-ds-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          aria-label="Leela — página inicial"
        >
          <img
            src="/leela-logo-brasa.svg"
            alt="Leela"
            data-slot="brand-logo"
            className="h-7 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Ações">
          <Link
            href="/"
            className="hidden rounded-ds-sm px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:inline-block"
          >
            Eventos
          </Link>
          <a
            href={painelUrl('/entrar')}
            className="whitespace-nowrap rounded-ds-sm px-2 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:px-3"
          >
            Entrar
          </a>
          <a
            href={painelUrl('/cadastrar')}
            className="whitespace-nowrap rounded-ds-pill border border-border-default px-2 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:px-3 sm:text-sm"
          >
            Criar conta de organizador
          </a>
          {/* Placeholder pré-existente. Sobe de `sm` para `lg`: com os dois
              rótulos de conta ao lado, um quarto item quebrava a linha do
              header em tablet. */}
          <span
            className="hidden rounded-ds-pill border border-border-default px-3 py-1.5 text-sm font-medium text-text-tertiary lg:inline-block"
            title="Em breve"
          >
            Baixar o app
          </span>
        </nav>
      </div>
    </header>
  );
}
