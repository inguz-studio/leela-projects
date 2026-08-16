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
//
// -----------------------------------------------------------------------------
// O QUE A REVIEW ANTAGONISTA DERRUBOU AQUI (PONTE-FIX · B2 · R1 · R3)
// -----------------------------------------------------------------------------
// Três coisas, e a primeira era bloqueadora.
//
// B2 — "quem não tocar cai no comportamento de antes" era FALSO para uma
// classe de nomes. O pré-preenchimento mandava o nome do token ao servidor sem
// a pessoa tocar em nada, e o servidor recusa nome que não deriva endereço.
// `Анна`, `李` e `ゆき` são contas válidas cujo nome vira endereço vazio, então
// elas viam o próprio nome no campo, não mexiam nele, clicavam e levavam uma
// recusa por um nome que nunca digitaram. A regra do conserto já existia nesta
// tela, escrita para o token sem `name`; ela só passou a valer também quando o
// `name` existe e não serve (`nomeInicialDaProdutora`).
//
// R1 — o retorno da callable era DESCARTADO (`await promoverParaProfissional(…)`
// sem atribuição). O `jaExistia` que o servidor manda de propósito nunca era
// lido, e nos dois ramos idempotentes o nome digitado era jogado fora sem uma
// palavra. Agora o retorno é lido e o eco novo do servidor (`nomeAplicado`) vira
// frase na tela de sucesso.
//
// R3 — a recusa do campo saía num `<p role="alert">` solto no fim do cartão, e
// o `Input` nunca ficava `aria-invalid`. Quem usa leitor de tela ouvia um alerta
// sem saber qual campo recusou. A frase passou para o `errorMessage` do DS, que
// já faz a associação sozinho.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getClaims,
  motivoDaRecusaDaPromocao,
  promoverParaProfissional,
  type IntencaoDaTravessia,
  type MotivoRecusaPromocao,
} from '@leela/api-client';
// A MESMA função que o servidor usa para derivar o endereço, importada e não
// recopiada (PONTE-FIX · B2). Uma segunda cópia da régua aqui é exatamente o
// que o PONTE-ELEGIVEL-1 existe para impedir, agora em validação de nome.
import { derivarSlugOrganizacao } from '@leela/core';
import { Button, CheckboxField, Input } from '@/app/_ds/ds';
import { ensureLeela } from '@/lib/leelaClient';
import { Card, buttonVariants } from '@leela/design-system/server';
import { painelUrl } from '@/lib/painel';
import { portaDaConta, type PortaDaConta } from '@/lib/portaOrganizador';
import { cn } from '@/lib/utils';

// Onda 1 do cânone: a moldura é o `Card` do DS; a constante guarda só o
// espaçamento próprio destes cartões.
const CARTAO = 'p-4 sm:p-5';
const TITULO = 'text-base font-semibold text-text-primary';
const APOIO = 'mt-1 text-sm text-text-secondary';
// Onda 1 do cânone: receita do DS (`buttonVariants`) + a pílula de marketing
// da landing, que o ADR-017 ratificou como forma da superfície pública.
const LINK = cn(
  buttonVariants({ variant: 'secondary', size: 'sm' }),
  'mt-3 w-fit rounded-ds-pill',
);
const ERRO =
  'mt-3 rounded-ds-lg border border-border-default bg-surface-base p-3 text-sm font-medium text-feedback-danger-fg';

/** A frase do segundo login. Uma só, para os dois cartões (PCLIENTE-3). */
const AVISO_SEGUNDO_LOGIN = 'O painel vai pedir sua senha de novo — é a mesma conta e o mesmo e-mail.';

