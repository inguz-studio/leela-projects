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
    expect(ids.slice(0, 5)).toEqual(['overview', 'inscritos', 'kits', 'lotes', 'pagina-vendas']);
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
    expect(ids).toEqual([
      'overview',
      'inscritos',
      'kits',
      'lotes',
      'pagina-vendas',
      'comunicacao',
      'afiliados',
      'entrega',
      'financeiro',
      'configuracoes',
    ]);
  });
});
