// =============================================================================
// @leela/api-client — os dados do PRÓPRIO cliente (S1222-T3 · RN-450)
//
// Sobre `atletas/{uid}`, que é a identidade GLOBAL do cliente (ADR-009), e
// NUNCA sobre `profissionais/{uid}`, que é o perfil do organizador e já tem
// casa própria em `/conta` no painel (S020-T4). Uma conta que acumula cliente
// e organizador tem os DOIS documentos, e cada tela edita o seu — essa é a
// RN-450 escrita em código, e o caso de teste que a materializa precisa
// existir.
//
// O UID VEM DA SESSÃO, NUNCA DO CHAMADOR. As duas funções leem
// `getLeelaAuth().currentUser` em vez de aceitar um `uid` por parâmetro. As
// Rules já negariam o doc alheio (`request.auth.uid == atletaId`), mas um
// parâmetro de uid é um canal de input onde não precisa haver nenhum: sem
// canal, o vetor "passar o uid de outra pessoa" não existe para ser testado.
//
// `merge: true` na escrita: o doc carrega campos que esta tela não conhece
// (`criadoEm`, `avatarInit`) e que um `set` cheio apagaria. Postel na escrita,
// não só na leitura.
// =============================================================================

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getLeelaAuth, getLeelaDb } from './firebase';

/** O que a área do cliente lê e escreve do próprio cadastro. */
export interface MeusDadosCliente {
  /** Nome que a pessoa quer ser chamada. '' = ainda não informado. */
  nome: string;
  /** E-mail da conta — vem do Auth, e esta tela não o altera. */
  email: string;
}

function uidDaSessao(): string {
  const user = getLeelaAuth().currentUser;
  if (user === null) throw new Error('Sem sessão ativa.');
  if (user.isAnonymous) throw new Error('Sessão anônima não tem cadastro.');
  return user.uid;
}

/**
 * Lê o próprio cadastro. Doc ausente (conta criada pelo `contaSemFriccao`, que
 * nasce sem `atletas/{uid}` até o trigger rodar) devolve os campos vazios em
 * vez de erro: a tela abre o formulário para preencher, que é o que a pessoa
 * veio fazer.
 */
export async function lerMeusDados(): Promise<MeusDadosCliente> {
  const user = getLeelaAuth().currentUser;
  const uid = uidDaSessao();
  const snap = await getDoc(doc(getLeelaDb(), 'atletas', uid));
  const nome = snap.exists() ? (snap.get('nome') as unknown) : '';
  return {
    nome: typeof nome === 'string' ? nome : '',
    // O e-mail da CONTA é o do Auth, não o do doc: o doc pode carregar um
    // e-mail antigo, e mostrar endereço que não é o da sessão faria a pessoa
    // procurar o ingresso na caixa errada.
    email: user?.email ?? '',
  };
}

/**
 * Grava o próprio nome em `atletas/{uid}`.
 *
 * NÃO toca `profissionais/{uid}` — nem por merge, nem por trigger: não há
 * caminho daqui até lá. É a RN-450 do lado do cliente.
 */
export async function salvarMeusDados(dados: { nome: string }): Promise<void> {
  const uid = uidDaSessao();
  await setDoc(
    doc(getLeelaDb(), 'atletas', uid),
    { nome: dados.nome.trim() },
    { merge: true }
  );
}
