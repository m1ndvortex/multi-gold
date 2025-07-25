import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import Button from '@/components/ui/Button';
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

describe('Button Component', () => {
  it('should render with correct text', () => {
    renderWithProviders(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    renderWithProviders(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply RTL classes for Persian language', () => {
    renderWithProviders(<Button>Persian Button</Button>, 'fa');
    const button = screen.getByRole('button');
    expect(button).toHaveClass('flex-row-reverse');
  });

  it('should apply LTR classes for English language', () => {
    renderWithProviders(<Button>English Button</Button>, 'en');
    const button = screen.getByRole('button');
    expect(button).toHaveClass('flex-row');
  });

  it('should render with icon and correct positioning for RTL', () => {
    const icon = <span data-testid="test-icon">🔍</span>;
    renderWithProviders(
      <Button icon={icon} iconPosition="left">Search</Button>, 
      'fa'
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('flex-row-reverse');
  });

  it('should render with icon and correct positioning for LTR', () => {
    const icon = <span data-testid="test-icon">🔍</span>;
    renderWithProviders(
      <Button icon={icon} iconPosition="left">Search</Button>, 
      'en'
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('flex-row');
  });

  it('should show loading state', () => {
    renderWithProviders(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button.querySelector('.spinner')).toBeInTheDocument();
  });

  it('should apply variant classes correctly', () => {
    renderWithProviders(<Button variant="primary">Primary</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-primary-600');
  });

  it('should apply size classes correctly', () => {
    renderWithProviders(<Button size="lg">Large Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('h-12');
  });

  it('should be disabled when disabled prop is true', () => {
    renderWithProviders(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none');
  });

  it('should apply fullWidth class when fullWidth is true', () => {
    renderWithProviders(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('w-full');
  });
});