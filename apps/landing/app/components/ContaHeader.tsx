'use client';
// =============================================================================
// ContaHeader — o slot de conta do header público (S1221-T1).
//
// Substitui o link "Entrar" que apontava para OUTRA origem (o painel do
// organizador). Aqui "Entrar" é um BOTÃO: abre o overlay no meio da página e
// devolve a pessoa exatamente onde ela estava. A porta do organizador não
// morre — ela continua no rodapé, sob a navegação "Organizador", e o "Criar
// conta de organizador" segue no header ao lado deste slot.
//
// POR QUE UM SLOT DE CLIENTE DENTRO DE UM HEADER DE SERVIDOR: o `PublicHeader`
// é Server Component e assim deve ficar (marca, SEO, zero JS). Só este pedaço
// depende do estado de autenticação do navegador, então só ele atravessa o
// boundary — o custo de JS fica confinado ao slot, não ao header inteiro.
//
// ESTADO DE CARREGAMENTO: enquanto o SDK não resolve quem é, o slot mostra
// "Entrar". É a aposta certa (a esmagadora maioria das visitas é deslogada) e
// evita reservar espaço vazio no header; quando a sessão resolve nomeada, o
// slot troca. O contrário — esconder tudo até saber — faria o header pular de
// largura em toda carga de página.
// =============================================================================

import { useRef, useState } from 'react';
import { logout } from '@leela/api-client';
import { ctaMeusPedidos } from '@/lib/areaDoCliente';
import { rotuloDaConta, useSessaoLeela } from '@/lib/sessao';
import { EntrarOverlay } from './EntrarOverlay';
import { RodapeEsqueciSenha } from './RodapeEsqueciSenha';

const CLASSE_ACAO =
  'whitespace-nowrap rounded-ds-sm px-2 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:px-3';

export function ContaHeader(): React.JSX.Element {
  const sessao = useSessaoLeela();
  const [aberto, setAberto] = useState(false);
  const botaoEntrar = useRef<HTMLButtonElement>(null);

  if (sessao.nomeado) {
    // REV-AREACLIENTE · o rótulo é o CAMINHO para a área, não um enfeite. Até
    // aqui `/minha-conta` só era alcançável logo depois de comprar (o CTA do
    // checkout) ou logo depois de definir a senha — quem voltasse ao site no
    // dia seguinte, já logado, não tinha por onde chegar na própria casa. A
    // área existe justamente para o retorno de outro aparelho, sem depender de
    // e-mail nenhum, e sem porta ela era uma casa sem rua.
    //
    // A trava é a MESMA das outras duas jornadas (`areaDoCliente.ts`), e por
    // isso a decisão continua sendo UMA: se `AREA_CLIENTE_NO_AR` voltar a
    // `false`, este rótulo volta a ser texto, e não vira o terceiro lugar do
    // código com opinião própria sobre a rota.
    const destino = ctaMeusPedidos();
    const rotulo = rotuloDaConta(sessao);
    const CLASSE_ROTULO = 'max-w-xs truncate rounded-ds-sm text-sm font-medium text-text-primary';
    return (
      <span className="flex items-center gap-1 sm:gap-2">
        {destino !== null ? (
          <a
            href={destino.href}
            className={`${CLASSE_ROTULO} transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus`}
            data-slot="conta-rotulo"
          >
            {rotulo}
          </a>
        ) : (
          <span className={CLASSE_ROTULO} data-slot="conta-rotulo">
            {rotulo}
          </span>
        )}
        <button type="button" className={CLASSE_ACAO} onClick={() => void logout()}>
          Sair
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        ref={botaoEntrar}
        // `data-slot` marca o ABRIDOR: com o overlay aberto existem dois
        // botões "Entrar" no documento (este e o submit do formulário), o que
        // é correto na tela — o modal é `aria-modal` e o header fica inerte
        // atrás dele — mas ambíguo para uma query por papel+nome.
        data-slot="abrir-entrar"
        className={CLASSE_ACAO}
        onClick={() => setAberto(true)}
      >
        Entrar
      </button>
      <EntrarOverlay
        open={aberto}
        onOpenChange={setAberto}
        returnFocusRef={botaoEntrar}
        description="Entre para ver seus ingressos e suas compras."
        rodape={<RodapeEsqueciSenha />}
      />
    </>
  );
}

ContaHeader.displayName = 'ContaHeader';
