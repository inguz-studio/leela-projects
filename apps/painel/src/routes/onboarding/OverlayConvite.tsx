// =============================================================================
// OverlayConvite — o aviso de boas-vindas da conta em vitrine
// (ONBOARD-VITRINE · RN-510, sucedendo a RN-416).
//
// Ordem do dono, verbatim (06/08): "ao tentar clicar em qualquer botão, ou aba
// de menu, sobe o aviso, de boas vindas à leela, e orientando para falar com
// nosso time, para receber o código Leela, para conhecer a plataforma."
//
// O QUE MUDOU E POR QUÊ. A RN-416 pedia um overlay BLOQUEANTE E NÃO-DESCARTÁVEL
// (sem X, sem Esc, sem clique-fora) porque, naquele desenho, a rota de destino
// nem montava: fechar o overlay deixaria a pessoa olhando uma home vazia. Com a
// vitrine existe algo por baixo para olhar, e o dono descreveu o aviso como
// resposta a um GESTO ("ao tentar clicar"), não como parede permanente. Então:
//
//   - ele continua BLOQUEANTE enquanto está na tela (véu opaco de verdade,
//     `aria-modal`, armadilha de Tab) — não é um cartaz decorativo;
//   - e passa a ser DESCARTÁVEL (Esc e botão), porque a pessoa foi convidada a
//     conhecer a plataforma e precisa poder voltar a olhar.
//
// Quem rearma a captura depois do fechamento é o `useAvisoNaPrimeiraInteracao`:
// o próximo gesto sobe o aviso de novo. Fechar não é dispensar para sempre.
//
// O código é de quem vai ser PROFISSIONAL (ordem do dono na mesma fala), então
// a copy não empurra ninguém para o campo: ela dá boas-vindas, aponta o time e
// deixa o campo ali para quem já tem o código. A linha do participante existe
// para que ninguém fique procurando ingresso no painel errado.
//
// O VÉU (lição DEF-C, ONBOARD-REV). O que havia aqui era
// `bg-[var(--surface-base)]/95`, e o Tailwind NÃO compila isso: modificador de
// opacidade sobre valor arbitrário `var()` é descartado no build. Medido no
// `dist` do `vite build --mode leela-hub`: nenhuma regra com `\/95`. O véu
// ficava transparente num overlay que se anuncia bloqueante. Os tokens
// `--modal-overlay-bg` e `--modal-overlay-blur` são os MESMOS do backdrop do
// Modal do DS e já vinham compilados. A regra agora é medida no CSS BUILDADO
// (`__tests__/veu-buildado.test.ts`), não na string da classe.
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
import { ATRIBUTO_ISENTO } from './_lib/primeiraInteracao';

export interface OverlayConviteProps {
  contato: ContatoOnboarding;
  enviando: boolean;
  erro: string | null;
  onResgatar: (codigo: string) => void;
  onSair: () => void;
  /** Fecha o aviso e devolve a vitrine. Rearma a captura da próxima interação. */
  onFechar: () => void;
}

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function OverlayConvite({
  contato,
  enviando,
  erro,
  onResgatar,
  onSair,
  onFechar,
}: OverlayConviteProps): JSX.Element {
  const [codigo, setCodigo] = useState('');
  const painelRef = useRef<HTMLDivElement>(null);

  const normalizado = normalizarCodigoOrganizador(codigo);
  const podeEnviar = validarCodigoOrganizador(normalizado) && !enviando;

  // O foco entra no PAINEL, não no campo de código. O campo é para quem já tem
  // o código; jogar o cursor nele anunciaria que digitar algo é o pedágio da
  // tela, que é o oposto da ordem do dono ("boas vindas ... e orientando").
  useEffect(() => {
    painelRef.current?.focus();
  }, []);

  /** Armadilha de Tab + saída por Esc, as duas do mesmo teclado. */
  function aoTeclar(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onFechar();
      return;
    }
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
      // como inerte enquanto o aviso estiver na frente.
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-convite-titulo"
      aria-describedby="overlay-convite-descricao"
      onKeyDown={aoTeclar}
      // Isenta o próprio aviso da captura de interação — cinto e suspensório:
      // os ouvintes já saem do documento enquanto ele está aberto.
      {...{ [ATRIBUTO_ISENTO]: '' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--modal-overlay-bg)] p-[var(--spacing-5)] backdrop-blur-[var(--modal-overlay-blur)]"
    >
      <div
        ref={painelRef}
        tabIndex={-1}
        className="flex w-full max-w-md flex-col gap-[var(--spacing-5)] rounded-[var(--card-radius)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-[var(--spacing-6)] outline-none"
      >
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <h1
            id="overlay-convite-titulo"
            className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] leading-none tracking-tight text-[var(--text-primary)]"
          >
            Boas-vindas à Leela
          </h1>
          <p
            id="overlay-convite-descricao"
            className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]"
          >
            Você já entrou e pode circular pelo painel à vontade. Para trabalhar com os seus
            dados aqui, fale com o nosso time e receba o código Leela.
          </p>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Veio participar de uma experiência? Seus ingressos ficam na área do cliente, no
            site da Leela.
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
            id="overlay-codigo-convite"
            label="Já tem o código Leela?"
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
          <Button type="button" variant="secondary" onClick={onFechar} className="w-full">
            Continuar olhando
          </Button>
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
