'use client';
// =============================================================================
// DefinirSenhaFlow — o primeiro acesso do comprador, na tela da Leela
// (S1223-T1 · RN-453).
//
// A frase do dono, verbatim: "ela precisa definir a senha neste acesso, ok?
// Enviamos o link, ela entra define a senha e entra no sistema." O "entra no
// sistema" é a parte que não existia: hoje o link cai no handler hospedado do
// Firebase e a pessoa define a senha sem entrar em lugar nenhum.
//
// SEAMS REUSADOS, nenhum inventado — os três que o `@leela/api-client` já
// exporta e o painel já consome: `verificarCodigoResetSenha`,
// `confirmarResetSenha` e o login (`loginComEmail`).
//
// OS CINCO ESTADOS, e por que cada um existe
//  - `verificando` — o código é validado antes de pedir senha. Pedir senha
//    primeiro e recusar depois faria a pessoa digitar duas vezes para nada.
//  - `pronto` — formulário. Ao salvar, confirma E autentica: sem segundo login,
//    que é o aceite falsificável da RN-453 (remover o login faz o caminho feliz
//    terminar em tela de entrar, exatamente o que o dono chamou de errado).
//  - `usado` — o link JÁ foi usado neste navegador. Estado próprio que oferece
//    ENTRAR, não redefinir. Mandar quem já resolveu de volta para "link
//    inválido" é tecnicamente certo e humanamente errado. É também onde
//    aterrissa quem gravou a senha mas não conseguiu entrar (ver `salvar`).
//  - `invalido` — inválido ou expirado, com REENVIO na própria tela. Nunca
//    "peça ajuda".
//  - `sem_codigo` — a rota SEM `oobCode` na query (REV-AREACLIENTE). É a porta
//    de quem nunca teve link e veio pedir um, pelo "Não sei minha senha" do
//    overlay. Mesmo formulário do `invalido`, moldura honesta: quem nunca teve
//    link não teve link expirado.
//
// COMO SE SABE QUE O LINK JÁ FOI USADO. O Firebase não distingue "consumido" de
// "malformado": os dois voltam `auth/invalid-action-code`. Então o sinal é
// local — ao confirmar com sucesso, gravamos uma MARCA do código neste
// navegador. A marca é um digest FNV-1a, nunca o código: o `oobCode` é
// credencial e não fica em `localStorage` depois de gasto. Fora deste
// navegador o caso degrada para `invalido`, que também tem saída (o reenvio) —
// é degradação honesta, não silenciosa.
//
// ANTI-ENUMERAÇÃO. O reenvio confirma sempre a MESMA frase, exista ou não a
// conta, e `auth/user-not-found` é engolido — a disciplina que a
// `RecuperarSenhaPage` do painel já pratica. A tela não é oráculo de quem
// comprou.
// =============================================================================

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  confirmarResetSenha,
  emailValido,
  enviarResetSenha,
  loginComEmail,
  mensagemErroRedefinicao,
  verificarCodigoResetSenha,
} from '@leela/api-client';
// FRONTEIRA-AUTH · a régua da senha vem do core, não do api-client. O
// `senhaAtendeMinimo`/`SENHA_MIN` que estavam aqui só mediam COMPRIMENTO e
// eram uma segunda autoridade sobre a mesma regra — a política única
// (comprimento + número + caractere especial) mora em `politicaDeSenha`, é a
// mesma que as Functions chamam, e é ela que decide se o botão libera.
import { avaliarSenha, exigenciaDeSenha } from '@leela/core';
import { Button, Input, InputSenha } from '@/app/_ds/ds';
import { EntrarOverlay } from '@/app/components/EntrarOverlay';
import { ensureLeela } from '@/lib/leelaClient';
import { destinoPosEntrada } from '@/lib/areaDoCliente';

type Fase = 'verificando' | 'pronto' | 'usado' | 'invalido' | 'sem_codigo' | 'concluido';

