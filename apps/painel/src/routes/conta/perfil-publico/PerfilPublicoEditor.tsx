// =============================================================================
// PerfilPublicoEditor — editor do perfil público / link-in-bio do organizador
// (DN-1-T1 · E17). JOB (JTBD 04.4 identidade): dar ao organizador UM link
// compartilhável (`be-hero.com.br/@handle`) que reúne seus eventos e clubs.
//
// Regras que a UI TORNA HONESTAS antes de salvar:
//   - RN-160 handle IMUTÁVEL: no CREATE é editável com feedback inline do core
//     (formato/reservados via `handleProblema`) + aviso de que NÃO muda depois;
//     no EDIT vira leitura pura ("@handle" + nota).
//   - RN-161 visibilidade: publica (link direto, noindex) | indexavel
//     (buscadores) | privada (404 público) — a copy explica cada estado.
//   - Capa `imagemUrl` (RN-166) e avatar `avatarUrl`: UPLOAD-ONLY (DEC-0719 ·
//     RN-168 ampliada). O "cole uma URL" MORREU — a única entrada é o arquivo,
//     via `ImageUploadField` (valida tipo/tamanho, ajusta a proporção por COVER
//     — RN-170 — e sobe pelo seam). A downloadURL PREENCHE o mesmo campo;
//     persistir continua sendo o "Salvar alterações" (salvarPerfil), caminho
//     único de escrita. Proporção-alvo: avatar 1:1, capa 16/9 (premissa
//     documentada no checkpoint UPSW). Sem capa = gradiente do DS na página
//     pública; "Remover" limpa o campo (preserva o clear que a URL dava).
//
// Presentational + controlado: a persistência (`salvarPerfil`) e a sessão vivem
// no container. Após salvar, exibe o bloco "link público" com o endereço final.
// =============================================================================

import { useState } from 'react';
import {
  Badge,
  Button,
  Chip,
  FieldGroup,
  Input,
  Textarea,
  useToast,
} from '@leela/design-system';
import { ImageUploadField } from '@/components/upload';
import {
  PERFIL_BIO_MAX,
  PERFIL_LINKS_MAX,
  PERFIL_LINK_LABEL_MAX,
  VISIBILIDADES_PERFIL,
  type VisibilidadePerfil,
} from '@leela/core';
import {
  PERFIL_VALORES_INICIAIS,
  problemaDoHandle,
  validarPerfilForm,
  type PerfilFormValues,
} from './perfilForm';

const VISIBILIDADE_INFO: Record<VisibilidadePerfil, { label: string; hint: string }> = {
  publica: {
    label: 'Pública',
    hint: 'Quem tem o link acessa. Fica fora dos buscadores (noindex).',
  },
  indexavel: {
    label: 'Indexável',
    hint: 'Além do link, aparece nos buscadores (Google etc.).',
  },
  privada: {
    label: 'Privada',
    hint: 'A página pública responde 404 — ninguém acessa pelo link.',
  },
};

export interface PerfilPublicoEditorProps {
  modo: 'create' | 'edit';
  inicial?: PerfilFormValues | undefined;
  /** Base do link público (ex.: https://be-hero.com.br) — a UI acrescenta /@handle. */
  linkPublicoBase: string;
  /** Persiste via `salvarPerfil`; resolve com o handle gravado (para o preview). */
  onSalvar: (values: PerfilFormValues) => Promise<{ handle: string; criado: boolean }>;
  /**
   * Upload do avatar (LEELA-R5 · RN-168 upload-only): sobe o arquivo e resolve
   * a downloadURL, que PREENCHE `avatarUrl` (persistir segue no "Salvar
   * alterações"). Erro de upload vira erro inline no campo. OBRIGATÓRIO — não
   * existe mais fallback de URL colada.
   */
  onUploadAvatar: (file: File) => Promise<string>;
  /** Upload da capa (LEELA-R5 · RN-168) — mesmo contrato do onUploadAvatar. */
  onUploadCapa: (file: File) => Promise<string>;
}

