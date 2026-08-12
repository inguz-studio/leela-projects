// =============================================================================
// Card do responsável no Resumo da ficha (ADMIN-VISAO onda 3 · S1612 · V-3).
//
// O que trava: o rótulo diz que o responsável é o DONO DA CONTA. Sem essa
// frase, quem lê a tela não sabe se está vendo um contato próprio da produtora
// ou o titular do login — e são coisas diferentes que podem divergir.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Profissional, Timestamp } from '@leela/core';
import { ResponsavelCard } from '../ResponsavelCard';

const ts = (iso: string): Timestamp => {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
};

function mkOwner(over: Partial<Profissional> = {}): Profissional {
  return {
    id: 'uid-owner',
    tenantId: 'castelo-producoes',
    nome: 'Marina Castelo',
    email: 'marina@castelo.com.br',
    telefone: '48999990001',
    organizacao: 'Castelo Produções e Eventos',
    papeis: ['organizador'],
    criadoEm: ts('2026-01-10T12:00:00Z'),
    atualizadoEm: ts('2026-01-10T12:00:00Z'),
    ...over,
  };
}

describe('ResponsavelCard · o rótulo carrega a decisão (V-3)', () => {
  it('diz na tela que o responsável é o dono da conta', () => {
    render(<ResponsavelCard owner={mkOwner()} ownerUid="uid-owner" />);

    expect(screen.getByText('Responsável')).toBeInTheDocument();
    expect(screen.getByText(/é o dono da conta/)).toBeInTheDocument();
  });
});

describe('ResponsavelCard · os campos tipados agora', () => {
  it('exibe nome, e-mail, telefone formatado e organização', () => {
    render(<ResponsavelCard owner={mkOwner()} ownerUid="uid-owner" />);

    expect(screen.getByText('Marina Castelo')).toBeInTheDocument();
    expect(screen.getByText('marina@castelo.com.br')).toBeInTheDocument();
    expect(screen.getByText('(48) 99999-0001')).toBeInTheDocument();
    expect(screen.getByText('Castelo Produções e Eventos')).toBeInTheDocument();
  });

  it('campo ausente é ausência declarada, não linha que some', () => {
    const owner = mkOwner();
    delete owner.telefone;
    delete owner.organizacao;
    render(<ResponsavelCard owner={owner} ownerUid="uid-owner" />);

    expect(screen.getByText('Telefone')).toBeInTheDocument();
    expect(screen.getByText('Organização')).toBeInTheDocument();
    expect(screen.getAllByText('Não informado')).toHaveLength(2);
  });

  it('sem perfil do dono, cai no uid e diz por quê', () => {
    render(<ResponsavelCard owner={null} ownerUid="uid-sumido" />);

    expect(screen.getByText('uid-sumido')).toBeInTheDocument();
    expect(screen.getByText(/não foi encontrado/)).toBeInTheDocument();
  });
});
