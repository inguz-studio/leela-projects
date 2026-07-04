// =============================================================================
// TermsEditorRoute — container de `/plataforma/tenants/:tenantId/termos`
// (S1602-T2). Liga dados (useCommercialTerms) + save (useSaveCommercialTerms) +
// Toast. readOnly deriva do papel (RN-404): só platform_admin edita. Sucesso
// mostra a versão gravada e recarrega os termos vigentes.
// =============================================================================

import { useCallback, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { CommercialTermsInput } from '@leela/core';
import { TermsEditor } from './TermsEditor';
import { useCommercialTerms, useSaveCommercialTerms } from '../../_data/terms';
import type { PlatformOutletContext } from '../../_components/PlatformShell';

export function TermsEditorRoute(): JSX.Element {
  const { tenantId = '' } = useParams<{ tenantId: string }>();
  const { isAdmin, uid } = useOutletContext<PlatformOutletContext>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reloadKey, setReloadKey] = useState(0);

  const { data: terms, loading, error } = useCommercialTerms(tenantId, reloadKey);
  const saver = useSaveCommercialTerms(tenantId, uid ?? '');

  const handleSave = useCallback(
    async (input: CommercialTermsInput) => {
      const versao = await saver.save(input);
      if (versao !== null) {
        setReloadKey((k) => k + 1);
        toast({ variant: 'success', title: 'Termos salvos', description: `Versão ${versao} vigente` });
      } else {
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
      saving={saver.saving}
      saveError={saver.error}
      onSave={handleSave}
      onVoltar={() => navigate(`/plataforma/tenants/${tenantId}`)}
    />
  );
}

TermsEditorRoute.displayName = 'TermsEditorRoute';
