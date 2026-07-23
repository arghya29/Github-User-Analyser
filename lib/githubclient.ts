import axios, { AxiosRequestConfig, AxiosError } from "axios";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

export async function fetchWithRetry(
  url: string,
  config: AxiosRequestConfig = {},
  options: RetryOptions = {},
) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;

  // Explicit Timeout Requirement
  const timeoutMs = options.timeoutMs ?? 10000;
  const requestConfig = { ...config, timeout: timeoutMs };

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await axios(url, requestConfig);
    } catch (error: unknown) {
      // 🛠️ FIX: Replaced 'any' with 'unknown'
      attempt++;

      // 🛠️ FIX: Safely cast the error to an AxiosError
      const axiosError = error as AxiosError<{ message?: string }>;

      const status = axiosError.response?.status;
      const isTimeout = axiosError.code === "ECONNABORTED";
      const isTransient =
        status === 429 ||
        (status !== undefined && status >= 500 && status <= 599);
      const isNetworkError = !axiosError.response;

      // Clearer Message on Exhaustion or Non-Retriable Errors
      if (
        (!isNetworkError && !isTransient && !isTimeout) ||
        attempt >= maxAttempts
      ) {
        throw new Error(
          `GitHub API request failed after ${attempt} attempt(s). Reason: ${
            axiosError.response?.data?.message ||
            axiosError.message ||
            "Unknown network error"
          }`,
        );
      }

      // Retry with Exponential Backoff
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[GitHub API] Transient error. Retrying attempt ${attempt + 1} in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`GitHub API request failed after ${maxAttempts} attempt(s).`);
}
