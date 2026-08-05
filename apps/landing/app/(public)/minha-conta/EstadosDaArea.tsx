'use client';
// =============================================================================
// EstadosDaArea — as telas que a área do cliente mostra quando NÃO há lista
// (S1222-T2 · RN-451).
//
// A regra que estes três componentes existem para cumprir: "não posso
// responder" nunca se disfarça de "não há nada". A RN-451 escreve isso na
// forma de aceite — conta sem e-mail verificado vê o estado honesto com o
// reenvio, e não a lista vazia. Um "você ainda não tem ingressos" para quem
// TEM é a mesma família de defeito que o dono viu em 04/08: a tela calada.
//
// Cada estado sai por uma porta própria. Nenhum deles termina em "peça ajuda".
// =============================================================================

import { useRef, useState } from 'react';
import { enviarVerificacaoEmail } from '@leela/api-client';
import { Button } from '@/app/_ds/ds';
import { EntrarOverlay } from '@/app/components/EntrarOverlay';
import { RodapeEsqueciSenha } from '@/app/components/RodapeEsqueciSenha';

const TITULO = 'font-display text-3xl font-extrabold tracking-tight text-text-primary';
const CORPO = 'mt-3 max-w-prose text-text-secondary';

/**
 * Sessão que não é identidade — deslogada ou a ANÔNIMA do checkout. As duas
 * caem aqui, e é assim que a área fica inalcançável por sessão anônima: não há
 * caminho em que a lista renderize sem `nomeado`.
 */
export function PortaDeEntrada(): React.JSX.Element {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  return (
    <section data-slot="area-porta-entrada">
      <h1 className={TITULO}>Entre para ver seus ingressos</h1>
      <p className={CORPO}>
        Sua conta guarda os ingressos e as compras das experiências em que você se inscreveu.
        Se você já comprou alguma vez, a conta existe — use o mesmo e-mail da compra.
      </p>
      <div className="mt-6 flex flex-col items-start gap-3">
        <Button ref={botao} type="button" onClick={() => setAberto(true)}>
          Entrar
        </Button>
        {/* REV-AREACLIENTE · a conta criada pelo `contaSemFriccao` nasce SEM
            senha, e o link chega por e-mail. Quando o e-mail falha — o
            incidente de 04/08 — esta é a única tela que a pessoa alcança, e
            até aqui ela terminava em parede: "a conta existe" sem nenhum
            caminho até uma senha. */}
        <RodapeEsqueciSenha />
      </div>
      <EntrarOverlay
        open={aberto}
        onOpenChange={setAberto}
        returnFocusRef={botao}
        description="Entre para ver seus ingressos e suas compras."
        rodape={<RodapeEsqueciSenha />}
      />
    </section>
  );
}

/**
 * Conta real, e-mail sem verificar. O vínculo entre compra e conta exige
 * e-mail confirmado (RN-174), então a lista não pode ser lida — e dizer isso é
 * a única resposta honesta.
 */
export function EmailNaoVerificado({ email }: { email: string | null }): React.JSX.Element {
  const [fase, setFase] = useState<'parado' | 'enviando' | 'enviado' | 'falhou'>('parado');

  async function reenviar(): Promise<void> {
    setFase('enviando');
    try {
      await enviarVerificacaoEmail();
      setFase('enviado');
    } catch {
      setFase('falhou');
    }
  }

  return (
    <section data-slot="area-email-nao-verificado">
      <h1 className={TITULO}>Confirme seu e-mail para ver seus ingressos</h1>
      <p className={CORPO}>
        Seus ingressos ficam ligados ao e-mail da compra, e por isso só aparecem depois que
        você confirma que esse endereço é seu.{' '}
        {email !== null && email.length > 0 ? (
          <>
            Enviamos a confirmação para <strong className="text-text-primary">{email}</strong>.
          </>
        ) : null}
      </p>
      {fase === 'enviado' ? (
        <p role="status" className="mt-6 text-text-secondary">
          Pronto. Abra o e-mail, confirme e volte aqui — a lista aparece na hora.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {fase === 'falhou' ? (
            <p
              role="alert"
              className="rounded-ds-lg border border-border-default bg-surface-raised p-4 text-sm font-medium text-feedback-danger-fg"
            >
              Não conseguimos enviar agora. Tente de novo em alguns instantes.
            </p>
          ) : null}
          <Button
            type="button"
            onClick={() => void reenviar()}
            disabled={fase === 'enviando'}
            className="self-start"
          >
            {fase === 'enviando' ? 'Enviando…' : 'Reenviar confirmação'}
          </Button>
        </div>
      )}
    </section>
  );
}

/**
 * A leitura falhou (rede, indisponibilidade). Estado próprio, com repetição —
 * jamais uma lista vazia, que afirmaria que a pessoa não comprou nada.
 */
export function FalhaDeLeitura({ aoTentar }: { aoTentar: () => void }): React.JSX.Element {
  return (
    <section data-slot="area-falha-leitura">
      <h1 className={TITULO}>Não conseguimos carregar sua conta</h1>
      <p className={CORPO}>
        A falha é nossa, não sua — seus ingressos e suas compras continuam onde estavam.
      </p>
      <div className="mt-6">
        <Button type="button" onClick={aoTentar}>
          Tentar de novo
        </Button>
      </div>
    </section>
  );
}
