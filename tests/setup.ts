/// <reference types="jest" />
import '@testing-library/jest-native/extend-expect';

// babel-plugin-transform-typescript-metadata injects Reflect.metadata() calls around
// WatermelonDB @field decorators. reflect-metadata is not installed, so we polyfill
// the single method that Babel emits before any module requires it.
(global.Reflect as unknown as Record<string, unknown>).metadata = jest.fn(() => () => {});
import { configureInternal } from '@testing-library/react-native/build/config';

// React 19's act() is async; RNTL v12's detectHostComponentNames() breaks because
// renderWithAct() returns before renderer is initialised. Pre-configure to skip detection.
configureInternal({
  hostComponentNames: {
    text: 'Text',
    textInput: 'TextInput',
    image: 'Image',
    switch: 'Switch',
    scrollView: 'ScrollView',
    modal: 'Modal',
  },
});

// RN 0.83.6 defines Text/View/etc as arrow functions (React 19 ref-as-prop style).
// react-native/jest/mockComponent.js crashes accessing .prototype on them.
// Providing a flat mock avoids the broken mockComponent path entirely.
//
// Touchable components use a function wrapper so `accessible={true}` is applied
// by default — RNTL's getByRole() only finds elements that are accessibility
// elements (accessible !== undefined || known host type).
jest.mock('react-native', () => {
  const React = require('react');
  function Touchable(name: string) {
    return function MockTouchable({ accessible = true, ...props }: Record<string, unknown>) {
      return React.createElement(name, { accessible, ...props });
    };
  }
  return {
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    TouchableOpacity: Touchable('TouchableOpacity'),
    TouchableHighlight: Touchable('TouchableHighlight'),
    TouchableWithoutFeedback: Touchable('TouchableWithoutFeedback'),
    Pressable: Touchable('Pressable'),
    ActivityIndicator: 'ActivityIndicator',
    ScrollView: 'ScrollView',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Modal: 'Modal',
    Image: 'Image',
    Switch: 'Switch',
    SafeAreaView: 'SafeAreaView',
    FlatList: 'FlatList',
    SectionList: 'SectionList',
    StatusBar: { setBarStyle: jest.fn(), setHidden: jest.fn() },
    Platform: {
      OS: 'ios',
      Version: 14,
      select: (obj: Record<string, unknown>) =>
        obj.ios !== undefined ? obj.ios : obj.default,
    },
    StyleSheet: {
      create: (s: Record<string, unknown>) => s,
      flatten: (s: unknown) => s,
      hairlineWidth: 0.5,
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },
    Dimensions: { get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }) },
    PixelRatio: { get: () => 2, getFontScale: () => 1, roundToNearestPixel: (n: number) => n },
    Animated: {
      Value: jest.fn(() => ({ setValue: jest.fn(), interpolate: jest.fn(() => ({})) })),
      View: 'View',
      Text: 'Text',
      Image: 'Image',
      timing: jest.fn(() => ({ start: jest.fn() })),
      spring: jest.fn(() => ({ start: jest.fn() })),
      sequence: jest.fn(() => ({ start: jest.fn() })),
      parallel: jest.fn(() => ({ start: jest.fn() })),
    },
    Alert: { alert: jest.fn() },
    Keyboard: { dismiss: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) },
    Linking: { openURL: jest.fn(), canOpenURL: jest.fn(() => Promise.resolve(true)) },
    AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), currentState: 'active' },
    I18nManager: { isRTL: false },
    AccessibilityInfo: { fetch: jest.fn(() => Promise.resolve(false)) },
    useColorScheme: jest.fn(() => 'light'),
    useWindowDimensions: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
  };
});

// jest.requireActual('@lib/camera/imageUtils') loads expo-image-manipulator which
// pulls in expo → expo-asset → expo-constants → EXDevLauncher native crash.
// Mocking the package means the real imageUtils can be loaded safely (its error
// classes are plain JS, not native-dependent).
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn(() => ({
      renderAsync: jest.fn(() => Promise.resolve({ saveAsync: jest.fn() })),
    })),
  },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));

// expo/vector-icons pulls in expo-font → expo-asset → expo-constants which crashes
// in the jest environment because native modules aren't loaded.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  FontAwesome: 'FontAwesome',
  Feather: 'Feather',
}));

// Factory mock (not auto-mock) — auto-mock loads the real WatermelonDB which
// accesses WMDatabaseBridge (a native module) at require-time and crashes.
jest.mock('@nozbe/watermelondb', () => {
  const noop = () => ({});
  const Q = {
    where: jest.fn(noop),
    and: jest.fn(noop),
    or: jest.fn(noop),
    eq: jest.fn(noop),
    notEq: jest.fn(noop),
    gt: jest.fn(noop),
    gte: jest.fn(noop),
    lt: jest.fn(noop),
    lte: jest.fn(noop),
    like: jest.fn(noop),
    notLike: jest.fn(noop),
    sanitizeLikeString: jest.fn((s: string) => s),
    on: jest.fn(noop),
    relation: jest.fn(noop),
    unsafeSqlExpr: jest.fn(noop),
    unsafeLokiExpr: jest.fn(noop),
    unsafeLokiFilter: jest.fn(noop),
  };
  const decoratorNoop = () => () => {};
  return {
    Q,
    Database: jest.fn(),
    Model: class MockModel {},
    Collection: jest.fn(),
    Query: jest.fn(),
    field: decoratorNoop,
    text: decoratorNoop,
    date: decoratorNoop,
    nochange: decoratorNoop,
    json: decoratorNoop,
    readonly: decoratorNoop,
    relation: decoratorNoop,
    children: decoratorNoop,
    lazy: decoratorNoop,
    writer: decoratorNoop,
    reader: decoratorNoop,
    tableSchema: jest.fn((schema: unknown) => schema),
    columnSchema: jest.fn((column: unknown) => column),
    appSchema: jest.fn((schema: unknown) => schema),
  };
});

jest.mock('@nozbe/watermelondb/hooks', () => {
  const noopSubscribable = {
    observe: jest.fn(() => ({
      subscribe: jest.fn((cb: (records: unknown[]) => void) => {
        cb([]);
        return { unsubscribe: jest.fn() };
      }),
    })),
    fetch: jest.fn(() => Promise.resolve([])),
  };
  const mockCollection = {
    query: jest.fn(() => noopSubscribable),
    find: jest.fn(() => Promise.resolve(null)),
    create: jest.fn(),
  };
  const mockDb = {
    get: jest.fn(() => mockCollection),
    write: jest.fn((fn: () => Promise<void>) => fn()),
  };
  return {
    useDatabase: jest.fn(() => mockDb),
    withDatabase: jest.fn((Component: unknown) => Component),
    DatabaseProvider: ({ children }: { children: unknown }) => children,
  };
});

// Accessing AsyncStorage's native RCTAsyncStorage bridge crashes without a native env.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    mergeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Auto-mock loads the real module which accesses RNCNetInfo native bridge and crashes.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  },
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn() })),
}));
