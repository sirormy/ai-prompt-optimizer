'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Tabs, 
  Space, 
  Typography, 
  Tag, 
  Button, 
  Tooltip, 
  Progress, 
  Alert,
  Collapse,
  List,
  Statistic,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  CheckCircleOutlined,
  TrophyOutlined,
  BulbOutlined,
  BarChartOutlined,
  CopyOutlined,
  DownloadOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  DollarOutlined
} from '@ant-design/icons';
import ReactDiffViewer from 'react-diff-viewer';
import type { OptimizationResult as OptimizationResultType, Improvement, Suggestion } from '@/store/types';

const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface OptimizationResultProps {
  result: OptimizationResultType | null;
  isLoading?: boolean;
  onCopyOriginal?: () => void;
  onCopyOptimized?: () => void;
  onSaveResult?: () => void;
  onExportResult?: () => void;
  showComparison?: boolean;
  showSuggestions?: boolean;
  showStatistics?: boolean;
}

const OptimizationResult: React.FC<OptimizationResultProps> = ({
  result,
  isLoading = false,
  onCopyOriginal,
  onCopyOptimized,
  onSaveResult,
  onExportResult,
  showComparison = true,
  showSuggestions = true,
  showStatistics = true,
}) => {
  const [activeTab, setActiveTab] = useState('comparison');

  // 如果没有结果且不在加载中，显示空状态
  if (!result && !isLoading) {
    return (
      <Card
        title={
          <Space>
            <TrophyOutlined />
            优化结果
          </Space>
        }
      >
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <TrophyOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <Text type="secondary">暂无优化结果</Text>
        </div>
      </Card>
    );
  }

  // 加载状态
  if (isLoading) {
    return (
      <Card
        title={
          <Space>
            <TrophyOutlined />
            优化结果
          </Space>
        }
      >
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Progress type="circle" percent={75} size={80} />
          <div style={{ marginTop: 16 }}>
            <Text>正在生成优化结果...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!result) return null;

  // 获取改进类型的颜色和图标
  const getImprovementConfig = (type: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      structure: { color: 'blue', icon: <BarChartOutlined /> },
      clarity: { color: 'green', icon: <BulbOutlined /> },
      specificity: { color: 'orange', icon: <InfoCircleOutlined /> },
      context: { color: 'purple', icon: <SwapOutlined /> },
      efficiency: { color: 'red', icon: <ThunderboltOutlined /> },
    };
    return configs[type] || { color: 'default', icon: <CheckCircleOutlined /> };
  };

  // 获取影响程度的颜色
  const getImpactColor = (impact: string) => {
    const colors = {
      low: '#52c41a',
      medium: '#faad14',
      high: '#ff4d4f',
    };
    return colors[impact as keyof typeof colors] || '#d9d9d9';
  };

  // 渲染对比视图
  const renderComparison = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            type="primary" 
            icon={<CopyOutlined />} 
            size="small"
            onClick={onCopyOptimized}
          >
            复制优化后
          </Button>
          <Button 
            icon={<CopyOutlined />} 
            size="small"
            onClick={onCopyOriginal}
          >
            复制原始
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            size="small"
            onClick={onExportResult}
          >
            导出结果
          </Button>
        </Space>
      </div>
      
      <ReactDiffViewer
        oldValue={result.originalPrompt}
        newValue={result.optimizedPrompt}
        splitView={true}
        leftTitle="原始提示词"
        rightTitle="优化后提示词"
        showDiffOnly={false}
        hideLineNumbers={false}
        styles={{
          variables: {
            light: {
              codeFoldGutterBackground: '#f7f7f7',
              codeFoldBackground: '#f1f8ff',
            },
          },
          diffContainer: {
            fontSize: '13px',
            lineHeight: '1.5',
          },
        }}
      />
    </div>
  );

  // 渲染改进详情
  const renderImprovements = () => (
    <List
      dataSource={result.improvements}
      renderItem={(improvement: Improvement, index) => {
        const config = getImprovementConfig(improvement.type);
        return (
          <List.Item>
            <Card size="small" style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <span style={{ color: config.color }}>{config.icon}</span>
                  <Text strong>{improvement.type}</Text>
                  <Tag 
                    color={getImpactColor(improvement.impact)}
                    style={{ marginLeft: 'auto' }}
                  >
                    {improvement.impact === 'low' ? '轻微' : 
                     improvement.impact === 'medium' ? '中等' : '重要'}影响
                  </Tag>
                </Space>
                
                <Text>{improvement.description}</Text>
                
                {improvement.before && improvement.after && (
                  <Collapse size="small">
                    <Panel header="查看具体变化" key="1">
                      <div style={{ fontSize: '12px' }}>
                        <Text type="secondary">修改前:</Text>
                        <div style={{ 
                          background: '#fff2f0', 
                          padding: 8, 
                          borderRadius: 4, 
                          margin: '4px 0',
                          border: '1px solid #ffccc7'
                        }}>
                          {improvement.before}
                        </div>
                        <Text type="secondary">修改后:</Text>
                        <div style={{ 
                          background: '#f6ffed', 
                          padding: 8, 
                          borderRadius: 4, 
                          margin: '4px 0',
                          border: '1px solid #b7eb8f'
                        }}>
                          {improvement.after}
                        </div>
                      </div>
                    </Panel>
                  </Collapse>
                )}
              </Space>
            </Card>
          </List.Item>
        );
      }}
    />
  );

  // 渲染建议
  const renderSuggestions = () => (
    <List
      dataSource={result.suggestions}
      renderItem={(suggestion: Suggestion) => (
        <List.Item>
          <Card size="small" style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <BulbOutlined style={{ color: '#faad14' }} />
                <Text strong>{suggestion.title}</Text>
                <Tag color="blue">优先级: {suggestion.priority}</Tag>
              </Space>
              
              <Text>{suggestion.description}</Text>
              
              {suggestion.example && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>示例:</Text>
                  <div style={{ 
                    background: '#f0f2f5', 
                    padding: 8, 
                    borderRadius: 4, 
                    marginTop: 4,
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>
                    {suggestion.example}
                  </div>
                </div>
              )}
            </Space>
          </Card>
        </List.Item>
      )}
    />
  );

  // 渲染统计信息
  const renderStatistics = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic
            title="优化信心度"
            value={result.confidence}
            precision={1}
            suffix="%"
            valueStyle={{ color: result.confidence >= 80 ? '#3f8600' : '#cf1322' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="应用规则数"
            value={result.appliedRules.length}
            suffix="条"
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="改进项目"
            value={result.improvements.length}
            suffix="项"
            prefix={<TrophyOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="优化建议"
            value={result.suggestions.length}
            suffix="条"
            prefix={<BulbOutlined />}
          />
        </Col>
      </Row>

      <Divider />

      <Title level={5}>
        <ThunderboltOutlined /> Token使用统计
      </Title>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic
            title="原始Token数"
            value={result.estimatedTokens.original}
            suffix="个"
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="优化后Token数"
            value={result.estimatedTokens.optimized}
            suffix="个"
            valueStyle={{ 
              color: result.estimatedTokens.optimized < result.estimatedTokens.original ? '#3f8600' : '#cf1322' 
            }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Token节省"
            value={result.estimatedTokens.savings}
            suffix="个"
            valueStyle={{ color: result.estimatedTokens.savings > 0 ? '#3f8600' : '#cf1322' }}
            prefix={result.estimatedTokens.savings > 0 ? '+' : ''}
          />
        </Col>
      </Row>

      {result.estimatedTokens.cost && (
        <>
          <Divider />
          <Title level={5}>
            <DollarOutlined /> 成本估算
          </Title>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="原始成本"
                value={result.estimatedTokens.cost.original}
                precision={4}
                prefix="$"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="优化后成本"
                value={result.estimatedTokens.cost.optimized}
                precision={4}
                prefix="$"
                valueStyle={{ 
                  color: result.estimatedTokens.cost.optimized < result.estimatedTokens.cost.original ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="成本节省"
                value={result.estimatedTokens.cost.original - result.estimatedTokens.cost.optimized}
                precision={4}
                prefix="$"
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
          </Row>
        </>
      )}

      <Divider />

      <Title level={5}>应用的优化规则</Title>
      <Space wrap>
        {result.appliedRules.map(rule => (
          <Tooltip key={rule.id} title={rule.description}>
            <Tag color="blue" style={{ marginBottom: 8 }}>
              {rule.name}
            </Tag>
          </Tooltip>
        ))}
      </Space>
    </div>
  );

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined />
          优化结果
          <Tag color="green">
            信心度: {result.confidence.toFixed(1)}%
          </Tag>
        </Space>
      }
      extra={
        <Space>
          <Button type="primary" onClick={onSaveResult}>
            保存结果
          </Button>
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {showComparison && (
          <TabPane 
            tab={
              <Space>
                <SwapOutlined />
                对比视图
              </Space>
            } 
            key="comparison"
          >
            {renderComparison()}
          </TabPane>
        )}
        
        <TabPane 
          tab={
            <Space>
              <CheckCircleOutlined />
              改进详情 ({result.improvements.length})
            </Space>
          } 
          key="improvements"
        >
          {renderImprovements()}
        </TabPane>

        {showSuggestions && (
          <TabPane 
            tab={
              <Space>
                <BulbOutlined />
                优化建议 ({result.suggestions.length})
              </Space>
            } 
            key="suggestions"
          >
            {renderSuggestions()}
          </TabPane>
        )}

        {showStatistics && (
          <TabPane 
            tab={
              <Space>
                <BarChartOutlined />
                统计信息
              </Space>
            } 
            key="statistics"
          >
            {renderStatistics()}
          </TabPane>
        )}
      </Tabs>
    </Card>
  );
};

export default OptimizationResult;