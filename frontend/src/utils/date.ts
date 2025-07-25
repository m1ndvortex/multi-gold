/**
 * Date utilities with Persian calendar support
 */

import { format as formatDate, parseISO, isValid } from 'date-fns';
import { format as formatJalali, parseISO as parseJalali } from 'date-fns-jalali';
import { toPersianDigits, toEnglishDigits } from './rtl';

export type DateFormat = 'short' | 'medium' | 'long' | 'full';
export type Language = 'fa' | 'en';

/**
 * Format date based on language and calendar preference
 */
export const formatDateByLanguage = (
  date: Date | string,
  language: Language,
  formatType: DateFormat = 'medium'
): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return '';
  }

  const formats = {
    fa: {
      short: 'yyyy/MM/dd',
      medium: 'yyyy/MM/dd',
      long: 'EEEE، dd MMMM yyyy',
      full: 'EEEE، dd MMMM yyyy',
    },
    en: {
      short: 'MM/dd/yyyy',
      medium: 'MMM dd, yyyy',
      long: 'MMMM dd, yyyy',
      full: 'EEEE, MMMM dd, yyyy',
    },
  };

  try {
    if (language === 'fa') {
      const formatted = formatJalali(dateObj, formats.fa[formatType]);
      return toPersianDigits(formatted);
    } else {
      return formatDate(dateObj, formats.en[formatType]);
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

/**
 * Parse date string with Persian digit support
 */
export const parseDateString = (dateString: string, language: Language): Date | null => {
  if (!dateString) return null;
  
  try {
    if (language === 'fa') {
      // Convert Persian digits to English before parsing
      const englishDateString = toEnglishDigits(dateString);
      return parseJalali(englishDateString);
    } else {
      return parseISO(dateString);
    }
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
};

/**
 * Get current date formatted by language
 */
export const getCurrentDate = (language: Language, formatType: DateFormat = 'medium'): string => {
  return formatDateByLanguage(new Date(), language, formatType);
};

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export const getRelativeTime = (date: Date | string, language: Language): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const intervals = {
    fa: {
      year: 'سال',
      month: 'ماه',
      week: 'هفته',
      day: 'روز',
      hour: 'ساعت',
      minute: 'دقیقه',
      second: 'ثانیه',
      ago: 'پیش',
      now: 'اکنون',
    },
    en: {
      year: 'year',
      month: 'month',
      week: 'week',
      day: 'day',
      hour: 'hour',
      minute: 'minute',
      second: 'second',
      ago: 'ago',
      now: 'now',
    },
  };

  const timeIntervals = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];

  if (diffInSeconds < 60) {
    return intervals[language].now;
  }

  for (const interval of timeIntervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      const unitText = intervals[language][interval.unit as keyof typeof intervals.fa];
      if (language === 'fa') {
        return `${toPersianDigits(count.toString())} ${unitText} ${intervals[language].ago}`;
      } else {
        return `${count} ${unitText}${count > 1 ? 's' : ''} ${intervals[language].ago}`;
      }
    }
  }

  return intervals[language].now;
};

/**
 * Format time only (HH:mm)
 */
export const formatTime = (date: Date | string, language: Language): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return '';
  }

  const timeString = formatDate(dateObj, 'HH:mm');
  return language === 'fa' ? toPersianDigits(timeString) : timeString;
};

/**
 * Get month names for language
 */
export const getMonthNames = (language: Language): string[] => {
  if (language === 'fa') {
    return [
      'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
  } else {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }
};

/**
 * Get day names for language
 */
export const getDayNames = (language: Language): string[] => {
  if (language === 'fa') {
    return ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  } else {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  }
};