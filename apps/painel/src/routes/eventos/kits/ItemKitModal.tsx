// =============================================================================
// ItemKitModal — criar/editar item do catálogo (S205-T3 · RN-212/213/214).
// Campos: nome, tipo (tamanhado/único), origem (organizador/patrocinador),
// bloco da marca + toggle "Exibir logo ao atleta" (só patrocinador — RN-214).
// GRADE POR CORTE (RN-231 · TAMANHOS-GRADE): item tamanhado configura os
// tamanhos POR CORTE (feminina/masculina/unissex) — corte unissex é grade
// única (nunca é obrigatório separar). Doc legado só com
// `tamanhosDisponiveis[]` carrega como grade unissex (gradeEfetivaDoItem);
// ao salvar, `tamanhosDisponiveis` espelha a UNIÃO dos tamanhos da grade
// (superfícies legadas). Item que deixa de ser tamanhado REMOVE a grade.
// 4 vias de fechamento (cancelar/X/overlay/Esc via DS Modal). Salvar → Toast.
// Não gerencia `kits[]` (N:N vive no editor de kit S206-T1) — preserva o atual.
// =============================================================================

import * as React from 'react';
import { Button, Checkbox, Input, Modal, Radio, RadioGroup, useToast } from '@leela/design-system';
import {
  gradeEfetivaDoItem,
  validarGradeItem,
  type CorteItem,
  type GradeCorte,
  type ItemKit,
  type OrigemItem,
} from '@leela/core';
import type { SalvarItemKitInput } from '@leela/api-client';
import { CORTE_LABEL, ORDEM_CORTES } from '../_lib/gradeTamanhos';

export type ItemKitPayload = Omit<SalvarItemKitInput, 'tenantId' | 'eventoId'>;

export interface ItemKitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item para editar; ausente/null = novo item. */
  item?: ItemKit | null;
  onSalvar: (itemId: string, input: ItemKitPayload) => Promise<void>;
  onSaved?: () => void;
}

