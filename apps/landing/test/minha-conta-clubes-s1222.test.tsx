/**
 * minha-conta-clubes-s1222.test.tsx — S1222-T4 · RN-451
 *
 * Meus Clubes e a caixa de convites, na tela.
 *
 * O que este arquivo tem de provar, na letra do aceite da fila:
 *
 *   1. a caixa lista convites da própria conta, das DUAS máquinas
 *      (influenciador · RN-316 e promotor · E18), com o tipo dito na tela;
 *   2. **sem caminho novo de credencial**: a tela não tem nenhum link nem botão
 *      de aceite, e o texto manda a pessoa ao link do e-mail. Falsificação:
 *      pôr um `<a>` de aceite aqui mata este caso;
 *   3. lista vazia é uma TELA, não um branco — e o vazio de clubes não promete
 *      uma entrada que o produto não tem;
 *   4. corte/falha de leitura é DECLARADO na tela (⚔ a lição da F1/D4);
 *   5. a contagem da aba conta CONVITE PENDENTE, não clube.
 *
 * O SDK é mockado — o teste não sobe Firebase.
 */
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import type { ClubeDaConta, ConviteDaConta } from '@leela/api-client';
import { PainelClubes } from '@/app/(public)/minha-conta/PainelClubes';

// O primeiro render puxa o barrel do DS; com o teto default de 5 s o caso
// inaugural do arquivo estoura por IMPORT, não por comportamento.
vi.setConfig({ testTimeout: 20_000 });

afterEach(() => {
  // A suíte da landing roda sem `globals`: o auto-cleanup do RTL não se
  // registra sozinho.
  cleanup();
});

function clube(over: Partial<ClubeDaConta> = {}): ClubeDaConta {
  return {
    chave: 'c1',
    nome: 'Corrida Noturna',
    papel: 'membro',
    status: 'ativo',
    entrouEmIso: '2026-04-01T12:00:00.000Z',
    ...over,
  };
}

function convite(over: Partial<ConviteDaConta> = {}): ConviteDaConta {
  return {
    chave: 'v1',
    tipo: 'influenciador',
    estado: 'pendente',
    origemNome: 'Meia de Floripa 2027',
    convidadoEmIso: '2026-08-03T12:00:00.000Z',
    expiraEmIso: '2026-08-10T12:00:00.000Z',
    ...over,
  };
}

function montar(over: Partial<React.ComponentProps<typeof PainelClubes>> = {}): void {
  render(
    <PainelClubes
      clubes={[]}
      convites={[]}
      clubesCompletos
      convitesCompletos
      {...over}
    />
  );
}

describe('S1222-T4 · Meus Clubes na tela', () => {
  it('mostra o clube com papel e desde quando', () => {
    montar({ clubes: [clube({ papel: 'owner' })] });
    const cartao = document.querySelector('[data-slot="clube-cartao"]');
    expect(cartao).not.toBeNull();
    expect(cartao?.textContent).toMatch(/Corrida Noturna/);
    expect(cartao?.textContent).toMatch(/Você administra/);
    expect(cartao?.textContent).toMatch(/Desde 01\/04\/2026/);
  });

  it('o papel de membro comum não vira rótulo — só o que diz alguma coisa aparece', () => {
    montar({ clubes: [clube({ papel: 'membro' })] });
    const cartao = document.querySelector('[data-slot="clube-cartao"]');
    expect(cartao?.textContent).not.toMatch(/Você administra|Administração/);
  });

  it('clube sem nome resolvido não vira linha em branco', () => {
    montar({ clubes: [clube({ nome: '' })] });
    const cartao = document.querySelector('[data-slot="clube-cartao"]');
    expect(cartao?.textContent).toMatch(/Clube/);
  });

  it('o VAZIO é uma tela desenhada, e não promete uma entrada que não existe', () => {
    montar({ clubes: [] });
    expect(screen.getByText(/você ainda não faz parte de nenhum clube/i)).toBeTruthy();
    // Não existe hoje caminho para o participante entrar num clube: nenhum
    // botão de "entrar" ou "criar clube" pode ser oferecido aqui.
    expect(screen.queryByRole('button', { name: /entrar|criar/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /entrar|criar/i })).toBeNull();
  });
});

