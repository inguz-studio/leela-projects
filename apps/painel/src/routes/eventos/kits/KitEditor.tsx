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
  KIT_FOTOS_SECUNDARIAS_MAX,
  KIT_ITEM_MAX,
  KIT_ITENS_MAX,
  MSG_PRECO_BLOQUEADO,
  mensagemValorInvalido,
  parseValorPtBr,
  precoBloqueado,
  promoverFotoPrincipal,
  removerFotoPrincipal,
  type Evento,
  type GaleriaKit,
  type ItemKit,
  type Kit,
} from '@leela/core';
import {
  slotDeUploadFotoKit,
  uploadImagemKit,
  type SalvarKitInput,
  type SlotFotoKit,
} from '@leela/api-client';
import { trilhaComNavSpa } from '../../../lib/navSpa';
import type { ItemKitPayload } from './ItemKitModal';

export type KitPayload = Omit<SalvarKitInput, 'tenantId'>;

/** As três posições de foto, na ordem de exibição (S212-T2 · RN-425). */
const SLOTS_POSICAO: readonly SlotFotoKit[] = [1, 2, 3];

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
  // GALERIA (S212-T2 · RN-425/427) — três posições: a 1 é a principal
  // (`imagemUrl`, RN-227) e as outras duas são as secundárias. O estado tem a
  // forma do core (`GaleriaKit`) de propósito: assim "tornar principal" é a
  // função pura `promoverFotoPrincipal`, e não um rearranjo escrito à mão aqui
  // — que é o único jeito de violar a forma da RN-425 por descuido.
  const [galeria, setGaleria] = React.useState<GaleriaKit>(() => ({
    ...(kit?.imagemUrl !== undefined ? { imagemUrl: kit.imagemUrl } : {}),
    fotosSecundarias: kit?.fotosSecundarias ?? [],
  }));
  // A galeria inteira entra no payload só depois de tocada — `undefined` no
  // merge significa "não mexe no doc", e é o que preserva o que o organizador
  // já tinha. Um flag só para as duas posições, porque promover TROCA as duas.
  const [galeriaTocada, setGaleriaTocada] = React.useState(false);
  const [imgBusy, setImgBusy] = React.useState<SlotFotoKit | null>(null);
  const [imgErro, setImgErro] = React.useState<string | null>(null);
  const [itensSel, setItensSel] = React.useState<Set<string>>(
    () => new Set(kit ? itens.filter((i) => i.kits.includes(kit.id)).map((i) => i.id) : []),
  );
  const [erro, setErro] = React.useState<string | null>(null);
  // Recusa do preço em campo PRÓPRIO: o `erro` acima só é renderizado no campo
  // de nome (e só quando o nome está vazio), então uma recusa de preço ficava
  // no estado sem nunca chegar à tela — o botão "Salvar kit" simplesmente não
  // fazia nada. Numa tela de dinheiro isso não pode ficar mudo.
  const [precoErro, setPrecoErro] = React.useState<string | null>(null);
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

  // As três posições, na ordem de exibição: principal primeiro. `null` = vaga
  // livre. É esta lista que a UI desenha e que decide o slot do upload.
  const posicoes: (string | null)[] = [
    galeria.imagemUrl ?? null,
    (galeria.fotosSecundarias ?? [])[0] ?? null,
    (galeria.fotosSecundarias ?? [])[1] ?? null,
  ];

  /** Grava uma URL (ou a limpa) numa posição, preservando a forma da RN-425. */
  function gravarNaPosicao(posicao: SlotFotoKit, url: string | null): void {
    setGaleriaTocada(true);
    setGaleria((atual) => {
      if (posicao === 1) {
        // Remover a PRINCIPAL promove a primeira secundária (RN-427) — o kit
        // nunca fica com galeria e sem foto de listagem.
        if (url === null) return removerFotoPrincipal(atual);
        return { ...atual, imagemUrl: url };
      }
      const secundarias = [...(atual.fotosSecundarias ?? [])];
      const idx = posicao - 2;
      if (url === null) secundarias.splice(idx, 1);
      else if (idx < secundarias.length) secundarias[idx] = url;
      else secundarias.push(url);
      return { ...atual, fotosSecundarias: secundarias.slice(0, KIT_FOTOS_SECUNDARIAS_MAX) };
    });
  }

  // Upload 1:1 da foto do kit (RN-227/427) — upload-only (sem URL colada,
  // padrão R5): o seam valida tipo/tamanho + proporção 1:1 antes de subir e
  // devolve a downloadURL. Para kit novo, o kitId é o slug do nome (mesmo id do
  // save).
  //
  // O SLOT não é a posição. "Tornar principal" troca as URLs no documento e não
  // move byte nenhum no bucket, então depois de uma troca a posição 1 pode
  // estar apontando para o objeto do slot 2 — e gravar ali por cima mataria a
  // foto principal de uma tela que ninguém tocou. `slotDeUploadFotoKit`
  // resolve: reenvia no objeto que a posição já usa (a propriedade
  // "sobrescreve sem órfão" da RN-227) ou pega um slot que ninguém está usando.
  async function onImagemSelecionada(posicao: SlotFotoKit, file: File): Promise<void> {
    const kitId = kit?.id ?? slugify(nome);
    if (kit === null && nome.trim().length === 0) {
      setImgErro('Informe o nome do kit antes de enviar a imagem.');
      return;
    }
    setImgBusy(posicao);
    setImgErro(null);
    try {
      const slot = slotDeUploadFotoKit(posicoes, posicao, evento.id, kitId);
      const url = await uploadImagemKit(evento.id, kitId, file, slot);
      gravarNaPosicao(posicao, url);
      toast({ title: 'Foto do kit enviada', variant: 'success' });
    } catch (e) {
      setImgErro(e instanceof Error ? e.message : 'Falha ao enviar a imagem.');
    } finally {
      setImgBusy(null);
    }
  }

  function removerFoto(posicao: SlotFotoKit): void {
    gravarNaPosicao(posicao, null);
    setImgErro(null);
  }

  /** "Tornar principal" na posição 2 ou 3 — TROCA, nunca copia (RN-427). */
  function tornarPrincipal(posicao: SlotFotoKit): void {
    setGaleriaTocada(true);
    setGaleria((atual) => promoverFotoPrincipal(atual, posicao - 2));
    setImgErro(null);
  }

  async function salvar(): Promise<void> {
    if (nome.trim().length === 0) {
      setErro('Informe o nome do kit.');
      return;
    }
    // Preço pelo parser único do core (FIX-PARSE-DINHEIRO): "1.234,56" virava
    // 1.234 no `parseFloat` e o kit era gravado a R$ 1,23. Negativo continua
    // válido aqui (RN-211), e a recusa agora diz o que fazer em vez de repetir
    // "inválido" para todo texto que ela não entendeu.
    const lido = parseValorPtBr(precoStr);
    if (!lido.ok) {
      setPrecoErro(mensagemValorInvalido(lido.motivo));
      return;
    }
    setPrecoErro(null);
    const preco = lido.centavos / 100;
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
      // Galeria: as DUAS posições viajam juntas, porque promover troca as duas.
      // Sem toque nenhum, nenhuma das duas entra e o merge preserva o doc.
      if (galeriaTocada) {
        payload.imagemUrl = galeria.imagemUrl ?? null;
        payload.fotosSecundarias = galeria.fotosSecundarias ?? [];
      }
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
          onChange={(e) => {
            setPrecoStr(e.target.value);
            setPrecoErro(null);
          }}
          disabled={bloqueado}
          {...(bloqueado
            ? { errorMessage: MSG_PRECO_BLOQUEADO }
            : precoErro !== null
              ? { errorMessage: precoErro }
              : {})}
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

      {/* Galeria do kit (S212-T2 · RN-425/426/427) — três posições, upload-only
          (sem URL colada, padrão R5). A posição 1 é a que aparece nas
          listagens e no card; as outras duas só existem no detalhe do kit. */}
      <section aria-label="Fotos do kit" className="flex flex-col gap-[var(--spacing-3)]">
        <span className="text-[length:var(--font-size-xs)] uppercase text-[var(--text-tertiary)]">
          Fotos do kit (quadradas 1:1 · até 3)
        </span>
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          A primeira é a principal: é ela que aparece na lista de kits e no card de
          seleção. As outras duas aparecem só no detalhe do kit, como miniaturas.
        </p>
        <div className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3">
          {SLOTS_POSICAO.map((posicao) => {
            const url = posicoes[posicao - 1] ?? null;
            const principal = posicao === 1;
            const rotulo = principal ? 'Foto principal' : `Foto ${posicao}`;
            // A vaga 3 só abre depois da 2 — vaga vazia no meio produziria
            // buraco na fita de miniaturas, e a ordem do array É a ordem de
            // exibição (RN-425).
            const bloqueada = url === null && posicao === 3 && posicoes[1] === null;
            return (
              <div
                key={posicao}
                className="flex flex-col gap-[var(--spacing-2)]"
                data-posicao={posicao}
              >
                <span className="text-[length:var(--font-size-xs)] font-[var(--font-weight-semibold)] text-[var(--text-secondary)]">
                  {rotulo}
                </span>
                {url !== null ? (
                  <img
                    src={url}
                    alt={`Prévia da ${rotulo.toLowerCase()} do kit ${nome || ''}`.trim()}
                    className="aspect-square w-full rounded-[var(--radius-md)] object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="flex aspect-square w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-sunken)] text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]"
                  >
                    {bloqueada ? 'Envie a foto 2 antes' : 'Sem foto'}
                  </div>
                )}
                <FileInput
                  id={`kit-foto-${posicao}`}
                  label={`Enviar ${rotulo.toLowerCase()} (JPG, PNG, WebP, GIF ou AVIF · até 5MB)`}
                  buttonLabel={url !== null ? 'Trocar foto' : 'Escolher foto'}
                  busy={imgBusy === posicao}
                  disabled={bloqueada}
                  onFileSelected={(file) => void onImagemSelecionada(posicao, file)}
                  {...(imgErro !== null && imgBusy === null && posicao === 1
                    ? { errorMessage: imgErro }
                    : {})}
                  {...(principal
                    ? { hint: 'Quadrada (1:1). Aparece na página de vendas.' }
                    : {})}
                />
                {url !== null ? (
                  <div className="flex flex-wrap gap-[var(--spacing-2)]">
                    {!principal ? (
                      <Button
                        variant="secondary"
                        onClick={() => tornarPrincipal(posicao)}
                        disabled={imgBusy !== null}
                      >
                        Tornar principal
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      onClick={() => removerFoto(posicao)}
                      disabled={imgBusy !== null}
                    >
                      Remover
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
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
