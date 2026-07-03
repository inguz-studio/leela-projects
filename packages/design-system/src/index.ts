// =============================================================================
// @leela/design-system — public API
// =============================================================================

// ── Theme ──────────────────────────────────────────────────────────────────
export {
  ThemeProvider,
  useTheme,
  type Theme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './theme/ThemeProvider';

export {
  ThemeProviderRN,
  useTheme as useThemeRN,
  type ThemeProviderRNProps,
  type StorageAdapter,
  type RNThemeContextValue,
} from './theme/ThemeProviderRN';

export {
  generateCSS,
  generateRNTheme,
  collectRefs,
  resolvePath,
  flattenTokens,
  type TokenRecord,
  type FlatTokens,
} from './theme/generate';

export { brasaTheme, leelaTheme } from './theme/rn-themes';

// ── Atoms ──────────────────────────────────────────────────────────────────
export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { Input, type InputProps } from './components/Input';
export { Badge, badgeVariants, type BadgeProps } from './components/Badge';
export { Chip, type ChipProps } from './components/Chip';
export { Avatar, type AvatarProps } from './components/Avatar';
export { Divider, type DividerProps } from './components/Divider';

// ── Shell (S001-3-T1) ───────────────────────────────────────────────────────
export { Sidebar, DEFAULT_SIDEBAR_SECTIONS } from './components/Sidebar';
export type { SidebarProps, SidebarSection, SidebarItem } from './components/Sidebar';
export { Breadcrumb } from './components/Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItem } from './components/Breadcrumb';
export { PageHeader } from './components/PageHeader';
export type { PageHeaderProps } from './components/PageHeader';
export { SubNav } from './components/SubNav';
export type { SubNavProps, SubNavTab } from './components/SubNav';
export { AppShell } from './components/AppShell';
export type { AppShellProps } from './components/AppShell';

// ── Table densa & apoio (S001-3-T2) ─────────────────────────────────────────
export { Table } from './components/Table';
export type { TableProps, TableColumn } from './components/Table';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { Pagination, type PaginationProps } from './components/Pagination';
export { Popover } from './components/Popover';
export type { PopoverProps, PopoverAction } from './components/Popover';

// ── Modais (S001-3-T3) ──────────────────────────────────────────────────────
export { Modal, ConfirmModal } from './components/Modal';
export type { ModalProps, ModalSize, ConfirmModalProps, ConfirmModalDetails } from './components/Modal';

// ── Utilities ──────────────────────────────────────────────────────────────
export { cn } from './utils/cn';