describe('S1222-T4 · a caixa de convites, das DUAS máquinas', () => {
  it('diz na tela de qual das duas o convite veio', () => {
    montar({
      convites: [
        convite({ chave: 'a', tipo: 'influenciador' }),
        convite({ chave: 'b', tipo: 'promotor', origemNome: 'Assessoria Alfa' }),
      ],
    });
    expect(screen.getByText(/convite para influenciador/i)).toBeTruthy();
    expect(screen.getByText(/convite para promotor/i)).toBeTruthy();
    expect(screen.getByText(/Assessoria Alfa/)).toBeTruthy();
  });

  it('⚔ NENHUM caminho novo de credencial: não há link nem botão de aceite', () => {
    montar({
      convites: [
        convite({ chave: 'a', tipo: 'influenciador' }),
        convite({ chave: 'b', tipo: 'promotor' }),
      ],
    });
    // O aceite continua sendo o link com token do e-mail. Se a tela ganhar um
    // caminho próprio, ela vira a segunda superfície de credencial que a fila
    // proíbe — e este caso morre.
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(document.querySelectorAll('a[href*="convite"]')).toHaveLength(0);
  });

  it('o convite pendente DIZ onde está o link e até quando ele vale', () => {
    montar({ convites: [convite()] });
    const como = document.querySelector('[data-slot="convite-como-aceitar"]');
    expect(como?.textContent).toMatch(/abra o link do convite no e-mail/i);
    expect(como?.textContent).toMatch(/10\/08\/2026/);
  });

  it('o convite VENCIDO tem estado próprio e diz o que fazer', () => {
    montar({ convites: [convite({ estado: 'expirado' })] });
    const cartao = document.querySelector('[data-slot="convite-cartao"]');
    expect(within(cartao as HTMLElement).getByText(/prazo vencido/i)).toBeTruthy();
    const texto = document.querySelector('[data-slot="convite-expirado"]');
    expect(texto?.textContent).toMatch(/peça um novo a quem convidou você/i);
    // Vencido não pode continuar mandando a pessoa abrir um link morto.
    expect(document.querySelector('[data-slot="convite-como-aceitar"]')).toBeNull();
  });

  it('o convite ACEITO diz que já foi aceito, e não some da caixa', () => {
    montar({ convites: [convite({ estado: 'aceito' })] });
    expect(document.querySelector('[data-slot="convite-aceito"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="convite-como-aceitar"]')).toBeNull();
  });

  it('a caixa vazia é uma tela desenhada', () => {
    montar({ convites: [] });
    expect(screen.getByText(/nenhum convite por aqui/i)).toBeTruthy();
  });
});

describe('S1222-T4 · corte e falha de leitura são DECLARADOS (⚔ F1/D4)', () => {
  it('lista de clubes incompleta aparece na tela', () => {
    montar({ clubes: [clube()], clubesCompletos: false });
    const aviso = document.querySelector('[data-slot="clubes-lista-parcial"]');
    expect(aviso).not.toBeNull();
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(aviso?.textContent).toMatch(/pode estar faltando algum clube/i);
  });

  it('caixa de convites incompleta aparece na tela', () => {
    montar({ convites: [convite()], convitesCompletos: false });
    const aviso = document.querySelector('[data-slot="convites-lista-parcial"]');
    expect(aviso).not.toBeNull();
    expect(aviso?.textContent).toMatch(/pode estar faltando algum convite/i);
  });

  it('lista completa NÃO mostra aviso nenhum', () => {
    montar({ clubes: [clube()], convites: [convite()] });
    expect(document.querySelector('[data-slot="clubes-lista-parcial"]')).toBeNull();
    expect(document.querySelector('[data-slot="convites-lista-parcial"]')).toBeNull();
  });

  it('a lista incompleta convive com o VAZIO sem se anular', () => {
    // Falha de leitura com zero linhas: a tela não pode dizer só "você não tem
    // nada" — foi a lista que mente que originou esta rodada.
    montar({ clubes: [], clubesCompletos: false });
    expect(document.querySelector('[data-slot="clubes-lista-parcial"]')).not.toBeNull();
    expect(screen.getByText(/você ainda não faz parte de nenhum clube/i)).toBeTruthy();
  });
});
