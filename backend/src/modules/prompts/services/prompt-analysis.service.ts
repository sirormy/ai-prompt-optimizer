import { Injectable, Logger } from '@nestjs/common';

/**
 * 提示词分析结果接口
 */
export interface PromptAnalysis {
  // 基础统计
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;

  // 结构分析
  hasSystemPrompt: boolean;
  messageRole: string;
  structureScore: number; // 0-1，结构化程度
  
  // 内容分析
  clarityScore: number; // 0-1，清晰度评分
  specificityScore: number; // 0-1，具体性评分
  completenessScore: number; // 0-1，完整性评分
  
  // 问题识别
  hasVagueInstructions: boolean;
  lacksContext: boolean;
  missingExamples: boolean;
  hasTooManyInstructions: boolean;
  hasConflictingInstructions: boolean;
  
  // 分类标签
  categories: string[]; // 如：['creative', 'analytical', 'conversational']
  complexity: 'simple' | 'moderate' | 'complex';
  
  // 语言特征
  language: string;
  tone: string; // formal, casual, technical, etc.
  
  // 改进建议
  suggestedImprovements: string[];
  
  // 模型适配性
  modelCompatibility: Record<string, number>; // 模型ID -> 适配度评分
}

/**
 * 分析上下文接口
 */
export interface AnalysisContext {
  targetModel: string;
  messageRole: string;
  systemPrompt?: string;
  optimizationLevel?: string;
}

/**
 * 提示词分析服务
 * 负责分析提示词的结构、内容质量、潜在问题等
 */
@Injectable()
export class PromptAnalysisService {
  private readonly logger = new Logger(PromptAnalysisService.name);

  // 常见的模糊词汇
  private readonly vagueWords = [
    '好的', '不错的', '合适的', '适当的', '一些', '很多', '大概', '可能',
    'good', 'nice', 'appropriate', 'suitable', 'some', 'many', 'probably', 'maybe'
  ];

  // 指令关键词
  private readonly instructionKeywords = [
    '请', '帮我', '生成', '创建', '写', '分析', '总结', '解释', '描述', '列出',
    'please', 'help', 'generate', 'create', 'write', 'analyze', 'summarize', 'explain', 'describe', 'list'
  ];

  // 上下文关键词
  private readonly contextKeywords = [
    '背景', '场景', '目标', '受众', '要求', '格式', '风格', '例如', '比如',
    'background', 'context', 'scenario', 'target', 'audience', 'requirement', 'format', 'style', 'example', 'for instance'
  ];

  /**
   * 分析提示词
   */
  async analyzePrompt(prompt: string, context: AnalysisContext): Promise<PromptAnalysis> {
    this.logger.log(`Analyzing prompt for model: ${context.targetModel}`);

    const analysis: PromptAnalysis = {
      // 基础统计
      wordCount: this.countWords(prompt),
      characterCount: prompt.length,
      sentenceCount: this.countSentences(prompt),
      paragraphCount: this.countParagraphs(prompt),

      // 结构分析
      hasSystemPrompt: !!context.systemPrompt,
      messageRole: context.messageRole,
      structureScore: this.calculateStructureScore(prompt),

      // 内容分析
      clarityScore: this.calculateClarityScore(prompt),
      specificityScore: this.calculateSpecificityScore(prompt),
      completenessScore: this.calculateCompletenessScore(prompt),

      // 问题识别
      hasVagueInstructions: this.hasVagueInstructions(prompt),
      lacksContext: this.lacksContext(prompt),
      missingExamples: this.missingExamples(prompt),
      hasTooManyInstructions: this.hasTooManyInstructions(prompt),
      hasConflictingInstructions: this.hasConflictingInstructions(prompt),

      // 分类标签
      categories: this.categorizePrompt(prompt),
      complexity: this.assessComplexity(prompt),

      // 语言特征
      language: this.detectLanguage(prompt),
      tone: this.detectTone(prompt),

      // 改进建议
      suggestedImprovements: [],

      // 模型适配性
      modelCompatibility: this.assessModelCompatibility(prompt, context.targetModel),
    };

    // 生成改进建议
    analysis.suggestedImprovements = this.generateImprovementSuggestions(analysis);

    this.logger.log(`Analysis completed: clarity=${analysis.clarityScore}, structure=${analysis.structureScore}`);
    return analysis;
  }

