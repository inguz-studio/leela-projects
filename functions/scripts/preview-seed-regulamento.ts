// =============================================================================
// functions/scripts/preview-seed-regulamento.ts — seed ADITIVO de regulamento
// (pendência da lane LP-VENDAS-KIT / PAINEL-S8-FIX-T4).
//
// Problema: NENHUM evento do preview tinha o campo `regulamento`, então o modal
// de regulamento novo da landing (RegulamentoSection — renderiza só quando
// `evento.regulamento` é string não-vazia) nunca aparecia. Aqui publicamos um
// regulamento REAL (texto puro, várias seções, ≤ REGULAMENTO_MAX=50k) em 3
// eventos já semeados — sem criar/limpar nada.
//
// ADITIVO + IDEMPOTENTE (padrão R9-C — 2ª rodada byte-idêntica): faz set(merge)
// SÓ dos campos de regulamento e, antes de escrever, compara com o doc atual —
// se `regulamento` e `regulamentoVersao` já batem, é NO-OP (não escreve, não
// mexe em atualizadoEm). Quando escreve, usa timestamp FIXO em
// `regulamentoAtualizadoEm` (determinístico → re-run não difere).
//
// Emulator-only: guarda por FIRESTORE_EMULATOR_HOST (ex.: localhost:8180 do
// preview). Fora de functions/src → não entra em build/deploy/type-check de
// produção. Não toca functions/src (só LÊ os docIds canônicos de lá).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';

import { REGULAMENTO_MAX } from '@leela/core';
import { MEIA_FLORIPA_ID } from '../src/seed/eventos.seed';
import { INVERNO_ID, NOTURNA_ID } from './preview-seed-extra';

type Db = admin.firestore.Firestore;

// Versão vigente do regulamento publicado (RN-149). 1 = primeira publicação.
const REGULAMENTO_VERSAO = 1;

// Timestamp FIXO da publicação — determinístico p/ idempotência byte-idêntica.
const PUBLICADO_EM = admin.firestore.Timestamp.fromDate(
  new Date('2026-07-18T12:00:00.000Z'),
);

// ---------------------------------------------------------------------------
// Builder de regulamento (texto puro, seções numeradas). Cada evento recebe
// nome/percursos/largada próprios; a espinha (kit, cronometragem, saúde, LGPD)
// é comum a uma prova de rua real.
// ---------------------------------------------------------------------------

interface RegulamentoParams {
  nomeEvento: string;
  cidade: string;
  data: string;
  percursos: string;
  largada: string;
  premiacao: string;
}

function montarRegulamento(p: RegulamentoParams): string {
  const texto = `REGULAMENTO OFICIAL — ${p.nomeEvento}
${p.cidade} · ${p.data}

1. DO EVENTO
${p.nomeEvento} é uma prova de corrida de rua de participação individual, sem fins de recorde oficial, organizada sob este regulamento. A inscrição implica na aceitação integral e irrestrita de todos os termos aqui descritos. A organização reserva-se o direito de alterar itens deste regulamento por motivo de força maior, segurança ou determinação de autoridade pública, comunicando os participantes pelos canais oficiais.

2. CATEGORIAS E PERCURSOS
${p.percursos}
As faixas etárias seguem a idade completada pelo atleta no dia da prova. A categoria geral premia os primeiros colocados no tempo bruto (gun time); as faixas etárias usam o tempo líquido (net time) aferido pelo chip.

3. INSCRIÇÃO E KIT DO ATLETA
A inscrição é pessoal e intransferível. O kit contém número de peito, chip de cronometragem, camiseta oficial (conforme tamanho escolhido no ato da inscrição, sujeito à disponibilidade) e demais itens divulgados na página do evento. A retirada do kit ocorre nos dias e locais informados, mediante documento oficial com foto; a retirada por terceiro exige autorização assinada e cópia do documento do inscrito.

4. LARGADA E CRONOMETRAGEM
${p.largada}
O tempo é aferido por chip eletrônico; o atleta sem o chip fixado conforme orientação não terá tempo registrado nem constará na classificação. Os pórticos de largada e chegada são os pontos oficiais de controle. Atletas que não completarem o percurso dentro do tempo limite serão convidados a encerrar a participação por segurança.

5. HIDRATAÇÃO, PERCURSO E SUPORTE
O percurso contará com postos de hidratação distribuídos ao longo do trajeto e no pós-prova, sinalização, apoio de staff e cobertura de resgate/ambulância. É dever do atleta respeitar a sinalização, as orientações da equipe e as regras de trânsito nas áreas de tráfego compartilhado.

6. PREMIAÇÃO
${p.premiacao}
A premiação em pódio não é acumulativa entre geral e faixa etária: o atleta premiado no geral concorre normalmente na sua faixa, mas recebe apenas a maior premiação a que fizer jus, liberando a vaga seguinte na faixa. Eventuais premiações em dinheiro seguem as condições específicas divulgadas na página do evento.

7. SAÚDE E RESPONSABILIDADE
Ao se inscrever, o atleta declara estar em plenas condições físicas e de saúde para a prova, tendo realizado avaliação médica prévia por sua conta e risco. A organização não se responsabiliza por acidentes, lesões ou problemas de saúde decorrentes da participação. Recomenda-se acompanhamento médico e hidratação adequada antes, durante e após o evento.

8. DIREITOS DE IMAGEM E DADOS PESSOAIS (LGPD)
O atleta autoriza o uso de sua imagem, voz e nome nas peças de divulgação do evento, sem ônus, pelo prazo e territórios usuais deste tipo de material. Os dados pessoais são tratados exclusivamente para a organização da prova, cronometragem, comunicação e obrigações legais, conforme a Lei nº 13.709/2018 (LGPD), podendo o titular exercer seus direitos pelos canais oficiais informados na página do evento.

9. DISPOSIÇÕES GERAIS
Os casos omissos neste regulamento serão resolvidos pela organização, cuja decisão é soberana e irrecorrível. Dúvidas devem ser encaminhadas pelos canais oficiais de atendimento divulgados na página do evento. A participação confirma que o atleta leu, compreendeu e concorda com este regulamento na íntegra.`;

  // Guarda de tamanho — o campo é limitado no core (REGULAMENTO_MAX).
  return texto.slice(0, REGULAMENTO_MAX);
}

