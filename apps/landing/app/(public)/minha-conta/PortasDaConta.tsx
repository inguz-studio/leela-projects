'use client';
// =============================================================================
// PortasDaConta — as duas portas do fim da área do cliente (S1222-T5, e a
// ponte da S1234-T2 · RN-512/513/514).
//
// A REGRA NÃO MORA AQUI. Quem decide qual porta aparece é
// `portaDaConta(claims)`, puro e testável sem montar componente nenhum. Este
// arquivo só desenha o que aquela função respondeu — inclusive o `null`, que
// é a conta de administração da plataforma e não ganha porta nenhuma (RN-449).
//
// O DESTINO ABSOLUTO VEM DE `painelUrl`, cujo tipo `RotaPainel` admite
// exatamente `/entrar` e `/cadastrar`. Não há valor que produza uma URL de
// `/plataforma` daqui — a proibição é do compilador, e não de uma checagem que
// alguém possa esquecer numa refatoração.
//
// -----------------------------------------------------------------------------
// O QUE MUDOU, E POR QUE ERA DEFEITO
// -----------------------------------------------------------------------------
// Esta tela mandava a participante LOGADA para o `/cadastrar` do painel. Ela
// já tem conta — a área inteira exige sessão nomeada —, então o Firebase
// devolvia `auth/email-already-in-use`, a máscara anti-enumeração do painel
// engolia o erro (comportamento CERTO, que não muda) e ela ficava sem caminho
// depois de preencher um formulário inteiro.
//
// A RN-512 troca o cadastro pela PROMOÇÃO da conta que já existe. Nenhuma
// segunda porta de cadastro nasce na landing, e a máscara do painel continua
// intacta porque esta tela deixou de exercitá-la.
//
// -----------------------------------------------------------------------------
// O SEGUNDO LOGIN É DITO ANTES DO CLIQUE (PCLIENTE-3 · RN-513)
// -----------------------------------------------------------------------------
// Landing e painel são sites de Hosting distintos, e a sessão do Firebase Auth
// é por origem: quem atravessa chega deslogada. Isso não é defeito, é a
// topologia — o defeito era a tela não avisar. O aviso é uma linha de apoio no
// próprio cartão, e não um modal: uma frase de expectativa, nunca um
// obstáculo. Handoff por token entre as origens foi recusado com razão (seria
// uma segunda superfície de credencial para a mesma capacidade).
//
// -----------------------------------------------------------------------------
// VOCABULÁRIO (RN-468 · RN-450)
// -----------------------------------------------------------------------------
// "Profissional", nunca "organizador", no rótulo do painel. E a copy não
// promete mais que a conta "nasce separada": pela RN-450, organizador e
// cliente cabem na MESMA conta — o que nasce separado é o documento de perfil.
//
// -----------------------------------------------------------------------------
// O RÓTULO É VARIANTE, E A VARIANTE TEM FILA (PONTE-RET-D1 · direção do dono 07/08)
// -----------------------------------------------------------------------------
// O dono pediu, verbatim: *"a primeira é 'Painel Profissional' ao invés de virar
// profissional. Podemos ter CTA's diferentes, que é 'Criar Club' e 'Organizar
// eventos'"*. São três rótulos e uma ordem: o primeiro nomeia o LUGAR, os outros
// dois nomeiam o TRABALHO, e a frase que os une é "devemos testar coisas
// diferentes".
//
// O que esta tela entrega é a variante 1 — `ROTULO_DA_TRAVESSIA`. As outras duas
// ficam escritas ao lado dela, e a razão de não subirem juntas não é escopo, é
// MEDIÇÃO: a landing não tem uma linha de telemetria (`grep` por
// gtag/plausible/posthog/analytics/logEvent devolve zero fora de node_modules).
// Dois botões que disparam a MESMA promoção, sem medir qual foi clicado, não
// testam nada — só cobram da pessoa uma decisão a mais num cartão cuja função é
// desbloquear um caminho que hoje é beco.
//
// O que NÃO é razão para a fila, e vale registrar porque o oposto já foi suposto:
// a criação de clube EXISTE (`/clubes/novo`, `NovoClubePage`, com CTA no
// `HubClubes`). Ela está atrás do tenant, exatamente como a criação de evento, e
// o `ContaTravadaGate` do painel troca as duas pela vitrine enquanto a conta não
// resgatou o código. As duas intenções são SIMÉTRICAS — a vitrine já nomeia
// "Eventos" e "Clubs" com o mesmo peso (`areasDaVitrine.ts`) — e o resgate do
// código provisiona o tenant que abre as duas. Por isso o cartão pode NOMEAR os
// dois trabalhos sem mentir, mesmo entregando uma porta só.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getClaims,
  motivoDaRecusaDaPromocao,
  promoverParaProfissional,
  type MotivoRecusaPromocao,
} from '@leela/api-client';
import { Button, Checkbox } from '@/app/_ds/ds';
import { ensureLeela } from '@/lib/leelaClient';
import { painelUrl } from '@/lib/painel';
import { portaDaConta, type PortaDaConta } from '@/lib/portaOrganizador';

