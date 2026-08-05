import type { Metadata } from 'next';
import { DefinirSenhaFlow } from './DefinirSenhaFlow';

// =============================================================================
// Rota `/definir-senha` — o primeiro acesso do COMPRADOR (S1223-T1 · RN-453).
//
// POR QUE NA LANDING E NÃO NO PAINEL: a `RedefinirSenhaPage` do painel existe e
// funciona, mas o comprador que definisse a senha ali seria expulso no passo
// seguinte — sem tenant e sem `profissionais/{uid}`, a guarda de conta órfã do
// `destinoPosLogin` barra a conta e derruba a sessão. A pessoa definiria a
// senha e seria mandada embora, que é o oposto do que o dono descreveu:
// "ela entra, define a senha e entra no sistema".
//
// PRIVACIDADE: o `oobCode` é credencial de uso único e viaja na QUERY. Mesma
// disciplina da página do ingresso e do convite — `noindex` por metadata,
// `disallow` no `robots.ts`, e `Cache-Control: no-store` +
// `Referrer-Policy: no-referrer` por rota no `next.config.js`. Sem o
// no-referrer, o código sai no `Referer` de qualquer link de saída da página.
//
// Server Component fino: lê a query e entrega ao fluxo de cliente, que é quem
// fala com o Auth. Nenhum segredo desce daqui.
// =============================================================================

export const metadata: Metadata = {
  // Título genérico de propósito: título com nome de pessoa vaza no histórico
  // do navegador e na aba compartilhada em tela.
  title: 'Definir senha · Leela',
  robots: { index: false, follow: false, nocache: true },
};

// Lê `searchParams` — nada de pré-render nem de cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

function primeiro(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor[0] ?? '';
  return valor ?? '';
}

export default function DefinirSenhaPage({ searchParams }: Props): React.JSX.Element {
  // O Firebase manda `mode=resetPassword&oobCode=...`. Aceitamos o `oobCode`
  // sozinho: o handler hospedado é que multiplexa modos, e esta rota tem um só.
  const oobCode = primeiro(searchParams['oobCode']);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <DefinirSenhaFlow oobCode={oobCode} />
    </div>
  );
}
