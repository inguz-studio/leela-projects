// =============================================================================
// perfilForm — helpers puros do editor de perfil (DN-1-T1). Cobre a ponte
// formulário → PerfilInput (trim + omissão de opcionais vazios), a delegação de
// validação ao core e o diagnóstico inline do handle.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  paraPerfilInput,
  problemaDoHandle,
  validarPerfilForm,
  valoresDePerfil,
  PERFIL_VALORES_INICIAIS,
  type PerfilFormValues,
} from '../perfilForm';
import type { Perfil } from '@leela/core';

const base: PerfilFormValues = {
  ...PERFIL_VALORES_INICIAIS,
  handle: 'corrida',
  nome: 'Corrida do Campeche',
};

describe('paraPerfilInput', () => {
  it('faz trim e OMITE opcionais vazios (bio/avatar/capa/links)', () => {
    const input = paraPerfilInput({ ...base, handle: '  corrida ', nome: ' Nome ' });
    expect(input).toEqual({ handle: 'corrida', nome: 'Nome', visibilidade: 'publica' });
    expect(input).not.toHaveProperty('bio');
    expect(input).not.toHaveProperty('imagemUrl');
  });

  it('inclui opcionais preenchidos e descarta links pela metade', () => {
    const input = paraPerfilInput({
      ...base,
      bio: 'oi',
      imagemUrl: ' https://x.com/c.jpg ',
      linksExternos: [
        { label: 'IG', url: 'https://instagram.com/x' },
        { label: '', url: 'https://sozinha.com' },
        { label: 'Site', url: '' },
      ],
    });
    expect(input.bio).toBe('oi');
    expect(input.imagemUrl).toBe('https://x.com/c.jpg');
    expect(input.linksExternos).toEqual([{ label: 'IG', url: 'https://instagram.com/x' }]);
  });
});

describe('validarPerfilForm', () => {
  it('reprova handle reservado no CREATE', () => {
    const erros = validarPerfilForm({ ...base, handle: 'admin' }, 'create');
    expect(erros.join(' ')).toMatch(/reservado/);
  });

  it('reprova nome vazio', () => {
    const erros = validarPerfilForm({ ...base, nome: '   ' }, 'create');
    expect(erros.join(' ')).toMatch(/nome/i);
  });

  it('no EDIT não reprova por handle (imutável) — só o resto da forma', () => {
    // handle vazio no form de edição não deve gerar erro de handle.
    const erros = validarPerfilForm({ ...base, handle: '' }, 'edit');
    expect(erros).toHaveLength(0);
  });

  it('aceita um perfil válido', () => {
    expect(validarPerfilForm(base, 'create')).toHaveLength(0);
  });
});

describe('problemaDoHandle', () => {
  it('retorna null para handle válido', () => {
    expect(problemaDoHandle('corrida')).toBeNull();
  });

  it('retorna copy de formato para handle curto', () => {
    expect(problemaDoHandle('ab')).toMatch(/inválido/);
  });
});

describe('valoresDePerfil', () => {
  it('deriva o form de um perfil existente, com opcionais como string vazia', () => {
    const perfil = {
      handle: 'corrida',
      nome: 'Corrida',
      visibilidade: 'indexavel',
      linksExternos: [{ label: 'IG', url: 'https://ig.com/x' }],
    } as Perfil;
    const v = valoresDePerfil(perfil);
    expect(v.handle).toBe('corrida');
    expect(v.visibilidade).toBe('indexavel');
    expect(v.bio).toBe('');
    expect(v.linksExternos).toHaveLength(1);
  });
});
