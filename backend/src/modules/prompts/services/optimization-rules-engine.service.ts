import { Injectable, Logger } from '@nestjs/common';
import { OptimizationRule } from '../../../schemas/optimization-rule.schema';
import { Improvement } from '../../models/dto';
import { PromptAnalysis } from './prompt-analysis.service';

/**
 * 规则应用结果接口
 */
export interface RuleApplicationResult {
  optimizedText: string;
  appliedRules: string[];
  improvements: Improvement[];
  processingLog: string[];
}

/**
 * 规则执行上下文接口
 */
export interface RuleContext {
  originalText: string;
  currentText: string;
  analysis: PromptAnalysis;
  appliedRules: string[];
  metadata: Record<string, any>;
}

/**
 * 优化规则引擎服务
 * 负责应用各种优化规则来改进提示词
 */
@Injectable()
export class OptimizationRulesEngine {
  private readonly logger = new Logger(OptimizationRulesEngine.name);

  /**
   * 应用优化规则
   */
  async applyRules(
    text: string,
    rules: OptimizationRule[],
    analysis: PromptAnalysis,
  ): Promise<RuleApplicationResult> {
    this.logger.log(`Applying ${rules.length} optimization rules`);

    const context: RuleContext = {
      originalText: text,
      currentText: text,
      analysis,
      appliedRules: [],
      metadata: {},
    };

    const improvements: Improvement[] = [];
    const processingLog: string[] = [];

    // 按优先级排序规则
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      try {
        const beforeText = context.currentText;
        const ruleResult = await this.applyRule(rule, context);

        if (ruleResult.applied) {
          context.currentText = ruleResult.text;
          context.appliedRules.push(rule.name);
          
          improvements.push({
            type: rule.category,
            description: ruleResult.description,
            impact: ruleResult.impact,
            before: beforeText,
            after: ruleResult.text,
            reasoning: ruleResult.reasoning,
          });

          processingLog.push(`Applied rule: ${rule.name} - ${ruleResult.description}`);
          this.logger.debug(`Applied rule: ${rule.name}`);
        } else {
          processingLog.push(`Skipped rule: ${rule.name} - ${ruleResult.reason}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to apply rule ${rule.name}: ${error.message}`);
        processingLog.push(`Error applying rule: ${rule.name} - ${error.message}`);
      }
    }

    this.logger.log(`Applied ${context.appliedRules.length} rules successfully`);

    return {
      optimizedText: context.currentText,
      appliedRules: context.appliedRules,
      improvements,
      processingLog,
    };
  }

  /**
   * 应用单个规则
   */
  private async applyRule(
    rule: OptimizationRule,
    context: RuleContext,
  ): Promise<{
    applied: boolean;
    text: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    reasoning: string;
    reason?: string;
  }> {
    // 检查规则条件
    if (!this.checkRuleCondition(rule, context)) {
      return {
        applied: false,
        text: context.currentText,
        description: '',
        impact: 'low',
        reasoning: '',
        reason: 'Rule condition not met',
      };
    }

    // 根据规则类型应用不同的处理逻辑
    switch (rule.category) {
      case 'clarity':
        return this.applyClarityRule(rule, context);
      case 'structure':
        return this.applyStructureRule(rule, context);
      case 'context':
        return this.applyContextRule(rule, context);
      case 'examples':
        return this.applyExamplesRule(rule, context);
      case 'format':
        return this.applyFormatRule(rule, context);
      case 'length':
        return this.applyLengthRule(rule, context);
      case 'specificity':
        return this.applySpecificityRule(rule, context);
      default:
        return this.applyGenericRule(rule, context);
    }
  }

  /**
   * 检查规则条件
   */
  private checkRuleCondition(rule: OptimizationRule, context: RuleContext): boolean {
    if (!rule.ruleLogic.condition) {
      return true; // 无条件规则总是适用
    }

    try {
      // 解析条件表达式
      const condition = rule.ruleLogic.condition;
      
      // 支持的条件类型
      if (condition.includes('wordCount')) {
        const match = condition.match(/wordCount\s*([><=]+)\s*(\d+)/);
        if (match) {
          const operator = match[1];
          const threshold = parseInt(match[2]);
          const wordCount = context.analysis.wordCount;
          
          switch (operator) {
            case '>': return wordCount > threshold;
            case '<': return wordCount < threshold;
            case '>=': return wordCount >= threshold;
            case '<=': return wordCount <= threshold;
            case '==': return wordCount === threshold;
            default: return false;
          }
        }
      }

      if (condition.includes('clarityScore')) {
        const match = condition.match(/clarityScore\s*([><=]+)\s*([\d.]+)/);
        if (match) {
          const operator = match[1];
          const threshold = parseFloat(match[2]);
          const score = context.analysis.clarityScore;
          
          switch (operator) {
            case '>': return score > threshold;
            case '<': return score < threshold;
            case '>=': return score >= threshold;
            case '<=': return score <= threshold;
            default: return false;
          }
        }
      }

      if (condition.includes('hasVagueInstructions')) {
        return context.analysis.hasVagueInstructions;
      }

      if (condition.includes('lacksContext')) {
        return context.analysis.lacksContext;
      }

      if (condition.includes('missingExamples')) {
        return context.analysis.missingExamples;
      }

      // 默认返回true
      return true;
    } catch (error) {
      this.logger.warn(`Failed to evaluate rule condition: ${rule.ruleLogic.condition}`);
      return false;
    }
  }

