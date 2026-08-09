// =============================================================================
// LoteModal — testes de componente (BUILD-LOTES-UX, achados do dono 2026-08-04).
//
// Três comportamentos que a tela precisa provar:
//   A. o aviso acende NO campo pendente (e o preço válido fica quieto);
//   C. lote com venda mostra o preço travado e a vaga com porta autorizada;
//   D. os lotes que já existem na modalidade aparecem DENTRO do formulário,
//      com vendidos · disponíveis · total, e a linha em edição acompanha o
//      total que está sendo digitado.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import type { Lote } from '@leela/core';
import { LoteModal } from '../LoteModal';
import { EXEMPLO_DE_MIL_NA_VAGA, REGUA_PONTO_E_VIRGULA } from '../../../../lib/textosDeCampo';
import { ts } from '../../_test/fixtures';
import { inputLocalParaDate } from '../_lib/loteForm';

function mkLote(over: Partial<Lote> & { modalidade: string; ordem: number }): Lote {
  const inicioEm = over.inicioEm ?? ts(inputLocalParaDate('2025-12-01T00:00')!);
  const fimEm = over.fimEm ?? ts(inputLocalParaDate('2026-02-01T00:00')!);
  return {
    id: `${over.modalidade}-lote-${over.ordem}`,
    tenantId: 'castelo',
    nome: `Lote ${over.ordem}`,
    quantidadeLimite: 300,
    preco: 60,
    vendidos: 0,
    criadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    ...over,
    inicioEm,
    fimEm,
  };
}

const AGORA = inputLocalParaDate('2026-03-01T00:00')!;

const L1 = mkLote({
  modalidade: '5k',
  ordem: 1,
  nome: 'Lote Promocional',
  preco: 60,
  quantidadeLimite: 150,
  vendidos: 150,
  inicioEm: ts(inputLocalParaDate('2025-12-01T08:00')!),
  fimEm: ts(inputLocalParaDate('2026-02-01T23:30')!),
});
const L2 = mkLote({
  modalidade: '5k',
  ordem: 2,
  preco: 75,
  quantidadeLimite: 50,
  vendidos: 19,
  inicioEm: ts(inputLocalParaDate('2026-02-02T00:00')!),
  fimEm: ts(inputLocalParaDate('2026-04-01T00:00')!),
});

function renderModal(over: Partial<Parameters<typeof LoteModal>[0]> = {}) {
  return render(
    <ToastProvider>
      <LoteModal
        open
        onOpenChange={vi.fn()}
        modalidade="5k"
        lote={null}
        lotesDoEvento={[L1, L2]}
        onSalvar={vi.fn().mockResolvedValue(undefined)}
        agora={AGORA}
        {...over}
      />
    </ToastProvider>,
  );
}

describe('LoteModal · frente A — o aviso vai para o campo pendente', () => {
  it('caso do dono: preço 120,00 preenchido e vaga vazia acusa a VAGA, e o preço fica limpo', async () => {
    const onSalvar = vi.fn();
    renderModal({ onSalvar });

    await userEvent.type(screen.getByLabelText('Nome do lote'), 'Lote 3');
    await userEvent.type(screen.getByLabelText(/Preço da inscrição/), '120,00');
    // Vaga fica em branco — exatamente o que ele fez.
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));

    const vaga = screen.getByLabelText('Vaga (quantidade limite)');
    const preco = screen.getByLabelText(/Preço da inscrição/);
    expect(vaga).toHaveAttribute('aria-invalid', 'true');
    expect(preco).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText(/A vaga \(quantidade limite\)/)).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('o campo pendente é descrito pelo próprio aviso (aria-describedby aponta o texto certo)', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText('Nome do lote'), 'Lote 3');
    await userEvent.type(screen.getByLabelText(/Preço da inscrição/), '120,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));

    const vaga = screen.getByLabelText('Vaga (quantidade limite)');
    const descrito = vaga.getAttribute('aria-describedby');
    expect(descrito).toBeTruthy();
    const alvo = document.getElementById((descrito ?? '').split(' ').pop() ?? '');
    expect(alvo?.textContent).toMatch(/vaga/i);
  });

  it('dois campos pendentes: cada um acende o seu, e o foco vai para o primeiro', async () => {
    renderModal();
    // Nome e vaga vazios; o nome vem antes no formulário.
    await userEvent.type(screen.getByLabelText(/Preço da inscrição/), '120,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));

    const nome = screen.getByLabelText('Nome do lote');
    const vaga = screen.getByLabelText('Vaga (quantidade limite)');
    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(vaga).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Preço da inscrição/)).not.toHaveAttribute('aria-invalid');
    expect(document.activeElement).toBe(nome);
  });
});

