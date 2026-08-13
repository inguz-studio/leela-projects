import Link from 'next/link';
import { CONTAINER_GUTTER, CONTAINER_LARGURA } from '@/lib/containerPublico';
import { buttonVariants } from '@leela/design-system/server';
import { painelUrl } from '@/lib/painel';
import { cn } from '@/lib/utils';
import { ContaHeader } from './ContaHeader';

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
 * URL de cor. "Criar conta de organizador" vive no header em desktop E mobile;
 * destino por `lib/painel` (env pública — P10), nunca URL escrita à mão. `<a>`
 * puro em vez de `next/link` porque o destino é OUTRA origem (deploy
 * separado): o Link não prefetcha origem externa e ainda arrastaria o roteador
 * para um caminho que ele não resolve.
 *
 * ENTRADA (S1221-T1): "Entrar" saiu daqui como link para o painel e virou o
 * `ContaHeader` — botão que abre o overlay de login da PRÓPRIA landing, sem
 * tirar a pessoa da página. A porta direta do organizador segue viva no
 * rodapé, sob a navegação "Organizador", que continua apontando para
 * `painelUrl('/entrar')`.
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
          {/* S1255-T6 (rodada 2026-08-12-copy-landing · achado L3) · o wordmark
              e este link apontavam os DOIS para `/`: dois alvos, um destino,
              rótulos diferentes. Quem clicava esperando a lista recebia a home
              inteira, hero incluído. O link passa a apontar para a âncora que
              já existe, que é o comportamento que o rótulo promete.

              O rótulo virou "Experiências" na mesma passada (D-0802-1, e a
              dobra de destino já se chama "Experiências abertas"). O `id` do
              alvo continua `eventos`: identificador não é o que a pessoa lê —
              mesma régua da RN-399. */}
          <Link
            href="/#eventos"
            className="hidden rounded-ds-sm px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:inline-block"
          >
            Experiências
          </Link>
          {/* S1221-T1: "Entrar" deixou de ser link para OUTRA origem (o painel)
              e virou o overlay da própria landing — a pessoa entra sem perder
              a página que estava lendo. A porta direta do organizador continua
              no rodapé, sob a navegação "Organizador". */}
          <ContaHeader />
          <a
            href={painelUrl('/cadastrar')}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              'whitespace-nowrap rounded-ds-pill',
            )}
          >
            Criar conta de organizador
          </a>
          {/* Placeholder pré-existente. Sobe de `sm` para `lg`: com os dois
              rótulos de conta ao lado, um quarto item quebrava a linha do
              header em tablet.

              S1255-T1 (rodada 2026-08-12-copy-landing · achado G3) · o rótulo
              era "Baixar o app" e o aviso "Em breve" morava num `title`, que só
              existe no hover. No celular, onde não há hover, a pessoa lia uma
              oferta, tocava e não acontecia nada — sem aviso, sem destino, sem
              explicação. O rótulo passa a dizer o estado, a promessa sai do
              modo imperativo, e o `title` some junto porque virou redundante. */}
          <span className="hidden rounded-ds-pill border border-border-default px-3 py-1.5 text-sm font-medium text-text-tertiary lg:inline-block">
            App em breve
          </span>
        </nav>
      </div>
    </header>
  );
}
