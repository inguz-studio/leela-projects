'use client';

import { Badge, RadioCard, RadioGroup, Select } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import { KIT_OPCOES, type InscritoForm } from './tipos';

/**
 * Etapa 2 — Modalidade + kit, por inscrito. Preço vigente vem do leitor
 * (derivado do core — precoVigente/lote); modalidade sem lote ativo aparece
 * indisponível (estado honesto), nunca some fabricando preço. O rótulo é o da
 * modalidade ("10k"), NUNCA "tier".
 */
export function StepModalidadeKit({
  modalidades,
  inscritos,
  euCorro,
  onInscrito,
  errosModalidade,
}: {
  modalidades: { nome: string; precoVigente: number | null }[];
  inscritos: InscritoForm[];
  euCorro: boolean;
  onInscrito: (index: number, patch: Partial<InscritoForm>) => void;
  errosModalidade: (string | undefined)[];
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      {inscritos.map((inscrito, i) => {
        const titulo = euCorro && i === 0 ? 'Você' : `Atleta ${euCorro ? i : i + 1}`;
        const nome = inscrito.nome.trim();
        return (
          <div
            key={i}
            className="rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5"
          >
            <h3 className="text-sm font-semibold text-text-primary">
              {titulo}
              {nome ? <span className="font-normal text-text-secondary"> · {nome}</span> : null}
            </h3>

            <div className="mt-4">
              <RadioGroup
                name={`modalidade-${i}`}
                label="Modalidade"
                value={inscrito.modalidade}
                onValueChange={(v) => onInscrito(i, { modalidade: v })}
                errorMessage={errosModalidade[i] ?? ''}
              >
                {modalidades.map((m) => {
                  const indisponivel = m.precoVigente === null;
                  return (
                    <RadioCard
                      key={m.nome}
                      value={m.nome}
                      disabled={indisponivel}
                      title={m.nome}
                      description={
                        indisponivel ? 'Sem lote disponível no momento' : 'Percurso oficial'
                      }
                      badge={
                        <Badge variant={indisponivel ? 'neutro' : 'brand'}>
                          {indisponivel ? 'Indisponível' : formatarPreco(m.precoVigente)}
                        </Badge>
                      }
                    />
                  );
                })}
              </RadioGroup>
            </div>

            <div className="mt-4 max-w-xs">
              <Select
                label="Kit"
                options={KIT_OPCOES}
                value={inscrito.kit}
                onChange={(e) =>
                  onInscrito(i, { kit: e.target.value as InscritoForm['kit'] })
                }
              />
              <p className="mt-1 text-xs text-text-tertiary">
                O tamanho do kit é confirmado na retirada, nas janelas do evento.
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
