// =============================================================================
// ConfigGeraisForm — form das Configurações gerais do evento (S304-T2 · E04-L5).
// Presentational + controlado (padrão EventoForm). Edita só os campos gerais
// que o model suporta (nome/local/usaChip/capacidade); exibe read-only a URL
// pública ({DOMINIO_LEELA}), a data, as modalidades e o status (editados no
// fluxo de criação/lotes — travados após a 1ª venda). O gate de papel
// (`podeEditar`) desabilita todos os controles + o Salvar; a Rule é a
// autoridade final (defesa em profundidade). Submit → porta injetada `onSalvar`
// → Toast (§2.12).
// =============================================================================

import * as React from 'react';
import { Badge, Button, Input, Switch, useToast } from '@leela/design-system';
import type { AtualizarConfiguracoesEventoInput } from '@leela/api-client';
import type { Evento } from '@leela/core';
import { formatDataEvento } from '../../_lib/format';
import {
  capacidadeParaNumero,
  urlPublicaEvento,
  valoresDoEvento,
  validaConfigGerais,
  type ConfigGeraisValues,
  type ErrosConfigGerais,
} from '../_lib/configForm';

export interface ConfigGeraisFormProps {
  evento: Evento;
  /** Papel pode editar Configurações? (esconde/desabilita quando false). */
  podeEditar: boolean;
  onSalvar: (input: AtualizarConfiguracoesEventoInput) => Promise<void>;
}

export function ConfigGeraisForm({
  evento,
  podeEditar,
  onSalvar,
}: ConfigGeraisFormProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<ConfigGeraisValues>(() =>
    valoresDoEvento(evento),
  );
  const [erros, setErros] = React.useState<ErrosConfigGerais>({});
  const [salvando, setSalvando] = React.useState(false);

  // Reidrata o form quando o evento muda (read-your-writes após salvar).
  React.useEffect(() => {
    setValues(valoresDoEvento(evento));
  }, [evento]);

  function set<K extends keyof ConfigGeraisValues>(campo: K, valor: ConfigGeraisValues[K]) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEditar) return;
    const { valido, erros: novosErros } = validaConfigGerais(values);
    setErros(novosErros);
    if (!valido) {
      toast({ variant: 'danger', title: 'Revise o formulário' });
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        nome: values.nome.trim(),
        local: values.local.trim(),
        usaChip: values.usaChip,
        capacidade: capacidadeParaNumero(values.capacidade),
      });
      toast({ variant: 'success', title: 'Configurações salvas' });
    } catch {
      toast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        description: 'Você pode não ter permissão para editar este evento.',
      });
    } finally {
      setSalvando(false);
    }
  }

  const disabled = !podeEditar || salvando;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Configurações gerais do evento"
      className="flex max-w-3xl flex-col gap-[var(--spacing-6)]"
    >
      {!podeEditar ? (
        <p
          role="status"
          className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]"
        >
          Seu papel não permite editar as configurações — os campos estão em leitura.
        </p>
      ) : null}

      <Input
        id="config-nome"
        label="Nome do evento"
        value={values.nome}
        onChange={(e) => set('nome', e.target.value)}
        errorMessage={erros.nome ?? ''}
        disabled={disabled}
        placeholder="Meia Maratona Floripa 2026"
      />

      <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <Input
          id="config-local"
          label="Local"
          value={values.local}
          onChange={(e) => set('local', e.target.value)}
          disabled={disabled}
          placeholder="Florianópolis, SC"
        />
        <Input
          id="config-capacidade"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          label="Capacidade (vagas)"
          value={values.capacidade}
          onChange={(e) => set('capacidade', e.target.value)}
          errorMessage={erros.capacidade ?? ''}
          disabled={disabled}
          placeholder="Deixe vazio se usa a soma dos kits"
        />
      </div>

      {/* usaChip (RN-207): false faz o balcão suprimir o passo de chip. */}
      <Switch
        id="config-usa-chip"
        label="Usa chip de cronometragem"
        description="Desligado, o balcão de entrega pula o passo de vincular chip (RN-207)."
        checked={values.usaChip}
        disabled={disabled}
        onCheckedChange={(checked) => set('usaChip', checked)}
      />

      {/* Read-only: URL pública + contexto travado (editado na criação/lotes). */}
      <div className="flex flex-col gap-[var(--spacing-4)] border-t-[length:var(--border-width-thin)] border-t-[color:var(--border-subtle)] pt-[var(--spacing-5)]">
        <Input
          id="config-url-publica"
          label="URL pública"
          value={urlPublicaEvento(evento.slug)}
          readOnly
          disabled
          wrapperClassName="max-w-xl"
        />
        <div className="flex flex-col gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
            Data e modalidades
          </span>
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Data e percursos são editados na criação do evento e nos lotes (travados
            após a primeira venda).
          </p>
          <div className="flex flex-wrap items-center gap-[var(--spacing-2)]">
            {formatDataEvento(evento.data) ? (
              <Badge variant="neutro">{formatDataEvento(evento.data)}</Badge>
            ) : null}
            <Badge variant={evento.status === 'rascunho' ? 'neutro' : 'vitoria'}>
              {evento.status}
            </Badge>
            {evento.modalidades.map((m) => (
              <Badge key={m} variant="neutro">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {podeEditar ? (
        <div className="flex items-center gap-[var(--spacing-3)]">
          <Button type="submit" variant="primary" disabled={disabled}>
            {salvando ? 'Salvando…' : 'Salvar configurações'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

ConfigGeraisForm.displayName = 'ConfigGeraisForm';
