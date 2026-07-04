import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformGuard } from '../PlatformGuard';

describe('PlatformGuard', () => {
  it('loading → status de verificação de acesso', () => {
    render(
      <PlatformGuard status="loading" isAdmin={false}>
        <div>conteúdo</div>
      </PlatformGuard>,
    );
    expect(screen.getByRole('status', { name: 'Verificando acesso' })).toBeInTheDocument();
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
  });

  it('autenticado sem admin → 403, nunca o conteúdo', () => {
    render(
      <PlatformGuard status="authenticated" isAdmin={false}>
        <div>lista de tenants</div>
      </PlatformGuard>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/403/);
    expect(screen.queryByText('lista de tenants')).not.toBeInTheDocument();
  });

  it('anônimo → 403', () => {
    render(
      <PlatformGuard status="anonymous" isAdmin={false}>
        <div>lista de tenants</div>
      </PlatformGuard>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/acesso restrito/i);
  });

  it('platform_admin → renderiza o conteúdo', () => {
    render(
      <PlatformGuard status="authenticated" isAdmin>
        <div>lista de tenants</div>
      </PlatformGuard>,
    );
    expect(screen.getByText('lista de tenants')).toBeInTheDocument();
  });
});
