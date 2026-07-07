// =============================================================================
// ParceriasPage — container da tela de parcerias (`/clubes/:slug/parcerias`).
// Aceitar/recusar convite → transição de status real (RN-120/122) + reload.
// Copiar link master (RN-125). Modais de patrocinador/destrutivos/termos são
// ligados nos commits S107-T3/T4/T5.
// =============================================================================

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { ParceriaEventoAfiliado } from '@leela/core';
import { ParceriasView } from './ParceriasView';
import { AddPatrocinadorModal } from './AddPatrocinadorModal';
import {
  ParceriaDestrutivaModal,
  type VarianteDestrutiva,
} from './ParceriaDestrutivaModal';
import { TermosModal } from './TermosModal';
import { useParcerias } from '../../_data/parcerias';
import { useCriarPatrocinador, useTransicionarParceria } from '../../../../lib/query/mutations';
import type { PatrocinadorInput } from '../../_lib/parcerias';
import type { ClubeOutletContext } from '../ClubeLayout';

interface AlvoDestrutivo {
  variante: VarianteDestrutiva;
  id: string;
  nome: string;
}

export function ParceriasPage(): JSX.Element {
  const { clube } = useOutletContext<ClubeOutletContext>();
  const { toast } = useToast();
  const { data: parcerias, loading, error } = useParcerias(clube.id);
  // Mutações via gateway (lib/query): transicionar/adicionar patrocinador
  // invalidam parcerias.doClube — a lista reflete a escrita sem reload() (ADR-010).
  const transicionarMutation = useTransicionarParceria(clube.id);
  const criarPatrocinadorMutation = useCriarPatrocinador(clube.id);
  const [addAberto, setAddAberto] = useState(false);
  const [destrutiva, setDestrutiva] = useState<AlvoDestrutivo | null>(null);
  const [termos, setTermos] = useState<ParceriaEventoAfiliado | null>(null);

  async function transicionar(
    p: ParceriaEventoAfiliado,
    status: 'ativa' | 'inativa',
    okTitle: string,
  ): Promise<void> {
    try {
      await transicionarMutation.mutateAsync({ parceriaId: p.id, status });
      toast({ variant: 'success', title: okTitle });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível atualizar a parceria' });
    }
  }

  function copiarLink(p: ParceriaEventoAfiliado): void {
    void navigator.clipboard
      ?.writeText(p.linkMaster)
      .then(() => toast({ variant: 'success', title: 'Link master copiado' }))
      .catch(() => toast({ variant: 'danger', title: 'Não foi possível copiar o link' }));
  }

  async function criarPatrocinador(input: PatrocinadorInput): Promise<void> {
    try {
      await criarPatrocinadorMutation.mutateAsync({ tenantId: clube.tenantId, ...input });
      toast({ variant: 'success', title: `${input.nome} adicionado como patrocinador` });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível adicionar o patrocinador' });
    }
  }

  async function confirmarDestrutiva(): Promise<void> {
    if (!destrutiva) return;
    const okTitle =
      destrutiva.variante === 'desativar-patrocinador'
        ? `${destrutiva.nome} desativado`
        : `${destrutiva.nome} removido dos eventos promovidos`;
    try {
      await transicionarMutation.mutateAsync({ parceriaId: destrutiva.id, status: 'inativa' });
      toast({ variant: 'success', title: okTitle });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível concluir a ação' });
    } finally {
      setDestrutiva(null);
    }
  }

  return (
    <>
      <ParceriasView
        parcerias={parcerias}
        loading={loading}
        error={error}
        onAceitar={(p) => void transicionar(p, 'ativa', `Parceria com ${p.eventoId} aceita`)}
        onRecusar={(p) => void transicionar(p, 'inativa', 'Convite recusado')}
        onCopiarLink={copiarLink}
        onVerTermos={(p) => setTermos(p)}
        onRemoverEvento={(p) =>
          setDestrutiva({ variante: 'remover-evento', id: p.id, nome: p.eventoId })
        }
        onAdicionarPatrocinador={() => setAddAberto(true)}
        onDesativarPatrocinador={(p) =>
          setDestrutiva({ variante: 'desativar-patrocinador', id: p.id, nome: p.nome })
        }
      />
      <AddPatrocinadorModal
        open={addAberto}
        onOpenChange={setAddAberto}
        onCriar={criarPatrocinador}
      />
      {destrutiva ? (
        <ParceriaDestrutivaModal
          open
          onOpenChange={(o) => !o && setDestrutiva(null)}
          variante={destrutiva.variante}
          nome={destrutiva.nome}
          onConfirm={() => void confirmarDestrutiva()}
        />
      ) : null}
      {termos ? (
        <TermosModal open onOpenChange={(o) => !o && setTermos(null)} parceria={termos} />
      ) : null}
    </>
  );
}

ParceriasPage.displayName = 'ParceriasPage';
