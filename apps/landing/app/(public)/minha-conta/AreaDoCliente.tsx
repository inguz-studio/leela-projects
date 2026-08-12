'use client';
// =============================================================================
// AreaDoCliente — a casa autenticada do comprador (S1222-T2 · RN-451).
//
// TRÊS GUARDAS, NESTA ORDEM, e a ordem é a regra:
//
//   1. a sessão ainda não resolveu → nada é afirmado. Tratar o primeiro render
//      como "deslogado" expulsaria quem já está dentro antes de saber quem é;
//   2. a sessão não é NOMEADA → porta de entrada. É aqui que a área fica
//      inalcançável por sessão anônima: o uid anônimo do checkout é uma sessão
//      de verdade para o SDK, e `useSessaoLeela` já o separa (RN-451, primeira
//      linha). Não existe caminho em que a lista renderize sem `nomeado`;
//   3. o servidor recusou a leitura → o estado que ele devolveu, não uma lista
//      vazia. `email_nao_verificado` tem porta própria, com reenvio.
//
// UMA LEITURA POR ENTRADA, e as duas juntas. As listas são pedidas em paralelo
// porque são a MESMA tela: mostrar ingressos enquanto as compras ainda giram
// faria a área piscar duas vezes e daria a impressão de que falta coisa.
//
// NADA DE PERFIL NA URL. A aba escolhida vive em estado de React. Pôr aba,
// uid ou id de pedido na URL transformaria um link colado em conversa num
// vazamento — e o `Referer` de qualquer link de saída carregaria junto.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  getMeusClubesEConvites,
  getMeusIngressos,
  getMinhasCompras,
  type GetMeusClubesEConvitesResult,
  type GetMeusIngressosResult,
  type GetMinhasComprasResult,
} from '@leela/api-client';
import { Tabs } from '@/app/_ds/ds';
import { consumirAvisoDaArea, type AvisoDaArea } from '@/lib/areaDoCliente';
import { ensureLeela } from '@/lib/leelaClient';
import { rotuloDaConta, useSessaoLeela } from '@/lib/sessao';
import { EmailNaoVerificado, FalhaDeLeitura, PortaDeEntrada } from './EstadosDaArea';
import { PainelClubes } from './PainelClubes';
import { PainelCompras } from './PainelCompras';
import { PainelIngressos } from './PainelIngressos';
import { PainelMeusDados } from './PainelMeusDados';
import { PortasDaConta } from './PortasDaConta';

interface Dados {
  ingressos: GetMeusIngressosResult;
  compras: GetMinhasComprasResult;
  clubes: GetMeusClubesEConvitesResult;
}

/**
 * ⚔ REV-B4 · a aba mais nova NÃO derruba as duas que o dono precisa ver.
 *
 * As três leituras iam no mesmo `Promise.all` sem rede de proteção, então uma
 * rejeição de `getMeusClubesEConvites` — a function mais nova, a única que
 * pode não estar deployada quando a landing sobe — mandava a ÁREA INTEIRA para
 * `FalhaDeLeitura`, apagando "Minhas compras", que é a superfície que existe
 * porque em 04/08 um PIX real não apareceu em lugar nenhum. Uma ordem de
 * deploy trocada não pode custar isso.
 *
 * A degradação é DECLARADA, não calada: `clubesCompletos`/`convitesCompletos`
 * em `false` fazem a tela dizer que pode estar faltando coisa — o mesmo sinal
 * que o servidor já emite quando uma das três queries falha. Ingressos e
 * compras continuam derrubando a área de propósito: ali, lista vazia por falha
 * seria a mentira que a RN-451 proíbe.
 */
async function lerClubesDegradando(): Promise<GetMeusClubesEConvitesResult> {
  try {
    return await getMeusClubesEConvites();
  } catch {
    return {
      estado: 'ok',
      clubes: [],
      convites: [],
      clubesCompletos: false,
      convitesCompletos: false,
    };
  }
}

/**
 * O aviso que o checkout deixou para esta chegada (RN-560, ramo 2).
 *
 * POR QUE ELE FICA ACIMA DE TUDO, inclusive da porta de entrada: o dono decidiu
 * que o PIX vencido "redireciona AVISANDO" — o aviso e o destino são um gesto
 * só. Quem chega aqui SEM conta nomeada vê a `PortaDeEntrada`, e é exatamente
 * essa pessoa que mais precisa da explicação: sem ela, o checkout simplesmente
 * virou uma tela de login, sem uma palavra sobre o PIX que morreu.
 *
 * `role="status"` e não `alert`: quando esta linha aparece, o fato já foi
 * anunciado com urgência na tela anterior. Repetir a urgência na chegada é
 * gritar duas vezes a mesma notícia.
 */
function AvisoDeChegada({ aviso }: { aviso: AvisoDaArea }): React.JSX.Element {
  return (
    <section
      role="status"
      data-slot="aviso-de-chegada"
      className="mb-8 flex items-start gap-3 rounded-ds-lg border border-feedback-warning bg-feedback-warning-surface p-5"
    >
      <Clock
        size={18}
        strokeWidth={2}
        aria-hidden
        className="mt-0.5 shrink-0 text-feedback-warning-fg"
      />
      <p className="text-sm text-feedback-warning-fg">
        {aviso === 'pix-vencido'
          ? 'O PIX da sua última tentativa foi cancelado depois que o prazo venceu, e nada foi cobrado de você. A vaga voltou para o evento.'
          : null}
      </p>
    </section>
  );
}

