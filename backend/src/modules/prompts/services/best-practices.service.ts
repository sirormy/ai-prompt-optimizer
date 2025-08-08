import { Injectable, Logger } from '@nestjs/common';
import { Improvement } from '../../models/dto';
import { PromptAnalysis } from './prompt-analysis.service';

/**
 * 最佳实践应用结果接口
 */
export interface BestPracticesResult {
  optimizedText: string;
  appliedPractices: string[];
  improvements: Improvement[];
}

/**
 * 最佳实践类型
 */
export enum BestPracticeType {
  OPENAI_MODEL_SPEC = 'openai-model-spec',
  OPENAI_COOKBOOK = 'openai-cookbook',
  ANTHROPIC_GUIDELINES = 'anthropic-guidelines',
  GENERAL_PRACTICES = 'general-practices',
}

/**
 * 最佳实践服务
 * 基于OpenAI Model Spec、Cookbook和其他最佳实践文档进行优化
 */
@Injectable()
export class BestPracticesService {
  private readonly logger = new Logger(BestPracticesService.name);

  /**
   * 应用最佳实践
   */
  async applyBestPractices(
    text: string,
    targetModel: string,
    messageRole: string,
    analysis: PromptAnalysis,
  ): Promise<BestPracticesResult> {
    this.logger.log(`Applying best practices for model: ${targetModel}`);

    let optimizedText = text;
    const appliedPractices: string[] = [];
    const improvements: Improvement[] = [];

    // 应用OpenAI Model Spec最佳实践
    if (targetModel.includes('openai')) {
      const openaiResult = await this.applyOpenAIBestPractices(optimizedText, messageRole, analysis);
      optimizedText = openaiResult.text;
      appliedPractices.push(...openaiResult.practices);
      improvements.push(...openaiResult.improvements);
    }

    // 应用Anthropic Claude最佳实践
    if (targetModel.includes('anthropic') || targetModel.includes('claude')) {
      const claudeResult = await this.applyClaudeBestPractices(optimizedText, messageRole, analysis);
      optimizedText = claudeResult.text;
      appliedPractices.push(...claudeResult.practices);
      improvements.push(...claudeResult.improvements);
    }

    // 应用通用最佳实践
    const generalResult = await this.applyGeneralBestPractices(optimizedText, analysis);
    optimizedText = generalResult.text;
    appliedPractices.push(...generalResult.practices);
    improvements.push(...generalResult.improvements);

    this.logger.log(`Applied ${appliedPractices.length} best practices`);

    return {
      optimizedText,
      appliedPractices,
      improvements,
    };
  }

  /**
   * 应用OpenAI最佳实践
   * 基于OpenAI Model Spec和Cookbook
   */
  private async applyOpenAIBestPractices(
    text: string,
    messageRole: string,
    analysis: PromptAnalysis,
  ): Promise<{
    text: string;
    practices: string[];
    improvements: Improvement[];
  }> {
    let optimizedText = text;
    const practices: string[] = [];
    const improvements: Improvement[] = [];

    // 1. 使用明确的指令 (OpenAI Cookbook)
    if (analysis.clarityScore < 0.7) {
      const beforeText = optimizedText;
      optimizedText = this.addClearInstructions(optimizedText);
      
      if (optimizedText !== beforeText) {
        practices.push('clear-instructions');
        improvements.push({
          type: 'clarity',
          description: '添加了更明确的指令',
          impact: 'high',
          before: beforeText,
          after: optimizedText,
          reasoning: 'OpenAI模型在接收明确指令时表现更佳',
        });
      }
    }

    // 2. 使用分隔符来明确区分输入的不同部分
    if (analysis.structureScore < 0.6 && text.length > 200) {
      const beforeText = optimizedText;
      optimizedText = this.addDelimiters(optimizedText);
      
      if (optimizedText !== beforeText) {
        practices.push('use-delimiters');
        improvements.push({
          type: 'structure',
          description: '使用分隔符明确区分不同部分',
          impact: 'medium',
          before: beforeText,
          after: optimizedText,
          reasoning: '分隔符帮助模型理解输入的结构',
        });
      }
    }

    // 3. 要求结构化输出 (JSON, XML等)
    if (!this.hasStructuredOutputRequest(optimizedText) && analysis.complexity !== 'simple') {
      const beforeText = optimizedText;
      optimizedText = this.addStructuredOutputRequest(optimizedText);
      
      if (optimizedText !== beforeText) {
        practices.push('structured-output');
        improvements.push({
          type: 'format',
          description: '添加了结构化输出要求',
          impact: 'medium',
          before: beforeText,
          after: optimizedText,
          reasoning: '结构化输出更容易解析和处理',
        });
      }
    }

    // 4. 使用少样本学习 (Few-shot learning)
    if (analysis.missingExamples && analysis.complexity === 'complex') {
      const beforeText = optimizedText;
      optimizedText = this.addFewShotExamples(optimizedText, analysis);
      
      if (optimizedText !== beforeText) {
        practices.push('few-shot-learning');
        improvements.push({
          type: 'examples',
          description: '添加了少样本学习示例',
          impact: 'high',
          before: beforeText,
          after: optimizedText,
          reasoning: '示例帮助模型理解期望的输出格式和质量',
        });
      }
    }

    // 5. 指定输出长度
    if (!this.hasLengthSpecification(optimizedText)) {
      const beforeText = optimizedText;
      optimizedText = this.addLengthSpecification(optimizedText, analysis);
      
      if (optimizedText !== beforeText) {
        practices.push('specify-length');
        improvements.push({
          type: 'specificity',
          description: '添加了输出长度规范',
          impact: 'low',
          before: beforeText,
          after: optimizedText,
          reasoning: '明确的长度要求避免输出过长或过短',
        });
      }
    }

    // 6. 使用角色扮演
    if (messageRole === 'system' && !this.hasRoleDefinition(optimizedText)) {
      const beforeText = optimizedText;
      optimizedText = this.addRoleDefinition(optimizedText, analysis);
      
      if (optimizedText !== beforeText) {
        practices.push('role-playing');
        improvements.push({
          type: 'context',
          description: '添加了角色定义',
          impact: 'medium',
          before: beforeText,
          after: optimizedText,
          reasoning: '明确的角色定义帮助模型采用合适的语调和专业水平',
        });
      }
    }

    return { text: optimizedText, practices, improvements };
  }

