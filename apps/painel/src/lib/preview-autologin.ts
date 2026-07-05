// =============================================================================
// apps/painel/src/lib/preview-autologin.ts — auto-login SÓ do preview local
//
// Por que existe: o painel não tem tela de login (a autenticação real é
// responsabilidade de outra superfície). Para o "preview de 1 comando" mostrar
// as telas COM os dados de seed, precisamos de uma sessão Firebase autenticada
// no navegador. Este módulo entra logado com um usuário de seed (criado no
// Emulator Auth por functions/scripts/preview-seed.ts).
//
// Blindagem (fail-closed): NADA acontece a menos que
//   import.meta.env.VITE_PREVIEW_AUTOLOGIN === 'true'
// Essa flag só é ligada pelo preview.sh. Em `pnpm dev`, testes, CI e produção
// ela está ausente → esta função é um no-op absoluto. Zero impacto.
//
// Troca de identidade por URL (?preview=): permite ao Vitor passear pelas áreas
// que pertencem a tenants diferentes nos seeds:
//   ?preview=castelo → Produtora (tenant Castelo Produções) — eventos + visão geral
//   ?preview=corrida → Dono de clube (Corrida Perfeita Sul) — clubes/membros/desafios
//   ?preview=admin   → Admin da plataforma — área /plataforma
// =============================================================================

import {
  getCurrentUser,
  loginComEmail,
  logout,
  onSessionChange,
} from '@leela/api-client';

interface PreviewIdentity {
  email: string;
  senha: string;
}

/** Senha única de todos os usuários de preview (só existe no Emulator). */
const PREVIEW_PASSWORD = 'demo1234';

const PREVIEW_IDENTITIES: Record<string, PreviewIdentity> = {
  castelo: { email: 'marina@demo-leela.dev', senha: PREVIEW_PASSWORD },
  corrida: { email: 'felipe@demo-leela.dev', senha: PREVIEW_PASSWORD },
  admin: { email: 'admin@demo-leela.dev', senha: PREVIEW_PASSWORD },
};

const DEFAULT_IDENTITY = 'castelo';

function resolveIdentity(): PreviewIdentity {
  const key = new URLSearchParams(window.location.search).get('preview');
  return (
    (key !== null ? PREVIEW_IDENTITIES[key] : undefined) ??
    PREVIEW_IDENTITIES[DEFAULT_IDENTITY]!
  );
}

/**
 * Garante que a sessão do navegador esteja logada como o usuário-alvo do
 * preview. No-op fora do preview. Espera o primeiro estado do Auth (restauração
 * da sessão persistida) antes de decidir, para não relogar à toa.
 */
export function initPreviewAutologin(): void {
  if (import.meta.env.VITE_PREVIEW_AUTOLOGIN !== 'true') return;

  const target = resolveIdentity();

  const unsub = onSessionChange((user) => {
    // Só reagimos ao PRIMEIRO evento (restauração); depois cuidamos da sessão.
    unsub();
    void (async () => {
      try {
        const atual = user ?? getCurrentUser();
        if (atual?.email === target.email) return; // já é a identidade certa
        if (atual) await logout(); // troca de identidade (?preview= diferente)
        await loginComEmail(target.email, target.senha);
      } catch (erro) {
        // Preview é ambiente de dev; log no console é a saída natural.
        console.error('[preview] auto-login falhou:', erro);
      }
    })();
  });
}