/**
 * A área em si. O `AreaDoCliente` que a rota renderiza é a casca que põe o
 * aviso de chegada ACIMA de qualquer um dos cinco desfechos desta função — e a
 * separação existe porque são cinco `return` distintos, e pendurar o aviso em
 * cada um seria garantir que o próximo `return` esquecesse dele.
 */
function AreaDoClienteConteudo(): React.JSX.Element {
  const sessao = useSessaoLeela();
  const [dados, setDados] = useState<Dados | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const uid = sessao.uid;
  const nomeado = sessao.nomeado;

  useEffect(() => {
    if (!nomeado || uid === null) {
      setDados(null);
      return undefined;
    }
    let vivo = true;
    setFalhou(false);
    ensureLeela();
    void Promise.all([getMeusIngressos(), getMinhasCompras(), lerClubesDegradando()])
      .then(([ingressos, compras, clubes]) => {
        if (vivo) setDados({ ingressos, compras, clubes });
      })
      .catch(() => {
        // Estado próprio, nunca lista vazia: dizer "você não tem nada" quando
        // a rede caiu é afirmar uma coisa que não sabemos.
        if (vivo) setFalhou(true);
      });
    return () => {
      vivo = false;
    };
  }, [nomeado, uid, tentativa]);

  const tentarDeNovo = useCallback(() => {
    setDados(null);
    setTentativa((n) => n + 1);
  }, []);

  if (sessao.carregando) {
    return (
      <p role="status" className="text-text-secondary">
        Carregando sua conta…
      </p>
    );
  }

  if (!nomeado) return <PortaDeEntrada />;

  if (falhou) return <FalhaDeLeitura aoTentar={tentarDeNovo} />;

  if (dados === null) {
    return (
      <p role="status" className="text-text-secondary">
        Buscando seus ingressos…
      </p>
    );
  }

  // O servidor decide se a leitura pôde acontecer, e os dois callables aplicam
  // o MESMO gate — basta perguntar a um.
  if (dados.ingressos.estado === 'email_nao_verificado') {
    return <EmailNaoVerificado email={sessao.email} />;
  }
  if (dados.ingressos.estado === 'sessao_anonima') {
    // Inalcançável pela guarda de `nomeado` acima; fica escrito porque um
    // token sem provedor declarado cai neste estado no servidor, e a resposta
    // certa continua sendo a porta, não uma lista vazia.
    return <PortaDeEntrada />;
  }

  const totalIngressos = dados.ingressos.proximos.length + dados.ingressos.passados.length;

  return (
    <div data-slot="area-do-cliente">
      <header className="mb-8">
        <p className="text-sm text-text-secondary">Sua conta</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text-primary">
          Olá, {rotuloDaConta(sessao)}
        </h1>
      </header>

      <Tabs
        aria-label="Áreas da sua conta"
        tabs={[
          {
            id: 'ingressos',
            label: 'Meus ingressos',
            count: totalIngressos,
            content: (
              <PainelIngressos
                proximos={dados.ingressos.proximos}
                passados={dados.ingressos.passados}
                listaCompleta={dados.ingressos.listaCompleta}
                linksDisponiveis={dados.ingressos.linksDisponiveis}
              />
            ),
          },
          {
            id: 'compras',
            label: 'Minhas compras',
            count: dados.compras.compras.length,
            content: <PainelCompras compras={dados.compras.compras} />,
          },
          {
            // A contagem da aba é a dos CONVITES que ainda esperam a pessoa —
            // clube não é pendência, e um número que soma as duas coisas viraria
            // um aviso permanente para quem só faz parte de clubes.
            id: 'clubes',
            label: 'Clubes e convites',
            count: dados.clubes.convites.filter((c) => c.estado === 'pendente').length,
            content: (
              <PainelClubes
                clubes={dados.clubes.clubes}
                convites={dados.clubes.convites}
                clubesCompletos={dados.clubes.clubesCompletos}
                convitesCompletos={dados.clubes.convitesCompletos}
              />
            ),
          },
          {
            id: 'dados',
            label: 'Meus dados',
            content: <PainelMeusDados email={sessao.email} />,
          },
        ]}
      />

      {/* S1222-T5 · as duas portas. Ficam FORA das abas, no fim da página: são
          saídas para outro produto, não mais uma seção da conta. Conta de
          administração da plataforma não vê nenhuma (RN-449). */}
      <div className="mt-10">
        <PortasDaConta />
      </div>
    </div>
  );
}

export function AreaDoCliente(): React.JSX.Element {
  // RN-560 · leitura DESTRUTIVA, uma vez por montagem. `sessionStorage` não
  // existe no servidor, então ela precisa acontecer em efeito e não no estado
  // inicial — ler no `useState` produziria hidratação divergente.
  const [aviso, setAviso] = useState<AvisoDaArea | null>(null);
  useEffect(() => {
    setAviso(consumirAvisoDaArea());
  }, []);

  return (
    <>
      {aviso !== null ? <AvisoDeChegada aviso={aviso} /> : null}
      <AreaDoClienteConteudo />
    </>
  );
}
