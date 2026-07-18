// =============================================================================
// PerfilPublicoEditorPage — container do editor de perfil (DN-1-T1). Resolve a
// sessão (uid + tenantId), carrega o perfil do tenant (`getMeuPerfil`) para
// decidir CREATE vs EDIT, e persiste via `salvarPerfil` (callable registry).
//
// Sessão LOCAL ao módulo (mesma justificativa de clubes/_data/session e
// eventos/_data/session): sem SessionProvider global ainda; quando existir,
// este trecho passa a consumi-lo. `salvarPerfil` deriva o tenant do
// `context.auth` no servidor — aqui o tenantId serve só para LER o perfil atual.
// =============================================================================

import { useEffect, useState } from 'react';
import { useToast } from '@leela/design-system';
import {
  getClaims,
  getLeelaDb,
  getLeelaFunctions,
  getMeuPerfil,
  onSessionChange,
  problemaDoArquivoImagem,
  salvarPerfil,
  uploadAvatarPerfilPublico,
  uploadCapaPerfilPublico,
} from '@leela/api-client';
import type { AuthClaims } from '@leela/core';
import { PerfilPublicoEditor } from './PerfilPublicoEditor';
import { paraPerfilInput, valoresDePerfil, type PerfilFormValues } from './perfilForm';
import { PUBLIC_BASE } from '../../../lib/linkPublico';

type Estado =
  | { fase: 'carregando' }
  | { fase: 'anonimo' }
  | { fase: 'sem-tenant' }
  | { fase: 'pronto'; modo: 'create' | 'edit'; inicial?: PerfilFormValues };

/** Traduz o error.code do callable `salvarPerfil` em copy acionável. */
function mensagemErroSalvarPerfil(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? '';
  if (code.includes('already-exists')) {
    return 'Esse @ já está em uso por outra conta. Escolha outro.';
  }
  if (code.includes('failed-precondition')) {
    return 'Este organizador já tem um perfil e o @ é imutável. Edite o perfil existente.';
  }
  if (code.includes('invalid-argument')) {
    return 'Alguns campos estão inválidos. Revise o @, o nome e os links.';
  }
  if (code.includes('unauthenticated') || code.includes('permission-denied')) {
    return 'Sua sessão expirou ou não tem permissão. Entre novamente.';
  }
  return 'Não foi possível salvar o perfil. Tente novamente.';
}

export function PerfilPublicoEditorPage(): JSX.Element {
  const { toast } = useToast();
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });

  useEffect(() => {
    let ativo = true;
    const unsub = onSessionChange((user) => {
      if (!user) {
        if (ativo) setEstado({ fase: 'anonimo' });
        return;
      }
      void (async () => {
        try {
          let claims = (await getClaims(false)) as AuthClaims | null;
          if (!claims?.tenantId) claims = (await getClaims(true)) as AuthClaims | null;
          const tenantId = claims?.tenantId ?? null;
          if (!tenantId) {
            if (ativo) setEstado({ fase: 'sem-tenant' });
            return;
          }
          const perfil = await getMeuPerfil(getLeelaDb(), tenantId);
          if (!ativo) return;
          setEstado(
            perfil
              ? { fase: 'pronto', modo: 'edit', inicial: valoresDePerfil(perfil) }
              : { fase: 'pronto', modo: 'create' }
          );
        } catch {
          // Falha de leitura não deve travar em skeleton eterno: cai em CREATE
          // (o servidor barra um segundo perfil com failed-precondition, honesto).
          if (ativo) setEstado({ fase: 'pronto', modo: 'create' });
        }
      })();
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  // Upload (LEELA-R5): valida tipo/tamanho ANTES do roundtrip (a mensagem do
  // Error vira erro inline do FileInput no editor); a fronteira real são as
  // storage.rules. A URL resultante preenche o campo — persistir segue no
  // "Salvar alterações" (salvarPerfil, caminho único de escrita do doc).
  function comValidacao(
    upload: (file: File) => Promise<string>
  ): (file: File) => Promise<string> {
    return async (file: File) => {
      const problema = problemaDoArquivoImagem(file);
      if (problema) throw new Error(problema);
      return upload(file);
    };
  }

  async function onSalvar(values: PerfilFormValues): Promise<{ handle: string; criado: boolean }> {
    try {
      const res = await salvarPerfil(getLeelaFunctions(), paraPerfilInput(values));
      return { handle: res.handle, criado: res.criado };
    } catch (err) {
      toast({ variant: 'danger', title: 'Não foi possível salvar', description: mensagemErroSalvarPerfil(err) });
      throw err;
    }
  }

  if (estado.fase === 'carregando') {
    return (
      <div role="status" aria-label="Carregando perfil" className="p-[var(--spacing-6)]">
        <div className="mx-auto h-64 w-full max-w-2xl rounded-[var(--card-radius)] bg-[var(--surface-raised)]" />
      </div>
    );
  }

  if (estado.fase === 'anonimo') {
    return (
      <p className="mx-auto max-w-2xl p-[var(--spacing-6)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        Entre na sua conta para editar seu perfil público.
      </p>
    );
  }

  if (estado.fase === 'sem-tenant') {
    return (
      <p className="mx-auto max-w-2xl p-[var(--spacing-6)] text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
        Não encontramos sua organização nesta sessão. Recarregue a página ou entre novamente.
      </p>
    );
  }

  return (
    <PerfilPublicoEditor
      modo={estado.modo}
      inicial={estado.inicial}
      linkPublicoBase={PUBLIC_BASE}
      onSalvar={onSalvar}
      onUploadAvatar={comValidacao(uploadAvatarPerfilPublico)}
      onUploadCapa={comValidacao(uploadCapaPerfilPublico)}
    />
  );
}

PerfilPublicoEditorPage.displayName = 'PerfilPublicoEditorPage';
