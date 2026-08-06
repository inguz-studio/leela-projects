// =============================================================================
// RedefinirSenhaPage (`/redefinir-senha`) — efetiva a nova senha a partir do
// link do e-mail (LEELA-S020-T2).
//
// O link do Firebase traz `?mode=resetPassword&oobCode=<código>`. Ao montar,
// validamos o oobCode (verificarCodigoResetSenha) e, se válido, mostramos o
// e-mail-alvo e o formulário de nova senha; se inválido/expirado, um estado
// honesto que reconduz à solicitação. Efetivação por confirmarResetSenha.
//
// PRODUÇÃO (resolvido na lane IDENTIDADE-EMAIL): o link cai NESTA rota sem
// depender de configuração de Console. A callable `solicitarRedefinicaoSenha`
// gera o link oficial no servidor e o reescreve para cá
// (`functions/src/auth/linkDeAcao.ts`), levando o `oobCode` junto. O `oobCode`
// é a credencial e vale vindo de qualquer origem — é por isso que esta tela
// funciona com ele sem nenhuma mudança.
// =============================================================================

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, InputSenha } from '@leela/design-system';
import { confirmarResetSenha, verificarCodigoResetSenha } from '@leela/api-client';
import { avaliarSenha, exigenciaDeSenha, senhaValida } from '@leela/core';
import { AuthCard } from './AuthCard';
import { AuthAlert } from './AuthAlert';
import { mensagemErroRedefinicao } from './_lib/authErrors';

const LINK_CLASSE =
  'font-[var(--font-weight-medium)] text-[var(--action-brand-tint-fg)] hover:underline';

type EstadoCodigo =
  | { fase: 'verificando' }
  | { fase: 'valido'; email: string }
  | { fase: 'invalido'; mensagem: string };

export function RedefinirSenhaPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode') ?? '';

  const [codigo, setCodigo] = useState<EstadoCodigo>({ fase: 'verificando' });
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    if (oobCode.length === 0) {
      setCodigo({ fase: 'invalido', mensagem: 'Link inválido. Solicite uma nova redefinição de senha.' });
      return undefined;
    }
    void (async () => {
      try {
        const email = await verificarCodigoResetSenha(oobCode);
        if (vivo) setCodigo({ fase: 'valido', email });
      } catch (err) {
        if (vivo) setCodigo({ fase: 'invalido', mensagem: mensagemErroRedefinicao(err) });
      }
    })();
    return () => {
      vivo = false;
    };
  }, [oobCode]);

  const senhasBatem = senha.length > 0 && senha === confirmar;
  // A senha nasce nesta tela: quem libera o envio é a política do core, a
  // mesma que a Function aplica. A avaliação sai de uma chamada só e serve ao
  // gate e ao medidor.
  const avaliacaoDaSenha = avaliarSenha(senha);
  const podeSalvar = senhaValida(senha) && senhasBatem && !salvando;

  // exactOptionalPropertyTypes: só passar `errorMessage` quando há mensagem.
  const confirmarErro = confirmar.length > 0 && !senhasBatem ? 'As senhas não conferem.' : undefined;

  async function redefinir(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeSalvar) return;
    setErro(null);
    setSalvando(true);
    try {
      await confirmarResetSenha(oobCode, senha);
      setPronto(true);
    } catch (err) {
      setErro(mensagemErroRedefinicao(err));
      setSalvando(false);
    }
  }

  if (codigo.fase === 'verificando') {
    return (
      <AuthCard title="Redefinir senha">
        <p role="status" className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Validando o link…
        </p>
      </AuthCard>
    );
  }

  if (codigo.fase === 'invalido') {
    return (
      <AuthCard
        title="Link inválido"
        footer={
          <Link to="/recuperar-senha" className={LINK_CLASSE}>
            Solicitar nova redefinição
          </Link>
        }
      >
        <AuthAlert message={codigo.mensagem} />
      </AuthCard>
    );
  }

  if (pronto) {
    return (
      <AuthCard
        title="Senha redefinida"
        footer={
          <button type="button" onClick={() => navigate('/entrar', { replace: true })} className={LINK_CLASSE}>
            Ir para o login
          </button>
        }
      >
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Sua senha foi atualizada. Use a nova senha para entrar.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Criar nova senha" description={`Redefinindo o acesso de ${codigo.email}.`}>
      <form className="flex flex-col gap-[var(--spacing-4)]" onSubmit={(e) => void redefinir(e)} noValidate>
        {erro ? <AuthAlert message={erro} /> : null}
        {/* Senha NOVA: medidor ligado e a exigência escrita embaixo, vinda de
            `exigenciaDeSenha()`. Aqui a dica pesa ainda mais que no cadastro —
            quem chega por este link está trocando uma senha que já usava, e
            precisa ler a regra nova antes de tentar repetir a antiga. */}
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <InputSenha
            id="redefinir-senha"
            label="Nova senha"
            autoComplete="new-password"
            autoFocus
            aria-describedby="redefinir-senha-dica"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            avaliacao={avaliacaoDaSenha}
          />
          <span
            id="redefinir-senha-dica"
            className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
          >
            {exigenciaDeSenha()}
          </span>
        </div>
        {/* Confirmação SEM medidor: mede a mesma string do campo de cima. */}
        <InputSenha
          id="redefinir-confirmar"
          label="Confirmar nova senha"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          {...(confirmarErro ? { errorMessage: confirmarErro } : {})}
        />
        <Button type="submit" variant="primary" disabled={!podeSalvar} className="w-full">
          {salvando ? 'Salvando…' : 'Redefinir senha'}
        </Button>
      </form>
    </AuthCard>
  );
}

RedefinirSenhaPage.displayName = 'RedefinirSenhaPage';
