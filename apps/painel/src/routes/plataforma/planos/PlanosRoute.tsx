// =============================================================================
// PlanosRoute — container de `/plataforma/planos` (CB-T3). Liga o catálogo de
// planos (usePlanosCobranca), a lista de tenants (para aplicar) e as ações de
// escrita. platform_admin-only (o PlatformShell já dá 403 sem a claim — padrão
// da fila de repasses). Salvar um plano é write DIRETO do client SDK (Rules);
// APLICAR é Cloud Function (estampa versionada). Sucesso ⇒ reloadKey++ (o
// catálogo revalida) + Toast honesto — inclusive o no-op de reaplicação (replay:
// valores idênticos, nenhuma nova versão).
// =============================================================================

import { useState } from 'react';
import { useToast } from '@leela/design-system';
import type { PlanoCobranca, PlanoCobrancaInput } from '@leela/core';
import { PlanosView } from './PlanosView';
import { PlanoFormModal } from './_components/PlanoFormModal';
import { AplicarPlanoModal } from './_components/AplicarPlanoModal';
import { usePlanosCobranca, usePlanoActions } from './_data/planos';
import { planoIdFromNome } from './_lib/resumo';
import { useTenants } from '../_data/tenants';
import { mensagemDaRecusa } from '../_lib/errors';

export function PlanosRoute(): JSX.Element {
  const { toast } = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<PlanoCobranca | null>(null);
  const [aplicarAlvo, setAplicarAlvo] = useState<PlanoCobranca | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const planos = usePlanosCobranca(reloadKey);
  const { data: tenants, loading: tenantsLoading } = useTenants();
  const actions = usePlanoActions();

  function revalidar() {
    setReloadKey((k) => k + 1);
  }

  function abrirNovo() {
    setEditando(null);
    setFormOpen(true);
  }

  function abrirEdicao(plano: PlanoCobranca) {
    setEditando(plano);
    setFormOpen(true);
  }

  function abrirAplicar(plano: PlanoCobranca) {
    setAplicarAlvo(plano);
    setSelectedTenantId('');
  }

  async function handleSalvar(input: PlanoCobrancaInput) {
    // docId: id existente na edição; slug do nome na criação (determinístico).
    const planoId = editando ? editando.id : planoIdFromNome(input.nome);
    const ok = await actions.salvar(planoId, input);
    if (ok) {
      setFormOpen(false);
      setEditando(null);
      revalidar();
      toast({
        variant: 'success',
        title: editando ? 'Plano atualizado' : 'Plano criado',
        description: input.nome,
      });
    } else {
      toast({
        variant: 'danger',
        title: 'Não foi possível salvar o plano',
        description: mensagemDaRecusa(actions.ultimoErro()),
      });
    }
  }

  async function handleAplicarConfirm() {
    if (!aplicarAlvo || selectedTenantId === '') return;
    const alvo = aplicarAlvo;
    const tenantNome = (tenants ?? []).find((t) => t.id === selectedTenantId)?.nome ?? selectedTenantId;
    const result = await actions.aplicar(selectedTenantId, alvo.id);
    if (result) {
      setAplicarAlvo(null);
      setSelectedTenantId('');
      revalidar();
      if (result.replay) {
        // No-op honesto: os valores já estavam estampados; nenhuma nova versão.
        toast({
          variant: 'info',
          title: 'Plano já vigente',
          description: `${tenantNome} já tinha estes valores — nenhuma nova versão gerada.`,
        });
      } else {
        toast({
          variant: 'success',
          title: 'Plano aplicado',
          description: `${tenantNome} · versão ${result.versao}`,
        });
      }
    } else {
      toast({
        variant: 'danger',
        title: 'Não foi possível aplicar o plano',
        description: mensagemDaRecusa(actions.ultimoErro()),
      });
    }
  }

  return (
    <>
      <PlanosView
        planos={planos.data}
        loading={planos.loading}
        error={planos.error}
        onRetry={revalidar}
        onNovo={abrirNovo}
        onEditar={abrirEdicao}
        onAplicar={abrirAplicar}
      />

      <PlanoFormModal
        open={formOpen}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setFormOpen(false);
            setEditando(null);
          }
        }}
        plano={editando}
        saving={actions.running}
        saveError={actions.error}
        onSave={handleSalvar}
      />

      <AplicarPlanoModal
        open={aplicarAlvo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setAplicarAlvo(null);
            setSelectedTenantId('');
          }
        }}
        plano={aplicarAlvo}
        tenants={tenants}
        tenantsLoading={tenantsLoading}
        selectedTenantId={selectedTenantId}
        onSelectTenant={setSelectedTenantId}
        applying={actions.running}
        applyError={actions.error}
        onConfirm={handleAplicarConfirm}
      />
    </>
  );
}

PlanosRoute.displayName = 'PlanosRoute';
