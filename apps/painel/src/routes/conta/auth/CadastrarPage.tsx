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
import { Button, CheckboxField, Input, InputSenha } from '@leela/design-system';
import {
  atualizarNomeExibicao,
  criarContaComEmail,
  criarPerfilOrganizador,
  getLeelaDb,
} from '@leela/api-client';
import {
  NOME_ORGANIZADOR_MAX,
  NOME_ORGANIZADOR_MIN,
  ORGANIZACAO_MAX,
  ORGANIZACAO_MIN,
  TERMO_LGPD_FINALIDADE,
  avaliarSenha,
  exigenciaDeSenha,
  senhaValida,
  telefoneValido,
  validarCadastroOrganizador,
} from '@leela/core';
import { AuthCard } from './AuthCard';
import { AuthAlert } from './AuthAlert';
import { mensagemErroCadastro } from './_lib/authErrors';

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
  /**
   * Gate do formulário = gate da Rule (fix ONBOARD-REV · DEF-A). O contrato dos
   * dados é UM só e mora no core (`validarCadastroOrganizador`), que é o mesmo
   * que a Rule `shapeAutoCadastroValido` espelha: nome e organização de 2 a 80
   * caracteres. A régua ad-hoc que existia aqui (`length > 0`, sem teto) era
   * MAIS FROUXA que a Rule — nome de 1 letra ou organização de 81 caracteres
   * passavam pelo botão, o `setDoc` era negado pelo servidor e o `catch` vazio
   * do submit engolia a negativa: a conta Auth nascia SEM o doc
   * `profissionais/{uid}` e, no login seguinte, o item 57 barrava a pessoa na
   * porta sem caminho de volta (o e-mail já está em uso). Senha e confirmação
   * seguem locais — elas não vão para o doc.
   */
  const errosDoCadastro = validarCadastroOrganizador({
    nome,
    email,
    telefone,
    organizacao,
    consentimentoLgpd: consentimento,
  });
  // A senha nasce AQUI, então quem decide se ela serve é a política da casa
  // (`@leela/core` · politicaDeSenha) — a mesma que as Functions chamam. A
  // avaliação é calculada uma vez por render e alimenta as duas coisas: o gate
  // do botão (`atende`) e o medidor do campo.
  const avaliacaoDaSenha = avaliarSenha(senha);
  const podeCadastrar =
    errosDoCadastro.length === 0 && senhaValida(senha) && senhasBatem && !enviando;

  const confirmarErro = confirmar.length > 0 && !senhasBatem ? 'As senhas não conferem.' : undefined;
  const telefoneErro =
    telefone.length > 0 && !telefoneValido(telefone) ? 'Informe DDD e número.' : undefined;
  // Botão desabilitado sem explicação é beco: o limite que o servidor aplica
  // aparece no campo que o causou, com os números do core.
  const foraDaFaixa = (valor: string, min: number, max: number): boolean =>
    valor.trim().length > 0 && (valor.trim().length < min || valor.trim().length > max);
  const nomeErro = foraDaFaixa(nome, NOME_ORGANIZADOR_MIN, NOME_ORGANIZADOR_MAX)
    ? `Use de ${NOME_ORGANIZADOR_MIN} a ${NOME_ORGANIZADOR_MAX} caracteres.`
    : undefined;
  const organizacaoErro = foraDaFaixa(organizacao, ORGANIZACAO_MIN, ORGANIZACAO_MAX)
    ? `Use de ${ORGANIZACAO_MIN} a ${ORGANIZACAO_MAX} caracteres.`
    : undefined;

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
          {...(nomeErro ? { errorMessage: nomeErro } : {})}
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
          {...(organizacaoErro ? { errorMessage: organizacaoErro } : {})}
        />
        {/* Senha NOVA: medidor ligado, e a exigência escrita embaixo.
            A dica não é redundante com o medidor — o medidor só fala DEPOIS da
            primeira tecla ("Falta um número e um caractere especial"), e quem
            escolhe a senha precisa saber a regra ANTES de digitar. A frase vem
            de `exigenciaDeSenha()` e não da minha mão porque é a MESMA que a
            Function devolve quando recusa: tela e servidor não se contradizem.
            Sem `errorMessage` de propósito — o vermelho diria, em outras
            palavras, o que o medidor já está dizendo em cima da dica. */}
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <InputSenha
            id="cadastrar-senha"
            label="Senha"
            autoComplete="new-password"
            aria-describedby="cadastrar-senha-dica"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            avaliacao={avaliacaoDaSenha}
          />
          <span
            id="cadastrar-senha-dica"
            className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
          >
            {exigenciaDeSenha()}
          </span>
        </div>
        {/* Confirmação SEM medidor: ela é uma cópia da senha de cima. Um
            segundo medidor mediria a mesma string duas vezes e transformaria a
            tela num painel de barras que ninguém lê. O que este campo tem a
            dizer é uma coisa só — se bate ou não bate. */}
        <InputSenha
          id="cadastrar-confirmar"
          label="Confirmar senha"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          {...(confirmarErro ? { errorMessage: confirmarErro } : {})}
        />

        {/* Consentimento LGPD (RN-412) — finalidade declarada AO LADO do
            checkbox, não escondida atrás de um link. */}
        <CheckboxField
          id="cadastrar-lgpd"
          checked={consentimento}
          onChange={(e) => setConsentimento(e.target.checked)}
          label={
            <>
              Autorizo o tratamento dos meus dados para a seguinte finalidade:{' '}
              {TERMO_LGPD_FINALIDADE}
            </>
          }
        />

        <Button type="submit" variant="primary" disabled={!podeCadastrar} className="w-full">
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  );
}

CadastrarPage.displayName = 'CadastrarPage';
