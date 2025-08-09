'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Row, 
  Col, 
  Button, 
  Space, 
  Typography, 
  message, 
  Card,
  Progress,
  Alert,
  Spin,
  Badge
} from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  ReloadOutlined,
  SaveOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import { AIModel, MessageRole, OptimizationRequest, OptimizationProgress } from '@/store/types';
import { validatePromptInput, getPromptQualityScore, ValidationResult } from '@/utils/validation';
import { useOptimizationSSE } from '@/hooks/useSSE';
import PromptEditor from '@/components/ui/PromptEditor';
import ModelSelector from '@/components/ui/ModelSelector';
import RoleSettings from '@/components/ui/RoleSettings';
import OptimizationResult from '@/components/ui/OptimizationResult';
import OptimizationProgressComponent from '@/components/ui/OptimizationProgress';

const { Title, Text } = Typography;

const OptimizePage: React.FC = () => {
  // 状态管理
  const {
    prompts,
    ui,
    user,
    setCurrentPrompt,
    setOptimizing,
    setOptimizationProgress,
    setOptimizationResult,
    clearOptimizationState,
    setSelectedModel,
    optimizePrompt,
    optimizePromptWithSSE,
    savePrompt,
    loadAvailableModels
  } = useAppStore();

  // SSE Hook
  const { connect: connectSSE, disconnect: disconnectSSE, isConnected } = useOptimizationSSE();

  // 本地状态
  const [promptText, setPromptText] = useState('');
  const [messageRole, setMessageRole] = useState<MessageRole>('user');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  const [qualityScore, setQualityScore] = useState(0);
  const [useSSE, setUseSSE] = useState(true); // 是否使用SSE

  // 从store获取状态
  const { current, isOptimizing, optimizationProgress, optimizationResult } = prompts;
  const { selectedModel } = ui;
  const { preferences } = user;

  // 初始化
  useEffect(() => {
    loadAvailableModels();
  }, [loadAvailableModels]);

  // 更新验证状态和质量评分
  useEffect(() => {
    const validation = validatePromptInput({
      promptText,
      selectedModel,
      messageRole,
      systemPrompt,
    });
    
    setValidationResult(validation);
    
    // 计算质量评分
    if (promptText.trim()) {
      const { score } = getPromptQualityScore(promptText);
      setQualityScore(score);
    } else {
      setQualityScore(0);
    }
  }, [promptText, selectedModel, messageRole, systemPrompt]);

  // 清理SSE连接
  useEffect(() => {
    return () => {
      disconnectSSE();
    };
  }, [disconnectSSE]);

  // 开始优化
  const handleOptimize = async () => {
    if (!validationResult.isValid) {
      message.error(validationResult.errors[0]);
      return;
    }

    if (!selectedModel) return;

    try {
      clearOptimizationState();
      
      // 创建优化请求
      const request: OptimizationRequest = {
        prompt: promptText,
        targetModel: selectedModel,
        messageRole,
        systemPrompt: systemPrompt || undefined,
        optimizationLevel: preferences.optimizationLevel,
      };
      
      // 根据设置选择优化方式
      if (useSSE) {
        // 确保SSE连接
        if (!isConnected()) {
          await connectSSE();
        }
        await optimizePromptWithSSE(request);
      } else {
        // 使用同步优化
        await optimizePrompt(request);
        message.success('优化完成！');
      }
      
    } catch (error) {
      setOptimizing(false);
      message.error('优化请求失败，请重试');
      console.error('优化错误:', error);
    }
  };

  // 停止优化
  const handleStopOptimization = () => {
    disconnectSSE();
    setOptimizing(false);
    clearOptimizationState();
    message.info('已停止优化');
  };

  // 重新优化
  const handleReoptimize = () => {
    clearOptimizationState();
    handleOptimize();
  };

  // 清空内容
  const handleClear = () => {
    setPromptText('');
    setSystemPrompt('');
    clearOptimizationState();
    message.info('已清空内容');
  };

  // 保存结果
  const handleSaveResult = async () => {
    if (!optimizationResult || !selectedModel) return;
    
    try {
      const prompt = {
        id: `prompt_${Date.now()}`,
        userId: user.profile?.id || 'anonymous',
        originalText: optimizationResult.originalPrompt,
        optimizedText: optimizationResult.optimizedPrompt,
        targetModel: selectedModel,
        messageRole,
        systemPrompt: systemPrompt || undefined,
        optimizationRules: optimizationResult.appliedRules,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await savePrompt(prompt);
      message.success('结果已保存到历史记录');
    } catch (error) {
      message.error('保存失败，请重试');
      console.error('保存错误:', error);
    }
  };

  // 复制文本到剪贴板
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`已复制${type}到剪贴板`);
    } catch (error) {
      message.error('复制失败');
    }
  };



  // 渲染验证信息
  const renderValidationInfo = () => {
    const hasErrors = validationResult.errors.length > 0;
    const hasWarnings = validationResult.warnings.length > 0;
    
    if (!hasErrors && !hasWarnings) {
      return (
        <Alert
          message={
            <Space>
              <CheckCircleOutlined />
              输入验证通过
              <Badge 
                count={`质量评分: ${qualityScore}`} 
                style={{ 
                  backgroundColor: qualityScore >= 80 ? '#52c41a' : qualityScore >= 60 ? '#faad14' : '#ff4d4f' 
                }} 
              />
            </Space>
          }
          type="success"
          showIcon={false}
          style={{ marginBottom: 16 }}
        />
      );
    }

    return (
      <Space direction="vertical" size="small" style={{ width: '100%', marginBottom: 16 }}>
        {hasErrors && (
          <Alert
            message="输入错误"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            icon={<ExclamationCircleOutlined />}
            showIcon
          />
        )}
        
        {hasWarnings && (
          <Alert
            message="优化建议"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            }
            type="warning"
            icon={<WarningOutlined />}
            showIcon
          />
        )}
      </Space>
    );
  };

  return (
    <div style={{ padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>提示词优化</Title>
        <Text type="secondary">
          使用AI技术优化您的提示词，提高与AI模型的交互效果
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：输入区域 */}
        <Col xs={24} lg={12}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* 模型选择 */}
            <ModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={isOptimizing}
            />

            {/* 角色设置 */}
            <RoleSettings
              messageRole={messageRole}
              systemPrompt={systemPrompt}
              onRoleChange={setMessageRole}
              onSystemPromptChange={setSystemPrompt}
              disabled={isOptimizing}
            />

            {/* 提示词编辑器 */}
            <PromptEditor
              value={promptText}
              onChange={setPromptText}
              messageRole={messageRole}
              systemPrompt={systemPrompt}
              disabled={isOptimizing}
              placeholder="请输入您想要优化的提示词..."
              showCharacterCount={true}
              showTokenEstimate={true}
            />

            {/* 验证信息 */}
            {renderValidationInfo()}

            {/* 操作按钮 */}
            <Card size="small">
              <Space wrap>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={handleOptimize}
                  disabled={isOptimizing || !validationResult.isValid}
                  loading={isOptimizing}
                >
                  开始优化
                </Button>
                
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReoptimize}
                  disabled={isOptimizing || !optimizationResult}
                >
                  重新优化
                </Button>
                
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleClear}
                  disabled={isOptimizing}
                >
                  清空内容
                </Button>
                
                {optimizationResult && (
                  <Button
                    icon={<SaveOutlined />}
                    onClick={handleSaveResult}
                    disabled={isOptimizing}
                  >
                    保存结果
                  </Button>
                )}
              </Space>
            </Card>
          </Space>
        </Col>

        {/* 右侧：结果区域 */}
        <Col xs={24} lg={12}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* 优化进度 */}
            <OptimizationProgressComponent
              progress={optimizationProgress}
              isOptimizing={isOptimizing}
              onStop={handleStopOptimization}
            />

            {/* 优化结果 */}
            <OptimizationResult
              result={optimizationResult}
              isLoading={isOptimizing}
              onCopyOriginal={() => optimizationResult && copyToClipboard(optimizationResult.originalPrompt, '原始提示词')}
              onCopyOptimized={() => optimizationResult && copyToClipboard(optimizationResult.optimizedPrompt, '优化后提示词')}
              onSaveResult={handleSaveResult}
              onExportResult={() => {
                if (optimizationResult) {
                  const exportData = {
                    original: optimizationResult.originalPrompt,
                    optimized: optimizationResult.optimizedPrompt,
                    improvements: optimizationResult.improvements,
                    suggestions: optimizationResult.suggestions,
                    model: selectedModel?.name,
                    timestamp: new Date().toISOString(),
                  };
                  
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                    type: 'application/json' 
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `prompt-optimization-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  message.success('结果已导出');
                }
              }}
              showComparison={true}
              showSuggestions={true}
              showStatistics={true}
            />
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default OptimizePage;
