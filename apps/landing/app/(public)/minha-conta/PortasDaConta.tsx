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
// OS DOIS CTAs POR INTENÇÃO (PONTE-CTA-1 · direção do dono 07/08)
// -----------------------------------------------------------------------------
// O dono pediu, verbatim: *"a primeira é 'Painel Profissional' ao invés de virar
// profissional. Podemos ter CTA's diferentes, que é 'Criar Club' e 'Organizar
// eventos'"*. São três rótulos: o primeiro nomeia o LUGAR, os outros dois nomeiam
// o TRABALHO.
//
// A lane de 08/08 entregou um botão só, e a razão escrita foi honesta: a landing
// não tem uma linha de telemetria (`grep` por gtag/plausible/posthog/analytics/
// logEvent devolve zero fora de node_modules), então dois botões disparando a
// MESMA promoção não diriam qual converteu. A review antagonista corrigiu a
// conclusão: a callable JÁ loga por conta própria, e um campo `intencao` nela
// mede clique E conversão — porque o resgate do código também loga e o `uid`
// junta os dois. Era razão de calendário, não de impossibilidade.
//
// Então o cartão entrega os três rótulos no lugar de cada um: o TÍTULO nomeia o
// lugar ("Painel Profissional", a palavra do dono), e os DOIS BOTÕES nomeiam os
// dois trabalhos. Cada um carimba a própria intenção no servidor.
//
// As duas intenções são SIMÉTRICAS e por isso os dois botões podem prometer o
// mesmo destino sem mentir: a criação de clube EXISTE (`/clubes/novo`,
// `NovoClubePage`, com CTA no `HubClubes`), está atrás do tenant exatamente como
// a criação de evento, o `ContaTravadaGate` troca as duas pela vitrine enquanto
// a conta não resgatou o código, e a vitrine já nomeia "Eventos" e "Clubs" com o
// mesmo peso (`areasDaVitrine.ts`).
//
// -----------------------------------------------------------------------------
// O NOME DA PRODUTORA É ESCOLHIDO AQUI, PORQUE DEPOIS NÃO EXISTE (PONTE-NOME-1)
// -----------------------------------------------------------------------------
// Este cartão nasceu SEM formulário de propósito — era isso que tirava a pessoa
// do beco. O preço apareceu contra banco de verdade: `organizacao` nascia vazio,
// e no dia do resgate o sistema batizava a produtora com o nome da pessoa (ou,
// pior, com o pedaço do e-mail antes do arroba). O slug é cunhado UMA vez e não
// se renomeia — não por escopo, mas porque a review de 08/08 mediu que o
// "depois" não existe: `profissionais/{uid}` só admite `create` pelo cliente,
// não há callable de edição a pedido da dona, e renomear tenant é exclusivo de
// platform_admin.
//
// Um campo é o preço mínimo de matar isso na ORIGEM, e ele é pré-preenchido com
// o nome da pessoa — que é exatamente o que o sistema usaria em silêncio. Quem
// não quiser escolher não faz nada e cai no comportamento de antes; quem quiser,
// escolhe antes de o nome virar permanente. Nenhum formulário nasce: é um campo,
// e ele é opcional.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getClaims,
  motivoDaRecusaDaPromocao,
  promoverParaProfissional,
  type IntencaoDaTravessia,
  type MotivoRecusaPromocao,
} from '@leela/api-client';
import { Button, Checkbox, Input } from '@/app/_ds/ds';
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
 * O nome do LUGAR — a palavra do dono, agora no título e não no botão
 * (PONTE-CTA-1). Os botões nomeiam os dois trabalhos.
 */
const NOME_DO_LUGAR = 'Painel Profissional';

