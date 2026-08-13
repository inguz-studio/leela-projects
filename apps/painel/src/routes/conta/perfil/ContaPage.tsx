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
// FOTO DE PERFIL (S020-T5 + LEELA-R5 + RN-168 · S-R9-07): UPLOAD-ONLY.
// Caminho único para o campo Auth.photoURL (→ Avatar do rodapé via
// shell/session.ts): FileInput → `uploadFotoPerfilConta` → Storage
// `users/{uid}/foto-perfil` → downloadURL, persistido na hora. O "cole uma
// URL" (fallback da ADR-016 item 5) foi REMOVIDO — a decisão supersede aquele
// item no escopo da foto da conta (S-R9-07 / DECISOES-ABERTAS). Validação de
// tipo/tamanho no cliente é UX (`problemaDoArquivoImagem`); a fronteira real
// são as storage.rules (ADR-016).
// =============================================================================

import * as React from 'react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, FileInput, Input, InputSenha, useToast } from '@leela/design-system';
import {
  atualizarFotoPerfil,
  atualizarNomeExibicao,
  problemaDoArquivoImagem,
  trocarSenha,
  uploadFotoPerfilConta,
} from '@leela/api-client';
import { avaliarSenha, exigenciaDeSenha, senhaValida } from '@leela/core';
import { ajustarProporcaoImagem } from '@/components/upload';
import { AuthAlert } from '../auth/AuthAlert';
import { mensagemErroTrocaSenha } from '../auth/_lib/authErrors';
import { useContaUsuario } from './useContaUsuario';
import { useSair } from '@/shell/sair';

const SECAO = 'flex flex-col gap-[var(--spacing-4)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-6)]';
const SECAO_TITULO = 'text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]';

