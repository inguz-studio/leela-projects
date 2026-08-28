// =============================================================================
// EventoForm — formulário "Novo evento" (S201-T1 · REVISÃO RN-153).
//
// Coleta o que a página pública mobile precisa (wireframe Figma 112-4622, tela
// "Corrida do Campeche"): capa, nome, data + horário, endereço/local, descrição,
// regulamento e a lista ESTRUTURADA de modalidades (sugestões 5k/10k/21k/42k +
// entrada livre). Layout em COLUNA CENTRAL (não full-width). Os campos usam o
// primitivo de form no padrão flat (default global do DS — LEELA-FLAT-DEFAULT).
//
// LOTES/PREÇOS NÃO entram no cadastro (RN-153): os `percursos` que o servidor
// exige (min 1, RN-200) são DERIVADOS das modalidades com preço 0 (a definir na
// aba Modalidades). Presentational + controlado; submit via porta injetada.
//
// TAXA (RN-347 · ATIVADO): o callable `criarEvento` já aceita e persiste
// `taxaModo` por evento (input > default do tenant > 'incorporada'); o toggle
// abaixo é REAL e sempre envia a escolha do organizador (WYSIWYG). Após a 1ª
// venda a troca congela (Rules) — isso é tratado na aba Configurações.
//
// CAPA (CEV · RN-228 — pendência UPSW PAGA): upload-only (RN-168) em modo
// DEFERRED — o doc do evento ainda NÃO existe no submit e as storage.rules
// negam upload p/ evento inexistente (fail-closed do firestore.get). Então:
// selecionar → valida RN-228 (jpeg/png/gif ≤2MB) → crop 1.9:1 client-side →
// arquivo fica em memória + prévia local (blob:); após o criarEvento devolver
// o eventoId, a capa sobe (`onUploadCapa`) e persiste (`onSalvarCapa`, merge
// cirúrgico de `imagemUrl`). Falha na capa NÃO desfaz o evento: toast honesto
// e a capa fica para a aba Configurações.
//
// LACUNA ainda registrada (fora de escopo desta task):
//   - REGULAMENTO: coletado p/ fidelidade, não enviado por esta tela. Ver REPORT.
// =============================================================================

import * as React from 'react';
import { Button, Chip, Input, Switch, Textarea, useToast } from '@leela/design-system';
import { DateField } from '@/components/fields/DateField';
import { ImageUploadField } from '@/components/upload';
import { problemaDoArquivoCapaEvento, CAPA_EVENTO_MAX_BYTES } from '@leela/api-client';
import {
  SUGESTOES_MODALIDADE_EVENTO,
  dataHoraLocalParaDate,
  isDataHoraLocalISO,
} from '@leela/core';
import {
  CAPA_EVENTO_ASPECTO,
  CAPA_EVENTO_HINT,
  CAPA_EVENTO_MAX_LADO_PX,
} from '../_lib/capaEvento';
import type { CriarEventoFn, CriarEventoInput, CriarEventoResult } from '../_data/contracts';
import { toastErroCriarEvento } from './erros';
import { validaNovoEvento, type ErrosNovoEvento, type NovoEventoFormValues } from './validacao';

