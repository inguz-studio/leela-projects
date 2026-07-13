// =============================================================================
// EventoForm — formulário "Novo evento" (S201-T1 · REVISÃO RN-153).
//
// Coleta o que a página pública mobile precisa (wireframe Figma 112-4622, tela
// "Corrida do Campeche"): capa, nome, data + horário, endereço/local, descrição,
// regulamento e a lista ESTRUTURADA de modalidades (sugestões 5k/10k/21k/42k +
// entrada livre). Layout em COLUNA CENTRAL (não full-width). Campos no
// experimento `variant="flat"` (LEELA-DS-FLAT-INPUTS) p/ o Vitor avaliar.
//
// LOTES/PREÇOS NÃO entram no cadastro (RN-153): os `percursos` que o servidor
// exige (min 1, RN-200) são DERIVADOS das modalidades com preço 0 (a definir na
// aba Lotes). Presentational + controlado; submit via porta injetada.
//
// TAXA (RN-347 · ATIVADO): o callable `criarEvento` já aceita e persiste
// `taxaModo` por evento (input > default do tenant > 'incorporada'); o toggle
// abaixo é REAL e sempre envia a escolha do organizador (WYSIWYG). Após a 1ª
// venda a troca congela (Rules) — isso é tratado na aba Configurações.
//
// LACUNAS ainda registradas (fora de escopo desta task):
//   - CAPA: só URL (sem upload/Storage no repo); `imagemUrl` não é enviado por
//     esta tela — coletada p/ fidelidade + preview.
//   - REGULAMENTO: coletado p/ fidelidade, não enviado por esta tela. Ver REPORT.
// =============================================================================

import * as React from 'react';
import { Button, Chip, Input, Switch, Textarea, useToast } from '@leela/design-system';
import { dataHoraLocalParaDate, isDataHoraLocalISO } from '@leela/core';
import type { CriarEventoFn, CriarEventoInput, CriarEventoResult } from '../_data/contracts';
import { toastErroCriarEvento } from './erros';
import { validaNovoEvento, type ErrosNovoEvento, type NovoEventoFormValues } from './validacao';

export interface EventoFormProps {
  onCriarEvento: CriarEventoFn;
  onSuccess?: (result: CriarEventoResult) => void;
}

const VALORES_INICIAIS: NovoEventoFormValues = {
  nome: '',
  descricao: '',
  data: '',
  hora: '',
  local: '',
  modalidades: [],
  capa: '',
  regulamento: '',
  repassarTaxa: false,
};

// Vocabulário fechado de distâncias (RN-153) — clique adiciona/remove; o
// organizador também digita modalidades livres (ex.: "Kids 1k", "Trail 15k").
const SUGESTOES_MODALIDADE = ['5k', '10k', '21k', '42k'] as const;

/**
 * Monta o campo `data` do input do servidor a partir da data (obrigatória) +
 * horário (opcional). Sem horário → date-only `yyyy-mm-dd` (o servidor ancora
 * na meia-noite civil do FUSO_EVENTO). Com horário → INSTANTE ISO calculado por
 * `dataHoraLocalParaDate` (parede lida no fuso do produto, DST-safe) — nunca
 * `new Date(parede)` cru, que deslocaria o instante pelo fuso do runtime. Os
 * dois shapes são aceitos pelo callable `criarEvento`.
 */
function montarDataEnvio(data: string, hora: string): string {
  if (!hora) return data;
  const parede = `${data}T${hora}`;
  if (!isDataHoraLocalISO(parede)) return data; // fallback seguro (date-only)
  return dataHoraLocalParaDate(parede).toISOString();
}

/** URL http(s) válida? Só p/ decidir se mostra a prévia da capa. @pure */
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

