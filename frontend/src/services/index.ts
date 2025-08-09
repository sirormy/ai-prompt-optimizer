// 导出所有服务
export { apiClient, type ApiResponse, type ApiError } from './api';
export { authService, AuthService, type LoginCredentials, type RegisterData, type AuthTokens, type AuthUser } from './auth';
export { sseClient, SSEClient, type SSEEvent, type SSEConnectionState, type SSEEventHandler, type SSEStateHandler } from './sse';
export { promptsService, PromptsService } from './prompts';
export { modelsService, ModelsService } from './models';
export { usersService, UsersService } from './users';

// 导出常用类型
export type {
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptQueryParams,
  PaginatedPromptsResponse,
  UserStatsResponse,
  StreamOptimizationRequest,
  StreamOptimizationResponse,
} from './prompts';

export type {
  ModelValidationRequest,
  ModelValidationResponse,
  ModelUsageStats,
  CreateCustomModelRequest,
} from './models';

export type {
  UpdatePreferencesRequest,
  UpdateApiKeysRequest,
  UserProfileResponse,
  ApiKeysResponse,
} from './users';