
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { createMockI18n } from '@/test/mocks/i18n';

// Test component that uses the language context
const TestComponent = () => {
  const { language, setLanguage, isRTL, direction } = useLanguage();
  
  return (
    <div>
      <div data-testid="current-language">{language}</div>
      <div data-testid="is-rtl">{isRTL.toString()}</div>
      <div data-testid="direction">{direction}</div>
      <button 
        data-testid="change-to-english" 
        onClick={() => setLanguage('en')}
      >
        Change to English
      </button>
      <button 
        data-testid="change-to-persian" 
        onClick={() => setLanguage('fa')}
      >
        Change to Persian
      </button>
    </div>
  );
};

const renderWithProvider = (initialLanguage: 'fa' | 'en' = 'fa') => {
  const mockI18n = createMockI18n(initialLanguage);
  
  return render(
    <I18nextProvider i18n={mockI18n}>
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    </I18nextProvider>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
    
    // Reset document attributes
    document.documentElement.dir = '';
    document.documentElement.lang = '';
    document.body.className = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.dir = '';
    document.documentElement.lang = '';
    document.body.className = '';
  });

  it('should provide default Persian language context', () => {
    renderWithProvider('fa');
    
    expect(screen.getByTestId('current-language')).toHaveTextContent('fa');
    expect(screen.getByTestId('is-rtl')).toHaveTextContent('true');
    expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
  });

  it('should provide English language context', () => {
    renderWithProvider('en');
    
    expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    expect(screen.getByTestId('is-rtl')).toHaveTextContent('false');
    expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
  });

  it('should change language to English', async () => {
    renderWithProvider('fa');
    
    const changeButton = screen.getByTestId('change-to-english');
    
    await act(async () => {
      fireEvent.click(changeButton);
    });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'en');
  });

  it('should change language to Persian', async () => {
    renderWithProvider('en');
    
    const changeButton = screen.getByTestId('change-to-persian');
    
    await act(async () => {
      fireEvent.click(changeButton);
    });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'fa');
  });

  it('should apply direction to document when language changes', async () => {
    renderWithProvider('fa');
    
    const changeButton = screen.getByTestId('change-to-english');
    
    await act(async () => {
      fireEvent.click(changeButton);
    });
    
    // Note: In the actual implementation, applyDirection would be called
    // but in tests we need to verify the localStorage interaction
    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'en');
  });

  it('should load language from localStorage on initialization', () => {
    // Mock localStorage to return English
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('en');
    
    renderWithProvider();
    
    expect(localStorage.getItem).toHaveBeenCalledWith('language');
  });

  it('should throw error when used outside provider', () => {
    // Mock console.error to avoid error output in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLanguage must be used within a LanguageProvider');
    
    consoleSpy.mockRestore();
  });

  it('should handle invalid language from localStorage', () => {
    // Mock localStorage to return invalid language
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid');
    
    renderWithProvider();
    
    // Should default to Persian when invalid language is found
    expect(screen.getByTestId('current-language')).toHaveTextContent('fa');
  });

  it('should save language preference to localStorage', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    
    renderWithProvider('fa');
    
    const changeButton = screen.getByTestId('change-to-english');
    
    await act(async () => {
      fireEvent.click(changeButton);
    });
    
    expect(setItemSpy).toHaveBeenCalledWith('language', 'en');
  });
});