'use client';

import React from 'react';
import {
  Modal,
  Card,
  Typography,
  Tag,
  Space,
  Divider,
  Row,
  Col,
  Statistic,
  Timeline,
  Button,
  Tooltip,
  message,
} from 'antd';
import {
  RobotOutlined,
  CalendarOutlined,
  EditOutlined,
  CopyOutlined,
  DownloadOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Prompt, Improvement, OptimizationRule } from '../../store/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface HistoryDetailProps {
  prompt: Prompt | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: (prompt: Prompt) => void;
}

const HistoryDetail: React.FC<HistoryDetailProps> = ({
  prompt,
  visible,
  onClose,
  onEdit,
}) => {
  if (!prompt) return null;

  // 复制文本到剪贴板
  const handleCopyText = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${type}已复制到剪贴板`);
    } catch (error) {
      message.error('复制失败');
    }
  };

  // 导出单个提示词
  const handleExportPrompt = () => {
    const exportData = {
      id: prompt.id,
      originalText: prompt.originalText,
      optimizedText: prompt.optimizedText,
      targetModel: prompt.targetModel,
      messageRole: prompt.messageRole,
      systemPrompt: prompt.systemPrompt,
      optimizationRules: prompt.optimizationRules,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-${prompt.id}-${dayjs(prompt.createdAt).format('YYYY-MM-DD')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    message.success('导出成功');
  };

  // 获取模型标签颜色
  const getModelTagColor = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'green';
      case 'anthropic':
        return 'blue';
      case 'deepseek':
        return 'purple';
      default:
        return 'default';
    }
  };

  // 获取改进影响等级颜色
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      case 'low':
        return 'green';
      default:
        return 'default';
    }
  };

  // 获取改进影响等级文本
  const getImpactText = (impact: string) => {
    switch (impact) {
      case 'high':
        return '高影响';
      case 'medium':
        return '中等影响';
      case 'low':
        return '低影响';
      default:
        return '未知';
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RobotOutlined className="text-blue-500" />
            <span>提示词详情</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit?.(prompt)}
              size="small"
            >
              编辑
            </Button>
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleExportPrompt}
              size="small"
            >
              导出
            </Button>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      className="history-detail-modal"
    >
      <div className="space-y-6">
        {/* 基本信息 */}
        <Card title="基本信息" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <div className="mb-3">
                <Text strong>目标模型：</Text>
                <div className="mt-1">
                  <Tag color={getModelTagColor(prompt.targetModel.provider)}>
                    {prompt.targetModel.name}
                  </Tag>
                  <Tag color="default">{prompt.targetModel.version}</Tag>
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div className="mb-3">
                <Text strong>消息角色：</Text>
                <div className="mt-1">
                  <Tag color="blue">{prompt.messageRole}</Tag>
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div className="mb-3">
                <Text strong>创建时间：</Text>
                <div className="mt-1 flex items-center gap-1">
                  <CalendarOutlined className="text-gray-400" />
                  <Text>{dayjs(prompt.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </div>
              </div>
            </Col>
            <Col span={12}>
              <div className="mb-3">
                <Text strong>更新时间：</Text>
                <div className="mt-1 flex items-center gap-1">
                  <CalendarOutlined className="text-gray-400" />
                  <Text>{dayjs(prompt.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 提示词内容对比 */}
        <Card title="提示词内容" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Text strong>原始提示词：</Text>
                  <Tooltip title="复制原始提示词">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyText(prompt.originalText, '原始提示词')}
                    />
                  </Tooltip>
                </div>
                <Card size="small" className="bg-gray-50">
                  <Paragraph className="mb-0 whitespace-pre-wrap">
                    {prompt.originalText}
                  </Paragraph>
                </Card>
              </div>
            </Col>
            <Col span={12}>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Text strong>优化后提示词：</Text>
                  <Tooltip title="复制优化后提示词">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyText(prompt.optimizedText, '优化后提示词')}
                    />
                  </Tooltip>
                </div>
                <Card size="small" className="bg-green-50">
                  <Paragraph className="mb-0 whitespace-pre-wrap">
                    {prompt.optimizedText}
                  </Paragraph>
                </Card>
              </div>
            </Col>
          </Row>

          {prompt.systemPrompt && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Text strong>系统提示词：</Text>
                <Tooltip title="复制系统提示词">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyText(prompt.systemPrompt!, '系统提示词')}
                  />
                </Tooltip>
              </div>
              <Card size="small" className="bg-blue-50">
                <Paragraph className="mb-0 whitespace-pre-wrap">
                  {prompt.systemPrompt}
                </Paragraph>
              </Card>
            </div>
          )}
        </Card>

        {/* 优化规则 */}
        <Card title="应用的优化规则" size="small">
          {prompt.optimizationRules.length > 0 ? (
            <div className="space-y-3">
              {prompt.optimizationRules.map((rule, index) => (
                <Card key={rule.id} size="small" className="bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Text strong>{rule.name}</Text>
                        <Tag color="blue">{rule.category}</Tag>
                        <Tag color="default">优先级: {rule.priority}</Tag>
                      </div>
                      <Text className="text-gray-600">{rule.description}</Text>
                    </div>
                    <div className="ml-4">
                      <Tag color={rule.isActive ? 'green' : 'red'}>
                        {rule.isActive ? '已启用' : '已禁用'}
                      </Tag>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Text className="text-gray-500">未应用任何优化规则</Text>
          )}
        </Card>

        {/* 统计信息 */}
        <Card title="统计信息" size="small">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="原始字符数"
                value={prompt.originalText.length}
                suffix="字符"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="优化后字符数"
                value={prompt.optimizedText.length}
                suffix="字符"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="字符变化"
                value={prompt.optimizedText.length - prompt.originalText.length}
                suffix="字符"
                valueStyle={{
                  color: prompt.optimizedText.length > prompt.originalText.length ? '#cf1322' : '#3f8600'
                }}
                prefix={prompt.optimizedText.length > prompt.originalText.length ? '+' : ''}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="优化规则数"
                value={prompt.optimizationRules.length}
                suffix="个"
              />
            </Col>
          </Row>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>
            关闭
          </Button>
          <Button type="primary" onClick={() => onEdit?.(prompt)}>
            编辑此提示词
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default HistoryDetail;