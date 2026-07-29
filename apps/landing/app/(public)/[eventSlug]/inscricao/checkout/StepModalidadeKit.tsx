'use client';

import * as React from 'react';
import { PackageOpen } from 'lucide-react';
import { parseSufixoTamanho, sufixoSku, type CorteItem } from '@leela/core';
import { Badge, RadioCard, RadioGroup } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { ItemTamanhadoPublico, KitPublico } from '@/lib/tipos';
import { itensTamanhadosDoKit, kitsDaModalidade, type InscritoForm } from './tipos';
import { KitDetalhe } from './KitDetalhe';
import { CardAtleta, BotaoAdicionarAtleta } from './CardAtleta';
import { CupomCampo, type CupomCampoProps } from './CupomCampo';
import { TituloEtapa, ApoioEtapa } from './tipografia';

/** Rótulo do delta do kit (RN-211: negativo = desconto; 0 = incluso). */
function labelDeltaKit(preco: number): string {
  if (preco === 0) return 'Incluso';
  if (preco < 0) return `Desconto ${formatarPreco(Math.abs(preco))}`;
  return `+ ${formatarPreco(preco)}`;
}

/** Rótulos pt-BR do corte (RN-231). */
const CORTE_LABEL: Record<CorteItem, string> = {
  feminina: 'Feminina',
  masculina: 'Masculina',
  unissex: 'Unissex',
};

/**
 * Seletor de corte→tamanho de UM item tamanhado (RN-231 · TAMANHOS-GRADE),
 * na ORDEM RATIFICADA: o atleta escolhe o CORTE primeiro e SÓ ENTÃO vê os
 * tamanhos daquele corte; item de grade única (só unissex) pula direto para
 * o tamanho. O valor emitido é o SUFIXO de SKU ('M' | 'feminina__M') — o
 * mesmo formato que o servidor valida fail-closed e persiste no inscrito.
 */
function SeletorGradeItem({
  item,
  inscritoIndex,
  valor,
  onChange,
  errorMessage,
}: {
  item: ItemTamanhadoPublico;
  inscritoIndex: number;
  /** Sufixo escolhido ('' = nenhum). */
  valor: string;
  onChange: (sufixo: string) => void;
  errorMessage: string;
}): React.JSX.Element {
  const soUnissex = item.grade.length === 1 && item.grade[0]!.corte === 'unissex';
  const escolhido = valor.length > 0 ? parseSufixoTamanho(valor) : null;
  // Corte em foco: o da escolha completa OU o corte tocado (tamanho pendente).
  const [cortePendente, setCortePendente] = React.useState<CorteItem | null>(null);
  const corteAtivo = escolhido?.corte ?? cortePendente;
  const linhaAtiva = corteAtivo ? (item.grade.find((g) => g.corte === corteAtivo) ?? null) : null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {!soUnissex ? (
        <RadioGroup
          name={`corte-${inscritoIndex}-${item.id}`}
          label={`${item.nome} — corte`}
          value={corteAtivo ?? ''}
          onValueChange={(v) => {
            // Trocar de corte INVALIDA o tamanho (a grade muda) — nada de
            // carregar 'M' da feminina para a masculina sem o atleta ver.
            setCortePendente(v as CorteItem);
            onChange('');
          }}
          errorMessage={linhaAtiva === null ? errorMessage : ''}
        >
          {item.grade.map((linha) => (
            <RadioCard
              key={linha.corte}
              value={linha.corte}
              title={CORTE_LABEL[linha.corte]}
              description={`Tamanhos ${linha.tamanhos.join(', ')}`}
            />
          ))}
        </RadioGroup>
      ) : null}

      {(soUnissex || linhaAtiva !== null) && (
        <RadioGroup
          name={`tamanho-${inscritoIndex}-${item.id}`}
          label={soUnissex ? `${item.nome} — tamanho` : 'Tamanho'}
          value={escolhido?.tamanho ?? ''}
          onValueChange={(t) => {
            const corte = soUnissex ? 'unissex' : (linhaAtiva?.corte ?? 'unissex');
            onChange(sufixoSku(corte, t));
          }}
          errorMessage={soUnissex || linhaAtiva !== null ? errorMessage : ''}
        >
          {(soUnissex ? item.grade[0]!.tamanhos : (linhaAtiva?.tamanhos ?? [])).map((t) => (
            <RadioCard key={t} value={t} title={t} description="" />
          ))}
        </RadioGroup>
      )}
    </div>
  );
}

