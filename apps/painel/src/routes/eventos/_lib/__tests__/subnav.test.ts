import { describe, it, expect } from 'vitest';
import { abaAtiva, eventoSubNavTabs } from '../subnav';

const SLUG = 'meia-floripa-2026';

describe('abaAtiva', () => {
  it('rota-base → overview', () => {
    expect(abaAtiva(`/eventos/${SLUG}`, SLUG)).toBe('overview');
    expect(abaAtiva(`/eventos/${SLUG}/`, SLUG)).toBe('overview');
  });

  it('casa o segmento da sub-rota', () => {
    expect(abaAtiva(`/eventos/${SLUG}/inscritos`, SLUG)).toBe('inscritos');
    expect(abaAtiva(`/eventos/${SLUG}/kits`, SLUG)).toBe('kits');
    expect(abaAtiva(`/eventos/${SLUG}/credenciamento`, SLUG)).toBe('entrega');
    expect(abaAtiva(`/eventos/${SLUG}/financeiro`, SLUG)).toBe('financeiro');
  });

  it('configuracoes e suas sub-rotas casam a aba Configurações (S304-T2/T3)', () => {
    expect(abaAtiva(`/eventos/${SLUG}/configuracoes`, SLUG)).toBe('configuracoes');
    expect(abaAtiva(`/eventos/${SLUG}/configuracoes/equipe`, SLUG)).toBe('configuracoes');
  });

  it('segmento desconhecido → overview (fallback)', () => {
    expect(abaAtiva(`/eventos/${SLUG}/xpto`, SLUG)).toBe('overview');
  });
});

describe('eventoSubNavTabs', () => {
  it('marca só a aba ativa e monta hrefs corretos', () => {
    const tabs = eventoSubNavTabs(SLUG, 'inscritos', { inscritos: 453 });
    const ativas = tabs.filter((t) => t.active);
    expect(ativas).toHaveLength(1);
    expect(ativas[0]?.id).toBe('inscritos');
    const overview = tabs.find((t) => t.id === 'overview');
    expect(overview?.href).toBe(`/eventos/${SLUG}`);
    const kits = tabs.find((t) => t.id === 'kits');
    expect(kits?.href).toBe(`/eventos/${SLUG}/kits`);
  });

  it('coloca o contador pill só em Inscritos', () => {
    const tabs = eventoSubNavTabs(SLUG, 'overview', { inscritos: 453 });
    expect(tabs.find((t) => t.id === 'inscritos')?.count).toBe(453);
    expect(tabs.find((t) => t.id === 'kits')?.count).toBeUndefined();
  });

  it('inclui Configurações como ÚLTIMA aba, sem reordenar as existentes', () => {
    const tabs = eventoSubNavTabs(SLUG, 'configuracoes');
    expect(tabs[tabs.length - 1]?.id).toBe('configuracoes');
    const config = tabs.find((t) => t.id === 'configuracoes');
    expect(config?.href).toBe(`/eventos/${SLUG}/configuracoes`);
    expect(config?.active).toBe(true);
    // Ordem canônica preservada: financeiro segue antes de configuracoes.
    const ids = tabs.map((t) => t.id);
    expect(ids.indexOf('financeiro')).toBeLessThan(ids.indexOf('configuracoes'));
    // V2708-11: `pagina-vendas` saiu daqui e virou seção do terciário de
    // Configurações. O que este caso afirma continua sendo o mesmo — a cabeça da
    // ordem canônica não foi reordenada —, só que a lista encurtou por remoção,
    // não por troca de posição.
    expect(ids.slice(0, 4)).toEqual(['overview', 'inscritos', 'kits', 'lotes']);
    expect(ids).not.toContain('pagina-vendas');
  });
});

// ---------------------------------------------------------------------------
// Virada de vocabulário (S211-T2 · RN-399)
// ---------------------------------------------------------------------------

describe('RN-399 — a aba diz credenciamento, o identificador não muda', () => {
  it('a SubNav do evento mostra "Credenciamento", nunca "Entrega"', () => {
    const tabs = eventoSubNavTabs(SLUG, 'overview');
    const aba = tabs.find((t) => t.id === 'entrega');
    expect(aba?.label).toBe('Credenciamento');
    expect(tabs.map((t) => t.label)).not.toContain('Entrega');
  });

  it('o id da aba continua `entrega` — renomear o id mexeria na matriz de papéis', () => {
    // RN-399 é troca de PALAVRA. O id da área de permissão (`RequirePapel
    // area="entrega"`) e o campo persistido `kitEntregueEm` ficam fora da
    // virada de propósito: o primeiro mexe numa matriz testada, o segundo é
    // migração de dado gravado.
    const tabs = eventoSubNavTabs(SLUG, 'overview');
    expect(tabs.map((t) => t.id)).toContain('entrega');
  });

  it('a ordem canônica das abas não mudou com a virada', () => {
    const ids = eventoSubNavTabs(SLUG, 'overview').map((t) => t.id);
    // V2708-11 tirou `pagina-vendas` desta lista (foi para o terciário de
    // Configurações); as NOVE restantes seguem na ordem canônica de sempre, que
    // é o que este caso guarda.
    expect(ids).toEqual([
      'overview',
      'inscritos',
      'kits',
      'lotes',
      'comunicacao',
      'afiliados',
      'entrega',
      'financeiro',
      'configuracoes',
    ]);
  });
});

// ---------------------------------------------------------------------------
// S316-T7 · Lotes vira Modalidades (leva 22 · RN-399)
// ---------------------------------------------------------------------------

describe('S316-T7 — a aba diz Modalidades, o identificador e a rota não mudam', () => {
  it('a SubNav mostra "Modalidades", nunca "Lotes"', () => {
    const tabs = eventoSubNavTabs(SLUG, 'overview');
    const aba = tabs.find((t) => t.id === 'lotes');
    expect(aba?.label).toBe('Modalidades');
    expect(tabs.map((t) => t.label)).not.toContain('Lotes');
  });

  it('o id e o href continuam os mesmos — endereço colado antes segue valendo', () => {
    // Mesma régua da RN-399 aplicada em Credenciamento e em Kits (RN-572):
    // muda o que a pessoa LÊ, nunca o identificador. Sem redirect legado
    // porque nada mudou de endereço.
    const tabs = eventoSubNavTabs(SLUG, 'lotes');
    const aba = tabs.find((t) => t.id === 'lotes');
    expect(aba?.href).toBe('/eventos/' + SLUG + '/lotes');
    expect(abaAtiva('/eventos/' + SLUG + '/lotes', SLUG)).toBe('lotes');
  });
});
