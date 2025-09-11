// ES6 Utility Functions for Enhanced JavaScript Features
// This module provides modern ES6+ utilities used throughout the application

/**
 * ES6: Enhanced array utilities using modern JavaScript features
 */
export const ArrayUtils = {
  // Remove duplicates using Set
  unique: <T>(array: T[]): T[] => [...new Set(array)],
  
  // Group array elements by a key function
  groupBy: <T, K extends string | number>(
    array: T[], 
    keyFn: (item: T) => K
  ): Record<K, T[]> => {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  },
  
  // Chunk array into smaller arrays
  chunk: <T>(array: T[], size: number): T[][] => {
    return array.reduce((chunks, item, index) => {
      const chunkIndex = Math.floor(index / size);
      if (!chunks[chunkIndex]) {
        chunks[chunkIndex] = [];
      }
      chunks[chunkIndex].push(item);
      return chunks;
    }, [] as T[][]);
  },
  
  // Find intersection of multiple arrays
  intersection: <T>(...arrays: T[][]): T[] => {
    if (arrays.length === 0) return [];
    const [first, ...rest] = arrays;
    return first.filter(item => 
      rest.every(array => array.includes(item))
    );
  }
};

/**
 * ES6: Enhanced object utilities with modern destructuring and methods
 */
export const ObjectUtils = {
  // Pick specific properties from an object
  pick: <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    return keys.reduce((result, key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
      return result;
    }, {} as Pick<T, K>);
  },
  
  // Omit specific properties from an object
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj } as any;
    keys.forEach(key => delete result[key]);
    return result;
  },
  
  // Deep merge objects
  deepMerge: <T extends Record<string, any>>(target: T, ...sources: Array<Partial<T>>): T => {
    if (!sources.length) return target;
    const [source, ...rest] = sources;
    
    if (source) {
      Object.keys(source).forEach(key => {
        const sourceValue = (source as any)[key];
        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          if (!(target as any)[key]) (target as any)[key] = {};
          ObjectUtils.deepMerge((target as any)[key], sourceValue);
        } else {
          (target as any)[key] = sourceValue;
        }
      });
    }
    
    return ObjectUtils.deepMerge(target, ...rest);
  }
};

/**
 * ES6: String utilities with template literals and modern methods
 */
export const StringUtils = {
  // Capitalize first letter of each word
  titleCase: (str: string): string => {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },
  
  // Generate random string with specified length
  randomString: (length: number = 8): string => {
    return Math.random().toString(36).substring(2, length + 2);
  },
  
  // Truncate string with ellipsis
  truncate: (str: string, maxLength: number): string => {
    return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
  },
  
  // Convert string to kebab-case
  kebabCase: (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  },
  
  // Convert string to camelCase
  camelCase: (str: string): string => {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');
  }
};

/**
 * ES6: Promise utilities for enhanced async operations
 */
export const PromiseUtils = {
  // Delay execution
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Timeout a promise
  timeout: <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Promise timeout')), ms)
      )
    ]);
  },
  
  // Retry a promise-returning function
  retry: async <T>(
    fn: () => Promise<T>, 
    retries: number = 3, 
    delay: number = 1000
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      await PromiseUtils.delay(delay);
      return PromiseUtils.retry(fn, retries - 1, delay * 2);
    }
  }
};

/**
 * ES6: Validation utilities using modern JavaScript features
 */
export const ValidationUtils = {
  // Email validation using regex
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Phone number validation
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  },
  
  // Strong password validation
  isStrongPassword: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasNonalphas;
  },
  
  // Check if value is empty (null, undefined, empty string, empty array)
  isEmpty: (value: any): boolean => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }
};

/**
 * ES6: Date utilities with modern date handling
 */
export const DateUtils = {
  // Format date using Intl.DateTimeFormat
  formatDate: (date: Date | string, locale: string = 'en-US'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  },
  
  // Get relative time (e.g., "2 hours ago")
  getRelativeTime: (date: Date | string, locale: string = 'en-US'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diff = dateObj.getTime() - Date.now();
    
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 1000 * 60 * 60 * 24 * 365],
      ['month', 1000 * 60 * 60 * 24 * 30],
      ['day', 1000 * 60 * 60 * 24],
      ['hour', 1000 * 60 * 60],
      ['minute', 1000 * 60],
      ['second', 1000]
    ];
    
    for (const [unit, duration] of units) {
      const value = Math.round(diff / duration);
      if (Math.abs(value) >= 1) {
        return rtf.format(value, unit);
      }
    }
    
    return rtf.format(0, 'second');
  },
  
  // Add time to date
  addTime: (date: Date, amount: number, unit: 'days' | 'hours' | 'minutes'): Date => {
    const result = new Date(date);
    switch (unit) {
      case 'days':
        result.setDate(result.getDate() + amount);
        break;
      case 'hours':
        result.setHours(result.getHours() + amount);
        break;
      case 'minutes':
        result.setMinutes(result.getMinutes() + amount);
        break;
    }
    return result;
  }
};

// Export all utilities as a single object
export const ES6Utils = {
  ArrayUtils,
  ObjectUtils,
  StringUtils,
  PromiseUtils,
  ValidationUtils,
  DateUtils
};

export default ES6Utils;