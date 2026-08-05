'use client';
// =============================================================================
// PainelMeusDados — meus dados e trocar senha (S1222-T3 · RN-450).
//
// A FRONTEIRA QUE ESTA TELA MATERIALIZA. O que ela edita é `atletas/{uid}`, a
// identidade GLOBAL do cliente (ADR-009). O perfil do ORGANIZADOR vive em
// `profissionais/{uid}` e tem casa própria em `/conta` no painel (S020-T4).
// Uma conta que acumula os dois papéis tem os dois documentos, e cada tela
// edita o seu. Misturar os dois faria a RN-450 virar letra morta na primeira
// pessoa que fosse cliente e organizadora ao mesmo tempo — que é o caso comum
// de quem organiza uma experiência e se inscreve na do vizinho.
//
// O E-MAIL É DE LEITURA, e a razão não é preguiça: trocar o e-mail da conta
// muda o endereço a que os ingressos já emitidos foram enviados e o e-mail que
// o vínculo com a compra carimbou (RN-174). É jornada com verificação própria,
// não um campo de formulário. Mostrar o campo cinza é mais honesto que
// escondê-lo — a pessoa vê qual endereço a plataforma tem.
//
// A TROCA DE SENHA REUSA O SEAM ÚNICO (`trocarSenha`), que embute a reauth
// obrigatória. A UI não separa "reautenticar" de "gravar": separar permitiria
// a alguém montar o fluxo sem a primeira metade, e a reauth existe para que
// uma sessão sequestrada não troque a senha.
// =============================================================================

import { useEffect, useState, type FormEvent } from 'react';
import {
  lerMeusDados,
  salvarMeusDados,
  senhaAtendeMinimo,
  SENHA_MIN,
  trocarSenha,
} from '@leela/api-client';
import { Button, Input } from '@/app/_ds/ds';

type FaseDados = 'carregando' | 'pronto' | 'salvando' | 'salvo' | 'falhou';
type FaseSenha = 'pronto' | 'salvando' | 'salvo' | 'falhou';

const SECAO = 'rounded-ds-lg border border-border-default bg-surface-raised p-4 sm:p-5';
const TITULO = 'text-base font-semibold text-text-primary';
const ERRO =
  'rounded-ds-lg border border-border-default bg-surface-base p-3 text-sm font-medium text-feedback-danger-fg';

export function PainelMeusDados({ email }: { email: string | null }): React.JSX.Element {
  const [fase, setFase] = useState<FaseDados>('carregando');
  const [nome, setNome] = useState('');
  const [emailConta, setEmailConta] = useState(email ?? '');

  const [faseSenha, setFaseSenha] = useState<FaseSenha>('pronto');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  useEffect(() => {
    let vivo = true;
    void lerMeusDados()
      .then((d) => {
        if (!vivo) return;
        setNome(d.nome);
        if (d.email.length > 0) setEmailConta(d.email);
        setFase('pronto');
      })
      .catch(() => {
        if (vivo) setFase('falhou');
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function salvar(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFase('salvando');
    try {
      await salvarMeusDados({ nome });
      setFase('salvo');
    } catch {
      setFase('falhou');
    }
  }

  async function trocar(e: FormEvent): Promise<void> {
    e.preventDefault();
    setErroSenha('');
    if (!senhaAtendeMinimo(senhaNova)) {
      setErroSenha(`A senha nova precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      return;
    }
    setFaseSenha('salvando');
    try {
      await trocarSenha(senhaAtual, senhaNova);
      setSenhaAtual('');
      setSenhaNova('');
      setFaseSenha('salvo');
    } catch {
      // Mensagem única: distinguir "senha atual errada" de "senha nova fraca"
      // aqui daria a alguém com a sessão na mão um oráculo da senha vigente.
      setErroSenha('Não foi possível trocar a senha. Confira a senha atual e tente de novo.');
      setFaseSenha('falhou');
    }
  }

  if (fase === 'carregando') {
    return (
      <p role="status" className="text-text-secondary">
        Carregando seus dados…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-slot="painel-meus-dados">
      <section className={SECAO}>
        <h2 className={TITULO}>Meus dados</h2>
        <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void salvar(e)}>
          <div>
            <label htmlFor="meus-dados-nome" className="text-sm font-medium text-text-primary">
              Nome
            </label>
            <Input
              id="meus-dados-nome"
              value={nome}
              autoComplete="name"
              onChange={(e) => {
                setNome(e.target.value);
                if (fase === 'salvo' || fase === 'falhou') setFase('pronto');
              }}
            />
          </div>
          <div>
            <label htmlFor="meus-dados-email" className="text-sm font-medium text-text-primary">
              E-mail da conta
            </label>
            <Input id="meus-dados-email" value={emailConta} readOnly disabled />
            <p className="mt-1 text-sm text-text-secondary">
              É por este endereço que seus ingressos chegam. Para trocá-lo, fale com a gente.
            </p>
          </div>
          {fase === 'falhou' ? (
            <p role="alert" className={ERRO}>
              Não foi possível salvar agora. Tente de novo em alguns instantes.
            </p>
          ) : null}
          {fase === 'salvo' ? (
            <p role="status" className="text-sm text-text-secondary">
              Pronto, seus dados foram salvos.
            </p>
          ) : null}
          <Button type="submit" disabled={fase === 'salvando'} className="self-start">
            {fase === 'salvando' ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      </section>

      <section className={SECAO}>
        <h2 className={TITULO}>Trocar senha</h2>
        <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void trocar(e)}>
          <div>
            <label htmlFor="senha-atual" className="text-sm font-medium text-text-primary">
              Senha atual
            </label>
            <Input
              id="senha-atual"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="senha-nova" className="text-sm font-medium text-text-primary">
              Senha nova
            </label>
            <Input
              id="senha-nova"
              type="password"
              autoComplete="new-password"
              value={senhaNova}
              aria-describedby="senha-nova-regra"
              onChange={(e) => setSenhaNova(e.target.value)}
            />
            <p id="senha-nova-regra" className="mt-1 text-sm text-text-secondary">
              Pelo menos {SENHA_MIN} caracteres.
            </p>
          </div>
          {erroSenha.length > 0 ? (
            <p role="alert" className={ERRO}>
              {erroSenha}
            </p>
          ) : null}
          {faseSenha === 'salvo' ? (
            <p role="status" className="text-sm text-text-secondary">
              Senha trocada. Continue por aqui.
            </p>
          ) : null}
          <Button type="submit" disabled={faseSenha === 'salvando'} className="self-start">
            {faseSenha === 'salvando' ? 'Trocando…' : 'Trocar senha'}
          </Button>
        </form>
      </section>
    </div>
  );
}
