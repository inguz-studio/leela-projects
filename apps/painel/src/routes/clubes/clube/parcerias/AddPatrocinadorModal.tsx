// =============================================================================
// AddPatrocinadorModal — cadastro de patrocinador (S107-T3 / SPEC §2.7.1).
// Modal do DS (4 vias de fechamento). Modelo comercial financeiro/permuta
// (RN-123); financeiro exige valor anual > 0; contrapartida ≥ 20 chars
// (validação pura validarPatrocinador, espelho da Rule). Cria via porta
// injetada; feedback e reload são do container.
// =============================================================================

import { useMemo, useState } from 'react';
import { Button, Chip, Input, Modal } from '@leela/design-system';
import type { ModeloComercial } from '@leela/core';
import {
  CONTRAPARTIDA_MIN,
  modeloComercialLabel,
  validarPatrocinador,
  type PatrocinadorInput,
} from '../../_lib/parcerias';

export interface AddPatrocinadorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cria o patrocinador (mutation do backend) — injetada pelo container. */
  onCriar: (input: PatrocinadorInput) => void | Promise<void>;
}

const MODELOS: ModeloComercial[] = ['financeiro', 'permuta'];

export function AddPatrocinadorModal({
  open,
  onOpenChange,
  onCriar,
}: AddPatrocinadorModalProps): JSX.Element {
  const [nome, setNome] = useState('');
  const [modeloComercial, setModelo] = useState<ModeloComercial>('financeiro');
  const [valorAnual, setValorAnual] = useState('');
  const [contrapartida, setContrapartida] = useState('');
  const [contratoUrl, setContratoUrl] = useState('');
  const [enviando, setEnviando] = useState(false);

  const input: PatrocinadorInput = useMemo(() => {
    const base: PatrocinadorInput = {
      nome: nome.trim(),
      modeloComercial,
      contrapartida: contrapartida.trim(),
    };
    const v = Number(valorAnual);
    if (valorAnual.trim() !== '' && Number.isFinite(v)) base.valorAnual = v;
    if (contratoUrl.trim()) base.contratoUrl = contratoUrl.trim();
    return base;
  }, [nome, modeloComercial, valorAnual, contrapartida, contratoUrl]);

  const erros = useMemo(() => validarPatrocinador(input), [input]);
  const valido = erros.length === 0;

  function reset(): void {
    setNome('');
    setModelo('financeiro');
    setValorAnual('');
    setContrapartida('');
    setContratoUrl('');
  }

  async function criar(): Promise<void> {
    if (!valido) return;
    setEnviando(true);
    try {
      await onCriar(input);
      reset();
      onOpenChange(false);
    } finally {
      setEnviando(false);
    }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={() => onOpenChange(false)}>
        Cancelar
      </Button>
      <Button variant="primary" disabled={!valido || enviando} onClick={() => void criar()}>
        {enviando ? 'Salvando…' : 'Adicionar patrocinador'}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar patrocinador"
      description="Cadastre um patrocinador institucional do clube."
      footer={footer}
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <Input
          id="patrocinador-nome"
          label="Nome do patrocinador"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Loja do Corredor"
        />

        <div className="flex flex-col gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Modelo comercial
          </span>
          <div role="group" aria-label="Modelo comercial" className="flex gap-[var(--spacing-2)]">
            {MODELOS.map((m) => (
              <Chip key={m} active={modeloComercial === m} onClick={() => setModelo(m)}>
                {modeloComercialLabel(m)}
              </Chip>
            ))}
          </div>
        </div>

        {modeloComercial === 'financeiro' ? (
          <Input
            id="patrocinador-valor"
            type="number"
            inputMode="numeric"
            label="Valor anual (R$)"
            value={valorAnual}
            onChange={(e) => setValorAnual(e.target.value)}
            placeholder="12000"
          />
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="patrocinador-contrapartida" className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Contrapartida
          </label>
          <textarea
            id="patrocinador-contrapartida"
            rows={3}
            value={contrapartida}
            onChange={(e) => setContrapartida(e.target.value)}
            placeholder="O que o patrocinador recebe/entrega (mín. 20 caracteres)."
            className="rounded-[var(--radius-md)] bg-[var(--surface-base)] p-[var(--spacing-3)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]"
          />
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
            {contrapartida.trim().length}/{CONTRAPARTIDA_MIN} caracteres mínimos
          </span>
        </div>

        <Input
          id="patrocinador-contrato"
          label="Link do contrato (opcional)"
          value={contratoUrl}
          onChange={(e) => setContratoUrl(e.target.value)}
          placeholder="https://…"
        />

        {!valido && (nome || contrapartida) ? (
          <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
            {erros[0]}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

AddPatrocinadorModal.displayName = 'AddPatrocinadorModal';