/**
 * O nome do LUGAR — a palavra do dono, agora no título e não no botão
 * (PONTE-CTA-1). Os botões nomeiam os dois trabalhos.
 *
 * S1255-T4 (rodada 2026-08-12-copy-landing · achado M2) · o mesmo objeto
 * aparecia capitalizado uma vez e minúsculo em outras seis, dentro do MESMO
 * cartão. Ou é nome próprio, e é sempre `Painel Profissional`; ou é descrição,
 * e é sempre minúsculo. É nome próprio — foi assim que a decisão do dono o
 * estabeleceu —, então esta constante passa a ser a fonte única das ocorrências
 * visíveis, em vez de sete literais que divergem sozinhas na próxima edição.
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
  sessao_anonima: `Entre com o e-mail da sua conta para conhecer o ${NOME_DO_LUGAR}.`,
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
  //
  // ⛔ A FRASE ANTERIOR MENTIA (PONTE-FIX · B2). "Pelo menos duas letras ou
  // números" é falso para quem escreve fora do alfabeto latino: `Анна` tem
  // quatro letras, `ゆき` tem duas, e as duas viram endereço vazio porque
  // `derivarSlugOrganizacao` só preserva `[a-z0-9]` depois do NFD. Uma pessoa
  // lendo a frase antiga contava as próprias letras, via que a régua estava
  // cumprida e não tinha o que fazer. A régua real tem dois eixos e os dois
  // precisam estar na frase.
  nome_profissional_invalido:
    'Escolha um nome com dois caracteres ou mais e pelo menos uma letra de A a Z ou um número. O endereço da sua produtora é escrito só com esses caracteres.',
  indisponivel: `Não conseguimos abrir o ${NOME_DO_LUGAR} agora. Tente de novo em instantes.`,
};

type FasePromocao = 'convite' | 'promovendo' | 'pronta' | 'recusada';

/**
 * O valor com que o campo NASCE (PONTE-FIX · B2).
 *
 * O pré-preenchimento tinha um buraco medido pela review antagonista: ele
 * mandava o nome do token ao servidor SEM A PESSOA TOCAR EM NADA, e o servidor
 * recusa nome que não deriva endereço. Uma participante chamada `Анна`, `李` ou
 * `ゆき` tem conta válida, via o próprio nome no campo, não mexia nele, clicava
 * e levava a sétima recusa por um nome que nunca digitou. O registro do maestro
 * promete o contrário, em letras: *"quem não tocar nele cai exatamente no
 * comportamento de antes"*.
 *
 * A regra que conserta já existia na própria lane, escrita para o token sem
 * `name`: se o default não serve, o campo nasce vazio, e a pessoa decide. Aqui
 * ela só passa a valer também quando o `name` EXISTE e não vira endereço — que
 * é o mesmo fato, por outro caminho.
 *
 * ⚠️ Isto NÃO afrouxa a régua de quem digita. Quem apagar o campo e escrever
 * `李` continua ouvindo a recusa, e tem de ouvir: o endereço é cunhado uma vez,
 * e descartar em silêncio um nome digitado é o defeito que o item inteiro
 * existe para matar.
 */
function nomeInicialDaProdutora(nomeDaPessoa: string): string {
  return derivarSlugOrganizacao(nomeDaPessoa).length > 0 ? nomeDaPessoa : '';
}

/**
 * Fluxo A — a conta já alcança os dois lados (RN-513). Nada de servidor aqui:
 * o que muda é o rótulo e a expectativa.
 */
