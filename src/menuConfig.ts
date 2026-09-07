import {APP_LANGUAGES, AppLanguage, DEFAULT_LANGUAGE} from './i18n';

export type CustomSite = {
  id: string;
  label: string;
  url: string;
};

export const DEFAULT_CUSTOM_SITES: CustomSite[] = [
  {id: 'site-bilibili', label: 'B站', url: 'https://www.bilibili.com/'},
];

export const BUILTIN_MENU_IDS = [
  'back',
  'forward',
  'refresh',
  'home',
  'address',
  'cursor',
  'settings',
  'exit',
] as const;

export type BuiltinMenuId = (typeof BUILTIN_MENU_IDS)[number];

export const BUILTIN_MENU_LABELS: Record<BuiltinMenuId, string> = {
  back: '后退',
  forward: '前进',
  refresh: '刷新',
  home: '主页',
  address: '输入网址',
  cursor: '网页光标',
  settings: '设置',
  exit: '退出',
};

export const DEFAULT_MENU_ORDER = [
  'back',
  'forward',
  'refresh',
  'home',
  'address',
  'cursor',
  'site-bilibili',
  'settings',
  'exit',
];

export type MenuPreferences = {
  customSites: CustomSite[];
  order: string[];
  theme: MenuTheme;
  language: AppLanguage;
};

export type MenuTheme = {
  backgroundColor: string;
  itemColor: string;
  accentColor: string;
};

export const DEFAULT_MENU_THEME: MenuTheme = {
  backgroundColor: '#081426',
  itemColor: '#182B44',
  accentColor: '#286EA2',
};

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const isCustomSite = (value: unknown): value is CustomSite => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const site = value as Partial<CustomSite>;
  return (
    typeof site.id === 'string' &&
    site.id.startsWith('site-') &&
    typeof site.label === 'string' &&
    site.label.trim().length > 0 &&
    typeof site.url === 'string' &&
    site.url.trim().length > 0
  );
};

export const normalizeMenuPreferences = (value: unknown): MenuPreferences => {
  const stored =
    value && typeof value === 'object'
      ? (value as Partial<MenuPreferences>)
      : {};
  const customSites = Array.isArray(stored.customSites)
    ? stored.customSites.filter(isCustomSite)
    : DEFAULT_CUSTOM_SITES;
  const validIds = new Set<string>([
    ...BUILTIN_MENU_IDS,
    ...customSites.map((site) => site.id),
  ]);
  const storedOrder = Array.isArray(stored.order)
    ? stored.order.filter(
        (id, index, ids): id is string =>
          typeof id === 'string' &&
          validIds.has(id) &&
          ids.indexOf(id) === index,
      )
    : [];
  const defaults = [
    ...DEFAULT_MENU_ORDER.filter((id) => validIds.has(id)),
    ...customSites
      .map((site) => site.id)
      .filter((id) => !DEFAULT_MENU_ORDER.includes(id)),
  ];
  const order = [
    ...storedOrder,
    ...defaults.filter((id) => !storedOrder.includes(id)),
  ];

  const storedTheme = stored.theme;
  const theme = {
    backgroundColor: isHexColor(storedTheme?.backgroundColor)
      ? storedTheme.backgroundColor
      : DEFAULT_MENU_THEME.backgroundColor,
    itemColor: isHexColor(storedTheme?.itemColor)
      ? storedTheme.itemColor
      : DEFAULT_MENU_THEME.itemColor,
    accentColor: isHexColor(storedTheme?.accentColor)
      ? storedTheme.accentColor
      : DEFAULT_MENU_THEME.accentColor,
  };

  const language = APP_LANGUAGES.includes(stored.language as AppLanguage)
    ? (stored.language as AppLanguage)
    : DEFAULT_LANGUAGE;

  return {customSites, order, theme, language};
};

export const insertSiteBeforeSettings = (order: string[], siteId: string) => {
  const nextOrder = order.filter((id) => id !== siteId);
  const settingsIndex = nextOrder.indexOf('settings');
  nextOrder.splice(
    settingsIndex < 0 ? nextOrder.length : settingsIndex,
    0,
    siteId,
  );
  return nextOrder;
};

export const moveMenuItem = (order: string[], from: number, to: number) => {
  if (
    from < 0 ||
    from >= order.length ||
    to < 0 ||
    to >= order.length ||
    from === to
  ) {
    return order;
  }
  const nextOrder = [...order];
  const [item] = nextOrder.splice(from, 1);
  nextOrder.splice(to, 0, item);
  return nextOrder;
};
