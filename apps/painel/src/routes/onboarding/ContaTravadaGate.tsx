// =============================================================================
// ContaTravadaGate — a porta entre o painel de trabalho e a VITRINE
// (ONBOARD-VITRINE · RN-510, sucedendo o desenho de parede da RN-416).
//
// Fica DENTRO do RootShell, envolvendo as rotas autenticadas. Decide três
// coisas e nada mais:
//
//   1. Crachá ainda sendo lido → ESPERA (o mesmo estado de espera que o
//      `RequireSessao` já usa uma camada acima). Ver "o vazamento da janela de
//      espera", abaixo — foi aqui que a prova nova pegou um defeito de verdade.
//   2. Conta COM tenant (ou administração da plataforma) → passa reto. Zero
//      efeito sobre o painel que já existe: nenhum ouvinte, nenhum render extra.
//   3. Conta SEM tenant → entra em VITRINE: o shell desenha, a `VitrinePainel`
//      ocupa a área de conteúdo, e a primeira interação (mouse ou teclado) sobe
//      o aviso de boas-vindas.
//
// O QUE MUDOU DE VERDADE, e o que continua igual byte a byte.
//
// MUDOU: antes, a conta sem tenant era barrada aqui e a rota de destino não
// montava — ela via um campo de código e mais nada. Foi assim que as duas
// contas reais de 06/08 pararam numa parede. O dono desfez isso na fala de
// 06/08 ("Ela entra no sistema e ao tentar clicar em qualquer botão, ou aba de
// menu, sobe o aviso"): a pessoa entra, conhece a plataforma, e o aviso responde
// ao gesto.
//
// CONTINUA IGUAL: **nenhuma query tenant-scoped sai daqui**. Essa era a razão
// técnica de a rota não montar, e ela não foi negociada — o que muda é o
// mecanismo. Em vez de não montar NADA, monta-se OUTRA COISA: a `VitrinePainel`
// não tem hook de dados nenhum. A propriedade é medida por teste
// (`__tests__/vitrine-sem-query.test.tsx`), que falha se qualquer leitura de
// tenant do api-client for chamada com a conta em vitrine.
//
// O VAZAMENTO DA JANELA DE ESPERA (achado desta lane, não regressão dela).
// O desenho anterior renderizava as rotas REAIS enquanto o crachá era lido, e
// o comentário que estava aqui dava isso por inofensivo. Não era: a prova nova
// mostrou `getOverview` saindo em `/crm` e `listarMarcas` saindo em `/marcas`
// ANTES de o crachá voltar — duas queries tenant-scoped disparadas por uma
// conta que, um tique depois, se revelaria sem tenant nenhum. O `enabled` das
// duas telas olha `uid`/`eventoId`, não `tenantId`, então nada as segurava.
// Elas voltariam `permission-denied`, exatamente o custo que o desenho da
// parede dizia estar evitando. A espera fecha a janela pela raiz e custa um
// tique a quem tem crachá em cache — que é todo mundo que trabalha no painel,
// porque `getClaims(false)` lê o token em memória e não sai do dispositivo.
//
// E CONTINUA IGUAL A FRONTEIRA: este gate é camada de PAPEL e mora depois do
// `RequireSessao` (App.tsx). Ele não abre porta para anônimo, nem antes nem
// agora — quem entra na vitrine já atravessou a autenticação. O contrato de
// roteamento da FRONTEIRA-AUTH (28 casos) mede exatamente isso e segue intacto.
//
// `/conta` continua sendo da PESSOA, não do tenant (RN-416 preservada): ali a
// rota REAL monta e o aviso não sobe, porque perfil e senha são dela.
//
// Ao resgatar com sucesso o hook força o refresh do ID token e a sessão é
// relida — o painel destrava na hora, sem novo login.
// =============================================================================

