export interface SSEEvent {
  type: 'progress' | 'result' | 'error' | 'complete';
  data: OptimizationProgress | OptimizationResult | OptimizationError | any;
  timestamp: number;
  sessionId: string;
}

export interface OptimizationProgress {
  stage: 'analyzing' | 'optimizing' | 'validating' | 'formatting' | 'complete';
  percentage: number;
  message: string;
  currentStep?: string;
  details?: any;
}

export interface OptimizationResult {
  id: string;
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: Improvement[];
  confidence: number;
  appliedRules: string[];
  suggestions: Suggestion[];
  estimatedTokens?: TokenEstimate;
}

export interface OptimizationError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

export interface Improvement {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  before?: string;
  after?: string;
}

export interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  applicable: boolean;
}

export interface TokenEstimate {
  original: number;
  optimized: number;
  savings: number;
  cost?: {
    original: number;
    optimized: number;
    currency: string;
  };
}

export interface SSESession {
  id: string;
  userId: string;
  response: any; // Express Response object
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}