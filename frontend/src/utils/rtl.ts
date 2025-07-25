/**
 * RTL (Right-to-Left) utilities for Persian language support
 */

export type Direction = 'rtl' | 'ltr';
export type Language = 'fa' | 'en';

/**
 * Get text direction based on language
 */
export const getDirection = (language: Language): Direction => {
  return language === 'fa' ? 'rtl' : 'ltr';
};

/**
 * Check if current language is RTL
 */
export const isRTL = (language: Language): boolean => {
  return language === 'fa';
};

/**
 * Apply RTL direction to document
 */
export const applyDirection = (language: Language): void => {
  const direction = getDirection(language);
  document.documentElement.dir = direction;
  document.documentElement.lang = language;
  
  // Update body class for CSS targeting
  document.body.classList.remove('rtl', 'ltr');
  document.body.classList.add(direction);
};

/**
 * Get RTL-aware margin/padding classes
 */
export const getRTLClass = (
  baseClass: string,
  language: Language,
  rtlClass?: string
): string => {
  if (!rtlClass) return baseClass;
  return isRTL(language) ? rtlClass : baseClass;
};

/**
 * Get RTL-aware positioning classes
 */
export const getRTLPosition = (
  position: 'left' | 'right',
  language: Language
): 'left' | 'right' => {
  if (!isRTL(language)) return position;
  return position === 'left' ? 'right' : 'left';
};

/**
 * RTL-aware class name generator
 */
export const rtlClass = (language: Language) => ({
  // Margins
  ml: (size: string) => isRTL(language) ? `mr-${size}` : `ml-${size}`,
  mr: (size: string) => isRTL(language) ? `ml-${size}` : `mr-${size}`,
  
  // Padding
  pl: (size: string) => isRTL(language) ? `pr-${size}` : `pl-${size}`,
  pr: (size: string) => isRTL(language) ? `pl-${size}` : `pr-${size}`,
  
  // Borders
  borderL: () => isRTL(language) ? 'border-r' : 'border-l',
  borderR: () => isRTL(language) ? 'border-l' : 'border-r',
  
  // Text alignment
  textLeft: () => isRTL(language) ? 'text-right' : 'text-left',
  textRight: () => isRTL(language) ? 'text-left' : 'text-right',
  
  // Floats
  floatLeft: () => isRTL(language) ? 'float-right' : 'float-left',
  floatRight: () => isRTL(language) ? 'float-left' : 'float-right',
  
  // Transforms for icons
  transform: () => isRTL(language) ? 'scale-x-[-1]' : '',
});

/**
 * Convert English digits to Persian digits
 */
export const toPersianDigits = (input: string | number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = String(input);
  for (let i = 0; i < englishDigits.length; i++) {
    result = result.replace(new RegExp(englishDigits[i], 'g'), persianDigits[i]);
  }
  return result;
};

/**
 * Convert Persian digits to English digits
 */
export const toEnglishDigits = (input: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = input;
  for (let i = 0; i < persianDigits.length; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), englishDigits[i]);
  }
  return result;
};

/**
 * Format number based on language preference
 */
export const formatNumber = (
  number: number,
  language: Language,
  options?: Intl.NumberFormatOptions
): string => {
  const locale = language === 'fa' ? 'fa-IR' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, options).format(number);
  
  // For Persian, convert to Persian digits if needed
  return language === 'fa' ? toPersianDigits(formatted) : formatted;
};

/**
 * Format currency based on language
 */
export const formatCurrency = (
  amount: number,
  language: Language,
  currency: string = 'IRR'
): string => {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };
  
  if (language === 'fa') {
    // For Persian, use custom formatting
    const formatted = new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    
    return `${toPersianDigits(formatted)} ${currency === 'IRR' ? 'ریال' : currency}`;
  }
  
  return new Intl.NumberFormat('en-US', options).format(amount);
};

/**
 * Get RTL-aware flex direction
 */
export const getFlexDirection = (
  direction: 'row' | 'row-reverse' | 'col' | 'col-reverse',
  language: Language
): string => {
  if (!isRTL(language)) return `flex-${direction}`;
  
  switch (direction) {
    case 'row':
      return 'flex-row-reverse';
    case 'row-reverse':
      return 'flex-row';
    default:
      return `flex-${direction}`;
  }
};