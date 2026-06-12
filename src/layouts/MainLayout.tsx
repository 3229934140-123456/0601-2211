import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Select, Avatar, Dropdown, Badge, Button } from 'antd';
import {
  UnorderedListOutlined,
  EditOutlined,
  LineChartOutlined,
  WarningOutlined,
  FileTextOutlined,
  AuditOutlined,
  FileSearchOutlined,
  UserOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';

const { Sider, Content, Header } = Layout;
const { Option } = Select;

const menuItems = [
  { key: '/assets', icon: <UnorderedListOutlined />, label: '资产清单' },
  { key: '/metrics', icon: <EditOutlined />, label: '指标录入' },
  { key: '/valuation', icon: <LineChartOutlined />, label: '价值评估' },
  { key: '/risk', icon: <WarningOutlined />, label: '风险提示' },
  { key: '/quote', icon: <FileTextOutlined />, label: '报价方案' },
  { key: '/approval', icon: <AuditOutlined />, label: '审批记录' },
  { key: '/reports', icon: <FileSearchOutlined />, label: '报告中心' },
];

const userMenu = {
  items: [
    { key: 'profile', label: '个人中心', icon: <UserOutlined /> },
    { key: 'settings', label: '系统设置' },
    { type: 'divider' as const },
    { key: 'logout', label: '退出登录' },
  ],
};

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { assets, selectedAssetId, setSelectedAsset, industries, industryFilter, setIndustryFilter } = useAppStore();

  const filteredAssets =
    industryFilter === 'all'
      ? assets
      : assets.filter((a) => a.industry === industryFilter);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  return (
    <Layout className="app-container">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{ background: '#001529' }}
      >
        <div className="sidebar-logo">
          <DatabaseOutlined style={{ color: '#1890ff', fontSize: 20, marginRight: collapsed ? 0 : 10 }} />
          {!collapsed && <span className="sidebar-logo-text">数据资产估值</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout className="main-layout">
        <Header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 40, height: 40 }}
            />
            <span className="header-title">
              {menuItems.find((m) => m.key === location.pathname)?.label || '数据要素流通资产估值系统'}
            </span>
          </div>
          <div className="header-right">
            <Select
              className="asset-selector"
              placeholder="选择数据资产"
              value={selectedAssetId}
              onChange={(val) => setSelectedAsset(val)}
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {filteredAssets.map((asset) => (
                <Option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.code})
                </Option>
              ))}
            </Select>
            <Select
              placeholder="按行业筛选"
              value={industryFilter}
              onChange={(val) => setIndustryFilter(val)}
              style={{ width: 140 }}
              allowClear
            >
              <Option value="all">全部行业</Option>
              {industries.map((ind) => (
                <Option key={ind} value={ind}>
                  {ind}
                </Option>
              ))}
            </Select>
            <Badge count={3} size="small">
              <Button type="text" icon={<BellOutlined />} style={{ fontSize: 16 }} />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span style={{ fontSize: 13 }}>产品经理</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="content-area">
          {selectedAsset && (
            <div style={{ marginBottom: 16, padding: '12px 20px', background: '#fff', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedAsset.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
                  编号：{selectedAsset.code} | 行业：{selectedAsset.industry} | 负责人：{selectedAsset.owner || '未指定'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>估值等级：</span>
                  <span className={`level-badge level-${selectedAsset.valuationLevel}`}>{selectedAsset.valuationLevel}</span>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>综合评分：</span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#1677ff' }}>{selectedAsset.totalScore}</span>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>预估价值：</span>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>¥{selectedAsset.estimatedValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
