'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Button, Typography } from 'antd';
import {
  BulbOutlined,
  HistoryOutlined,
  RocketOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const router = useRouter();

  const handleStartOptimization = () => {
    router.push('/optimize');
  };

  const handleViewHistory = () => {
    router.push('/history');
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={1}>
          <BulbOutlined style={{ color: '#1890ff', marginRight: 16 }} />
          AI提示词优化工具
        </Title>
        <Paragraph style={{ fontSize: 18, color: '#666' }}>
          智能优化您的AI提示词，提升AI交互效果，支持多种主流AI模型
        </Paragraph>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="支持模型"
              value={3}
              prefix={<RocketOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="优化规则"
              value={25}
              prefix={<StarOutlined />}
              suffix="+"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="历史记录"
              value={0}
              prefix={<HistoryOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="优化成功率"
              value={95}
              prefix={<BulbOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card
            title="开始优化"
            extra={<BulbOutlined />}
            actions={[
              <Button
                type="primary"
                size="large"
                onClick={handleStartOptimization}
                key="optimize"
              >
                立即开始
              </Button>,
            ]}
          >
            <Paragraph>
              输入您的提示词，选择目标AI模型，获得专业的优化建议和改进后的提示词。
            </Paragraph>
            <ul>
              <li>支持OpenAI、Claude、DeepSeek等主流模型</li>
              <li>基于最佳实践的智能优化</li>
              <li>实时优化进度显示</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="历史记录"
            extra={<HistoryOutlined />}
            actions={[
              <Button size="large" onClick={handleViewHistory} key="history">
                查看历史
              </Button>,
            ]}
          >
            <Paragraph>
              查看和管理您的提示词优化历史，重用之前的优化结果。
            </Paragraph>
            <ul>
              <li>完整的优化历史记录</li>
              <li>对比原始和优化后的提示词</li>
              <li>导出和分享功能</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;
