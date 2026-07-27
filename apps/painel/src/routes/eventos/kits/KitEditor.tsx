// =============================================================================
// KitEditor — edição de kit em TELA CHEIA (S206-T1 · substitui o modal de
// "tier"). Breadcrumb nível 4, 2 pontos de entrada (RN-217), identidade,
// modalidades (chips removíveis + select), preço (aceita negativo — RN-211;
// bloqueado após 1ª venda — RN-200), capacidade e checklist de itens (N:N,
// RN-215). Nomenclatura "kit", nunca "tier" (RN-216). Presentational.
// =============================================================================

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  Checkbox,
  Chip,
  FileInput,
  Input,
  Select,
  Textarea,
  useToast,
} from '@leela/design-system';
import {
  KIT_DESCRICAO_MAX,
  KIT_ITEM_MAX,
  KIT_ITENS_MAX,
  MSG_PRECO_BLOQUEADO,
  precoBloqueado,
  type Evento,
  type ItemKit,
  type Kit,
} from '@leela/core';
import { uploadImagemKit, type SalvarKitInput } from '@leela/api-client';
import { trilhaComNavSpa } from '../../../lib/navSpa';
import type { ItemKitPayload } from './ItemKitModal';

export type KitPayload = Omit<SalvarKitInput, 'tenantId'>;

export interface KitEditorProps {
  evento: Evento;
  /** Kit a editar; null = novo kit (2º ponto de entrada — RN-217). */
  kit: Kit | null;
  itens: ItemKit[];
  onSalvarKit: (kitId: string, input: KitPayload) => Promise<void>;
  onSalvarItem: (itemId: string, input: ItemKitPayload) => Promise<void>;
  onConcluir: () => void;
}

function slugify(nome: string): string {
  const base = nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base.length > 0 ? `kit-${base}` : `kit-${Date.now()}`;
}

