// =============================================================================
// ModalidadeModal — acrescentar e renomear modalidade (S316-T4 · E04 ·
// RN-500/RN-501).
//
// Um modal para as duas operações porque a forma é a mesma: um nome, um motivo
// e uma confirmação que nomeia a consequência ANTES do gesto (requisito de
// tela da RN-500 para evento publicado). O que muda é o título, a copy e o que
// o kernel valida.
//
// A validação client-side é o MESMO kernel do servidor (`@leela/core` →
// `validarAcrescentarModalidade` / `validarRenomearModalidade`). O callable é
// a autoridade; isto aqui só evita a ida ao servidor por um nome vazio ou
// duplicado, e garante que a frase que o organizador lê seja a mesma dos dois
// lados.
//
// ⛔ A recusa do servidor vira ERRO DE FORMULÁRIO ancorado no campo, com o
// modal ABERTO. É a lição da SEAL-LOTES (`2a97a592`): recusa que vira "falha
// ao salvar" e fecha a tela é a mesma queixa do dono num lugar novo.
//
// As sugestões (5k, 10k, 21k, 42k) são as MESMAS da criação do evento —
// `SUGESTOES_MODALIDADE_EVENTO`, movida para o core nesta lane. Isso é uma das
// "três línguas" que a onda A adiou de propósito para cá: criação, esta tela e
// o editor de kit falavam de modalidade cada uma do seu jeito.
// =============================================================================

import * as React from 'react';
import { Alert, Button, Chip, Input, Modal, Stack, Textarea } from '@leela/design-system';
import {
  MODALIDADE_NOME_MAX,
  SUGESTOES_MODALIDADE_EVENTO,
  normalizarNomeModalidade,
  validarAcrescentarModalidade,
  validarRenomearModalidade,
} from '@leela/core';
import {
  MOTIVO_MODALIDADE_MAX,
  MOTIVO_MODALIDADE_MIN,
  consequenciasDeRenomear,
  mensagemErroModalidade,
} from './_lib/modalidadeForm';

export type ModoModalidade = 'acrescentar' | 'renomear';

export interface ModalidadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: ModoModalidade;
  /** Modalidades hoje no evento — base da recusa por duplicidade. */
  modalidades: readonly string[];
  /** Nome atual, só em `renomear`. */
  modalidadeAtual?: string;
  /** O evento está publicado? Muda a copy da consequência (RN-500). */
  publicado: boolean;
  /** Executa a operação pela porta única. Resolve → fecha; rejeita → erro no campo. */
  onConfirmar: (nome: string, motivo: string) => Promise<void>;
}