/** URL http(s) válida? Só decide se mostra a prévia da imagem (mesma do perfil público). @pure */
function urlDeImagemValida(valor: string): boolean {
  const v = valor.trim();
  if (v.length === 0) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ContaPageProps {
  /**
   * Slot de **Dados de recebimento** (RN-366 · IAM-T5). Chega por composição,
   * do `ContaRoutes`, em vez de a página importar o container direto: os dados
   * bancários são a ÚNICA parte de `/conta` que depende de react-query e de
   * sessão de tenant, e embutir isso aqui acorrentaria a página inteira (nome,
   * foto, senha, logout) a um QueryClient que ela não usa para mais nada.
   * Mesma convenção dos slots `brand`/`footer` da Sidebar do DS.
   */
  recebimento?: React.ReactNode;
}

export function ContaPage({ recebimento }: ContaPageProps = {}): JSX.Element {
  const { user, loading } = useContaUsuario();
  const { toast } = useToast();
  // Deixou de ser a ÚNICA saída de logout na Leva 16 — o popover do perfil
  // oferece a mesma ação, e as duas leem esta implementação (`useSair`).
  const { sair, saindo } = useSair();

  // Nome: null enquanto não editado → cai no displayName atual (lida com o load
  // assíncrono da sessão sem useEffect de sincronização).
  const nomeOriginal = user?.displayName ?? '';
  const [nomeEditado, setNomeEditado] = useState<string | null>(null);
  const nome = nomeEditado ?? nomeOriginal;
  const [salvandoNome, setSalvandoNome] = useState(false);

  // Foto de perfil. null = não editada → cai no photoURL atual. Só o upload
  // altera este estado (RN-168: upload-only, sem "cole uma URL").
  const fotoOriginal = user?.photoURL ?? '';
  const [fotoEditada, setFotoEditada] = useState<string | null>(null);
  const fotoUrl = fotoEditada ?? fotoOriginal;

  // Upload de ARQUIVO (LEELA-R5): sobe pro Storage e persiste na hora.
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroUploadFoto, setErroUploadFoto] = useState<string | null>(null);

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

  // Upload de arquivo → Storage → grava a downloadURL no MESMO campo de hoje.
  // Valida tipo/tamanho ANTES do roundtrip (erro inline no FileInput); a
  // fronteira real são as storage.rules — aqui é UX.
  async function enviarFoto(file: File): Promise<void> {
    const problema = problemaDoArquivoImagem(file);
    if (problema) {
      setErroUploadFoto(problema);
      return;
    }
    setErroUploadFoto(null);
    setEnviandoFoto(true);
    try {
      // RN-170: ajusta para 1:1 (avatar) antes de subir; degrada para o
      // original em runtime sem canvas.
      const ajustada = await ajustarProporcaoImagem(file, 1, 1);
      const url = await uploadFotoPerfilConta(ajustada);
      await atualizarFotoPerfil(url);
      setFotoEditada(url);
      toast({ variant: 'success', title: 'Foto atualizada' });
    } catch {
      toast({
        variant: 'danger',
        title: 'Não foi possível enviar a foto',
        description: 'Tente novamente.',
      });
    } finally {
      setEnviandoFoto(false);
    }
  }

  const senhasBatem = novaSenha.length > 0 && novaSenha === confirmar;
  // A NOVA senha passa pela política do core (a mesma da reauth do servidor);
  // a ATUAL só precisa existir — ela já foi aceita quando nasceu, e revalidá-la
  // contra a régua nova trancaria do lado de fora justamente quem veio trocar.
  const avaliacaoDaNova = avaliarSenha(novaSenha);
  const podeTrocar =
    senhaAtual.length > 0 && senhaValida(novaSenha) && senhasBatem && !trocando;
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

      {/* Foto de perfil (S020-T5 + LEELA-R5 + RN-168) — upload-only via Storage;
          persiste na hora e reflete no Avatar do rodapé. O "cole uma URL" foi
          removido (S-R9-07; supersede ADR-016 item 5 na conta). */}
      <section className={SECAO} aria-label="Foto de perfil">
        <span className={SECAO_TITULO}>Foto de perfil</span>
        <div className="flex items-center gap-[var(--spacing-4)]">
          <Avatar size="lg" name={nome || (user.email ?? 'Você')} {...(urlDeImagemValida(fotoUrl) ? { src: fotoUrl.trim() } : {})} />
          <div className="flex flex-1 flex-col gap-[var(--spacing-3)]">
            <FileInput
              id="conta-foto-arquivo"
              label="Enviar foto"
              buttonLabel={urlDeImagemValida(fotoUrl) ? 'Trocar foto' : 'Escolher arquivo'}
              busy={enviandoFoto}
              hint="JPG, PNG, WebP, GIF ou AVIF até 5MB. Ajustada para 1:1 e atualizada na hora."
              {...(erroUploadFoto ? { errorMessage: erroUploadFoto } : {})}
              onFileSelected={(file) => void enviarFoto(file)}
            />
          </div>
        </div>
      </section>

      {/* Perfil público / link-in-bio (DN-1-T1 · E17) — editor separado */}
      <section className={SECAO} aria-label="Perfil público">
        <span className={SECAO_TITULO}>Perfil público</span>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Seu link-in-bio (@handle) reúne seus eventos e clubs num endereço único e compartilhável.
        </p>
        <div>
          <Button asChild variant="secondary">
            <Link to="/conta/perfil-publico">Editar perfil público</Link>
          </Button>
        </div>
      </section>

      {/* Dados de recebimento (RN-366 · IAM-T5) — cadastro ÚNICO do titular.
          Mora aqui, e não dentro de Repasses, porque dado bancário é do
          organizador e não da origem do dinheiro: quando o clube pago trouxer
          a segunda origem, não há titular duplicado para reconciliar. O saque
          continua acontecendo na origem, sobre o saldo único (RN-334). */}
      {recebimento ? (
        <section className={SECAO} aria-label="Dados de recebimento">
          <span className={SECAO_TITULO}>Dados de recebimento</span>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            A conta que recebe seus repasses. Vale para todos os seus eventos — você solicita o
            repasse em Eventos › Repasses.
          </p>
          {recebimento}
        </section>
      ) : null}

      {/* Troca de senha (reauth obrigatória) */}
      <form className={SECAO} onSubmit={(e) => void trocarSenhaSubmit(e)} aria-label="Trocar senha">
        <span className={SECAO_TITULO}>Trocar senha</span>
        {erroSenha ? <AuthAlert message={erroSenha} /> : null}
        {/* Senha ATUAL sem medidor: ela é credencial de reauth, não senha em
            construção. Medir a força do que a pessoa já usa não muda nada e só
            exibe o diagnóstico dela para quem estiver olhando a tela. */}
        <InputSenha
          id="conta-senha-atual"
          label="Senha atual"
          autoComplete="current-password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
        />
        {/* Senha NOVA: o único medidor desta seção, com a exigência escrita
            embaixo (mesma frase que o servidor devolve). */}
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <InputSenha
            id="conta-nova-senha"
            label="Nova senha"
            autoComplete="new-password"
            aria-describedby="conta-nova-senha-dica"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            avaliacao={avaliacaoDaNova}
          />
          <span
            id="conta-nova-senha-dica"
            className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
          >
            {exigenciaDeSenha()}
          </span>
        </div>
        {/* Confirmação sem medidor: mede a mesma string do campo de cima. */}
        <InputSenha
          id="conta-confirmar-senha"
          label="Confirmar nova senha"
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