function PortaDeQuemJaEProfissional(): React.JSX.Element {
  return (
    <Card className={CARTAO} data-slot="porta-organizador">
      <h2 className={TITULO}>Você também organiza</h2>
      <p className={APOIO}>
        Suas experiências, inscrições e repasses ficam no {NOME_DO_LUGAR}. {AVISO_SEGUNDO_LOGIN}
      </p>
      <a className={LINK} href={painelUrl('/entrar')} data-slot="ir-para-painel">
        Ir para o {NOME_DO_LUGAR}
      </a>
    </Card>
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
  // mostra o default que já existia e devolve a caneta para a dona. E quando o
  // default não vira endereço, ele nasce vazio (PONTE-FIX · B2) — ver
  // `nomeInicialDaProdutora`.
  const [nomeProfissional, setNomeProfissional] = useState(() =>
    nomeInicialDaProdutora(nomeDaPessoa)
  );
  const [fase, setFase] = useState<FasePromocao>('convite');
  const [recusa, setRecusa] = useState<MotivoRecusaPromocao>('indisponivel');
  /**
   * O servidor aceitou a travessia e NÃO aplicou o nome (PONTE-FIX · R1).
   *
   * Acontece nos dois ramos idempotentes — conta que já tem tenant e doc de
   * profissional pré-existente. Antes deste conserto a tela DESCARTAVA o
   * retorno da callable (`await promoverParaProfissional({…})` sem atribuição),
   * então o `jaExistia` que o servidor manda de propósito nunca era lido e a
   * pessoa via "Pronto. O Painel Profissional já é seu" como quem escolheu o
   * nome. O nome dela tinha sido jogado fora sem uma palavra.
   */
  const [nomeNaoAplicado, setNomeNaoAplicado] = useState(false);
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
        const nomeEnviado = nomeProfissional.trim();
        // O RETORNO NÃO É MAIS DESCARTADO (PONTE-FIX · R1). Ele carrega o eco
        // que o servidor passou a mandar: `nomeAplicado: false` com nome
        // declarado é o descarte idempotente, e a tela tem de dizer isso.
        // `=== false` e não `!resultado.nomeAplicado`: contra um servidor
        // anterior ao eco o campo chega `undefined`, e inferir descarte a
        // partir de ausência de informação seria inventar um fato.
        const resultado = await promoverParaProfissional({
          intencao,
          nomeProfissional: nomeEnviado,
        });
        if (vivo.current) {
          setNomeNaoAplicado(nomeEnviado.length > 0 && resultado.nomeAplicado === false);
          setFase('pronta');
        }
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
      <Card className={CARTAO} data-slot="porta-conhecer-painel">
        <h2 className={TITULO}>Pronto. O {NOME_DO_LUGAR} já é seu</h2>
        {/* A confirmação é curta e a travessia vem junto: a pessoa acabou de
            pedir para conhecer, e mandá-la procurar o caminho seria devolver
            a ela o trabalho que este cartão existe para tirar.

            As duas áreas são NOMEADAS aqui de propósito. A pessoa vai cair na
            vitrine, e a vitrine acompanha o menu: dizer "Eventos e Clubs" é
            dizer onde ela vai encontrar o que veio buscar, e no mesmo fôlego
            dizer que o código é o que abre as duas. */}
        {/* PONTE-FIX · R1 · o descarte deixou de ser silencioso.
            A pessoa digitou um nome e o servidor não o aplicou porque a
            produtora dela já existia. Calar aqui era o mesmo defeito que o
            PONTE-NOME-1 existe para matar, só que num ramo menor: ela iria
            embora achando que tinha escolhido o endereço. A frase diz o que
            aconteceu e para onde ir, porque renomear produtora é operação de
            administração da plataforma e não tem botão nesta tela. */}
        {nomeNaoAplicado ? (
          <p className={ERRO} role="status" data-slot="ponte-nome-nao-aplicado">
            O nome que você digitou não entrou: a sua produtora já tinha um, e ele não muda por
            aqui. Para trocar, fale com o time Leela.
          </p>
        ) : null}
        <p className={APOIO} role="status">
          Entre com esta mesma conta para conhecer as áreas por dentro — Eventos e Clubs estão lá.
          Para trabalhar com os seus dados, o time Leela libera seu código. {AVISO_SEGUNDO_LOGIN}
        </p>
        <a className={LINK} href={painelUrl('/entrar')} data-slot="ir-para-painel-vitrine">
          Ir para o {NOME_DO_LUGAR}
        </a>
      </Card>
    );
  }

  return (
    <Card className={CARTAO} data-slot="porta-conhecer-painel">
      {/* O título nomeia o LUGAR com a palavra do dono; os dois botões nomeiam
          os dois TRABALHOS e carimbam intenções diferentes (PONTE-CTA-1). */}
      <h2 className={TITULO}>{NOME_DO_LUGAR}</h2>
      <p className={APOIO}>
        O {NOME_DO_LUGAR} é onde você publica experiências, vende inscrições, acompanha
        repasses e toca os seus clubs. Você pode entrar e circular agora, com esta mesma conta.
        Para trabalhar com os seus dados, o time Leela libera seu código.
      </p>
      <p className={APOIO}>{AVISO_SEGUNDO_LOGIN}</p>

      {/* PONTE-NOME-1 · o único campo do cartão. Ele é opcional e já vem
          preenchido — quem não quiser escolher segue sem tocar em nada.

          PONTE-FIX · R3 · a recusa DO CAMPO viaja no campo. Ela saía num
          `<p role="alert">` solto no fim do cartão, depois do checkbox: o
          `Input` nunca ficava `aria-invalid`, o erro não era associado a ele e
          quem usa leitor de tela ouvia um alerta sem saber QUAL campo recusou.
          O DS já faz `aria-invalid` e `aria-describedby` sozinho a partir de
          `errorMessage` — a tela só não estava usando. E a frase sai de UM
          lugar só: repeti-la no rodapé faria o leitor de tela anunciar duas
          vezes o mesmo erro. */}
      <div className="mt-4">
        <Input
          id="ponte-nome-profissional"
          label="Nome da sua produtora"
          hint="É como o seu trabalho aparece na plataforma, e vira o endereço da sua produtora. Depois do código Leela, ele não muda."
          {...(fase === 'recusada' && recusa === 'nome_profissional_invalido'
            ? { errorMessage: FRASE_DA_RECUSA[recusa] }
            : {})}
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

      <CheckboxField
        className="mt-4"
        id="ponte-termo-profissional"
        checked={aceito}
        onChange={(e) => {
          setAceito(e.target.checked);
          if (e.target.checked && fase === 'recusada' && recusa === 'aceite_ausente') {
            setFase('convite');
          }
        }}
        label="Li e aceito o termo do profissional"
      />

      {/* As demais recusas continuam aqui: elas falam da CONTA (sessão, papel,
          aceite, indisponibilidade) e não de um campo, então não têm campo a
          que se associar. A do nome saiu deste bloco de propósito — ela ganhou
          endereço no `Input` acima (PONTE-FIX · R3). */}
      {fase === 'recusada' && recusa !== 'nome_profissional_invalido' ? (
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
    </Card>
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
