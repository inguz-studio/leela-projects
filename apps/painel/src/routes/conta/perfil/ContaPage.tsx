// =============================================================================
// ContaPage (`/conta`) — configurações da conta do usuário LOGADO
// (LEELA-S020-T4). Vive DENTRO do shell (sidebar visível); entrada pelo rodapé
// "Ver perfil". SEPARADA das Configurações do TENANT (E16) e do EVENTO
// (S304-T2): aqui é só o indivíduo — nome, e-mail (exibido) e troca de senha.
//
// SEGURANÇA: a troca de senha passa por `trocarSenha`, que REAUTENTICA com a
// senha atual antes de gravar a nova (reauth obrigatória embutida no api-client).
// Senhas ficam só no estado controlado dos inputs enquanto a tela existe e são
// limpas após o sucesso; nunca são logadas.
//
// LACUNA: foto de perfil não entra — não há padrão de upload (Storage) no repo
// (firebase.ts do painel só inicializa db/auth/functions). Fica registrada para
// quando existir um seam de upload.
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, useToast } from '@leela/design-system';
import { atualizarNomeExibicao, logout, trocarSenha } from '@leela/api-client';
import { AuthAlert } from '../auth/AuthAlert';
import { mensagemErroTrocaSenha } from '../auth/_lib/authErrors';
import { SENHA_MIN, senhaAtendeMinimo } from '../auth/_lib/authValidation';
import { useContaUsuario } from './useContaUsuario';

const SECAO = 'flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-6)]';
const SECAO_TITULO = 'text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]';

export function ContaPage(): JSX.Element {
  const { user, loading } = useContaUsuario();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);

  // Encerrar a sessão: única saída de logout do painel (o rodapé só levava até
  // aqui). signOut limpa a sessão persistida do Firebase no navegador; em
  // seguida mandamos o usuário para o login. Fail-safe: mesmo se o signOut
  // lançar, seguimos para /entrar (a intenção do usuário é sair).
  async function sair(): Promise<void> {
    setSaindo(true);
    try {
      await logout();
    } catch {
      // Ignorado de propósito: navegar para o login é a saída correta de todo
      // jeito; não retemos o usuário numa sessão que ele pediu para encerrar.
    } finally {
      navigate('/entrar', { replace: true });
    }
  }

  // Nome: null enquanto não editado → cai no displayName atual (lida com o load
  // assíncrono da sessão sem useEffect de sincronização).
  const nomeOriginal = user?.displayName ?? '';
  const [nomeEditado, setNomeEditado] = useState<string | null>(null);
  const nome = nomeEditado ?? nomeOriginal;
  const [salvandoNome, setSalvandoNome] = useState(false);

  // Troca de senha.
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [trocando, setTrocando] = useState(false);

  if (loading) {
    return (
      <div role="status" aria-label="Carregando conta" className="p-[var(--spacing-6)]">
        <div className="h-40 rounded-[var(--card-radius)] bg-[var(--surface-raised)]" />
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-4)] p-[var(--spacing-6)]">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Sua conta
        </h1>
        <AuthAlert
          tone="info"
          message="Você não está autenticado. Entre para ver e editar os dados da sua conta."
        />
        <div>
          <Button asChild variant="primary">
            <Link to="/entrar">Ir para o login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const podeSalvarNome = nome.trim().length > 0 && nome.trim() !== nomeOriginal && !salvandoNome;

  async function salvarNome(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeSalvarNome) return;
    setSalvandoNome(true);
    try {
      await atualizarNomeExibicao(nome.trim());
      setNomeEditado(nome.trim());
      toast({ variant: 'success', title: 'Nome atualizado' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível salvar o nome', description: 'Tente novamente.' });
    } finally {
      setSalvandoNome(false);
    }
  }

  const senhasBatem = novaSenha.length > 0 && novaSenha === confirmar;
  const podeTrocar =
    senhaAtual.length > 0 && senhaAtendeMinimo(novaSenha) && senhasBatem && !trocando;
  const novaSenhaErro =
    novaSenha.length > 0 && !senhaAtendeMinimo(novaSenha) ? `Use pelo menos ${SENHA_MIN} caracteres.` : undefined;
  const confirmarErro = confirmar.length > 0 && !senhasBatem ? 'As senhas não conferem.' : undefined;

  async function trocarSenhaSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeTrocar) return;
    setErroSenha(null);
    setTrocando(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmar('');
      toast({ variant: 'success', title: 'Senha atualizada' });
    } catch (err) {
      setErroSenha(mensagemErroTrocaSenha(err));
    } finally {
      setTrocando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-6)] p-[var(--spacing-6)]">
      <header>
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Sua conta
        </h1>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Dados pessoais e acesso. As configurações do organizador e dos eventos ficam em áreas
          próprias.
        </p>
      </header>

      {/* Perfil */}
      <form className={SECAO} onSubmit={(e) => void salvarNome(e)} aria-label="Perfil">
        <span className={SECAO_TITULO}>Perfil</span>
        <Input
          id="conta-nome"
          label="Nome"
          type="text"
          autoComplete="name"
          value={nome}
          onChange={(e) => setNomeEditado(e.target.value)}
        />
        <Input id="conta-email" label="E-mail" type="email" value={user.email ?? ''} readOnly disabled />
        <div>
          <Button type="submit" variant="primary" disabled={!podeSalvarNome}>
            {salvandoNome ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>

      {/* Troca de senha (reauth obrigatória) */}
      <form className={SECAO} onSubmit={(e) => void trocarSenhaSubmit(e)} aria-label="Trocar senha">
        <span className={SECAO_TITULO}>Trocar senha</span>
        {erroSenha ? <AuthAlert message={erroSenha} /> : null}
        <Input
          id="conta-senha-atual"
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
        />
        <Input
          id="conta-nova-senha"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          {...(novaSenhaErro ? { errorMessage: novaSenhaErro } : {})}
        />
        <Input
          id="conta-confirmar-senha"
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          {...(confirmarErro ? { errorMessage: confirmarErro } : {})}
        />
        <div>
          <Button type="submit" variant="primary" disabled={!podeTrocar}>
            {trocando ? 'Trocando…' : 'Trocar senha'}
          </Button>
        </div>
      </form>

      {/* Sessão — encerrar o acesso neste dispositivo (única saída de logout) */}
      <section className={SECAO} aria-label="Sessão">
        <span className={SECAO_TITULO}>Sessão</span>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Encerra o acesso neste dispositivo. Você precisará entrar de novo.
        </p>
        <div>
          <Button type="button" variant="secondary" disabled={saindo} onClick={() => void sair()}>
            {saindo ? 'Saindo…' : 'Sair da conta'}
          </Button>
        </div>
      </section>
    </div>
  );
}

ContaPage.displayName = 'ContaPage';
