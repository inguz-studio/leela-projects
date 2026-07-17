'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  provisionAssessoriaAccount,
  SENHA_MIN_ASSESSORIA,
} from '@leela/api-client';
import { Button, Input } from '@/app/_ds/ds';
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
    return msg || `Crie uma senha de pelo menos ${SENHA_MIN_ASSESSORIA} caracteres.`;
  }
  return 'Não foi possível concluir o aceite agora. Tente novamente em instantes.';
}

export function ConviteForm({ tenantId, parceriaId, token }: Props): React.JSX.Element {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [estado, setEstado] = useState<Estado>({ fase: 'form' });

  const senhaCurta = senha.length > 0 && senha.length < SENHA_MIN_ASSESSORIA;
  const naoConfere = confirmar.length > 0 && senha !== confirmar;
  const podeEnviar =
    senha.length >= SENHA_MIN_ASSESSORIA && senha === confirmar && estado.fase !== 'enviando';

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
      <Input
        id="convite-senha"
        label="Crie uma senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        autoComplete="new-password"
        {...(senhaCurta ? { errorMessage: `Use pelo menos ${SENHA_MIN_ASSESSORIA} caracteres.` } : {})}
      />
      <Input
        id="convite-confirmar"
        label="Confirme a senha"
        type="password"
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
