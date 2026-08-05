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
// OS QUATRO ESTADOS, e por que cada um existe
//  - `verificando` — o código é validado antes de pedir senha. Pedir senha
//    primeiro e recusar depois faria a pessoa digitar duas vezes para nada.
//  - `pronto` — formulário. Ao salvar, confirma E autentica: sem segundo login,
//    que é o aceite falsificável da RN-453 (remover o login faz o caminho feliz
//    terminar em tela de entrar, exatamente o que o dono chamou de errado).
//  - `usado` — o link JÁ foi usado neste navegador. Estado próprio que oferece
//    ENTRAR, não redefinir. Mandar quem já resolveu de volta para "link
//    inválido" é tecnicamente certo e humanamente errado.
//  - `invalido` — inválido ou expirado, com REENVIO na própria tela. Nunca
//    "peça ajuda".
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

import { useEffect, useState, type FormEvent } from 'react';
import {
  confirmarResetSenha,
  emailValido,
  enviarResetSenha,
  loginComEmail,
  mensagemErroRedefinicao,
  senhaAtendeMinimo,
  SENHA_MIN,
  verificarCodigoResetSenha,
} from '@leela/api-client';
import { Button, Input } from '@/app/_ds/ds';
import { ensureLeela } from '@/lib/leelaClient';
import { destinoPosEntrada } from '@/lib/areaDoCliente';

type Fase = 'verificando' | 'pronto' | 'usado' | 'invalido' | 'concluido';

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

  useEffect(() => {
    let vivo = true;
    if (oobCode.length === 0) {
      setFase('invalido');
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
    if (!senhaAtendeMinimo(senha) || salvando) return;
    setErro(null);
    setSalvando(true);
    try {
      await confirmarResetSenha(oobCode, senha);
      // A marca vai ANTES do login: se o login falhar por rede, o código já
      // foi consumido de verdade e voltar para "link inválido" seria mentira.
      gravarMarca(oobCode);
      await loginComEmail(email, senha);
      setSenha('');
      setSalvando(false);
      setFase('concluido');
    } catch (err) {
      setSenha('');
      setSalvando(false);
      setErro(mensagemErroRedefinicao(err));
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
          definiu, pelo botão “Entrar” no topo da página.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-ds-pill border border-border-default px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Ir para a página inicial
        </a>
      </section>
    );
  }

  if (fase === 'invalido') {
    return <ReenviarLink />;
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
          <Input
            id="definir-senha-campo"
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-describedby="definir-senha-regra"
          />
          <p id="definir-senha-regra" className="mt-1 text-sm text-text-secondary">
            Pelo menos {SENHA_MIN} caracteres.
          </p>
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={!senhaAtendeMinimo(senha) || salvando}
          className="w-full"
        >
          {salvando ? 'Salvando…' : 'Salvar e entrar'}
        </Button>
      </form>
    </section>
  );
}

/**
 * O estado honesto do link que não presta, com saída própria. A confirmação é
 * NEUTRA por contrato: mesma frase exista ou não a conta.
 */
function ReenviarLink(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  async function reenviar(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!emailValido(email) || enviando) return;
    setEnviando(true);
    ensureLeela();
    try {
      await enviarResetSenha(email.trim());
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
        Este link não vale mais
      </h1>
      <p className="mt-3 text-text-secondary">
        Links de acesso valem por pouco tempo e só podem ser usados uma vez. Informe seu e-mail
        que a gente manda outro.
      </p>
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
