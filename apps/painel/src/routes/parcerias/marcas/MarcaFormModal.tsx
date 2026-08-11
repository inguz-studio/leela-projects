// =============================================================================
// MarcaFormModal — criar/editar uma marca do registro reutilizável do
// profissional (E10 · S811 seed · RN-171/RN-123). Modal do DS (4 vias de
// fechamento). Modelo comercial condicional (RN-123): financeiro exige valor
// anual > 0; permuta exige contrapartida ≥ 20 chars. Validação PURA
// (validarMarcaInput do core — espelho da Rule owner-only). Logo 1:1 upload-only
// via FileInput do DS. Salvar/upload são portas injetadas pelo container.
//
// Em EDIÇÃO o docId é fixo (`initial.id`): renomear atualiza o campo `nome` sem
// criar doc órfão. Em CRIAÇÃO o id deriva do nome no container (upsert).
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Chip,
  FileInput,
  Input,
  Modal,
  Textarea,
} from '@leela/design-system';
import {
  MARCA_CONTRAPARTIDA_MIN,
  validarMarcaInput,
  type Marca,
  type MarcaInput,
  type ModeloComercial,
} from '@leela/core';

const MODELOS: ModeloComercial[] = ['financeiro', 'permuta'];

function modeloLabel(m: ModeloComercial): string {
  return m === 'financeiro' ? 'Financeiro (R$/ano)' : 'Permuta';
}

export interface MarcaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Marca em edição; null/undefined = criação. */
  initial?: Marca | null;
  /** Persiste a marca (mutation do container). marcaId presente = edição. */
  onSalvar: (input: MarcaInput, marcaId?: string) => Promise<void>;
  /** Upload da logo 1:1 — devolve a downloadURL. Recebe o id (edição) e o nome. */
  onUploadLogo: (marcaId: string | null, nome: string, file: File) => Promise<string>;
}