  /**
   * 应用清晰度规则
   */
  private applyClarityRule(rule: OptimizationRule, context: RuleContext): Promise<any> {
    let text = context.currentText;
    let applied = false;
    let description = '';
    let reasoning = '';

    // 替换模糊词汇
    if (rule.name.includes('vague-words')) {
      const vagueWords = ['好的', '不错的', '合适的', '一些', 'good', 'nice', 'appropriate', 'some'];
      const replacements = {
        '好的': '高质量的',
        '不错的': '优秀的',
        '合适的': '符合要求的',
        '一些': '3-5个',
        'good': 'high-quality',
        'nice': 'excellent',
        'appropriate': 'suitable',
        'some': 'several',
      };

      for (const [vague, specific] of Object.entries(replacements)) {
        if (text.includes(vague)) {
          text = text.replace(new RegExp(vague, 'gi'), specific);
          applied = true;
          description = `将模糊词汇"${vague}"替换为更具体的"${specific}"`;
          reasoning = '使用具体词汇可以提高指令的清晰度和准确性';
        }
      }
    }

    // 简化复杂句子
    if (rule.name.includes('sentence-simplification')) {
      const sentences = text.split(/[.!?。！？]+/);
      let modified = false;
      
      const simplifiedSentences = sentences.map(sentence => {
        if (sentence.trim().length > 150) {
          // 尝试分割长句子
          const parts = sentence.split(/[,，;；]/);
          if (parts.length > 2) {
            modified = true;
            return parts.join('。').trim();
          }
        }
        return sentence;
      });

      if (modified) {
        text = simplifiedSentences.join('。');
        applied = true;
        description = '简化了过长的句子结构';
        reasoning = '较短的句子更容易理解和处理';
      }
    }

    return Promise.resolve({
      applied,
      text,
      description,
      impact: applied ? 'medium' : 'low',
      reasoning,
    });
  }

  /**
   * 应用结构规则
   */
  private applyStructureRule(rule: OptimizationRule, context: RuleContext): Promise<any> {
    let text = context.currentText;
    let applied = false;
    let description = '';
    let reasoning = '';

    // 添加编号列表
    if (rule.name.includes('numbered-list') && context.analysis.structureScore < 0.5) {
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length > 3 && !text.match(/^\d+\./m)) {
        const numberedLines = lines.map((line, index) => {
          if (line.trim().length > 20 && !line.includes(':')) {
            return `${index + 1}. ${line.trim()}`;
          }
          return line;
        });
        
        text = numberedLines.join('\n');
        applied = true;
        description = '为主要指令添加了编号列表';
        reasoning = '编号列表使指令更有条理，便于理解和执行';
      }
    }

    // 添加分段
    if (rule.name.includes('paragraph-structure') && context.analysis.paragraphCount === 1) {
      if (text.length > 200) {
        // 在句号后添加段落分隔
        text = text.replace(/([.。])\s*([A-Z\u4e00-\u9fff])/g, '$1\n\n$2');
        applied = true;
        description = '改善了段落结构';
        reasoning = '适当的段落分隔提高了可读性';
      }
    }

