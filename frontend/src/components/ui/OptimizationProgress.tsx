'use client';

import React from 'react';
import { Card, Progress, Space, Typography, Button, Steps, Spin } from 'antd';
import { 
  StopOutlined, 
  LoadingOutlined,
  SearchOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  BgColorsOutlined
} from '@ant-design/icons';
import { OptimizationProgress as ProgressType } from '@/store/types';

const { Text } = Typography;
const { Step } = Steps;

interface OptimizationProgressProps {
  progress: ProgressType | null;
  isOptimizing: boolean;
  onStop?: () => void;
}

const OptimizationProgress: React.FC<OptimizationProgressProps> = ({
  progress,
  isOptimizing,
  onStop,
}) => {
  if (!isOptimizing && !progress) return null;

  // 步骤配置
  const steps = [
    {
      key: 'analyzing',
      title: '分析阶段',
      description: '分析提示词结构',
      icon: <SearchOutlined />,
    },
    {
      key: 'optimizing',
      title: '优化阶段',
      description: '应用优化规则',
      icon: <ToolOutlined />,
    },
    {
      key: 'validating',
      title: '验证阶段',
      description: '验证优化效果',
      icon: <CheckCircleOutlined />,
    },
    {
      key: 'formatting',
      title: '格式化',
      description: '格式化输出结果',
      icon: <BgColorsOutlined />,
    },
  ];

  // 获取当前步骤索引
  const getCurrentStepIndex = () => {
    if (!progress) return 0;
    return steps.findIndex(step => step.key === progress.stage);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <Card
      size="small"
      title={
        <Space>
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} 
            spinning={isOptimizing}
          />
          <Text strong>正在优化提示词</Text>
          {progress && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {progress.currentStep}
            </Text>
          )}
        </Space>
      }
      extra={
        <Button 
          size="small" 
          danger 
          icon={<StopOutlined />}
          onClick={onStop}
          disabled={!isOptimizing}
        >
          停止
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 总体进度条 */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: '13px' }}>
                {progress?.message || '准备开始优化...'}
              </Text>
              <Text style={{ fontSize: '12px', color: '#666' }}>
                {progress?.percentage || 0}%
              </Text>
            </Space>
          </div>
          <Progress 
            percent={progress?.percentage || 0}
            size="small"
            status={isOptimizing ? 'active' : 'success'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>

        {/* 步骤指示器 */}
        <Steps
          current={currentStepIndex}
          size="small"
          direction="horizontal"
          items={steps.map((step, index) => ({
            title: step.title,
            description: step.description,
            icon: index === currentStepIndex && isOptimizing ? 
              <LoadingOutlined /> : step.icon,
            status: index < currentStepIndex ? 'finish' : 
                   index === currentStepIndex ? 'process' : 'wait',
          }))}
        />

        {/* 详细信息 */}
        {progress && (
          <div
            style={{
              background: '#f5f5f5',
              padding: '8px 12px',
              borderRadius: 4,
              fontSize: '12px',
              color: '#666',
            }}
          >
            <Space>
              <Text strong>当前阶段:</Text>
              <Text>{steps[currentStepIndex]?.title}</Text>
              <Text type="secondary">|</Text>
              <Text>{progress.message}</Text>
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default OptimizationProgress;