  /**
   * 应用Claude最佳实践
   */
  private async applyClaudeBestPractices(
    text: string,
    messageRole: string,
    analysis: PromptAnalysis,
  ): Promise<{
    text: string;
    practices: string[];
    improvements: Improvement[];
  }> {
    let optimizedText = text;
    const practices: string[] = [];
    const improvements: Improvement[] = [];

    // 1. 使用XML标签结构化内容
    if (analysis.structureScore < 0.7 && text.length > 150) {
      const beforeText = optimizedText;
      optimizedText = this.addXMLStructure(optimizedText);
      
      if (optimizedText !== beforeText) {
        practices.push('xml-structure');
        improvements.push({
          type: 'structure',
          description: '使用XML标签结构化内容',
          impact: 'medium',
          before: beforeText,
          after: optimizedText,
          reasoning: 'Claude模型对XML结构化内容理解更好',
        });
      }
    }

    // 2. 明确的思考过程要求
    if (analysis.complexity === 'complex' && !this.hasThinkingProcess(optimizedText)) {
      const beforeText = optimizedText;
      optimizedText = this.addThinkingProcess(optimizedText);
      
      if (optimizedText !== beforeText) {
        practices.push('thinking-process');
        improvements.push({
          type: 'reasoning',
          description: '添加了思考过程要求',
          impact: 'high',
          before: beforeText,
          after: optimizedText,
          reasoning: 'Claude在被要求展示思考过程时表现更佳',
        });
      }
    }

    // 3. 使用人类反馈格式
    if (!this.hasHumanFeedbackFormat(optimizedText) && analysis.categories.includes('conversational')) {
      const beforeText = optimizedText;
      optimizedText = this.addHumanFeedbackFormat(optimizedText);
      
      if (optimizedText !== beforeText) {
        practices.push('human-feedback-format');
        improvements.push({
          type: 'interaction',
          description: '添加了人类反馈格式',
          impact: 'medium',
          before: beforeText,
          after: optimizedText,
          reasoning: 'Claude更适合对话式交互格式',
        });
      }
    }

    return { text: optimizedText, practices, improvements };
  }

  /**
   * 应用通用最佳实践
   */
  private async applyGeneralBestPractices(
    text: string,
    analysis: PromptAnalysis,
  ): Promise<{
    text: string;
    practices: string[];
    improvements: Improvement[];
  }> {
    let optimizedText = text;
    const practices: string[] = [];
    const improvements: Improvement[] = [];

    // 1. 添加约束条件
    if (!this.hasConstraints(optimizedText) && analysis.specificityScore < 0.6) {
      const beforeText = optimizedText;
      optimizedText = this.addConstraints(optimizedText, analysis);
      
      if (optimizedText !== beforeText) {
        practices.push('add-constraints');
        improvements.push({
          type: 'specificity',
          description: '添加了约束条件',
          impact: 'medium',
          before: beforeText,
          after: optimizedText,
          reasoning: '约束条件帮助控制输出质量和格式',
        });
      }
    }

    // 2. 优化语言表达
    if (analysis.tone === 'neutral' && analysis.categories.includes('professional')) {
      const beforeText = optimizedText;
      optimizedText = this.improveProfessionalTone(optimizedText);
      
      if (optimizedText !== beforeText) {
        practices.push('professional-tone');
        improvements.push({
          type: 'tone',
          description: '改善了专业语调',
          impact: 'low',
          before: beforeText,
          after: optimizedText,
          reasoning: '专业的语调提高了输出的可信度',
        });
      }
    }

    // 3. 添加错误处理指导
    if (!this.hasErrorHandling(optimizedText) && analysis.complexity !== 'simple') {
      const beforeText = optimizedText;
      optimizedText = this.addErrorHandling(optimizedText);
      
      if (optimizedText !== beforeText) {
        practices.push('error-handling');
        improvements.push({
          type: 'robustness',
          description: '添加了错误处理指导',
          impact: 'low',
          before: beforeText,
          after: optimizedText,
          reasoning: '错误处理指导提高了系统的鲁棒性',
        });
      }
    }

    return { text: optimizedText, practices, improvements };
  }