    return Promise.resolve({
      applied,
      text,
      description,
      impact: applied ? 'medium' : 'low',
      reasoning,
    });
  }

  /**
   * 应用上下文规则
   */
  private applyContextRule(rule: OptimizationRule, context: RuleContext): Promise<any> {
    let text = context.currentText;
    let applied = false;
    let description = '';
    let reasoning = '';

    // 添加上下文提示
    if (rule.name.includes('context-enhancement') && context.analysis.lacksContext) {
      const contextPrompts = [
        '\n\n背景信息：请考虑以下上下文...',
        '\n\n目标受众：',
        '\n\n期望格式：',
        '\n\n使用场景：',
      ];

      // 选择最适合的上下文提示
      const selectedPrompt = contextPrompts[0]; // 简化选择逻辑
      text = text + selectedPrompt;
      applied = true;
      description = '添加了上下文信息提示';
      reasoning = '上下文信息帮助AI更好地理解任务需求';
    }

    return Promise.resolve({
      applied,
      text,
      description,
      impact: applied ? 'high' : 'low',
      reasoning,
    });
  }

  /**
   * 应用示例规则
   */
  private applyExamplesRule(rule: OptimizationRule, context: RuleContext): Promise<any> {
    let text = context.currentText;
    let applied = false;
    let description = '';
    let reasoning = '';

    // 添加示例提示
    if (rule.name.includes('examples-addition') && context.analysis.missingExamples) {
      if (text.length > 100) {
        text = text + '\n\n示例：\n[请在此处提供具体示例]';
        applied = true;
        description = '添加了示例部分';
        reasoning = '具体示例能显著提高输出质量和一致性';
      }
    }

    return Promise.resolve({
      applied,
      text,
      description,
      impact: applied ? 'high' : 'low',
      reasoning,
    });
  }

  /**
   * 应用格式规则
   */
  private applyFormatRule(rule: OptimizationRule, context: RuleContext): Promise<any> {
    let text = context.currentText;
    let applied = false;
    let description = '';
    let reasoning = '';

    // 添加格式要求
    if (rule.name.includes('format-specification')) {
      if (!text.toLowerCase().includes('格式') && !text.toLowerCase().includes('format')) {
        text = text + '\n\n输出格式：请按照以下格式输出...';
        applied = true;
        description = '添加了输出格式说明';
        reasoning = '明确的格式要求确保输出符合预期';
      }
    }

    return Promise.resolve({
      applied,
      text,
      description,
      impact: applied ? 'medium' : 'low',
      reasoning,
    });
  }

  /**
   * 应用长度规则
   */
  private applyLengthRule(rule: OptimizationRule, context: RuleContext): Promise<any> {
    let text = context.currentText;
    let applied = false;
    let description = '';
    let reasoning = '';

    // 长度优化
    if (rule.name.includes('length-optimization')) {
      if (context.analysis.wordCount > 500) {
        // 移除冗余词汇
        const redundantPhrases = [
          '请注意', '需要注意的是', '值得一提的是', '另外',
          'please note', 'it should be noted', 'it is worth mentioning', 'additionally'
        ];

        for (const phrase of redundantPhrases) {
          if (text.includes(phrase)) {
            text = text.replace(new RegExp(phrase, 'gi'), '');
            applied = true;
          }
        }

        if (applied) {
          description = '移除了冗余表达';
          reasoning = '简洁的表达更容易理解和处理';
        }
      }
    }

    return Promise.resolve({
      applied,
      text: text.trim(),
      description,
      impact: applied ? 'low' : 'low',
      reasoning,
    });
  }

  /**
   * 应用具体性规则
   */
  private applySpecificityRule(rule: OptimizationRule, context: RuleContext): Promise<any> {
    let text = context.currentText;
    let applied = false;
    let description = '';
    let reasoning = '';

    // 增加具体性
    if (rule.name.includes('specificity-enhancement')) {
      const generalTerms = {
        '很多': '5-10个',
        '一些': '3-5个',
        '大概': '约',
        '可能': '建议',
        'many': '5-10',
        'some': '3-5',
        'probably': 'likely',
        'maybe': 'consider',
      };

      for (const [general, specific] of Object.entries(generalTerms)) {
        if (text.includes(general)) {
          text = text.replace(new RegExp(general, 'gi'), specific);
          applied = true;
        }
      }

      if (applied) {
        description = '将一般性表达替换为更具体的描述';
        reasoning = '具体的表达减少歧义，提高执行准确性';
      }
    }

    return Promise.resolve({
      applied,
      text,
      description,
      impact: applied ? 'medium' : 'low',
      reasoning,
    });
  }

  /**
   * 应用通用规则
   */
  private applyGenericRule(rule: OptimizationRule, context: RuleContext): Promise<any> {
    let text = context.currentText;
    let applied = false;

    try {
      // 使用正则表达式进行替换
      const pattern = new RegExp(rule.ruleLogic.pattern, 'gi');
      const replacement = rule.ruleLogic.replacement;

      if (pattern.test(text)) {
        text = text.replace(pattern, replacement);
        applied = true;
      }
    } catch (error) {
      this.logger.warn(`Failed to apply generic rule ${rule.name}: ${error.message}`);
    }

    return Promise.resolve({
      applied,
      text,
      description: applied ? rule.description : '',
      impact: applied ? 'medium' : 'low',
      reasoning: applied ? `应用了规则: ${rule.description}` : '',
    });
  }
}