const CARTAO = 'rounded-ds-lg border border-border-default bg-surface-raised p-4 sm:p-5';
const TITULO = 'text-base font-semibold text-text-primary';
const APOIO = 'mt-1 text-sm text-text-secondary';
const LINK =
  'mt-3 inline-flex w-fit items-center rounded-ds-pill border border-border-default px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';
const ERRO =
  'mt-3 rounded-ds-lg border border-border-default bg-surface-base p-3 text-sm font-medium text-feedback-danger-fg';

/** A frase do segundo login. Uma só, para os dois cartões (PCLIENTE-3). */
const AVISO_SEGUNDO_LOGIN = 'O painel vai pedir sua senha de novo — é a mesma conta e o mesmo e-mail.';

/**
 * O rótulo da travessia, variante 1 (PONTE-RET-D1). Texto exato do dono.
 *
 * A fila de variantes, para quem for rodar o teste — trocar aqui, e em nenhum
 * outro lugar, é o que muda o rótulo:
 *
 *   v1 (esta)  'Painel Profissional'  — nomeia o lugar.
 *   v2         'Organizar eventos'    — nomeia o trabalho; a área existe e a
 *                                       vitrine já a nomeia.
 *   v3         'Criar Club'           — nomeia o outro trabalho; `/clubes/novo`
 *                                       existe e abre com o mesmo código.
 *
 * ⛔ Nenhuma das três pode subir junto com outra enquanto não houver medição na
 * landing: sem saber qual foi clicado, o teste não tem leitura. É variante
 * alternada, não botão duplo.
 */
const ROTULO_DA_TRAVESSIA = 'Painel Profissional';

/**
 * A copy de cada recusa. Fica AQUI, e não no api-client, porque é voz do
 * produto: o pacote nomeia o motivo, a tela escolhe a frase. Nenhuma delas
 * termina em "peça ajuda", e nenhuma expõe erro cru.
 */
const FRASE_DA_RECUSA: Record<MotivoRecusaPromocao, string> = {
  sem_sessao: 'Sua sessão expirou. Entre de novo e tente outra vez.',
  sessao_anonima: 'Entre com o e-mail da sua conta para conhecer o painel profissional.',
  conta_de_plataforma: 'Esta conta administra a plataforma e não vira conta de profissional.',
  aceite_ausente: 'Aceite o termo do profissional para continuar.',
  aceite_datado_pelo_cliente: 'Recarregue a página e tente de novo.',
  indisponivel: 'Não conseguimos abrir o painel profissional agora. Tente de novo em instantes.',
};

type FasePromocao = 'convite' | 'promovendo' | 'pronta' | 'recusada';

/**
 * Fluxo A — a conta já alcança os dois lados (RN-513). Nada de servidor aqui:
 * o que muda é o rótulo e a expectativa.
 */
function PortaDeQuemJaEProfissional(): React.JSX.Element {
  return (
    <section className={CARTAO} data-slot="porta-organizador">
      <h2 className={TITULO}>Você também organiza</h2>
      <p className={APOIO}>
        Suas experiências, inscrições e repasses ficam no painel profissional. {AVISO_SEGUNDO_LOGIN}
      </p>
      <a className={LINK} href={painelUrl('/entrar')} data-slot="ir-para-painel">
        Ir para o painel profissional
      </a>
    </section>
  );
}

/**
 * Fluxo B — a conta é só de cliente e quer conhecer o outro lado.
 *
 * O botão é DESABILITADO sem o aceite, e a razão fica escrita ao lado, nunca
 * em silêncio: um botão morto sem explicação é a mesma família de defeito da
 * tela calada.
 *
 * O DUPLO CLIQUE não chega ao servidor duas vezes. A trava é um ref, e não o
 * estado: `setFase` é assíncrono e dois cliques no mesmo tick leem a fase
 * antiga — que é exatamente o cenário de duplo clique que a idempotência do
 * servidor existe para absorver. As duas defesas são de propósito: esta impede
 * a segunda chamada, a de lá impede o segundo estado de onboarding.
 */
