import {WebView} from '@amazon-devices/webview';
import {
  TouchEvent,
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewMethods,
  WebViewNavigationEvent,
} from '@amazon-devices/webview/dist/types/WebViewTypes';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextProps,
  TextInput,
  View,
} from 'react-native';
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
  useTVEventHandler,
  TVFocusGuideView,
} from '@amazon-devices/react-native-kepler';
import {
  BUILTIN_MENU_IDS,
  BuiltinMenuId,
  CustomSite,
  DEFAULT_CUSTOM_SITES,
  DEFAULT_MENU_ORDER,
  DEFAULT_MENU_THEME,
  MenuTheme,
  insertSiteBeforeSettings,
  moveMenuItem,
  normalizeMenuPreferences,
} from './menuConfig';
import {
  APP_LANGUAGES,
  AppLanguage,
  DEFAULT_LANGUAGE,
  fontForLanguage,
  LANGUAGE_NAMES,
  translate,
  TranslationKey,
} from './i18n';
import {normalizeAddress} from './navigation';

// Vega SDK exposes this persistent, app-scoped store as a CommonJS module.
const AsyncStorage =
  require('@amazon-devices/react-native-kepler/Libraries/Storage/AsyncStorage') as {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
  };

const HOME_URL = 'https://www.google.com/';
const CURSOR_STEP = 8;
const CURSOR_REPEAT_MS = 55;
const CURSOR_SIZE = 14;
const CURSOR_HOTSPOT = CURSOR_SIZE / 2;
const MENU_STORAGE_KEY = 'vega-browser-menu-preferences-v1';
const CHINESE_FONT = 'Noto Sans CJK SC';
const DEFAULT_SITE_URL_PREFIX = 'https://www.';
const PAGE_SCROLL_STEP = 320;
const APP_VERSION = '1.0.0';
const GITHUB_REPOSITORY_URL =
  'https://github.com/LW-ctrl1984/browser-for-vega';

type BrowserWebView = WebViewMethods & {reload: () => void};
type Viewport = {width: number; height: number};
type SettingsView =
  | 'main'
  | 'add-site'
  | 'delete-site'
  | 'sort'
  | 'colors'
  | 'language'
  | 'about'
  | 'disclaimer'
  | 'licenses';

const BACKGROUND_COLORS: {labelKey: TranslationKey; value: string}[] = [
  {labelKey: 'midnight', value: '#081426'},
  {labelKey: 'deepBlue', value: '#0A2038'},
  {labelKey: 'darkPurple', value: '#20142F'},
  {labelKey: 'inkGreen', value: '#0B2923'},
  {labelKey: 'warmGray', value: '#29221E'},
];

const ACCENT_COLORS: {labelKey: TranslationKey; value: string}[] = [
  {labelKey: 'skyBlue', value: '#286EA2'},
  {labelKey: 'cyan', value: '#008EAA'},
  {labelKey: 'purple', value: '#7056C8'},
  {labelKey: 'red', value: '#B83D5A'},
  {labelKey: 'orange', value: '#B96325'},
];

const MENU_ITEM_COLORS: {labelKey: TranslationKey; value: string}[] = [
  {labelKey: 'navy', value: '#182B44'},
  {labelKey: 'grayBlue', value: '#33465F'},
  {labelKey: 'purpleGray', value: '#3B304B'},
  {labelKey: 'forest', value: '#223C36'},
  {labelKey: 'warmBrown', value: '#44352D'},
];

const BUILTIN_LABEL_KEYS: Record<BuiltinMenuId, TranslationKey> = {
  back: 'back',
  forward: 'forward',
  refresh: 'refresh',
  home: 'home',
  address: 'enterAddress',
  cursor: 'webCursor',
  settings: 'settings',
  exit: 'exit',
};

const hexToRgba = (hex: string, alpha: number) => {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const createKeyboardKeyScript = (
  key: string,
  code: string,
  keyCode: number,
) => `
  (() => {
    const key = ${JSON.stringify(key)};
    const code = ${JSON.stringify(code)};
    const keyCode = ${keyCode};
    const target = document.body || document.documentElement || document;
    const send = type => {
      const event = new KeyboardEvent(type, {
        key,
        code,
        bubbles: true,
        cancelable: true,
      });
      try {
        Object.defineProperty(event, 'keyCode', {get: () => keyCode});
        Object.defineProperty(event, 'which', {get: () => keyCode});
      } catch (_) {}
      target.dispatchEvent(event);
    };
    send('keydown');
    send('keypress');
    send('keyup');
  })();
`;

const createArrowKeyScript = (forward: boolean) =>
  createKeyboardKeyScript(
    forward ? 'ArrowRight' : 'ArrowLeft',
    forward ? 'ArrowRight' : 'ArrowLeft',
    forward ? 39 : 37,
  );

type Translator = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string;

const ThemeContext = React.createContext({
  ...DEFAULT_MENU_THEME,
  fontFamily: CHINESE_FONT,
});
const I18nContext = React.createContext<{
  language: AppLanguage;
  t: Translator;
}>({
  language: DEFAULT_LANGUAGE,
  t: (key, values) => translate(DEFAULT_LANGUAGE, key, values),
});

const Text = ({style, ...props}: TextProps) => {
  const {fontFamily} = React.useContext(ThemeContext);
  const {language} = React.useContext(I18nContext);
  return (
    <NativeText
      {...props}
      style={[style, {fontFamily}, language === 'ar' && styles.rtlText]}
    />
  );
};

type ToolbarButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  preferredFocus?: boolean;
  wide?: boolean;
};

const ToolbarButton = ({
  label,
  onPress,
  disabled = false,
  active = false,
  preferredFocus = false,
  wide = false,
}: ToolbarButtonProps) => {
  const [focused, setFocused] = useState(false);
  const {accentColor, itemColor} = React.useContext(ThemeContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hasTVPreferredFocus={preferredFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.button,
        {backgroundColor: hexToRgba(itemColor, 0.92)},
        wide && styles.menuButton,
        active && [styles.buttonActive, {backgroundColor: accentColor}],
        disabled && styles.buttonDisabled,
        focused && [styles.focused, {backgroundColor: accentColor}],
        wide && focused && styles.menuButtonFocused,
      ]}>
      <Text numberOfLines={1} style={styles.buttonText}>
        {label}
      </Text>
    </Pressable>
  );
};

