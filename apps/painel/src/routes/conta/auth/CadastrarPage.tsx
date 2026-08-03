// =============================================================================
// CadastrarPage (`/cadastrar`) — cadastro COMPLETO do organizador
// (LEELA-S020-T3, estendido pela S030-T1 · RN-411/412).
//
// Cadastro ABERTO, acesso TRAVADO (D-ONB-1): a conta nasce sem código de
// convite, sem tenant e sem claim — e a pessoa ATERRISSA LOGADA na home, onde
// o overlay bloqueante (S1609-T2) pede o código ou o contato com o time. O
// estado "Conta criada, aguarde" que existia aqui era um beco: o dono pediu
// exatamente o contrário — a pessoa entra, vê o sistema fechado e recebe o
// caminho para falar com o time.
//
// O que o formulário coleta (RN-412 · P8): nome, e-mail, senha, telefone/
// WhatsApp e nome da organização (semente do futuro tenant — P7). CPF/CNPJ
// NÃO entra: KYC segue fora do escopo (Won't do E16 preservado).
//
// LGPD (RN-412): consentimento EXPLÍCITO — o checkbox nasce DESMARCADO, a
// finalidade é declarada na própria tela e o aceite é carimbado com versão e
// instante no doc `profissionais/{uid}` (S030-T2). Marcar por default seria
// consentimento fabricado, não consentimento.
//
// SEGURANÇA: a anti-enumeração FORTE no cadastro depende da "Email Enumeration
// Protection" do Firebase (Console) — sem ela, a mensagem orienta sem afirmar
// categoricamente a existência (mensagemErroCadastro). Senha nunca é logada
// nem sai deste componente para lugar algum além do SDK de Auth.
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Checkbox, Input } from '@leela/design-system';
import {
  atualizarNomeExibicao,
  criarContaComEmail,
  criarPerfilOrganizador,
  getLeelaDb,
} from '@leela/api-client';
import { TERMO_LGPD_FINALIDADE, telefoneValido } from '@leela/core';
import { AuthCard } from './AuthCard';
import { AuthAlert } from './AuthAlert';
import { mensagemErroCadastro } from './_lib/authErrors';
import { SENHA_MIN, emailValido, senhaAtendeMinimo } from './_lib/authValidation';

const LINK_CLASSE =
  'font-[var(--font-weight-medium)] text-[var(--action-brand-tint-fg)] hover:underline';

/** Home do painel — a conta travada aterrissa aqui e encontra o overlay. */
const ROTA_POS_CADASTRO = '/';

export function CadastrarPage(): JSX.Element {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [organizacao, setOrganizacao] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  // RN-412: nasce DESMARCADO. Não troque por `useState(true)`.
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const senhasBatem = senha.length > 0 && senha === confirmar;
  const podeCadastrar =
    nome.trim().length > 0 &&
    emailValido(email) &&
    telefoneValido(telefone) &&
    organizacao.trim().length > 0 &&
    senhaAtendeMinimo(senha) &&
    senhasBatem &&
    consentimento &&
    !enviando;

  const senhaErro =
    senha.length > 0 && !senhaAtendeMinimo(senha) ? `Use pelo menos ${SENHA_MIN} caracteres.` : undefined;
  const confirmarErro = confirmar.length > 0 && !senhasBatem ? 'As senhas não conferem.' : undefined;
  const telefoneErro =
    telefone.length > 0 && !telefoneValido(telefone) ? 'Informe DDD e número.' : undefined;

  async function cadastrar(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeCadastrar) return;
    setErro(null);
    setEnviando(true);
    try {
      const credencial = await criarContaComEmail(email.trim(), senha);
      // Nome de exibição: o usuário já está autenticado após criar a conta.
      await atualizarNomeExibicao(nome.trim());
      // Doc do profissional (S030-T2 · RN-411/412): dados completos +
      // consentimento carimbado. Best-effort DELIBERADO — a conta Auth já
      // existe e não dá para desfazê-la daqui; falhar a tela inteira deixaria
      // a pessoa presa numa conta que ela não consegue recriar (o e-mail já
      // está em uso). O resgate do convite recria o doc quando ele falta, e o
      // overlay se guia pela CLAIM (server-side), não por este doc.
      try {
        await criarPerfilOrganizador(getLeelaDb(), credencial.user.uid, {
          nome: nome.trim(),
          email: email.trim(),
          telefone,
          organizacao: organizacao.trim(),
        });
      } catch {
        // Silêncio proposital: ver comentário acima. Sem log com PII.
      }
      // Aterrissagem LOGADA (RN-411): a home decide o que mostrar a partir da
      // claim de tenant. `replace` para o botão voltar não devolver ao
      // formulário de uma conta que já existe.
      navigate(ROTA_POS_CADASTRO, { replace: true });
    } catch (err) {
      setErro(mensagemErroCadastro(err));
      setEnviando(false);
    }
  }

  return (
    <AuthCard
      title="Criar conta de organizador"
      description="Cadastre-se para receber acesso ao painel. A liberação é feita pelo time Leela."
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
          id="cadastrar-telefone"
          label="Telefone ou WhatsApp"
          type="tel"
          autoComplete="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          {...(telefoneErro ? { errorMessage: telefoneErro } : {})}
        />
        <Input
          id="cadastrar-organizacao"
          label="Nome da organização"
          type="text"
          autoComplete="organization"
          value={organizacao}
          onChange={(e) => setOrganizacao(e.target.value)}
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

        {/* Consentimento LGPD (RN-412) — finalidade declarada AO LADO do
            checkbox, não escondida atrás de um link. */}
        <div className="flex items-start gap-[var(--spacing-3)]">
          <Checkbox
            id="cadastrar-lgpd"
            checked={consentimento}
            onChange={(e) => setConsentimento(e.target.checked)}
          />
          <label
            htmlFor="cadastrar-lgpd"
            className="text-[length:var(--font-size-sm)] leading-[var(--line-height-normal)] text-[var(--text-secondary)]"
          >
            Autorizo o tratamento dos meus dados para a seguinte finalidade:{' '}
            {TERMO_LGPD_FINALIDADE}
          </label>
        </div>

        <Button type="submit" variant="primary" disabled={!podeCadastrar} className="w-full">
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  );
}

CadastrarPage.displayName = 'CadastrarPage';
