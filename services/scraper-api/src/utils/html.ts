/**
 * HTML parsing utilities using Cheerio
 */

import * as cheerio from 'cheerio';
import { httpGet, HttpGetOptions } from './http';

export type CheerioAPI = ReturnType<typeof cheerio.load>;

/**
 * Load HTML from a URL and return a Cheerio instance
 */
export async function loadHtml(
  url: string,
  options?: HttpGetOptions
): Promise<CheerioAPI> {
  const html = await httpGet(url, options);
  return cheerio.load(html);
}

/**
 * Safely extract text content from an element
 */
export function getText($: CheerioAPI, selector: string): string | undefined {
  const text = $(selector).text().trim();
  return text || undefined;
}

/**
 * Extract all text contents from matching elements
 */
export function getTexts($: CheerioAPI, selector: string): string[] {
  const texts: string[] = [];
  $(selector).each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      texts.push(text);
    }
  });
  return texts;
}

/**
 * Safely extract an attribute value
 */
export function getAttr(
  $: CheerioAPI,
  selector: string,
  attr: string
): string | undefined {
  const value = $(selector).attr(attr);
  return value?.trim() || undefined;
}

/**
 * Extract a URL, making it absolute if relative
 */
export function getAbsoluteUrl(
  $: CheerioAPI,
  selector: string,
  baseUrl: string
): string | undefined {
  const href = getAttr($, selector, 'href');
  if (!href) return undefined;
  
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return undefined;
  }
}

/**
 * Parse a numeric value from text
 */
export function parseNumber(text: string | undefined): number | undefined {
  if (!text) return undefined;
  
  const cleaned = text.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? undefined : num;
}

/**
 * Parse a year from text (handles various formats)
 */
export function parseYear(text: string | undefined): number | undefined {
  if (!text) return undefined;
  
  const match = text.match(/\b(19|20)\d{2}\b/);
  if (!match) return undefined;
  
  const year = parseInt(match[0], 10);
  return year >= 1900 && year <= 2100 ? year : undefined;
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  
  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  
  return cleaned || undefined;
}