// ---------------------------------------------------------------------------
// Alvos: eventos JÁ semeados que ganham regulamento publicado.
// ---------------------------------------------------------------------------

const ALVOS: { id: string; regulamento: string }[] = [
  {
    id: MEIA_FLORIPA_ID,
    regulamento: montarRegulamento({
      nomeEvento: 'Meia Maratona de Florianópolis 2026',
      cidade: 'Florianópolis / SC',
      data: '27 de abril de 2026',
      percursos:
        'A prova oferece os percursos de 21 km (meia maratona), 10 km e 5 km. A meia maratona é válida para as categorias geral masculino, geral feminino e faixas etárias a partir de 18 anos.',
      largada:
        'A largada da meia maratona e do percurso de 10 km está prevista para as 6h; o percurso de 5 km larga em seguida, conforme o boletim final. O tempo limite da meia maratona é de 3 horas.',
      premiacao:
        'Recebem troféu os cinco primeiros colocados da geral (masculino e feminino) de cada percurso e os três primeiros de cada faixa etária. Todos os concluintes recebem medalha de participação.',
    }),
  },
  {
    id: INVERNO_ID,
    regulamento: montarRegulamento({
      nomeEvento: 'Corrida de Inverno de Florianópolis 2026',
      cidade: 'Florianópolis / SC',
      data: 'edição de inverno de 2026',
      percursos:
        'A prova oferece os percursos de 10 km e 5 km, nas categorias geral masculino, geral feminino e faixas etárias a partir de 16 anos (com autorização do responsável para menores de 18).',
      largada:
        'A largada única para os dois percursos está prevista para as 7h, com pelotões organizados por tempo estimado. O tempo limite é de 1h30.',
      premiacao:
        'Recebem troféu os três primeiros colocados da geral (masculino e feminino) de cada percurso e os três primeiros de cada faixa etária. Todos os concluintes recebem medalha.',
    }),
  },
  {
    id: NOTURNA_ID,
    regulamento: montarRegulamento({
      nomeEvento: 'Corrida Noturna Beira-Mar 2026',
      cidade: 'Florianópolis / SC',
      data: 'edição noturna de 2026',
      percursos:
        'A prova noturna oferece os percursos de 8 km e 4 km, nas categorias geral masculino, geral feminino e faixas etárias a partir de 16 anos.',
      largada:
        'A largada está prevista para as 19h30. Por ser prova noturna, é obrigatório o uso de material refletivo fornecido no kit e recomendável iluminação pessoal. O tempo limite é de 1h15.',
      premiacao:
        'Recebem troféu os três primeiros colocados da geral (masculino e feminino) de cada percurso. Todos os concluintes recebem medalha temática da edição noturna.',
    }),
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

interface Contagem {
  escritos: number;
  jaAtualizados: number;
  ausentes: number;
}

export async function seedPreviewRegulamento(db: Db): Promise<Contagem> {
  const contagem: Contagem = { escritos: 0, jaAtualizados: 0, ausentes: 0 };

  for (const alvo of ALVOS) {
    const ref = db.collection('eventos').doc(alvo.id);
    const snap = await ref.get();
    if (!snap.exists) {
      // Evento não semeado neste preview — nada a fazer (não criamos evento aqui).
      contagem.ausentes += 1;
      console.warn(`[seed-regulamento] evento ausente, pulando: ${alvo.id}`);
      continue;
    }

    const data = snap.data() ?? {};
    const jaIgual =
      data['regulamento'] === alvo.regulamento &&
      data['regulamentoVersao'] === REGULAMENTO_VERSAO;
    if (jaIgual) {
      // Idempotência: byte-idêntico ⇒ NO-OP (não reescreve atualizadoEm).
      contagem.jaAtualizados += 1;
      continue;
    }

    await ref.set(
      {
        regulamento: alvo.regulamento,
        regulamentoVersao: REGULAMENTO_VERSAO,
        regulamentoAtualizadoEm: PUBLICADO_EM,
      },
      { merge: true },
    );
    contagem.escritos += 1;
  }

  return contagem;
}

// ---------------------------------------------------------------------------
// Runner standalone (mesmo padrão do preview-seed-r14.ts)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const fsHost = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!fsHost) {
    throw new Error(
      '[seed-regulamento] FIRESTORE_EMULATOR_HOST precisa estar definido (ex.: localhost:8180). ' +
        'Abortando para nunca tocar produção.',
    );
  }
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  const db = admin.firestore();
  console.log(`[seed-regulamento] Firestore → ${fsHost} (projeto demo-leela)`);

  const c = await seedPreviewRegulamento(db);
  console.log(
    `[seed-regulamento] OK (aditivo/idempotente): escritos=${c.escritos} · ` +
      `já-atualizados=${c.jaAtualizados} · ausentes=${c.ausentes}`,
  );
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[seed-regulamento] ERRO:', err);
      process.exit(1);
    });
}
