'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Input, Card, Typography, Space, Tag, Tooltip } from 'antd';
import { FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { MessageRole } from '@/store/types';

const { TextArea } = Input;
const { Text } = Typography;

interface PromptEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  messageRole?: MessageRole;
  systemPrompt?: string;
  showCharacterCount?: boolean;
  showTokenEstimate?: boolean;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
}

interface CharacterStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  estimatedTokens: number;
}

const PromptEditor: React.FC<PromptEditorProps> = ({
  value = '',
  onChange,
  placeholder = '请输入您的提示词...',
  maxLength = 4000,
  disabled = false,
  messageRole = 'user',
  systemPrompt,
  showCharacterCount = true,
  showTokenEstimate = true,
  autoSize = { minRows: 6, maxRows: 20 },
}) => {
  const [stats, setStats] = useState<CharacterStats>({
    characters: 0,
    charactersNoSpaces: 0,
    words: 0,
    lines: 0,
    estimatedTokens: 0,
  });

  // 计算文本统计信息
  const calculateStats = useCallback((text: string): CharacterStats => {
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    
    // 简单的token估算：平均每4个字符约等于1个token（英文），中文约2-3个字符1个token
    const estimatedTokens = Math.ceil(
      text.replace(/[\u4e00-\u9fa5]/g, 'xx').length / 3.5
    );

    return {
      characters,
      charactersNoSpaces,
      words,
      lines,
      estimatedTokens,
    };
  }, []);

  // 更新统计信息
  useEffect(() => {
    const newStats = calculateStats(value);
    setStats(newStats);
  }, [value, calculateStats]);

  // 处理文本变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);
  };

  // 获取字符计数的颜色
  const getCountColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 0.9) return '#ff4d4f';
    if (ratio >= 0.8) return '#faad14';
    return '#52c41a';
  };

  // 渲染消息角色标签
  const renderRoleTag = () => {
    const roleConfig = {
      system: { color: 'blue', text: '系统' },
      user: { color: 'green', text: '用户' },
      assistant: { color: 'orange', text: '助手' },
    };

    const config = roleConfig[messageRole];
    return (
      <Tag color={config.color} icon={<FileTextOutlined />}>
        {config.text}消息
      </Tag>
    );
  };

  // 渲染统计信息
  const renderStats = () => {
    if (!showCharacterCount && !showTokenEstimate) return null;

    return (
      <Space size="middle" style={{ fontSize: '12px', color: '#666' }}>
        {showCharacterCount && (
          <>
            <Text
              style={{
                color: getCountColor(stats.characters, maxLength),
                fontWeight: 500,
              }}
            >
              {stats.characters}/{maxLength}
            </Text>
            <Text type="secondary">
              字符: {stats.charactersNoSpaces} | 单词: {stats.words} | 行数: {stats.lines}
            </Text>
          </>
        )}
        {showTokenEstimate && (
          <Tooltip title="基于平均字符长度的粗略估算，实际token数可能有所不同">
            <Text type="secondary">
              <InfoCircleOutlined style={{ marginRight: 4 }} />
              预估Token: ~{stats.estimatedTokens}
            </Text>
          </Tooltip>
        )}
      </Space>
    );
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <FileTextOutlined />
          提示词编辑器
          {renderRoleTag()}
        </Space>
      }
      extra={renderStats()}
      styles={{
        header: { paddingBottom: 8 },
        body: { paddingTop: 8 },
      }}
    >
      {systemPrompt && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            系统提示词:
          </Text>
          <div
            style={{
              background: '#f5f5f5',
              padding: '8px 12px',
              borderRadius: 6,
              marginTop: 4,
              fontSize: '13px',
              color: '#666',
              border: '1px solid #d9d9d9',
            }}
          >
            {systemPrompt}
          </div>
        </div>
      )}
      
      <TextArea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoSize={autoSize}
        showCount={false} // 我们使用自定义的计数显示
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          resize: 'none',
        }}
      />
    </Card>
  );
};

export default PromptEditor;