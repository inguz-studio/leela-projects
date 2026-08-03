// =============================================================================
// ParceriasPage — container da tela de parcerias (`/clubes/:slug/parcerias`).
// Aceitar/recusar convite → transição de status real (RN-120/122) + reload.
// Copiar link master (RN-125). Modais de patrocinador/destrutivos/termos são
// ligados nos commits S107-T3/T4/T5.
// =============================================================================

import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '@leela/design-system';
import type { Marca, ParceriaEventoAfiliado } from '@leela/core';
import {
  getLeelaAuth,
  getLeelaDb,
  listarMarcas,
  marcaIdDoNome,
  upsertMarcaDoPatrocinio,
  uploadLogoPatrocinadorClube,
} from '@leela/api-client';
import { ParceriasView } from './ParceriasView';
import { AddPatrocinadorModal } from './AddPatrocinadorModal';
import {
  ParceriaDestrutivaModal,
  type VarianteDestrutiva,
} from './ParceriaDestrutivaModal';
import { TermosModal } from './TermosModal';
import { linkDaParceria } from '../../_lib/linkParceria';
import { MSG_SEM_LINK_PROMOCIONAL } from '../../../../lib/linkPublico';
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
  // RN-171 (R9-E): registro reutilizável de patrocinadores do profissional —
  // alimenta o autocomplete do modal; falha de carga só desliga a seção.
  const [marcas, setMarcas] = useState<Marca[] | null>(null);

  useEffect(() => {
    let vivo = true;
    const uid = getLeelaAuth().currentUser?.uid;
    if (uid === undefined) return;
    listarMarcas(getLeelaDb(), uid)
      .then((lista) => {
        if (vivo) setMarcas(lista);
      })
      .catch(() => {
        if (vivo) setMarcas(null);
      });
    return () => {
      vivo = false;
    };
  }, [addAberto]);

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

  // S1215-T1 (RN-429): o link master é DERIVADO pelo gerador único do core, não
  // mais lido de `p.linkMaster`. O campo legado guarda `beh.ro/mfl26?c=frc` — o
  // domínio dos mocks Be Hero, que a RN-423 expulsou do e-mail da compra, mais
  // uma chave `c` que nenhum arquivo do repo lê. Copiar aquilo é entregar à
  // assessoria um link que não aplica cupom, não atribui conversão e leva quem
  // clicar para o site de outra empresa.
  function copiarLink(p: ParceriaEventoAfiliado): void {
    const link = linkDaParceria(p);
    if (link === null) {
      toast({ variant: 'danger', title: 'Sem link', description: MSG_SEM_LINK_PROMOCIONAL });
      return;
    }
    void navigator.clipboard
      ?.writeText(link)
      .then(() => toast({ variant: 'success', title: 'Link master copiado', description: link }))
      .catch(() => toast({ variant: 'danger', title: 'Não foi possível copiar o link' }));
  }

  async function criarPatrocinador(input: PatrocinadorInput): Promise<void> {
    try {
      await criarPatrocinadorMutation.mutateAsync({ tenantId: clube.tenantId, ...input });
      toast({ variant: 'success', title: `${input.nome} adicionado como patrocinador` });
      // RN-171: o patrocinador cadastrado ENTRA no registro reutilizável do
      // profissional — o próximo cadastro parte da listagem. Best-effort
      // (nunca derruba o fluxo principal).
      const uid = getLeelaAuth().currentUser?.uid;
      if (uid !== undefined) {
        void upsertMarcaDoPatrocinio(getLeelaDb(), uid, {
          nome: input.nome,
          modeloComercial: input.modeloComercial,
          ...(input.valorAnual !== undefined ? { valorAnual: input.valorAnual } : {}),
          ...(input.contrapartida ? { contrapartida: input.contrapartida } : {}),
          ...(input.contratoUrl !== undefined ? { contratoUrl: input.contratoUrl } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
        });
      }
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível adicionar o patrocinador' });
    }
  }

  async function uploadLogo(file: File, nomePatrocinador: string): Promise<string> {
    // Objeto keyed pelo id derivado do nome (kebab) — o mesmo id do registro
    // de marcas; re-upload sobrescreve (padrão R5, sem órfãos).
    const id = marcaIdDoNome(nomePatrocinador || 'patrocinador');
    return uploadLogoPatrocinadorClube(clube.id, id.length > 0 ? id : 'patrocinador', file);
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
        marcasDoRegistro={marcas}
        onUploadLogo={uploadLogo}
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
