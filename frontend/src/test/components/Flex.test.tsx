import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import Flex from '@/components/layout/Flex';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { createMockI18n } from '@/test/mocks/i18n';

const renderWithProviders = (component: React.ReactElement, language: 'fa' | 'en' = 'fa') => {
  const mockI18n = createMockI18n(language);
  
  return render(
    <I18nextProvider i18n={mockI18n}>
      <LanguageProvider>
        {component}
      </LanguageProvider>
    </I18nextProvider>
  );
};

describe('Flex Component', () => {
  it('should render children correctly', () => {
    renderWithProviders(
      <Flex>
        <div>Child 1</div>
        <div>Child 2</div>
      </Flex>
    );
    
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('should apply flex class by default', () => {
    renderWithProviders(
      <Flex data-testid="flex-container">
        <div>Content</div>
      </Flex>
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('flex');
  });

  it('should apply RTL-aware row direction for Persian', () => {
    renderWithProviders(
      <Flex direction="row" data-testid="flex-container">
        <div>Content</div>
      </Flex>,
      'fa'
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('flex-row-reverse');
  });

  it('should apply normal row direction for English', () => {
    renderWithProviders(
      <Flex direction="row" data-testid="flex-container">
        <div>Content</div>
      </Flex>,
      'en'
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('flex-row');
  });

  it('should apply RTL-aware row-reverse direction for Persian', () => {
    renderWithProviders(
      <Flex direction="row-reverse" data-testid="flex-container">
        <div>Content</div>
      </Flex>,
      'fa'
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('flex-row');
  });

  it('should not affect column direction for RTL', () => {
    renderWithProviders(
      <Flex direction="col" data-testid="flex-container">
        <div>Content</div>
      </Flex>,
      'fa'
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('flex-col');
  });

  it('should disable RTL awareness when rtlAware is false', () => {
    renderWithProviders(
      <Flex direction="row" rtlAware={false} data-testid="flex-container">
        <div>Content</div>
      </Flex>,
      'fa'
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('flex-row');
    expect(container).not.toHaveClass('flex-row-reverse');
  });

  it('should apply alignment classes correctly', () => {
    renderWithProviders(
      <Flex align="center" data-testid="flex-container">
        <div>Content</div>
      </Flex>
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('items-center');
  });

  it('should apply justify classes correctly', () => {
    renderWithProviders(
      <Flex justify="between" data-testid="flex-container">
        <div>Content</div>
      </Flex>
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('justify-between');
  });

  it('should apply wrap classes correctly', () => {
    renderWithProviders(
      <Flex wrap="wrap" data-testid="flex-container">
        <div>Content</div>
      </Flex>
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('flex-wrap');
  });

  it('should apply gap classes correctly', () => {
    renderWithProviders(
      <Flex gap="md" data-testid="flex-container">
        <div>Content</div>
      </Flex>
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('gap-4');
  });

  it('should combine multiple classes correctly', () => {
    renderWithProviders(
      <Flex 
        direction="row" 
        align="center" 
        justify="between" 
        gap="lg" 
        data-testid="flex-container"
      >
        <div>Content</div>
      </Flex>,
      'fa'
    );
    
    const container = screen.getByTestId('flex-container');
    expect(container).toHaveClass('flex');
    expect(container).toHaveClass('flex-row-reverse');
    expect(container).toHaveClass('items-center');
    expect(container).toHaveClass('justify-between');
    expect(container).toHaveClass('gap-6');
  });
});