export function PerfilPublicoEditor({
  modo,
  inicial,
  linkPublicoBase,
  onSalvar,
  onUploadAvatar,
  onUploadCapa,
}: PerfilPublicoEditorProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = useState<PerfilFormValues>(inicial ?? PERFIL_VALORES_INICIAIS);
  const [salvando, setSalvando] = useState(false);
  const [handleSalvo, setHandleSalvo] = useState<string | null>(
    modo === 'edit' && inicial ? inicial.handle : null
  );

  function set<K extends keyof PerfilFormValues>(campo: K, valor: PerfilFormValues[K]): void {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  const problemaHandle = modo === 'create' && values.handle.trim().length > 0
    ? problemaDoHandle(values.handle)
    : null;

  function addLink(): void {
    if (values.linksExternos.length >= PERFIL_LINKS_MAX) return;
    set('linksExternos', [...values.linksExternos, { label: '', url: '' }]);
  }

  function setLink(i: number, campo: 'label' | 'url', valor: string): void {
    set(
      'linksExternos',
      values.linksExternos.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l))
    );
  }

  function removeLink(i: number): void {
    set('linksExternos', values.linksExternos.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const erros = validarPerfilForm(values, modo);
    if (erros.length > 0) {
      toast({ variant: 'danger', title: 'Revise o perfil', description: erros[0] ?? 'Há campos pendentes.' });
      return;
    }
    setSalvando(true);
    try {
      const { handle, criado } = await onSalvar(values);
      setHandleSalvo(handle);
      toast({
        variant: 'success',
        title: criado ? 'Perfil criado' : 'Perfil atualizado',
        ...(criado ? { description: `Seu link @${handle} está no ar.` } : {}),
      });
    } catch {
      // O container traduz error.codes (already-exists/failed-precondition/
      // invalid-argument) em copy acionável via toast — aqui só o guard.
    } finally {
      setSalvando(false);
    }
  }

  const linkPublico = handleSalvo ? `${linkPublicoBase}/@${handleSalvo}` : null;
  const bioRestante = PERFIL_BIO_MAX - values.bio.length;

  return (
    <form
      noValidate
      onSubmit={(e) => void handleSubmit(e)}
      aria-label="Editor de perfil público"
      className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)] py-[var(--spacing-4)]"
    >
      <header className="flex flex-col gap-[var(--spacing-1)]">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          Perfil público
        </h1>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Seu link-in-bio: um endereço único que reúne seus eventos e clubs. É o link que você
          coloca na bio das redes.
        </p>
      </header>

      {/* Handle — CREATE editável (imutável depois) / EDIT leitura pura. */}
      <div className="flex flex-col gap-[var(--spacing-2)]">
        {modo === 'create' ? (
          <>
            <Input
              id="perfil-handle"
              label="Seu @ (handle)"
              value={values.handle}
              onChange={(e) => set('handle', e.target.value.replace(/^@/, ''))}
              placeholder="seuclube"
              aria-describedby="handle-hint"
              {...(problemaHandle ? { errorMessage: problemaHandle } : {})}
            />
            <span id="handle-hint" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              {linkPublicoBase.replace(/^https?:\/\//, '')}/@{values.handle.trim() || 'seuhandle'} — de 3 a 30
              caracteres (letras minúsculas, números e _). <strong className="text-[var(--text-secondary)]">Não pode
              ser alterado depois de criado.</strong>
            </span>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
              Seu @ (handle)
            </span>
            <div className="flex items-center gap-[var(--spacing-2)]">
              <span className="rounded-[var(--input-radius)] bg-[var(--surface-sunken)] px-[var(--input-px)] py-[var(--spacing-2)] font-mono text-[var(--text-secondary)]">
                @{values.handle}
              </span>
              <Badge variant="neutro">Imutável</Badge>
            </div>
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              O handle é o endereço público e não pode ser alterado (RN-160).
            </span>
          </div>
        )}
      </div>

      <Input
        id="perfil-nome"
        label="Nome público"
        value={values.nome}
        onChange={(e) => set('nome', e.target.value)}
        placeholder="Corrida do Campeche"
      />

      <div className="flex flex-col gap-1">
        <Textarea
          id="perfil-bio"
          label="Bio"
          value={values.bio}
          onChange={(e) => set('bio', e.target.value.slice(0, PERFIL_BIO_MAX))}
          placeholder="Uma linha sobre você ou sua organização."
          rows={3}
        />
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]" aria-live="polite">
          {bioRestante} caracteres restantes
        </span>
      </div>

      {/* Avatar — UPLOAD-ONLY (RN-168): arquivo → crop 1:1 (RN-170) → preenche
          `avatarUrl`; persistir segue no "Salvar alterações". */}
      <ImageUploadField
        id="perfil-avatar"
        label="Foto do perfil"
        hint="JPG, PNG, WebP, GIF ou AVIF até 5MB. Ajustada para 1:1. Depois, salve as alterações."
        value={values.avatarUrl}
        onChange={(url) => set('avatarUrl', url)}
        onUpload={onUploadAvatar}
        aspecto={{ w: 1, h: 1 }}
        forma="circulo"
        previewAlt="Prévia da foto do perfil"
        permiteRemover
        removerLabel="Remover foto"
      />

      {/* Capa `imagemUrl` (RN-166) — UPLOAD-ONLY; crop 16/9 (RN-170); sem capa =
          gradiente do DS na página pública. */}
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <ImageUploadField
          id="perfil-capa"
          label="Imagem de capa"
          hint="JPG, PNG, WebP, GIF ou AVIF até 5MB. Ajustada para 16:9. Depois, salve as alterações."
          value={values.imagemUrl}
          onChange={(url) => set('imagemUrl', url)}
          onUpload={onUploadCapa}
          aspecto={{ w: 16, h: 9 }}
          previewAlt="Prévia da capa do perfil"
          permiteRemover
          removerLabel="Remover capa"
        />
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Sem capa, a página usa um gradiente.
        </span>
      </div>

      {/* Visibilidade (RN-161) */}
      <FieldGroup legend="Visibilidade" gap="sm">
        <div role="group" aria-label="Visibilidade" className="flex flex-wrap gap-[var(--spacing-2)]">
          {VISIBILIDADES_PERFIL.map((v) => (
            <Chip key={v} active={values.visibilidade === v} onClick={() => set('visibilidade', v)}>
              {VISIBILIDADE_INFO[v].label}
            </Chip>
          ))}
        </div>
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          {VISIBILIDADE_INFO[values.visibilidade].hint}
        </span>
      </FieldGroup>

      {/* Links externos (link-in-bio) — até 5 */}
      <FieldGroup legend="Links externos">
        {values.linksExternos.map((link, i) => (
          <div key={i} className="flex items-end gap-[var(--spacing-2)]">
            <Input
              id={`perfil-link-label-${i}`}
              label="Rótulo"
              value={link.label}
              onChange={(e) => setLink(i, 'label', e.target.value.slice(0, PERFIL_LINK_LABEL_MAX))}
              placeholder="Instagram"
              wrapperClassName="flex-1"
            />
            <Input
              id={`perfil-link-url-${i}`}
              type="url"
              inputMode="url"
              label="URL"
              value={link.url}
              onChange={(e) => setLink(i, 'url', e.target.value)}
              placeholder="https://…"
              wrapperClassName="flex-1"
            />
            <Button variant="ghost" onClick={() => removeLink(i)} aria-label={`Remover link ${i + 1}`}>
              Remover
            </Button>
          </div>
        ))}
        {values.linksExternos.length < PERFIL_LINKS_MAX ? (
          <div>
            <Button variant="secondary" onClick={addLink}>
              Adicionar link
            </Button>
          </div>
        ) : (
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Máximo de {PERFIL_LINKS_MAX} links.
          </span>
        )}
      </FieldGroup>

      <div className="flex items-center gap-[var(--spacing-3)]">
        <Button type="submit" variant="primary" disabled={salvando}>
          {salvando ? 'Salvando…' : modo === 'create' ? 'Criar perfil' : 'Salvar alterações'}
        </Button>
      </div>

      {/* Preview do link público (após salvar) */}
      {linkPublico ? (
        <section
          aria-label="Link público"
          className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--card-radius)] bg-[var(--surface-sunken)] p-[var(--spacing-4)]"
        >
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Seu link público
          </span>
          <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
            <a
              href={linkPublico}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-[var(--text-link,var(--text-primary))] underline"
            >
              {linkPublico}
            </a>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(linkPublico).then(
                  () => toast({ variant: 'success', title: 'Link copiado' }),
                  () => toast({ variant: 'danger', title: 'Não foi possível copiar' })
                );
              }}
            >
              Copiar
            </Button>
          </div>
          {values.visibilidade === 'privada' ? (
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              O perfil está <strong>privado</strong> — o link responde 404 até você deixá-lo público.
            </span>
          ) : null}
        </section>
      ) : null}
    </form>
  );
}

PerfilPublicoEditor.displayName = 'PerfilPublicoEditor';
