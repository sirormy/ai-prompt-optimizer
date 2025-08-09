import type { ThemeConfig } from 'antd';

// 浅色主题配置
export const lightTheme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',

    // 背景色
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',

    // 文本色
    colorText: '#000000d9',
    colorTextSecondary: '#00000073',
    colorTextTertiary: '#00000040',
    colorTextQuaternary: '#00000026',

    // 边框
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',

    // 圆角
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,

    // 字体
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,

    // 间距
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.12)',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f5f5f5',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#e6f7ff',
      itemHoverBg: '#f5f5f5',
      itemSelectedColor: '#1890ff',
    },
    Card: {
      headerBg: '#fafafa',
    },
    Button: {
      primaryShadow: '0 2px 0 rgba(5, 145, 255, 0.1)',
    },
  },
};

// 深色主题配置
export const darkTheme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',

    // 背景色
    colorBgContainer: '#141414',
    colorBgElevated: '#1f1f1f',
    colorBgLayout: '#000000',

    // 文本色
    colorText: '#ffffffd9',
    colorTextSecondary: '#ffffff73',
    colorTextTertiary: '#ffffff40',
    colorTextQuaternary: '#ffffff26',

    // 边框
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',

    // 圆角
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,

    // 字体
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontSizeXL: 20,

    // 间距
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.45)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.32)',
  },
  components: {
    Layout: {
      headerBg: '#141414',
      siderBg: '#141414',
      bodyBg: '#000000',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#111b26',
      itemHoverBg: '#1f1f1f',
      itemSelectedColor: '#1890ff',
      darkItemBg: 'transparent',
      darkItemSelectedBg: '#111b26',
      darkItemHoverBg: '#1f1f1f',
    },
    Card: {
      headerBg: '#1f1f1f',
    },
    Button: {
      primaryShadow: '0 2px 0 rgba(5, 145, 255, 0.1)',
    },
  },
};

// 响应式断点配置
export const breakpoints = {
  xs: 480,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
};

// 移动端适配配置
export const mobileConfig = {
  // 移动端下的组件尺寸调整
  components: {
    Button: {
      controlHeight: 40, // 增加按钮高度便于触摸
    },
    Input: {
      controlHeight: 40,
    },
    Select: {
      controlHeight: 40,
    },
  },
};
