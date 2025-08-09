import { AIModel, MessageRole } from '@/store/types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PromptValidationOptions {
  promptText: string;
  selectedModel: AIModel | null;
  messageRole: MessageRole;
  systemPrompt?: string;
  maxPromptLength?: number;
  maxSystemPromptLength?: number;
}

/**
 * 验证提示词输入
 */
export const validatePromptInput = (options: PromptValidationOptions): ValidationResult => {
  const {
    promptText,
    selectedModel,
    messageRole,
    systemPrompt = '',
    maxPromptLength = 4000,
    maxSystemPromptLength = 2000,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // 基础验证
  if (!promptText.trim()) {
    errors.push('请输入提示词内容');
  }

  if (!selectedModel) {
    errors.push('请选择AI模型');
  }

  // 长度验证
  if (promptText.length > maxPromptLength) {
    errors.push(`提示词长度不能超过${maxPromptLength}个字符`);
  }

  if (systemPrompt.length > maxSystemPromptLength) {
    errors.push(`系统提示词长度不能超过${maxSystemPromptLength}个字符`);
  }

  // 角色特定验证
  if (messageRole === 'system' && !systemPrompt.trim()) {
    errors.push('系统角色需要设置系统提示词');
  }

  // 模型兼容性验证
  if (selectedModel && !selectedModel.supportedRoles.includes(messageRole)) {
    errors.push(`所选模型不支持${messageRole}角色`);
  }

  // 内容质量警告
  if (promptText.length < 10) {
    warnings.push('提示词内容较短，可能影响优化效果');
  }

  if (promptText.split(' ').length < 3) {
    warnings.push('建议使用更详细的描述以获得更好的优化效果');
  }

  // 特殊字符检查
  const specialChars = /[<>{}[\]]/g;
  if (specialChars.test(promptText)) {
    warnings.push('检测到特殊字符，可能影响某些模型的处理');
  }

  // Token估算警告
  const estimatedTokens = Math.ceil(promptText.length / 3.5);
  if (selectedModel && estimatedTokens > selectedModel.maxTokens * 0.8) {
    warnings.push(`预估token数(${estimatedTokens})接近模型限制(${selectedModel.maxTokens})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * 验证系统提示词
 */
export const validateSystemPrompt = (systemPrompt: string, maxLength = 2000): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (systemPrompt.length > maxLength) {
    errors.push(`系统提示词长度不能超过${maxLength}个字符`);
  }

  // 检查是否包含用户指令
  const userInstructions = ['请', '帮我', '给我'];
  const hasUserInstructions = userInstructions.some(instruction => 
    systemPrompt.includes(instruction)
  );

  if (hasUserInstructions) {
    warnings.push('系统提示词应该设置AI的行为规则，而不是用户指令');
  }

  // 检查是否过于简单
  if (systemPrompt.length < 20) {
    warnings.push('系统提示词较短，建议提供更详细的行为规则');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * 获取提示词质量评分
 */
export const getPromptQualityScore = (promptText: string): {
  score: number;
  factors: { name: string; score: number; weight: number }[];
} => {
  const factors = [
    {
      name: '长度适中',
      score: Math.min(100, Math.max(0, (promptText.length - 10) / 200 * 100)),
      weight: 0.2,
    },
    {
      name: '结构清晰',
      score: promptText.includes('\n') || promptText.includes('：') ? 80 : 40,
      weight: 0.3,
    },
    {
      name: '具体性',
      score: (promptText.match(/具体|详细|例如|比如/g) || []).length * 20,
      weight: 0.25,
    },
    {
      name: '完整性',
      score: promptText.split(/[。！？.!?]/).length > 1 ? 70 : 30,
      weight: 0.25,
    },
  ];

  // 计算加权平均分
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const weightedScore = factors.reduce((sum, factor) => 
    sum + (Math.min(100, factor.score) * factor.weight), 0
  );

  return {
    score: Math.round(weightedScore / totalWeight),
    factors,
  };
};