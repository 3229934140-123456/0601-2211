import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Table,
  Space,
  Modal,
  message,
  DatePicker,
  InputNumber,
  Tag,
  Rate,
  Popconfirm,
  Row,
  Col,
  Descriptions,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { frequencyLabel, formatMoney, formatDate } from '../utils';
import type { ColumnsType } from 'antd/es/table';
import type { DataSource, ApplicationScenario, HistoricalPrice, UpdateFrequency } from '../types';

const { Option } = Select;
const { TextArea } = Input;

function MetricsInput() {
  const {
    assets,
    selectedAssetId,
    addDataSource,
    updateDataSource,
    removeDataSource,
    updateCoverageScope,
    setUpdateFrequency,
    setDataVolume,
    addApplicationScenario,
    removeApplicationScenario,
    addHistoricalPrice,
    removeHistoricalPrice,
    updateAsset,
  } = useAppStore();

  const asset = assets.find((a) => a.id === selectedAssetId);

  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [sourceForm] = Form.useForm();

  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [scenarioForm] = Form.useForm();

  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceForm] = Form.useForm();

  const [basicForm] = Form.useForm();
  const [scopeDesc, setScopeDesc] = useState('');

  useEffect(() => {
    if (asset) {
      basicForm.setFieldsValue({
        updateFrequency: asset.updateFrequency,
        dataVolume: asset.dataVolume,
      });
      setScopeDesc(asset.coverageScope.description || '');
    }
  }, [selectedAssetId, asset?.id]);

  if (!asset) {
    return (
      <Card className="asset-detail-card">
        <div className="empty-placeholder">
          <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <div>请先在顶部或资产清单中选择一个数据资产</div>
        </div>
      </Card>
    );
  }

  const sourceColumns: ColumnsType<DataSource> = [
    {
      title: '数据来源名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '来源类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
    },
    {
      title: '可靠性',
      dataIndex: 'reliability',
      key: 'reliability',
      width: 180,
      render: (val: number) => (
        <Space>
          <Rate disabled allowHalf value={val / 20} style={{ fontSize: 14 }} />
          <span style={{ color: '#1677ff', fontWeight: 600 }}>{val}%</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingSource(record);
              sourceForm.setFieldsValue(record);
              setSourceModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除该数据源？" onConfirm={() => removeDataSource(asset.id, record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const scenarioColumns: ColumnsType<ApplicationScenario> = [
    { title: '场景名称', dataIndex: 'name', key: 'name', width: 180 },
    { title: '场景分类', dataIndex: 'category', key: 'category', width: 140 },
    { title: '场景描述', dataIndex: 'description', key: 'description' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm title="确认删除该应用场景？" onConfirm={() => removeApplicationScenario(asset.id, record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const priceColumns: ColumnsType<HistoricalPrice> = [
    {
      title: '交易日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (d: string) => formatDate(d),
    },
    {
      title: '交易价格',
      dataIndex: 'price',
      key: 'price',
      width: 140,
      render: (p: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{formatMoney(p)}</span>,
    },
    { title: '受让方', dataIndex: 'buyer', key: 'buyer', width: 180 },
    { title: '交易类型', dataIndex: 'transactionType', key: 'transactionType', width: 140 },
    { title: '备注', dataIndex: 'notes', key: 'notes' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm title="确认删除该交易记录？" onConfirm={() => removeHistoricalPrice(asset.id, record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const handleAddSource = async () => {
    try {
      const values = await sourceForm.validateFields();
      if (editingSource) {
        updateDataSource(asset.id, editingSource.id, values);
      } else {
        addDataSource(asset.id, values);
      }
      setSourceModalOpen(false);
      setEditingSource(null);
      sourceForm.resetFields();
      message.success('保存成功');
    } catch {
      // validation failed
    }
  };

  const handleAddScenario = async () => {
    try {
      const values = await scenarioForm.validateFields();
      addApplicationScenario(asset.id, values);
      setScenarioModalOpen(false);
      scenarioForm.resetFields();
      message.success('添加成功');
    } catch {
      // validation failed
    }
  };

  const handleAddPrice = async () => {
    try {
      const values = await priceForm.validateFields();
      addHistoricalPrice(asset.id, {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      });
      setPriceModalOpen(false);
      priceForm.resetFields();
      message.success('添加成功');
    } catch {
      // validation failed
    }
  };

  const handleBasicSave = async () => {
    try {
      const values = await basicForm.validateFields();
      setUpdateFrequency(asset.id, values.updateFrequency);
      setDataVolume(asset.id, values.dataVolume);
      message.success('保存成功');
    } catch {
      // validation failed
    }
  };

  const handleRegionsChange = (val: string[]) => {
    updateCoverageScope(asset.id, { regions: val });
  };

  const handleIndustriesChange = (val: string[]) => {
    updateCoverageScope(asset.id, { industries: val });
  };

  const handlePopulationChange = (val: number | null) => {
    updateCoverageScope(asset.id, { population: val as number });
  };

  const handleEnterprisesChange = (val: number | null) => {
    updateCoverageScope(asset.id, { enterprises: val as number });
  };

  const handleScopeDescBlur = () => {
    updateCoverageScope(asset.id, { description: scopeDesc });
  };

  return (
    <div>
      <Card className="asset-detail-card" style={{ marginBottom: 16 }}>
        <Descriptions title="资产基本信息" bordered column={3} size="small">
          <Descriptions.Item label="资产名称">{asset.name}</Descriptions.Item>
          <Descriptions.Item label="资产编号">{asset.code}</Descriptions.Item>
          <Descriptions.Item label="资产分类">{asset.category}</Descriptions.Item>
          <Descriptions.Item label="所属行业">{asset.industry}</Descriptions.Item>
          <Descriptions.Item label="负责人">{asset.owner || '未指定'}</Descriptions.Item>
          <Descriptions.Item label="所属部门">{asset.department || '未指定'}</Descriptions.Item>
          <Descriptions.Item label="资产描述" span={3}>
            {asset.description || '暂无描述'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        className="asset-detail-card"
        style={{ marginBottom: 16 }}
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <ReloadOutlined style={{ marginRight: 8 }} />
            数据更新与规模
          </span>
        }
        extra={
          <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleBasicSave}>
            保存
          </Button>
        }
      >
        <Form form={basicForm} layout="vertical">
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="更新频率" name="updateFrequency" rules={[{ required: true, message: '请选择更新频率' }]}>
                <Select>
                  {Object.entries(frequencyLabel).map(([key, label]) => (
                    <Option key={key} value={key}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="最近更新">
                <Input value={formatDate(asset.lastUpdated)} disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="数据规模" name="dataVolume">
                <Input placeholder="如 6000万条记录，约80GB" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card
        className="asset-detail-card"
        style={{ marginBottom: 16 }}
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            数据来源维护
          </span>
        }
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingSource(null);
              sourceForm.resetFields();
              setSourceModalOpen(true);
            }}
          >
            添加来源
          </Button>
        }
      >
        <Table
          columns={sourceColumns}
          dataSource={asset.dataSources}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: '暂无数据源，请点击右上角添加' }}
        />
      </Card>

      <Card
        className="asset-detail-card"
        style={{ marginBottom: 16 }}
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <GlobalOutlined style={{ marginRight: 8 }} />
            覆盖范围
          </span>
        }
      >
        <Form layout="vertical">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="覆盖地区">
                <Select
                  mode="tags"
                  placeholder="输入或选择覆盖地区"
                  value={asset.coverageScope.regions}
                  onChange={handleRegionsChange}
                  style={{ width: '100%' }}
                  tokenSeparators={[',']}
                >
                  {['北京', '上海', '广东', '江苏', '浙江', '四川', '湖北', '山东', '河南', '福建', '全国'].map((r) => (
                    <Option key={r} value={r}>
                      {r}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="覆盖行业">
                <Select
                  mode="tags"
                  placeholder="输入或选择覆盖行业"
                  value={asset.coverageScope.industries}
                  onChange={handleIndustriesChange}
                  style={{ width: '100%' }}
                  tokenSeparators={[',']}
                >
                  <Option value="制造业">制造业</Option>
                  <Option value="批发零售">批发零售</Option>
                  <Option value="信息技术">信息技术</Option>
                  <Option value="金融">金融</Option>
                  <Option value="房地产">房地产</Option>
                  <Option value="建筑">建筑</Option>
                  <Option value="医疗健康">医疗健康</Option>
                  <Option value="教育">教育</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="覆盖人口数">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="覆盖人口数"
                  value={asset.coverageScope.population}
                  onChange={handlePopulationChange}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/,/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="覆盖企业数">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="覆盖企业数"
                  value={asset.coverageScope.enterprises}
                  onChange={handleEnterprisesChange}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value!.replace(/,/g, '') as unknown as number}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="标签统计">
                <Space>
                  <Tag color="blue">{asset.coverageScope.regions.length} 个地区</Tag>
                  <Tag color="green">{asset.coverageScope.industries.length} 个行业</Tag>
                </Space>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="范围描述补充">
            <TextArea
              rows={2}
              placeholder="详细描述数据覆盖范围"
              value={scopeDesc}
              onChange={(e) => setScopeDesc(e.target.value)}
              onBlur={handleScopeDescBlur}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card
        className="asset-detail-card"
        style={{ marginBottom: 16 }}
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <AppstoreOutlined style={{ marginRight: 8 }} />
            应用场景
          </span>
        }
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              scenarioForm.resetFields();
              setScenarioModalOpen(true);
            }}
          >
            添加场景
          </Button>
        }
      >
        <Table
          columns={scenarioColumns}
          dataSource={asset.applicationScenarios}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: '暂无应用场景，请点击右上角添加' }}
        />
      </Card>

      <Card
        className="asset-detail-card"
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            历史交易价格
          </span>
        }
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              priceForm.resetFields();
              setPriceModalOpen(true);
            }}
          >
            添加交易
          </Button>
        }
      >
        <Table
          columns={priceColumns}
          dataSource={asset.historicalPrices}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: '暂无历史交易记录，请点击右上角添加' }}
        />
        {asset.historicalPrices.length > 0 && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={24}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>交易次数</div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{asset.historicalPrices.length}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>平均价格</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#1677ff' }}>
                    {formatMoney(Math.round(asset.historicalPrices.reduce((s, p) => s + p.price, 0) / asset.historicalPrices.length))}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>最高价格</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#52c41a' }}>
                    {formatMoney(Math.max(...asset.historicalPrices.map((p) => p.price)))}
                  </div>
                </div>
              </Col>
            </Row>
          </>
        )}
      </Card>

      <Modal
        title={editingSource ? '编辑数据来源' : '添加数据来源'}
        open={sourceModalOpen}
        onOk={handleAddSource}
        onCancel={() => {
          setSourceModalOpen(false);
          setEditingSource(null);
          sourceForm.resetFields();
        }}
        okText="保存"
      >
        <Form form={sourceForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="数据来源名称" rules={[{ required: true, message: '请输入来源名称' }]}>
            <Input placeholder="如：国家市场监督管理总局" />
          </Form.Item>
          <Form.Item name="type" label="来源类型" rules={[{ required: true, message: '请选择来源类型' }]}>
            <Select placeholder="请选择">
              <Option value="政府公开数据">政府公开数据</Option>
              <Option value="政务数据共享">政务数据共享</Option>
              <Option value="第三方采购">第三方采购</Option>
              <Option value="自主采集">自主采集</Option>
              <Option value="合作方共享">合作方共享</Option>
              <Option value="公开网络爬取">公开网络爬取</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="reliability" label="可靠性评分（0-100）" rules={[{ required: true, message: '请输入可靠性评分' }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="请输入0-100的评分" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="描述该数据源的详细信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加应用场景"
        open={scenarioModalOpen}
        onOk={handleAddScenario}
        onCancel={() => {
          setScenarioModalOpen(false);
          scenarioForm.resetFields();
        }}
        okText="添加"
      >
        <Form form={scenarioForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="场景名称" rules={[{ required: true, message: '请输入场景名称' }]}>
            <Input placeholder="如：企业风控评估" />
          </Form.Item>
          <Form.Item name="category" label="场景分类" rules={[{ required: true, message: '请选择场景分类' }]}>
            <Select placeholder="请选择">
              <Option value="金融风控">金融风控</Option>
              <Option value="企业服务">企业服务</Option>
              <Option value="市场营销">市场营销</Option>
              <Option value="智能决策">智能决策</Option>
              <Option value="产品优化">产品优化</Option>
              <Option value="研究分析">研究分析</Option>
              <Option value="运营管理">运营管理</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="场景描述">
            <TextArea rows={3} placeholder="详细描述该应用场景" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加历史交易记录"
        open={priceModalOpen}
        onOk={handleAddPrice}
        onCancel={() => {
          setPriceModalOpen(false);
          priceForm.resetFields();
        }}
        okText="添加"
      >
        <Form form={priceForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="date" label="交易日期" rules={[{ required: true, message: '请选择交易日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="交易价格（元）" rules={[{ required: true, message: '请输入交易价格' }]}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="请输入交易价格"
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
            />
          </Form.Item>
          <Form.Item name="buyer" label="受让方（买方）" rules={[{ required: true, message: '请输入受让方' }]}>
            <Input placeholder="如：某国有银行总行" />
          </Form.Item>
          <Form.Item name="transactionType" label="交易类型" rules={[{ required: true, message: '请选择交易类型' }]}>
            <Select placeholder="请选择">
              <Option value="一次性交付">一次性交付</Option>
              <Option value="月度授权">月度授权</Option>
              <Option value="季度授权">季度授权</Option>
              <Option value="半年度授权">半年度授权</Option>
              <Option value="年度授权">年度授权</Option>
              <Option value="API调用计费">API调用计费</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="补充说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default MetricsInput;
