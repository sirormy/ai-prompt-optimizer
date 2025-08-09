'use client';

import React, { useEffect } from 'react';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useAppStore } from '@/store/useAppStore';
import { lightTheme, darkTheme, mobileConfig } from '@/config/theme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { ui, user } = useAppStore();
  const { theme } = ui;
  const [isMobile, setIsMobile] = React.useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 选择主题配置
  const getThemeConfig = () => {
    const baseTheme = theme === 'dark' ? darkTheme : lightTheme;

    if (isMobile) {
      return {
        ...baseTheme,
        components: {
          ...baseTheme.components,
          ...mobileConfig.components,
        },
      };
    }

    return baseTheme;
  };

  // 选择语言配置
  const getLocale = () => {
    return user.preferences.language === 'en' ? enUS : zhCN;
  };

  return (
    <ConfigProvider
      theme={getThemeConfig()}
      locale={getLocale()}
      componentSize={isMobile ? 'large' : 'middle'}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
};

export default ThemeProvider;
