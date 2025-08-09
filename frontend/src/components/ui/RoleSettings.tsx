'use client';

import React, { useState, useEffect } from 'react';
import { Card, Radio, Input, Space, Typography, Tooltip, Alert, Divider } from 'antd';
import { 
  UserOutlined, 
  RobotOutlined, 
  SettingOutlined,
  InfoCircleOutlined,
  MessageOutlined 
} from '@ant-design/icons';
import { MessageRole } from '@/store/types';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface RoleSettingsProps {
  messageRole?: MessageRole;
  systemPrompt?: string;
  onRoleChange?: (role: MessageRole) => void;
  onSystemPromptChange?: (systemPrompt: string) => void;
  disabled?: boolean;
  showSystemPrompt?: boolean;
  maxSystemPromptLength?: number;
}

interface RoleConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  example: string;
}

const RoleSettings: React.FC<RoleSettingsProps> = ({
  messageRole = 'user',
  systemPrompt = '',
  onRoleChange,
  onSystemPromptChange,
  disabled = false,
  showSystemPrompt = true,
  maxSystemPromptLength = 2000,
}) => {
  const [selectedRole, setSelectedRole] = useState<MessageRole>(messageRole);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState(systemPrompt);

  // 角色配置
  const roleConfigs: Record<MessageRole, RoleConfig> = {
    system: {
      label: '系统',
      description: '设置AI的行为规则、角色定位和回答风格',
      icon: <SettingOutlined />,
      color: '#1890ff',
      example: '你是一个专业的写作助手，请用简洁明了的语言回答问题。',
    },
    user: {
      label: '用户',
      description: '用户向AI提出的问题或请求',
      icon: <UserOutlined />,
      color: '#52c41a',
      example: '请帮我写一份关于人工智能的简介。',
    },
    assistant: {
      label: '助手',
      description: 'AI助手的回复内容，通常用于多轮对话',
      icon: <RobotOutlined />,
      color: '#faad14',
      example: '我很乐意帮您写一份人工智能的简介...',
    },
  };

  // 同步外部props变化
  useEffect(() => {
    setSelectedRole(messageRole);
  }, [messageRole]);

  useEffect(() => {
    setCurrentSystemPrompt(systemPrompt);
  }, [systemPrompt]);

  // 处理角色变化
  const handleRoleChange = (e: any) => {
    const newRole = e.target.value as MessageRole;
    setSelectedRole(newRole);
    onRoleChange?.(newRole);
  };

  // 处理系统提示词变化
  const handleSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCurrentSystemPrompt(newValue);
    onSystemPromptChange?.(newValue);
  };

  // 渲染角色选项
  const renderRoleOption = (role: MessageRole) => {
    const config = roleConfigs[role];
    return (
      <Radio.Button
        key={role}
        value={role}
        style={{
          height: 'auto',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Space direction="vertical" size={2} style={{ textAlign: 'left' }}>
          <Space>
            <span style={{ color: config.color }}>{config.icon}</span>
            <Text strong>{config.label}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>
            {config.description}
          </Text>
        </Space>
      </Radio.Button>
    );
  };

  // 渲染角色示例
  const renderRoleExample = () => {
    const config = roleConfigs[selectedRole];
    return (
      <Alert
        message={
          <Space>
            <span style={{ color: config.color }}>{config.icon}</span>
            <Text strong>{config.label}消息示例</Text>
          </Space>
        }
        description={
          <Text style={{ fontSize: '13px', fontStyle: 'italic' }}>
            &ldquo;{config.example}&rdquo;
          </Text>
        }
        type="info"
        showIcon={false}
        style={{ marginTop: 12 }}
      />
    );
  };

  // 渲染系统提示词编辑器
  const renderSystemPromptEditor = () => {
    if (!showSystemPrompt) return null;

    return (
      <>
        <Divider style={{ margin: '16px 0 12px 0' }} />
        <div>
          <Space style={{ marginBottom: 8 }}>
            <SettingOutlined style={{ color: '#1890ff' }} />
            <Text strong>系统提示词设置</Text>
            <Tooltip title="系统提示词用于设置AI的行为规则和回答风格，对所有消息都有效">
              <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
            </Tooltip>
          </Space>
          
          <TextArea
            value={currentSystemPrompt}
            onChange={handleSystemPromptChange}
            placeholder="请输入系统提示词，用于设置AI的行为规则和回答风格..."
            maxLength={maxSystemPromptLength}
            disabled={disabled}
            autoSize={{ minRows: 3, maxRows: 8 }}
            showCount
            style={{
              fontSize: '13px',
              lineHeight: '1.5',
            }}
          />
          
          {currentSystemPrompt && (
            <div style={{ marginTop: 8 }}>
              <Alert
                message="系统提示词预览"
                description={
                  <div
                    style={{
                      background: '#f5f5f5',
                      padding: '8px 12px',
                      borderRadius: 4,
                      marginTop: 8,
                      fontSize: '12px',
                      color: '#666',
                      fontFamily: 'monospace',
                    }}
                  >
                    {currentSystemPrompt}
                  </div>
                }
                type="success"
                showIcon={false}
              />
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <MessageOutlined />
          消息角色配置
          <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'normal' }}>
            当前: {roleConfigs[selectedRole].label}
          </Text>
        </Space>
      }
      styles={{
        header: { paddingBottom: 8 },
        body: { paddingTop: 8 },
      }}
    >
      <div>
        <Text strong style={{ fontSize: '13px', marginBottom: 8, display: 'block' }}>
          选择消息角色:
        </Text>
        
        <Radio.Group
          value={selectedRole}
          onChange={handleRoleChange}
          disabled={disabled}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {(Object.keys(roleConfigs) as MessageRole[]).map(renderRoleOption)}
          </Space>
        </Radio.Group>

        {renderRoleExample()}
        {renderSystemPromptEditor()}
      </div>
    </Card>
  );
};

export default RoleSettings;