export function KitEditor({
  evento,
  kit,
  itens,
  onSalvarKit,
  onSalvarItem,
  onConcluir,
}: KitEditorProps): JSX.Element {
  const { toast } = useToast();
  const navigate = useNavigate();
  const bloqueado = precoBloqueado(evento);

  const [nome, setNome] = React.useState(kit?.nome ?? '');
  const [precoStr, setPrecoStr] = React.useState(String(kit?.preco ?? 0));
  const [capacidadeStr, setCapacidadeStr] = React.useState(String(kit?.capacidade ?? 0));
  const [modalidades, setModalidades] = React.useState<string[]>(kit?.modalidades ?? []);
  const [novaModalidade, setNovaModalidade] = React.useState('');
  // Visão de compra (R9-C · RN-227/RN-230): descrição, itens[] e imagem 1:1.
  const [descricao, setDescricao] = React.useState(kit?.descricao ?? '');
  const [itensKit, setItensKit] = React.useState<string[]>(kit?.itens ?? []);
  const [novoItem, setNovoItem] = React.useState('');
  // `undefined` = campo não tocado (não mexe no doc no merge); `null` = imagem
  // removida (limpa o campo); string = URL http(s) do upload (RN-227).
  const [imagemUrl, setImagemUrl] = React.useState<string | null | undefined>(kit?.imagemUrl);
  const [imgBusy, setImgBusy] = React.useState(false);
  const [imgErro, setImgErro] = React.useState<string | null>(null);
  const [itensSel, setItensSel] = React.useState<Set<string>>(
    () => new Set(kit ? itens.filter((i) => i.kits.includes(kit.id)).map((i) => i.id) : []),
  );
  const [erro, setErro] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const disponiveis = evento.modalidades.filter((m) => !modalidades.includes(m));

  function addModalidade(m: string): void {
    const t = m.trim();
    if (t.length === 0 || modalidades.includes(t)) return;
    setModalidades((prev) => [...prev, t]);
    setNovaModalidade('');
  }
  function removeModalidade(m: string): void {
    setModalidades((prev) => prev.filter((x) => x !== m));
  }
  function toggleItem(id: string): void {
    setItensSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // "O que está incluso" (RN-230): linha de produto, ≤30 itens, ≤140 chars cada
  // (o core normaliza de novo no parse — aqui é UX).
  function addItemIncluso(valor: string): void {
    const t = valor.trim().slice(0, KIT_ITEM_MAX);
    if (t.length === 0 || itensKit.length >= KIT_ITENS_MAX) return;
    setItensKit((prev) => [...prev, t]);
    setNovoItem('');
  }
  function removeItemIncluso(idx: number): void {
    setItensKit((prev) => prev.filter((_, i) => i !== idx));
  }

  // Upload 1:1 da imagem do kit (RN-227) — upload-only (sem URL colada, padrão
  // R5): o seam valida tipo/tamanho + proporção 1:1 antes de subir e devolve a
  // downloadURL, que vira `Kit.imagemUrl`. Path `eventos/{id}/kits/{kitId}`; para
  // kit novo, o kitId é o slug do nome (mesmo id do save).
  async function onImagemSelecionada(file: File): Promise<void> {
    const kitId = kit?.id ?? slugify(nome);
    if (kit === null && nome.trim().length === 0) {
      setImgErro('Informe o nome do kit antes de enviar a imagem.');
      return;
    }
    setImgBusy(true);
    setImgErro(null);
    try {
      const url = await uploadImagemKit(evento.id, kitId, file);
      setImagemUrl(url);
      toast({ title: 'Imagem do kit enviada', variant: 'success' });
    } catch (e) {
      setImgErro(e instanceof Error ? e.message : 'Falha ao enviar a imagem.');
    } finally {
      setImgBusy(false);
    }
  }
  function removerImagem(): void {
    setImagemUrl(null);
    setImgErro(null);
  }

  async function salvar(): Promise<void> {
    if (nome.trim().length === 0) {
      setErro('Informe o nome do kit.');
      return;
    }
    const preco = Number.parseFloat(precoStr.replace(',', '.'));
    if (!Number.isFinite(preco)) {
      setErro('Preço inválido.');
      return;
    }
    const capacidade = Number.parseInt(capacidadeStr, 10);
    setBusy(true);
    try {
      const kitId = kit?.id ?? slugify(nome);
      // Visão de compra (R9-C): descrição (string vazia → null limpa o campo),
      // itens[] e imagem. `imagemUrl` só entra no payload quando tocado
      // (undefined = não mexe no merge), respeitando o contrato de `salvarKit`.
      const payload: KitPayload = {
        nome: nome.trim(),
        preco,
        capacidade: Number.isFinite(capacidade) ? capacidade : 0,
        modalidades,
        descricao: descricao.trim().slice(0, KIT_DESCRICAO_MAX) || null,
        itens: itensKit,
      };
      if (imagemUrl !== undefined) payload.imagemUrl = imagemUrl;
      await onSalvarKit(kitId, payload);
      // Sincroniza a pertinência N:N (RN-215): item.kits inclui/exclui este kit.
      await Promise.all(
        itens
          .filter((item) => {
            const antes = item.kits.includes(kitId);
            const agora = itensSel.has(item.id);
            return antes !== agora;
          })
          .map((item) => {
            const kits = itensSel.has(item.id)
              ? [...item.kits, kitId]
              : item.kits.filter((k) => k !== kitId);
            return onSalvarItem(item.id, {
              nome: item.nome,
              tamanhado: item.tamanhado,
              origem: item.origem,
              exibirLogo: item.exibirLogo,
              kits,
              ...(item.marca !== undefined ? { marca: item.marca } : {}),
            });
          }),
      );
      toast({ title: kit ? 'Kit atualizado' : 'Kit criado', variant: 'success' });
      onConcluir();
    } catch {
      toast({ title: 'Falha ao salvar o kit', variant: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <Breadcrumb
        items={trilhaComNavSpa(
          [
            { label: 'Eventos', href: '/eventos' },
            { label: evento.nome, href: `/eventos/${evento.slug}` },
            { label: 'Kits', href: `/eventos/${evento.slug}/kits` },
            { label: 'Cadastro', href: `/eventos/${evento.slug}/kits` },
            { label: kit ? kit.nome : 'Novo kit' },
          ],
          navigate,
        )}
      />

      <h1 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
        {kit ? `Editar ${kit.nome}` : 'Novo kit'}
      </h1>

      {/* Identidade */}
      <section aria-label="Identidade do kit" className="flex flex-col gap-[var(--spacing-4)]">
        <Input
          id="kit-nome"
          label="Nome do kit"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          {...(erro && nome.trim().length === 0 ? { errorMessage: erro } : {})}
        />
        <Textarea
          id="kit-descricao"
          label={`Descrição — aparece na página de vendas (${descricao.length}/${KIT_DESCRICAO_MAX})`}
          value={descricao}
          maxLength={KIT_DESCRICAO_MAX}
          rows={3}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </section>

      {/* Modalidades */}
      <section aria-label="Modalidades" className="flex flex-col gap-[var(--spacing-3)]">
        <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
          Modalidades
        </span>
        <div className="flex flex-wrap gap-[var(--spacing-2)]">
          {modalidades.length === 0 ? (
            <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
              Nenhuma modalidade.
            </span>
          ) : (
            modalidades.map((m) => (
              <Chip key={m} onRemove={() => removeModalidade(m)}>
                {m}
              </Chip>
            ))
          )}
        </div>
        <div className="flex items-end gap-[var(--spacing-2)]">
          <Select
            id="kit-add-modalidade"
            label="Adicionar modalidade"
            value={novaModalidade}
            onChange={(e) => setNovaModalidade(e.target.value)}
            options={[
              { value: '', label: 'Selecione…' },
              ...disponiveis.map((m) => ({ value: m, label: m })),
            ]}
          />
          <Button
            variant="secondary"
            disabled={novaModalidade === ''}
            onClick={() => addModalidade(novaModalidade)}
          >
            Adicionar
          </Button>
        </div>
      </section>

      {/* Preço + capacidade */}
      <section aria-label="Preço e capacidade" className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2">
        <Input
          id="kit-preco"
          label="Preço (delta sobre a inscrição, aceita negativo)"
          type="text"
          inputMode="decimal"
          value={precoStr}
          onChange={(e) => setPrecoStr(e.target.value)}
          disabled={bloqueado}
          {...(bloqueado ? { errorMessage: MSG_PRECO_BLOQUEADO } : {})}
        />
        <Input
          id="kit-capacidade"
          label="Capacidade"
          type="number"
          value={capacidadeStr}
          onChange={(e) => setCapacidadeStr(e.target.value)}
        />
      </section>

      {/* Checklist de itens */}
      <section aria-label="Itens do kit" className="flex flex-col gap-[var(--spacing-3)]">
        <div className="flex items-center justify-between">
          <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
            Itens do kit
          </span>
          <span role="status" className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {itensSel.size} {itensSel.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
        </div>
        {itens.length === 0 ? (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Nenhum item no catálogo. Adicione itens no cadastro.
          </p>
        ) : (
          <ul className="flex flex-col gap-[var(--spacing-2)]">
            {itens.map((item) => (
              <li key={item.id}>
                <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
                  <Checkbox
                    checked={itensSel.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                  {item.nome}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Imagem 1:1 do kit (RN-227) — upload-only (sem URL colada, padrão R5) */}
      <section aria-label="Imagem do kit" className="flex flex-col gap-[var(--spacing-3)]">
        <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
          Imagem do kit (quadrada 1:1)
        </span>
        <div className="flex items-start gap-[var(--spacing-4)]">
          {imagemUrl !== null && imagemUrl !== undefined ? (
            <img
              src={imagemUrl}
              alt={`Prévia da imagem do kit ${nome || ''}`.trim()}
              className="aspect-square w-24 shrink-0 rounded-[var(--radius-md)] object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex aspect-square w-24 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-sunken)] text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]"
            >
              Sem imagem
            </div>
          )}
          <div className="flex flex-col gap-[var(--spacing-2)]">
            <FileInput
              id="kit-imagem"
              label="Enviar imagem (JPG, PNG, WebP, GIF ou AVIF · até 5MB)"
              buttonLabel={imagemUrl ? 'Trocar imagem' : 'Escolher imagem'}
              busy={imgBusy}
              onFileSelected={(file) => void onImagemSelecionada(file)}
              {...(imgErro ? { errorMessage: imgErro } : {})}
              hint="A imagem deve ser quadrada (1:1). Aparece na página de vendas."
            />
            {imagemUrl !== null && imagemUrl !== undefined ? (
              <Button variant="ghost" onClick={removerImagem} disabled={imgBusy}>
                Remover imagem
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {/* "O que está incluso" (RN-230) — linha de produto exibida no checkout */}
      <section aria-label="O que está incluso" className="flex flex-col gap-[var(--spacing-3)]">
        <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
          O que está incluso ({itensKit.length}/{KIT_ITENS_MAX})
        </span>
        {itensKit.length === 0 ? (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            Nenhum item listado. Descreva o que o atleta recebe (ex.: camiseta, medalha).
          </p>
        ) : (
          <ul className="flex flex-col gap-[var(--spacing-2)]">
            {itensKit.map((item, idx) => (
              <li
                key={`${item}-${idx}`}
                className="flex items-center justify-between gap-[var(--spacing-2)] text-[length:var(--font-size-sm)] text-[var(--text-primary)]"
              >
                <span className="min-w-0 truncate">{item}</span>
                <Button variant="ghost" onClick={() => removeItemIncluso(idx)}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-[var(--spacing-2)]">
          <Input
            id="kit-novo-item"
            label="Adicionar item"
            value={novoItem}
            maxLength={KIT_ITEM_MAX}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItemIncluso(novoItem);
              }
            }}
          />
          <Button
            variant="secondary"
            disabled={novoItem.trim().length === 0 || itensKit.length >= KIT_ITENS_MAX}
            onClick={() => addItemIncluso(novoItem)}
          >
            Adicionar item
          </Button>
        </div>
      </section>

      <div className="flex justify-end gap-[var(--spacing-3)]">
        <Button variant="secondary" onClick={onConcluir} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={() => void salvar()} disabled={busy}>
          Salvar kit
        </Button>
      </div>
    </div>
  );
}

KitEditor.displayName = 'KitEditor';