const ColorChoice = ({
  label,
  value,
  selected,
  preferredFocus = false,
  onPress,
}: {
  label: string;
  value: string;
  selected: boolean;
  preferredFocus?: boolean;
  onPress: () => void;
}) => {
  const [focused, setFocused] = useState(false);
  const {accentColor} = React.useContext(ThemeContext);
  const {t} = React.useContext(I18nContext);
  return (
    <Pressable
      accessibilityLabel={`${label}${selected ? `, ${t('selected')}` : ''}`}
      accessibilityRole="button"
      hasTVPreferredFocus={preferredFocus}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={[
        styles.colorChoice,
        selected && [styles.colorChoiceSelected, {borderColor: accentColor}],
        focused && styles.colorChoiceFocused,
      ]}>
      <View style={[styles.colorSwatch, {backgroundColor: value}]} />
      <Text numberOfLines={1} style={styles.colorChoiceLabel}>
        {label}
      </Text>
      <Text style={styles.colorChoiceCheck}>{selected ? '✓' : ''}</Text>
    </Pressable>
  );
};

const MenuOrderEditor = ({
  order,
  getLabel,
  moving,
  onMovingChange,
  onOrderChange,
}: {
  order: string[];
  getLabel: (id: string) => string;
  moving: boolean;
  onMovingChange: (moving: boolean) => void;
  onOrderChange: (order: string[]) => void;
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const {accentColor} = React.useContext(ThemeContext);
  const {t} = React.useContext(I18nContext);
  const scrollRef = useRef<ScrollView | null>(null);
  const rowRefs = useRef(
    new Map<
      string,
      React.ElementRef<typeof Pressable> & {requestTVFocus?: () => void}
    >(),
  );

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(0, order.length - 1)));
  }, [order.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, selectedIndex * 56 - 112),
      animated: true,
    });
  }, [selectedIndex]);

  const selectedId = order[selectedIndex];

  const focusRow = (id: string, index: number) => {
    if (!moving || id === selectedId) {
      setSelectedIndex(index);
      return;
    }

    const movingIndex = order.indexOf(selectedId);
    if (movingIndex < 0) {
      setSelectedIndex(index);
      return;
    }
    onOrderChange(moveMenuItem(order, movingIndex, index));
    setSelectedIndex(index);
    setTimeout(() => rowRefs.current.get(selectedId)?.requestTVFocus?.(), 30);
  };

  return (
    <TVFocusGuideView
      autoFocus
      trapFocusDown
      trapFocusLeft
      trapFocusRight
      trapFocusUp
      style={styles.sortFocusGuide}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.sortList}
        focusable={false}
        showsVerticalScrollIndicator={false}>
        {order.map((id, index) => (
          <Pressable
            ref={(row) => {
              if (row) {
                rowRefs.current.set(id, row);
              } else {
                rowRefs.current.delete(id);
              }
            }}
            accessibilityLabel={t('sortItem', {name: getLabel(id)})}
            accessibilityRole="button"
            hasTVPreferredFocus={index === 0}
            key={id}
            onFocus={() => focusRow(id, index)}
            onPress={() => onMovingChange(!moving)}
            style={[
              styles.sortRow,
              index === selectedIndex && [
                styles.sortRowSelected,
                {backgroundColor: accentColor},
              ],
              id === selectedId &&
                moving && [styles.sortRowMoving, {borderColor: accentColor}],
            ]}>
            <Text style={styles.sortPosition}>{index + 1}</Text>
            <Text numberOfLines={1} style={styles.sortLabel}>
              {getLabel(id)}
            </Text>
            <Text style={styles.sortIndicator}>
              {id === selectedId
                ? moving
                  ? t('moving')
                  : t('pressOkMove')
                : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </TVFocusGuideView>
  );
};

const WebCursor = ({
  viewport,
  webRef,
}: {
  viewport: Viewport;
  webRef: React.RefObject<BrowserWebView | null>;
}) => {
  const {t} = React.useContext(I18nContext);
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeDirectionRef = useRef('');
  const lastClickAtRef = useRef(0);
  const [cursor, setCursor] = useState({
    x: Math.max(0, viewport.width / 2 - CURSOR_SIZE / 2),
    y: Math.max(0, viewport.height / 2 - CURSOR_SIZE / 2),
  });

  useEffect(() => {
    setCursor((point) => ({
      x: Math.min(point.x, Math.max(0, viewport.width - CURSOR_SIZE)),
      y: Math.min(point.y, Math.max(0, viewport.height - CURSOR_SIZE)),
    }));
  }, [viewport]);

  const moveCursor = useCallback(
    (direction: string) => {
      setCursor((point) => ({
        x: Math.max(
          0,
          Math.min(
            viewport.width - CURSOR_SIZE,
            point.x +
              (direction === 'right'
                ? CURSOR_STEP
                : direction === 'left'
                ? -CURSOR_STEP
                : 0),
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            viewport.height - CURSOR_SIZE,
            point.y +
              (direction === 'down'
                ? CURSOR_STEP
                : direction === 'up'
                ? -CURSOR_STEP
                : 0),
          ),
        ),
      }));
    },
    [viewport],
  );

  const clickCursor = useCallback(() => {
    const webView = webRef.current;
    if (!webView || viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    const visualViewport = webView.getVisualViewportInfo();
    const clientX =
      ((cursor.x + CURSOR_HOTSPOT) / viewport.width) * visualViewport.width;
    const clientY =
      ((cursor.y + CURSOR_HOTSPOT) / viewport.height) * visualViewport.height;
    const touches = [{clientX, clientY}];
    console.info('VegaBrowser cursor click', {clientX, clientY});
    webView.dispatchTouchEvent(new TouchEvent('touchstart', {touches}));
    webView.dispatchTouchEvent(new TouchEvent('touchend', {touches}));
  }, [cursor, viewport, webRef]);

  const activateCursor = useCallback(() => {
    const now = Date.now();
    if (now - lastClickAtRef.current < 250) {
      return;
    }
    lastClickAtRef.current = now;
    clickCursor();
  }, [clickCursor]);

  const stopMoving = useCallback(() => {
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
    activeDirectionRef.current = '';
  }, []);

  useEffect(() => stopMoving, [stopMoving]);

  useTVEventHandler((event) => {
    const action = event.eventKeyAction;

    if (
      event.eventType === 'select' &&
      (action === 0 || action === undefined)
    ) {
      activateCursor();
      return;
    }

    if (!['left', 'right', 'up', 'down'].includes(event.eventType)) {
      return;
    }

    if (action === 1) {
      stopMoving();
      return;
    }

    if (action !== 0 && action !== undefined) {
      return;
    }

    if (activeDirectionRef.current === event.eventType) {
      return;
    }

    stopMoving();
    activeDirectionRef.current = event.eventType;
    moveCursor(event.eventType);
    repeatTimerRef.current = setInterval(
      () => moveCursor(event.eventType),
      CURSOR_REPEAT_MS,
    );
  });

  return (
    <TVFocusGuideView
      autoFocus
      trapFocusDown
      trapFocusLeft
      trapFocusRight
      trapFocusUp
      style={styles.cursorControl}>
      <Pressable
        accessibilityLabel={t('cursorControl')}
        accessibilityRole="button"
        hasTVPreferredFocus
        onPress={activateCursor}
        style={styles.cursorControlPressable}>
        <View
          pointerEvents="none"
          style={[
            styles.cursor,
            {transform: [{translateX: cursor.x}, {translateY: cursor.y}]},
          ]}>
          <View style={styles.cursorDot} />
        </View>
      </Pressable>
    </TVFocusGuideView>
  );
};

export const App = () => {
  const webRef = useRef<BrowserWebView | null>(null);
  const addressInputRef = useRef<TextInput | null>(null);
  const siteNameInputRef = useRef<TextInput | null>(null);
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateX = useRef(new Animated.Value(-42)).current;
  const menuClosingRef = useRef(false);
  const lastWebControlRef = useRef({type: '', at: 0});
  const [sourceUrl, setSourceUrl] = useState(HOME_URL);
  const [address, setAddress] = useState(HOME_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursorMode, setCursorMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState(DEFAULT_SITE_URL_PREFIX);
  const [siteFormError, setSiteFormError] = useState('');
  const [pendingDeleteSiteId, setPendingDeleteSiteId] = useState<string | null>(
    null,
  );
  const [sortMoving, setSortMoving] = useState(false);
  const [customSites, setCustomSites] =
    useState<CustomSite[]>(DEFAULT_CUSTOM_SITES);
  const [menuOrder, setMenuOrder] = useState(DEFAULT_MENU_ORDER);
  const [menuTheme, setMenuTheme] = useState<MenuTheme>(DEFAULT_MENU_THEME);
  const [language, setLanguage] = useState<AppLanguage>(DEFAULT_LANGUAGE);
  const [menuPreferencesLoaded, setMenuPreferencesLoaded] = useState(false);
  const [viewport, setViewport] = useState({width: 1280, height: 600});
  const webSource = React.useMemo(() => ({uri: sourceUrl}), [sourceUrl]);

  usePreventHideSplashScreen();
  const hideSplashScreen = useHideSplashScreenCallback();

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(MENU_STORAGE_KEY)
      .then((value) => {
        if (!active) {
          return;
        }
        const preferences = normalizeMenuPreferences(
          value ? JSON.parse(value) : null,
        );
        setCustomSites(preferences.customSites);
        setMenuOrder(preferences.order);
        setMenuTheme(preferences.theme);
        setLanguage(preferences.language);
      })
      .catch((storageError) => {
        console.warn('Unable to load menu preferences', storageError);
      })
      .finally(() => {
        if (active) {
          setMenuPreferencesLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!menuPreferencesLoaded) {
      return;
    }
    AsyncStorage.setItem(
      MENU_STORAGE_KEY,
      JSON.stringify({
        customSites,
        order: menuOrder,
        theme: menuTheme,
        language,
      }),
    ).catch((storageError) => {
      console.warn('Unable to save menu preferences', storageError);
    });
  }, [customSites, language, menuOrder, menuPreferencesLoaded, menuTheme]);

  const t = useCallback<Translator>(
    (key, values) => translate(language, key, values),
    [language],
  );
  const interfaceTheme = React.useMemo(
    () => ({...menuTheme, fontFamily: fontForLanguage(language)}),
    [language, menuTheme],
  );

  const navigate = useCallback((value: string) => {
    const nextUrl = normalizeAddress(value);
    setAddress(nextUrl);
    setError('');
    setLoading(true);
    if (webRef.current) {
      webRef.current.injectJavaScript(
        `window.location.assign(${JSON.stringify(nextUrl)}); true;`,
      );
    } else {
      setSourceUrl(nextUrl);
    }
  }, []);

  const updateNavigation = useCallback((event: WebViewNavigationEvent) => {
    const {url, canGoBack: back, canGoForward: forward} = event.nativeEvent;
    setAddress(url);
    setCanGoBack(back);
    setCanGoForward(forward);
  }, []);

  const closeMenu = useCallback(
    (afterClose?: () => void) => {
      if (menuClosingRef.current) {
        return;
      }
      menuClosingRef.current = true;
      Animated.parallel([
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(menuTranslateX, {
          toValue: -42,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMenuOpen(false);
        menuClosingRef.current = false;
        afterClose?.();
      });
    },
    [menuOpacity, menuTranslateX],
  );

  useEffect(() => {
    if (!addressEditorOpen) {
      return;
    }
    const timeout = setTimeout(() => addressInputRef.current?.focus(), 80);
    return () => clearTimeout(timeout);
  }, [addressEditorOpen]);

  useEffect(() => {
    if (!settingsOpen || settingsView !== 'add-site') {
      return;
    }
    const timeout = setTimeout(() => siteNameInputRef.current?.focus(), 80);
    return () => clearTimeout(timeout);
  }, [settingsOpen, settingsView]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    menuClosingRef.current = false;
    menuOpacity.setValue(0);
    menuTranslateX.setValue(-42);
    Animated.parallel([
      Animated.timing(menuOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(menuTranslateX, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [menuOpen, menuOpacity, menuTranslateX]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (addressEditorOpen) {
          setAddressEditorOpen(false);
          return true;
        }
        if (exitPromptOpen) {
          setExitPromptOpen(false);
          return true;
        }
        if (settingsOpen) {
          if (pendingDeleteSiteId) {
            setPendingDeleteSiteId(null);
          } else if (settingsView === 'sort' && sortMoving) {
            setSortMoving(false);
          } else if (
            settingsView === 'disclaimer' ||
            settingsView === 'licenses'
          ) {
            setSettingsView('about');
          } else if (settingsView !== 'main') {
            setSettingsView('main');
          } else {
            setSettingsOpen(false);
          }
          return true;
        }
        if (menuOpen) {
          closeMenu();
          return true;
        }
        if (cursorMode) {
          setCursorMode(false);
          return true;
        }
        if (canGoBack) {
          webRef.current?.goBack();
          return true;
        }
        setExitPromptOpen(true);
        return true;
      },
    );
    return () => subscription.remove();
  }, [
    addressEditorOpen,
    canGoBack,
    closeMenu,
    cursorMode,
    exitPromptOpen,
    menuOpen,
    pendingDeleteSiteId,
    settingsOpen,
    settingsView,
    sortMoving,
  ]);

  useTVEventHandler((event) => {
    const action = event.eventKeyAction;
    if (action === 1) {
      return;
    }

    if (event.eventType === 'menu') {
      if (!menuOpen && !addressEditorOpen && !exitPromptOpen && !settingsOpen) {
        setCursorMode(false);
        setMenuOpen(true);
      }
      return;
    }

    if (menuOpen || addressEditorOpen || exitPromptOpen || settingsOpen) {
      return;
    }

    const mediaBackward = ['rewind', 'skip_backward'].includes(event.eventType);
    const mediaForward = ['forward', 'skip_forward'].includes(event.eventType);
    if (mediaBackward || mediaForward) {
      const now = Date.now();
      const type = mediaBackward ? 'seek-backward' : 'seek-forward';
      if (
        lastWebControlRef.current.type !== type ||
        now - lastWebControlRef.current.at >= 180
      ) {
        lastWebControlRef.current = {type, at: now};
        webRef.current?.injectJavaScript(createArrowKeyScript(mediaForward));
      }
      return;
    }

    if (cursorMode) {
      return;
    }

    if (event.eventType === 'up' || event.eventType === 'down') {
      webRef.current?.scrollBy(
        0,
        event.eventType === 'up' ? -PAGE_SCROLL_STEP : PAGE_SCROLL_STEP,
      );
      return;
    }

    const seekBackward = event.eventType === 'left';
    const seekForward = event.eventType === 'right';
    if (seekBackward || seekForward) {
      webRef.current?.injectJavaScript(createArrowKeyScript(seekForward));
    }
  });

  const onViewportLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setViewport({width, height});
  };

  const customSitesById = React.useMemo(
    () => new Map(customSites.map((site) => [site.id, site])),
    [customSites],
  );

  const getMenuLabel = useCallback(
    (id: string) => {
      if ((BUILTIN_MENU_IDS as readonly string[]).includes(id)) {
        return t(BUILTIN_LABEL_KEYS[id as BuiltinMenuId]);
      }
      const site = customSitesById.get(id);
      return site?.id === 'site-bilibili' ? t('bilibili') : site?.label || id;
    },
    [customSitesById, t],
  );

  const addCustomSite = useCallback(() => {
    const label = siteName.trim();
    const value = siteUrl.trim();
    if (!label || !value) {
      setSiteFormError(t('requiredSiteFields'));
      return;
    }
    const site: CustomSite = {
      id: `site-${Date.now()}`,
      label,
      url: normalizeAddress(value),
    };
    setCustomSites((sites) => [...sites, site]);
    setMenuOrder((order) => insertSiteBeforeSettings(order, site.id));
    setSiteName('');
    setSiteUrl(DEFAULT_SITE_URL_PREFIX);
    setSiteFormError('');
    setSettingsView('main');
  }, [siteName, siteUrl, t]);

  const deleteCustomSite = useCallback((siteId: string) => {
    setCustomSites((sites) => sites.filter((site) => site.id !== siteId));
    setMenuOrder((order) => order.filter((id) => id !== siteId));
    setPendingDeleteSiteId(null);
  }, []);

  const renderMenuItem = (id: string) => {
    const site = customSitesById.get(id);
    if (site) {
      return (
        <ToolbarButton
          key={id}
          label={getMenuLabel(id)}
          wide
          onPress={() => closeMenu(() => navigate(site.url))}
        />
      );
    }

    switch (id as BuiltinMenuId) {
      case 'back':
        return (
          <ToolbarButton
            key={id}
            label={t('back')}
            disabled={!canGoBack}
            wide
            onPress={() => closeMenu(() => webRef.current?.goBack())}
          />
        );
      case 'forward':
        return (
          <ToolbarButton
            key={id}
            label={t('forward')}
            disabled={!canGoForward}
            wide
            onPress={() => closeMenu(() => webRef.current?.goForward())}
          />
        );
      case 'refresh':
        return (
          <ToolbarButton
            key={id}
            label={t('refresh')}
            wide
            onPress={() => closeMenu(() => webRef.current?.reload())}
          />
        );
      case 'home':
        return (
          <ToolbarButton
            key={id}
            label={t('home')}
            wide
            onPress={() => closeMenu(() => navigate(HOME_URL))}
          />
        );
      case 'address':
        return (
          <ToolbarButton
            key={id}
            label={t('enterAddress')}
            wide
            onPress={() => closeMenu(() => setAddressEditorOpen(true))}
          />
        );
      case 'cursor':
        return (
          <ToolbarButton
            key={id}
            label={t('webCursor')}
            preferredFocus
            wide
            onPress={() => closeMenu(() => setCursorMode(true))}
          />
        );
      case 'settings':
        return (
          <ToolbarButton
            key={id}
            label={t('settings')}
            wide
            onPress={() =>
              closeMenu(() => {
                setSettingsView('main');
                setSettingsOpen(true);
              })
            }
          />
        );
      case 'exit':
        return (
          <ToolbarButton
            key={id}
            label={t('exit')}
            wide
            onPress={() => closeMenu(() => setExitPromptOpen(true))}
          />
        );
      default:
        return null;
    }
  };

  return (
    <I18nContext.Provider value={{language, t}}>
      <ThemeContext.Provider value={interfaceTheme}>
        <View style={styles.container}>
          <View onLayout={onViewportLayout} style={styles.webContainer}>
            <WebView
              ref={webRef}
              style={styles.webview}
              focusable={false}
              allowsDefaultMediaControl={false}
              domStorageEnabled
              javaScriptEnabled
              mediaPlaybackRequiresUserAction={false}
              mixedContentMode="compatibility"
              thirdPartyCookiesEnabled
              source={webSource}
              onLoadStart={(event) => {
                setLoading(true);
                setError('');
                updateNavigation(event);
              }}
              onLoad={(event) => {
                setLoading(false);
                updateNavigation(event);
                hideSplashScreen();
              }}
              onError={({nativeEvent}: WebViewErrorEvent) => {
                setLoading(false);
                setError(
                  t('loadFailed', {
                    code: nativeEvent.code,
                    description: nativeEvent.description,
                  }),
                );
                hideSplashScreen();
              }}
              onHttpError={({nativeEvent}: WebViewHttpErrorEvent) => {
                if (nativeEvent.isMainFrame) {
                  setError(t('httpError', {status: nativeEvent.statusCode}));
                }
              }}
              onSslError={(_sslError, callback) => callback.cancel()}
            />
            {cursorMode && <WebCursor viewport={viewport} webRef={webRef} />}
          </View>

          <Modal
            animationType="fade"
            onRequestClose={() => closeMenu()}
            transparent
            visible={menuOpen}>
            <View
              style={[
                styles.menuOverlay,
                {backgroundColor: hexToRgba(menuTheme.backgroundColor, 0.22)},
              ]}>
              <Animated.View
                style={[
                  styles.sideMenuFrame,
                  {
                    opacity: menuOpacity,
                    transform: [{translateX: menuTranslateX}],
                  },
                ]}>
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={[
                    styles.sideMenu,
                    {
                      backgroundColor: hexToRgba(
                        menuTheme.backgroundColor,
                        0.75,
                      ),
                      borderRightColor: menuTheme.accentColor,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.menuEyebrow,
                      {color: menuTheme.accentColor},
                    ]}>
                    Browser for Vega
                  </Text>
                  <Text style={styles.menuTitle}>{t('browserMenu')}</Text>
                  <ScrollView
                    contentContainerStyle={styles.menuScrollContent}
                    focusable={false}
                    showsVerticalScrollIndicator={false}
                    style={styles.menuScroll}>
                    {menuOrder.map(renderMenuItem)}
                    <View style={styles.menuStatusCard}>
                      <Text numberOfLines={2} style={styles.menuStatus}>
                        {error || (loading ? t('loading') : address)}
                      </Text>
                    </View>
                    <Text style={styles.menuHint}>{t('menuHint')}</Text>
                  </ScrollView>
                </TVFocusGuideView>
              </Animated.View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            onRequestClose={() => {
              if (pendingDeleteSiteId) {
                setPendingDeleteSiteId(null);
              } else if (
                settingsView === 'disclaimer' ||
                settingsView === 'licenses'
              ) {
                setSettingsView('about');
              } else if (settingsView !== 'main') {
                setSortMoving(false);
                setSettingsView('main');
              } else {
                setSettingsOpen(false);
              }
            }}
            transparent
            visible={settingsOpen}>
            <View
              style={[
                styles.modalBackdrop,
                {backgroundColor: hexToRgba(menuTheme.backgroundColor, 0.82)},
              ]}>
              {settingsView === 'main' && (
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={[styles.settingsDialog, styles.settingsHomeDialog]}>
                  <Text
                    style={[
                      styles.settingsEyebrow,
                      {color: menuTheme.accentColor},
                    ]}>
                    Browser for Vega
                  </Text>
                  <Text style={styles.dialogTitle}>{t('settings')}</Text>
                  <Text style={styles.dialogDescription}>
                    {t('settingsDescription')}
                  </Text>
                  <ScrollView
                    contentContainerStyle={styles.settingsActions}
                    focusable={false}
                    showsVerticalScrollIndicator
                    style={styles.settingsHomeScroll}>
                    <ToolbarButton
                      label={t('addSite')}
                      preferredFocus
                      wide
                      onPress={() => {
                        setSiteName('');
                        setSiteUrl(DEFAULT_SITE_URL_PREFIX);
                        setSiteFormError('');
                        setSettingsView('add-site');
                      }}
                    />
                    <ToolbarButton
                      label={t('deleteSite')}
                      wide
                      onPress={() => {
                        setPendingDeleteSiteId(null);
                        setSettingsView('delete-site');
                      }}
                    />
                    <ToolbarButton
                      label={t('sortMenu')}
                      wide
                      onPress={() => {
                        setSortMoving(false);
                        setSettingsView('sort');
                      }}
                    />
                    <ToolbarButton
                      label={t('colors')}
                      wide
                      onPress={() => setSettingsView('colors')}
                    />
                    <ToolbarButton
                      label={t('language')}
                      wide
                      onPress={() => setSettingsView('language')}
                    />
                    <ToolbarButton
                      label={t('about')}
                      wide
                      onPress={() => setSettingsView('about')}
                    />
                    <ToolbarButton
                      label={t('closeSettings')}
                      wide
                      onPress={() => setSettingsOpen(false)}
                    />
                  </ScrollView>
                </TVFocusGuideView>
              )}

              {settingsView === 'add-site' && (
                <TVFocusGuideView autoFocus style={styles.settingsDialog}>
                  <Text style={styles.dialogTitle}>{t('addSite')}</Text>
                  <Text style={styles.inputLabel}>{t('menuName')}</Text>
                  <TextInput
                    ref={siteNameInputRef}
                    accessibilityLabel={t('menuName')}
                    onChangeText={(text) => {
                      setSiteName(text);
                      setSiteFormError('');
                    }}
                    placeholder={t('menuNameExample')}
                    placeholderTextColor="#8793a7"
                    returnKeyType="next"
                    style={[
                      styles.addressInput,
                      {
                        fontFamily: interfaceTheme.fontFamily,
                      },
                      language === 'ar' ? styles.rtlInput : styles.ltrInput,
                    ]}
                    value={siteName}
                  />
                  <Text style={styles.inputLabel}>{t('websiteAddress')}</Text>
                  <TextInput
                    accessibilityLabel={t('websiteAddress')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(text) => {
                      setSiteUrl(text);
                      setSiteFormError('');
                    }}
                    onSubmitEditing={addCustomSite}
                    placeholder={t('websiteExample')}
                    placeholderTextColor="#8793a7"
                    returnKeyType="done"
                    style={[
                      styles.addressInput,
                      {
                        fontFamily: interfaceTheme.fontFamily,
                      },
                      language === 'ar' ? styles.rtlInput : styles.ltrInput,
                    ]}
                    value={siteUrl}
                  />
                  {!!siteFormError && (
                    <Text style={styles.formError}>{siteFormError}</Text>
                  )}
                  <View style={styles.dialogActions}>
                    <ToolbarButton
                      label={t('addToMenu')}
                      onPress={addCustomSite}
                    />
                    <ToolbarButton
                      label={t('cancel')}
                      onPress={() => {
                        setSiteFormError('');
                        setSettingsView('main');
                      }}
                    />
                  </View>
                </TVFocusGuideView>
              )}

              {settingsView === 'delete-site' && !pendingDeleteSiteId && (
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={styles.settingsDialog}>
                  <Text style={styles.dialogTitle}>{t('deleteSite')}</Text>
                  <Text style={styles.dialogDescription}>
                    {t('deleteSiteDescription')}
                  </Text>
                  {customSites.length > 0 ? (
                    <ScrollView
                      contentContainerStyle={styles.settingsActions}
                      focusable={false}
                      showsVerticalScrollIndicator={false}>
                      {customSites.map((site, index) => (
                        <ToolbarButton
                          key={site.id}
                          label={getMenuLabel(site.id)}
                          preferredFocus={index === 0}
                          wide
                          onPress={() => setPendingDeleteSiteId(site.id)}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.emptyMessage}>
                      {t('noCustomSites')}
                    </Text>
                  )}
                  <ToolbarButton
                    label={t('backToSettings')}
                    preferredFocus={customSites.length === 0}
                    wide
                    onPress={() => setSettingsView('main')}
                  />
                </TVFocusGuideView>
              )}

              {settingsView === 'delete-site' && !!pendingDeleteSiteId && (
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={styles.exitDialog}>
                  <Text style={styles.dialogTitle}>
                    {t('deleteSiteConfirm')}
                  </Text>
                  <Text style={styles.deleteSiteName}>
                    {getMenuLabel(pendingDeleteSiteId)}
                  </Text>
                  <View style={styles.dialogActions}>
                    <ToolbarButton
                      label={t('cancel')}
                      preferredFocus
                      onPress={() => setPendingDeleteSiteId(null)}
                    />
                    <ToolbarButton
                      label={t('confirmDelete')}
                      onPress={() => deleteCustomSite(pendingDeleteSiteId)}
                    />
                  </View>
                </TVFocusGuideView>
              )}

              {settingsView === 'colors' && (
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={styles.colorDialog}>
                  <Text style={styles.dialogTitle}>{t('colors')}</Text>
                  <Text style={styles.dialogDescription}>
                    {t('colorsDescription')}
                  </Text>
                  <Text style={styles.colorSectionTitle}>
                    {t('backgroundMask')}
                  </Text>
                  <View style={styles.colorChoices}>
                    {BACKGROUND_COLORS.map((color, index) => (
                      <ColorChoice
                        key={color.value}
                        label={t(color.labelKey)}
                        onPress={() =>
                          setMenuTheme((theme) => ({
                            ...theme,
                            backgroundColor: color.value,
                          }))
                        }
                        preferredFocus={index === 0}
                        selected={menuTheme.backgroundColor === color.value}
                        value={color.value}
                      />
                    ))}
                  </View>
                  <Text style={styles.colorSectionTitle}>
                    {t('inactiveButtons')}
                  </Text>
                  <View style={styles.colorChoices}>
                    {MENU_ITEM_COLORS.map((color) => (
                      <ColorChoice
                        key={color.value}
                        label={t(color.labelKey)}
                        onPress={() =>
                          setMenuTheme((theme) => ({
                            ...theme,
                            itemColor: color.value,
                          }))
                        }
                        selected={menuTheme.itemColor === color.value}
                        value={color.value}
                      />
                    ))}
                  </View>
                  <Text style={styles.colorSectionTitle}>
                    {t('accentDecoration')}
                  </Text>
                  <View style={styles.colorChoices}>
                    {ACCENT_COLORS.map((color) => (
                      <ColorChoice
                        key={color.value}
                        label={t(color.labelKey)}
                        onPress={() =>
                          setMenuTheme((theme) => ({
                            ...theme,
                            accentColor: color.value,
                          }))
                        }
                        selected={menuTheme.accentColor === color.value}
                        value={color.value}
                      />
                    ))}
                  </View>
                  <ToolbarButton
                    label={t('backToSettings')}
                    wide
                    onPress={() => setSettingsView('main')}
                  />
                </TVFocusGuideView>
              )}

              {settingsView === 'language' && (
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={styles.languageDialog}>
                  <Text style={styles.dialogTitle}>{t('language')}</Text>
                  <Text style={styles.dialogDescription}>
                    {t('languageDescription')}
                  </Text>
                  <View style={styles.languageGrid}>
                    {APP_LANGUAGES.map((option) => (
                      <View key={option} style={styles.languageCell}>
                        <ToolbarButton
                          active={language === option}
                          label={LANGUAGE_NAMES[option]}
                          onPress={() => {
                            setError('');
                            setLanguage(option);
                          }}
                          preferredFocus={language === option}
                          wide
                        />
                      </View>
                    ))}
                  </View>
                  <ToolbarButton
                    label={t('backToSettings')}
                    wide
                    onPress={() => setSettingsView('main')}
                  />
                </TVFocusGuideView>
              )}

              {settingsView === 'about' && (
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={styles.aboutDialog}>
                  <Text style={styles.dialogTitle}>Browser for Vega</Text>
                  <Text style={styles.aboutVersion}>
                    {t('version', {version: APP_VERSION})}
                  </Text>
                  <Text style={styles.dialogDescription}>
                    {t('aboutDescription')}
                  </Text>
                  <View style={styles.settingsActions}>
                    <ToolbarButton
                      label={t('githubRepository')}
                      preferredFocus
                      wide
                      onPress={() => {
                        setSettingsOpen(false);
                        navigate(GITHUB_REPOSITORY_URL);
                      }}
                    />
                    <ToolbarButton
                      label={t('openSourceLicenses')}
                      wide
                      onPress={() => setSettingsView('licenses')}
                    />
                    <ToolbarButton
                      label={t('disclaimer')}
                      wide
                      onPress={() => setSettingsView('disclaimer')}
                    />
                    <ToolbarButton
                      label={t('backToSettings')}
                      wide
                      onPress={() => setSettingsView('main')}
                    />
                  </View>
                  <Text style={styles.aboutFooter}>
                    {t('sourceAvailability')}
                  </Text>
                </TVFocusGuideView>
              )}

              {settingsView === 'disclaimer' && (
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={styles.legalDialog}>
                  <Text style={styles.dialogTitle}>{t('disclaimer')}</Text>
                  <ScrollView
                    contentContainerStyle={styles.legalContent}
                    focusable={false}
                    showsVerticalScrollIndicator>
                    <Text style={styles.legalParagraph}>
                      {t('disclaimerIndependent')}
                    </Text>
                    <Text style={styles.legalParagraph}>
                      {t('disclaimerNoAffiliation')}
                    </Text>
                    <Text style={styles.legalParagraph}>
                      {t('disclaimerTrademarks')}
                    </Text>
                    <Text style={styles.legalParagraph}>
                      {t('disclaimerAsIs')}
                    </Text>
                    <Text style={styles.legalParagraph}>
                      {t('sourceAvailability')}
                    </Text>
                  </ScrollView>
                  <ToolbarButton
                    label={t('backToAbout')}
                    preferredFocus
                    wide
                    onPress={() => setSettingsView('about')}
                  />
                </TVFocusGuideView>
              )}

              {settingsView === 'licenses' && (
                <TVFocusGuideView
                  autoFocus
                  trapFocusDown
                  trapFocusLeft
                  trapFocusRight
                  trapFocusUp
                  style={styles.legalDialog}>
                  <Text style={styles.dialogTitle}>
                    {t('openSourceLicenses')}
                  </Text>
                  <Text style={styles.dialogDescription}>
                    {t('licensesDescription')}
                  </Text>
                  <Text style={styles.licensesList}>{t('licensesList')}</Text>
                  <ToolbarButton
                    label={t('backToAbout')}
                    preferredFocus
                    wide
                    onPress={() => setSettingsView('about')}
                  />
                </TVFocusGuideView>
              )}

              {settingsView === 'sort' && (
                <View style={styles.sortDialog}>
                  <Text style={styles.dialogTitle}>{t('sortMenu')}</Text>
                  <Text style={styles.dialogDescription}>
                    {t('sortInstructions')}
                  </Text>
                  <MenuOrderEditor
                    getLabel={getMenuLabel}
                    moving={sortMoving}
                    onMovingChange={setSortMoving}
                    onOrderChange={setMenuOrder}
                    order={menuOrder}
                  />
                  <Text style={styles.sortFooter}>
                    {sortMoving ? t('movingFooter') : t('backFooter')}
                  </Text>
                </View>
              )}
            </View>
          </Modal>

          <Modal
            animationType="fade"
            onRequestClose={() => setAddressEditorOpen(false)}
            transparent
            visible={addressEditorOpen}>
            <View
              style={[
                styles.modalBackdrop,
                {backgroundColor: hexToRgba(menuTheme.backgroundColor, 0.82)},
              ]}>
              <TVFocusGuideView autoFocus style={styles.addressDialog}>
                <Text style={styles.dialogTitle}>{t('addressTitle')}</Text>
                <TextInput
                  ref={addressInputRef}
                  accessibilityLabel={t('addressTitle')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setAddress}
                  onSubmitEditing={() => {
                    setAddressEditorOpen(false);
                    navigate(address);
                  }}
                  placeholder={t('addressPlaceholder')}
                  placeholderTextColor="#8793a7"
                  returnKeyType="go"
                  selectTextOnFocus
                  style={[
                    styles.addressInput,
                    {
                      fontFamily: interfaceTheme.fontFamily,
                    },
                    language === 'ar' ? styles.rtlInput : styles.ltrInput,
                  ]}
                  value={address}
                />
                <View style={styles.dialogActions}>
                  <ToolbarButton
                    label={t('open')}
                    onPress={() => {
                      setAddressEditorOpen(false);
                      navigate(address);
                    }}
                  />
                  <ToolbarButton
                    label={t('cancel')}
                    onPress={() => setAddressEditorOpen(false)}
                  />
                </View>
              </TVFocusGuideView>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            onRequestClose={() => setExitPromptOpen(false)}
            transparent
            visible={exitPromptOpen}>
            <View
              style={[
                styles.modalBackdrop,
                {backgroundColor: hexToRgba(menuTheme.backgroundColor, 0.82)},
              ]}>
              <TVFocusGuideView
                autoFocus
                trapFocusDown
                trapFocusLeft
                trapFocusRight
                trapFocusUp
                style={styles.exitDialog}>
                <Text style={styles.dialogTitle}>{t('exitConfirm')}</Text>
                <View style={styles.dialogActions}>
                  <ToolbarButton
                    label={t('continueBrowsing')}
                    preferredFocus
                    onPress={() => setExitPromptOpen(false)}
                  />
                  <ToolbarButton
                    label={t('exitApp')}
                    onPress={() => BackHandler.exitApp()}
                  />
                </View>
              </TVFocusGuideView>
            </View>
          </Modal>
        </View>
      </ThemeContext.Provider>
    </I18nContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#07101f'},
  rtlText: {writingDirection: 'rtl'},
  rtlInput: {textAlign: 'right'},
  ltrInput: {textAlign: 'left'},
  button: {
    height: 52,
    minWidth: 76,
    paddingHorizontal: 15,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#334964',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 43, 68, 0.92)',
  },
  buttonActive: {backgroundColor: '#1d5f82', borderColor: '#59c7ff'},
  buttonDisabled: {opacity: 0.35},
  focused: {
    borderColor: '#ffffff',
    backgroundColor: '#286ea2',
    transform: [{scale: 1.06}],
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: CHINESE_FONT,
    fontSize: 18,
    fontWeight: '700',
  },
  menuButton: {width: '100%', height: 47, minHeight: 47},
  menuButtonFocused: {transform: [{scale: 1}]},
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 5, 14, 0.22)',
  },
  sideMenuFrame: {
    width: 304,
    height: '100%',
  },
  sideMenu: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    gap: 8,
    backgroundColor: 'rgba(8, 20, 38, 0.75)',
    borderRightWidth: 1,
    borderRightColor: '#4ca9d8',
  },
  menuEyebrow: {
    color: '#62c9ff',
    fontFamily: CHINESE_FONT,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  menuTitle: {
    marginBottom: 7,
    color: '#ffffff',
    fontFamily: CHINESE_FONT,
    fontSize: 26,
    fontWeight: '800',
  },
  menuScroll: {flex: 1, width: '100%'},
  menuScrollContent: {gap: 8, paddingBottom: 8},
  menuStatusCard: {
    marginTop: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#294764',
    backgroundColor: 'rgba(3, 12, 26, 0.52)',
  },
  menuStatus: {color: '#b9cae0', fontFamily: CHINESE_FONT, fontSize: 12},
  menuHint: {
    marginTop: 1,
    color: '#7188a5',
    fontFamily: CHINESE_FONT,
    fontSize: 11,
    textAlign: 'center',
  },
  addressInput: {
    width: 700,
    maxWidth: '100%',
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#f7f9fc',
    color: '#101827',
    fontFamily: CHINESE_FONT,
    fontSize: 19,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  addressDialog: {
    width: 820,
    maxWidth: '88%',
    padding: 30,
    gap: 22,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#111d30',
  },
  settingsDialog: {
    width: 820,
    maxWidth: '88%',
    maxHeight: '88%',
    padding: 30,
    gap: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#111d30',
  },
  settingsHomeDialog: {height: '88%'},
  settingsHomeScroll: {flex: 1, width: '100%'},
  settingsEyebrow: {
    color: '#62c9ff',
    fontFamily: CHINESE_FONT,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  dialogDescription: {
    color: '#b9cae0',
    fontFamily: CHINESE_FONT,
    fontSize: 17,
    lineHeight: 24,
  },
  settingsActions: {width: '100%', gap: 12, marginTop: 4},
  inputLabel: {
    color: '#dbe8f7',
    fontFamily: CHINESE_FONT,
    fontSize: 16,
    fontWeight: '700',
  },
  formError: {color: '#ff8ca4', fontFamily: CHINESE_FONT, fontSize: 15},
  emptyMessage: {
    paddingVertical: 34,
    color: '#8da6c3',
    fontFamily: CHINESE_FONT,
    fontSize: 17,
    textAlign: 'center',
  },
  deleteSiteName: {
    color: '#62c9ff',
    fontFamily: CHINESE_FONT,
    fontSize: 21,
    fontWeight: '700',
  },
  colorDialog: {
    width: 880,
    maxWidth: '92%',
    padding: 28,
    gap: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#111d30',
  },
  colorSectionTitle: {
    marginTop: 4,
    color: '#dbe8f7',
    fontFamily: CHINESE_FONT,
    fontSize: 17,
    fontWeight: '700',
  },
  colorChoices: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  colorChoice: {
    flex: 1,
    height: 78,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#334964',
    backgroundColor: 'rgba(24, 43, 68, 0.92)',
  },
  colorChoiceSelected: {borderWidth: 3},
  colorChoiceFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#344e6d',
    transform: [{scale: 1.04}],
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  colorChoiceLabel: {
    flex: 1,
    color: '#ffffff',
    fontFamily: CHINESE_FONT,
    fontSize: 14,
    fontWeight: '700',
  },
  colorChoiceCheck: {
    width: 14,
    color: '#ffffff',
    fontFamily: CHINESE_FONT,
    fontSize: 16,
    fontWeight: '800',
  },
  languageDialog: {
    width: 760,
    maxWidth: '88%',
    padding: 28,
    gap: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#111d30',
  },
  languageGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageCell: {width: '49%'},
  aboutDialog: {
    width: 720,
    maxWidth: '88%',
    padding: 30,
    gap: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#111d30',
  },
  aboutVersion: {
    color: '#8fcfee',
    fontFamily: CHINESE_FONT,
    fontSize: 18,
    fontWeight: '700',
  },
  aboutFooter: {
    color: '#8da6c3',
    fontFamily: CHINESE_FONT,
    fontSize: 14,
    lineHeight: 20,
  },
  legalDialog: {
    width: 860,
    maxWidth: '90%',
    maxHeight: '88%',
    padding: 28,
    gap: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#111d30',
  },
  legalContent: {gap: 13, paddingRight: 10},
  legalParagraph: {
    color: '#c7d6e8',
    fontFamily: CHINESE_FONT,
    fontSize: 16,
    lineHeight: 23,
  },
  licensesList: {
    color: '#c7d6e8',
    fontFamily: CHINESE_FONT,
    fontSize: 17,
    lineHeight: 31,
  },
  sortDialog: {
    width: 820,
    maxWidth: '88%',
    height: '84%',
    padding: 28,
    gap: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#111d30',
  },
  sortFocusGuide: {flex: 1, width: '100%'},
  sortList: {gap: 8, paddingVertical: 3},
  sortRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#294764',
    backgroundColor: 'rgba(24, 43, 68, 0.72)',
  },
  sortRowSelected: {
    borderColor: '#ffffff',
    backgroundColor: '#286ea2',
  },
  sortRowMoving: {
    borderColor: '#62c9ff',
    backgroundColor: '#1d5f82',
  },
  sortPosition: {
    width: 38,
    color: '#8fcfee',
    fontFamily: CHINESE_FONT,
    fontSize: 15,
    fontWeight: '800',
  },
  sortLabel: {
    flex: 1,
    color: '#ffffff',
    fontFamily: CHINESE_FONT,
    fontSize: 18,
    fontWeight: '700',
  },
  sortIndicator: {
    width: 118,
    color: '#d9f3ff',
    fontFamily: CHINESE_FONT,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  sortFooter: {
    color: '#8da6c3',
    fontFamily: CHINESE_FONT,
    fontSize: 14,
    textAlign: 'center',
  },
  exitDialog: {
    width: 580,
    maxWidth: '80%',
    padding: 34,
    gap: 26,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#53627a',
    backgroundColor: '#111d30',
  },
  dialogTitle: {
    color: '#ffffff',
    fontFamily: CHINESE_FONT,
    fontSize: 26,
    fontWeight: '700',
  },
  dialogActions: {flexDirection: 'row', justifyContent: 'center', gap: 16},
  webContainer: {flex: 1, overflow: 'hidden'},
  webview: {flex: 1, backgroundColor: '#ffffff'},
  cursorControl: {...StyleSheet.absoluteFillObject},
  cursorControlPressable: {flex: 1},
  cursor: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CURSOR_SIZE,
    height: CURSOR_SIZE,
    borderRadius: CURSOR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#e42b52',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cursorDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
});
