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
import {
  getMeusIngressos,
  getMinhasCompras,
  type GetMeusIngressosResult,
  type GetMinhasComprasResult,
} from '@leela/api-client';
import { Tabs } from '@/app/_ds/ds';
import { ensureLeela } from '@/lib/leelaClient';
import { rotuloDaConta, useSessaoLeela } from '@/lib/sessao';
import { EmailNaoVerificado, FalhaDeLeitura, PortaDeEntrada } from './EstadosDaArea';
import { PainelCompras } from './PainelCompras';
import { PainelIngressos } from './PainelIngressos';
import { PainelMeusDados } from './PainelMeusDados';
import { PortasDaConta } from './PortasDaConta';

interface Dados {
  ingressos: GetMeusIngressosResult;
  compras: GetMinhasComprasResult;
}

export function AreaDoCliente(): React.JSX.Element {
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
    void Promise.all([getMeusIngressos(), getMinhasCompras()])
      .then(([ingressos, compras]) => {
        if (vivo) setDados({ ingressos, compras });
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
