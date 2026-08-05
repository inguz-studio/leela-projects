'use client';
// =============================================================================
// EntrarOverlay — a entrada da Leela no MEIO da landing (S1221-T1).
//
// O que muda e por quê: até aqui "Entrar" no header levava para OUTRA origem
// (o painel do organizador, `painelUrl('/entrar')`). Quem estava lendo a
// página de uma experiência perdia a página para logar e voltava para o
// começo. O dono pediu, em 03/08, que a entrada vire overlay sem tirar a
// pessoa do lugar — e a `S1222` precisa exatamente disso: a landing não tinha
// sessão nomeada nenhuma (varredura por `signIn`/`useAuth` devolvia zero).
//
// REUSO, não recriação: o formulário é o mesmo da `EntrarPage` do painel
// (LEELA-S020-T1) — mesmos campos, mesma ordem, mesma disciplina de erro. O
// que era `_lib/authErrors` de lá virou `@leela/api-client/authMensagens`,
// consumido pelos dois; a moldura é o `Dialog` Radix-free do DS (ADR-017), o
// mesmo primitivo que o regulamento e o kit já usam na superfície pública.
//
// SEGURANÇA
//  - Anti-enumeração: QUALQUER falha de credencial vira a mesma frase
//    (`mensagemErroLogin`). Não existe caminho na tela que distinga e-mail
//    cadastrado de não cadastrado.
//  - A senha vive só no estado controlado enquanto o overlay existe; não é
//    logada, não é persistida, e o `onOpenChange(false)` a descarta.
//  - Nenhum dado de perfil entra em URL (invariante do projeto): o overlay não
//    navega — ele fecha e a página continua onde estava.
//
// A11y: o `Dialog` do DS já entrega role=dialog + aria-modal, focus trap
// cíclico, Esc, clique no overlay e retorno de foco ao abridor. Aqui só se
// declara o título e se põe o foco inicial no campo de e-mail.
// =============================================================================

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog } from '@leela/design-system/dialog';
import { emailValido, loginComEmail, mensagemErroLogin } from '@leela/api-client';
import { Button, Input } from '@/app/_ds/ds';
import { ensureLeela } from '@/lib/leelaClient';

export interface EntrarOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Devolve o foco ao botão que abriu (contrato do Dialog do DS). */
  returnFocusRef?: React.RefObject<HTMLElement | null> | undefined;
  /** Chamado depois de autenticar. O default é só fechar. */
  aoEntrar?: (() => void) | undefined;
  /** Linha de contexto quando a entrada foi pedida por uma tela, não pelo header. */
  description?: string | undefined;
  /** Rodapé extra (ex.: "esqueci minha senha"), abaixo do formulário. */
  rodape?: React.ReactNode | undefined;
}

export function EntrarOverlay({
  open,
  onOpenChange,
  returnFocusRef,
  aoEntrar,
  description,
  rodape,
}: EntrarOverlayProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campoEmail = useRef<HTMLInputElement>(null);

  // Fechar descarta a credencial digitada: reabrir o overlay não pode
  // reapresentar a senha de quem desistiu no meio.
  useEffect(() => {
    if (open) {
      ensureLeela();
      return;
    }
    setSenha('');
    setErro(null);
    setEnviando(false);
  }, [open]);

  const podeEntrar = emailValido(email) && senha.length > 0 && !enviando;

  async function entrar(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeEntrar) return;
    setErro(null);
    setEnviando(true);
    try {
      await loginComEmail(email.trim(), senha);
      // A sessão vira nomeada e o header/área reagem pelo `onSessionChange`.
      // A senha some do estado antes de qualquer render de sucesso.
      setSenha('');
      setEnviando(false);
      onOpenChange(false);
      aoEntrar?.();
    } catch (err) {
      setErro(mensagemErroLogin(err));
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Entrar na Leela"
      {...(description !== undefined ? { description } : {})}
      {...(returnFocusRef !== undefined ? { returnFocusRef } : {})}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => void entrar(e)}
        noValidate
        aria-label="Entrar na Leela"
      >
        {erro !== null ? (
          <p
            role="alert"
            className="rounded-ds-lg border border-border-default bg-surface-raised p-4 text-sm font-medium text-feedback-danger-fg"
          >
            {erro}
          </p>
        ) : null}
        <Input
          id="entrar-landing-email"
          ref={campoEmail}
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="entrar-landing-senha"
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!podeEntrar} className="w-full">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
        {rodape}
      </form>
    </Dialog>
  );
}

EntrarOverlay.displayName = 'EntrarOverlay';
