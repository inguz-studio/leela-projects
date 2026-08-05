// =============================================================================
// CrmRoutes — subárvore `/crm/*`. A área **CRM** do menu (RN-233), com três
// subdivisões sob a mesma moldura (RN-823 · E19 · S-R9-13):
//
//   /crm                      → Visão geral (a análise de vendas + perfil
//                               demográfico que vinha de `/financeiro`)
//   /crm/visao-geral          → alias explícito da mesma tela
//   /crm/clientes             → lista cross-evento com LTV
//   /crm/clientes/:clienteKey → ficha individual
//   /crm/comunicacao          → estado honesto até o E19 · S1901-T4c
//
// ORDEM DE ROTAS (risco de regressão #2 do report): as subdivisões NOMEADAS
// vêm antes de qualquer parâmetro. O redirect legado `/crm/:clienteKey` →
// `/crm/clientes/:clienteKey` entra no IAM-T6 e precisa que `clientes`,
// `comunicacao` e `visao-geral` sejam rotas reais — senão `/crm/clientes`
// casaria com o parâmetro e entraria em laço de redirecionamento. Por isso
// `visao-geral` é rota declarada, e não só o índice: é exatamente a lista de
// exclusão que o mapa DE→PARA exige do redirect.
//
// Montada uma única vez em App.tsx, confinando o roteamento do CRM aqui.
// ToastProvider escopado ao módulo; AppErrorBoundary mantém o RootShell no 500.
// =============================================================================

import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { AnaliseVendasPage } from './visao-geral/AnaliseVendasPage';
import { ClientesPage } from './ClientesPage';
import { ClienteDetailPage } from './ClienteDetailPage';
import { ComunicacaoIndisponivel } from './comunicacao/ComunicacaoIndisponivel';
import { CrmSubNav } from './_components/CrmSubNav';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

/**
 * `/crm/{chave}` (formato antigo) → `/crm/clientes/{chave}` (RN-234).
 * `replace` para o "voltar" do navegador não devolver a pessoa à URL morta.
 * A chave é re-encodada: ela vem decodificada do `useParams` e volta para a
 * URL — sem isso, uma chave com caractere especial se perderia no caminho.
 * Querystring e fragmento viajam junto (achado A-3 da review antagonista):
 * `<Navigate to="…">` com string simples troca a location inteira e o
 * `?preview=` do preview local do Vitor evaporaria no salto.
 */
function RedirectFichaLegada(): JSX.Element {
  const { clienteKey } = useParams<{ clienteKey: string }>();
  const { search, hash } = useLocation();
  return (
    <Navigate
      to={`/crm/clientes/${encodeURIComponent(clienteKey ?? '')}${search}${hash}`}
      replace
    />
  );
}

RedirectFichaLegada.displayName = 'RedirectFichaLegada';

/**
 * Moldura com a SubNav (Visão geral | Clientes | Comunicação).
 *
 * RESPIRO DO TOPO (REV-PAINEL, achado da review do Adendo 13): o CRM é a outra
 * área cujo PRIMEIRO elemento na área de rolagem é uma SubNav de 48px sem
 * padding vertical, e não um PageHeader de 96px. Com a barra superior suprimida
 * do shell, a aba passava a encostar a ~12px do topo — metade do respiro das
 * telas que abrem com PageHeader (`/plataforma`, `/`, `/clubes`, `/marcas`). O
 * `pt` mora na moldura da área, igual ao `pt-5` do EventoShell.
 */
export function CrmLayout(): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-4)] pt-[var(--spacing-5)]">
      <CrmSubNav />
      <Outlet />
    </div>
  );
}

CrmLayout.displayName = 'CrmLayout';

export function CrmRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="shell">
        <Routes>
          <Route element={<CrmLayout />}>
            <Route index element={<AnaliseVendasPage />} />
            <Route path="visao-geral" element={<AnaliseVendasPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="clientes/:clienteKey" element={<ClienteDetailPage />} />
            <Route path="comunicacao" element={<ComunicacaoIndisponivel />} />
            {/* RN-234 · rota legada da ficha: `/crm/{chave}` desceu um nível.
                Chega DEPOIS das subdivisões nomeadas de propósito — é a ordem
                que impede `/crm/clientes` de casar com o parâmetro e entrar em
                laço. Um salto só: o destino resolve em `clientes/:clienteKey`,
                que não redireciona de novo. */}
            <Route path=":clienteKey" element={<RedirectFichaLegada />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

CrmRoutes.displayName = 'CrmRoutes';
