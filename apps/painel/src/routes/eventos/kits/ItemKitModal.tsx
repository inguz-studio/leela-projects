// =============================================================================
// ItemKitModal — criar/editar item do catálogo (S205-T3 · RN-212/213/214).
// Campos: nome, tipo (tamanhado/único), origem (organizador/patrocinador),
// bloco da marca + toggle "Exibir logo ao atleta" (só patrocinador — RN-214).
// 4 vias de fechamento (cancelar/X/overlay/Esc via DS Modal). Salvar → Toast.
// Não gerencia `kits[]` (N:N vive no editor de kit S206-T1) — preserva o atual.
// =============================================================================

import * as React from 'react';
import { Button, Input, Modal, useToast } from '@leela/design-system';
import type { ItemKit, OrigemItem } from '@leela/core';
import type { SalvarItemKitInput } from '@leela/api-client';

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
  const [erro, setErro] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Recarrega o form ao (re)abrir com um item diferente.
  React.useEffect(() => {
    if (!open) return;
    setNome(item?.nome ?? '');
    setTamanhado(item?.tamanhado ?? true);
    setOrigem(item?.origem ?? 'organizador');
    setMarca(item?.marca ?? '');
    setExibirLogo(item?.exibirLogo ?? false);
    setErro(null);
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

  async function salvar(): Promise<void> {
    if (nome.trim().length === 0) {
      setErro('Informe o nome do item.');
      return;
    }
    if (patrocinado && marca.trim().length === 0) {
      setErro('Informe a marca do patrocinador.');
      return;
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

        <fieldset className="flex flex-col gap-[var(--spacing-2)]">
          <legend className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
            Tipo
          </legend>
          <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            <input type="radio" name="tipo" checked={tamanhado} onChange={() => setTamanhado(true)} />
            Tamanhado (camiseta)
          </label>
          <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            <input type="radio" name="tipo" checked={!tamanhado} onChange={() => setTamanhado(false)} />
            Único (sacochila, amostra)
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-[var(--spacing-2)]">
          <legend className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
            Origem
          </legend>
          <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            <input
              type="radio"
              name="origem"
              checked={origem === 'organizador'}
              onChange={() => trocarOrigem('organizador')}
            />
            Organizador
          </label>
          <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
            <input
              type="radio"
              name="origem"
              checked={origem === 'patrocinador'}
              onChange={() => trocarOrigem('patrocinador')}
            />
            Patrocinador
          </label>
        </fieldset>

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
              <input
                type="checkbox"
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