function novoId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return `item-${c.randomUUID()}`;
  return `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Estado do form da grade — um slot por corte (ativo + tamanhos em CSV). */
type GradeForm = Record<CorteItem, { ativo: boolean; tamanhos: string }>;

/** Form da grade a partir do item (grade EFETIVA — legado ≡ unissex). */
function gradeFormDoItem(item?: ItemKit | null): GradeForm {
  const form: GradeForm = {
    feminina: { ativo: false, tamanhos: '' },
    masculina: { ativo: false, tamanhos: '' },
    unissex: { ativo: false, tamanhos: '' },
  };
  const grade = item ? gradeEfetivaDoItem(item) : [];
  if (grade.length === 0) {
    // Novo item / sem configuração: grade única (unissex) por default —
    // separar por corte é opt-in do organizador (RN-231).
    form.unissex = { ativo: true, tamanhos: '' };
    return form;
  }
  for (const linha of grade) {
    form[linha.corte] = { ativo: true, tamanhos: linha.tamanhos.join(', ') };
  }
  return form;
}

/** CSV → lista de tamanhos (trim, vazios fora, duplicados colapsam). @pure */
function parseTamanhosCsv(valor: string): string[] {
  return [...new Set(valor.split(',').map((t) => t.trim()).filter((t) => t.length > 0))];
}

export function ItemKitModal({
  open,
  onOpenChange,
  item,
  onSalvar,
  onSaved,
}: ItemKitModalProps): JSX.Element {
  const { toast } = useToast();
  const [nome, setNome] = React.useState('');
  const [tamanhado, setTamanhado] = React.useState(true);
  const [origem, setOrigem] = React.useState<OrigemItem>('organizador');
  const [marca, setMarca] = React.useState('');
  const [exibirLogo, setExibirLogo] = React.useState(false);
  const [grade, setGrade] = React.useState<GradeForm>(() => gradeFormDoItem(null));
  const [erro, setErro] = React.useState<string | null>(null);
  const [erroGrade, setErroGrade] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Recarrega o form ao (re)abrir com um item diferente.
  React.useEffect(() => {
    if (!open) return;
    setNome(item?.nome ?? '');
    setTamanhado(item?.tamanhado ?? true);
    setOrigem(item?.origem ?? 'organizador');
    setMarca(item?.marca ?? '');
    setExibirLogo(item?.exibirLogo ?? false);
    setGrade(gradeFormDoItem(item));
    setErro(null);
    setErroGrade(null);
  }, [open, item]);

  const patrocinado = origem === 'patrocinador';

  function trocarOrigem(nova: OrigemItem): void {
    setOrigem(nova);
    if (nova === 'organizador') {
      // RN-214: item do organizador nunca exibe logo.
      setExibirLogo(false);
      setMarca('');
    }
  }

  function mudarCorte(corte: CorteItem, patch: Partial<GradeForm[CorteItem]>): void {
    setGrade((g) => ({ ...g, [corte]: { ...g[corte], ...patch } }));
    setErroGrade(null);
  }

  /** Monta a grade RN-231 do form — null quando inválida (seta o erro). */
  function montarGrade(): GradeCorte[] | null {
    const linhas: GradeCorte[] = [];
    for (const corte of ORDEM_CORTES) {
      const slot = grade[corte];
      if (!slot.ativo) continue;
      const tamanhos = parseTamanhosCsv(slot.tamanhos);
      if (tamanhos.length === 0) {
        setErroGrade(`Informe os tamanhos do corte ${CORTE_LABEL[corte].toLowerCase()} (ex.: P, M, G).`);
        return null;
      }
      if (tamanhos.some((t) => t.includes('__'))) {
        setErroGrade('Tamanho não pode conter "__" (separador reservado do SKU).');
        return null;
      }
      linhas.push({ corte, tamanhos });
    }
    if (linhas.length === 0) {
      setErroGrade('Ative ao menos um corte da grade (unissex = grade única).');
      return null;
    }
    const errosCore = validarGradeItem(linhas);
    if (errosCore.length > 0) {
      setErroGrade(errosCore[0]!);
      return null;
    }
    return linhas;
  }

  async function salvar(): Promise<void> {
    if (nome.trim().length === 0) {
      setErro('Informe o nome do item.');
      return;
    }
    if (patrocinado && marca.trim().length === 0) {
      setErro('Informe a marca do patrocinador.');
      return;
    }
    let gradeFinal: GradeCorte[] | null = null;
    if (tamanhado) {
      gradeFinal = montarGrade();
      if (gradeFinal === null) return;
    }
    setBusy(true);
    try {
      const itemId = item?.id ?? novoId();
      const payload: ItemKitPayload = {
        nome: nome.trim(),
        tamanhado,
        origem,
        exibirLogo: patrocinado ? exibirLogo : false,
        kits: item?.kits ?? [],
        ...(patrocinado ? { marca: marca.trim() } : {}),
        // RN-231: tamanhado grava a grade + união em tamanhosDisponiveis
        // (superfícies legadas); único REMOVE grade e zera tamanhos (grade
        // órfã em item não tamanhado é rejeitada por Rules + parse).
        ...(tamanhado && gradeFinal !== null
          ? {
              grade: gradeFinal,
              tamanhosDisponiveis: [...new Set(gradeFinal.flatMap((l) => l.tamanhos))],
            }
          : { grade: null, tamanhosDisponiveis: [] }),
      };
      await onSalvar(itemId, payload);
      toast({ title: item ? 'Item atualizado' : 'Item criado', variant: 'success' });
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: 'Falha ao salvar o item', variant: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? 'Editar item' : 'Novo item do catálogo'}
      footer={
        <div className="flex justify-end gap-[var(--spacing-3)]">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void salvar()} disabled={busy}>
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <Input
          id="item-nome"
          label="Nome do item"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          {...(erro && nome.trim().length === 0 ? { errorMessage: erro } : {})}
        />

        <RadioGroup
          name="tipo"
          label="Tipo"
          value={tamanhado ? 'tamanhado' : 'unico'}
          onValueChange={(v) => setTamanhado(v === 'tamanhado')}
        >
          <Radio value="tamanhado" label="Tamanhado (camiseta)" />
          <Radio value="unico" label="Único (sacochila, amostra)" />
        </RadioGroup>

        {tamanhado && (
          <fieldset className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--radius-md)] bg-[var(--surface-high)] p-[var(--spacing-4)]">
            <legend className="sr-only">Grade de tamanhos por corte</legend>
            <div className="flex flex-col gap-[var(--spacing-1)]">
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
                Grade de tamanhos
              </span>
              <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
                Separe por corte (feminina/masculina) ou use unissex como grade única. No
                checkout, quem compra escolhe o corte primeiro e depois o tamanho.
              </span>
            </div>
            {ORDEM_CORTES.map((corte) => (
              <div key={corte} className="flex flex-col gap-[var(--spacing-2)]">
                <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
                  <Checkbox
                    checked={grade[corte].ativo}
                    onChange={(e) => mudarCorte(corte, { ativo: e.target.checked })}
                  />
                  {CORTE_LABEL[corte]}
                </label>
                {grade[corte].ativo && (
                  <Input
                    id={`grade-${corte}`}
                    label={`Tamanhos (${CORTE_LABEL[corte].toLowerCase()})`}
                    placeholder="P, M, G, GG"
                    value={grade[corte].tamanhos}
                    onChange={(e) => mudarCorte(corte, { tamanhos: e.target.value })}
                  />
                )}
              </div>
            ))}
            {erroGrade && (
              <p role="alert" className="text-[length:var(--font-size-xs)] text-[var(--text-danger)]">
                {erroGrade}
              </p>
            )}
          </fieldset>
        )}

        <RadioGroup
          name="origem"
          label="Origem"
          value={origem}
          onValueChange={(v) => trocarOrigem(v as OrigemItem)}
        >
          <Radio value="organizador" label="Organizador" />
          <Radio value="patrocinador" label="Patrocinador" />
        </RadioGroup>

        {patrocinado && (
          <div className="flex flex-col gap-[var(--spacing-3)] rounded-[var(--radius-md)] bg-[var(--surface-high)] p-[var(--spacing-4)]">
            <Input
              id="item-marca"
              label="Marca do patrocinador"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              {...(erro && marca.trim().length === 0 ? { errorMessage: erro } : {})}
            />
            <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
              <Checkbox
                checked={exibirLogo}
                onChange={(e) => setExibirLogo(e.target.checked)}
              />
              Exibir logo ao atleta
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}

ItemKitModal.displayName = 'ItemKitModal';
