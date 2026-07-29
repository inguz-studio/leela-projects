// =============================================================================
// RequireSessao (guarda de autenticação da branch com shell) — LEELA-FIX-AUTHGUARD.
//
// Defeito de origem: no preview de produção, abrir a raiz não mostrava login
// nem caminho até ele — a branch `/*` (RootShell) nasceu "já logada" (design
// preview-first mockado) e as rotas de conta da S020 são ADITIVAS. Este guard
// fecha o buraco SEM tocar no preview local:
//
//   - Modo Emulator (`isModoEmulador()` — a MESMA regra do initFirebase):
//     guard INERTE. O preview de 1 comando (preview.sh + auto-login), o
//     `pnpm dev` dos agentes e o vitest (DEV) continuam caindo na raiz
//     mockada intactos.
//   - Produção (VITE_USE_EMULATOR='false', build --mode leela-hub): sem
//     sessão → redirect a `/entrar` guardando a rota de origem em
//     `state.from` — o MESMO contrato que RequirePapel grava e EntrarPage
//     consome (sanitizado por caminhoInternoSeguro). Sessão que morre em
//     rota profunda (logout/expiração) cai no mesmo redirect, porque o
//     listener re-renderiza o guard a cada mudança de sessão.
//
// Por que `onSessionChange` direto e não `useTenantSession`: o guard só
// precisa de PRESENÇA (há usuário?), não de claims. `useTenantSession`
// resolve `tenantId` com refresh forçado quando o claim falta — custo de
// rede por navegação que aqui não compra nada. Contrato distinto em módulo
// próprio, mesmo critério do cabeçalho de tenantSession.ts (overview,
// plataforma, marcas e rodapé do shell).
// =============================================================================

import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@leela/design-system';
import { onSessionChange } from '@leela/api-client';
import { isModoEmulador } from '../../lib/firebase';

// Mesmo destino do RequirePapel (fluxo de login E00 / S020-T1).
const ROTA_LOGIN = '/entrar';

export type SessaoStatus = 'loading' | 'anonymous' | 'authenticated';

export type SessaoDecisao = 'render' | 'loading' | 'login';

/**
 * Decisão PURA do guard — testável sem render. Guard inerte (modo Emulator)
 * SEMPRE renderiza; ativo, espera a restauração da sessão persistida
 * ('loading' → nunca decide a meio caminho, senão o usuário logado que abre
 * uma rota profunda quicaria em /entrar antes do Firebase restaurar).
 * @pure
 */
export function avaliarSessao(guardAtivo: boolean, status: SessaoStatus): SessaoDecisao {
  if (!guardAtivo) return 'render';
  if (status === 'loading') return 'loading';
  if (status === 'anonymous') return 'login';
  return 'render';
}

interface RequireSessaoProps {
  children: ReactNode;
}

export function RequireSessao({ children }: RequireSessaoProps): JSX.Element {
  // Constante por build (import.meta.env é inlinado) — não muda entre renders.
  const guardAtivo = !isModoEmulador();
  const [status, setStatus] = useState<SessaoStatus>('loading');
  const location = useLocation();

  useEffect(() => {
    if (!guardAtivo) return;
    // onAuthStateChanged emite o estado atual já no subscribe (restauração
    // do storage inclusa) e depois a cada login/logout/expiração.
    return onSessionChange((user) => {
      setStatus(user ? 'authenticated' : 'anonymous');
    });
  }, [guardAtivo]);

  const decisao = avaliarSessao(guardAtivo, status);

  if (decisao === 'loading') {
    return (
      <div role="status" aria-label="Verificando sessão" className="p-[var(--spacing-6)]">
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }
  if (decisao === 'login') {
    // Contrato S020-T1: EntrarPage devolve o usuário exatamente onde ele
    // tentou entrar (state.from, sanitizado no sink).
    return (
      <Navigate to={ROTA_LOGIN} replace state={{ from: location.pathname + location.search }} />
    );
  }
  return <>{children}</>;
}

RequireSessao.displayName = 'RequireSessao';