describe('LoteModal · frente C — lote com venda', () => {
  it('preço travado; a vaga oferece a porta autorizada (RN-304) em vez de um campo cinza mudo', async () => {
    const onAjustarCapacidade = vi.fn();
    renderModal({ lote: L2, onAjustarCapacidade });

    expect(screen.getByLabelText(/Preço da inscrição/)).toBeDisabled();
    const atalho = screen.getByRole('button', { name: 'Ajustar capacidade' });
    await userEvent.click(atalho);
    expect(onAjustarCapacidade).toHaveBeenCalledWith(L2);
  });

  it('a nota diz o que está travado e por quê — e que a vaga tem caminho', () => {
    renderModal({ lote: L2, onAjustarCapacidade: vi.fn() });
    const nota = screen.getByRole('note');
    expect(nota).toHaveTextContent(/pre.o fica bloqueado/i);
    expect(nota).toHaveTextContent(/RN-200/);
    expect(nota).toHaveTextContent(/Ajustar capacidade/);
    expect(nota).toHaveTextContent(/RN-304/);
  });

  it('lote sem venda segue com tudo editável (nada de trava onde não há venda)', () => {
    const semVenda = mkLote({ modalidade: '5k', ordem: 3, vendidos: 0 });
    renderModal({ lote: semVenda, lotesDoEvento: [semVenda] });
    expect(screen.getByLabelText(/Preço da inscrição/)).toBeEnabled();
    expect(screen.getByLabelText('Vaga (quantidade limite)')).toBeEnabled();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

describe('LoteModal · frente D — os lotes existentes ficam à vista enquanto se cadastra outro', () => {
  it('lista os lotes da modalidade com vendidos · disponíveis · total configurado', () => {
    renderModal();
    const painel = screen.getByRole('region', { name: /Lotes já configurados em 5k/i });
    const promocional = within(painel).getByRole('listitem', { name: 'Lote Lote Promocional' });
    // L1: 150 vendidos de 150 → 0 disponíveis.
    expect(promocional).toHaveTextContent('150 vendidos');
    expect(promocional).toHaveTextContent('0 disponíveis');
    expect(promocional).toHaveTextContent('150 no total');
    // L2: 19 vendidos de 50 → 31 disponíveis.
    const l2 = within(painel).getByRole('listitem', { name: 'Lote Lote 2' });
    expect(l2).toHaveTextContent('19 vendidos');
    expect(l2).toHaveTextContent('31 disponíveis');
    expect(l2).toHaveTextContent('50 no total');
  });

  // ---------------------------------------------------------------------------
  // REV-LOTES · achado #1. A versão anterior deste teste montava um estado que
  // o produto NÃO alcança: o mesmo lote com `vendidos: 0` na prop `lote` (para
  // destravar o campo) e `vendidos: 19` na lista (para o painel mostrar venda).
  // Na LotesPage o lote em edição SAI da mesma lista (`abrirEdicao` recebe uma
  // linha de `todosLotes`), então os dois números são sempre o mesmo — com 19
  // vendidos o campo nasce `disabled` e nada podia ser digitado. O caso verbatim
  // do dono foi para o CapacidadeModal, que é a porta real (RN-304). Aqui fica o
  // que ESTA tela de fato faz: prévia viva do lote SEM venda.
  // ---------------------------------------------------------------------------
  it('lote COM venda: o campo de vaga é somente leitura e a prévia não se move (a porta é o ajuste de capacidade)', () => {
    renderModal({ lote: L2, lotesDoEvento: [L1, L2], onAjustarCapacidade: vi.fn() });

    const vaga = screen.getByLabelText('Vaga (quantidade limite)');
    expect(vaga).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ajustar capacidade/i })).toBeInTheDocument();

    const painel = screen.getByRole('region', { name: /Lotes já configurados em 5k/i });
    const linha = within(painel).getByRole('listitem', { name: 'Lote Lote 2' });
    expect(linha).toHaveTextContent('19 vendidos');
    expect(linha).toHaveTextContent('31 disponíveis');
  });

  it('lote SEM venda: baixar o total move o disponível na hora (aritmética viva)', async () => {
    const semVenda = mkLote({
      modalidade: '5k',
      ordem: 3,
      nome: 'Lote 3',
      quantidadeLimite: 50,
      vendidos: 0,
      inicioEm: ts(inputLocalParaDate('2026-04-02T00:00')!),
      fimEm: ts(inputLocalParaDate('2026-05-01T00:00')!),
    });
    renderModal({ lote: semVenda, lotesDoEvento: [semVenda] });

    const painel = screen.getByRole('region', { name: /Lotes já configurados em 5k/i });
    const linha = within(painel).getByRole('listitem', { name: 'Lote Lote 3' });
    expect(linha).toHaveTextContent('50 no total');

    const vaga = screen.getByLabelText('Vaga (quantidade limite)');
    await userEvent.clear(vaga);
    await userEvent.type(vaga, '20');

    expect(linha).toHaveTextContent('0 vendidos');
    expect(linha).toHaveTextContent('20 disponíveis');
    expect(linha).toHaveTextContent('20 no total');
  });

  // ---------------------------------------------------------------------------
  // REV-LOTES · achado #2 (frente A) — o erro do SERVIDOR também tem endereço.
  //
  // A frente A consertou o erro de VALIDAÇÃO. O outro caminho seguia cego: o
  // `catch` do salvamento descartava o erro e só piscava um toast. É a mesma
  // queixa do dono ("o erro não diz o que é") num lugar diferente.
  // ---------------------------------------------------------------------------
  it('recusa do servidor vira mensagem de formulário acionável, e o modal continua aberto', async () => {
    // Lote COM venda: só o nome viaja, então o formulário já nasce válido e o
    // único jeito de falhar é o servidor recusar — que é o caminho em teste.
    const negado = Object.assign(new Error('Missing or insufficient permissions.'), {
      code: 'permission-denied',
    });
    const onOpenChange = vi.fn();
    renderModal({ lote: L2, lotesDoEvento: [L1, L2], onSalvar: vi.fn().mockRejectedValue(negado), onOpenChange });

    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));

    // A causa enumerada, não um "falhou" mudo.
    expect(await screen.findAllByText(/servidor recusou a gravação/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/Ajustar capacidade/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/modalidade não existe mais no evento/i).length).toBeGreaterThan(0);
    // Recusa não fecha o modal: o que foi digitado continua na tela.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('erro sem código conhecido preserva a mensagem original em vez de engoli-la', async () => {
    renderModal({
      lote: L2,
      lotesDoEvento: [L1, L2],
      onSalvar: vi.fn().mockRejectedValue(new Error('deadline-exceeded no gateway')),
    });

    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));

    expect(await screen.findAllByText(/deadline-exceeded no gateway/i)).not.toHaveLength(0);
    expect(screen.getAllByText(/Nada foi gravado/i).length).toBeGreaterThan(0);
  });

  it('modalidade ainda sem lote não mostra painel vazio', () => {
    renderModal({ modalidade: '21k', lotesDoEvento: [] });
    expect(screen.queryByRole('region', { name: /Lotes já configurados/i })).not.toBeInTheDocument();
  });
});

