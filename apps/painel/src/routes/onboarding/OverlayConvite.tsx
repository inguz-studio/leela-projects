// =============================================================================
// OverlayConvite — a experiência da conta travada (S1609-T2 · RN-416/417).
//
// BLOQUEANTE e NÃO-DESCARTÁVEL de propósito: sem X, sem Esc, sem clique-fora.
// Não é um Modal do DS — os modais do DS fecham, e um overlay que fecha deixa
// a pessoa olhando para uma home que ela não pode usar. O que a conta travada
// pode fazer está inteiro aqui: informar o código, falar com o time, ir para
// `/conta` e sair. A tranca de verdade é a ausência de claim (RN-400/401).
//
// Copy verbatim do dono (P9): "Seu acesso ainda não foi liberado" + campo de
// código + "Falar com o time Leela".
//
// Foco: o overlay recebe o foco ao montar e o mantém dentro dele (armadilha de
// Tab). Sem isso o leitor de tela continua navegando a home atrás do véu — uma
// tela que o usuário não pode operar.
// =============================================================================

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@leela/design-system';
import {
  TAMANHO_CODIGO_ORGANIZADOR,
  hrefContatoOnboarding,
  normalizarCodigoOrganizador,
  validarCodigoOrganizador,
  type ContatoOnboarding,
} from '@leela/core';

export interface OverlayConviteProps {
  contato: ContatoOnboarding;
  enviando: boolean;
  erro: string | null;
  onResgatar: (codigo: string) => void;
  onSair: () => void;
}

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function OverlayConvite({
  contato,
  enviando,
  erro,
  onResgatar,
  onSair,
}: OverlayConviteProps): JSX.Element {
  const [codigo, setCodigo] = useState('');
  const painelRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);

  const normalizado = normalizarCodigoOrganizador(codigo);
  const podeEnviar = validarCodigoOrganizador(normalizado) && !enviando;

  useEffect(() => {
    campoRef.current?.focus();
  }, []);

  /** Armadilha de Tab — o foco não sai do overlay enquanto ele existir. */
  function prenderFoco(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Tab') return;
    const alvos = painelRef.current?.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL);
    if (!alvos || alvos.length === 0) return;
    const primeiro = alvos[0];
    const ultimo = alvos[alvos.length - 1];
    if (!primeiro || !ultimo) return;
    if (event.shiftKey && document.activeElement === primeiro) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primeiro.focus();
    }
  }

  function enviar(event: FormEvent): void {
    event.preventDefault();
    if (!podeEnviar) return;
    onResgatar(normalizado);
  }

  return (
    <div
      // `dialog` + `aria-modal` para o leitor de tela tratar o resto da página
      // como inerte, que é exatamente o estado real desta conta.
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-convite-titulo"
      onKeyDown={prenderFoco}
      // Véu pelos tokens do DS (`--modal-overlay-bg` = rgba(0,0,0,.6),
      // `--modal-overlay-blur` = 4px), os MESMOS que o backdrop do Modal usa.
      // O componente não é um Modal do DS de propósito (modal fecha; este não
      // pode), mas o véu é o do produto e já vinha compilado no bundle.
      //
      // O que havia aqui era `bg-[var(--surface-base)]/95`, e o Tailwind NÃO
      // compila isso: modificador de opacidade sobre valor arbitrário `var()`
      // é descartado no build. Medido no `dist` do `vite build --mode
      // leela-hub`: nenhuma regra com `\/95`, e a regra que existe
      // (`.bg-\[var\(--surface-base\)\]`) não casa com a classe do elemento,
      // que é outro token. O blur pegava (`.backdrop-blur` é a DEFAULT do
      // Tailwind); a COR de fundo, não — o véu ficava transparente e a home
      // seguia visível, desfocada, atrás de um overlay que se anuncia
      // bloqueante.
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--modal-overlay-bg)] p-[var(--spacing-5)] backdrop-blur-[var(--modal-overlay-blur)]"
    >
      <div
        ref={painelRef}
        className="flex w-full max-w-md flex-col gap-[var(--spacing-5)] rounded-[var(--card-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-[var(--spacing-6)]"
      >
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <h1
            id="overlay-convite-titulo"
            className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] leading-none tracking-tight text-[var(--text-primary)]"
          >
            Seu acesso ainda não foi liberado
          </h1>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            Informe o código de convite que você recebeu do time Leela. Se ainda não tem um,
            fale com a gente.
          </p>
        </div>

        <form className="flex flex-col gap-[var(--spacing-4)]" onSubmit={enviar} noValidate>
          {erro ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-base)] p-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
            >
              {erro}
            </p>
          ) : null}

          <Input
            ref={campoRef}
            id="overlay-codigo-convite"
            label="Código de convite"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={TAMANHO_CODIGO_ORGANIZADOR + 4}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />

          <Button type="submit" variant="primary" disabled={!podeEnviar} className="w-full">
            {enviando ? 'Liberando acesso…' : 'Liberar acesso'}
          </Button>
        </form>

        <div className="flex flex-col gap-[var(--spacing-3)] border-t border-t-[var(--border-subtle)] pt-[var(--spacing-4)]">
          <a
            href={hrefContatoOnboarding(contato)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--action-brand-tint-fg)] hover:underline"
          >
            Falar com o time Leela
          </a>
          <div className="flex items-center justify-center gap-[var(--spacing-4)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            <Link to="/conta" className="hover:underline">
              Minha conta
            </Link>
            <button type="button" onClick={onSair} className="hover:underline">
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

OverlayConvite.displayName = 'OverlayConvite';