const CHAVE_MARCA = 'leela:definir-senha:usados';

/**
 * Digest FNV-1a de 32 bits em hex. Não é criptografia e não precisa ser: o
 * objetivo é não guardar o `oobCode` em claro depois de gasto, e uma colisão
 * aqui só faria a tela oferecer "entrar" no lugar de "reenviar" — as duas
 * saídas são válidas e nenhuma concede acesso.
 */
function marcaDoCodigo(codigo: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < codigo.length; i += 1) {
    h ^= codigo.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function lerMarcas(): string[] {
  try {
    const cru = window.localStorage.getItem(CHAVE_MARCA);
    const lista: unknown = cru === null ? [] : JSON.parse(cru);
    return Array.isArray(lista) ? lista.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // `localStorage` bloqueado (modo restrito, terceiro) não pode derrubar a
    // jornada: sem marca, o caminho feliz continua inteiro.
    return [];
  }
}

function gravarMarca(codigo: string): void {
  try {
    const marcas = lerMarcas();
    const nova = marcaDoCodigo(codigo);
    if (marcas.includes(nova)) return;
    // Teto pequeno: a lista é conveniência local, não histórico.
    window.localStorage.setItem(CHAVE_MARCA, JSON.stringify([...marcas, nova].slice(-10)));
  } catch {
    /* ver acima */
  }
}

const CONFIRMACAO_NEUTRA =
  'Se houver uma conta com esse e-mail, o link de acesso chega em instantes. Confira também a caixa de spam.';

export interface DefinirSenhaFlowProps {
  oobCode: string;
}

export function DefinirSenhaFlow({ oobCode }: DefinirSenhaFlowProps): React.JSX.Element {
  const [fase, setFase] = useState<Fase>('verificando');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Entrada da fase `usado` — o mesmo overlay do header, aberto daqui.
  const [entrarAberto, setEntrarAberto] = useState(false);
  const botaoEntrar = useRef<HTMLButtonElement>(null);

  // UMA avaliação por render, consumida pelos TRÊS lugares que precisam dela:
  // o medidor, a trava do botão e a guarda do submit. Chamar `senhaValida()`
  // por conta própria no handler abriria a porta para o botão liberar por uma
  // régua e o envio recusar por outra.
  const avaliacao = avaliarSenha(senha);

  useEffect(() => {
    let vivo = true;
    if (oobCode.length === 0) {
      // REV-AREACLIENTE · chegar AQUI sem código não é "seu link expirou": é
      // alguém que veio pedir um link, pelo "Não sei minha senha" do overlay.
      // Dizer "este link não vale mais" a quem nunca teve link inventa um
      // fracasso que não aconteceu — e é a primeira tela de quem ficou sem
      // e-mail em 04/08. O formulário é o mesmo; a moldura é honesta.
      setFase('sem_codigo');
      return () => {
        vivo = false;
      };
    }
    ensureLeela();
    if (lerMarcas().includes(marcaDoCodigo(oobCode))) {
      setFase('usado');
      return () => {
        vivo = false;
      };
    }
    void (async () => {
      try {
        const alvo = await verificarCodigoResetSenha(oobCode);
        if (!vivo) return;
        setEmail(alvo);
        setFase('pronto');
      } catch {
        if (!vivo) return;
        // Expirado e inválido colapsam de propósito: a saída é a mesma
        // (reenvio) e distinguir os dois não muda uma ação da pessoa.
        setFase('invalido');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [oobCode]);

  async function salvar(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!avaliacao.atende || salvando) return;
    setErro(null);
    setSalvando(true);
    try {
      await confirmarResetSenha(oobCode, senha);
      // A marca vai ANTES do login: se o login falhar por rede, o código já
      // foi consumido de verdade e voltar para "link inválido" seria mentira.
      gravarMarca(oobCode);
    } catch (err) {
      setSenha('');
      setSalvando(false);
      setErro(mensagemErroRedefinicao(err));
      return;
    }

    // REV-AREACLIENTE · daqui para baixo A SENHA JÁ ESTÁ GRAVADA e o `oobCode`
    // JÁ FOI QUEIMADO. Um `catch` único cobrindo as duas chamadas deixava a
    // pessoa no MESMO formulário com uma mensagem de erro, e o botão "Salvar e
    // entrar" a levava a `auth/invalid-action-code` — "este link expirou" sobre
    // uma senha que existe. Beco, e da pior espécie: o certo a fazer (entrar) é
    // exatamente o que a tela não oferecia. A marca sozinha só resolvia isso
    // depois de um recarregamento que ninguém tem motivo para fazer.
    try {
      await loginComEmail(email, senha);
      setSenha('');
      setSalvando(false);
      setFase('concluido');
    } catch {
      setSenha('');
      setSalvando(false);
      setErro(null);
      setFase('usado');
    }
  }

  if (fase === 'verificando') {
    return (
      <p role="status" className="text-text-secondary">
        Conferindo seu link…
      </p>
    );
  }

  if (fase === 'concluido') {
    const destino = destinoPosEntrada();
    return (
      <section aria-labelledby="definir-senha-pronto">
        <h1
          id="definir-senha-pronto"
          className="font-display text-3xl font-extrabold tracking-tight text-text-primary"
        >
          Sua conta está pronta
        </h1>
        <p className="mt-3 text-text-secondary">
          Você já está dentro — não precisa entrar de novo. A partir daqui suas compras e seus
          ingressos ficam na sua conta.
        </p>
        <a
          href={destino.href}
          className="mt-6 inline-flex rounded-ds-pill border border-border-default px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          {destino.rotulo}
        </a>
      </section>
    );
  }

  if (fase === 'usado') {
    // UNIFICAÇÃO DO "ENTRAR" (BUILD-MOTION · ordem do dono de 04/08). Esta tela
    // dizia "é só entrar pelo botão Entrar no topo da página" e oferecia como
    // única ação um link para a HOME. Ou seja: mandava a pessoa embora e depois
    // pedia que ela caçasse um botão. A entrada agora acontece AQUI, no mesmo
    // overlay do header — quem já tem senha entra sem sair do lugar.
    //
    // O destino pós-entrada NÃO é decidido aqui: é o mesmo
    // `destinoPosEntrada()` que a fase `concluido` usa, que é o ponto único do
    // projeto. Uma segunda opinião sobre onde a pessoa aterrissa seria a
    // primeira coisa a divergir na próxima mudança da área do cliente.
    return (
      <section aria-labelledby="definir-senha-usado">
        <h1
          id="definir-senha-usado"
          className="font-display text-3xl font-extrabold tracking-tight text-text-primary"
        >
          Sua senha já foi definida
        </h1>
        <p className="mt-3 text-text-secondary">
          Este link já foi usado. Não precisa criar outra senha — é só entrar com a que você
          definiu.
        </p>
        <div className="mt-6">
          <Button
            ref={botaoEntrar}
            type="button"
            data-slot="abrir-entrar-definir-senha"
            onClick={() => setEntrarAberto(true)}
          >
            Entrar
          </Button>
        </div>
        <EntrarOverlay
          open={entrarAberto}
          onOpenChange={setEntrarAberto}
          returnFocusRef={botaoEntrar}
          description="Entre com a senha que você acabou de definir."
          aoEntrar={() => {
            window.location.assign(destinoPosEntrada().href);
          }}
        />
      </section>
    );
  }

  if (fase === 'invalido') {
    return (
      <ReenviarLink
        titulo="Este link não vale mais"
        descricao="Links de acesso valem por pouco tempo e só podem ser usados uma vez. Informe seu e-mail que a gente manda outro."
      />
    );
  }

  if (fase === 'sem_codigo') {
    return (
      <ReenviarLink
        titulo="Receba seu link de acesso"
        descricao="Se você já comprou alguma vez, sua conta existe — ela foi criada com o e-mail da compra. Informe esse e-mail que a gente manda um link para você definir a senha e entrar."
      />
    );
  }

  return (
    <section aria-labelledby="definir-senha-titulo">
      <h1
        id="definir-senha-titulo"
        className="font-display text-3xl font-extrabold tracking-tight text-text-primary"
      >
        Defina sua senha
      </h1>
      <p className="mt-3 text-text-secondary">
        Escolha uma senha para <strong className="text-text-primary">{email}</strong>. Ao salvar,
        você já entra na sua conta.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => void salvar(e)}
        noValidate
        aria-label="Definir senha"
      >
        {erro !== null ? (
          <p
            role="alert"
            className="rounded-ds-lg border border-border-default bg-surface-raised p-4 text-sm font-medium text-feedback-danger-fg"
          >
            {erro}
          </p>
        ) : null}
        <div>
          {/* Senha NOVA: medidor LIGADO. É a única situação em que medir força
              orienta alguém — a pessoa ainda está escolhendo, e o medidor é o
              que mostra que atender a regra é o piso, não o alvo. */}
          <InputSenha
            id="definir-senha-campo"
            label="Nova senha"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            avaliacao={avaliacao}
            aria-describedby="definir-senha-regra"
          />
          {/* A exigência vem da política, nunca escrita à mão: esta frase e a
              mensagem que a Function devolve têm de ser a MESMA, senão a tela
              e o servidor se contradizem no dia em que o piso mudar. */}
          <p id="definir-senha-regra" className="mt-1 text-sm text-text-secondary">
            {exigenciaDeSenha()}
          </p>
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={!avaliacao.atende || salvando}
          className="w-full"
        >
          {salvando ? 'Salvando…' : 'Salvar e entrar'}
        </Button>
      </form>
    </section>
  );
}

/**
 * O pedido de link, com saída própria. A confirmação é NEUTRA por contrato:
 * mesma frase exista ou não a conta.
 *
 * A MOLDURA É PARAMETRIZADA, o miolo não. Duas portas chegam aqui — o link que
 * não presta mais e a pessoa que nunca teve link nenhum (REV-AREACLIENTE) — e
 * elas precisam de frases diferentes. O formulário, a origem `comprador`, o
 * `catch` que engole e a frase neutra continuam sendo UM só: é ali que mora a
 * anti-enumeração, e duas cópias divergiriam na primeira revisão de copy.
 */
function ReenviarLink({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  async function reenviar(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!emailValido(email) || enviando) return;
    setEnviando(true);
    ensureLeela();
    try {
      // A ORIGEM é declarada (S1223-T2): quem pede daqui é comprador, e o
      // link novo tem de voltar para ESTA tela — não para o `/entrar` do
      // painel, onde a guarda de conta órfã o expulsaria.
      await enviarResetSenha(email.trim(), 'comprador');
    } catch {
      // Engolido de propósito: `auth/user-not-found` (e qualquer outra falha)
      // não pode virar sinal de existência. Falha de rede também não distingue.
    }
    setEnviando(false);
    setConfirmado(true);
  }

  return (
    <section aria-labelledby="definir-senha-invalido">
      <h1
        id="definir-senha-invalido"
        className="font-display text-3xl font-extrabold tracking-tight text-text-primary"
      >
        {titulo}
      </h1>
      <p className="mt-3 text-text-secondary">{descricao}</p>
      {confirmado ? (
        <p role="status" className="mt-6 text-text-secondary">
          {CONFIRMACAO_NEUTRA}
        </p>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(e) => void reenviar(e)}
          noValidate
          aria-label="Reenviar link de acesso"
        >
          <Input
            id="definir-senha-reenvio-email"
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!emailValido(email) || enviando}
            className="w-full"
          >
            {enviando ? 'Enviando…' : 'Enviar novo link'}
          </Button>
        </form>
      )}
    </section>
  );
}

DefinirSenhaFlow.displayName = 'DefinirSenhaFlow';