export interface EventoFormProps {
  onCriarEvento: CriarEventoFn;
  onSuccess?: (result: CriarEventoResult) => void;
  /**
   * Sobe a capa APÓS a criação (CEV · RN-228): seam `uploadCapaEvento`
   * injetado pelo container. Opcional: sem as duas portas de capa, o bloco
   * de capa não renderiza (tela degrada para o cadastro sem capa).
   */
  onUploadCapa?: (eventoId: string, file: File) => Promise<string>;
  /** Persiste `imagemUrl` pós-create (merge cirúrgico `salvarCapaEvento`). */
  onSalvarCapa?: (eventoId: string, imagemUrl: string) => Promise<void>;
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

// Sugestões de distância (RN-153) — clique adiciona/remove; o organizador
// também digita modalidades livres (ex.: "Kids 1k", "Trail 15k").
//
// ⛔ A lista VIVE NO CORE desde a onda C da leva 22 (S316-T4). Ela era uma
// const local deste arquivo, e a criação, a aba Modalidades e o editor de kit
// descreviam modalidade cada uma do seu jeito — as "três línguas" que a onda A
// apontou e adiou de propósito. Nenhum catálogo novo nasceu: a lista é a mesma,
// mudou de casa. E ela é SUGESTÃO, nunca vocabulário fechado — a RN-578 trata a
// modalidade do evento como string livre, e fechar a lista quebraria evento vivo.
const SUGESTOES_MODALIDADE = SUGESTOES_MODALIDADE_EVENTO;

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

export function EventoForm({
  onCriarEvento,
  onSuccess,
  onUploadCapa,
  onSalvarCapa,
}: EventoFormProps): JSX.Element {
  const { toast } = useToast();
  const [values, setValues] = React.useState<NovoEventoFormValues>(VALORES_INICIAIS);
  const [erros, setErros] = React.useState<ErrosNovoEvento>({});
  const [modalidadeDraft, setModalidadeDraft] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  // Capa em modo DEFERRED (CEV): o arquivo CROPADO fica aqui até o criarEvento
  // devolver o eventoId (as Rules negam upload p/ evento inexistente). O
  // `values.capa` guarda a object URL da prévia (blob:) — revogada na troca.
  const capaFileRef = React.useRef<File | null>(null);
  // Espelho da prévia vigente p/ o cleanup de UNMOUNT (review antagonista CEV
  // BAIXO-2): navegar após criar (ou sair da tela) revoga a object URL — sem
  // blob vivo até o unload da página.
  const previaCapaRef = React.useRef<string>('');
  React.useEffect(() => {
    return () => {
      revogarPreviaCapa(previaCapaRef.current);
    };
  }, []);

  function set<K extends keyof NovoEventoFormValues>(campo: K, valor: NovoEventoFormValues[K]) {
    setValues((v) => ({ ...v, [campo]: valor }));
  }

  /** Solta a prévia anterior (blob:) antes de trocar/limpar — sem vazamento. */
  function revogarPreviaCapa(atual: string) {
    if (atual.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(atual);
      } catch {
        /* jsdom sem createObjectURL — inofensivo */
      }
    }
  }

  /**
   * "Upload" deferred da capa: valida RN-228 no arquivo JÁ cropado (o
   * ImageUploadField valida genérico + cropa antes de chamar isto), guarda o
   * File em memória e devolve uma object URL para a prévia WYSIWYG. O upload
   * REAL acontece no submit, após o criarEvento. Throw vira erro inline.
   */
  async function guardarCapa(file: File): Promise<string> {
    const problema = problemaDoArquivoCapaEvento(file);
    if (problema) throw new Error(problema);
    revogarPreviaCapa(values.capa);
    capaFileRef.current = file;
    let previa: string;
    try {
      previa = URL.createObjectURL(file);
    } catch {
      // Runtime sem createObjectURL (jsdom): sem prévia, mas o arquivo segue
      // pendente — sentinela `blob:` para o campo indicar "tem imagem".
      previa = 'blob:capa-pendente';
    }
    previaCapaRef.current = previa;
    return previa;
  }

