// =============================================================================
// OverlayConvite (ONBOARD-VITRINE · RN-510, sucedendo RN-416/417) — o aviso de
// boas-vindas da conta em vitrine.
//
// O que esta suíte trava:
//   - a copy do dono aparece (boas-vindas + falar com o time + código Leela);
//   - o aviso BLOQUEIA enquanto está na tela e SAI por Esc e por botão — a
//     troca de desenho da RN-416, que era não-descartável de propósito;
//   - o código digitado sujo (minúscula, hífen, espaço) chega NORMALIZADO;
//   - código incompleto não envia;
//   - o CTA lê o destino da CONFIG (mailto e WhatsApp), nunca uma string fixa;
//   - o erro do resgate é anunciado (role="alert") sem revelar o motivo real.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CONTATO_ONBOARDING_PADRAO } from '@leela/core';
import { usuario } from '@/test/usuario';
import { OverlayConvite, type OverlayConviteProps } from '../OverlayConvite';

const base: OverlayConviteProps = {
  contato: CONTATO_ONBOARDING_PADRAO,
  enviando: false,
  erro: null,
  onResgatar: vi.fn(),
  onSair: vi.fn(),
  onFechar: vi.fn(),
};

function montar(over: Partial<OverlayConviteProps> = {}) {
  return render(
    <MemoryRouter>
      <OverlayConvite {...base} {...over} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OverlayConvite — a copy do dono', () => {
  it('anuncia-se como diálogo modal e dá boas-vindas', () => {
    montar();
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: /Boas-vindas à Leela/i })).toBeInTheDocument();
  });

  it('orienta a falar com o time para receber o código Leela', () => {
    // As três peças da ordem verbatim de 06/08, na mesma tela.
    montar();
    expect(screen.getByText(/fale com o nosso time e receba o código Leela/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Falar com o time Leela/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/código Leela/i)).toBeInTheDocument();
  });

  it('quem só participa sabe onde procurar, em uma linha', () => {
    // "Quem é só participante tem a área do cliente na landing" — sem virar
    // labirinto: uma frase, sem segunda porta dentro do aviso.
    montar();
    expect(screen.getByText(/área do cliente/i)).toBeInTheDocument();
  });

  it('oferece o que a conta em vitrine PODE fazer: conta e saída', () => {
    montar();
    expect(screen.getByRole('link', { name: /Minha conta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sair$/i })).toBeInTheDocument();
  });
});