/**
 * Etapa 1 — Modalidade e kit, por inscrito (ordem do mockup: modalidade → kit →
 * dados). O atleta escolhe a modalidade e SÓ ENTÃO vê os kits ofertados PARA
 * ela (RN-210: `kit.modalidades ∋ modalidade`). É a correção central do lote —
 * 5k nunca mostra Kit Ouro; 21k mostra Ouro/Prata/básico. Nada de preço somado
 * aqui: o total sai do core (cotação). O rótulo é o da modalidade ("10k") e o
 * NOME do kit ("Kit Prata"), NUNCA "tier" (RN-216).
 */
export function StepModalidadeKit({
  modalidades,
  kits,
  itensTamanhados,
  inscritos,
  euCorro,
  onInscrito,
  onAddInscrito,
  onRemoveInscrito,
  errosModalidade,
  errosKit,
  errosTamanhos,
  taxaRepassada,
  cupom,
}: {
  modalidades: { nome: string; precoVigente: number | null }[];
  kits: KitPublico[];
  /** Itens tamanhados com grade (RN-231) — coleta de corte→tamanho por kit. */
  itensTamanhados: ItemTamanhadoPublico[];
  inscritos: InscritoForm[];
  euCorro: boolean;
  onInscrito: (index: number, patch: Partial<InscritoForm>) => void;
  onAddInscrito: () => void;
  onRemoveInscrito: (index: number) => void;
  errosModalidade: (string | undefined)[];
  errosKit: (string | undefined)[];
  /** Erro por (inscrito × itemId) — tamanho obrigatório do item do kit. */
  errosTamanhos: Record<string, string>[];
  /** RN-347 (leitor · CKFORM-T4): `true` = evento repassa a taxa ao comprador. */
  taxaRepassada: boolean;
  /**
   * D-4 (S1209-T1): o campo de cupom aparece JÁ NO INÍCIO do fluxo. É o MESMO
   * componente do Resumo — o step 0 só recebe as props; a lógica (cotar com o
   * código, auto-apply do link, remover) segue única no CheckoutFlow.
   * `undefined` = step 0 sem cupom (usado nos testes de outras frentes).
   */
  cupom?: CupomCampoProps;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <TituloEtapa icone={PackageOpen}>Modalidade e kit</TituloEtapa>
        <ApoioEtapa>
          Escolha o percurso e o kit de cada atleta. O total aparece no resumo.
        </ApoioEtapa>
        {/* A-5 → CKFORM-T4 → TAXAFLEX (P-TAXAFLEX-6/RN-180): a nota é
            CONDICIONAL pelo flag real do evento (taxaRepassada do leitor —
            RN-347) e agora reflete que o VALOR varia por forma de pagamento
            (PIX vs cartão — o total de cada opção aparece no resumo). Nunca
            revela percentual nem soma nada local (valores da cotação). */}
        {taxaRepassada ? (
          <p className="mt-2 text-xs text-text-tertiary">
            Este evento repassa a taxa de serviço: ela varia conforme a forma de pagamento e entra
            no total exibido por opção no resumo, antes do pagamento.
          </p>
        ) : null}
      </div>

      {/* D-4 · cupom LOGO NO COMEÇO (paridade com a referência): quem chega com
          um código não precisa atravessar o fluxo inteiro para saber se ele
          cola. A validação é do SERVIDOR (cotação) — aqui não se calcula nada. */}
      {cupom ? <CupomCampo {...cupom} /> : null}

      {inscritos.map((inscrito, i) => {
        const ehVoce = euCorro && i === 0;
        const titulo = ehVoce ? 'Você' : `Atleta ${euCorro ? i : i + 1}`;
        const podeRemover = !ehVoce && inscritos.length > 1;
        const kitsOfertados = kitsDaModalidade(kits, inscrito.modalidade);
        const modalidadeEscolhida = inscrito.modalidade.length > 0;
        const kitSelecionado =
          inscrito.kitId.length > 0
            ? (kitsOfertados.find((k) => k.id === inscrito.kitId) ?? null)
            : null;
        // RN-231: itens tamanhados do kit escolhido — cada atleta escolhe o
        // SEU corte→tamanho (por inscrito, ADR-011).
        const itensDoKitEscolhido = itensTamanhadosDoKit(itensTamanhados, inscrito.kitId);

        return (
          <CardAtleta
            key={i}
            id={`atleta-${i}`}
            titulo={titulo}
            podeRemover={podeRemover}
            onRemover={() => onRemoveInscrito(i)}
          >
            {/* Modalidade — trocar a modalidade zera o kit (a oferta muda). */}
            <RadioGroup
              name={`modalidade-${i}`}
              label="Modalidade"
              value={inscrito.modalidade}
              onValueChange={(v) => onInscrito(i, { modalidade: v, kitId: '', tamanhos: {} })}
              errorMessage={errosModalidade[i] ?? ''}
            >
              {modalidades.map((m) => {
                const indisponivel = m.precoVigente === null;
                return (
                  <RadioCard
                    key={m.nome}
                    value={m.nome}
                    disabled={indisponivel}
                    title={m.nome}
                    description={indisponivel ? 'Sem lote disponível no momento' : 'Percurso oficial'}
                    badge={
                      <Badge variant={indisponivel ? 'neutro' : 'brand'}>
                        {indisponivel ? 'Indisponível' : formatarPreco(m.precoVigente)}
                      </Badge>
                    }
                  />
                );
              })}
            </RadioGroup>

            {/* Kit — filtrado pela modalidade escolhida (RN-210). */}
            <div className="mt-5">
              {!modalidadeEscolhida ? (
                <div>
                  <p className="text-sm font-medium text-text-primary">Kit</p>
                  <p className="mt-1 text-sm text-text-tertiary">
                    Escolha a modalidade para ver os kits disponíveis.
                  </p>
                </div>
              ) : kitsOfertados.length === 0 ? (
                <div>
                  <p className="text-sm font-medium text-text-primary">Kit</p>
                  <p className="mt-1 text-sm text-text-tertiary">
                    Nenhum kit para a modalidade {inscrito.modalidade} — a inscrição vai sem kit.
                  </p>
                </div>
              ) : (
                <RadioGroup
                  name={`kit-${i}`}
                  label="Kit"
                  value={inscrito.kitId}
                  onValueChange={(v) => onInscrito(i, { kitId: v, tamanhos: {} })}
                  errorMessage={errosKit[i] ?? ''}
                >
                  {kitsOfertados.map((k) => (
                    <RadioCard
                      key={k.id}
                      value={k.id}
                      title={k.nome}
                      description="Retirado nas janelas do evento, mediante documento."
                      badge={
                        <Badge variant={k.preco < 0 ? 'vitoria' : k.preco === 0 ? 'neutro' : 'brand'}>
                          {labelDeltaKit(k.preco)}
                        </Badge>
                      }
                    />
                  ))}
                </RadioGroup>
              )}
              {/* RN-231: com grade configurada o tamanho é escolhido AQUI
                  (corte → tamanho, por atleta); sem grade, mantém a nota do
                  fluxo antigo (confirmação na retirada). */}
              {itensDoKitEscolhido.length === 0 ? (
                <p className="mt-2 text-xs text-text-tertiary">
                  O tamanho do kit é confirmado na retirada, nas janelas do evento.
                </p>
              ) : (
                itensDoKitEscolhido.map((item) => (
                  <SeletorGradeItem
                    key={item.id}
                    item={item}
                    inscritoIndex={i}
                    valor={inscrito.tamanhos[item.id] ?? ''}
                    onChange={(sufixo) => {
                      // Corte trocado (sufixo '') REMOVE a escolha do item —
                      // nunca fica um tamanho de corte antigo no payload.
                      const { [item.id]: _fora, ...resto } = inscrito.tamanhos;
                      onInscrito(i, {
                        tamanhos:
                          sufixo.length > 0 ? { ...resto, [item.id]: sufixo } : resto,
                      });
                    }}
                    errorMessage={errosTamanhos[i]?.[item.id] ?? ''}
                  />
                ))
              )}

              {/* Frente 7: visão do kit escolhido — imagem 1:1, descrição e o
                  que está incluso, com hierarquia de H's/textos do DS. */}
              {kitSelecionado ? <KitDetalhe kit={kitSelecionado} /> : null}
            </div>
          </CardAtleta>
        );
      })}

      {/* D-2 · o botão que monta o pedido para várias pessoas. Vive AQUI, onde
          modalidade e kit do novo atleta são escolhidos no mesmo fôlego. */}
      <BotaoAdicionarAtleta onClick={onAddInscrito} />
    </div>
  );
}
