'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { provisionAssessoriaAccount } from '@leela/api-client';
// FRONTEIRA-AUTH · `SENHA_MIN_ASSESSORIA` (8) saiu daqui. Ela era uma cópia
// local do piso — "espelho de premissa da Function", diz o comentário no
// api-client — e cópia de regra é o que faz duas telas divergirem na primeira
// vez que o piso sobe. A política única de `@leela/core` cobre o mesmo caso e
// ainda traz os requisitos que o comprimento sozinho não via.
import { avaliarSenha, exigenciaDeSenha } from '@leela/core';
import { Button, Input, InputSenha } from '@/app/_ds/ds';
import { ensureLeela } from '@/lib/leelaClient';

// Formulário de aceite do convite de assessoria (S1801-T2). Client Component:
// inicializa o Firebase no navegador e invoca a callable PÚBLICA
// `provisionAssessoriaAccount` (o token do link é a credencial — nenhuma sessão
// exigida). Conta NOVA exige senha; conta EXISTENTE é vinculada sem tocar
// credencial (senha ignorada). Estados HONESTOS: em produção o backend fica
// FAIL-CLOSED até o EmailProvider — a página não promete e-mail, só reage ao
// que o servidor devolve.

interface Props {
  tenantId: string;
  parceriaId: string;
  token: string;
}

type Estado =
  | { fase: 'form' }
  | { fase: 'enviando' }
  | { fase: 'ok'; replay: boolean }
  | { fase: 'erro'; mensagem: string };

function mensagemErro(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const msg = (err as { message?: string })?.message ?? '';
  if (code.includes('permission-denied')) {
    return 'Convite inválido. O link pode ter sido revogado — peça um novo ao organizador.';
  }
  if (code.includes('failed-precondition')) {
    if (msg.toLowerCase().includes('expirad')) {
      return 'Convite expirado. Peça ao organizador que reenvie o convite.';
    }
    return msg || 'Este convite não está mais disponível para aceite.';
  }
  if (code.includes('invalid-argument')) {
    // A frase de fallback é a MESMA da dica do campo (`exigenciaDeSenha`): o
    // servidor recusar por uma régua e a tela explicar outra é o defeito que
    // deixa a pessoa presa num formulário que se contradiz.
    return msg || exigenciaDeSenha();
  }
  return 'Não foi possível concluir o aceite agora. Tente novamente em instantes.';
}

export function ConviteForm({ tenantId, parceriaId, token }: Props): React.JSX.Element {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [estado, setEstado] = useState<Estado>({ fase: 'form' });

  // Uma avaliação por render: alimenta o medidor E trava o botão. O que era
  // `senhaCurta` (mensagem de erro por comprimento) some — o medidor já diz o
  // que falta, item a item, e duas vozes sobre a mesma pendência só brigam.
  const avaliacao = avaliarSenha(senha);
  const naoConfere = confirmar.length > 0 && senha !== confirmar;
  const podeEnviar = avaliacao.atende && senha === confirmar && estado.fase !== 'enviando';

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeEnviar) return;
    setEstado({ fase: 'enviando' });
    try {
      ensureLeela();
      const r = await provisionAssessoriaAccount({
        tenantId,
        parceriaId,
        token,
        senha,
        ...(nome.trim().length > 0 ? { nome: nome.trim() } : {}),
      });
      setEstado({ fase: 'ok', replay: r.replay });
    } catch (err) {
      setEstado({ fase: 'erro', mensagem: mensagemErro(err) });
    }
  }

  if (estado.fase === 'ok') {
    return (
      <div className="mt-8 rounded-ds-lg border border-border-default bg-surface-raised p-6">
        <p className="text-lg font-semibold text-text-primary">
          {estado.replay ? 'Parceria já estava ativa' : 'Parceria ativada'}
        </p>
        <p className="mt-2 text-text-secondary">
          {estado.replay
            ? 'Seu aceite já havia sido processado — nada a refazer. Você já pode entrar com seu e-mail e senha.'
            : 'Sua conta está pronta e a parceria com o organizador está ativa. Entre com seu e-mail e a senha que você criou.'}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          ← Voltar para a Be Hero
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-8 flex flex-col gap-4" aria-label="Aceite do convite">
      {estado.fase === 'erro' ? (
        <div
          role="alert"
          className="rounded-ds-lg border border-border-default bg-surface-raised p-4 text-sm font-medium text-feedback-danger-fg"
        >
          {estado.mensagem}
        </div>
      ) : null}

      <p className="text-sm text-text-tertiary">
        Se você já tem conta na Be Hero com este e-mail, a parceria é vinculada automaticamente e a
        senha abaixo é ignorada. Se ainda não tem, crie uma senha para nascer sua conta.
      </p>

      <Input
        id="convite-nome"
        label="Seu nome (opcional)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do responsável"
        autoComplete="name"
      />
      <div>
        {/* Senha NOVA: medidor LIGADO. */}
        <InputSenha
          id="convite-senha"
          label="Crie uma senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          avaliacao={avaliacao}
          aria-describedby="convite-senha-regra"
        />
        <p id="convite-senha-regra" className="mt-1 text-sm text-text-secondary">
          {exigenciaDeSenha()}
        </p>
      </div>
      {/* Confirmação: medidor DESLIGADO. Ela repete a MESMA senha do campo de
          cima — um segundo medidor mediria duas vezes a mesma coisa e faria a
          pessoa procurar a diferença entre eles. O que este campo tem a dizer é
          uma coisa só: se confere ou não. */}
      <InputSenha
        id="convite-confirmar"
        label="Confirme a senha"
        value={confirmar}
        onChange={(e) => setConfirmar(e.target.value)}
        autoComplete="new-password"
        {...(naoConfere ? { errorMessage: 'As senhas não conferem.' } : {})}
      />

      <Button type="submit" variant="primary" disabled={!podeEnviar}>
        {estado.fase === 'enviando' ? 'Ativando…' : 'Aceitar convite'}
      </Button>
    </form>
  );
}
