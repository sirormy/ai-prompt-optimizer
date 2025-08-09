import { useState, useCallback } from 'react';
import { ApiError } from '../services';

// API调用状态
export interface ApiState<T = any> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

// API调用选项
export interface ApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
}

// 通用API调用Hook
export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<T>,
  options: ApiOptions = {}
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]) => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const data = await apiCall(...args);
        setState({ data, loading: false, error: null });
        
        if (options.onSuccess) {
          options.onSuccess(data);
        }
        
        return data;
      } catch (error) {
        const apiError = error as ApiError;
        setState(prev => ({ ...prev, loading: false, error: apiError }));
        
        if (options.onError) {
          options.onError(apiError);
        }
        
        throw apiError;
      }
    },
    [apiCall, options]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// 异步数据获取Hook
export function useAsyncData<T = any>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: ApiOptions = {}
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    } catch (error) {
      const apiError = error as ApiError;
      setState(prev => ({ ...prev, loading: false, error: apiError }));
      
      if (options.onError) {
        options.onError(apiError);
      }
    }
  }, dependencies);

  // 初始加载
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
}

// 分页数据Hook
export function usePaginatedApi<T = any>(
  apiCall: (page: number, limit: number, ...args: any[]) => Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>,
  initialPage = 1,
  initialLimit = 10,
  options: ApiOptions = {}
) {
  const [state, setState] = useState<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    loading: boolean;
    error: ApiError | null;
  }>({
    data: [],
    total: 0,
    page: initialPage,
    limit: initialLimit,
    totalPages: 0,
    loading: false,
    error: null,
  });

  const fetchPage = useCallback(
    async (page: number, limit: number, ...args: any[]) => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiCall(page, limit, ...args);
        setState({
          ...result,
          loading: false,
          error: null,
        });
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const apiError = error as ApiError;
        setState(prev => ({ ...prev, loading: false, error: apiError }));
        
        if (options.onError) {
          options.onError(apiError);
        }
        
        throw apiError;
      }
    },
    [apiCall, options]
  );

  const goToPage = useCallback(
    (page: number, ...args: any[]) => {
      return fetchPage(page, state.limit, ...args);
    },
    [fetchPage, state.limit]
  );

  const changePageSize = useCallback(
    (limit: number, ...args: any[]) => {
      return fetchPage(1, limit, ...args);
    },
    [fetchPage]
  );

  const refresh = useCallback(
    (...args: any[]) => {
      return fetchPage(state.page, state.limit, ...args);
    },
    [fetchPage, state.page, state.limit]
  );

  return {
    ...state,
    goToPage,
    changePageSize,
    refresh,
    fetchPage,
  };
}

// 表单提交Hook
export function useFormSubmit<T = any>(
  submitFn: (data: any) => Promise<T>,
  options: ApiOptions & {
    resetOnSuccess?: boolean;
  } = {}
) {
  const [state, setState] = useState<{
    loading: boolean;
    error: ApiError | null;
    success: boolean;
  }>({
    loading: false,
    error: null,
    success: false,
  });

  const submit = useCallback(
    async (data: any) => {
      setState({ loading: true, error: null, success: false });

      try {
        const result = await submitFn(data);
        setState({ loading: false, error: null, success: true });
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const apiError = error as ApiError;
        setState({ loading: false, error: apiError, success: false });
        
        if (options.onError) {
          options.onError(apiError);
        }
        
        throw apiError;
      }
    },
    [submitFn, options]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, success: false });
  }, []);

  return {
    ...state,
    submit,
    reset,
  };
}

// 文件上传Hook
export function useFileUpload(
  uploadFn: (file: File, onProgress?: (progress: number) => void) => Promise<any>,
  options: ApiOptions = {}
) {
  const [state, setState] = useState<{
    loading: boolean;
    error: ApiError | null;
    progress: number;
    success: boolean;
  }>({
    loading: false,
    error: null,
    progress: 0,
    success: false,
  });

  const upload = useCallback(
    async (file: File) => {
      setState({ loading: true, error: null, progress: 0, success: false });

      try {
        const result = await uploadFn(file, (progress) => {
          setState(prev => ({ ...prev, progress }));
        });
        
        setState({ loading: false, error: null, progress: 100, success: true });
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const apiError = error as ApiError;
        setState({ loading: false, error: apiError, progress: 0, success: false });
        
        if (options.onError) {
          options.onError(apiError);
        }
        
        throw apiError;
      }
    },
    [uploadFn, options]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, progress: 0, success: false });
  }, []);

  return {
    ...state,
    upload,
    reset,
  };
}

export default useApi;