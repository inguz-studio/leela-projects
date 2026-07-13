import { describe, it, expect } from 'vitest';
import type { AgregadosSegmentacao } from '@leela/core';
import {
  buildComunicadoInput,
  comunicadoToForm,
  estimativaSegmento,
  previewComunicado,
  toggleCanalForm,
  validarComunicadoForm,
  VALORES_INICIAIS_COMUNICADO,
  type ComunicadoFormValues,
} from '../comunicadoForm';
import { mkComunicado, ts } from '../../_test/fixtures';

const AGREGADOS: AgregadosSegmentacao = {
  totalMembrosAtivos: 120,
  participantesPorDesafio: { 'des-1': 42 },
  ativosPorJanela: { '7d': 30 },
  membrosPorPilar: { fisico: 50 },
};

function base(over: Partial<ComunicadoFormValues> = {}): ComunicadoFormValues {
  return { ...VALORES_INICIAIS_COMUNICADO, titulo: 'Aviso importante', conteudo: 'Conteúdo com mais de dez.', ...over };
}

describe('validarComunicadoForm', () => {
  it('válido (push curto, título e conteúdo ok)', () => {
    expect(validarComunicadoForm(base())).toEqual([]);
  });

  it('push acima de 160 chars → erro RN-134', () => {
    const erros = validarComunicadoForm(base({ conteudo: 'a'.repeat(161), canais: ['push'] }));
    expect(erros.some((e) => e.includes('160'))).toBe(true);
  });

  it('capa sem email → erro RN-135', () => {
    const erros = validarComunicadoForm(base({ canais: ['push'], capaUrl: 'http://x/capa.png' }));
    expect(erros.some((e) => e.toLowerCase().includes('capa'))).toBe(true);
  });

  it('agendar sem data/hora → erro', () => {
    const erros = validarComunicadoForm(base({ agendamento: 'agendar' }));
    expect(erros.some((e) => e.includes('agendamento'))).toBe(true);
  });
});

describe('previewComunicado', () => {
  it('push trunca em 160 e marca truncado', () => {
    const p = previewComunicado(base({ conteudo: 'a'.repeat(200) }));
    expect(Array.from(p.push).length).toBe(160);
    expect(p.pushTruncado).toBe(true);
  });

  it('capa só entra no preview quando o canal inclui email', () => {
    expect(previewComunicado(base({ canais: ['push'], capaUrl: 'x' })).capaUrl).toBeNull();
    const comEmail = previewComunicado(base({ canais: ['email'], capaUrl: 'http://x' }));
    expect(comEmail.capaUrl).toBe('http://x');
  });
});

describe('estimativaSegmento', () => {
  it("'todos' usa membros ativos do clube", () => {
    expect(estimativaSegmento(base({ segmentoTipo: 'todos' }), AGREGADOS)).toBe(120);
  });
  it('por_desafio resolve pela referência', () => {
    expect(estimativaSegmento(base({ segmentoTipo: 'por_desafio', segmentoRef: 'des-1' }), AGREGADOS)).toBe(42);
  });
  it('referência desconhecida → null', () => {
    expect(estimativaSegmento(base({ segmentoTipo: 'por_desafio', segmentoRef: 'xxx' }), AGREGADOS)).toBeNull();
  });
});

describe('novos_membros (CONS-4-T2 — 5º segmento)', () => {
  it('dispensa referência: monta { tipo: novos_membros } mesmo com segmentoRef preenchido', () => {
    const seg = buildComunicadoInput(base({ segmentoTipo: 'novos_membros', segmentoRef: 'ignorado' })).segmento;
    expect(seg).toEqual({ tipo: 'novos_membros' });
  });
  it('estimativa usa membrosNovos quando o agregado existe', () => {
    expect(
      estimativaSegmento(base({ segmentoTipo: 'novos_membros' }), { ...AGREGADOS, membrosNovos: 12 }),
    ).toBe(12);
  });
  it('sem membrosNovos no agregado → null (a tela mostra "—")', () => {
    expect(estimativaSegmento(base({ segmentoTipo: 'novos_membros' }), AGREGADOS)).toBeNull();
  });
});

describe('comunicadoToForm (fix S2 — round-trip da edição)', () => {
  it('preserva agendadoPara em data/hora locais quando status é agendado', () => {
    // Date por componentes locais — determinística em qualquer timezone.
    const agendado = new Date(2026, 7, 15, 13, 30);
    const form = comunicadoToForm(
      mkComunicado({ status: 'agendado', agendadoPara: ts(agendado) }),
    );
    expect(form.agendamento).toBe('agendar');
    expect(form.agendadoData).toBe('2026-08-15');
    expect(form.agendadoHora).toBe('13:30');
  });

  it('rascunho/enviado voltam sem data (agendamento "agora")', () => {
    const form = comunicadoToForm(mkComunicado({ status: 'rascunho' }));
    expect(form.agendamento).toBe('agora');
    expect(form.agendadoData).toBe('');
    expect(form.agendadoHora).toBe('');
  });
});

describe('toggleCanalForm / buildComunicadoInput', () => {
  it('toggle adiciona e remove canal', () => {
    const comEmail = toggleCanalForm(base({ canais: ['push'] }), 'email');
    expect(comEmail.canais).toEqual(['push', 'email']);
    expect(toggleCanalForm(comEmail, 'push').canais).toEqual(['email']);
  });
  it('buildComunicadoInput inclui capa só quando informada', () => {
    expect(buildComunicadoInput(base({ canais: ['email'], capaUrl: 'http://x' })).capaUrl).toBe('http://x');
    expect(buildComunicadoInput(base()).capaUrl).toBeUndefined();
  });
});
