import { vi } from 'vitest';

// Create a proper i18n mock that includes all required methods
export const createMockI18n = (language: 'fa' | 'en' = 'fa') => ({
  language,
  languages: ['fa', 'en'],
  changeLanguage: vi.fn().mockResolvedValue(undefined),
  getFixedT: vi.fn(),
  t: vi.fn((key: string) => key),
  exists: vi.fn(() => true),
  getDataByLanguage: vi.fn(() => ({})),
  getResource: vi.fn(),
  getResourceBundle: vi.fn(() => ({})),
  hasResourceBundle: vi.fn(() => true),
  hasLoadedNamespace: vi.fn(() => true),
  loadLanguages: vi.fn().mockResolvedValue(undefined),
  loadNamespaces: vi.fn().mockResolvedValue(undefined),
  loadResources: vi.fn().mockResolvedValue(undefined),
  reloadResources: vi.fn().mockResolvedValue(undefined),
  setDefaultNamespace: vi.fn(),
  dir: vi.fn(() => language === 'fa' ? 'rtl' : 'ltr'),
  format: vi.fn((value) => value),
  
  // Event emitter methods
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  
  // Store methods
  store: {
    on: vi.fn(),
    off: vi.fn(),
  },
  
  // Services
  services: {
    resourceStore: {
      on: vi.fn(),
      off: vi.fn(),
    },
    backendConnector: {
      on: vi.fn(),
      off: vi.fn(),
    },
    languageDetector: {
      on: vi.fn(),
      off: vi.fn(),
    },
  },
  
  // Options
  options: {
    fallbackLng: 'fa',
    lng: language,
    debug: false,
  },
  
  // Modules
  modules: {
    type: 'i18next',
  },
  
  // Utils
  cloneInstance: vi.fn(),
  createInstance: vi.fn(),
  init: vi.fn().mockResolvedValue(undefined),
  use: vi.fn(),
  
  // Missing methods
  addResource: vi.fn(),
  addResources: vi.fn(),
  addResourceBundle: vi.fn(),
  removeResourceBundle: vi.fn(),
  
  // Interpolation
  interpolation: {
    format: vi.fn((value) => value),
  },
} as any);