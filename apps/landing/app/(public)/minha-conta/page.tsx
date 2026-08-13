import type { Metadata } from 'next';
import { AreaDoCliente } from './AreaDoCliente';

// =============================================================================
// Rota `/minha-conta` — a casa autenticada do comprador (S1222-T2 · RN-451).
//
// O QUE ESTA TELA PAGA. Em 04/08 o dono pagou o primeiro PIX real da história
// do sistema e não recebeu retorno nenhum: o e-mail quebrou e não havia
// NENHUMA outra superfície onde ele visse a própria compra. A tela do checkout
// (S1225) fechou a primeira metade — o instante logo depois de pagar. Esta
// fecha a segunda: o lugar onde a pessoa entra depois, de outro aparelho, sem
// depender de e-mail nenhum.
//
// SERVER COMPONENT FINO, DE PROPÓSITO. A página não busca nada: o dado da área
// é do dono da conta e vem por callable com o token do navegador. Renderizar
// no servidor exigiria sessão no servidor — cookie de sessão, que a landing não
// tem e cuja introdução seria uma decisão de arquitetura, não um detalhe desta
// task.
//
// PRIVACIDADE: `noindex` por metadata, `disallow` no `robots.ts`, `no-store` +
// `no-referrer` + `X-Robots-Tag` por rota no `next.config.js`. A mesma
// disciplina de `/ingresso` e `/definir-senha`. Nenhum dado de perfil viaja na
// URL — nem uid, nem e-mail, nem id de pedido: quem a área mostra é sempre
// quem o token diz que é.
// =============================================================================

export const metadata: Metadata = {
  // Título sem nome de pessoa: título com nome vaza no histórico do navegador
  // e na aba compartilhada em tela.
  //
  // S1255-T2 (rodada 2026-08-12-copy-landing · achado G2) · o valor trazia o
  // sufixo da marca à mão e o root layout já aplica `template: '%s · Leela'`
  // (`app/layout.tsx`). A aba do navegador mostrava "Minha conta · Leela ·
  // Leela". O template resolve o sufixo; esta era a única rota fora do padrão.
  title: 'Minha conta',
  robots: { index: false, follow: false, nocache: true },
};

/** Nada de pré-render nem de cache — a página é de uma pessoa só. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function MinhaContaPage(): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <AreaDoCliente />
    </div>
  );
}
