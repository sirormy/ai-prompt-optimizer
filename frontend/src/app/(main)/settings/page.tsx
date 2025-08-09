'use client';

import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const SettingsPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>设置</Title>
      <p>设置功能将在后续任务中实现</p>
    </div>
  );
};

export default SettingsPage;
