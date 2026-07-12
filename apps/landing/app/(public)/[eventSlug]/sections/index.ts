import type { EventoPublico } from '@/lib/tipos';
import { HeroSection } from './HeroSection';
import { SobreSection } from './SobreSection';
import { ModalidadesSection } from './ModalidadesSection';
import { LotesSection } from './LotesSection';
import { RetiradaSection } from './RetiradaSection';
import { CheckoutCtaSection } from './CheckoutCtaSection';
import {
  DepoimentosSection,
  InfoSection,
  KitsSection,
  PatrocinadoresSection,
  PercursoSection,
} from './dormant';

/** Um componente de seção recebe o evento e decide render vs `null`. */
export type SectionComponent = (props: { evento: EventoPublico }) => React.JSX.Element | null;

/**
 * Registro `sectionId → componente` (S1201-T1). As chaves cobrem os ids do seed
 * (hero/sobre/percursos/lotes/depoimentos/patrocinadores/checkout) + o catálogo
 * nomeado no brief (modalidades/kits/retirada/info/percurso), para o
 * renderizador ser completo. Ids fora daqui são ignorados pelo SectionRenderer.
 */
export const SECTION_REGISTRY: Record<string, SectionComponent> = {
  hero: HeroSection,
  sobre: SobreSection,
  percursos: ModalidadesSection,
  modalidades: ModalidadesSection,
  lotes: LotesSection,
  kits: KitsSection,
  retirada: RetiradaSection,
  info: InfoSection,
  faq: InfoSection,
  percurso: PercursoSection,
  patrocinadores: PatrocinadoresSection,
  depoimentos: DepoimentosSection,
  checkout: CheckoutCtaSection,
};