describe('OverlayConvite — bloqueia, mas sai (RN-510)', () => {
  it('Esc fecha o aviso', async () => {
    // A RN-416 exigia o oposto (sem Esc) porque não havia nada por baixo para
    // olhar. Com a vitrine há — e o dono convidou a pessoa a conhecê-la.
    const onFechar = vi.fn();
    montar({ onFechar });
    await usuario().keyboard('{Escape}');
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('o botão de continuar olhando fecha o aviso', async () => {
    const onFechar = vi.fn();
    montar({ onFechar });
    await usuario().click(screen.getByRole('button', { name: /Continuar olhando/i }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('o foco entra no painel do aviso, não no campo de código', () => {
    // O código é de quem vai ser profissional. Jogar o cursor nele anunciaria
    // que digitar algo é o pedágio da tela.
    montar();
    expect(document.activeElement).not.toBe(screen.getByLabelText(/código Leela/i));
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  // ── DEF-C (ONBOARD-REV) ──────────────────────────────────────────────
  // O véu era `bg-[var(--surface-base)]/95` e essa classe não gera regra
  // nenhuma: modificador de opacidade sobre valor arbitrário `var()` é
  // descartado no build. Aqui se mede a CLASSE; quem mede o CSS BUILDADO é
  // `veu-buildado.test.ts`, que é a prova que faltava em 2026-08-03.
  //
  // Desde o VITRINE-VEU-1 o véu é o do `Modal` do DS (`modal-overlay`), e não
  // mais um irmão do painel desenhado aqui. O token medido é o MESMO — era dele
  // que o conserto do DEF-C tinha ido buscar a cor.
  it('DEF-C: o véu usa o token de overlay do DS, não uma classe que não compila', () => {
    montar();
    const veu = screen.getByTestId('modal-overlay');
    expect(veu.className).toContain('bg-[var(--modal-overlay-bg)]');
    expect(veu.className).toContain('backdrop-blur-[var(--modal-overlay-blur)]');
    // Modificador de opacidade sobre `var()` some no build — em nenhuma classe.
    expect(veu.className).not.toMatch(/var\(--[a-z-]+\)\]\/\d/);
  });

  // ── VITRINE-CONTRASTE-1 (corte de 09/08) ─────────────────────────────
  it('o cartão tem limite visível: a borda é `--border-strong`', () => {
    // 1,13:1 do cartão contra o próprio véu no tema brasa, e 1,31:1 da borda
    // `--border-subtle`, num piso de 3:1 (WCAG 1.4.11). O `Modal` do DS não
    // desenha borda — ele se separa do fundo por sombra, que não é limite
    // medível. Os números do token resolvido estão em `contraste-aviso.test.ts`.
    montar();
    const painel = screen.getByRole('dialog');
    expect(painel.className).toContain('border-[var(--border-strong)]');
    expect(painel.className).not.toContain('border-[var(--border-subtle)]');
  });
});

describe('OverlayConvite — o que o `Modal` do DS trouxe (VITRINE-VEU-1)', () => {
  it('o aviso é portalizado para o `body`, fora do `<main>` do painel', () => {
    // Era este o coração do DEF-R1: o dialog morava dentro do
    // `<main class="overflow-hidden">`, e portanto dentro da mesma subárvore
    // que ele dizia estar tornando inerte.
    const { container } = montar();
    const dialogo = screen.getByRole('dialog');
    expect(container.contains(dialogo)).toBe(false);
    expect(dialogo.parentElement).toBe(document.body);
  });

  it('a rolagem do documento trava enquanto o aviso está na tela', () => {
    expect(document.body.style.overflow).toBe('');
    const { unmount } = montar();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('o X do cabeçalho fecha, como as outras saídas', async () => {
    const onFechar = vi.fn();
    montar({ onFechar });
    await usuario().click(screen.getByRole('button', { name: /Fechar/i }));
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('digitar o código não arranca o foco do campo', async () => {
    // ⛔ Regressão que o `Modal` cria se `onOpenChange` nascer inline: o
    // `useDialogBehavior` tem `onClose` nas dependências do efeito, e a cada
    // tecla o efeito remontaria — devolvendo o foco ao abridor (no FUNDO) e
    // depois jogando-o no X. Um caractere por vez, e nunca dois.
    montar();
    const campo = screen.getByLabelText(/código Leela/i);
    await usuario().type(campo, 'AB23CD45');
    expect(campo).toHaveValue('AB23CD45');
    expect(document.activeElement).toBe(campo);
  });
});

describe('OverlayConvite — resgate', () => {
  it('normaliza o código digitado antes de entregar', async () => {
    const onResgatar = vi.fn();
    montar({ onResgatar });
    const user = usuario();
    await user.type(screen.getByLabelText(/código Leela/i), 'ab23-cd 45');
    await user.click(screen.getByRole('button', { name: /Liberar acesso/i }));
    expect(onResgatar).toHaveBeenCalledWith('AB23CD45');
  });

  it('código incompleto não envia', async () => {
    const onResgatar = vi.fn();
    montar({ onResgatar });
    await usuario().type(screen.getByLabelText(/código Leela/i), 'AB23');
    expect(screen.getByRole('button', { name: /Liberar acesso/i })).toBeDisabled();
    expect(onResgatar).not.toHaveBeenCalled();
  });

  it('em voo, o botão avisa e trava', () => {
    montar({ enviando: true });
    expect(screen.getByRole('button', { name: /Liberando acesso/i })).toBeDisabled();
  });

  it('erro do resgate é anunciado sem revelar o motivo real', () => {
    montar({ erro: 'Código inválido ou já utilizado.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Código inválido ou já utilizado.');
  });
});

describe('OverlayConvite — CTA vem da config (RN-417)', () => {
  it('sem config, o destino é o mailto padrão — nunca um botão morto', () => {
    montar();
    const cta = screen.getByRole('link', { name: /Falar com o time Leela/i });
    expect(cta.getAttribute('href')).toContain('mailto:contato@leela.app');
  });

  it('config de WhatsApp muda o destino sem tocar no código', () => {
    montar({ contato: { tipo: 'whatsapp', valor: '5548999999999' } });
    const cta = screen.getByRole('link', { name: /Falar com o time Leela/i });
    expect(cta).toHaveAttribute('href', 'https://wa.me/5548999999999');
  });
});