  /**
   * 计算单词数
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * 计算句子数
   */
  private countSentences(text: string): number {
    return text.split(/[.!?。！？]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  /**
   * 计算段落数
   */
  private countParagraphs(text: string): number {
    return text.split(/\n\s*\n/).filter(paragraph => paragraph.trim().length > 0).length;
  }

  /**
   * 计算结构化评分
   */
  private calculateStructureScore(prompt: string): number {
    let score = 0.5; // 基础分数

    // 检查是否有明确的结构标识
    const hasNumberedList = /\d+\.|^\d+\)/m.test(prompt);
    const hasBulletPoints = /^[-*•]/m.test(prompt);
    const hasHeaders = /^#+\s/m.test(prompt) || /^[A-Z][^a-z]*:$/m.test(prompt);
    const hasSections = prompt.includes('---') || prompt.includes('===');

    if (hasNumberedList) score += 0.15;
    if (hasBulletPoints) score += 0.1;
    if (hasHeaders) score += 0.15;
    if (hasSections) score += 0.1;

    // 检查段落结构
    const paragraphs = this.countParagraphs(prompt);
    if (paragraphs > 1 && paragraphs <= 5) score += 0.1;
    else if (paragraphs > 5) score -= 0.05;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * 计算清晰度评分
   */
  private calculateClarityScore(prompt: string): number {
    let score = 0.7; // 基础分数

    // 检查模糊词汇
    const vagueWordCount = this.vagueWords.filter(word => 
      prompt.toLowerCase().includes(word.toLowerCase())
    ).length;
    score -= vagueWordCount * 0.05;

    // 检查句子长度
    const sentences = prompt.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    
    if (avgSentenceLength > 200) score -= 0.1; // 句子过长
    if (avgSentenceLength < 20) score -= 0.05; // 句子过短

    // 检查指令明确性
    const hasSpecificInstructions = this.instructionKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasSpecificInstructions) score += 0.1;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * 计算具体性评分
   */
  private calculateSpecificityScore(prompt: string): number {
    let score = 0.5;

    // 检查具体的数字、日期、名称等
    const hasNumbers = /\d+/.test(prompt);
    const hasDates = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(prompt);
    const hasSpecificNames = /[A-Z][a-z]+\s[A-Z][a-z]+/.test(prompt); // 人名或专有名词
    const hasQuotes = /"[^"]*"|'[^']*'/.test(prompt);

    if (hasNumbers) score += 0.1;
    if (hasDates) score += 0.1;
    if (hasSpecificNames) score += 0.1;
    if (hasQuotes) score += 0.1;

    // 检查具体的要求和约束
    const constraintKeywords = ['必须', '不能', '应该', '需要', 'must', 'should', 'cannot', 'need to'];
    const hasConstraints = constraintKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasConstraints) score += 0.15;

    // 检查格式要求
    const formatKeywords = ['格式', '样式', '长度', '字数', 'format', 'style', 'length', 'words'];
    const hasFormatRequirements = formatKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasFormatRequirements) score += 0.15;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * 计算完整性评分
   */
  private calculateCompletenessScore(prompt: string): number {
    let score = 0.6;

    // 检查是否包含上下文信息
    const hasContext = this.contextKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasContext) score += 0.15;