import { useCallback, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { logout } from '@leela/api-client';
import { Skeleton } from '@leela/design-system';
import { OverlayConvite } from './OverlayConvite';
import { VitrinePainel } from './VitrinePainel';
import { useFundoInerte } from './_lib/fundoInerte';
import { useAvisoNaPrimeiraInteracao } from './_lib/primeiraInteracao';
import {
  contaTravada,
  useContaOnboardingSession,
  useContatoOnboarding,
  useResgateConvite,
} from './_data/onboarding';

/** Rotas que a conta em vitrine alcança DE VERDADE (RN-416): o próprio perfil. */
const ROTAS_LIBERADAS = ['/conta'];

/** @pure — a conta em vitrine abre esta rota de verdade, sem passar pela vitrine? */
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

  // `/conta` é da PESSOA, não do tenant (S020-T4 · RN-416): ali a rota real
  // monta mesmo sem crachá, e a vitrine sai da frente.
  const rotaDaPessoa = rotaLiberadaNaConta(location.pathname);
  const lendoCracha = sessao.status === 'loading' && !rotaDaPessoa;
  const emVitrine = contaTravada(sessao) && !rotaDaPessoa;
  // O hook é chamado SEMPRE (regra dos hooks) e é inerte quando `emVitrine` é
  // falso: sem ouvinte no documento, sem estado que mude. Quem trabalha no
  // painel não paga nada por esta tela.
  const aviso = useAvisoNaPrimeiraInteracao(emVitrine);

  // VITRINE-VEU-1 · com o aviso na frente, o painel inteiro sai do alcance —
  // inclusive da tecnologia assistiva, que é o que o `aria-modal` sozinho não
  // entrega (DEF-R1). A âncora é a raiz da vitrine; quem acha o contêiner do
  // app a partir dela, e por que ela precisa estar ABAIXO da sidebar no DOM,
  // está em `_lib/fundoInerte.ts`. O aviso é portalizado pelo `Modal` do DS
  // para o `body`, então fica irmão do contêiner e de fora do `inert`.
  const vitrineRef = useRef<HTMLDivElement>(null);
  const liberarFundo = useFundoInerte(aviso.aberto, vitrineRef);

  // ⛔ O fundo volta ao mundo ANTES de o React desmontar o aviso (REV-CORTE ·
  // 09/08). As quatro saídas — X, Esc, clique no véu e "Continuar olhando" —
  // desembocam todas aqui, e é aqui que o `inert` tem de cair: a limpeza do
  // efeito roda DEPOIS da remoção da subárvore, e o `useDialogBehavior`
  // devolve o foco ao abridor no meio desse intervalo. Foco em nó inerte é
  // no-op no navegador — o retorno de foco morria calado. Medido pela review.
  const fecharAviso = useCallback((): void => {
    liberarFundo();
    aviso.fechar();
  }, [liberarFundo, aviso.fechar]);

  if (lendoCracha) {
    return (
      <div role="status" aria-label="Carregando o painel" className="p-[var(--spacing-6)]">
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }

  if (!emVitrine) return <>{children}</>;

  async function resgatar(codigo: string): Promise<void> {
    const ok = await resgate.resgatar(codigo);
    // Sucesso: a claim nova já está no token (o hook forçou o refresh). Reler a
    // sessão derruba a vitrine sem recarregar a página.
    //
    // ⛔ O aviso é BAIXADO por decisão, não pelo efeito colateral de a vitrine
    // sumir por baixo dele. Sem esta linha o `aberto` seguia verdadeiro num
    // aviso que já não estava na tela, e o `inert` do fundo nunca era devolvido
    // — o painel recém-liberado nascia morto (REV-CORTE · 09/08).
    if (ok) {
      fecharAviso();
      sessao.recarregar();
    }
  }

  return (
    <>
      <VitrinePainel ref={vitrineRef} onPedirCodigo={aviso.abrir} />
      {aviso.aberto ? (
        <OverlayConvite
          contato={contato}
          enviando={resgate.running}
          erro={resgate.erro}
          onResgatar={(codigo) => void resgatar(codigo)}
          onSair={() => void logout()}
          onFechar={fecharAviso}
        />
      ) : null}
    </>
  );
}

ContaTravadaGate.displayName = 'ContaTravadaGate';
