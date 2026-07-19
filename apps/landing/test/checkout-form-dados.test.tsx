// =============================================================================
// PROVA do lote CHECKOUT-FORM · T1 (trace leela-build-2d6ee98d) — StepDados
// com os campos ratificados (spec CHECKOUT-UX §5.1/§5.2):
//   - telefone do responsável (autoComplete=tel, máscara UX);
//   - nascimento por atleta (input date, autoComplete=bday);
//   - endereço via CEP: 4 estados do lookup (carregando / sucesso→foco no
//     Número / formato inválido SEM request / fail-open manual quando a API
//     está fora ou o CEP não existe) — fetch mockado (nunca sai request real).
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StepDados } from '../app/(public)/[eventSlug]/inscricao/checkout/StepDados';
import {
  enderecoVazio,
  inscritoVazio,
  type EnderecoForm,
} from '../app/(public)/[eventSlug]/inscricao/checkout/tipos';
import {
  buscarEnderecoPorCep,
  mascaraCep,
  mascaraTelefone,
} from '../app/(public)/[eventSlug]/inscricao/checkout/cep';

afterEach(cleanup);

const noop = (): void => {};

/** Render controlado: aplica patches de endereço num objeto vivo (como o flow). */
function renderDados(over: {
  endereco?: EnderecoForm;
  onEndereco?: (patch: Partial<EnderecoForm>) => void;
} = {}): { rerender: (endereco: EnderecoForm) => void } {
  const props = {
    responsavelNome: '',
    responsavelEmail: '',
    responsavelTelefone: '',
    onResponsavel: noop,
    euCorro: true,
    onEuCorro: noop,
    inscritos: [inscritoVazio()],
    onInscrito: noop,
    endereco: over.endereco ?? enderecoVazio(),
    onEndereco: over.onEndereco ?? noop,
    errosResponsavel: {},
    errosInscritos: [],
    errosEndereco: {},
  };
  const utils = render(<StepDados {...props} />);
  return {
    rerender: (endereco: EnderecoForm) => utils.rerender(<StepDados {...props} endereco={endereco} />),
  };
}

describe('máscaras (UX pura — validação segue no core)', () => {
  it('mascaraCep aplica 00000-000 e trava em 8 dígitos', () => {
    expect(mascaraCep('01310100')).toBe('01310-100');
    expect(mascaraCep('013')).toBe('013');
    expect(mascaraCep('01310-1009999')).toBe('01310-100');
  });

  it('mascaraTelefone cobre 10 e 11 dígitos', () => {
    expect(mascaraTelefone('11987654321')).toBe('(11) 98765-4321');
    expect(mascaraTelefone('1133334444')).toBe('(11) 3333-4444');
  });
});

describe('StepDados — campos novos (spec §5.1/§5.2)', () => {
  it('telefone do responsável com autoComplete=tel e nascimento por atleta com bday', () => {
    renderDados();
    const tel = screen.getByLabelText(/telefone celular/i);
    expect(tel.getAttribute('autocomplete')).toBe('tel');
    expect(tel.getAttribute('inputmode')).toBe('tel');
    const nasc = screen.getByLabelText(/data de nascimento/i);
    expect(nasc.getAttribute('type')).toBe('date');
    expect(nasc.getAttribute('autocomplete')).toBe('bday');
  });

  it('CEP tem autoComplete=postal-code + inputMode numérico; logradouro/cidade/UF com tokens de endereço', () => {
    renderDados();
    const cep = screen.getByLabelText(/^cep/i);
    expect(cep.getAttribute('autocomplete')).toBe('postal-code');
    expect(cep.getAttribute('inputmode')).toBe('numeric');
    expect(screen.getByLabelText(/logradouro/i).getAttribute('autocomplete')).toBe('address-line1');
    expect(screen.getByLabelText(/cidade/i).getAttribute('autocomplete')).toBe('address-level2');
    expect(screen.getByLabelText(/^uf/i).getAttribute('autocomplete')).toBe('address-level1');
  });
});

describe('StepDados — lookup de CEP (4 estados, fail-open)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('CEP incompleto no blur: erro de formato inline SEM request', () => {
    const endereco = { ...enderecoVazio(), cep: '013' };
    renderDados({ endereco });
    const cep = screen.getByLabelText(/^cep/i);
    fireEvent.blur(cep);
    expect(screen.getByText(/cep incompleto/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('8º dígito dispara o lookup (só o CEP na URL), autopreenche editável e o resultado vai pro form', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });
    let vivo: EnderecoForm = enderecoVazio();
    const onEndereco = (patch: Partial<EnderecoForm>): void => {
      vivo = { ...vivo, ...patch };
    };
    renderDados({ endereco: vivo, onEndereco });
    const cep = screen.getByLabelText(/^cep/i);
    await act(async () => {
      fireEvent.change(cep, { target: { value: '01310-100' } });
    });
    await waitFor(() => expect(vivo.logradouro).toBe('Avenida Paulista'));
    expect(vivo.cidade).toBe('São Paulo');
    expect(vivo.uf).toBe('SP');
    // Privacidade (spec §5.2): a URL leva SÓ o CEP.
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toBe('https://viacep.com.br/ws/01310100/json/');
  });

  it('estado carregando: campos de endereço desabilitados, CEP segue editável', async () => {
    let resolver: (v: unknown) => void = noop;
    fetchMock.mockReturnValue(new Promise((res) => (resolver = res)));
    renderDados();
    const cep = screen.getByLabelText(/^cep/i);
    await act(async () => {
      fireEvent.change(cep, { target: { value: '01310100' } });
    });
    expect(screen.getByText(/buscando endereço/i)).toBeTruthy();
    expect((screen.getByLabelText(/logradouro/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/número/i) as HTMLInputElement).disabled).toBe(true);
    expect((cep as HTMLInputElement).disabled).toBe(false);
    await act(async () => {
      resolver({ ok: true, json: async () => ({ erro: true }) });
    });
  });

  it('ViaCEP hostil: corpo pendurado após os headers cai no timeout ⇒ indisponivel (fail-open, sem soft-lock)', async () => {
    // Review antagonista CKFORM (ressalva C): antes do fix, o clearTimeout
    // rodava assim que os headers chegavam e o res.json() ficava SEM timeout —
    // um ViaCEP servindo o corpo a conta-gotas pendurava o lookup e soft-lockava
    // o form em "carregando". O json() do mock só rejeita quando o
    // AbortController interno dispara (comportamento do fetch real no abort).
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation((_url: unknown, init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          json: () =>
            new Promise((_res, rej) => {
              init?.signal?.addEventListener('abort', () =>
                rej(new DOMException('Aborted', 'AbortError'))
              );
            }),
        })
      );
      const pendente = buscarEnderecoPorCep('01310-100');
      await vi.advanceTimersByTimeAsync(6001);
      await expect(pendente).resolves.toEqual({ status: 'indisponivel' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('CEP não encontrado / API fora: fallback manual honesto — campos abertos, compra não bloqueia', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    renderDados();
    const cep = screen.getByLabelText(/^cep/i);
    await act(async () => {
      fireEvent.change(cep, { target: { value: '99999-999' } });
    });
    expect(await screen.findByText(/não encontramos esse cep/i)).toBeTruthy();
    expect((screen.getByLabelText(/logradouro/i) as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText(/cidade/i) as HTMLInputElement).disabled).toBe(false);
  });
});
