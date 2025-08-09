'use client';

import React, { useState } from 'react';
import { Row, Col, Space, Typography, Divider } from 'antd';
import PromptEditor from '@/components/ui/PromptEditor';
import ModelSelector from '@/components/ui/ModelSelector';
import RoleSettings from '@/components/ui/RoleSettings';
import OptimizationResult from '@/components/ui/OptimizationResult';
import { AIModel, MessageRole, OptimizationResult as OptimizationResultType } from '@/store/types';

const { Title } = Typography;

// 模拟数据
const mockModels: AIModel[] = [
  {
    id: 'openai-gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    version: '4.0',
    maxTokens: 8192,
    supportedRoles: ['system', 'user', 'assistant'],
    optimizationRules: [
      { id: '1', name: '结构优化', description: '优化提示词结构', category: 'structure', applicableModels: ['openai-gpt-4'], priority: 1, isActive: true },
      { id: '2', name: '清晰度提升', description: '提高表达清晰度', category: 'clarity', applicableModels: ['openai-gpt-4'], priority: 2, isActive: true },
    ],
    apiEndpoint: 'https://api.openai.com/v1',
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    provider: 'anthropic',
    version: '3.0',
    maxTokens: 100000,
    supportedRoles: ['user', 'assistant'],
    optimizationRules: [
      { id: '3', name: '上下文优化', description: '优化上下文理解', category: 'context', applicableModels: ['claude-3'], priority: 1, isActive: true },
    ],
    apiEndpoint: 'https://api.anthropic.com/v1',
  },
];

const mockOptimizationResult: OptimizationResultType = {
  id: 'result-1',
  originalPrompt: '写一个关于AI的文章',
  optimizedPrompt: '请写一篇关于人工智能技术发展现状和未来趋势的文章，要求：\n1. 字数控制在1000-1500字\n2. 包含技术发展历程、当前应用场景、未来发展方向\n3. 语言通俗易懂，适合普通读者阅读\n4. 提供具体的应用案例和数据支撑',
  improvements: [
    {
      type: 'structure',
      description: '添加了明确的结构要求和字数限制',
      impact: 'high',
      before: '写一个关于AI的文章',
      after: '请写一篇关于人工智能技术发展现状和未来趋势的文章，要求：...',
    },
    {
      type: 'specificity',
      description: '增加了具体的内容要求和目标读者定位',
      impact: 'medium',
      before: '关于AI',
      after: '关于人工智能技术发展现状和未来趋势',
    },
  ],
  confidence: 92.5,
  appliedRules: [
    { id: '1', name: '结构优化', description: '优化提示词结构', category: 'structure', applicableModels: ['openai-gpt-4'], priority: 1, isActive: true },
    { id: '2', name: '清晰度提升', description: '提高表达清晰度', category: 'clarity', applicableModels: ['openai-gpt-4'], priority: 2, isActive: true },
  ],
  suggestions: [
    {
      id: 'suggestion-1',
      type: 'context',
      title: '添加输出格式要求',
      description: '建议指定文章的格式要求，如标题层级、段落结构等',
      example: '请按照以下格式输出：\n# 标题\n## 小标题\n段落内容...',
      priority: 3,
    },
  ],
  estimatedTokens: {
    original: 12,
    optimized: 85,
    savings: -73,
    cost: {
      original: 0.0002,
      optimized: 0.0017,
      currency: 'USD',
    },
  },
};

const ComponentsDemo: React.FC = () => {
  const [promptText, setPromptText] = useState('写一个关于AI的文章');
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(mockModels[0]);
  const [messageRole, setMessageRole] = useState<MessageRole>('user');
  const [systemPrompt, setSystemPrompt] = useState('你是一个专业的写作助手，请用简洁明了的语言回答问题。');

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>UI组件演示</Title>
      
      <Divider />
      
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Title level={3}>1. 提示词编辑器 (PromptEditor)</Title>
          <PromptEditor
            value={promptText}
            onChange={setPromptText}
            messageRole={messageRole}
            systemPrompt={systemPrompt}
            showCharacterCount={true}
            showTokenEstimate={true}
          />
        </Col>

        <Col span={12}>
          <Title level={3}>2. 模型选择器 (ModelSelector)</Title>
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            showModelInfo={true}
          />
        </Col>

        <Col span={12}>
          <Title level={3}>3. 角色设置 (RoleSettings)</Title>
          <RoleSettings
            messageRole={messageRole}
            systemPrompt={systemPrompt}
            onRoleChange={setMessageRole}
            onSystemPromptChange={setSystemPrompt}
            showSystemPrompt={true}
          />
        </Col>

        <Col span={24}>
          <Title level={3}>4. 优化结果 (OptimizationResult)</Title>
          <OptimizationResult
            result={mockOptimizationResult}
            onCopyOriginal={() => navigator.clipboard.writeText(mockOptimizationResult.originalPrompt)}
            onCopyOptimized={() => navigator.clipboard.writeText(mockOptimizationResult.optimizedPrompt)}
            onSaveResult={() => console.log('保存结果')}
            onExportResult={() => console.log('导出结果')}
            showComparison={true}
            showSuggestions={true}
            showStatistics={true}
          />
        </Col>
      </Row>
    </div>
  );
};

export default ComponentsDemo;