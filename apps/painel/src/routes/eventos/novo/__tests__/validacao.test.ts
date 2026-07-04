import { describe, it, expect } from 'vitest';
import { validaNovoEvento, type NovoEventoFormValues } from '../validacao';

const HOJE = new Date('2026-04-20T00:00:00');

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
