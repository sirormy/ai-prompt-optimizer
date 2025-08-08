import { MongoClient } from 'mongodb';

const optimizationRules = [
  {
    name: 'Clear Task Definition',
    description: '确保提示词有明确的任务定义',
    category: 'clarity',
    applicableModels: ['openai', 'claude', 'deepseek'],
    ruleLogic: {
      pattern: '^(?!.*(?:请|帮我|能否|可以)).*',
      replacement: '请帮我完成以下任务：',
      condition: 'lacks_clear_instruction',
    },
    priority: 9,
    isActive: true,
  },
  {
    name: 'Add Context Information',
    description: '为提示词添加必要的上下文信息',
    category: 'context',
    applicableModels: ['openai', 'claude', 'deepseek'],
    ruleLogic: {
      pattern: '.*',
      replacement: '背景信息：{context}\n\n任务：',
      condition: 'lacks_context',
    },
    priority: 8,
    isActive: true,
  },
  {
    name: 'Specify Output Format',
    description: '明确指定期望的输出格式',
    category: 'format',
    applicableModels: ['openai', 'claude', 'deepseek'],
    ruleLogic: {
      pattern: '.*',
      replacement: '{original_prompt}\n\n请按以下格式输出：\n- 格式：{format_specification}',
      condition: 'lacks_format_specification',
    },
    priority: 7,
    isActive: true,
  },
  {
    name: 'Add Examples',
    description: '为复杂任务添加示例',
    category: 'examples',
    applicableModels: ['openai', 'claude', 'deepseek'],
    ruleLogic: {
      pattern: '.*',
      replacement: '{original_prompt}\n\n示例：\n{example}',
      condition: 'complex_task_without_examples',
    },
    priority: 6,
    isActive: true,
  },
  {
    name: 'OpenAI Specific Optimization',
    description: '针对OpenAI模型的特定优化',
    category: 'model_specific',
    applicableModels: ['openai'],
    ruleLogic: {
      pattern: '.*',
      replacement: 'You are a helpful assistant. {original_prompt}',
      condition: 'openai_system_prompt_missing',
    },
    priority: 5,
    isActive: true,
  },
  {
    name: 'Claude Specific Optimization',
    description: '针对Claude模型的特定优化',
    category: 'model_specific',
    applicableModels: ['claude'],
    ruleLogic: {
      pattern: '.*',
      replacement: 'Human: {original_prompt}\n\nAssistant: I\'ll help you with that.',
      condition: 'claude_format_optimization',
    },
    priority: 5,
    isActive: true,
  },
  {
    name: 'DeepSeek Specific Optimization',
    description: '针对DeepSeek模型的特定优化',
    category: 'model_specific',
    applicableModels: ['deepseek'],
    ruleLogic: {
      pattern: '.*',
      replacement: '作为一个专业的AI助手，{original_prompt}',
      condition: 'deepseek_format_optimization',
    },
    priority: 5,
    isActive: true,
  },
  {
    name: 'Remove Ambiguity',
    description: '移除模糊和不明确的表达',
    category: 'clarity',
    applicableModels: ['openai', 'claude', 'deepseek'],
    ruleLogic: {
      pattern: '(可能|也许|大概|应该|或许)',
      replacement: '',
      condition: 'contains_ambiguous_words',
    },
    priority: 4,
    isActive: true,
  },
  {
    name: 'Add Constraints',
    description: '添加必要的约束条件',
    category: 'constraints',
    applicableModels: ['openai', 'claude', 'deepseek'],
    ruleLogic: {
      pattern: '.*',
      replacement: '{original_prompt}\n\n约束条件：\n- 字数限制：{word_limit}\n- 语言：{language}',
      condition: 'lacks_constraints',
    },
    priority: 3,
    isActive: true,
  },
  {
    name: 'Improve Politeness',
    description: '改善提示词的礼貌程度',
    category: 'tone',
    applicableModels: ['openai', 'claude', 'deepseek'],
    ruleLogic: {
      pattern: '^(?!.*(?:请|谢谢|麻烦)).*',
      replacement: '请{original_prompt}，谢谢。',
      condition: 'lacks_politeness',
    },
    priority: 2,
    isActive: true,
  },
];

export async function seedOptimizationRules(client: MongoClient) {
  const db = client.db();
  const collection = db.collection('optimization_rules');

  // 清除现有数据
  await collection.deleteMany({});

  // 插入种子数据
  await collection.insertMany(optimizationRules.map(rule => ({
    ...rule,
    createdAt: new Date(),
    updatedAt: new Date(),
  })));

  console.log(`Seeded ${optimizationRules.length} optimization rules`);
}