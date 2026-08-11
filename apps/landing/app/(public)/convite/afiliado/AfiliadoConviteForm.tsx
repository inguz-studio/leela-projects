'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { provisionAfiliadoAccount } from '@leela/api-client';
// FRONTEIRA-AUTH · `SENHA_MIN_AFILIADO` (8) saiu daqui pelo mesmo motivo que a
// gêmea da assessoria: eram DUAS constantes locais para UMA regra, e cada tela
// com a sua é o que faz o piso subir num lugar só. A política de `@leela/core`
// é a autoridade única — a mesma que a Function de provisionamento chama.
import { avaliarSenha, exigenciaDeSenha } from '@leela/core';
import { Card } from '@leela/design-system/server';
import { Button, Input, InputSenha } from '@/app/_ds/ds';
import { ensureLeela } from '@/lib/leelaClient';

// Aceite do convite de influenciador PF (S-R9-11-T6). Client Component:
// inicializa o Firebase no navegador e invoca a callable PÚBLICA
// `provisionAfiliadoAccount` (o token do link é a credencial). Conta NOVA
// exige senha; conta EXISTENTE é vinculada sem tocar credencial. Estados
// HONESTOS (mesma disciplina do aceite E18 — o backend é fail-closed/opaco).

interface Props {
  eventoId: string;
  afiliadoId: string;
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
  if (code.includes('resource-exhausted')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (code.includes('failed-precondition')) {
    if (msg.toLowerCase().includes('expirad')) {
      return 'Convite expirado. Peça ao organizador que reenvie o convite.';
    }
    return msg || 'Este convite não está mais disponível para aceite.';
  }
  if (code.includes('invalid-argument')) {
    // Mesma frase da dica do campo — servidor e tela não podem explicar réguas
    // diferentes sobre a senha que acabou de ser recusada.
    return msg || exigenciaDeSenha();
  }
  return 'Não foi possível concluir o aceite agora. Tente novamente em instantes.';
}

export function AfiliadoConviteForm({ eventoId, afiliadoId, token }: Props): React.JSX.Element {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [estado, setEstado] = useState<Estado>({ fase: 'form' });

  // Uma avaliação por render: medidor e trava do botão leem o mesmo objeto.
  // `senhaCurta` some — o medidor já lista as pendências, uma a uma.
  const avaliacao = avaliarSenha(senha);
  const naoConfere = confirmar.length > 0 && senha !== confirmar;
  const podeEnviar = avaliacao.atende && senha === confirmar && estado.fase !== 'enviando';

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!podeEnviar) return;
    setEstado({ fase: 'enviando' });
    try {
      ensureLeela();
      const r = await provisionAfiliadoAccount({
        eventoId,
        afiliadoId,
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
      <Card className="mt-8 p-6">
        <p className="text-lg font-semibold text-text-primary">
          {estado.replay ? 'Convite já aceito' : 'Tudo pronto!'}
        </p>
        <p className="mt-2 text-text-secondary">
          {estado.replay
            ? 'Seu aceite já havia sido processado. Entre com seu e-mail e senha para ver suas conversões.'
            : 'Sua conta está pronta. Entre com seu e-mail e a senha que você criou para acompanhar as conversões do seu link.'}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          ← Voltar
        </Link>
      </Card>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-8 flex flex-col gap-4" aria-label="Aceite do convite">
      {estado.fase === 'erro' ? (
        <Card
          role="alert"
          className="p-4 text-sm font-medium text-feedback-danger-fg"
        >
          {estado.mensagem}
        </Card>
      ) : null}

      <p className="text-sm text-text-tertiary">
        Se você já tem conta na Leela com este e-mail, ela é vinculada
        automaticamente e a senha abaixo é ignorada. Se ainda não tem, crie uma
        senha para nascer sua conta.
      </p>

      <Input
        id="afiliado-nome"
        label="Seu nome (opcional)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Seu nome"
        autoComplete="name"
      />
      <div>
        {/* Senha NOVA: medidor LIGADO. */}
        <InputSenha
          id="afiliado-senha"
          label="Crie uma senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          avaliacao={avaliacao}
          aria-describedby="afiliado-senha-regra"
        />
        <p id="afiliado-senha-regra" className="mt-1 text-sm text-text-secondary">
          {exigenciaDeSenha()}
        </p>
      </div>
      {/* Confirmação: medidor DESLIGADO — ela repete a senha de cima, e medir o
          mesmo segredo duas vezes só convida a comparar dois medidores. */}
      <InputSenha
        id="afiliado-confirmar"
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
