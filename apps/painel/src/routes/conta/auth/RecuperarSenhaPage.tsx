// =============================================================================
// RecuperarSenhaPage (`/recuperar-senha`) — solicitação de redefinição de senha
// (LEELA-S020-T2).
//
// SEGURANÇA (anti-enumeração): a confirmação é NEUTRA — a MESMA mensagem, exista
// ou não a conta. `auth/user-not-found` é engolido e tratado como sucesso; só
// erros TÉCNICOS (rede/servidor, independentes da existência da conta) viram um
// aviso de "tente de novo", que também não distingue conta existente de
// inexistente. Nunca dizemos "esse e-mail não está cadastrado".
//
// A postura ganhou reforço do lado do servidor na lane IDENTIDADE-EMAIL: quem
// atende agora é a callable `solicitarRedefinicaoSenha`, que devolve sempre
// `{ ok: true }` e acolchoa o TEMPO de resposta até um piso fixo. Sem isso, o
// caminho com conta (que paga uma chamada à Brevo) demoraria visivelmente mais
// que o caminho sem conta, e o relógio seria um oráculo tão bom quanto uma
// mensagem. Nada muda nesta tela — ela já tratava tudo como neutro.
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@leela/design-system';
import { enviarResetSenha } from '@leela/api-client';
import { AuthCard } from './AuthCard';
import { AuthAlert } from './AuthAlert';
import { getAuthErrorCode } from './_lib/authErrors';
import { emailValido } from './_lib/authValidation';

const LINK_CLASSE =
  'font-[var(--font-weight-medium)] text-[var(--action-brand-tint-fg)] hover:underline';

export function RecuperarSenhaPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeEnviar = emailValido(email) && !enviando;

  async function solicitar(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeEnviar) return;
    setErro(null);
    setEnviando(true);
    try {
      await enviarResetSenha(email.trim());
      setEnviado(true);
    } catch (err) {
      // Conta inexistente → confirmação NEUTRA (não vaza). Qualquer outra falha
      // é técnica (rede/servidor) e não distingue existência.
      if (getAuthErrorCode(err) === 'auth/user-not-found') {
        setEnviado(true);
      } else {
        setErro('Não foi possível enviar agora. Verifique sua conexão e tente de novo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <AuthCard
        title="Verifique seu e-mail"
        footer={
          <Link to="/entrar" className={LINK_CLASSE}>
            Voltar para o login
          </Link>
        }
      >
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Verifique
          também a caixa de spam.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar senha"
      description="Enviaremos um link de redefinição para o seu e-mail."
      footer={
        <Link to="/entrar" className={LINK_CLASSE}>
          Voltar para o login
        </Link>
      }
    >
      <form className="flex flex-col gap-[var(--spacing-4)]" onSubmit={(e) => void solicitar(e)} noValidate>
        {erro ? <AuthAlert message={erro} /> : null}
        <Input
          id="recuperar-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!podeEnviar} className="w-full">
          {enviando ? 'Enviando…' : 'Enviar link de redefinição'}
        </Button>
      </form>
    </AuthCard>
  );
}

RecuperarSenhaPage.displayName = 'RecuperarSenhaPage';