export function ModalidadeModal({
  open,
  onOpenChange,
  modo,
  modalidades,
  modalidadeAtual = '',
  publicado,
  onConfirmar,
}: ModalidadeModalProps): JSX.Element {
  const [nome, setNome] = React.useState('');
  const [motivo, setMotivo] = React.useState('');
  const [erroServidor, setErroServidor] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setNome(modo === 'renomear' ? modalidadeAtual : '');
    setMotivo('');
    setErroServidor(null);
  }, [open, modo, modalidadeAtual]);

  const limpo = normalizarNomeModalidade(nome);
  const erroKernel =
    modo === 'acrescentar'
      ? validarAcrescentarModalidade(modalidades, nome)
      : validarRenomearModalidade(modalidades, modalidadeAtual, nome);
  // Campo em branco não é erro enquanto ninguém digitou nada: a recusa aparece
  // quando ela tem o que explicar, não como boas-vindas.
  const erroCampo = nome.length === 0 ? null : (erroServidor ?? erroKernel);

  const motivoTrim = motivo.trim();
  const motivoValido =
    motivoTrim.length >= MOTIVO_MODALIDADE_MIN && motivoTrim.length <= MOTIVO_MODALIDADE_MAX;
  const podeConfirmar = limpo.length > 0 && erroKernel === null && motivoValido && !busy;

  const disponiveis = SUGESTOES_MODALIDADE_EVENTO.filter((s) => !modalidades.includes(s));
  const consequencias = consequenciasDeRenomear(publicado);

  async function confirmar(): Promise<void> {
    if (!podeConfirmar) return;
    setBusy(true);
    setErroServidor(null);
    try {
      await onConfirmar(limpo, motivoTrim);
      onOpenChange(false);
    } catch (err) {
      // A recusa do servidor chega INTACTA ao campo, com o modal aberto.
      setErroServidor(mensagemErroModalidade(err));
    } finally {
      setBusy(false);
    }
  }

  const titulo = modo === 'acrescentar' ? 'Adicionar modalidade' : `Renomear ${modalidadeAtual}`;
  const descricao =
    modo === 'acrescentar'
      ? 'A modalidade é a distância ou o percurso do evento (5k, 21k, Kids 1k). Os lotes de preço vivem dentro dela.'
      : 'O nome novo migra junto os lotes, os kits e as campanhas desta modalidade, num gesto só.';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={titulo}
      description={descricao}
      footer={
        <div className="flex justify-end gap-[var(--spacing-3)]">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void confirmar()} disabled={!podeConfirmar}>
            {modo === 'acrescentar' ? 'Adicionar modalidade' : 'Renomear modalidade'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--spacing-4)]">
        <Input
          id="modalidade-nome"
          type="text"
          label={modo === 'acrescentar' ? 'Nome da modalidade' : 'Novo nome'}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setErroServidor(null);
          }}
          maxLength={MODALIDADE_NOME_MAX}
          placeholder="Ex.: 21k, Meia maratona, Kids 1k"
          aria-describedby="modalidade-nome-hint"
          {...(erroCampo ? { errorMessage: erroCampo } : {})}
        />

        {modo === 'acrescentar' && disponiveis.length > 0 ? (
          <div className="flex flex-col gap-[var(--spacing-2)]">
            <span
              id="modalidade-sugestoes-rotulo"
              className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
            >
              Sugestões
            </span>
            <div
              className="flex flex-wrap gap-[var(--spacing-2)]"
              aria-labelledby="modalidade-sugestoes-rotulo"
            >
              {disponiveis.map((s) => (
                <Chip
                  key={s}
                  active={limpo === s}
                  onClick={() => {
                    setNome(s);
                    setErroServidor(null);
                  }}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}

        <span
          id="modalidade-nome-hint"
          className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]"
        >
          {modo === 'acrescentar'
            ? 'A lista só é editável enquanto o evento não tem nenhuma inscrição, inclusive PIX pendente.'
            : 'Renomear para um nome que já existe é juntar duas modalidades — isso é recusado.'}
        </span>

        {modo === 'renomear' ? (
          // `Alert` no fluxo, não superfície artesanal: o estado que a pessoa
          // precisa ler ANTES de seguir é exatamente o papel da peça (§11 do
          // cânone), e um <div> com `bg-[--surface-sunken)]` aqui seria a
          // décima quarta escrita da mesma caixa — o que a RN-568 existe para
          // impedir, e o que a catraca `superficie-crua` do gate-canon conta.
          <Alert tone="info" title="O que o renome faz">
            <Stack gap="sm">
              <ul className="flex flex-col gap-[var(--spacing-1)]">
                {consequencias.loses.map((t) => (
                  <li key={t} className="text-[length:var(--font-size-sm)]">
                    {t}
                  </li>
                ))}
              </ul>
              <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]">
                O que fica
              </span>
              <ul className="flex flex-col gap-[var(--spacing-1)]">
                {consequencias.keeps.map((t) => (
                  <li key={t} className="text-[length:var(--font-size-sm)]">
                    {t}
                  </li>
                ))}
              </ul>
            </Stack>
          </Alert>
        ) : null}

        <Textarea
          id="modalidade-motivo"
          label="Motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          maxLength={MOTIVO_MODALIDADE_MAX}
          placeholder={
            modo === 'acrescentar'
              ? 'Ex.: faltou a distância de 10k no cadastro.'
              : 'Ex.: o nome comercial da prova mudou.'
          }
        />
        <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
          Fica no registro do evento (mínimo {MOTIVO_MODALIDADE_MIN} caracteres).
        </span>
      </div>
    </Modal>
  );
}

ModalidadeModal.displayName = 'ModalidadeModal';