  function onCapaChange(url: string) {
    if (url === '') {
      // Remover: solta a prévia e esquece o arquivo pendente.
      revogarPreviaCapa(values.capa);
      capaFileRef.current = null;
      previaCapaRef.current = '';
    }
    set('capa', url);
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
        // preços/lotes ficam na aba Modalidades. preco 0 = "a definir" (RN-200 ≥ 0).
        percursos: values.modalidades.map((m) => ({ nome: m, preco: 0 })),
        // RN-347: sempre envia a escolha do organizador (WYSIWYG). O servidor
        // aceita e persiste; input explícito prevalece sobre o default do tenant.
        taxaModo: values.repassarTaxa ? 'repassada' : 'incorporada',
      };
      const descricao = values.descricao.trim();
      if (descricao) input.descricao = descricao;
      const result = await onCriarEvento(input);
      // Capa deferred (CEV · RN-228): agora o doc existe — sobe e persiste.
      // Falha aqui NÃO desfaz o evento criado: toast honesto e a capa fica
      // para a aba Configurações (mesmo campo, mesmo fluxo canônico).
      const capaFile = capaFileRef.current;
      let capaFalhou = false;
      if (capaFile && onUploadCapa && onSalvarCapa) {
        try {
          const imagemUrl = await onUploadCapa(result.eventoId, capaFile);
          await onSalvarCapa(result.eventoId, imagemUrl);
        } catch {
          capaFalhou = true;
        }
      }
      toast({
        variant: 'success',
        title: 'Rascunho criado',
        description: `"${values.nome.trim()}" foi salvo como rascunho.`,
      });
      if (capaFalhou) {
        toast({
          variant: 'danger',
          title: 'A capa não foi enviada',
          description:
            'O evento foi criado sem capa. Envie a imagem de novo em Configurações do evento.',
        });
      }
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
      className="mx-auto flex w-full max-w-2xl flex-col gap-[var(--spacing-6)] px-[var(--spacing-6)] py-[var(--spacing-4)]"
    >
      <header className="flex flex-col gap-[var(--spacing-1)]">
        <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          Novo evento
        </h1>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Preencha o que a página pública do evento exibe. Preços e lotes são configurados
          depois, na aba Modalidades — onde também dá para acrescentar, renomear e remover
          modalidade enquanto o evento não vender.
        </p>
      </header>

      {/* Capa (hero) — UPLOAD-ONLY (RN-168) em modo DEFERRED (CEV · RN-228):
          o arquivo é validado (jpeg/png/gif ≤2MB) + cropado 1.9:1 na seleção;
          a prévia é local (blob:) e o upload real acontece após o criarEvento
          (as Rules exigem o doc existir). Sem as portas de capa, degrada para
          o cadastro sem capa (a aba Configurações cobre). */}
      {onUploadCapa && onSalvarCapa ? (
        <div className="flex flex-col gap-[var(--spacing-1)]">
          <ImageUploadField
            id="capa-evento"
            label="Imagem de capa"
            hint={CAPA_EVENTO_HINT}
            value={values.capa}
            onChange={onCapaChange}
            onUpload={guardarCapa}
            aspecto={CAPA_EVENTO_ASPECTO}
            maxLadoPx={CAPA_EVENTO_MAX_LADO_PX}
            maxBytes={CAPA_EVENTO_MAX_BYTES}
            previewAlt="Prévia da capa do evento"
            permiteRemover
            removerLabel="Remover capa"
          />
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            A capa sobe junto com a criação do rascunho. Sem capa, a página pública usa o
            gradiente do tema — você pode publicar sem capa.
          </span>
        </div>
      ) : null}

      <Input
        id="nome"
        label="Nome do evento"
        value={values.nome}
        onChange={(e) => set('nome', e.target.value)}
        errorMessage={erros.nome ?? ''}
        placeholder="Corrida do Campeche 2026"
      />

      {/* Data + horário. Horário é opcional (o servidor aceita ISO com hora). */}
      <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <DateField
          id="data"
          label="Data da prova"
          value={values.data}
          onChange={(data) => set('data', data)}
          errorMessage={erros.data ?? ''}
        />
        <Input
          id="hora"
          type="time"
          label="Horário (opcional)"
          value={values.hora}
          onChange={(e) => set('hora', e.target.value)}
        />
      </div>

      <Input
        id="local"
        label="Endereço / local"
        value={values.local}
        onChange={(e) => set('local', e.target.value)}
        errorMessage={erros.local ?? ''}
        placeholder="Av. Campeche, 1000 — Florianópolis, SC"
      />

      <Textarea
        id="descricao"
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
          Serviço
        </legend>
        <Switch
          id="repassar-taxa"
          label="Repassar o Serviço ao comprador"
          description="Desligado (padrão): Serviço incorporado — o comprador paga o preço de face e o Serviço sai do seu repasse. Ligado: Serviço repassado — o comprador paga o preço de face + o Serviço."
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
