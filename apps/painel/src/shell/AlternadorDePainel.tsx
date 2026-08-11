// =============================================================================
// AlternadorDePainel — a travessia entre o Painel Master e o Painel do
// Organizador, para a conta que alcança os dois (PAPEL-DUPLO · T5).
//
// POR QUE ELE EXISTE. `role` era valor único: quem administrava a plataforma
// não era organizador de nada, e vice-versa. A capacidade `platformAdmin`
// desfez isso — o dono é `tenant_owner` da produtora dele E administra a
// plataforma. Sem alternador, a única forma de ir de um lado ao outro é digitar
// a URL, e o `destinoPosLogin` (que decide a porta de ENTRADA por precedência)
// mandaria a pessoa sempre para o mesmo lugar.
//
// AS TRÊS REGRAS DO COMPONENTE, e por que cada uma:
//
//   1. SÓ APARECE PARA QUEM ALCANÇA OS DOIS (`podeAlternar`). Um botão que
//      leva a um 403 é pior que botão nenhum: ele promete e o produto nega.
//      O `platform_admin` legado, que não tem tenant, não vê o alternador —
//      não há painel de organizador para onde ir.
//   2. ROTULA O DESTINO, não o estado. "Acessar painel master" diz para onde
//      o clique leva. Um rótulo de estado ("Painel do Organizador") num
//      controle clicável é a ambiguidade clássica do toggle: metade das
//      pessoas lê como "você está aqui" e a outra metade como "clique para ir
//      para cá", e as duas leituras são defensáveis.
//   3. NÃO DECIDE PERMISSÃO. Ele navega. Quem nega é o Firestore Rules e o
//      guard das Functions; do lado da tela, o `PlatformGuard` responde 403 a
//      quem chegar em `/plataforma` sem crachá. Este componente sumir por bug
//      não abre porta nenhuma, e ele aparecer por bug também não.
//
// Os destinos vêm de `destinoPosLogin` — as rotas já têm dono lá, e duplicá-las
// aqui criaria a segunda verdade que um dia diverge (contrato PAPEL-DUPLO T5).
// =============================================================================

import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@leela/design-system';
import {
  ROTA_PLATAFORMA,
  ROTA_VISAO_GERAL,
} from '../routes/conta/auth/_lib/destinoPosLogin';

/** Estamos dentro do painel master? Prefixo, para as sub-rotas contarem. */
export function estaNoPainelMaster(pathname: string): boolean {
  return pathname === ROTA_PLATAFORMA || pathname.startsWith(`${ROTA_PLATAFORMA}/`);
}

/**
 * O nome do painel em que a conta está agora (rótulo de contexto do shell).
 *
 * UXW-FIX · BLQ-19: devolvia "Painel do Organizador" enquanto o alternador, a
 * um clique de distância no MESMO rail, oferecia "Acessar painel profissional"
 * — o mesmo painel com dois nomes visíveis ao mesmo tempo. A RN-468 nomeia
 * "Painel Profissional", e é ela que manda. "Painel Master" fica do outro lado.
 */
export function nomeDoPainelAtual(pathname: string): string {
  return estaNoPainelMaster(pathname) ? 'Painel Master' : 'Painel Profissional';
}

/**
 * Para onde o alternador leva, e como ele se chama lá. @pure
 *
 * Rótulos NOVOS (D-1008-R6, na íntegra do dono: "o botão ir para o painel
 * master e ir para o painel do organizador pode mudar para Acessar painel
 * master e Acessar painel profissional"). "Profissional" é consistente com a
 * RN-468 ("Painel Profissional"). A regra 2 do componente segue: o rótulo é
 * o DESTINO, nunca o estado.
 */
export function travessia(pathname: string): { destino: string; rotulo: string } {
  return estaNoPainelMaster(pathname)
    ? { destino: ROTA_VISAO_GERAL, rotulo: 'Acessar painel profissional' }
    : { destino: ROTA_PLATAFORMA, rotulo: 'Acessar painel master' };
}

export interface AlternadorDePainelProps {
  /** A conta alcança os dois painéis? Vem de `paineisDaConta().podeAlternar`. */
  podeAlternar: boolean;
}

export function AlternadorDePainel({
  podeAlternar,
}: AlternadorDePainelProps): JSX.Element | null {
  const location = useLocation();
  const navigate = useNavigate();

  if (!podeAlternar) return null;

  const { destino, rotulo } = travessia(location.pathname);

  return (
    <Button
      variant="secondary"
      size="sm"
      className="w-full justify-start"
      onClick={() => navigate(destino)}
    >
      {/* Ícone decorativo: o rótulo já diz tudo, e um nome acessível duplicado
          faria o leitor de tela anunciar a ação duas vezes. */}
      <ArrowLeftRight aria-hidden className="size-4 shrink-0" />
      {rotulo}
    </Button>
  );
}

AlternadorDePainel.displayName = 'AlternadorDePainel';
