import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDirection,
  isRTL,
  applyDirection,
  getRTLClass,
  getRTLPosition,
  rtlClass,
  toPersianDigits,
  toEnglishDigits,
  formatNumber,
  formatCurrency,
  getFlexDirection,
} from '@/utils/rtl';

describe('RTL Utilities', () => {
  beforeEach(() => {
    // Reset document state
    document.documentElement.dir = '';
    document.documentElement.lang = '';
    document.body.className = '';
  });

  afterEach(() => {
    // Clean up after each test
    document.documentElement.dir = '';
    document.documentElement.lang = '';
    document.body.className = '';
  });

  describe('getDirection', () => {
    it('should return rtl for Persian language', () => {
      expect(getDirection('fa')).toBe('rtl');
    });

    it('should return ltr for English language', () => {
      expect(getDirection('en')).toBe('ltr');
    });
  });

  describe('isRTL', () => {
    it('should return true for Persian language', () => {
      expect(isRTL('fa')).toBe(true);
    });

    it('should return false for English language', () => {
      expect(isRTL('en')).toBe(false);
    });
  });

  describe('applyDirection', () => {
    it('should apply RTL direction for Persian', () => {
      applyDirection('fa');
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('fa');
      expect(document.body.classList.contains('rtl')).toBe(true);
    });

    it('should apply LTR direction for English', () => {
      applyDirection('en');
      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
      expect(document.body.classList.contains('ltr')).toBe(true);
    });

    it('should remove previous direction classes', () => {
      document.body.classList.add('rtl');
      applyDirection('en');
      expect(document.body.classList.contains('rtl')).toBe(false);
      expect(document.body.classList.contains('ltr')).toBe(true);
    });
  });

  describe('getRTLClass', () => {
    it('should return base class for English', () => {
      expect(getRTLClass('ml-4', 'en', 'mr-4')).toBe('ml-4');
    });

    it('should return RTL class for Persian', () => {
      expect(getRTLClass('ml-4', 'fa', 'mr-4')).toBe('mr-4');
    });

    it('should return base class when no RTL class provided', () => {
      expect(getRTLClass('ml-4', 'fa')).toBe('ml-4');
    });
  });

  describe('getRTLPosition', () => {
    it('should return same position for English', () => {
      expect(getRTLPosition('left', 'en')).toBe('left');
      expect(getRTLPosition('right', 'en')).toBe('right');
    });

    it('should return opposite position for Persian', () => {
      expect(getRTLPosition('left', 'fa')).toBe('right');
      expect(getRTLPosition('right', 'fa')).toBe('left');
    });
  });

  describe('rtlClass', () => {
    it('should generate correct margin classes for English', () => {
      const rtl = rtlClass('en');
      expect(rtl.ml('4')).toBe('ml-4');
      expect(rtl.mr('4')).toBe('mr-4');
    });

    it('should generate correct margin classes for Persian', () => {
      const rtl = rtlClass('fa');
      expect(rtl.ml('4')).toBe('mr-4');
      expect(rtl.mr('4')).toBe('ml-4');
    });

    it('should generate correct padding classes for English', () => {
      const rtl = rtlClass('en');
      expect(rtl.pl('4')).toBe('pl-4');
      expect(rtl.pr('4')).toBe('pr-4');
    });

    it('should generate correct padding classes for Persian', () => {
      const rtl = rtlClass('fa');
      expect(rtl.pl('4')).toBe('pr-4');
      expect(rtl.pr('4')).toBe('pl-4');
    });

    it('should generate correct border classes', () => {
      const rtlEn = rtlClass('en');
      const rtlFa = rtlClass('fa');
      
      expect(rtlEn.borderL()).toBe('border-l');
      expect(rtlEn.borderR()).toBe('border-r');
      expect(rtlFa.borderL()).toBe('border-r');
      expect(rtlFa.borderR()).toBe('border-l');
    });

    it('should generate correct text alignment classes', () => {
      const rtlEn = rtlClass('en');
      const rtlFa = rtlClass('fa');
      
      expect(rtlEn.textLeft()).toBe('text-left');
      expect(rtlEn.textRight()).toBe('text-right');
      expect(rtlFa.textLeft()).toBe('text-right');
      expect(rtlFa.textRight()).toBe('text-left');
    });

    it('should generate correct float classes', () => {
      const rtlEn = rtlClass('en');
      const rtlFa = rtlClass('fa');
      
      expect(rtlEn.floatLeft()).toBe('float-left');
      expect(rtlEn.floatRight()).toBe('float-right');
      expect(rtlFa.floatLeft()).toBe('float-right');
      expect(rtlFa.floatRight()).toBe('float-left');
    });

    it('should generate transform class for Persian', () => {
      const rtlEn = rtlClass('en');
      const rtlFa = rtlClass('fa');
      
      expect(rtlEn.transform()).toBe('');
      expect(rtlFa.transform()).toBe('scale-x-[-1]');
    });
  });

  describe('toPersianDigits', () => {
    it('should convert English digits to Persian', () => {
      expect(toPersianDigits('123456789')).toBe('۱۲۳۴۵۶۷۸۹');
      expect(toPersianDigits('0')).toBe('۰');
    });

    it('should handle numbers', () => {
      expect(toPersianDigits(123)).toBe('۱۲۳');
      expect(toPersianDigits(0)).toBe('۰');
    });

    it('should handle mixed content', () => {
      expect(toPersianDigits('Price: 1000 Toman')).toBe('Price: ۱۰۰۰ Toman');
    });
  });

  describe('toEnglishDigits', () => {
    it('should convert Persian digits to English', () => {
      expect(toEnglishDigits('۱۲۳۴۵۶۷۸۹')).toBe('123456789');
      expect(toEnglishDigits('۰')).toBe('0');
    });

    it('should handle mixed content', () => {
      expect(toEnglishDigits('قیمت: ۱۰۰۰ تومان')).toBe('قیمت: 1000 تومان');
    });

    it('should leave English digits unchanged', () => {
      expect(toEnglishDigits('123')).toBe('123');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers for English locale', () => {
      const result = formatNumber(1234.56, 'en');
      expect(result).toBe('1,234.56');
    });

    it('should format numbers for Persian locale with Persian digits', () => {
      const result = formatNumber(1234.56, 'fa');
      expect(result).toContain('۱');
      expect(result).toContain('۲');
    });

    it('should handle formatting options', () => {
      const result = formatNumber(1234.567, 'en', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2 
      });
      expect(result).toBe('1,234.57');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency for English', () => {
      const result = formatCurrency(1000, 'en', 'USD');
      expect(result).toContain('1,000');
      expect(result).toContain('$');
    });

    it('should format currency for Persian with Persian digits', () => {
      const result = formatCurrency(1000, 'fa', 'IRR');
      expect(result).toContain('۱');
      expect(result).toContain('ریال');
    });

    it('should handle different currencies', () => {
      const result = formatCurrency(1000, 'fa', 'USD');
      expect(result).toContain('USD');
    });
  });

  describe('getFlexDirection', () => {
    it('should return correct flex direction for English', () => {
      expect(getFlexDirection('row', 'en')).toBe('flex-row');
      expect(getFlexDirection('row-reverse', 'en')).toBe('flex-row-reverse');
      expect(getFlexDirection('col', 'en')).toBe('flex-col');
    });

    it('should return reversed flex direction for Persian', () => {
      expect(getFlexDirection('row', 'fa')).toBe('flex-row-reverse');
      expect(getFlexDirection('row-reverse', 'fa')).toBe('flex-row');
      expect(getFlexDirection('col', 'fa')).toBe('flex-col');
    });
  });
});