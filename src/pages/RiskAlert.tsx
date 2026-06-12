import { useState } from 'react';
import {
  Card,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Row,
  Col,
  Alert,
  Empty,
  Statistic,
  Progress,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { riskLevelLabel, riskTypeLabel } from '../utils';
import type { RiskItem, RiskLevel } from '../types';

const { Option } = Select;
const { TextArea } = Input;

const riskLevelColor: Record<RiskLevel, string> = {
  high: 'red',
  medium: 'orange',
  low: 'green',
};

const riskLevelIcon: Record<RiskLevel, React.ReactNode> = {
  high: <AlertOutlined style={{ color: '#ff4d4f' }} />,
  medium: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
  low: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
};

function RiskAlert() {
  const { assets, selectedAssetId, addRisk, updateRisk, removeRisk } = useAppStore();
  const asset = assets.find((a) => a.id === selectedAssetId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<RiskItem | null>(null);
  const [form] = Form.useForm();

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

  const risks = asset.risks;
  const highRisks = risks.filter((r) => r.level === 'high').length;
  const mediumRisks = risks.filter((r) => r.level === 'medium').length;
  const lowRisks = risks.filter((r) => r.level === 'low').length;
  const ownershipRisks = risks.filter((r) => r.type === 'ownership').length;
  const complianceRisks = risks.filter((r) => r.type === 'compliance').length;
  const qualityRisks = risks.filter((r) => r.type === 'quality').length;
  const securityRisks = risks.filter((r) => r.type === 'security').length;

  const riskScore = Math.max(
    0,
    100 - highRisks * 25 - mediumRisks * 10 - lowRisks * 3
  );

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingRisk) {
        updateRisk(asset.id, editingRisk.id, values);
        message.success('更新成功');
      } else {
        addRisk(asset.id, values);
        message.success('添加成功');
      }
      setIsModalOpen(false);
      setEditingRisk(null);
      form.resetFields();
    } catch {
      // validation failed
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="风险综合评分"
              value={riskScore}
              suffix="/100"
              valueStyle={{
                color: riskScore >= 80 ? '#52c41a' : riskScore >= 60 ? '#faad14' : '#ff4d4f',
              }}
            />
            <Progress
              percent={riskScore}
              showInfo={false}
              strokeColor={riskScore >= 80 ? '#52c41a' : riskScore >= 60 ? '#faad14' : '#ff4d4f'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 12 }}>风险等级分布</div>
            <Row gutter={8}>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}>{highRisks}</div>
                <Tag color="red" style={{ marginTop: 4 }}>高风险</Tag>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#faad14' }}>{mediumRisks}</div>
                <Tag color="orange" style={{ marginTop: 4 }}>中风险</Tag>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>{lowRisks}</div>
                <Tag color="green" style={{ marginTop: 4 }}>低风险</Tag>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 12 }}>风险类型分布</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Tag>权属风险: {ownershipRisks}</Tag>
              <Tag>合规风险: {complianceRisks}</Tag>
              <Tag>质量风险: {qualityRisks}</Tag>
              <Tag>安全风险: {securityRisks}</Tag>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {highRisks > 0 && (
                <Alert
                  message={`存在 ${highRisks} 项高风险，建议优先处理`}
                  type="error"
                  showIcon
                  icon={<AlertOutlined />}
                />
              )}
              {mediumRisks > 0 && highRisks === 0 && (
                <Alert
                  message={`存在 ${mediumRisks} 项中风险，需关注`}
                  type="warning"
                  showIcon
                />
              )}
              {highRisks === 0 && mediumRisks === 0 && risks.length > 0 && (
                <Alert message="整体风险可控" type="success" showIcon />
              )}
              {risks.length === 0 && (
                <Alert message="暂无风险记录" type="info" showIcon />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="asset-detail-card"
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <SafetyCertificateOutlined style={{ marginRight: 8 }} />
            风险清单
          </span>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRisk(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            添加风险
          </Button>
        }
      >
        {risks.length === 0 ? (
          <Empty description="暂无风险记录，请点击右上角添加风险" style={{ padding: '40px 0' }} />
        ) : (
          <Row gutter={[16, 16]}>
            {risks.map((risk) => (
              <Col span={12} key={risk.id}>
                <Card
                  size="small"
                  style={{
                    borderLeft: `4px solid ${
                      risk.level === 'high'
                        ? '#ff4d4f'
                        : risk.level === 'medium'
                        ? '#faad14'
                        : '#52c41a'
                    }`,
                  }}
                  title={
                    <Space>
                      {riskLevelIcon[risk.level]}
                      <span style={{ fontWeight: 600 }}>{risk.title}</span>
                      <Tag color={riskLevelColor[risk.level]}>{riskLevelLabel[risk.level]}</Tag>
                      <Tag>{riskTypeLabel[risk.type]}</Tag>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setEditingRisk(risk);
                            form.setFieldsValue(risk);
                            setIsModalOpen(true);
                          }}
                        />
                      </Tooltip>
                      <Popconfirm title="确认删除该风险？" onConfirm={() => removeRisk(asset.id, risk.id)}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  }
                >
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>风险描述</div>
                    <div>{risk.description}</div>
                  </div>
                  {risk.mitigation && (
                    <div style={{ padding: 12, background: '#f6ffed', borderRadius: 6, borderLeft: '3px solid #52c41a' }}>
                      <div style={{ fontSize: 12, color: '#389e0d', fontWeight: 600, marginBottom: 4 }}>
                        缓解措施
                      </div>
                      <div style={{ fontSize: 13 }}>{risk.mitigation}</div>
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        title={editingRisk ? '编辑风险' : '添加风险'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingRisk(null);
          form.resetFields();
        }}
        okText="保存"
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="type" label="风险类型" rules={[{ required: true, message: '请选择风险类型' }]}>
            <Select placeholder="请选择风险类型">
              <Option value="ownership">权属风险</Option>
              <Option value="compliance">合规风险</Option>
              <Option value="quality">质量风险</Option>
              <Option value="security">安全风险</Option>
            </Select>
          </Form.Item>
          <Form.Item name="level" label="风险等级" rules={[{ required: true, message: '请选择风险等级' }]}>
            <Select placeholder="请选择风险等级">
              <Option value="high">
                <Space>
                  <AlertOutlined style={{ color: '#ff4d4f' }} />
                  <span style={{ color: '#ff4d4f' }}>高风险</span>
                </Space>
              </Option>
              <Option value="medium">
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                  <span style={{ color: '#faad14' }}>中风险</span>
                </Space>
              </Option>
              <Option value="low">
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span style={{ color: '#52c41a' }}>低风险</span>
                </Space>
              </Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="风险标题" rules={[{ required: true, message: '请输入风险标题' }]}>
            <Input placeholder="简要描述该风险" maxLength={50} showCount />
          </Form.Item>
          <Form.Item name="description" label="风险详细描述" rules={[{ required: true, message: '请输入风险详细描述' }]}>
            <TextArea rows={3} placeholder="详细描述风险点和影响范围" />
          </Form.Item>
          <Form.Item name="mitigation" label="缓解措施/应对方案">
            <TextArea rows={3} placeholder="描述已采取或计划采取的风险缓解措施" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default RiskAlert;
