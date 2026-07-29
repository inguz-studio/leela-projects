// =============================================================================
// PROVA do lote CHECKOUT-FORM · T1 (trace leela-build-2d6ee98d) — StepDados
// com os campos ratificados (spec CHECKOUT-UX §5.1/§5.2):
//   - telefone do responsável (autoComplete=tel, máscara UX);
//   - nascimento por atleta (input date, autoComplete=bday);
//   - endereço via CEP: 4 estados do lookup (carregando / sucesso→foco no
//     Número / formato inválido SEM request / fail-open manual quando a API
//     está fora ou o CEP não existe) — fetch mockado (nunca sai request real).
// =============================================================================

import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StepDados } from '../app/(public)/[eventSlug]/inscricao/checkout/StepDados';
import {
  enderecoVazio,
  inscritoVazio,
  type EnderecoForm,
  type InscritoForm,
} from '../app/(public)/[eventSlug]/inscricao/checkout/tipos';
import {
  buscarEnderecoPorCep,
  mascaraCep,
  mascaraTelefone,
} from '../app/(public)/[eventSlug]/inscricao/checkout/cep';

afterEach(cleanup);

const noop = (): void => {};

/**
 * Harness COM ESTADO — como o `CheckoutFlow` de verdade.
 *
 * Antes o `endereco` era um prop congelado: digitar o CEP no teste não mudava
 * o valor que o componente recebia de volta. Isso passou despercebido enquanto
 * o formulário mostrava tudo de uma vez; com a revelação progressiva
 * (D-0729-2) o congelamento vira mentira — em produção o estado sobe, os
 * campos aparecem, e no teste não apareceriam. O harness passa a segurar o
 * estado e a repassar cada patch, para o teste exercitar o mesmo caminho.
 */
function Harness({
  enderecoInicial,
  onEndereco,
  onInscrito,
}: {
  enderecoInicial: EnderecoForm;
  onEndereco?: (patch: Partial<EnderecoForm>) => void;
  onInscrito?: (index: number, patch: Partial<InscritoForm>) => void;
}): React.JSX.Element {
  const [endereco, setEndereco] = useState(enderecoInicial);
  const [inscritos, setInscritos] = useState([inscritoVazio()]);
  return (
    <StepDados
      responsavelNome=""
      responsavelEmail=""
      responsavelTelefone=""
      onResponsavel={noop}
      euCorro
      onEuCorro={noop}
      inscritos={inscritos}
      onInscrito={(i, patch) => {
        onInscrito?.(i, patch);
        setInscritos((prev) => prev.map((ins, k) => (k === i ? { ...ins, ...patch } : ins)));
      }}
      endereco={endereco}
      onEndereco={(patch) => {
        onEndereco?.(patch);
        setEndereco((prev) => ({ ...prev, ...patch }));
      }}
      errosResponsavel={{}}
      errosInscritos={[]}
      errosEndereco={{}}
    />
  );
}

function renderDados(
  over: {
    endereco?: EnderecoForm;
    onEndereco?: (patch: Partial<EnderecoForm>) => void;
    onInscrito?: (index: number, patch: Partial<InscritoForm>) => void;
  } = {},
): void {
  render(
    <Harness
      enderecoInicial={over.endereco ?? enderecoVazio()}
      {...(over.onEndereco ? { onEndereco: over.onEndereco } : {})}
      {...(over.onInscrito ? { onInscrito: over.onInscrito } : {})}
    />,
  );
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
    // D-0729-7 (achado 18): nascimento por DIGITAÇÃO, teclado numérico. O
    // `type="date"` abria o calendário do celular e custava dezenas de cliques
    // para chegar a um ano de nascimento.
    const nasc = screen.getByLabelText(/data de nascimento/i);
    expect(nasc.getAttribute('type')).toBe('text');
    expect(nasc.getAttribute('inputmode')).toBe('numeric');
    expect(nasc.getAttribute('placeholder')).toBe('dd/mm/aaaa');
    expect(nasc.getAttribute('autocomplete')).toBe('bday');
  });

  it('CEP tem autoComplete=postal-code + inputMode numérico; logradouro/cidade/UF com tokens de endereço', () => {
    // D-0729-2: os demais campos só existem com o CEP completo — a fixture
    // entra com o CEP preenchido para exercitar os tokens de autofill.
    renderDados({ endereco: { ...enderecoVazio(), cep: '01310-100' } });
    const cep = screen.getByLabelText(/^cep/i);
    expect(cep.getAttribute('autocomplete')).toBe('postal-code');
    expect(cep.getAttribute('inputmode')).toBe('numeric');
    expect(screen.getByLabelText(/logradouro/i).getAttribute('autocomplete')).toBe('address-line1');
    expect(screen.getByLabelText(/cidade/i).getAttribute('autocomplete')).toBe('address-level2');
    expect(screen.getByLabelText(/^uf/i).getAttribute('autocomplete')).toBe('address-level1');
  });
});

describe('StepDados — D-0729-7 · nascimento por digitação (achado 18)', () => {
  it('digitar só os números vira dd/mm/aaaa na tela e yyyy-mm-dd no estado', () => {
    const recebidos: string[] = [];
    renderDados({
      onInscrito: (_i, patch) => {
        if (patch.nascimento !== undefined) recebidos.push(patch.nascimento);
      },
    });
    const nasc = screen.getByLabelText(/data de nascimento/i) as HTMLInputElement;
    fireEvent.change(nasc, { target: { value: '20051990' } });
    expect(nasc.value).toBe('20/05/1990');
    // Data pela metade não vira data: o estado só recebe ISO quando completa.
    expect(recebidos.at(-1)).toBe('1990-05-20');
  });

  it('data incompleta não inventa valor no estado', () => {
    const recebidos: string[] = [];
    renderDados({
      onInscrito: (_i, patch) => {
        if (patch.nascimento !== undefined) recebidos.push(patch.nascimento);
      },
    });
    fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
      target: { value: '2005' },
    });
    expect(recebidos.at(-1)).toBe('');
  });
});

describe('StepDados — D-0729-2 · endereço começa só com o CEP (achado 9)', () => {
  it('sem CEP, o bloco de endereço mostra SÓ o campo de CEP', () => {
    renderDados();
    expect(screen.getByLabelText(/^cep/i)).toBeTruthy();
    expect(screen.queryByLabelText(/logradouro/i)).toBeNull();
    expect(screen.queryByLabelText(/^número/i)).toBeNull();
    expect(screen.queryByLabelText(/cidade/i)).toBeNull();
    expect(screen.queryByLabelText(/^uf/i)).toBeNull();
  });

  it('CEP completo revela o restante MESMO sem sucesso do lookup (fail-open da §5.2)', () => {
    renderDados({ endereco: { ...enderecoVazio(), cep: '01310-100' } });
    expect(screen.getByLabelText(/logradouro/i)).toBeTruthy();
    expect(screen.getByLabelText(/^número/i)).toBeTruthy();
  });

  it('endereço vindo do prefill revela os campos mesmo sem o CEP digitado agora', () => {
    renderDados({
      endereco: { ...enderecoVazio(), logradouro: 'Av. Paulista', cidade: 'São Paulo' },
    });
    expect(screen.getByLabelText(/logradouro/i)).toBeTruthy();
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
