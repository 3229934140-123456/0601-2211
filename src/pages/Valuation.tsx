import { useState, useEffect } from 'react';
import {
  Card,
  Progress,
  Table,
  InputNumber,
  Button,
  Space,
  message,
  Tag,
  Row,
  Col,
  Tooltip,
  Statistic,
  Divider,
  Form,
  Select,
  Slider,
  Modal,
  Input,
} from 'antd';
import {
  InfoCircleOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { formatMoney, levelDescription, getLevelProgressColor, scenarioLabels } from '../utils';
import type { ColumnsType } from 'antd/es/table';
import type { ScoringCriterion, ScenarioType } from '../types';

const { Option } = Select;
const { TextArea } = Input;

function Valuation() {
  const { assets, selectedAssetId, updateScoringCriteria, recalculateScore, updateScenarioConfig, recalculateScenarios } = useAppStore();
  const asset = assets.find((a) => a.id === selectedAssetId);
  const [localCriteria, setLocalCriteria] = useState<ScoringCriterion[]>([]);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [scenarioModalOpen, setScenarioModalOpen] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<ScenarioType>('base');
  const [scenarioForm] = Form.useForm();
  const [weightForm] = Form.useForm();

  useEffect(() => {
    if (asset) {
      setLocalCriteria(JSON.parse(JSON.stringify(asset.scoringCriteria)));
    }
  }, [asset?.id]);

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

  const scenarioConfig = asset.scenarioConfig;
  const minValue = scenarioConfig ? Math.min(
    scenarioConfig.conservative.estimatedValue,
    scenarioConfig.base.estimatedValue,
    scenarioConfig.optimistic.estimatedValue
  ) : 0;
  const maxValue = scenarioConfig ? Math.max(
    scenarioConfig.conservative.estimatedValue,
    scenarioConfig.base.estimatedValue,
    scenarioConfig.optimistic.estimatedValue
  ) : 0;
  const avgPrice =
    asset.historicalPrices.length > 0
      ? asset.historicalPrices.reduce((s, p) => s + p.price, 0) / asset.historicalPrices.length
      : 500000;

  const totalWeight = localCriteria.reduce((sum, c) => sum + c.weight, 0);

  const handleScoreChange = (id: string, score: number) => {
    setLocalCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, score } : c))
    );
  };

  const handleWeightChange = (id: string, weight: number) => {
    setLocalCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weight } : c))
    );
  };

  const handleSave = () => {
    if (totalWeight !== 100) {
      message.warning(`权重总和需为100，当前为 ${totalWeight}`);
      return;
    }
    updateScoringCriteria(asset.id, localCriteria);
    message.success('评分已保存并重新计算，情景测算数据已同步更新');
  };

  const handleResetWeights = async () => {
    try {
      const values = await weightForm.validateFields();
      setLocalCriteria((prev) => {
        const categories = [...new Set(prev.map((c) => c.category))];
        const catWeight = values.categoryWeight;
        const perCatWeight = Math.floor(catWeight / categories.length);

        return prev.map((c, idx) => {
          const sameCatItems = prev.filter((p) => p.category === c.category);
          const perItemWeight = Math.floor(perCatWeight / sameCatItems.length);
          if (idx === prev.length - 1) {
            const calcTotal = prev.slice(0, -1).reduce((s, p) => {
              const sc = prev.filter((x) => x.category === p.category);
              return s + Math.floor(perCatWeight / sc.length);
            }, 0);
            return { ...c, weight: Math.max(0, catWeight - calcTotal) };
          }
          return { ...c, weight: perItemWeight };
        });
      });
      setWeightModalOpen(false);
      message.info('权重已重新分配，请检查后保存');
    } catch {
      // validation failed
    }
  };

  const openScenarioModal = (type: ScenarioType) => {
    setCurrentScenario(type);
    const scenario = scenarioConfig?.[type];
    if (scenario) {
      scenarioForm.setFieldsValue({
        priceMultiplier: scenario.priceMultiplier,
        scoreMultiplier: scenario.scoreMultiplier,
        note: scenario.note,
      });
    }
    setScenarioModalOpen(true);
  };

  const handleSaveScenario = async () => {
    try {
      const values = await scenarioForm.validateFields();
      updateScenarioConfig(asset.id, currentScenario, {
        priceMultiplier: values.priceMultiplier,
        scoreMultiplier: values.scoreMultiplier,
        note: values.note,
      });
      setScenarioModalOpen(false);
      message.success('情景参数已保存，估值已重新计算');
    } catch {
      // validation failed
    }
  };

  const columns: ColumnsType<ScoringCriterion> = [
    {
      title: '评估维度',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text, record, index) => {
        if (index === 0 || localCriteria[index - 1].category !== text) {
          const rowSpan = localCriteria.filter((c) => c.category === text).length;
          return {
            children: <Tag color="blue">{text}</Tag>,
            props: { rowSpan },
          };
        }
        return { props: { rowSpan: 0 } };
      },
    },
    {
      title: '评分指标',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          <Tooltip title={record.description}>
            <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '权重（%）',
      dataIndex: 'weight',
      key: 'weight',
      width: 160,
      render: (weight: number, record) => (
        <InputNumber
          min={0}
          max={100}
          value={weight}
          onChange={(val) => handleWeightChange(record.id, val as number)}
          style={{ width: 100 }}
          addonAfter="%"
        />
      ),
    },
    {
      title: '评分（0-100）',
      dataIndex: 'score',
      key: 'score',
      width: 320,
      render: (score: number, record) => (
        <Space style={{ width: '100%' }}>
          <Slider
            min={0}
            max={100}
            value={score}
            onChange={(val) => handleScoreChange(record.id, val as number)}
            style={{ flex: 1 }}
            tooltip={{ formatter: (val) => `${val} 分` }}
          />
          <InputNumber
            min={0}
            max={100}
            value={score}
            onChange={(val) => handleScoreChange(record.id, val as number)}
            style={{ width: 80 }}
          />
        </Space>
      ),
    },
    {
      title: '加权得分',
      key: 'weighted',
      width: 120,
      render: (_, record) => {
        const weighted = totalWeight > 0 ? ((record.score * record.weight) / totalWeight).toFixed(1) : '0.0';
        return (
          <span style={{ fontWeight: 600, color: '#1677ff', fontSize: 15 }}>
            {weighted}
          </span>
        );
      },
    },
  ];

  const categoryStats = localCriteria.reduce<Record<string, { weight: number; score: number }>>((acc, c) => {
    if (!acc[c.category]) {
      acc[c.category] = { weight: 0, score: 0 };
    }
    acc[c.category].weight += c.weight;
    acc[c.category].score += c.score * c.weight;
    return acc;
  }, {});

  const renderScenarioCard = (type: ScenarioType) => {
    const scenario = scenarioConfig?.[type];
    if (!scenario) return null;
    const labelInfo = scenarioLabels[type];
    const Icon = type === 'conservative' ? FallOutlined : type === 'optimistic' ? RiseOutlined : MinusOutlined;

    return (
      <Card
        size="small"
        style={{
          border: `2px solid ${labelInfo.color}`,
          background: type === 'base' ? '#f0f5ff' : '#fff',
          cursor: 'pointer',
        }}
        onClick={() => openScenarioModal(type)}
        hoverable
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Tag color={labelInfo.color} icon={<Icon />}>
            {labelInfo.label}情景
          </Tag>
          <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
            价格×{scenario.priceMultiplier} 评分×{scenario.scoreMultiplier}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginBottom: 2 }}>综合评分</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: getLevelProgressColor(scenario.totalScore) }}>
              {scenario.totalScore}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginBottom: 2 }}>估值等级</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{scenario.valuationLevel}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginBottom: 2 }}>预估价值</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: labelInfo.color }}>
              {formatMoney(scenario.estimatedValue)}
            </div>
          </div>
        </div>
        {scenario.note && (
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #f0f0f0' }}>
            {scenario.note}
          </div>
        )}
        <div style={{ textAlign: 'right', marginTop: 8, fontSize: 11, color: '#1677ff' }}>
          点击调整参数 →
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card className="stat-card" size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div className="score-circle">
                <Progress
                  type="circle"
                  percent={asset.totalScore}
                  size={110}
                  strokeColor={getLevelProgressColor(asset.totalScore)}
                  format={(p) => <span style={{ fontSize: 24, fontWeight: 700 }}>{p}</span>}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>综合评分</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`level-badge level-${asset.valuationLevel}`} style={{ fontSize: 18 }}>
                    {asset.valuationLevel}
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>级</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 6, maxWidth: 140 }}>
                  {levelDescription[asset.valuationLevel]}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card" size="small">
            <Statistic
              title="预估资产价值"
              value={asset.estimatedValue}
              precision={0}
              prefix="¥"
              valueStyle={{ fontSize: 28, color: '#52c41a' }}
              formatter={(v) => (v as number).toLocaleString()}
            />
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 8 }}>
              基于评分模型和历史交易数据综合计算
            </div>
            <div style={{ fontSize: 12, color: '#1677ff', marginTop: 4 }}>
              历史均价：{formatMoney(Math.round(avgPrice))}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card" size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>权重校验</span>
              <Tag color={totalWeight === 100 ? 'green' : 'orange'}>
                {totalWeight === 100 ? '✓ 已达标' : `需调整（共 ${totalWeight}%）`}
              </Tag>
            </div>
            <Progress
              percent={totalWeight}
              showInfo={false}
              strokeColor={totalWeight === 100 ? '#52c41a' : '#faad14'}
              style={{ marginBottom: 8 }}
            />
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              目标权重总和：100%，当前：{totalWeight}%
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="asset-detail-card"
        style={{ marginBottom: 16 }}
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <ExperimentOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            情景测算 · 预估价值区间
          </span>
        }
        extra={
          <Button size="small" icon={<ReloadOutlined />} onClick={() => recalculateScenarios(asset.id)}>
            重置为默认
          </Button>
        }
      >
        <div style={{ padding: '8px 16px 16px', background: '#fafafa', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
                预估价值区间（保守 → 乐观）
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{formatMoney(minValue)}</span>
                <span style={{ fontSize: 18, color: '#d9d9d9' }}>~</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>{formatMoney(maxValue)}</span>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginLeft: 12 }}>
                  区间价差：{formatMoney(maxValue - minValue)}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>
                基准情景估值
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1677ff' }}>
                {formatMoney(asset.estimatedValue)}
              </div>
            </div>
          </div>
        </div>
        <Row gutter={[16, 16]}>
          <Col span={8}>{renderScenarioCard('conservative')}</Col>
          <Col span={8}>{renderScenarioCard('base')}</Col>
          <Col span={8}>{renderScenarioCard('optimistic')}</Col>
        </Row>
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 12, textAlign: 'center' }}>
          点击各情景卡片可调整价格系数和评分系数，测算依据将同步到报告中心
        </div>
      </Card>

      <Card className="asset-detail-card" style={{ marginBottom: 16 }}>
        <div className="form-section-title">维度得分分布</div>
        <Row gutter={[16, 16]}>
          {Object.entries(categoryStats).map(([cat, stats]) => {
            const avgScore = stats.weight > 0 ? Math.round((stats.score / stats.weight) * 10) / 10 : 0;
            return (
              <Col span={8} key={cat}>
                <div style={{ padding: 16, background: '#fafafa', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Tag color="blue">{cat}</Tag>
                    <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>权重 {stats.weight}%</span>
                  </div>
                  <Progress
                    percent={avgScore}
                    strokeColor={getLevelProgressColor(avgScore as number)}
                    format={(p) => <span style={{ color: getLevelProgressColor(avgScore as number) }}>{p}分</span>}
                  />
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card
        className="asset-detail-card"
        title={<span className="form-section-title" style={{ marginBottom: 0 }}><SafetyCertificateOutlined style={{ marginRight: 8 }} />评分配置与权重管理</span>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => setWeightModalOpen(true)}>
              权重快速分配
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              disabled={totalWeight !== 100}
            >
              保存并重新计算
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={localCriteria}
          rowKey="id"
          pagination={false}
          bordered
          size="middle"
        />
        <Divider style={{ margin: '20px 0 12px' }} />
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>总权重</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: totalWeight === 100 ? '#52c41a' : '#faad14' }}>
                {totalWeight}%
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ padding: 12, background: '#e6f4ff', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>预估综合得分</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1677ff' }}>
                {totalWeight > 0
                  ? (localCriteria.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight).toFixed(1)
                  : '0.0'}
                分
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ padding: 12, background: '#f6ffed', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>预估价值变化</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
                {formatMoney(
                  totalWeight > 0
                    ? Math.round(
                        (asset.historicalPrices.length > 0
                          ? asset.historicalPrices.reduce((s, p) => s + p.price, 0) / asset.historicalPrices.length
                          : 500000) *
                          (0.5 +
                            (localCriteria.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight / 100) * 1.5)
                      )
                    : 0
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Modal
        title="权重快速分配"
        open={weightModalOpen}
        onOk={handleResetWeights}
        onCancel={() => setWeightModalOpen(false)}
        okText="应用"
      >
        <Form form={weightForm} layout="vertical" style={{ marginTop: 16 }} initialValues={{ categoryWeight: 100 }}>
          <Form.Item
            label="总权重分配（%）"
            name="categoryWeight"
            rules={[{ required: true, message: '请输入总权重' }]}
          >
            <Select>
              <Option value={100}>总计 100%（推荐，均匀分配）</Option>
              <Option value={80}>总计 80%（保守分配）</Option>
              <Option value={120}>总计 120%（激进分配，需调整）</Option>
            </Select>
          </Form.Item>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', padding: 12, background: '#fafafa', borderRadius: 6 }}>
            系统将按照维度均匀分配权重，应用后可手动微调各指标权重。
          </div>
        </Form>
      </Modal>

      <Modal
        title={`${scenarioLabels[currentScenario].label}情景参数配置`}
        open={scenarioModalOpen}
        onOk={handleSaveScenario}
        onCancel={() => setScenarioModalOpen(false)}
        okText="保存并重新测算"
        width={480}
      >
        <Form form={scenarioForm} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 6, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginBottom: 4 }}>
              {scenarioLabels[currentScenario].desc}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
              当前历史均价：{formatMoney(Math.round(avgPrice))}，当前综合评分：{asset.totalScore}分
            </div>
          </div>
          <Form.Item
            label="历史均价系数"
            name="priceMultiplier"
            rules={[
              { required: true, message: '请输入价格系数' },
              { type: 'number', min: 0.5, max: 2, message: '系数范围 0.5 - 2.0' },
            ]}
            extra="对历史交易均价进行调整：0.5（下限）→ 1.0（基准）→ 2.0（上限）"
          >
            <InputNumber
              min={0.5}
              max={2}
              step={0.1}
              style={{ width: '100%' }}
              placeholder="例如：0.8 表示按历史均价的80%测算"
            />
          </Form.Item>
          <Form.Item
            label="评分系数"
            name="scoreMultiplier"
            rules={[
              { required: true, message: '请输入评分系数' },
              { type: 'number', min: 0.8, max: 1.2, message: '系数范围 0.8 - 1.2' },
            ]}
            extra="对综合评分进行调整：0.8（扣减10%）→ 1.0（基准）→ 1.2（增加10%）"
          >
            <InputNumber
              min={0.8}
              max={1.2}
              step={0.05}
              style={{ width: '100%' }}
              placeholder="例如：0.9 表示按综合评分的90%测算"
            />
          </Form.Item>
          <Form.Item
            label="测算说明"
            name="note"
            rules={[{ max: 100, message: '不超过100字' }]}
          >
            <TextArea rows={2} placeholder="可选，描述该情景的假设条件和依据" maxLength={100} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Valuation;