/**
 * Os dois CTAs por intenção. Texto exato do dono, na ordem em que ele os
 * escreveu.
 *
 * `intencao` é o que o servidor carimba no log da promoção — é ela que faz o
 * teste ter leitura sem uma linha de telemetria na landing. Os dois botões
 * disparam a MESMA promoção de propósito: as duas áreas são simétricas e o
 * mesmo código Leela abre as duas, então prometer destinos diferentes seria a
 * mentira, e não a economia.
 */
const CTAS: readonly { intencao: IntencaoDaTravessia; rotulo: string; slot: string }[] = [
  { intencao: 'clube', rotulo: 'Criar Club', slot: 'ponte-cta-clube' },
  { intencao: 'eventos', rotulo: 'Organizar eventos', slot: 'ponte-cta-eventos' },
];

/**
 * A copy de cada recusa. Fica AQUI, e não no api-client, porque é voz do
 * produto: o pacote nomeia o motivo, a tela escolhe a frase. Nenhuma delas
 * termina em "peça ajuda", e nenhuma expõe erro cru.
 */
const FRASE_DA_RECUSA: Record<MotivoRecusaPromocao, string> = {
  sem_sessao: 'Sua sessão expirou. Entre de novo e tente outra vez.',
  sessao_anonima: 'Entre com o e-mail da sua conta para conhecer o painel profissional.',
  conta_de_plataforma: 'Esta conta administra a plataforma e não vira conta de profissional.',
  // PONTE-ELEGIVEL-1 · a sexta. Quem cai aqui é o divulgador e a
  // ex-organizadora rebaixada de propósito: o resgate do código recusaria as
  // duas, e a porta passou a recusá-las na entrada. A frase diz o que fazer
  // porque o caminho de saída existe e é humano — o time Leela destrava a
  // conta. Deixá-la atravessar era pior: ela esperava dias por um código que
  // ia ser negado como se estivesse inválido.
  conta_inelegivel:
    'Esta conta não pode virar conta de profissional. Fale com o time Leela para liberar o seu acesso.',
  aceite_ausente: 'Aceite o termo do profissional para continuar.',
  aceite_datado_pelo_cliente: 'Recarregue a página e tente de novo.',
  // PONTE-NOME-1 · a pessoa apagou o pré-preenchido e digitou algo que não
  // vira endereço. A frase diz a régua, e não o erro: o que ela precisa saber
  // é o que serve, porque o nome dela vira o endereço da produtora.
  nome_profissional_invalido:
    'Escolha um nome com pelo menos duas letras ou números para a sua produtora.',
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
function PortaDeQuemAindaNaoE({ nomeDaPessoa }: { nomeDaPessoa: string }): React.JSX.Element {
  const [aceito, setAceito] = useState(false);
  // PONTE-NOME-1 · pré-preenchido com o nome da pessoa, que é EXATAMENTE o que
  // o resgate usaria em silêncio. O campo não inventa um default novo: ele
  // mostra o default que já existia e devolve a caneta para a dona.
  const [nomeProfissional, setNomeProfissional] = useState(nomeDaPessoa);
  const [fase, setFase] = useState<FasePromocao>('convite');
  const [recusa, setRecusa] = useState<MotivoRecusaPromocao>('indisponivel');
  /** Qual dos dois botões está em voo — só ele vira "Abrindo…". */
  const [emVooDe, setEmVooDe] = useState<IntencaoDaTravessia | null>(null);
  const emVoo = useRef(false);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const conhecer = useCallback(
    async (intencao: IntencaoDaTravessia): Promise<void> => {
      if (emVoo.current) return;
      if (!aceito) {
        setRecusa('aceite_ausente');
        setFase('recusada');
        return;
      }
      emVoo.current = true;
      setEmVooDe(intencao);
      setFase('promovendo');
      try {
        ensureLeela();
        await promoverParaProfissional({ intencao, nomeProfissional: nomeProfissional.trim() });
        if (vivo.current) setFase('pronta');
      } catch (erro) {
        if (vivo.current) {
          setRecusa(motivoDaRecusaDaPromocao(erro));
          setFase('recusada');
        }
      } finally {
        emVoo.current = false;
      }
    },
    [aceito, nomeProfissional]
  );

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
      {/* O título nomeia o LUGAR com a palavra do dono; os dois botões nomeiam
          os dois TRABALHOS e carimbam intenções diferentes (PONTE-CTA-1). */}
      <h2 className={TITULO}>{NOME_DO_LUGAR}</h2>
      <p className={APOIO}>
        O painel profissional é onde você publica experiências, vende inscrições, acompanha
        repasses e toca os seus clubs. Você pode entrar e circular agora, com esta mesma conta.
        Para trabalhar com os seus dados, o time Leela libera seu código.
      </p>
      <p className={APOIO}>{AVISO_SEGUNDO_LOGIN}</p>

      {/* PONTE-NOME-1 · o único campo do cartão. Ele é opcional e já vem
          preenchido — quem não quiser escolher segue sem tocar em nada. */}
      <div className="mt-4">
        <Input
          id="ponte-nome-profissional"
          label="Nome da sua produtora"
          hint="É como o seu trabalho aparece na plataforma, e vira o endereço da sua produtora. Depois do código Leela, ele não muda."
          value={nomeProfissional}
          maxLength={80}
          autoComplete="organization"
          onChange={(e) => {
            setNomeProfissional(e.target.value);
            if (fase === 'recusada' && recusa === 'nome_profissional_invalido') {
              setFase('convite');
            }
          }}
          data-slot="ponte-nome-profissional"
        />
      </div>

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

      {/* Os dois botões, um por intenção. Enquanto um deles corre, os DOIS
          ficam desabilitados: a promoção é a mesma dos dois lados, e deixar o
          segundo clicável convidaria a pessoa a carimbar duas intenções para
          uma travessia só — o que estragaria justamente a medição que eles
          existem para produzir. A trava de duplo clique (`emVoo`) continua
          sendo a defesa de verdade; isto é o que ela parece na tela. */}
      <div className="mt-3 flex flex-wrap gap-3">
        {CTAS.map((cta) => (
          <Button
            key={cta.intencao}
            type="button"
            onClick={() => void conhecer(cta.intencao)}
            disabled={!aceito || fase === 'promovendo'}
            data-slot={cta.slot}
            data-intencao={cta.intencao}
          >
            {/* Só o botão APERTADO fica "Abrindo…". Trocar o rótulo dos dois
                apagaria da tela a escolha que a pessoa acabou de fazer. */}
            {fase === 'promovendo' && emVooDe === cta.intencao ? 'Abrindo…' : cta.rotulo}
          </Button>
        ))}
      </div>
    </section>
  );
}

/**
 * O nome da pessoa, como o TOKEN o traz (PONTE-NOME-1).
 *
 * É a mesma fonte que o servidor grava em `profissionais.nome` e que o resgate
 * usaria como semente do slug — ler daqui é o que garante que o campo mostre o
 * default REAL, e não um segundo palpite da tela. Sem `name` no token, o campo
 * nasce vazio: inventar um nome a partir do e-mail seria repetir na tela o
 * degrau que este item existe para tirar do escuro.
 */
function nomeDoToken(claims: Record<string, unknown> | null): string {
  const nome = claims?.['name'];
  return typeof nome === 'string' ? nome.trim() : '';
}

export function PortasDaConta(): React.JSX.Element | null {
  const [porta, setPorta] = useState<PortaDaConta>(null);
  const [nomeDaPessoa, setNomeDaPessoa] = useState('');

  useEffect(() => {
    let vivo = true;
    void getClaims()
      .then((claims) => {
        if (!vivo) return;
        setNomeDaPessoa(nomeDoToken(claims));
        setPorta(portaDaConta(claims));
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
  return <PortaDeQuemAindaNaoE nomeDaPessoa={nomeDaPessoa} />;
}
