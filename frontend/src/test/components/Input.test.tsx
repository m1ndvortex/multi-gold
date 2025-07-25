import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import Input from '@/components/ui/Input';
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

describe('Input Component', () => {
  it('should render with correct placeholder', () => {
    renderWithProviders(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should handle input changes', () => {
    const handleChange = vi.fn();
    renderWithProviders(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('should apply RTL direction for Persian language', () => {
    renderWithProviders(<Input placeholder="Persian input" />, 'fa');
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveAttribute('dir', 'rtl');
  });

  it('should apply LTR direction for English language', () => {
    renderWithProviders(<Input placeholder="English input" />, 'en');
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveAttribute('dir', 'ltr');
  });

  it('should render with label', () => {
    renderWithProviders(<Input label="Test Label" />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render with error message', () => {
    renderWithProviders(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should render with helper text', () => {
    renderWithProviders(<Input helperText="This is helper text" />);
    expect(screen.getByText('This is helper text')).toBeInTheDocument();
  });

  it('should render with left icon for LTR', () => {
    const leftIcon = <span data-testid="left-icon">🔍</span>;
    renderWithProviders(<Input leftIcon={leftIcon} />, 'en');
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('should render with right icon for LTR', () => {
    const rightIcon = <span data-testid="right-icon">✓</span>;
    renderWithProviders(<Input rightIcon={rightIcon} />, 'en');
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('should apply error styles when error is present', () => {
    renderWithProviders(<Input error="Error message" />);
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveClass('border-red-500');
  });

  it('should be disabled when disabled prop is true', () => {
    renderWithProviders(<Input disabled />);
    const input = screen.getByRole('textbox');
    
    expect(input).toBeDisabled();
  });

  it('should apply fullWidth class when fullWidth is true', () => {
    renderWithProviders(<Input fullWidth />);
    const container = screen.getByRole('textbox').closest('div')?.parentElement;
    
    expect(container).toHaveClass('w-full');
  });

  it('should associate label with input using htmlFor', () => {
    renderWithProviders(<Input label="Test Label" id="test-input" />);
    const label = screen.getByText('Test Label');
    const input = screen.getByRole('textbox');
    
    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');
  });
});