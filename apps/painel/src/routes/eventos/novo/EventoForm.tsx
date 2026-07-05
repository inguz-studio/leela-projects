// =============================================================================
// EventoForm — formulário "Novo evento" (S201-T1). Presentational + controlado.
// Validação inline pura (validaNovoEvento); submit via porta injetada
// (CriarEventoFn) → cria rascunho + Toast de sucesso. Campo obrigatório vazio
// bloqueia o submit e mostra erro inline (§2.12).
// =============================================================================

import * as React from 'react';
import { Button, Chip, Input, useToast } from '@leela/design-system';
import type { CriarEventoFn, CriarEventoInput, CriarEventoResult } from '../_data/contracts';
import { toastErroCriarEvento } from './erros';
import {
  validaNovoEvento,
  type ErrosNovoEvento,
  type NovoEventoFormValues,
  type PercursoInput,
} from './validacao';

export interface EventoFormProps {
  onCriarEvento: CriarEventoFn;
  onSuccess?: (result: CriarEventoResult) => void;
}

const VALORES_INICIAIS: NovoEventoFormValues = {
  nome: '',
  descricao: '',
  data: '',
  local: '',
  modalidades: [],
  percursos: [{ nome: '', preco: '' }],
};

export function EventoForm({ onCriarEvento, onSuccess }: EventoFormProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<NovoEventoFormValues>(VALORES_INICIAIS);
  const [erros, setErros] = React.useState<ErrosNovoEvento>({});
  const [modalidadeDraft, setModalidadeDraft] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);

  function set<K extends keyof NovoEventoFormValues>(campo: K, valor: NovoEventoFormValues[K]) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function addModalidade() {
    const m = modalidadeDraft.trim();
    if (m.length === 0 || values.modalidades.includes(m)) return;
    set('modalidades', [...values.modalidades, m]);
    setModalidadeDraft('');
  }

  function removeModalidade(m: string) {
    set('modalidades', values.modalidades.filter((x) => x !== m));
  }

  function setPercurso(i: number, patch: Partial<PercursoInput>) {
    set(
      'percursos',
      values.percursos.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    );
  }

  function addPercurso() {
    set('percursos', [...values.percursos, { nome: '', preco: '' }]);
  }

  function removePercurso(i: number) {
    if (values.percursos.length === 1) return;
    set('percursos', values.percursos.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { valido, erros: novosErros } = validaNovoEvento(values);
    setErros(novosErros);
    if (!valido) {
      toast({
        variant: 'danger',
        title: 'Revise o formulário',
        description: 'Alguns campos obrigatórios precisam de atenção.',
      });
      return;
    }

    setEnviando(true);
    try {
      const input: CriarEventoInput = {
        nome: values.nome.trim(),
        data: values.data,
        local: values.local.trim(),
        modalidades: values.modalidades,
        percursos: values.percursos.map((p) => ({
          nome: p.nome.trim(),
          preco: Number(p.preco),
        })),
      };
      const descricao = values.descricao.trim();
      if (descricao) input.descricao = descricao;
      const result = await onCriarEvento(input);
      toast({
        variant: 'success',
        title: 'Rascunho criado',
        description: `"${values.nome.trim()}" foi salvo como rascunho.`,
      });
      onSuccess?.(result);
    } catch (err) {
      // Traduz error.codes do servidor (RN-402, slug esgotado, validação)
      // em mensagem acionável — nunca o genérico cego (review #34).
      toast({ variant: 'danger', ...toastErroCriarEvento(err) });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Novo evento"
      className="flex max-w-3xl flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)] py-[var(--spacing-4)]"
    >
      <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
        Novo evento
      </h1>

      <Input
        id="nome"
        label="Nome do evento"
        value={values.nome}
        onChange={(e) => set('nome', e.target.value)}
        errorMessage={erros.nome ?? ''}
        placeholder="Meia Maratona Floripa 2026"
      />

      <div className="flex flex-col gap-1">
        <label
          htmlFor="descricao"
          className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]"
        >
          Descrição
        </label>
        <textarea
          id="descricao"
          value={values.descricao}
          onChange={(e) => set('descricao', e.target.value)}
          rows={3}
          className="w-full rounded-[var(--input-radius)] border-[length:var(--input-border-width)] border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--input-px)] py-[var(--spacing-2)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <Input
          id="data"
          type="date"
          label="Data da prova"
          value={values.data}
          onChange={(e) => set('data', e.target.value)}
          errorMessage={erros.data ?? ''}
        />
        <Input
          id="local"
          label="Local"
          value={values.local}
          onChange={(e) => set('local', e.target.value)}
          errorMessage={erros.local ?? ''}
          placeholder="Florianópolis, SC"
        />
      </div>

      {/* Modalidades */}
      <fieldset className="flex flex-col gap-[var(--spacing-2)]">
        <legend className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Modalidades
        </legend>
        <div className="flex items-end gap-[var(--spacing-2)]">
          <Input
            id="modalidade-draft"
            aria-label="Adicionar modalidade"
            value={modalidadeDraft}
            onChange={(e) => setModalidadeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addModalidade();
              }
            }}
            placeholder="5k, 10k, 21k…"
            wrapperClassName="flex-1"
          />
          <Button variant="secondary" onClick={addModalidade}>
            Adicionar
          </Button>
        </div>
        {values.modalidades.length > 0 ? (
          <div className="flex flex-wrap gap-[var(--spacing-2)]" aria-label="Modalidades adicionadas">
            {values.modalidades.map((m) => (
              <Chip key={m} active onRemove={() => removeModalidade(m)}>
                {m}
              </Chip>
            ))}
          </div>
        ) : null}
        {erros.modalidades ? (
          <span role="alert" className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
            {erros.modalidades}
          </span>
        ) : null}
      </fieldset>

      {/* Percursos com preço independente */}
      <fieldset className="flex flex-col gap-[var(--spacing-3)]">
        <legend className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Percursos e preços
        </legend>
        {values.percursos.map((p, i) => (
          <div key={i} className="flex items-end gap-[var(--spacing-2)]">
            <Input
              aria-label={`Nome do percurso ${i + 1}`}
              value={p.nome}
              onChange={(e) => setPercurso(i, { nome: e.target.value })}
              placeholder="Percurso 10k"
              wrapperClassName="flex-1"
            />
            <Input
              aria-label={`Preço do percurso ${i + 1}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              value={p.preco}
              onChange={(e) => setPercurso(i, { preco: e.target.value })}
              placeholder="120.00"
              wrapperClassName="w-36"
            />
            <Button
              variant="ghost"
              onClick={() => removePercurso(i)}
              disabled={values.percursos.length === 1}
              aria-label={`Remover percurso ${i + 1}`}
            >
              Remover
            </Button>
          </div>
        ))}
        <div>
          <Button variant="secondary" onClick={addPercurso}>
            + Adicionar percurso
          </Button>
        </div>
        {erros.percursos ? (
          <span role="alert" className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]">
            {erros.percursos}
          </span>
        ) : null}
      </fieldset>

      <div className="flex items-center gap-[var(--spacing-3)]">
        <Button type="submit" variant="primary" disabled={enviando}>
          {enviando ? 'Criando…' : 'Criar rascunho'}
        </Button>
      </div>
    </form>
  );
}

EventoForm.displayName = 'EventoForm';
