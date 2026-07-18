// =============================================================================
// AddPatrocinadorModal — cadastro de patrocinador (S107-T3 / SPEC §2.7.1).
// Modal do DS (4 vias de fechamento). Modelo comercial financeiro/permuta
// (RN-123); financeiro exige valor anual > 0; contrapartida ≥ 20 chars
// (validação pura validarPatrocinador, espelho da Rule). Cria via porta
// injetada; feedback e reload são do container.
// =============================================================================

import { useMemo, useState } from 'react';
import { Button, Chip, Combobox, FileInput, Input, Modal } from '@leela/design-system';
import type { ComboboxOption } from '@leela/design-system';
import type { Marca, ModeloComercial } from '@leela/core';
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
  /**
   * RN-171 (R9-E · S-R9-12-T2): registro reutilizável de marcas do tenant —
   * quem já cadastrou um patrocinador PARTE da listagem, não do zero.
   * null/[] = sem registro (a seção de seleção some).
   */
  marcasDoRegistro?: Marca[] | null;
  /**
   * Upload da logo 1:1 (adendo RN-171) — o container injeta o caminho de
   * Storage (validação de tipo/tamanho/proporção no seam do api-client).
   * Devolve a downloadURL.
   */
  onUploadLogo?: (file: File, nomePatrocinador: string) => Promise<string>;
}

const MODELOS: ModeloComercial[] = ['financeiro', 'permuta'];

export function AddPatrocinadorModal({
  open,
  onOpenChange,
  onCriar,
  marcasDoRegistro,
  onUploadLogo,
}: AddPatrocinadorModalProps): JSX.Element {
  const [nome, setNome] = useState('');
  const [modeloComercial, setModelo] = useState<ModeloComercial>('financeiro');
  const [valorAnual, setValorAnual] = useState('');
  const [contrapartida, setContrapartida] = useState('');
  const [contratoUrl, setContratoUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErro, setLogoErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [marcaSelecionadaId, setMarcaSelecionadaId] = useState('');

  // RN-171: registro reutilizável de marcas ativas do tenant. A seleção é um
  // Combobox do DS (shadcn §8 · S-R9-12-T2) — busca embutida no painel do DS,
  // não a "caixa do SO". Escolher preenche o form (parte da listagem, não do
  // zero); a lista cresce, então busca > chips fixos.
  const marcasAtivas = useMemo(
    () => (marcasDoRegistro ?? []).filter((m) => m.status === 'ativa'),
    [marcasDoRegistro],
  );
  const opcoesMarca: ComboboxOption[] = useMemo(
    () => marcasAtivas.map((m) => ({ value: m.id, label: m.nome })),
    [marcasAtivas],
  );

  function preencherDaMarca(m: Marca): void {
    setMarcaSelecionadaId(m.id);
    setNome(m.nome);
    setModelo(m.modeloComercial);
    setValorAnual(m.valorAnual !== undefined ? String(m.valorAnual) : '');
    setContrapartida(m.contrapartida ?? '');
    setContratoUrl(m.contratoUrl ?? '');
    setLogoUrl(m.logoUrl ?? '');
  }

  function selecionarMarca(value: string | string[]): void {
    const id = Array.isArray(value) ? value[0] : value;
    const m = marcasAtivas.find((x) => x.id === id);
    if (m !== undefined) preencherDaMarca(m);
  }

  const input: PatrocinadorInput = useMemo(() => {
    const base: PatrocinadorInput = {
      nome: nome.trim(),
      modeloComercial,
      contrapartida: contrapartida.trim(),
    };
    const v = Number(valorAnual);
    if (valorAnual.trim() !== '' && Number.isFinite(v)) base.valorAnual = v;
    if (contratoUrl.trim()) base.contratoUrl = contratoUrl.trim();
    if (logoUrl.trim()) base.logoUrl = logoUrl.trim();
    return base;
  }, [nome, modeloComercial, valorAnual, contrapartida, contratoUrl, logoUrl]);

  const erros = useMemo(() => validarPatrocinador(input), [input]);
  const valido = erros.length === 0;

  async function enviarLogo(file: File): Promise<void> {
    if (onUploadLogo === undefined) return;
    setLogoBusy(true);
    setLogoErro(null);
    try {
      setLogoUrl(await onUploadLogo(file, nome.trim()));
    } catch (err) {
      const msg = (err as { message?: string })?.message;
      setLogoErro(msg && msg.length > 0 ? msg : 'Não foi possível enviar a logo.');
    } finally {
      setLogoBusy(false);
    }
  }

  function reset(): void {
    setMarcaSelecionadaId('');
    setNome('');
    setModelo('financeiro');
    setValorAnual('');
    setContrapartida('');
    setContratoUrl('');
    setLogoUrl('');
    setLogoErro(null);
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

        {opcoesMarca.length > 0 ? (
          <div className="flex flex-col gap-[var(--spacing-2)]">
            <label
              htmlFor="patrocinador-registro"
              className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
            >
              Do seu registro de patrocinadores (RN-171) — selecionar preenche o cadastro:
            </label>
            <Combobox
              id="patrocinador-registro"
              aria-label="Partir de um patrocinador salvo"
              options={opcoesMarca}
              value={marcaSelecionadaId}
              onValueChange={selecionarMarca}
              placeholder="Partir de um patrocinador salvo…"
              searchPlaceholder="Buscar patrocinador…"
              emptyText="Nenhum patrocinador no registro."
            />
          </div>
        ) : null}

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

        {onUploadLogo !== undefined ? (
          <div className="flex flex-col gap-[var(--spacing-2)]">
            <FileInput
              id="patrocinador-logo"
              label="Logo do patrocinador (quadrada 1:1 — opcional)"
              buttonLabel={logoUrl ? 'Trocar logo' : 'Enviar logo'}
              busy={logoBusy}
              onFileSelected={(file) => void enviarLogo(file)}
              {...(logoErro !== null ? { errorMessage: logoErro } : {})}
              hint="JPG/PNG/WebP/GIF/AVIF até 5MB, proporção 1:1 — aparece na página do evento."
            />
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo de ${nome.trim() || 'patrocinador'}`}
                className="h-16 w-16 rounded-[var(--radius-md)] object-cover"
              />
            ) : null}
          </div>
        ) : null}

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
