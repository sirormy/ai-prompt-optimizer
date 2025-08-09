'use client';

import React, { useState, useMemo } from 'react';
import {
  List,
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Pagination,
  Modal,
  message,
  Tooltip,
  Popconfirm,
  Empty,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  ExportOutlined,
  EyeOutlined,
  CalendarOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { Prompt } from '../../store/types';
import { useAppStore } from '../../store/useAppStore';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface HistoryListProps {
  onViewDetail?: (prompt: Prompt) => void;
}

interface FilterState {
  searchText: string;
  selectedModel: string | undefined;
  dateRange: [Dayjs, Dayjs] | null;
  sortBy: 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

const HistoryList: React.FC<HistoryListProps> = ({ onViewDetail }) => {
  const { prompts, models, ui, deletePrompt, deletePrompts } = useAppStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    selectedModel: undefined,
    dateRange: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // 过滤和排序历史记录
  const filteredAndSortedHistory = useMemo(() => {
    let filtered = [...prompts.history];

    // 搜索过滤
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        prompt =>
          prompt.originalText.toLowerCase().includes(searchLower) ||
          prompt.optimizedText.toLowerCase().includes(searchLower) ||
          prompt.targetModel.name.toLowerCase().includes(searchLower)
      );
    }

    // 模型过滤
    if (filters.selectedModel) {
      filtered = filtered.filter(prompt => prompt.targetModel.id === filters.selectedModel);
    }

    // 日期范围过滤
    if (filters.dateRange) {
      const [startDate, endDate] = filters.dateRange;
      filtered = filtered.filter(prompt => {
        const promptDate = dayjs(prompt.createdAt);
        return promptDate.isAfter(startDate.startOf('day')) && promptDate.isBefore(endDate.endOf('day'));
      });
    }

    // 排序
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy];
      const bValue = b[filters.sortBy];
      const comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [prompts.history, filters]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedHistory.slice(startIndex, endIndex);
  }, [filteredAndSortedHistory, currentPage, pageSize]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, searchText: value }));
    setCurrentPage(1);
  };

  // 处理模型过滤
  const handleModelFilter = (value: string | undefined) => {
    setFilters(prev => ({ ...prev, selectedModel: value }));
    setCurrentPage(1);
  };

  // 处理日期范围过滤
  const handleDateRangeFilter = (dates: [Dayjs | null, Dayjs | null] | null) => {
    // 确保两个日期都存在才设置过滤器
    const validDateRange = dates && dates[0] && dates[1] ? [dates[0], dates[1]] as [Dayjs, Dayjs] : null;
    setFilters(prev => ({ ...prev, dateRange: validDateRange }));
    setCurrentPage(1);
  };

  // 处理排序
  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-') as [FilterState['sortBy'], FilterState['sortOrder']];
    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
  };

  // 处理选择项目
  const handleSelectItem = (promptId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, promptId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== promptId));
    }
  };

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(paginatedData.map(prompt => prompt.id));
    } else {
      setSelectedItems([]);
    }
  };

  // 处理删除单个项目
  const handleDeleteItem = async (promptId: string) => {
    try {
      await deletePrompt(promptId);
      message.success('删除成功');
      // 如果删除的项目在当前选中列表中，需要移除
      setSelectedItems(prev => prev.filter(id => id !== promptId));
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) {
      message.warning('请选择要删除的项目');
      return;
    }

    try {
      await deletePrompts(selectedItems);
      message.success(`成功删除 ${selectedItems.length} 个项目`);
      setSelectedItems([]);
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // 处理导出
  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    if (selectedItems.length === 0) {
      message.warning('请选择要导出的项目');
      return;
    }

    setIsExporting(true);
    try {
      const selectedPrompts = prompts.history.filter(prompt => selectedItems.includes(prompt.id));
      
      if (format === 'json') {
        const dataStr = JSON.stringify(selectedPrompts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prompt-history-${dayjs().format('YYYY-MM-DD')}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const csvHeader = 'ID,创建时间,目标模型,原始提示词,优化后提示词\n';
        const csvContent = selectedPrompts
          .map(prompt => [
            prompt.id,
            dayjs(prompt.createdAt).format('YYYY-MM-DD HH:mm:ss'),
            prompt.targetModel.name,
            `"${prompt.originalText.replace(/"/g, '""')}"`,
            `"${prompt.optimizedText.replace(/"/g, '""')}"`,
          ].join(','))
          .join('\n');
        
        const dataBlob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prompt-history-${dayjs().format('YYYY-MM-DD')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }

      message.success(`成功导出 ${selectedItems.length} 个项目`);
      setSelectedItems([]);
    } catch (error) {
      message.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  // 清空所有过滤器
  const handleClearFilters = () => {
    setFilters({
      searchText: '',
      selectedModel: undefined,
      dateRange: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setCurrentPage(1);
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

  return (
    <div className="history-list">
      {/* 过滤器和操作栏 */}
      <Card className="mb-4">
        <div className="flex flex-col gap-4">
          {/* 搜索和过滤器 */}
          <div className="flex flex-wrap gap-4 items-center">
            <Search
              placeholder="搜索提示词内容或模型名称..."
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={e => !e.target.value && handleSearch('')}
            />
            
            <Select
              placeholder="选择模型"
              allowClear
              style={{ width: 150 }}
              value={filters.selectedModel}
              onChange={handleModelFilter}
            >
              {models.available.map(model => (
                <Option key={model.id} value={model.id}>
                  {model.name}
                </Option>
              ))}
            </Select>

            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={filters.dateRange}
              onChange={handleDateRangeFilter}
              style={{ width: 250 }}
            />

            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={handleSortChange}
              style={{ width: 150 }}
            >
              <Option value="createdAt-desc">创建时间 ↓</Option>
              <Option value="createdAt-asc">创建时间 ↑</Option>
              <Option value="updatedAt-desc">更新时间 ↓</Option>
              <Option value="updatedAt-asc">更新时间 ↑</Option>
            </Select>

            <Button onClick={handleClearFilters} icon={<FilterOutlined />}>
              清空过滤器
            </Button>
          </div>

          {/* 批量操作 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                onChange={e => handleSelectAll(e.target.checked)}
              />
              <Text>
                已选择 {selectedItems.length} 项
                {filteredAndSortedHistory.length > 0 && (
                  <span className="text-gray-500 ml-2">
                    共 {filteredAndSortedHistory.length} 项
                  </span>
                )}
              </Text>
            </div>

            <Space>
              <Popconfirm
                title="确定要删除选中的项目吗？"
                onConfirm={handleBatchDelete}
                disabled={selectedItems.length === 0}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedItems.length === 0}
                >
                  批量删除
                </Button>
              </Popconfirm>

              <Button.Group>
                <Button
                  icon={<ExportOutlined />}
                  loading={isExporting}
                  disabled={selectedItems.length === 0}
                  onClick={() => handleExport('json')}
                >
                  导出JSON
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  loading={isExporting}
                  disabled={selectedItems.length === 0}
                  onClick={() => handleExport('csv')}
                >
                  导出CSV
                </Button>
              </Button.Group>
            </Space>
          </div>
        </div>
      </Card>

      {/* 历史记录列表 */}
      {ui.isLoading ? (
        <div className="text-center py-8">
          <Spin size="large" />
        </div>
      ) : filteredAndSortedHistory.length === 0 ? (
        <Empty
          description="暂无历史记录"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <>
          <List
            dataSource={paginatedData}
            renderItem={prompt => (
              <List.Item key={prompt.id}>
                <Card
                  className="w-full"
                  hoverable
                  actions={[
                    <Tooltip title="查看详情" key="view">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => onViewDetail?.(prompt)}
                      />
                    </Tooltip>,
                    <Popconfirm
                      title="确定要删除这个提示词吗？"
                      onConfirm={() => handleDeleteItem(prompt.id)}
                      key="delete"
                    >
                      <Tooltip title="删除">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>,
                  ]}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(prompt.id)}
                      onChange={e => handleSelectItem(prompt.id, e.target.checked)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <RobotOutlined className="text-blue-500" />
                          <Tag color={getModelTagColor(prompt.targetModel.provider)}>
                            {prompt.targetModel.name}
                          </Tag>
                          <Tag color="default">{prompt.messageRole}</Tag>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <CalendarOutlined />
                          {dayjs(prompt.createdAt).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </div>

                      <div className="mb-3">
                        <Text strong className="block mb-1">原始提示词：</Text>
                        <Paragraph
                          ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                          className="text-gray-700 mb-2"
                        >
                          {prompt.originalText}
                        </Paragraph>
                        
                        <Text strong className="block mb-1">优化后提示词：</Text>
                        <Paragraph
                          ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                          className="text-gray-700"
                        >
                          {prompt.optimizedText}
                        </Paragraph>
                      </div>

                      {prompt.systemPrompt && (
                        <div className="mb-2">
                          <Text strong className="block mb-1">系统提示词：</Text>
                          <Paragraph
                            ellipsis={{ rows: 1, expandable: true, symbol: '展开' }}
                            className="text-gray-600 text-sm"
                          >
                            {prompt.systemPrompt}
                          </Paragraph>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>优化规则: {prompt.optimizationRules.length} 个</span>
                        <span>更新时间: {dayjs(prompt.updatedAt).format('YYYY-MM-DD HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />

          {/* 分页 */}
          <div className="mt-6 text-center">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredAndSortedHistory.length}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) =>
                `第 ${range[0]}-${range[1]} 项，共 ${total} 项`
              }
              onChange={(page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              }}
              pageSizeOptions={['10', '20', '50', '100']}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default HistoryList;