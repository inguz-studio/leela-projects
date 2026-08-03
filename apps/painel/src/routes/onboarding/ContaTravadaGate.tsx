// =============================================================================
// ContaTravadaGate — o escopo da conta sem convite (S1609-T2 · RN-416).
//
// Fica DENTRO do RootShell, envolvendo as rotas autenticadas. Decide três
// coisas e nada mais:
//
//   1. Sessão ainda resolvendo → renderiza as rotas normalmente. Piscar o
//      overlay na cara de quem já tem acesso é pior que meio segundo de
//      conteúdo. A tranca de dados é do servidor, não deste componente.
//   2. Conta COM tenant (ou `platform_admin`) → passa reto. Zero efeito sobre
//      o painel que já existe.
//   3. Conta TRAVADA → overlay bloqueante por cima; e a rota de destino não é
//      montada, para que nenhuma query tenant-scoped saia daqui só para voltar
//      com `permission-denied` atrás do véu. Exceção: `/conta`, que a RN-416
//      garante à conta travada (perfil e senha são dela, não do tenant).
//
// Ao resgatar com sucesso o hook força o refresh do ID token e a sessão é
// relida — a home destrava na hora, sem novo login.
// =============================================================================

import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { logout } from '@leela/api-client';
import { OverlayConvite } from './OverlayConvite';
import {
  contaTravada,
  useContaOnboardingSession,
  useContatoOnboarding,
  useResgateConvite,
} from './_data/onboarding';

/** Rotas que a conta travada ALCANÇA (RN-416): o próprio perfil e a saída. */
const ROTAS_LIBERADAS = ['/conta'];

/** @pure — a conta travada pode abrir esta rota? */
export function rotaLiberadaNaConta(pathname: string): boolean {
  return ROTAS_LIBERADAS.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}

export interface ContaTravadaGateProps {
  children: ReactNode;
}

export function ContaTravadaGate({ children }: ContaTravadaGateProps): JSX.Element {
  const location = useLocation();
  const sessao = useContaOnboardingSession();
  const contato = useContatoOnboarding();
  const resgate = useResgateConvite();

  if (!contaTravada(sessao)) return <>{children}</>;

  // `/conta` é da PESSOA, não do tenant (S020-T4): a conta travada entra e o
  // overlay sai da frente enquanto ela estiver ali. Voltar para qualquer outra
  // rota traz o overlay de volta — ele não some, só não atrapalha o único
  // lugar que a RN-416 garante a ela.
  if (rotaLiberadaNaConta(location.pathname)) return <>{children}</>;

  async function resgatar(codigo: string): Promise<void> {
    const ok = await resgate.resgatar(codigo);
    // Sucesso: a claim nova já está no token (o hook forçou o refresh). Reler
    // a sessão derruba o overlay sem recarregar a página.
    if (ok) sessao.recarregar();
  }

  return (
    <>
      <OverlayConvite
        contato={contato}
        enviando={resgate.running}
        erro={resgate.erro}
        onResgatar={(codigo) => void resgatar(codigo)}
        onSair={() => void logout()}
      />
    </>
  );
}

ContaTravadaGate.displayName = 'ContaTravadaGate';