    // 检查是否有明确的任务描述
    const hasTask = this.instructionKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasTask) score += 0.1;

    // 检查是否有期望输出的描述
    const outputKeywords = ['输出', '结果', '返回', '生成', 'output', 'result', 'return', 'generate'];
    const hasOutputDescription = outputKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasOutputDescription) score += 0.1;

    // 检查是否有示例
    const exampleKeywords = ['例如', '比如', '示例', '样例', 'example', 'for instance', 'such as'];
    const hasExamples = exampleKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasExamples) score += 0.05;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * 检查是否有模糊指令
   */
  private hasVagueInstructions(prompt: string): boolean {
    const vagueCount = this.vagueWords.filter(word =>
      prompt.toLowerCase().includes(word.toLowerCase())
    ).length;
    return vagueCount > 2;
  }

  /**
   * 检查是否缺乏上下文
   */
  private lacksContext(prompt: string): boolean {
    const hasContextWords = this.contextKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    return !hasContextWords && prompt.length > 50;
  }

  /**
   * 检查是否缺少示例
   */
  private missingExamples(prompt: string): boolean {
    const exampleKeywords = ['例如', '比如', '示例', '样例', 'example', 'for instance', 'such as'];
    const hasExamples = exampleKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );
    return !hasExamples && prompt.length > 200;
  }

  /**
   * 检查是否有太多指令
   */
  private hasTooManyInstructions(prompt: string): boolean {
    const instructionCount = this.instructionKeywords.filter(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    return instructionCount > 8;
  }

  /**
   * 检查是否有冲突的指令
   */
  private hasConflictingInstructions(prompt: string): boolean {
    const conflicts = [
      ['简短', '详细'],
      ['正式', '随意'],
      ['技术性', '通俗'],
      ['brief', 'detailed'],
      ['formal', 'casual'],
      ['technical', 'simple']
    ];

    return conflicts.some(([word1, word2]) =>
      prompt.toLowerCase().includes(word1.toLowerCase()) &&
      prompt.toLowerCase().includes(word2.toLowerCase())
    );
  }

  /**
   * 对提示词进行分类
   */
  private categorizePrompt(prompt: string): string[] {
    const categories: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    // 创意类
    if (/创作|创意|写作|故事|诗歌|creative|writing|story|poem/.test(lowerPrompt)) {
      categories.push('creative');
    }

    // 分析类
    if (/分析|评估|比较|研究|analyze|evaluate|compare|research/.test(lowerPrompt)) {
      categories.push('analytical');
    }

    // 对话类
    if (/对话|聊天|回答|问答|conversation|chat|answer|qa/.test(lowerPrompt)) {
      categories.push('conversational');
    }

    // 技术类
    if (/代码|编程|技术|算法|code|programming|technical|algorithm/.test(lowerPrompt)) {
      categories.push('technical');
    }

    // 教育类
    if (/教学|解释|学习|教育|teach|explain|learn|education/.test(lowerPrompt)) {
      categories.push('educational');
    }

    // 商务类
    if (/商务|业务|营销|销售|business|marketing|sales/.test(lowerPrompt)) {
      categories.push('business');
    }

    return categories.length > 0 ? categories : ['general'];
  }

  /**
   * 评估复杂度
   */
  private assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = this.countWords(prompt);
    const sentenceCount = this.countSentences(prompt);
    const instructionCount = this.instructionKeywords.filter(keyword =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    if (wordCount < 50 && sentenceCount < 3 && instructionCount <= 2) {
      return 'simple';
    } else if (wordCount < 200 && sentenceCount < 10 && instructionCount <= 5) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  /**
   * 检测语言
   */
  private detectLanguage(prompt: string): string {
    // 简单的语言检测
    const chineseChars = (prompt.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = prompt.length;
    
    if (chineseChars / totalChars > 0.3) {
      return 'zh';
    } else {
      return 'en';
    }
  }

  /**
   * 检测语调
   */
  private detectTone(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    if (/请|谢谢|麻烦|please|thank|kindly/.test(lowerPrompt)) {
      return 'polite';
    } else if (/必须|立即|urgent|must|immediately/.test(lowerPrompt)) {
      return 'urgent';
    } else if (/专业|技术|professional|technical/.test(lowerPrompt)) {
      return 'professional';
    } else if (/随意|轻松|casual|relaxed/.test(lowerPrompt)) {
      return 'casual';
    } else {
      return 'neutral';
    }
  }

  /**
   * 评估模型适配性
   */
  private assessModelCompatibility(prompt: string, targetModel: string): Record<string, number> {
    const compatibility: Record<string, number> = {};
    const wordCount = this.countWords(prompt);
    const complexity = this.assessComplexity(prompt);

    // OpenAI模型适配性
    compatibility['openai-gpt4'] = 0.8;
    if (wordCount > 1000) compatibility['openai-gpt4'] -= 0.1;
    if (complexity === 'complex') compatibility['openai-gpt4'] += 0.1;

    // Claude模型适配性
    compatibility['anthropic-claude'] = 0.9;
    if (wordCount > 2000) compatibility['anthropic-claude'] += 0.05;
    if (this.detectTone(prompt) === 'professional') compatibility['anthropic-claude'] += 0.05;

    // DeepSeek模型适配性
    compatibility['deepseek-chat'] = 0.7;
    if (/代码|编程|技术|code|programming|technical/.test(prompt.toLowerCase())) {
      compatibility['deepseek-chat'] += 0.2;
    }

    return compatibility;
  }

  /**
   * 生成改进建议
   */
  private generateImprovementSuggestions(analysis: PromptAnalysis): string[] {
    const suggestions: string[] = [];

    if (analysis.clarityScore < 0.6) {
      suggestions.push('提高指令的清晰度，避免使用模糊词汇');
    }

    if (analysis.specificityScore < 0.5) {
      suggestions.push('添加更具体的要求和约束条件');
    }

    if (analysis.lacksContext) {
      suggestions.push('提供更多背景信息和上下文');
    }

    if (analysis.missingExamples) {
      suggestions.push('添加具体的示例来说明期望的输出');
    }

    if (analysis.structureScore < 0.5) {
      suggestions.push('改善提示词的结构，使用列表或分段');
    }

    if (analysis.hasTooManyInstructions) {
      suggestions.push('简化指令，专注于最重要的要求');
    }

    if (analysis.hasConflictingInstructions) {
      suggestions.push('检查并解决冲突的指令');
    }

    return suggestions;
  }
}