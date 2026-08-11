// =============================================================================
// ParceriasRoutes — subárvore `/parcerias/*` (D-1008-R17). A área que sucede o
// módulo "Marcas" (E10 · S811 seed · RN-171) no rail e absorve as duas frentes
// que moravam em clubs: assessorias parceiras (E18) e afiliações/
// influenciadores (R9-E · RN-318/319). Palavra do dono: "faz mas sentido do
// que deixar em clubs".
//
// Montada uma única vez em App.tsx, confinando o roteamento aqui (baixo
// atrito entre agentes, espelho de ClubesRoutes/CrmRoutes). ToastProvider
// escopado ao módulo; AppErrorBoundary mantém o RootShell no 500.
//
// Anatomia (lição do D-1008-R16): a moldura ParceriasAreaLayout é o ÚNICO dono
// do menu secundário — nenhuma página cola menu por conta própria. Rotas
// antigas NÃO morrem (RN-234): os redirects vivem em ClubesRoutes (assessorias/
// afiliações, precisam de precedência sobre o `:slug` de lá) e na tabela
// REDIRECTS_LEGADOS (`/marcas/*`).
// =============================================================================

import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { ParceriasAreaLayout } from './ParceriasAreaLayout';
import { MarcasPage } from './marcas/MarcasPage';
import { AssessoriasPage } from './assessorias/AssessoriasPage';
import { CadastrarAssessoriaPage } from './assessorias/CadastrarAssessoriaPage';
import { ParceriaDetailPage } from './assessorias/ParceriaDetailPage';
import { AfiliacoesLayout } from './afiliacoes/AfiliacoesLayout';
import { InfluenciadoresPage } from './afiliacoes/InfluenciadoresPage';
import { MinhasAfiliacoesPage } from './afiliacoes/MinhasAfiliacoesPage';
import { NotFound } from '../_system/NotFound';
import { AppErrorBoundary } from '../_system/AppErrorBoundary';

export function ParceriasRoutes(): JSX.Element {
  return (
    <ToastProvider>
      <AppErrorBoundary layout="shell">
        <Routes>
          {/* MOLDURA da área: menu de 3 abas (Marcas · Assessorias parceiras ·
              Afiliações), aba ativa derivada do pathname. */}
          <Route element={<ParceriasAreaLayout />}>
            {/* Marcas é a raiz da área — ocupa o slot de rail que era dela. */}
            <Route index element={<MarcasPage />} />
            <Route path="assessorias" element={<AssessoriasPage />} />
            {/* O detalhe fica DENTRO da moldura (veredito R16: sem shell
                próprio, sem o menu era beco). */}
            <Route path="assessorias/:parceriaId" element={<ParceriaDetailPage />} />
            {/* Frente Afiliações: os DOIS lados (RN-318/319) sob a sub-nav
                terciária do AfiliacoesLayout. */}
            <Route element={<AfiliacoesLayout />}>
              <Route path="afiliacoes" element={<InfluenciadoresPage />} />
              <Route path="afiliacoes/minhas" element={<MinhasAfiliacoesPage />} />
            </Route>
          </Route>
          {/* FORA da moldura por design: criação em tela cheia com retorno
              próprio (precedente /eventos/novo · veredito R16). */}
          <Route path="assessorias/nova" element={<CadastrarAssessoriaPage />} />
          {/* Caminho de parcerias sem rota → 404 no shell. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppErrorBoundary>
    </ToastProvider>
  );
}

ParceriasRoutes.displayName = 'ParceriasRoutes';
