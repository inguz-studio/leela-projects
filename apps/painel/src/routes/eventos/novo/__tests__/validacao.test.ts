import { describe, it, expect } from 'vitest';
import { validaNovoEvento, type NovoEventoFormValues } from '../validacao';

// Instante explícito em UTC-3 (dia civil 2026-04-20 no fuso do produto) —
// determinístico em qualquer TZ de runner (fix review Onda1 #01).
const HOJE = new Date('2026-04-20T12:00:00-03:00');

function base(over: Partial<NovoEventoFormValues> = {}): NovoEventoFormValues {
  return {
    nome: 'Meia Floripa 2026',
    descricao: '',
    data: '2026-04-27',
    local: 'Florianópolis',
    modalidades: ['10k'],
    percursos: [{ nome: '10k', preco: '120' }],
    ...over,
  };
}

describe('validaNovoEvento', () => {
  it('aceita um formulário completo', () => {
    expect(validaNovoEvento(base(), HOJE).valido).toBe(true);
  });

  it('exige nome', () => {
    const r = validaNovoEvento(base({ nome: '  ' }), HOJE);
    expect(r.valido).toBe(false);
    expect(r.erros.nome).toBeTruthy();
  });

  it('rejeita data no passado', () => {
    const r = validaNovoEvento(base({ data: '2026-04-19' }), HOJE);
    expect(r.valido).toBe(false);
    expect(r.erros.data).toBeTruthy();
  });

  it('aceita data = HOJE (dia civil no fuso do produto — review #01)', () => {
    const r = validaNovoEvento(base({ data: '2026-04-20' }), HOJE);
    expect(r.valido).toBe(true);
  });

  it('borda 21:00–00:00 UTC-3: hoje segue válido às 22:30 locais', () => {
    // 2026-04-21T01:30Z — em UTC já é dia 21; no fuso do produto ainda é 20.
    const noite = new Date('2026-04-20T22:30:00-03:00');
    expect(validaNovoEvento(base({ data: '2026-04-20' }), noite).valido).toBe(true);
    expect(validaNovoEvento(base({ data: '2026-04-19' }), noite).valido).toBe(false);
  });

  it('exige ao menos uma modalidade', () => {
    const r = validaNovoEvento(base({ modalidades: [] }), HOJE);
    expect(r.erros.modalidades).toBeTruthy();
  });

  it('rejeita percurso sem preço numérico', () => {
    const r = validaNovoEvento(base({ percursos: [{ nome: '10k', preco: 'abc' }] }), HOJE);
    expect(r.erros.percursos).toBeTruthy();
  });

  it('rejeita percurso sem nome', () => {
    const r = validaNovoEvento(base({ percursos: [{ nome: '', preco: '120' }] }), HOJE);
    expect(r.erros.percursos).toBeTruthy();
  });
});
