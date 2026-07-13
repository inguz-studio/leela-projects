// =============================================================================
// CadastrarPage (`/cadastrar`) — cria a conta Firebase do profissional
// (LEELA-S020-T3).
//
// Reusa criarContaComEmail (@leela/api-client) + atualizarNomeExibicao para
// gravar o nome. Cadastro NÃO cria tenant (default defensável do épico): o
// acesso a um organizador chega por provisionamento (E16) ou convite de equipe
// (S304)/parceria (E18). Por isso o pós-cadastro é um estado HONESTO, não um
// redirect para dentro do app.
//
// SEGURANÇA: a anti-enumeração FORTE no cadastro depende da "Email Enumeration
// Protection" do Firebase (Console) — com ela, email-already-in-use nem é
// distinguível. Sem ela, a mensagem orienta sem afirmar categoricamente a
// existência (mensagemErroCadastro). Senha nunca é logada.
//
// LACUNA (backend, fora do território): hoje onCreateUser cria atletas/{uid} por
// default; o doc/claim de PROFISSIONAL e o vínculo com tenant são de E16/S304.
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@leela/design-system';
import { atualizarNomeExibicao, criarContaComEmail } from '@leela/api-client';
import { AuthCard } from './AuthCard';
import { AuthAlert } from './AuthAlert';
import { mensagemErroCadastro } from './_lib/authErrors';
import { SENHA_MIN, emailValido, senhaAtendeMinimo } from './_lib/authValidation';

const LINK_CLASSE =
  'font-[var(--font-weight-medium)] text-[var(--action-brand-tint-fg)] hover:underline';

export function CadastrarPage(): JSX.Element {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criada, setCriada] = useState(false);

  const senhasBatem = senha.length > 0 && senha === confirmar;
  const podeCadastrar =
    nome.trim().length > 0 && emailValido(email) && senhaAtendeMinimo(senha) && senhasBatem && !enviando;

  const senhaErro =
    senha.length > 0 && !senhaAtendeMinimo(senha) ? `Use pelo menos ${SENHA_MIN} caracteres.` : undefined;
  const confirmarErro = confirmar.length > 0 && !senhasBatem ? 'As senhas não conferem.' : undefined;

  async function cadastrar(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeCadastrar) return;
    setErro(null);
    setEnviando(true);
    try {
      await criarContaComEmail(email.trim(), senha);
      // Grava o nome de exibição (usuário já autenticado após criar a conta).
      await atualizarNomeExibicao(nome.trim());
      setCriada(true);
    } catch (err) {
      setErro(mensagemErroCadastro(err));
      setEnviando(false);
    }
  }

  if (criada) {
    return (
      <AuthCard
        title="Conta criada"
        footer={
          <Link to="/entrar" className={LINK_CLASSE}>
            Voltar para o login
          </Link>
        }
      >
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          Seu cadastro foi concluído. O acesso a um organizador chega por convite da equipe ou por
          provisionamento — você será avisado por e-mail quando estiver liberado.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Criar conta"
      description="Cadastre-se para receber acesso ao painel do organizador."
      footer={
        <span>
          Já tem conta?{' '}
          <Link to="/entrar" className={LINK_CLASSE}>
            Entrar
          </Link>
        </span>
      }
    >
      <form className="flex flex-col gap-[var(--spacing-4)]" onSubmit={(e) => void cadastrar(e)} noValidate>
        {erro ? <AuthAlert message={erro} /> : null}
        <Input
          id="cadastrar-nome"
          label="Nome"
          type="text"
          autoComplete="name"
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Input
          id="cadastrar-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          id="cadastrar-senha"
          label="Senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          {...(senhaErro ? { errorMessage: senhaErro } : {})}
        />
        <Input
          id="cadastrar-confirmar"
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          {...(confirmarErro ? { errorMessage: confirmarErro } : {})}
        />
        <Button type="submit" variant="primary" disabled={!podeCadastrar} className="w-full">
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  );
}

CadastrarPage.displayName = 'CadastrarPage';
