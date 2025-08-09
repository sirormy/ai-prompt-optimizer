'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Drawer, Button, theme } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import { breakpoints } from '@/config/theme';

const { Header, Content, Sider } = Layout;

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  siderContent: React.ReactNode;
  headerContent?: React.ReactNode;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  siderContent,
  headerContent,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { ui, setSidebarCollapsed } = useAppStore();
  const { sidebarCollapsed } = ui;
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < breakpoints.lg);

      // 在移动端自动收起侧边栏
      if (width < breakpoints.lg && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const handleDrawerClose = () => {
    setDrawerVisible(false);
  };

  const handleMenuClick = () => {
    if (isMobile) {
      setDrawerVisible(true);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // 移动端使用Drawer，桌面端使用Sider
  const renderSider = () => {
    if (isMobile) {
      return (
        <Drawer
          title="导航菜单"
          placement="left"
          onClose={handleDrawerClose}
          open={drawerVisible}
          bodyStyle={{ padding: 0 }}
          width={280}
        >
          {siderContent}
        </Drawer>
      );
    }

    return (
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80}
        width={280}
        style={{
          background: colorBgContainer,
          borderRight: '1px solid #f0f0f0',
        }}
        onBreakpoint={broken => {
          setIsMobile(broken);
        }}
      >
        {siderContent}
      </Sider>
    );
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {renderSider()}
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={handleMenuClick}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
                marginRight: 16,
              }}
            />
            {headerContent}
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? '16px 8px' : '24px 16px',
            padding: isMobile ? 16 : 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default ResponsiveLayout;
