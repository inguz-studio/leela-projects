// =============================================================================
// EntrarPage (`/entrar`) — login por e-mail + senha (LEELA-S020-T1).
//
// Reusa `loginComEmail` (@leela/api-client, S000-2-T2) — não recria SDK. Erros
// HONESTOS e sem enumeração: qualquer falha de credencial vira a MESMA
// mensagem (`mensagemErroLogin`). Redirect pós-login fecha o ciclo do E07:
// `RequirePapel` manda o anônimo pra cá com `state.from`; ao autenticar,
// voltamos exatamente à rota de origem (fallback `/`).
//
// SEGURANÇA: a senha vive só no estado controlado do input enquanto a tela
// existe; nunca é logada nem persistida. Google/Apple ficam para um 2º passo
// (helpers já existem no api-client; provedores dependem de config de produção).
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Input } from '@leela/design-system';
import { loginComEmail } from '@leela/api-client';
import { AuthCard } from './AuthCard';
import { AuthAlert } from './AuthAlert';
import { mensagemErroLogin } from './_lib/authErrors';
import { emailValido } from './_lib/authValidation';

interface EntrarLocationState {
  from?: string;
}

const LINK_CLASSE =
  'font-[var(--font-weight-medium)] text-[var(--action-brand-tint-fg)] hover:underline';

export function EntrarPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as EntrarLocationState | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeEntrar = emailValido(email) && senha.length > 0 && !enviando;

  async function entrar(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeEntrar) return;
    setErro(null);
    setEnviando(true);
    try {
      await loginComEmail(email.trim(), senha);
      // replace: a tela de login não fica no histórico após autenticar.
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(mensagemErroLogin(err));
      setEnviando(false);
    }
  }

  return (
    <AuthCard
      title="Entrar"
      description="Acesse o painel do organizador."
      footer={
        <>
          <Link to="/recuperar-senha" className={LINK_CLASSE}>
            Esqueci minha senha
          </Link>
          <span>
            Ainda não tem conta?{' '}
            <Link to="/cadastrar" className={LINK_CLASSE}>
              Criar conta
            </Link>
          </span>
        </>
      }
    >
      <form className="flex flex-col gap-[var(--spacing-4)]" onSubmit={(e) => void entrar(e)} noValidate>
        {erro ? <AuthAlert message={erro} /> : null}
        <Input
          id="entrar-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="entrar-senha"
          label="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!podeEntrar} className="w-full">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthCard>
  );
}

EntrarPage.displayName = 'EntrarPage';
