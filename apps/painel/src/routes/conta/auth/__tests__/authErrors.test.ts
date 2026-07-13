// =============================================================================
// authErrors — prova a REGRA DE SEGURANÇA central: mensagens de login não
// enumeram contas (conta inexistente e senha errada colapsam numa mensagem).
// =============================================================================
import { describe, it, expect } from 'vitest';
import {
  CREDENCIAL_INVALIDA,
  getAuthErrorCode,
  mensagemErroCadastro,
  mensagemErroLogin,
  mensagemErroRedefinicao,
  mensagemErroTrocaSenha,
} from '../_lib/authErrors';

function firebaseErro(code: string): { code: string; message: string } {
  return { code, message: 'Firebase: ...' };
}

describe('getAuthErrorCode', () => {
  it('extrai o code de um erro Firebase; string vazia p/ formatos inesperados', () => {
    expect(getAuthErrorCode(firebaseErro('auth/wrong-password'))).toBe('auth/wrong-password');
    expect(getAuthErrorCode(new Error('boom'))).toBe('');
    expect(getAuthErrorCode(null)).toBe('');
    expect(getAuthErrorCode('auth/x')).toBe('');
  });
});

describe('mensagemErroLogin (anti-enumeração)', () => {
  it('conta inexistente, senha errada e credencial inválida → MESMA mensagem', () => {
    const codes = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-email'];
    for (const code of codes) {
      expect(mensagemErroLogin(firebaseErro(code))).toBe(CREDENCIAL_INVALIDA);
    }
  });

  it('erro desconhecido também colapsa na credencial inválida (fail-safe)', () => {
    expect(mensagemErroLogin(new Error('???'))).toBe(CREDENCIAL_INVALIDA);
  });

  it('rate-limit e rede têm mensagem própria (não é falha de credencial)', () => {
    expect(mensagemErroLogin(firebaseErro('auth/too-many-requests'))).toMatch(/muitas tentativas/i);
    expect(mensagemErroLogin(firebaseErro('auth/network-request-failed'))).toMatch(/conex/i);
  });
});

describe('mensagemErroCadastro', () => {
  it('e-mail em uso orienta sem afirmar existência categórica', () => {
    const msg = mensagemErroCadastro(firebaseErro('auth/email-already-in-use'));
    expect(msg).toMatch(/já tem uma conta/i);
    expect(msg).not.toMatch(/e-mail já (está )?cadastrado/i);
  });
  it('senha fraca cita o mínimo', () => {
    expect(mensagemErroCadastro(firebaseErro('auth/weak-password'))).toMatch(/6 caracteres/);
  });
});

describe('mensagemErroRedefinicao', () => {
  it('link expirado/ inválido pedem nova redefinição', () => {
    expect(mensagemErroRedefinicao(firebaseErro('auth/expired-action-code'))).toMatch(/expirou/i);
    expect(mensagemErroRedefinicao(firebaseErro('auth/invalid-action-code'))).toMatch(/inválido/i);
  });
});

describe('mensagemErroTrocaSenha', () => {
  it('senha atual errada é explícita (aqui o usuário JÁ está autenticado)', () => {
    expect(mensagemErroTrocaSenha(firebaseErro('auth/wrong-password'))).toBe('Senha atual incorreta.');
    expect(mensagemErroTrocaSenha(firebaseErro('auth/invalid-credential'))).toBe('Senha atual incorreta.');
  });
  it('requires-recent-login orienta reautenticar', () => {
    expect(mensagemErroTrocaSenha(firebaseErro('auth/requires-recent-login'))).toMatch(/entre novamente/i);
  });
});
