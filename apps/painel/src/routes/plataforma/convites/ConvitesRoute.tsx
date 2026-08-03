// =============================================================================
// ConvitesRoute — container de `/plataforma/convites` (S1608-T2 · RN-413).
//
// Liga a lista, as ações de escrita (gerar/revogar) e o feedback. O
// PlatformShell já dá 403 sem a claim `platform_admin` — mesmo padrão das
// demais telas de plataforma; a tranca REAL está nas Rules.
//
// Revogar passa por ConfirmModal com as consequências explícitas: revogar NÃO
// desfaz tenant já provisionado (RN-413) e não alcança código já usado. Quem
// revoga precisa ler isso antes de clicar, não descobrir depois.
// =============================================================================

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ConfirmModal, useToast } from '@leela/design-system';
import type { ConviteOrganizador } from '@leela/core';
import { ConvitesView } from './ConvitesView';
import { useConviteActions, useConvitesOrganizador } from './_data/convites';
import type { PlatformOutletContext } from '../_components/PlatformShell';
import { mensagemDaRecusa } from '../_lib/errors';

export function ConvitesRoute(): JSX.Element {
  const { uid } = useOutletContext<PlatformOutletContext>();
  const { toast } = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [alvoRevogacao, setAlvoRevogacao] = useState<ConviteOrganizador | null>(null);

  const convites = useConvitesOrganizador(reloadKey);
  const actions = useConviteActions();

  function revalidar(): void {
    setReloadKey((k) => k + 1);
  }

  async function handleGerar(input: { nota: string; expiraEm: string }): Promise<void> {
    if (uid === null) return;
    // `date` do input vem como 'AAAA-MM-DD' (meia-noite LOCAL quando parseado
    // com os três números — `new Date('2026-12-31')` seria UTC e voltaria um
    // dia em fuso negativo). Validade é o FIM do dia escolhido: quem digita
    // 31/12 espera o código vivo até o fim do 31.
    let expiraEm: Date | undefined;
    if (input.expiraEm.length > 0) {
      const [ano, mes, dia] = input.expiraEm.split('-').map(Number);
      if (ano !== undefined && mes !== undefined && dia !== undefined) {
        expiraEm = new Date(ano, mes - 1, dia, 23, 59, 59, 999);
      }
    }
    const codigo = await actions.gerar({
      criadoPor: uid,
      ...(input.nota.trim().length > 0 ? { nota: input.nota.trim() } : {}),
      ...(expiraEm ? { expiraEm } : {}),
    });
    if (codigo !== null) {
      revalidar();
      toast({ variant: 'success', title: 'Convite gerado', description: codigo });
    } else {
      toast({
        variant: 'danger',
        title: 'Não foi possível gerar o convite',
        description: mensagemDaRecusa(actions.ultimoErro()),
      });
    }
  }

  async function handleCopiar(codigo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo);
      toast({ variant: 'success', title: 'Código copiado', description: codigo });
    } catch {
      // Área de transferência bloqueada (permissão/contexto inseguro): o
      // código já está visível na tabela — dizer isso é mais útil que um erro
      // genérico sobre uma API de navegador.
      toast({
        variant: 'info',
        title: 'Copie manualmente',
        description: `O navegador bloqueou a cópia automática. Código: ${codigo}`,
      });
    }
  }

  async function handleConfirmarRevogacao(): Promise<void> {
    if (!alvoRevogacao || uid === null) return;
    const codigo = alvoRevogacao.codigo;
    const ok = await actions.revogar(codigo, uid);
    setAlvoRevogacao(null);
    if (ok) {
      revalidar();
      toast({ variant: 'success', title: 'Convite revogado', description: codigo });
    } else {
      toast({
        variant: 'danger',
        title: 'Não foi possível revogar o convite',
        description: mensagemDaRecusa(actions.ultimoErro()),
      });
    }
  }

  return (
    <>
      <ConvitesView
        convites={convites.data}
        loading={convites.loading}
        error={convites.error}
        gerando={actions.running}
        onRetry={revalidar}
        onGerar={(input) => void handleGerar(input)}
        onCopiar={(codigo) => void handleCopiar(codigo)}
        onRevogar={setAlvoRevogacao}
      />

      <ConfirmModal
        open={alvoRevogacao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAlvoRevogacao(null);
        }}
        title="Revogar este convite?"
        description="O código deixa de funcionar para quem ainda não o usou."
        target={alvoRevogacao ? `Código ${alvoRevogacao.codigo}` : undefined}
        loses={[
          'Quem receber este código não conseguirá mais destravar a conta',
          'Não dá para reativar o mesmo código — gere um novo',
        ]}
        keeps={[
          'Contas que JÁ usaram um código seguem intactas',
          'Nenhum organizador já provisionado perde o acesso',
        ]}
        confirmLabel="Revogar convite"
        loading={actions.running}
        onConfirm={() => void handleConfirmarRevogacao()}
      />
    </>
  );
}

ConvitesRoute.displayName = 'ConvitesRoute';
