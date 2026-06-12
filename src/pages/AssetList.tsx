import { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { formatMoney, formatDate, statusLabel, statusColor, exportToJSON, importFromJSON, levelDescription } from '../utils';
import type { ColumnsType } from 'antd/es/table';
import type { DataAsset } from '../types';

const { Option } = Select;

function AssetList() {
  const navigate = useNavigate();
  const {
    assets,
    selectedAssetId,
    setSelectedAsset,
    industryFilter,
    industries,
    addAsset,
    updateAsset,
    deleteAsset,
    importAssets,
  } = useAppStore();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DataAsset | null>(null);
  const [form] = Form.useForm();

  const filteredAssets = assets.filter((asset) => {
    if (industryFilter !== 'all' && asset.industry !== industryFilter) return false;
    if (statusFilter !== 'all' && asset.status !== statusFilter) return false;
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerSearch) ||
        asset.code.toLowerCase().includes(lowerSearch) ||
        asset.description.toLowerCase().includes(lowerSearch)
      );
    }
    return true;
  });

  const totalValue = filteredAssets.reduce((sum, a) => sum + a.estimatedValue, 0);
  const pendingCount = assets.filter((a) => a.status === 'pending').length;
  const approvedCount = assets.filter((a) => a.status === 'approved').length;
  const avgScore = assets.length > 0 ? (assets.reduce((sum, a) => sum + a.totalScore, 0) / assets.length).toFixed(1) : '0';

  const columns: ColumnsType<DataAsset> = [
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      fixed: 'left',
      render: (text, record) => (
        <a onClick={() => { setSelectedAsset(record.id); navigate('/metrics'); }}>
          {text}
        </a>
      ),
    },
    {
      title: '资产编号',
      dataIndex: 'code',
      key: 'code',
      width: 130,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '所属行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 100,
      filters: industries.map((ind) => ({ text: ind, value: ind })),
      onFilter: (value, record) => record.industry === value,
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      key: 'owner',
      width: 90,
    },
    {
      title: '估值等级',
      dataIndex: 'valuationLevel',
      key: 'valuationLevel',
      width: 100,
      render: (level: string, record) => (
        <span title={levelDescription[record.valuationLevel]} className={`level-badge level-${level}`}>
          {level}
        </span>
      ),
      sorter: (a, b) => a.totalScore - b.totalScore,
    },
    {
      title: '综合评分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 100,
      render: (score: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{score}</span>,
      sorter: (a, b) => a.totalScore - b.totalScore,
    },
    {
      title: '预估价值',
      dataIndex: 'estimatedValue',
      key: 'estimatedValue',
      width: 130,
      render: (val: number) => <span style={{ fontWeight: 600 }}>{formatMoney(val)}</span>,
      sorter: (a, b) => a.estimatedValue - b.estimatedValue,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => <Tag color={statusColor[status as keyof typeof statusColor]}>{statusLabel[status as keyof typeof statusLabel]}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (date: string) => formatDate(date, 'YYYY-MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedAsset(record.id); navigate('/metrics'); }}>
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingAsset(record);
              form.setFieldsValue(record);
              setIsEditModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除该数据资产？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      addAsset(values);
      setIsAddModalOpen(false);
      form.resetFields();
      message.success('创建成功');
    } catch {
      // validation failed
    }
  };

  const handleEdit = async () => {
    try {
      const values = await form.validateFields();
      if (editingAsset) {
        updateAsset(editingAsset.id, values);
        setIsEditModalOpen(false);
        setEditingAsset(null);
        form.resetFields();
        message.success('更新成功');
      }
    } catch {
      // validation failed
    }
  };

  const handleDelete = (id: string) => {
    deleteAsset(id);
    message.success('删除成功');
  };

  const handleImport = async () => {
    const data = await importFromJSON();
    if (data && Array.isArray(data)) {
      importAssets(data);
      message.success(`成功导入 ${data.length} 条资产数据`);
    } else if (data) {
      importAssets([data as any]);
      message.success('成功导入 1 条资产数据');
    } else {
      message.warning('未选择有效文件');
    }
  };

  const handleExport = () => {
    exportToJSON(filteredAssets, `data-assets-${Date.now()}.json`);
    message.success('导出成功');
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic title="资产总数" value={assets.length} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic title="总预估价值" value={totalValue} precision={0} prefix="¥" valueStyle={{ color: '#52c41a' }} formatter={(v) => (v as number).toLocaleString()} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic title="平均评分" value={avgScore} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Statistic title="待审核" value={pendingCount} valueStyle={{ color: '#faad14' }} />
              <Statistic title="已通过" value={approvedCount} valueStyle={{ color: '#52c41a' }} />
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="asset-detail-card" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: 4 }}>数据资产清单</h3>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>共 {filteredAssets.length} 条资产记录</div>
          </div>
          <Space>
            <Input
              placeholder="搜索资产名称/编号"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Select placeholder="状态筛选" value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }} allowClear>
              <Option value="all">全部状态</Option>
              <Option value="draft">草稿</Option>
              <Option value="pending">待审核</Option>
              <Option value="approved">已通过</Option>
              <Option value="rejected">已驳回</Option>
            </Select>
            <Button icon={<ImportOutlined />} onClick={handleImport}>
              导入
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setIsAddModalOpen(true); }}>
              新增资产
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredAssets}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10,
          }}
          rowSelection={{
            selectedRowKeys: selectedAssetId ? [selectedAssetId] : [],
            onChange: (keys) => setSelectedAsset(keys[0] as string || null),
          }}
        />
      </Card>

      <Modal
        title={editingAsset ? '编辑数据资产' : '新增数据资产'}
        open={isAddModalOpen || isEditModalOpen}
        onOk={editingAsset ? handleEdit : handleAdd}
        onCancel={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setEditingAsset(null);
          form.resetFields();
        }}
        width={600}
        okText="保存"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="资产名称" rules={[{ required: true, message: '请输入资产名称' }]}>
                <Input placeholder="请输入资产名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="code" label="资产编号" rules={[{ required: true, message: '请输入资产编号' }]}>
                <Input placeholder="如 DA-2024-001" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="资产分类" rules={[{ required: true, message: '请选择资产分类' }]}>
                <Select placeholder="请选择">
                  <Option value="结构化数据">结构化数据</Option>
                  <Option value="非结构化数据">非结构化数据</Option>
                  <Option value="用户行为数据">用户行为数据</Option>
                  <Option value="物联网数据">物联网数据</Option>
                  <Option value="医疗数据">医疗数据</Option>
                  <Option value="金融数据">金融数据</Option>
                  <Option value="工业数据">工业数据</Option>
                  <Option value="风控数据">风控数据</Option>
                  <Option value="政务数据">政务数据</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="industry" label="所属行业" rules={[{ required: true, message: '请选择所属行业' }]}>
                <Select placeholder="请选择">
                  {industries.map((ind) => (
                    <Option key={ind} value={ind}>
                      {ind}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="owner" label="负责人">
                <Input placeholder="请输入负责人姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="所属部门">
                <Input placeholder="请输入所属部门" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="资产描述">
            <Input.TextArea rows={4} placeholder="请详细描述数据资产的内容、来源、用途等信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AssetList;
