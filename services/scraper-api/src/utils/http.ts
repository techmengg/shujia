/**
 * HTTP utilities with retry logic and polite delays
 */

import axios, { AxiosRequestConfig, AxiosError } from 'axios';

const USER_AGENT = 'Shujia/1.0 (+https://shujia.dev; Manga Tracker)';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

interface HttpGetOptions extends AxiosRequestConfig {
  retry?: RetryOptions;
  politeDelayMs?: number;
}

// Track last request time per domain for polite scraping
const lastRequestTime = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

async function enforcePoliteDelay(url: string, delayMs: number): Promise<void> {
  const domain = getDomain(url);
  const lastTime = lastRequestTime.get(domain) || 0;
  const timeSinceLastRequest = Date.now() - lastTime;
  
  if (timeSinceLastRequest < delayMs) {
    const waitTime = delayMs - timeSinceLastRequest;
    console.log(`[HTTP] Polite delay: waiting ${waitTime}ms for ${domain}`);
    await sleep(waitTime);
  }
  
  lastRequestTime.set(domain, Date.now());
}

export async function httpGet(
  url: string,
  options: HttpGetOptions = {}
): Promise<string> {
  const {
    retry = {},
    politeDelayMs = 1000,
    headers = {},
    ...axiosOptions
  } = options;
  
  const maxRetries = retry.maxRetries ?? 3;
  const baseDelayMs = retry.baseDelayMs ?? 1000;
  const maxDelayMs = retry.maxDelayMs ?? 10000;
  
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < maxRetries) {
    attempt++;
    
    try {
      // Enforce polite delay
      await enforcePoliteDelay(url, politeDelayMs);
      
      console.log(`[HTTP] GET ${url} (attempt ${attempt}/${maxRetries})`);
      
      const response = await axios.get(url, {
        ...axiosOptions,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          ...headers,
        },
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      
      return response.data;
    } catch (error) {
      lastError = error as Error;
      
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      
      // Don't retry on 4xx errors (except 429)
      if (status && status >= 400 && status < 500 && status !== 429) {
        console.error(`[HTTP] Client error ${status}, not retrying`);
        throw error;
      }
      
      // Calculate retry delay with exponential backoff
      const retryAfter = axiosError.response?.headers['retry-after'];
      let delayMs: number;
      
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        delayMs = isNaN(seconds) ? baseDelayMs : seconds * 1000;
      } else {
        delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      }
      
      if (attempt < maxRetries) {
        console.warn(`[HTTP] Request failed, retrying in ${delayMs}ms...`, {
          error: axiosError.message,
          status,
          attempt,
        });
        await sleep(delayMs);
      }
    }
  }
  
  console.error(`[HTTP] All retry attempts failed for ${url}`);
  throw lastError || new Error('HTTP request failed');
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public url?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

