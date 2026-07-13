// =============================================================================
// RedefinirSenhaPage (`/redefinir-senha`) — efetiva a nova senha a partir do
// link do e-mail (LEELA-S020-T2).
//
// O link do Firebase traz `?mode=resetPassword&oobCode=<código>`. Ao montar,
// validamos o oobCode (verificarCodigoResetSenha) e, se válido, mostramos o
// e-mail-alvo e o formulário de nova senha; se inválido/expirado, um estado
// honesto que reconduz à solicitação. Efetivação por confirmarResetSenha.
//
// PRODUÇÃO: para o link cair NESTA rota (e não na página hospedada do Firebase),
// configure o "Action URL" do template de e-mail no Firebase Console.
// =============================================================================

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '@leela/design-system';
import { confirmarResetSenha, verificarCodigoResetSenha } from '@leela/api-client';
import { AuthCard } from './AuthCard';
import { AuthAlert } from './AuthAlert';
import { mensagemErroRedefinicao } from './_lib/authErrors';
import { SENHA_MIN, senhaAtendeMinimo } from './_lib/authValidation';

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
  const podeSalvar = senhaAtendeMinimo(senha) && senhasBatem && !salvando;

  // exactOptionalPropertyTypes: só passar `errorMessage` quando há mensagem.
  const senhaErro =
    senha.length > 0 && !senhaAtendeMinimo(senha) ? `Use pelo menos ${SENHA_MIN} caracteres.` : undefined;
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
        <Input
          id="redefinir-senha"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          {...(senhaErro ? { errorMessage: senhaErro } : {})}
        />
        <Input
          id="redefinir-confirmar"
          label="Confirmar nova senha"
          type="password"
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