function PortaDeQuemAindaNaoE(): React.JSX.Element {
  const [aceito, setAceito] = useState(false);
  const [fase, setFase] = useState<FasePromocao>('convite');
  const [recusa, setRecusa] = useState<MotivoRecusaPromocao>('indisponivel');
  const emVoo = useRef(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const conhecer = useCallback(async (): Promise<void> => {
    if (emVoo.current) return;
    if (!aceito) {
      setRecusa('aceite_ausente');
      setFase('recusada');
      return;
    }
    emVoo.current = true;
    setFase('promovendo');
    try {
      ensureLeela();
      await promoverParaProfissional();
      if (vivo.current) setFase('pronta');
    } catch (erro) {
      if (vivo.current) {
        setRecusa(motivoDaRecusaDaPromocao(erro));
        setFase('recusada');
      }
    } finally {
      emVoo.current = false;
    }
  }, [aceito]);

  if (fase === 'pronta') {
    return (
      <section className={CARTAO} data-slot="porta-conhecer-painel">
        <h2 className={TITULO}>Pronto. O painel profissional já é seu</h2>
        {/* A confirmação é curta e a travessia vem junto: a pessoa acabou de
            pedir para conhecer, e mandá-la procurar o caminho seria devolver
            a ela o trabalho que este cartão existe para tirar.

            As duas áreas são NOMEADAS aqui de propósito. A pessoa vai cair na
            vitrine, e a vitrine acompanha o menu: dizer "Eventos e Clubs" é
            dizer onde ela vai encontrar o que veio buscar, e no mesmo fôlego
            dizer que o código é o que abre as duas. */}
        <p className={APOIO} role="status">
          Entre com esta mesma conta para conhecer as áreas por dentro — Eventos e Clubs estão lá.
          Para trabalhar com os seus dados, o time Leela libera seu código. {AVISO_SEGUNDO_LOGIN}
        </p>
        <a className={LINK} href={painelUrl('/entrar')} data-slot="ir-para-painel-vitrine">
          Ir para o painel profissional
        </a>
      </section>
    );
  }

  return (
    <section className={CARTAO} data-slot="porta-conhecer-painel">
      {/* O título nomeia os dois TRABALHOS que o dono pediu como intenção, e o
          botão nomeia o LUGAR. Não são dois botões: ver a nota do
          `ROTULO_DA_TRAVESSIA`. */}
      <h2 className={TITULO}>Quer organizar eventos ou criar um club?</h2>
      <p className={APOIO}>
        O painel profissional é onde você publica experiências, vende inscrições, acompanha
        repasses e toca os seus clubs. Você pode entrar e circular agora, com esta mesma conta.
        Para trabalhar com os seus dados, o time Leela libera seu código.
      </p>
      <p className={APOIO}>{AVISO_SEGUNDO_LOGIN}</p>

      <div className="mt-4 flex items-start gap-3">
        <Checkbox
          id="ponte-termo-profissional"
          checked={aceito}
          onChange={(e) => {
            setAceito(e.target.checked);
            if (e.target.checked && fase === 'recusada' && recusa === 'aceite_ausente') {
              setFase('convite');
            }
          }}
        />
        <label htmlFor="ponte-termo-profissional" className="text-sm text-text-secondary">
          Li e aceito o termo do profissional
        </label>
      </div>

      {fase === 'recusada' ? (
        <p role="alert" className={ERRO} data-slot="ponte-recusa">
          {FRASE_DA_RECUSA[recusa]}
        </p>
      ) : null}

      {/* A razão do botão desabilitado fica escrita, não subentendida. */}
      {!aceito && fase !== 'recusada' ? (
        <p className="mt-3 text-sm text-text-secondary" data-slot="ponte-razao-desabilitado">
          Aceite o termo do profissional para continuar.
        </p>
      ) : null}

      <div className="mt-3">
        <Button
          type="button"
          onClick={() => void conhecer()}
          disabled={!aceito || fase === 'promovendo'}
          data-slot="ponte-cta-painel-profissional"
        >
          {fase === 'promovendo' ? 'Abrindo…' : ROTULO_DA_TRAVESSIA}
        </Button>
      </div>
    </section>
  );
}

export function PortasDaConta(): React.JSX.Element | null {
  const [porta, setPorta] = useState<PortaDaConta>(null);

  useEffect(() => {
    let vivo = true;
    void getClaims()
      .then((claims) => {
        if (vivo) setPorta(portaDaConta(claims));
      })
      .catch(() => {
        // Falha ao ler o token: nenhuma porta. Não desenhar é reversível;
        // desenhar a errada, não.
        if (vivo) setPorta(null);
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (porta === null) return null;
  if (porta === 'organizador') return <PortaDeQuemJaEProfissional />;
  return <PortaDeQuemAindaNaoE />;
}
