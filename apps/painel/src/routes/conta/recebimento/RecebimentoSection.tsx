// =============================================================================
// RecebimentoSection — container de **Configurações › Dados de recebimento**
// dentro de `/conta` (RN-366).
//
// Liga a sessão do organizador (tenantId) às MESMAS leitura e mutação de
// sempre — `useDadosBancarios` / `useSaveDadosBancarios`, sem uma linha de
// backend nova — e entrega tudo à `DadosBancariosSection`. RN-354 intacta: o
// callable devolve só o mascarado, e é só o mascarado que a tela mostra.
//
// A sessão vem do hook que já existe no módulo de repasse, em vez de uma
// QUARTA cópia de um hook idêntico (assessorias, crm e repasses já carregam a
// mesma implementação). O acoplamento é declarado e tem precedente:
// `plataforma/repasses` já importa de `eventos/repasses/_lib`. A saída
// definitiva é o SessionProvider global que os próprios docblocks desses hooks
// apontam — candidato à review antagonista, não improviso desta lane.
// =============================================================================

import { useCallback } from 'react';
import { useToast } from '@leela/design-system';
import type { SaveDadosBancariosInput } from '@leela/api-client';
import { useFinanceiroSession } from '../../eventos/repasses/_data/session';
import { useDadosBancarios } from '../../eventos/repasses/_data/repasses';
import { repasseErrorMessage } from '../../eventos/repasses/_lib/erros';
import { useSaveDadosBancarios } from '../../../lib/query/mutations';
import { DadosBancariosSection } from './DadosBancariosSection';

export function RecebimentoSection(): JSX.Element {
  const session = useFinanceiroSession();
  const carregandoSessao = session.status === 'loading';
  const tenantId = session.tenantId;
  const { toast } = useToast();

  const dados = useDadosBancarios(tenantId);
  const salvarDados = useSaveDadosBancarios(tenantId ?? '');

  // Mesmo contrato de antes: resolve `true` em sucesso (a section sai do modo
  // edição). Sucesso → Toast + read-your-writes (a query invalidada traz o
  // mascarado); falha → erro inline no form.
  const onSubmitDados = useCallback(
    async (input: SaveDadosBancariosInput): Promise<boolean> => {
      try {
        await salvarDados.mutateAsync(input);
        toast({
          variant: 'success',
          title: 'Dados bancários salvos',
          description: 'Guardados com segurança — só os dígitos finais ficam visíveis.',
        });
        return true;
      } catch {
        return false;
      }
    },
    [salvarDados, toast],
  );

  return (
    <DadosBancariosSection
      dados={dados.data}
      loading={carregandoSessao || dados.loading}
      error={dados.error}
      onRetry={dados.refetch}
      saving={salvarDados.isPending}
      saveError={repasseErrorMessage(salvarDados.error, 'dados') || undefined}
      onSubmit={onSubmitDados}
    />
  );
}

RecebimentoSection.displayName = 'RecebimentoSection';
