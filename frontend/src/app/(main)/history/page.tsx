'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Button, Space } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { HistoryList, HistoryDetail } from '../../../components/ui';
import { useAppStore } from '../../../store/useAppStore';
import { Prompt } from '../../../store/types';
import '../../../styles/history.css';

const { Title } = Typography;

const HistoryPage: React.FC = () => {
  const { prompts, loadHistory, setLoading } = useAppStore();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // 页面加载时获取历史记录
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await loadHistory();
      } catch (error) {
        console.error('加载历史记录失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [loadHistory, setLoading]);

  // 加载历史记录
  const handleLoadHistory = async () => {
    try {
      setLoading(true);
      await loadHistory();
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 查看详情
  const handleViewDetail = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setDetailVisible(true);
  };

  // 关闭详情
  const handleCloseDetail = () => {
    setDetailVisible(false);
    setSelectedPrompt(null);
  };

  // 编辑提示词
  const handleEditPrompt = (prompt: Prompt) => {
    // TODO: 导航到优化页面并预填充数据
    console.log('编辑提示词:', prompt);
    handleCloseDetail();
  };

  return (
    <div className="history-page">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-6">
        <Title level={2} className="mb-0">
          历史记录
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleLoadHistory}
            loading={prompts.isOptimizing}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              // TODO: 导航到优化页面
              console.log('创建新的优化任务');
            }}
          >
            新建优化
          </Button>
        </Space>
      </div>

      {/* 历史记录列表 */}
      <HistoryList onViewDetail={handleViewDetail} />

      {/* 详情弹窗 */}
      <HistoryDetail
        prompt={selectedPrompt}
        visible={detailVisible}
        onClose={handleCloseDetail}
        onEdit={handleEditPrompt}
      />
    </div>
  );
};

export default HistoryPage;
