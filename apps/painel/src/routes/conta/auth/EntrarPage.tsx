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
//
// ROTEAMENTO POR PAPEL (item 57 do painel de decisões): a decisão de para onde
// ir mora em `_lib/destinoPosLogin` (pura e testada). Aqui só se COLETA o que
// ela precisa — claims com refresh forçado (o token em cache pode ser anterior
// ao provisionamento) e a existência de `profissionais/{uid}`, que separa o
// organizador em onboarding da conta órfã. Conta órfã não passa da porta: a
// sessão cai e o aviso aparece nesta mesma tela.
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Input, InputSenha } from '@leela/design-system';
import {
  getClaims,
  getLeelaDb,
  getProfissional,
  loginComEmail,
  logout,
} from '@leela/api-client';
import type { Role } from '@leela/core';
import { AuthCard } from './AuthCard';
import { AuthAlert } from './AuthAlert';
import { mensagemErroLogin } from './_lib/authErrors';
import { caminhoInternoSeguro, emailValido } from './_lib/authValidation';
import { destinoPosLogin, type SessaoPosLogin } from './_lib/destinoPosLogin';

interface EntrarLocationState {
  from?: string;
}

const LINK_CLASSE =
  'font-[var(--font-weight-medium)] text-[var(--action-brand-tint-fg)] hover:underline';

/**
 * Coleta o que o item 57 precisa saber. O refresh é FORÇADO: o token em cache
 * pode ser anterior ao provisionamento (a claim de tenant nasce server-side no
 * resgate) e um token velho mandaria um organizador legítimo para o aviso de
 * conta órfã.
 *
 * O doc só é lido quando não há tenant — quem já tem tenant não precisa do
 * discriminante, e a leitura seria um round-trip por login de graça.
 *
 * Falha ao ler claims/doc NÃO barra ninguém: sem evidência de órfã, o pior
 * caminho é deixar entrar e a conta encontrar o overlay (ou o painel). Barrar
 * por erro de rede trancaria organizador legítimo do lado de fora.
 */
async function lerSessaoPosLogin(uid: string): Promise<SessaoPosLogin> {
  try {
    const claims = (await getClaims(true)) ?? {};
    const role = (claims['role'] as Role | undefined) ?? null;
    const tenantId = (claims['tenantId'] as string | undefined) ?? null;
    if (tenantId !== null || role === 'platform_admin') {
      return { role, tenantId, temPerfilProfissional: true };
    }
    const perfil = await getProfissional(getLeelaDb(), uid);
    return { role, tenantId, temPerfilProfissional: perfil !== null };
  } catch {
    return { role: null, tenantId: null, temPerfilProfissional: true };
  }
}

export function EntrarPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  // Redirect pós-login: sanitiza o `from` para um caminho interno seguro
  // (anti open-redirect defensivo; hoje o RequirePapel só grava pathname
  // confiável, mas o sink não deve confiar cegamente na origem).
  //
  // Fallback VAZIO de propósito (não `/`): o item 57 precisa distinguir "veio
  // de um deep-link" de "entrou pela porta da frente" — com `/` de fallback os
  // dois casos ficariam indistinguíveis e o super-admin nunca cairia em
  // `/plataforma`.
  const origem = caminhoInternoSeguro((location.state as EntrarLocationState | null)?.from, '');

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
      const credencial = await loginComEmail(email.trim(), senha);
      const sessao = await lerSessaoPosLogin(credencial.user.uid);
      const decisao = destinoPosLogin(sessao, origem.length > 0 ? origem : null);
      if (decisao.tipo === 'barrar') {
        // Sessão cai ANTES do aviso: deixar a conta órfã autenticada no
        // navegador seria acesso sem tela, e a próxima rota que ela tentasse
        // abriria um painel vazio em vez desta explicação.
        await logout();
        setErro(decisao.aviso);
        setEnviando(false);
        return;
      }
      // replace: a tela de login não fica no histórico após autenticar.
      navigate(decisao.destino, { replace: true });
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
        {/* SEM `avaliacao` de propósito (FRONTEIRA-AUTH): aqui a senha já
            existe. Medir a força de uma senha que a pessoa não pode trocar
            nesta tela não orienta nada e ainda anuncia ao ombro do vizinho que
            a senha dela é fraca. O medidor só aparece onde a senha NASCE. */}
        <InputSenha
          id="entrar-senha"
          label="Senha"
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
