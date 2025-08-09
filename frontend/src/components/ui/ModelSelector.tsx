'use client';

import React, { useState, useEffect } from 'react';
import { Select, Card, Space, Tag, Tooltip, Spin, Alert, Typography } from 'antd';
import { 
  RobotOutlined, 
  ThunderboltOutlined, 
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import { AIModel } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';

const { Text } = Typography;
const { Option } = Select;

interface ModelSelectorProps {
  value?: AIModel | null;
  onChange?: (model: AIModel | null) => void;
  disabled?: boolean;
  showModelInfo?: boolean;
  size?: 'small' | 'middle' | 'large';
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showModelInfo = true,
  size = 'middle',
}) => {
  const { models, loadAvailableModels } = useAppStore();
  const { available: availableModels, isLoading } = models;
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(value || null);

  // 加载可用模型
  useEffect(() => {
    if (availableModels.length === 0 && !isLoading) {
      loadAvailableModels();
    }
  }, [availableModels.length, isLoading, loadAvailableModels]);

  // 同步外部value变化
  useEffect(() => {
    setSelectedModel(value || null);
  }, [value]);

  // 处理模型选择变化
  const handleModelChange = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId) || null;
    setSelectedModel(model);
    onChange?.(model);
  };

  // 获取提供商图标和颜色
  const getProviderConfig = (provider: string) => {
    const configs = {
      openai: { color: '#10a37f', name: 'OpenAI' },
      anthropic: { color: '#d97706', name: 'Anthropic' },
      deepseek: { color: '#1890ff', name: 'DeepSeek' },
    };
    return configs[provider as keyof typeof configs] || { color: '#666', name: provider };
  };

  // 渲染模型选项
  const renderModelOption = (model: AIModel) => {
    const providerConfig = getProviderConfig(model.provider);
    
    return (
      <Option key={model.id} value={model.id}>
        <Space>
          <RobotOutlined style={{ color: providerConfig.color }} />
          <span>{model.name}</span>
          <Tag color={providerConfig.color}>
            {providerConfig.name}
          </Tag>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {model.maxTokens.toLocaleString()} tokens
          </Text>
        </Space>
      </Option>
    );
  };

  // 渲染模型详细信息
  const renderModelInfo = () => {
    if (!showModelInfo || !selectedModel) return null;

    const providerConfig = getProviderConfig(selectedModel.provider);

    return (
      <div
        style={{
          marginTop: 12,
          padding: '12px 16px',
          background: '#fafafa',
          borderRadius: 6,
          border: '1px solid #f0f0f0',
        }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            <Text strong style={{ fontSize: '13px' }}>
              模型信息:
            </Text>
            <Tag color={providerConfig.color}>
              {providerConfig.name}
            </Tag>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              版本: {selectedModel.version}
            </Text>
          </Space>

          <Space wrap>
            <Tooltip title="最大token限制">
              <Tag icon={<ThunderboltOutlined />} color="blue">
                {selectedModel.maxTokens.toLocaleString()} tokens
              </Tag>
            </Tooltip>
            
            <Tooltip title="支持的消息角色">
              <Tag icon={<CheckCircleOutlined />} color="green">
                角色: {selectedModel.supportedRoles.join(', ')}
              </Tag>
            </Tooltip>

            <Tooltip title="优化规则数量">
              <Tag icon={<InfoCircleOutlined />} color="orange">
                {selectedModel.optimizationRules.length} 条规则
              </Tag>
            </Tooltip>
          </Space>

          {selectedModel.optimizationRules.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                主要优化规则:
              </Text>
              <div style={{ marginTop: 4 }}>
                {selectedModel.optimizationRules.slice(0, 3).map(rule => (
                  <Tag key={rule.id} style={{ margin: '2px 4px 2px 0' }}>
                    {rule.name}
                  </Tag>
                ))}
                {selectedModel.optimizationRules.length > 3 && (
                  <Tag color="default">
                    +{selectedModel.optimizationRules.length - 3} 更多
                  </Tag>
                )}
              </div>
            </div>
          )}
        </Space>
      </div>
    );
  };

  // 渲染加载状态
  if (isLoading) {
    return (
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined />
            AI模型选择
          </Space>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="small" />
          <Text type="secondary" style={{ marginLeft: 8 }}>
            正在加载可用模型...
          </Text>
        </div>
      </Card>
    );
  }

  // 渲染错误状态
  if (!isLoading && availableModels.length === 0) {
    return (
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined />
            AI模型选择
          </Space>
        }
      >
        <Alert
          message="暂无可用模型"
          description="请检查网络连接或联系管理员"
          type="warning"
          icon={<ExclamationCircleOutlined />}
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined />
          AI模型选择
          {selectedModel && (
            <Tag color={getProviderConfig(selectedModel.provider).color}>
              {getProviderConfig(selectedModel.provider).name}
            </Tag>
          )}
        </Space>
      }
      styles={{
        header: { paddingBottom: 8 },
        body: { paddingTop: 8 },
      }}
    >
      <Select
        value={selectedModel?.id}
        onChange={handleModelChange}
        placeholder="请选择AI模型"
        style={{ width: '100%' }}
        size={size}
        disabled={disabled}
        showSearch
        optionFilterProp="children"
        filterOption={(input, option) =>
          (option?.children as any)?.toString().toLowerCase().includes(input.toLowerCase())
        }
        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
      >
        {availableModels.map(renderModelOption)}
      </Select>

      {renderModelInfo()}
    </Card>
  );
};

export default ModelSelector;