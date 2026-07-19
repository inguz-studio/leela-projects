// =============================================================================
// EquipeLista — lista de membros do evento (S304-T3 · E04-L5). Presentational.
// Mostra membros ativos + convites pendentes (removidos ficam fora). Por linha:
// papel editável via Select (troca → onTrocarPapel) quando o gestor pode gerir
// ESTE membro (opcoesPapel.podeGerirMembro — espelha a anti-escalada do
// servidor) e o membro é ATIVO; convite mantém o papel read-only (Badge), pois
// só a ativação define claims. EmptyState quando só há o Organizador (§ aceite).
// O gate real é a Rule/Function; aqui é só o que a UI expõe.
// =============================================================================

import { Badge, Button, Combobox, EmptyState } from '@leela/design-system';
import type { MembroEquipe, PapelEvento } from '@leela/core';
import { LABEL_PAPEL } from '../_lib/equipeLabels';
import { papeisAtribuiveis, podeGerirMembro } from '../_lib/opcoesPapel';

export interface EquipeListaProps {
  membros: MembroEquipe[];
  /** Papel do usuário logado (gestor) — define alçada e opções de troca. */
  gestor: PapelEvento | null;
  gestorUid: string | null;
  onTrocarPapel: (membro: MembroEquipe, papel: PapelEvento) => void;
  onRemover: (membro: MembroEquipe) => void;
  onConvidar: () => void;
  /** uid do membro cujo papel está sendo trocado (desabilita o Select). */
  trocandoUid: string | null;
}

function statusVariant(status: MembroEquipe['status']): 'vitoria' | 'alerta' | 'neutro' {
  if (status === 'ativo') return 'vitoria';
  if (status === 'convidado') return 'alerta';
  return 'neutro';
}

function statusLabel(status: MembroEquipe['status']): string {
  if (status === 'ativo') return 'Ativo';
  if (status === 'convidado') return 'Convidado';
  return 'Removido';
}

export function EquipeLista({
  membros,
  gestor,
  gestorUid,
  onTrocarPapel,
  onRemover,
  onConvidar,
  trocandoUid,
}: EquipeListaProps): JSX.Element {
  const visiveis = membros.filter((m) => m.status !== 'removido');
  const alemDoOrganizador = visiveis.filter((m) => m.papel !== 'organizador');

  const opcoesGestor = papeisAtribuiveis(gestor).map((p) => ({
    value: p,
    label: LABEL_PAPEL[p],
  }));

  if (alemDoOrganizador.length === 0) {
    return (
      <EmptyState
        title="Só você por aqui"
        description="Convide administradores, operadores de balcão ou responsáveis pelo financeiro para dividir a operação do evento."
        action={
          <Button variant="primary" onClick={onConvidar}>
            Convidar membro
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <div className="flex items-center justify-between gap-[var(--spacing-3)]">
        <h2 className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Membros ({visiveis.length})
        </h2>
        <Button variant="secondary" onClick={onConvidar}>
          Convidar membro
        </Button>
      </div>

      <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
        {visiveis.map((membro) => {
          const gerivel = podeGerirMembro({
            gestor,
            gestorUid,
            membroPapel: membro.papel,
            membroUid: membro.uid,
          });
          const papelEditavel = gerivel && membro.status === 'ativo' && membro.uid !== null;

          return (
            <li
              key={membro.id}
              className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-4)]"
            >
              <div className="flex min-w-0 flex-col gap-[var(--spacing-1)]">
                <span className="truncate font-[var(--font-weight-medium)] text-[var(--text-primary)]">
                  {membro.nome}
                </span>
                <span className="truncate text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                  {membro.email ?? '—'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
                <Badge variant={statusVariant(membro.status)}>{statusLabel(membro.status)}</Badge>

                {papelEditavel ? (
                  <div className="w-44">
                    <Combobox
                      aria-label={`Papel de ${membro.nome}`}
                      options={opcoesGestor}
                      value={membro.papel}
                      disabled={trocandoUid === membro.uid}
                      onValueChange={(v) =>
                        onTrocarPapel(membro, (Array.isArray(v) ? v[0] : v) as PapelEvento)
                      }
                    />
                  </div>
                ) : (
                  <Badge variant="neutro">{LABEL_PAPEL[membro.papel]}</Badge>
                )}

                {gerivel ? (
                  <Button
                    variant="ghost"
                    onClick={() => onRemover(membro)}
                    aria-label={`Remover ${membro.nome}`}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

EquipeLista.displayName = 'EquipeLista';
