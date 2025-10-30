// Minimal axios-compatible client using fetch
export interface AxiosRequestConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  url?: string;
  withCredentials?: boolean;
}

export interface AxiosResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface AxiosInstance {
  defaults: AxiosRequestConfig;
  interceptors: {
    request: {
      use: (fn: (config: AxiosRequestConfig) => AxiosRequestConfig) => void;
    };
  };
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

function mergeHeaders(base?: Record<string, string>, extra?: Record<string, string>): Record<string, string> {
  return { ...(base || {}), ...(extra || {}) };
}

function buildUrl(base: string | undefined, path: string, params?: Record<string, any>): string {
  const url = new URL(path, base || 'http://localhost');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  if (!base) {
    return path + url.search;
  }
  return url.toString();
}

async function request<T>(method: string, url: string, config: AxiosRequestConfig & { data?: any } = {}, defaults: AxiosRequestConfig, interceptor?: (config: AxiosRequestConfig) => AxiosRequestConfig): Promise<AxiosResponse<T>> {
  let finalUrl = buildUrl(config.baseURL ?? defaults.baseURL, url, config.params ?? defaults.params);
  let finalConfig: AxiosRequestConfig & { data?: any } = {
    ...defaults,
    ...config,
    headers: mergeHeaders(defaults.headers, config.headers),
    url: finalUrl,
  };

  if (interceptor) {
    finalConfig = interceptor(finalConfig);
    if (finalConfig.url) {
      finalUrl = buildUrl(finalConfig.baseURL ?? defaults.baseURL, finalConfig.url, finalConfig.params ?? defaults.params);
    }
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (controller && finalConfig.timeout) {
    timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);
  }

  const fetchInit: RequestInit = {
    method,
    headers: finalConfig.headers,
    signal: controller?.signal,
  };

  if (finalConfig.data !== undefined) {
    if (typeof finalConfig.data === 'string' || finalConfig.data instanceof ArrayBuffer) {
      fetchInit.body = finalConfig.data as BodyInit;
    } else {
      fetchInit.body = JSON.stringify(finalConfig.data);
      fetchInit.headers = { ...(fetchInit.headers || {}), 'content-type': 'application/json' };
    }
  }

  const response = await fetch(finalUrl, fetchInit);
  if (timeoutId) clearTimeout(timeoutId);

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : (await response.text());

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return { data: data as T, status: response.status, headers };
}

class HttpClient implements AxiosInstance {
  defaults: AxiosRequestConfig;
  private requestInterceptor?: (config: AxiosRequestConfig) => AxiosRequestConfig;

  interceptors = {
    request: {
      use: (fn: (config: AxiosRequestConfig) => AxiosRequestConfig) => {
        this.requestInterceptor = fn;
      },
    },
  };

  constructor(defaults: AxiosRequestConfig = {}) {
    this.defaults = { headers: {}, ...defaults };
  }

  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>('GET', url, config, this.defaults, this.requestInterceptor);
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>('POST', url, { ...config, data }, this.defaults, this.requestInterceptor);
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>('PUT', url, { ...config, data }, this.defaults, this.requestInterceptor);
  }

  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>('PATCH', url, { ...config, data }, this.defaults, this.requestInterceptor);
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return request<T>('DELETE', url, config, this.defaults, this.requestInterceptor);
  }
}

const axios = {
  create(config: AxiosRequestConfig = {}): AxiosInstance {
    return new HttpClient(config);
  },
};

export default axios;
