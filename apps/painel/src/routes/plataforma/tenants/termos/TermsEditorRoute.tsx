// =============================================================================
// TermsEditorRoute — container de `/plataforma/tenants/:tenantId/termos`
// (S1602-T2). Liga dados (useCommercialTerms) + save (useSaveCommercialTerms do
// gateway) + Toast. readOnly deriva do papel (RN-404): só platform_admin edita.
// No sucesso mostra a versão gravada; os termos vigentes revalidam sozinhos
// (invalidação de chave, ADR-010), sem contador de reload.
// =============================================================================

import { useCallback } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { CommercialTermsInput } from '@leela/core';
import { TermsEditor } from './TermsEditor';
import { useCommercialTerms } from '../../_data/terms';
import { useSaveCommercialTerms } from '../../../../lib/query/mutations';
import type { PlatformOutletContext } from '../../_components/PlatformShell';

export function TermsEditorRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const { isAdmin, uid } = useOutletContext<PlatformOutletContext>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: terms, loading, error } = useCommercialTerms(tenantId);
  // Lock otimista (TAXAFLEX F5): a versão CARREGADA viaja no save — termo
  // alterado por outro admin/aplicarPlano no meio-tempo recusa o save.
  const saver = useSaveCommercialTerms(tenantId, uid ?? '', terms?.versao);

  const handleSave = useCallback(
    async (input: CommercialTermsInput) => {
      try {
        const versao = await saver.mutateAsync(input);
        // read-your-writes: `['plataforma','termos',id]` revalida no gateway.
        toast({ variant: 'success', title: 'Termos salvos', description: `Versão ${versao} vigente` });
      } catch {
        toast({ variant: 'danger', title: 'Não foi possível salvar', description: 'Verifique os dados e tente novamente.' });
      }
    },
    [saver, toast],
  );

  return (
    <TermsEditor
      terms={terms}
      loading={loading}
      error={error}
      readOnly={!isAdmin}
      saving={saver.isPending}
      saveError={saver.error}
      onSave={handleSave}
      onVoltar={() => navigate(`/plataforma/tenants/${tenantId}`)}
    />
  );
}

TermsEditorRoute.displayName = 'TermsEditorRoute';
