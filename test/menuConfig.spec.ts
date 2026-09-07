import {
  DEFAULT_MENU_THEME,
  DEFAULT_MENU_ORDER,
  insertSiteBeforeSettings,
  moveMenuItem,
  normalizeMenuPreferences,
} from '../src/menuConfig';

describe('menu configuration', () => {
  it('repairs incomplete saved configuration without losing its order', () => {
    const preferences = normalizeMenuPreferences({
      customSites: [
        {id: 'site-example', label: '示例', url: 'https://example.com'},
      ],
      order: ['site-example', 'home'],
    });

    expect(preferences.order.slice(0, 2)).toEqual(['site-example', 'home']);
    expect(preferences.order).toEqual(
      expect.arrayContaining(['back', 'cursor', 'settings', 'exit']),
    );
  });

  it('uses the default Bilibili shortcut for a new installation', () => {
    const preferences = normalizeMenuPreferences(null);
    expect(preferences.order).toEqual(DEFAULT_MENU_ORDER);
    expect(preferences.theme).toEqual(DEFAULT_MENU_THEME);
    expect(preferences.language).toBe('en');
  });

  it('keeps an intentionally empty website list after all sites are deleted', () => {
    const preferences = normalizeMenuPreferences({
      customSites: [],
      order: DEFAULT_MENU_ORDER.filter((id) => id !== 'site-bilibili'),
    });

    expect(preferences.customSites).toEqual([]);
    expect(preferences.order).not.toContain('site-bilibili');
  });

  it('inserts a new site immediately before settings', () => {
    expect(
      insertSiteBeforeSettings(['home', 'settings', 'exit'], 'site-new'),
    ).toEqual(['home', 'site-new', 'settings', 'exit']);
  });

  it('moves an item to the requested list position', () => {
    expect(moveMenuItem(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c']);
  });

  it('preserves valid custom colors and repairs invalid colors', () => {
    expect(
      normalizeMenuPreferences({
        theme: {
          backgroundColor: '#123456',
          itemColor: '#654321',
          accentColor: 'blue',
        },
      }).theme,
    ).toEqual({
      backgroundColor: '#123456',
      itemColor: '#654321',
      accentColor: DEFAULT_MENU_THEME.accentColor,
    });
  });

  it('preserves a supported language and repairs an unsupported language', () => {
    expect(normalizeMenuPreferences({language: 'ko'}).language).toBe('ko');
    expect(normalizeMenuPreferences({language: 'de'}).language).toBe('en');
  });
});
