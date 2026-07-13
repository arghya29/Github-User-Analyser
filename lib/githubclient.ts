import axios, { AxiosRequestConfig } from 'axios';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

export async function fetchWithRetry(
  url: string,
  config: AxiosRequestConfig = {},
  options: RetryOptions = {}
) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  
  // 1. Explicit Timeout Requirement
  const timeoutMs = options.timeoutMs ?? 10000; 
  const requestConfig = { ...config, timeout: timeoutMs };

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await axios(url, requestConfig);
    } catch (error: any) {
      attempt++;
      
      const status = error.response?.status;
      const isTimeout = error.code === 'ECONNABORTED';
      const isTransient = status === 429 || (status >= 500 && status <= 599);
      const isNetworkError = !error.response;

      // 2. Clearer Message on Exhaustion or Non-Retriable Errors
      if ((!isNetworkError && !isTransient && !isTimeout) || attempt >= maxAttempts) {
        throw new Error(
          `GitHub API request failed after ${attempt} attempt(s). Reason: ${
            error.response?.data?.message || error.message || 'Unknown network error'
          }`
        );
      }

      // 3. Retry with Exponential Backoff
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[GitHub API] Transient error. Retrying attempt ${attempt + 1} in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
