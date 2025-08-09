'use client';

import React from 'react';
import { Menu, Typography, theme } from 'antd';
import {
  HomeOutlined,
  HistoryOutlined,
  SettingOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import type { MenuProps } from 'antd';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { useAppStore } from '@/store/useAppStore';

const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { ui, setSidebarCollapsed } = useAppStore();
  const { sidebarCollapsed } = ui;
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/optimize',
      icon: <BulbOutlined />,
      label: '提示词优化',
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: '历史记录',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = e => {
    router.push(e.key);
  };

  const siderContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 64,
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        {!sidebarCollapsed && (
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            AI优化器
          </Title>
        )}
        {sidebarCollapsed && (
          <BulbOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
        )}
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ flex: 1, borderRight: 0 }}
      />
    </div>
  );

  const headerContent = (
    <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
      AI提示词优化工具
    </Title>
  );

  return (
    <ResponsiveLayout siderContent={siderContent} headerContent={headerContent}>
      {children}
    </ResponsiveLayout>
  );
};

export default MainLayout;