export function MarcaFormModal({
  open,
  onOpenChange,
  initial,
  onSalvar,
  onUploadLogo,
}: MarcaFormModalProps): JSX.Element {
  const editando = initial != null;

  const [nome, setNome] = useState('');
  const [modeloComercial, setModelo] = useState<ModeloComercial>('financeiro');
  const [valorAnual, setValorAnual] = useState('');
  const [contrapartida, setContrapartida] = useState('');
  const [contratoUrl, setContratoUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErro, setLogoErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Recarrega o form quando abre / troca de alvo (criar limpa; editar preenche).
  useEffect(() => {
    if (!open) return;
    setLogoErro(null);
    setEnviando(false);
    if (initial != null) {
      setNome(initial.nome);
      setModelo(initial.modeloComercial);
      setValorAnual(initial.valorAnual !== undefined ? String(initial.valorAnual) : '');
      setContrapartida(initial.contrapartida ?? '');
      setContratoUrl(initial.contratoUrl ?? '');
      setLogoUrl(initial.logoUrl ?? '');
    } else {
      setNome('');
      setModelo('financeiro');
      setValorAnual('');
      setContrapartida('');
      setContratoUrl('');
      setLogoUrl('');
    }
  }, [open, initial]);

  const input: MarcaInput = useMemo(() => {
    const base: MarcaInput = { nome: nome.trim(), modeloComercial };
    const v = Number(valorAnual);
    if (modeloComercial === 'financeiro' && valorAnual.trim() !== '' && Number.isFinite(v)) {
      base.valorAnual = v;
    }
    if (modeloComercial === 'permuta' && contrapartida.trim() !== '') {
      base.contrapartida = contrapartida.trim();
    }
    if (contratoUrl.trim() !== '') base.contratoUrl = contratoUrl.trim();
    if (logoUrl.trim() !== '') base.logoUrl = logoUrl.trim();
    // O `status` NÃO é campo deste formulário — ele é o interruptor da lista
    // (PATROCINADOR-TOGGLE), e dois lugares mexendo no mesmo estado é como um
    // deles passa a mentir. Mas ele viaja no input mesmo assim, porque a
    // escrita é um `setDoc` com `merge` que carimba `status: input.status ??
    // 'ativa'`: sem esta linha, editar o telefone de uma marca DESLIGADA a
    // religava em silêncio, e ela voltava ao autocomplete sem ninguém pedir.
    if (initial != null) base.status = initial.status;
    return base;
  }, [nome, modeloComercial, valorAnual, contrapartida, contratoUrl, logoUrl, initial]);

  const erros = useMemo(() => validarMarcaInput(input), [input]);
  const valido = erros.length === 0;

  async function enviarLogo(file: File): Promise<void> {
    setLogoBusy(true);
    setLogoErro(null);
    try {
      setLogoUrl(await onUploadLogo(initial?.id ?? null, nome.trim(), file));
    } catch (err) {
      const msg = (err as { message?: string })?.message;
      setLogoErro(msg && msg.length > 0 ? msg : 'Não foi possível enviar a logo.');
    } finally {
      setLogoBusy(false);
    }
  }

  async function salvar(): Promise<void> {
    if (!valido) return;
    setEnviando(true);
    try {
      await onSalvar(input, initial?.id);
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
      <Button variant="primary" disabled={!valido || enviando} onClick={() => void salvar()}>
        {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar marca'}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editando ? 'Editar marca' : 'Nova marca'}
      // RN-171: marca é registro reutilizável, reaproveitado no cadastro de patrocínios.
      description="Registro reutilizável de patrocinador, reaproveitado no cadastro de patrocínios."
      footer={footer}
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <Input
          id="marca-nome"
          label="Nome da marca"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="CDL Wellness"
        />

        <div className="flex flex-col gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Modelo comercial
          </span>
          <div role="group" aria-label="Modelo comercial" className="flex gap-[var(--spacing-2)]">
            {MODELOS.map((m) => (
              <Chip key={m} active={modeloComercial === m} onClick={() => setModelo(m)}>
                {modeloLabel(m)}
              </Chip>
            ))}
          </div>
        </div>

        {modeloComercial === 'financeiro' ? (
          <Input
            id="marca-valor"
            type="number"
            inputMode="numeric"
            label="Valor anual (R$)"
            value={valorAnual}
            onChange={(e) => setValorAnual(e.target.value)}
            placeholder="12000"
          />
        ) : (
          <div className="flex flex-col gap-1">
            <Textarea
              id="marca-contrapartida"
              label="Contrapartida"
              rows={3}
              value={contrapartida}
              onChange={(e) => setContrapartida(e.target.value)}
              placeholder="O que a marca recebe/entrega (mín. 20 caracteres)."
            />
            <span
              className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
              aria-live="polite"
            >
              {contrapartida.trim().length}/{MARCA_CONTRAPARTIDA_MIN} caracteres mínimos
            </span>
          </div>
        )}

        <Input
          id="marca-contrato"
          label="Link do contrato (opcional)"
          value={contratoUrl}
          onChange={(e) => setContratoUrl(e.target.value)}
          placeholder="https://…"
        />

        <div className="flex flex-col gap-[var(--spacing-2)]">
          <FileInput
            id="marca-logo"
            label="Logo da marca (quadrada 1:1 — opcional)"
            buttonLabel={logoUrl ? 'Trocar logo' : 'Enviar logo'}
            busy={logoBusy}
            onFileSelected={(file) => void enviarLogo(file)}
            {...(logoErro !== null ? { errorMessage: logoErro } : {})}
            hint="JPG/PNG/WebP/GIF/AVIF até 5MB, proporção 1:1."
          />
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo de ${nome.trim() || 'marca'}`}
              className="h-16 w-16 rounded-[var(--radius-md)] object-cover"
            />
          ) : null}
        </div>

        {!valido && (nome || valorAnual || contrapartida) ? (
          <p role="alert" className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]">
            {erros[0]}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

MarcaFormModal.displayName = 'MarcaFormModal';