// =============================================================================
// PARSE-1 · três dos dezoito campos (ordem, vaga e preço do lote).
//
// Ordem e vaga eram `type="number"`: o navegador higienizava o texto antes de
// o código ver, então a recusa do parser não tinha onde aparecer. E as três
// recusas eram frases de FAIXA — "inteiro ≥ 1", "use R$ ≥ 0" —, respondidas
// igual para pontuação torta, para letra e para campo em branco.
// =============================================================================

describe('PARSE-1 · a recusa do parser tem onde aparecer nos campos do lote', () => {
  it('ordem, vaga e preço são campo de TEXTO com teclado numérico', () => {
    renderModal();
    const esperado = [
      ['Ordem na modalidade', 'numeric'],
      ['Vaga (quantidade limite)', 'numeric'],
      ['Preço da inscrição em 5k (R$)', 'decimal'],
    ] as const;
    for (const [rotulo, modo] of esperado) {
      const campo = screen.getByLabelText(rotulo);
      expect(campo).toHaveAttribute('type', 'text');
      expect(campo).toHaveAttribute('inputmode', modo);
    }
  });

  it('vaga com pontuação torta ensina a régua do milhar, em vez de repetir "inteiro ≥ 1"', async () => {
    const onSalvar = vi.fn();
    renderModal({ onSalvar });
    await userEvent.type(screen.getByLabelText('Nome do lote'), 'Lote 3');
    await userEvent.type(screen.getByLabelText('Vaga (quantidade limite)'), '1.23,45');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));

    expect(
      await screen.findByText(
        'Pontuação fora do padrão. O ponto separa o milhar, de três em três (ex.: 1.000).',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Vaga (quantidade limite)')).toHaveAttribute('aria-invalid', 'true');
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('vaga com casa decimal diz que vaga não tem casa decimal', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText('Nome do lote'), 'Lote 3');
    await userEvent.type(screen.getByLabelText('Vaga (quantidade limite)'), '2,5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));
    expect(
      await screen.findByText(
        'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.',
      ),
    ).toBeInTheDocument();
  });

  it('ordem ilegível acusa na ORDEM, e a vaga em branco continua com a frase que a nomeia', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText('Nome do lote'), 'Lote 3');
    await userEvent.clear(screen.getByLabelText('Ordem na modalidade'));
    await userEvent.type(screen.getByLabelText('Ordem na modalidade'), 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));

    expect(
      await screen.findByText('Quantidade inválida. Use apenas números inteiros (ex.: 1.000).'),
    ).toBeInTheDocument();
    // O `vazio` continua sendo da tela: "Informe uma quantidade." não diz de
    // qual campo se trata, e nomear o campo foi o conserto da frente A.
    expect(screen.getByText(/A vaga \(quantidade limite\)/)).toBeInTheDocument();
  });

  it('preço no estilo en-US ensina a pontuação, em vez de "Preço inválido"', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText('Nome do lote'), 'Lote 3');
    await userEvent.type(screen.getByLabelText('Preço da inscrição em 5k (R$)'), '1,234.56');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));
    expect(
      await screen.findByText(
        'Pontuação fora do padrão. Ponto separa milhar e vírgula separa centavos (ex.: 1.234,56).',
      ),
    ).toBeInTheDocument();
  });

  it('a régua do ponto e da vírgula fica embaixo do preço, e o exemplo de mil embaixo da vaga', () => {
    renderModal();
    const preco = screen.getByLabelText('Preço da inscrição em 5k (R$)');
    const vaga = screen.getByLabelText('Vaga (quantidade limite)');
    // A dica é ANUNCIADA pelo campo, não só desenhada ao lado dele.
    expect(document.getElementById(`${preco.id}-hint`)).toHaveTextContent(
      REGUA_PONTO_E_VIRGULA,
    );
    expect(preco.getAttribute('aria-describedby')).toContain(`${preco.id}-hint`);
    expect(document.getElementById(`${vaga.id}-hint`)).toHaveTextContent(
      EXEMPLO_DE_MIL_NA_VAGA,
    );
    expect(vaga.getAttribute('aria-describedby')).toContain(`${vaga.id}-hint`);
  });

  it('a régua não se apaga quando a recusa aparece', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText('Nome do lote'), 'Lote 3');
    await userEvent.type(screen.getByLabelText('Preço da inscrição em 5k (R$)'), '1,234.56');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));
    const preco = screen.getByLabelText('Preço da inscrição em 5k (R$)');
    expect(document.getElementById(`${preco.id}-hint`)).toHaveTextContent(
      REGUA_PONTO_E_VIRGULA,
    );
    expect(preco).toHaveAttribute('aria-invalid', 'true');
  });

  it('BASELINE colar de planilha: "1.000" na vaga e "1.234,56" no preço atravessam o campo intactos', async () => {
    renderModal();
    // `fireEvent.change` com o texto inteiro é o que a COLAGEM faz: uma
    // inserção só, e não tecla a tecla. Era aqui que o `type="number"`
    // apagava — medido: "1.234,56" colado num campo numérico vira "".
    const vaga = screen.getByLabelText('Vaga (quantidade limite)');
    const preco = screen.getByLabelText('Preço da inscrição em 5k (R$)');
    fireEvent.change(vaga, { target: { value: '1.000' } });
    fireEvent.change(preco, { target: { value: '1.234,56' } });
    expect(vaga).toHaveValue('1.000');
    expect(preco).toHaveValue('1.234,56');

    // E nenhum dos dois é acusado no submit: o valor colado é legível.
    // (O payload que sai daí — mil vagas, R$ 1.234,56 — é provado no unitário
    // do `loteForm`, que roda o validador sem montar a tela.)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar lote' }));
    expect(screen.getByLabelText('Vaga (quantidade limite)')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Preço da inscrição em 5k (R$)')).not.toHaveAttribute(
      'aria-invalid',
    );
  });
});