  // 辅助方法实现

  private addClearInstructions(text: string): string {
    if (!text.toLowerCase().includes('请') && !text.toLowerCase().includes('please')) {
      return `请按照以下要求完成任务：\n\n${text}`;
    }
    return text;
  }

  private addDelimiters(text: string): string {
    if (text.includes('\n') && !text.includes('---')) {
      const parts = text.split('\n\n');
      if (parts.length > 1) {
        return parts.join('\n\n---\n\n');
      }
    }
    return text;
  }

  private hasStructuredOutputRequest(text: string): boolean {
    const patterns = [
      /json/i, /xml/i, /yaml/i, /格式/i, /format/i,
      /结构/i, /structure/i, /输出.*:/i, /output.*:/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private addStructuredOutputRequest(text: string): string {
    return `${text}\n\n请以JSON格式输出结果。`;
  }

  private addFewShotExamples(text: string, analysis: PromptAnalysis): string {
    const exampleText = `\n\n示例：\n输入：[示例输入]\n输出：[示例输出]\n\n现在请处理以下内容：`;
    return text + exampleText;
  }

  private hasLengthSpecification(text: string): boolean {
    const patterns = [
      /\d+.*字/i, /\d+.*words/i, /长度/i, /length/i,
      /简短/i, /详细/i, /brief/i, /detailed/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private addLengthSpecification(text: string, analysis: PromptAnalysis): string {
    const lengthSpec = analysis.wordCount > 100 ? '请提供详细的回答（200-500字）' : '请提供简洁的回答（50-100字）';
    return `${text}\n\n${lengthSpec}`;
  }

  private hasRoleDefinition(text: string): boolean {
    const patterns = [
      /你是/i, /作为/i, /扮演/i, /you are/i, /as a/i, /act as/i,
      /专家/i, /助手/i, /expert/i, /assistant/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private addRoleDefinition(text: string, analysis: PromptAnalysis): string {
    let role = '专业助手';
    if (analysis.categories.includes('technical')) role = '技术专家';
    else if (analysis.categories.includes('creative')) role = '创意写作专家';
    else if (analysis.categories.includes('analytical')) role = '分析专家';
    
    return `你是一位${role}。${text}`;
  }

  private addXMLStructure(text: string): string {
    if (!text.includes('<') && text.length > 150) {
      return `<task>\n${text}\n</task>`;
    }
    return text;
  }

  private hasThinkingProcess(text: string): boolean {
    const patterns = [
      /思考/i, /分析/i, /推理/i, /think/i, /analyze/i, /reason/i,
      /步骤/i, /过程/i, /step/i, /process/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private addThinkingProcess(text: string): string {
    return `${text}\n\n请先分析问题，然后逐步给出解决方案。`;
  }

  private hasHumanFeedbackFormat(text: string): boolean {
    return text.includes('Human:') || text.includes('Assistant:') || text.includes('用户：') || text.includes('助手：');
  }

  private addHumanFeedbackFormat(text: string): string {
    return `Human: ${text}\n\nAssistant: `;
  }

  private hasConstraints(text: string): boolean {
    const patterns = [
      /不要/i, /避免/i, /必须/i, /应该/i, /don't/i, /avoid/i, /must/i, /should/i,
      /限制/i, /要求/i, /constraint/i, /requirement/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private addConstraints(text: string, analysis: PromptAnalysis): string {
    const constraints = [
      '请确保回答准确可靠',
      '避免使用过于技术性的术语',
      '保持回答的客观性'
    ];
    
    const selectedConstraint = constraints[0]; // 简化选择逻辑
    return `${text}\n\n注意：${selectedConstraint}`;
  }

  private improveProfessionalTone(text: string): string {
    const replacements = {
      '你': '您',
      '好的': '好的',
      '可以': '能够',
      'ok': 'acceptable',
      'good': 'excellent',
    };

    let improvedText = text;
    for (const [casual, professional] of Object.entries(replacements)) {
      improvedText = improvedText.replace(new RegExp(casual, 'gi'), professional);
    }
    
    return improvedText;
  }

  private hasErrorHandling(text: string): boolean {
    const patterns = [
      /错误/i, /异常/i, /失败/i, /error/i, /exception/i, /fail/i,
      /如果.*不/i, /if.*not/i, /无法/i, /cannot/i
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private addErrorHandling(text: string): string {
    return `${text}\n\n如果遇到不确定的情况，请说明并提供可能的解决方案。`;
  }
}