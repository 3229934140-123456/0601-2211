import { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Row,
  Col,
  Tag,
  Divider,
  Table,
  Popconfirm,
  List,
  Radio,
  Empty,
  Tooltip,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DatabaseOutlined,
  StarOutlined,
  StarFilled,
  CheckOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { formatMoney, formatDate } from '../utils';
import type { QuoteScheme, ServiceCost } from '../types';

const { Option } = Select;
const { TextArea } = Input;

function QuoteSchemePage() {
  const {
    assets,
    selectedAssetId,
    addQuoteScheme,
    updateQuoteScheme,
    removeQuoteScheme,
    addServiceCost,
    updateServiceCost,
    removeServiceCost,
    selectQuoteScheme,
  } = useAppStore();

  const asset = assets.find((a) => a.id === selectedAssetId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<QuoteScheme | null>(null);
  const [schemeForm] = Form.useForm();

  const [costModalOpen, setCostModalOpen] = useState(false);
  const [currentSchemeId, setCurrentSchemeId] = useState<string | null>(null);
  const [editingCost, setEditingCost] = useState<ServiceCost | null>(null);
  const [costForm] = Form.useForm();

  const [compareView, setCompareView] = useState<'card' | 'table'>('card');

  if (!asset) {
    return (
      <Card className="asset-detail-card">
        <div className="empty-placeholder">
          <DatabaseOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
          <div>请先选择一个数据资产</div>
        </div>
      </Card>
    );
  }

  const schemes = asset.quoteSchemes;
  const maxPrice = schemes.length > 0 ? Math.max(...schemes.map((s) => s.totalPrice)) : 0;

  const handleSaveScheme = async () => {
    try {
      const values = await schemeForm.validateFields();
      if (editingScheme) {
        updateQuoteScheme(asset.id, editingScheme.id, values);
        message.success('更新成功');
      } else {
        addQuoteScheme(asset.id, {
          ...values,
          serviceCosts: [],
        });
        message.success('添加成功');
      }
      setIsModalOpen(false);
      setEditingScheme(null);
      schemeForm.resetFields();
    } catch {
      // validation failed
    }
  };

  const handleSaveCost = async () => {
    try {
      const values = await costForm.validateFields();
      if (currentSchemeId) {
        if (editingCost) {
          updateServiceCost(asset.id, currentSchemeId, editingCost.id, values);
          message.success('更新成功');
        } else {
          addServiceCost(asset.id, currentSchemeId, values);
          message.success('添加成功');
        }
      }
      setCostModalOpen(false);
      setCurrentSchemeId(null);
      setEditingCost(null);
      costForm.resetFields();
    } catch {
      // validation failed
    }
  };

  const handleToggleRecommend = (scheme: QuoteScheme) => {
    schemes.forEach((s) => {
      updateQuoteScheme(asset.id, s.id, { isRecommended: s.id === scheme.id ? !scheme.isRecommended : false });
    });
  };

  const avgPrice = schemes.length > 0
    ? Math.round(schemes.reduce((s, q) => s + q.totalPrice, 0) / schemes.length)
    : 0;

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic title="报价方案数量" value={schemes.length} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="最低报价"
              value={schemes.length > 0 ? Math.min(...schemes.map((s) => s.totalPrice)) : 0}
              precision={0}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
              formatter={(v) => (v as number).toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="平均报价"
              value={avgPrice}
              precision={0}
              prefix="¥"
              valueStyle={{ color: '#722ed1' }}
              formatter={(v) => (v as number).toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="最高报价"
              value={maxPrice}
              precision={0}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
              formatter={(v) => (v as number).toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="asset-detail-card"
        style={{ marginBottom: 16 }}
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            报价方案
          </span>
        }
        extra={
          <Space>
            <Radio.Group
              value={compareView}
              onChange={(e) => setCompareView(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="card">卡片视图</Radio.Button>
              <Radio.Button value="table">对比表格</Radio.Button>
            </Radio.Group>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingScheme(null);
                schemeForm.resetFields();
                setIsModalOpen(true);
              }}
            >
              新增方案
            </Button>
          </Space>
        }
      >
        {schemes.length === 0 ? (
          <Empty description="暂无报价方案，请点击右上角新增" style={{ padding: '40px 0' }} />
        ) : compareView === 'card' ? (
          <Row gutter={[16, 16]}>
            {schemes.map((scheme) => {
              const isSelected = asset.selectedQuoteId === scheme.id;
              return (
                <Col
                  xs={24}
                  md={schemes.length === 1 ? 24 : schemes.length === 2 ? 12 : 8}
                  key={scheme.id}
                >
                  <Card
                    hoverable
                    style={{
                      border: isSelected ? '2px solid #1677ff' : scheme.isRecommended ? '2px solid #faad14' : '1px solid #f0f0f0',
                      position: 'relative',
                    }}
                    size="small"
                    title={
                      <Space>
                        <span style={{ fontWeight: 600 }}>{scheme.name}</span>
                        {scheme.isRecommended && (
                          <Tag color="orange" icon={<StarFilled />}>
                            推荐
                          </Tag>
                        )}
                      </Space>
                    }
                    extra={
                      <Space size="small">
                        <Tooltip title={scheme.isRecommended ? '取消推荐' : '设为推荐'}>
                          <Button
                            type="text"
                            size="small"
                            icon={scheme.isRecommended ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                            onClick={() => handleToggleRecommend(scheme)}
                          />
                        </Tooltip>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingScheme(scheme);
                            schemeForm.setFieldsValue(scheme);
                            setIsModalOpen(true);
                          }}
                        />
                        <Popconfirm title="确认删除该方案？" onConfirm={() => removeQuoteScheme(asset.id, scheme.id)}>
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    }
                  >
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>总报价</div>
                      <div className="price-display">{formatMoney(scheme.totalPrice)}</div>
                      <Tag style={{ marginTop: 8 }}>{scheme.pricingModel}</Tag>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>价格构成</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>基础价格</span>
                        <span style={{ fontWeight: 600 }}>{formatMoney(scheme.basePrice)}</span>
                      </div>
                      {scheme.serviceCosts.map((cost) => (
                        <div
                          key={cost.id}
                          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}
                        >
                          <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                            · {cost.name}
                          </span>
                          <span style={{ color: 'rgba(0,0,0,0.65)' }}>{formatMoney(cost.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          color: 'rgba(0,0,0,0.45)',
                          marginBottom: 4,
                        }}
                      >
                        <span>价格定位</span>
                        <span>{maxPrice > 0 ? Math.round((scheme.totalPrice / maxPrice) * 100) : 0}%</span>
                      </div>
                      <div className="quote-compare-bar">
                        <div
                          className="quote-compare-fill"
                          style={{
                            width: `${maxPrice > 0 ? (scheme.totalPrice / maxPrice) * 100 : 0}%`,
                            background: isSelected
                              ? '#1677ff'
                              : scheme.isRecommended
                              ? '#faad14'
                              : '#1677ff80',
                          }}
                        />
                      </div>
                    </div>

                    {scheme.description && (
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 12 }}>
                        {scheme.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          setCurrentSchemeId(scheme.id);
                          setEditingCost(null);
                          costForm.resetFields();
                          setCostModalOpen(true);
                        }}
                      >
                        新增服务成本
                      </Button>
                      <Button
                        type={isSelected ? 'primary' : 'default'}
                        size="small"
                        icon={isSelected ? <CheckOutlined /> : undefined}
                        onClick={() => selectQuoteScheme(asset.id, scheme.id)}
                      >
                        {isSelected ? '已选用' : '选用此方案'}
                      </Button>
                    </div>

                    {scheme.serviceCosts.length > 0 && (
                      <List
                        size="small"
                        style={{ marginTop: 12 }}
                        dataSource={scheme.serviceCosts}
                        renderItem={(cost) => (
                          <List.Item
                            style={{ padding: '4px 0', justifyContent: 'space-between' }}
                            actions={[
                              <Button
                                key="edit"
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  setCurrentSchemeId(scheme.id);
                                  setEditingCost(cost);
                                  costForm.setFieldsValue(cost);
                                  setCostModalOpen(true);
                                }}
                              >
                                编辑
                              </Button>,
                              <Popconfirm
                                key="delete"
                                title="删除此服务成本？"
                                onConfirm={() => removeServiceCost(asset.id, scheme.id, cost.id)}
                              >
                                <Button type="text" size="small" danger>
                                  删除
                                </Button>
                              </Popconfirm>,
                            ]}
                          >
                            <List.Item.Meta title={cost.name} description={cost.description} />
                            <div style={{ fontWeight: 600 }}>{formatMoney(cost.amount)}</div>
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Table
            dataSource={schemes}
            rowKey="id"
            size="middle"
            bordered
            pagination={false}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '0 24px' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>服务成本明细：</div>
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>基础价格</div>
                      <div style={{ fontWeight: 600 }}>{formatMoney(record.basePrice)}</div>
                    </Col>
                    {record.serviceCosts.map((c) => (
                      <Col span={8} key={c.id}>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{c.name}</div>
                        <div style={{ fontWeight: 600 }}>{formatMoney(c.amount)}</div>
                      </Col>
                    ))}
                  </Row>
                </div>
              ),
            }}
          >
            <Table.Column title="方案名称" dataIndex="name" key="name" width={180} render={(text, r) => (
              <Space>
                <span style={{ fontWeight: 600 }}>{text}</span>
                {r.isRecommended && <Tag color="orange">推荐</Tag>}
                {asset.selectedQuoteId === r.id && <Tag color="blue">已选用</Tag>}
              </Space>
            )} />
            <Table.Column title="定价模式" dataIndex="pricingModel" key="pricingModel" width={120} />
            <Table.Column title="基础价格" dataIndex="basePrice" key="basePrice" width={140} render={(v) => formatMoney(v)} />
            <Table.Column
              title="附加服务"
              key="services"
              width={120}
              render={(_, r) => `${r.serviceCosts.length} 项`}
            />
            <Table.Column
              title="服务总成本"
              key="serviceCost"
              width={140}
              render={(_: unknown, r: QuoteScheme) => formatMoney(r.serviceCosts.reduce((s: number, c: ServiceCost) => s + c.amount, 0))}
            />
            <Table.Column
              title="总报价"
              dataIndex="totalPrice"
              key="totalPrice"
              width={160}
              render={(v) => <span className="price-display" style={{ fontSize: 18 }}>{formatMoney(v)}</span>}
              sorter={(a, b) => a.totalPrice - b.totalPrice}
            />
            <Table.Column title="方案描述" dataIndex="description" key="description" ellipsis />
            <Table.Column
              title="操作"
              key="action"
              width={160}
              render={(_, r) => (
                <Space size="small">
                  <Button type="link" size="small" onClick={() => selectQuoteScheme(asset.id, r.id)}>
                    {asset.selectedQuoteId === r.id ? '已选用' : '选用'}
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setEditingScheme(r as QuoteScheme);
                      schemeForm.setFieldsValue(r as QuoteScheme);
                      setIsModalOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                </Space>
              )}
            />
          </Table>
        )}
      </Card>

      <Card className="asset-detail-card" title={<span className="form-section-title" style={{ marginBottom: 0 }}>价格区间分析</span>}>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ padding: 16, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 12 }}>报价分布</div>
              {schemes
                .slice()
                .sort((a, b) => a.totalPrice - b.totalPrice)
                .map((s, idx) => (
                  <div key={s.id} style={{ marginBottom: idx === schemes.length - 1 ? 0 : 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{s.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1677ff' }}>
                        {formatMoney(s.totalPrice)}
                      </span>
                    </div>
                    <div className="quote-compare-bar">
                      <div
                        className="quote-compare-fill"
                        style={{
                          width: `${maxPrice > 0 ? (s.totalPrice / maxPrice) * 100 : 0}%`,
                          background: asset.selectedQuoteId === s.id ? '#1677ff' : '#91caff',
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ padding: 16, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 12 }}>与评估价值对比</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="系统预估价值"
                    value={asset.estimatedValue}
                    prefix="¥"
                    valueStyle={{ fontSize: 18 }}
                    formatter={(v) => (v as number).toLocaleString()}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="平均报价/预估"
                    value={avgPrice > 0 && asset.estimatedValue > 0 ? ((avgPrice / asset.estimatedValue) * 100).toFixed(1) : '0'}
                    suffix="%"
                    valueStyle={{
                      fontSize: 18,
                      color: avgPrice >= asset.estimatedValue ? '#52c41a' : '#faad14',
                    }}
                  />
                </Col>
              </Row>
              <Divider />
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', lineHeight: 1.8 }}>
                <div>• 报价方案数: {schemes.length} 套</div>
                <div>• 历史交易参考: {asset.historicalPrices.length} 笔</div>
                {asset.historicalPrices.length > 0 && (
                  <div>
                    • 历史平均交易价:{' '}
                    {formatMoney(
                      Math.round(
                        asset.historicalPrices.reduce((s, p) => s + p.price, 0) / asset.historicalPrices.length
                      )
                    )}
                  </div>
                )}
                <div>• 最近更新: {formatDate(asset.updatedAt, 'YYYY-MM-DD HH:mm')}</div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Modal
        title={editingScheme ? '编辑报价方案' : '新增报价方案'}
        open={isModalOpen}
        onOk={handleSaveScheme}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingScheme(null);
          schemeForm.resetFields();
        }}
        okText="保存"
        width={520}
      >
        <Form form={schemeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="方案名称" rules={[{ required: true, message: '请输入方案名称' }]}>
            <Input placeholder="如：基础版-年度授权" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="pricingModel" label="定价模式" rules={[{ required: true, message: '请选择定价模式' }]}>
                <Select placeholder="请选择">
                  <Option value="一次性交付">一次性交付</Option>
                  <Option value="月度授权">月度授权</Option>
                  <Option value="季度授权">季度授权</Option>
                  <Option value="半年度授权">半年度授权</Option>
                  <Option value="年度授权">年度授权</Option>
                  <Option value="API调用计费">API调用计费</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="basePrice" label="基础价格（元）" rules={[{ required: true, message: '请输入基础价格' }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="请输入价格"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/,/g, '')) as any}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="方案描述">
            <TextArea rows={3} placeholder="描述方案包含的内容和服务" />
          </Form.Item>
          <Form.Item name="isRecommended" label="是否为推荐方案" valuePropName="checked">
            <Select placeholder="请选择">
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingCost ? '编辑服务成本' : '添加服务成本'}
        open={costModalOpen}
        onOk={handleSaveCost}
        onCancel={() => {
          setCostModalOpen(false);
          setCurrentSchemeId(null);
          setEditingCost(null);
          costForm.resetFields();
        }}
        okText={editingCost ? '保存' : '添加'}
      >
        <Form form={costForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="服务名称" rules={[{ required: true, message: '请输入服务名称' }]}>
            <Input placeholder="如：数据清洗服务、技术支持等" />
          </Form.Item>
          <Form.Item name="amount" label="服务费用（元）" rules={[{ required: true, message: '请输入服务费用' }]}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="请输入费用"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/,/g, '')) as any}
            />
          </Form.Item>
          <Form.Item name="description" label="服务描述">
            <TextArea rows={2} placeholder="描述该服务的具体内容" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default QuoteSchemePage;