export function EventoForm({ onCriarEvento, onSuccess }: EventoFormProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<NovoEventoFormValues>(VALORES_INICIAIS);
  const [erros, setErros] = React.useState<ErrosNovoEvento>({});
  const [modalidadeDraft, setModalidadeDraft] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);

  function set<K extends keyof NovoEventoFormValues>(campo: K, valor: NovoEventoFormValues[K]) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  function addModalidade(m: string) {
    const nome = m.trim();
    if (nome.length === 0 || values.modalidades.includes(nome)) return;
    set('modalidades', [...values.modalidades, nome]);
  }

  function removeModalidade(m: string) {
    set('modalidades', values.modalidades.filter((x) => x !== m));
  }

  function toggleModalidade(m: string) {
    if (values.modalidades.includes(m)) removeModalidade(m);
    else addModalidade(m);
  }

  function addModalidadeDraft() {
    addModalidade(modalidadeDraft);
    setModalidadeDraft('');
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
        data: montarDataEnvio(values.data, values.hora),
        local: values.local.trim(),
        modalidades: values.modalidades,
        // Percursos DERIVADOS das modalidades (RN-153): sem preço no cadastro —
        // preços/lotes ficam na aba Lotes. preco 0 = "a definir" (RN-200 ≥ 0).
        percursos: values.modalidades.map((m) => ({ nome: m, preco: 0 })),
        // RN-347: sempre envia a escolha do organizador (WYSIWYG). O servidor
        // aceita e persiste; input explícito prevalece sobre o default do tenant.
        taxaModo: values.repassarTaxa ? 'repassada' : 'incorporada',
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

  const mostrarPrevia = urlDeImagemValida(values.capa);

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Novo evento"
      className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)] py-[var(--spacing-4)]"
    >
      <header className="flex flex-col gap-[var(--spacing-1)]">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          Novo evento
        </h1>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Preencha o que a página pública do evento exibe. Preços e lotes são configurados
          depois, na aba Lotes.
        </p>
      </header>

      {/* Capa (hero) — URL + preview. Upload é lacuna (ver REPORT). */}
      <div className="flex flex-col gap-[var(--spacing-2)]">
        <Input
          id="capa"
          variant="flat"
          type="url"
          inputMode="url"
          label="Imagem de capa (URL)"
          value={values.capa}
          onChange={(e) => set('capa', e.target.value)}
          placeholder="https://…/capa.jpg"
          aria-describedby="capa-hint"
        />
        <span id="capa-hint" className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Cole a URL da imagem. Upload de arquivo ainda não está disponível.
        </span>
        {mostrarPrevia ? (
          <div className="overflow-hidden rounded-[var(--card-radius)] bg-[var(--surface-sunken)]">
            <img
              src={values.capa.trim()}
              alt="Prévia da capa do evento"
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
        ) : null}
      </div>

      <Input
        id="nome"
        variant="flat"
        label="Nome do evento"
        value={values.nome}
        onChange={(e) => set('nome', e.target.value)}
        errorMessage={erros.nome ?? ''}
        placeholder="Corrida do Campeche 2026"
      />

      {/* Data + horário. Horário é opcional (o servidor aceita ISO com hora). */}
      <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <Input
          id="data"
          variant="flat"
          type="date"
          label="Data da prova"
          value={values.data}
          onChange={(e) => set('data', e.target.value)}
          errorMessage={erros.data ?? ''}
        />
        <Input
          id="hora"
          variant="flat"
          type="time"
          label="Horário (opcional)"
          value={values.hora}
          onChange={(e) => set('hora', e.target.value)}
        />
      </div>

      <Input
        id="local"
        variant="flat"
        label="Endereço / local"
        value={values.local}
        onChange={(e) => set('local', e.target.value)}
        errorMessage={erros.local ?? ''}
        placeholder="Av. Campeche, 1000 — Florianópolis, SC"
      />

      <Textarea
        id="descricao"
        variant="flat"
        label="Descrição / informações"
        value={values.descricao}
        onChange={(e) => set('descricao', e.target.value)}
        placeholder="Conte o que torna esta prova especial, largada, retirada de kit…"
        rows={4}
      />

      {/* Regulamento — texto longo. NÃO persiste hoje (ver REPORT). */}
      <div className="flex flex-col gap-[var(--spacing-1)]">
        <Textarea
          id="regulamento"
          variant="flat"
          label="Regulamento"
          value={values.regulamento}
          onChange={(e) => set('regulamento', e.target.value)}
          placeholder="Regras da prova, categorias, premiação, política de reembolso…"
          rows={6}
        />
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Ainda não é salvo no cadastro (o modelo do evento não tem campo de regulamento).
        </span>
      </div>

      {/* Modalidades estruturadas — sugestões + entrada livre (RN-153). */}
      <fieldset className="flex flex-col gap-[var(--spacing-2)]">
        <legend className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Modalidades
        </legend>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Distâncias/percursos do evento. Clique numa sugestão ou digite uma modalidade livre.
        </p>
        <div className="flex flex-wrap gap-[var(--spacing-2)]" aria-label="Sugestões de modalidade">
          {SUGESTOES_MODALIDADE.map((s) => (
            <Chip key={s} active={values.modalidades.includes(s)} onClick={() => toggleModalidade(s)}>
              {s}
            </Chip>
          ))}
        </div>
        <div className="flex items-end gap-[var(--spacing-2)]">
          <Input
            id="modalidade-draft"
            variant="flat"
            aria-label="Adicionar modalidade"
            value={modalidadeDraft}
            onChange={(e) => setModalidadeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addModalidadeDraft();
              }
            }}
            placeholder="Ex.: Kids 1k, Trail 15k"
            wrapperClassName="flex-1"
          />
          <Button variant="secondary" onClick={addModalidadeDraft}>
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

      {/* Taxa de serviço (RN-347) — toggle REAL: persiste `taxaModo` no cadastro. */}
      <fieldset className="flex flex-col gap-[var(--spacing-2)] rounded-[var(--card-radius)] bg-[var(--surface-sunken)] p-[var(--spacing-4)]">
        <legend className="px-[var(--spacing-1)] text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Taxa de serviço
        </legend>
        <Switch
          id="repassar-taxa"
          label="Repassar a taxa de serviço ao comprador"
          description="Desligado (padrão): taxa incorporada — o comprador paga o preço de face e a taxa sai do seu repasse. Ligado: taxa repassada — o comprador paga o preço de face + a taxa."
          checked={values.repassarTaxa}
          onCheckedChange={(checked) => set('repassarTaxa', checked)}
        />
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Você pode mudar isto nas Configurações do evento — até a primeira venda. Depois o modo
          fica travado (mexe em dinheiro de inscrições confirmadas).
        </span>
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
