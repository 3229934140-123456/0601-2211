import { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Descriptions,
  Tag,
  Divider,
  Table,
  Radio,
  Select,
  Form,
  message,
  Empty,
  Progress,
  Alert,
  List,
  Statistic,
} from 'antd';
import {
  DatabaseOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PrinterOutlined,
  FileExcelOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import {
  formatMoney,
  formatDate,
  frequencyLabel,
  levelDescription,
  riskLevelLabel,
  riskTypeLabel,
  formatDateTime,
  exportToJSON,
} from '../utils';
import type { ColumnsType } from 'antd/es/table';
import { DataAsset } from '../types';

const { Option } = Select;

function ReportCenter() {
  const { assets, selectedAssetId, industryFilter } = useAppStore();
  const asset = assets.find((a) => a.id === selectedAssetId);

  const [reportType, setReportType] = useState<'single' | 'summary'>('single');
  const [includeSections, setIncludeSections] = useState<string[]>([
    'basic',
    'metrics',
    'valuation',
    'risk',
    'quote',
    'approval',
  ]);
  const [form] = Form.useForm();

  const filteredAssets =
    industryFilter === 'all' ? assets : assets.filter((a) => a.industry === industryFilter);

  const handleExportPDF = async () => {
    if (!asset && reportType === 'single') {
      message.warning('请先选择一个数据资产');
      return;
    }
    try {
      message.loading({ content: '正在生成 PDF 报告...', key: 'pdf', duration: 0 });
      const { jsPDF } = await import('jspdf');
      import('jspdf-autotable');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      const addText = (text: string, size = 12, style: 'normal' | 'bold' = 'normal', indent = 14) => {
        doc.setFont('helvetica', style as any);
        doc.setFontSize(size);
        doc.text(text, indent, y);
        y += size * 0.6 + 4;
      };

      addText('Data Asset Valuation Report', 18, 'bold');
      addText('====================================', 10);
      addText(`Generated: ${formatDateTime(new Date().toISOString())}`, 10);
      addText(`Report Type: ${reportType === 'single' ? 'Single Asset Report' : 'Summary Report'}`, 10);

      if (reportType === 'single' && asset) {
        y += 4;
        addText('1. Basic Information', 14, 'bold');
        addText(`Asset Name: ${asset.name}`, 11);
        addText(`Asset Code: ${asset.code}`, 11);
        addText(`Category: ${asset.category}`, 11);
        addText(`Industry: ${asset.industry}`, 11);
        addText(`Owner: ${asset.owner || 'N/A'}`, 11);
        addText(`Department: ${asset.department || 'N/A'}`, 11);
        addText(`Status: ${asset.status.toUpperCase()}`, 11);

        if (includeSections.includes('valuation')) {
          y += 4;
          addText('2. Valuation Result', 14, 'bold');
          addText(`Valuation Level: ${asset.valuationLevel}`, 11);
          addText(`Total Score: ${asset.totalScore}/100`, 11);
          addText(`Estimated Value: ${formatMoney(asset.estimatedValue)}`, 11);

          const tableData = asset.scoringCriteria.map((c) => [
            c.category,
            c.name,
            `${c.weight}%`,
            `${c.score}`,
            `${((c.weight * c.score) / 100).toFixed(1)}`,
          ]);

          (doc as any).autoTable({
            startY: y,
            head: [['Category', 'Criterion', 'Weight', 'Score', 'Weighted']],
            body: tableData,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [22, 119, 255] },
          });
          y = (doc as any).lastAutoTable.finalY + 10;
        }

        if (includeSections.includes('risk')) {
          y += 4;
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          addText('3. Risk Assessment', 14, 'bold');
          if (asset.risks.length > 0) {
            const riskData = asset.risks.map((r) => [
              riskTypeLabel[r.type],
              riskLevelLabel[r.level],
              r.title,
              r.description.substring(0, 50),
            ]);
            (doc as any).autoTable({
              startY: y,
              head: [['Type', 'Level', 'Title', 'Description']],
              body: riskData,
              styles: { fontSize: 9 },
              headStyles: { fillColor: [250, 173, 20] },
            });
            y = (doc as any).lastAutoTable.finalY + 10;
          } else {
            addText('No risks identified.', 11);
          }
        }

        if (includeSections.includes('quote')) {
          y += 4;
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          addText('4. Quote Schemes', 14, 'bold');
          if (asset.quoteSchemes.length > 0) {
            const quoteData = asset.quoteSchemes.map((q) => [
              q.name,
              q.pricingModel,
              formatMoney(q.basePrice),
              formatMoney(q.serviceCosts.reduce((s, c) => s + c.amount, 0)),
              formatMoney(q.totalPrice),
              q.isRecommended ? 'Yes' : 'No',
            ]);
            (doc as any).autoTable({
              startY: y,
              head: [['Name', 'Model', 'Base', 'Services', 'Total', 'Recommended']],
              body: quoteData,
              styles: { fontSize: 9 },
              headStyles: { fillColor: [82, 196, 26] },
            });
            y = (doc as any).lastAutoTable.finalY + 10;
          } else {
            addText('No quote schemes defined.', 11);
          }
        }
      } else {
        y += 4;
        addText('Asset Summary Statistics', 14, 'bold');
        addText(`Total Assets: ${filteredAssets.length}`, 11);
        const totalValue = filteredAssets.reduce((s, a) => s + a.estimatedValue, 0);
        addText(`Total Estimated Value: ${formatMoney(totalValue)}`, 11);

        const summaryData = filteredAssets.map((a) => [
          a.code,
          a.name.substring(0, 20),
          a.industry,
          a.valuationLevel,
          `${a.totalScore}`,
          formatMoney(a.estimatedValue),
          a.status,
        ]);
        (doc as any).autoTable({
          startY: y,
          head: [['Code', 'Name', 'Industry', 'Level', 'Score', 'Value', 'Status']],
          body: summaryData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [22, 119, 255] },
        });
      }

      const buffer = doc.output('arraybuffer');
      if ((window as any).electronAPI) {
        await (window as any).electronAPI.exportPdf(
          buffer,
          `valuation-report-${Date.now()}.pdf`
        );
      } else {
        const blob = new Blob([buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `valuation-report-${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
      message.success({ content: '报告导出成功', key: 'pdf' });
    } catch (error) {
      console.error(error);
      message.error({ content: '报告导出失败', key: 'pdf' });
    }
  };

  const handleExportJSON = () => {
    const exportData = reportType === 'single' ? asset : filteredAssets;
    if (!exportData) {
      message.warning('请先选择数据资产');
      return;
    }
    exportToJSON(
      exportData,
      `${reportType === 'single' ? 'asset' : 'assets'}-valuation-${Date.now()}.json`
    );
    message.success('导出成功');
  };

  const handlePrint = () => {
    window.print();
  };

  const summaryColumns: ColumnsType<DataAsset> = [
    { title: '编号', dataIndex: 'code', key: 'code', width: 120 },
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (t) => <span style={{ fontWeight: 600 }}>{t}</span>,
    },
    { title: '行业', dataIndex: 'industry', key: 'industry', width: 100 },
    {
      title: '等级',
      dataIndex: 'valuationLevel',
      key: 'valuationLevel',
      width: 80,
      render: (l) => <span className={`level-badge level-${l}`}>{l}</span>,
    },
    { title: '评分', dataIndex: 'totalScore', key: 'totalScore', width: 80, render: (s) => <span style={{ fontWeight: 600 }}>{s}</span> },
    {
      title: '预估价值',
      dataIndex: 'estimatedValue',
      key: 'estimatedValue',
      width: 140,
      render: (v) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{formatMoney(v)}</span>,
    },
    { title: '负责人', dataIndex: 'owner', key: 'owner', width: 100 },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (d) => formatDate(d, 'YYYY-MM-DD HH:mm'),
    },
  ];

  const totalValue = filteredAssets.reduce((s, a) => s + a.estimatedValue, 0);
  const avgScore =
    filteredAssets.length > 0
      ? (filteredAssets.reduce((s, a) => s + a.totalScore, 0) / filteredAssets.length).toFixed(1)
      : '0';
  const approvedCount = filteredAssets.filter((a) => a.status === 'approved').length;
  const levelDistribution = filteredAssets.reduce<Record<string, number>>((acc, a) => {
    acc[a.valuationLevel] = (acc[a.valuationLevel] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title="报告资产数"
              value={reportType === 'single' ? 1 : filteredAssets.length}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title={reportType === 'single' ? '预估价值' : '总预估价值'}
              value={reportType === 'single' && asset ? asset.estimatedValue : totalValue}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              formatter={(v) => (v as number).toLocaleString()}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic
              title={reportType === 'single' ? '综合评分' : '平均评分'}
              value={reportType === 'single' && asset ? asset.totalScore : avgScore}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" size="small">
            <Statistic title="已通过审核" value={approvedCount} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
      </Row>

      <Card
        className="asset-detail-card"
        style={{ marginBottom: 16 }}
        title={<span className="form-section-title" style={{ marginBottom: 0 }}><FileTextOutlined style={{ marginRight: 8 }} />报告配置</span>}
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              打印
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={handleExportJSON}>
              导出 JSON
            </Button>
            <Button type="primary" icon={<FilePdfOutlined />} onClick={handleExportPDF}>
              导出 PDF 报告
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 4 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="报告类型">
                <Radio.Group value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <Radio.Button value="single">单资产报告</Radio.Button>
                  <Radio.Button value="summary">资产汇总报告</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            {reportType === 'single' && (
              <Col span={12}>
                <Form.Item label="包含章节">
                  <Select
                    mode="multiple"
                    value={includeSections}
                    onChange={setIncludeSections}
                    style={{ width: '100%' }}
                    placeholder="选择报告包含的章节"
                  >
                    <Option value="basic">基本信息</Option>
                    <Option value="metrics">指标数据</Option>
                    <Option value="valuation">价值评估</Option>
                    <Option value="risk">风险分析</Option>
                    <Option value="quote">报价方案</Option>
                    <Option value="approval">审批记录</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>
        </Form>
      </Card>

      <Card
        className="asset-detail-card"
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <FileSearchOutlined style={{ marginRight: 8 }} />
            {reportType === 'single' ? '单资产估值报告预览' : '资产汇总报告预览'}
          </span>
        }
      >
        {reportType === 'single' ? (
          asset ? (
            <div>
              {includeSections.includes('basic') && (
                <>
                  <h3 style={{ marginBottom: 12 }}>一、资产基本信息</h3>
                  <Descriptions bordered size="small" column={3} style={{ marginBottom: 24 }}>
                    <Descriptions.Item label="资产名称">{asset.name}</Descriptions.Item>
                    <Descriptions.Item label="资产编号">{asset.code}</Descriptions.Item>
                    <Descriptions.Item label="资产分类">{asset.category}</Descriptions.Item>
                    <Descriptions.Item label="所属行业">{asset.industry}</Descriptions.Item>
                    <Descriptions.Item label="负责人">{asset.owner || '未指定'}</Descriptions.Item>
                    <Descriptions.Item label="所属部门">{asset.department || '未指定'}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{formatDate(asset.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="更新时间">{formatDate(asset.updatedAt, 'YYYY-MM-DD HH:mm')}</Descriptions.Item>
                    <Descriptions.Item label="当前状态">
                      <Tag color={asset.status === 'approved' ? 'green' : asset.status === 'pending' ? 'blue' : 'default'}>
                        {asset.status.toUpperCase()}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="资产描述" span={3}>
                      {asset.description}
                    </Descriptions.Item>
                  </Descriptions>
                </>
              )}

              {includeSections.includes('metrics') && (
                <>
                  <h3 style={{ marginBottom: 12 }}>二、指标数据</h3>
                  <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
                    <Descriptions.Item label="更新频率">{frequencyLabel[asset.updateFrequency]}</Descriptions.Item>
                    <Descriptions.Item label="最近更新">{formatDate(asset.lastUpdated)}</Descriptions.Item>
                    <Descriptions.Item label="数据规模">{asset.dataVolume || '-'}</Descriptions.Item>
                    <Descriptions.Item label="数据来源">
                      <Space wrap>
                        {asset.dataSources.map((s) => (
                          <Tag key={s.id} color="blue">
                            {s.name}
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="覆盖地区" span={2}>
                      <Space wrap>
                        {asset.coverageScope.regions.map((r) => (
                          <Tag key={r}>{r}</Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="覆盖行业">
                      <Space wrap>
                        {asset.coverageScope.industries.map((i) => (
                          <Tag key={i} color="green">
                            {i}
                          </Tag>
                        ))}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="应用场景" span={3}>
                      <List
                        size="small"
                        dataSource={asset.applicationScenarios}
                        renderItem={(s) => (
                          <List.Item>
                            <List.Item.Meta
                              title={`${s.name}（${s.category}）`}
                              description={s.description}
                            />
                          </List.Item>
                        )}
                      />
                    </Descriptions.Item>
                  </Descriptions>

                  {asset.historicalPrices.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>历史交易记录：</div>
                      <Table
                        size="small"
                        dataSource={asset.historicalPrices}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          { title: '日期', dataIndex: 'date', key: 'date', width: 120, render: (d) => formatDate(d) },
                          { title: '价格', dataIndex: 'price', key: 'price', width: 140, render: (p) => formatMoney(p) },
                          { title: '受让方', dataIndex: 'buyer', key: 'buyer', width: 180 },
                          { title: '交易类型', dataIndex: 'transactionType', key: 'type', width: 120 },
                          { title: '备注', dataIndex: 'notes', key: 'notes' },
                        ]}
                      />
                    </div>
                  )}
                </>
              )}

              {includeSections.includes('valuation') && (
                <>
                  <h3 style={{ marginBottom: 12 }}>三、价值评估</h3>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={8}>
                      <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>估值等级</div>
                        <span className={`level-badge level-${asset.valuationLevel}`} style={{ fontSize: 24 }}>
                          {asset.valuationLevel}
                        </span>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>综合评分</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff' }}>{asset.totalScore}</div>
                        <Progress percent={asset.totalScore} showInfo={false} style={{ marginTop: 8 }} />
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 4 }}>预估价值</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{formatMoney(asset.estimatedValue)}</div>
                      </div>
                    </Col>
                  </Row>
                  <Alert
                    message={`等级说明：${levelDescription[asset.valuationLevel]}`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Table
                    size="small"
                    dataSource={asset.scoringCriteria}
                    rowKey="id"
                    pagination={false}
                    bordered
                    columns={[
                      { title: '维度', dataIndex: 'category', key: 'cat', width: 120 },
                      { title: '指标', dataIndex: 'name', key: 'name' },
                      { title: '权重', dataIndex: 'weight', key: 'weight', width: 100, render: (w) => `${w}%` },
                      { title: '评分', dataIndex: 'score', key: 'score', width: 100 },
                      {
                        title: '加权得分',
                        key: 'weighted',
                        width: 120,
                        render: (_, r) => ((r.weight * r.score) / 100).toFixed(1),
                      },
                    ]}
                  />
                  <Divider />
                </>
              )}

              {includeSections.includes('risk') && (
                <>
                  <h3 style={{ marginBottom: 12 }}>四、风险提示</h3>
                  {asset.risks.length === 0 ? (
                    <Empty description="暂无风险记录" style={{ padding: '24px 0', marginBottom: 24 }} />
                  ) : (
                    <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                      {asset.risks.map((risk) => (
                        <Col span={12} key={risk.id}>
                          <div
                            style={{
                              padding: 16,
                              borderLeft: `4px solid ${
                                risk.level === 'high' ? '#ff4d4f' : risk.level === 'medium' ? '#faad14' : '#52c41a'
                              }`,
                              background: '#fafafa',
                              borderRadius: 6,
                            }}
                          >
                            <Space style={{ marginBottom: 8 }}>
                              {risk.level === 'high' ? (
                                <WarningOutlined style={{ color: '#ff4d4f' }} />
                              ) : risk.level === 'medium' ? (
                                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                              ) : (
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              )}
                              <span style={{ fontWeight: 600 }}>{risk.title}</span>
                              <Tag color={risk.level === 'high' ? 'red' : risk.level === 'medium' ? 'orange' : 'green'}>
                                {riskLevelLabel[risk.level]}
                              </Tag>
                              <Tag>{riskTypeLabel[risk.type]}</Tag>
                            </Space>
                            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.7)', marginBottom: 8 }}>
                              {risk.description}
                            </div>
                            {risk.mitigation && (
                              <div style={{ fontSize: 12, color: '#389e0d', padding: 8, background: '#f6ffed', borderRadius: 4 }}>
                                <SafetyCertificateOutlined /> 缓解措施：{risk.mitigation}
                              </div>
                            )}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </>
              )}

              {includeSections.includes('quote') && (
                <>
                  <h3 style={{ marginBottom: 12 }}>五、报价方案</h3>
                  {asset.quoteSchemes.length === 0 ? (
                    <Empty description="暂无报价方案" style={{ padding: '24px 0', marginBottom: 24 }} />
                  ) : (
                    <Table
                      size="small"
                      dataSource={asset.quoteSchemes}
                      rowKey="id"
                      pagination={false}
                      bordered
                      style={{ marginBottom: 24 }}
                      columns={[
                        {
                          title: '方案名称',
                          dataIndex: 'name',
                          key: 'name',
                          render: (t, r) => (
                            <Space>
                              <span style={{ fontWeight: 600 }}>{t}</span>
                              {r.isRecommended && <Tag color="orange">推荐</Tag>}
                              {asset.selectedQuoteId === r.id && <Tag color="blue">已选</Tag>}
                            </Space>
                          ),
                        },
                        { title: '定价模式', dataIndex: 'pricingModel', key: 'model', width: 120 },
                        { title: '基础价格', dataIndex: 'basePrice', key: 'base', width: 140, render: (v) => formatMoney(v) },
                        {
                          title: '服务成本',
                          key: 'svc',
                          width: 140,
                          render: (_, r) => formatMoney(r.serviceCosts.reduce((s, c) => s + c.amount, 0)),
                        },
                        {
                          title: '总报价',
                          dataIndex: 'totalPrice',
                          key: 'total',
                          width: 160,
                          render: (v) => <span style={{ fontWeight: 700, color: '#1677ff', fontSize: 16 }}>{formatMoney(v)}</span>,
                        },
                        { title: '描述', dataIndex: 'description', key: 'desc' },
                      ]}
                    />
                  )}
                </>
              )}

              {includeSections.includes('approval') && (
                <>
                  <h3 style={{ marginBottom: 12 }}>六、审批记录</h3>
                  {asset.approvalRecords.length === 0 ? (
                    <Empty description="暂无审批记录" style={{ padding: '24px 0' }} />
                  ) : (
                    <List
                      itemLayout="horizontal"
                      dataSource={[...asset.approvalRecords].sort(
                        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                      )}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<HistoryOutlined style={{ fontSize: 20, color: '#1677ff' }} />}
                            title={
                              <Space>
                                <span style={{ fontWeight: 600 }}>{item.approver}</span>
                                <Tag>{item.role}</Tag>
                                <Tag color="blue">{item.action.toUpperCase()}</Tag>
                                <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                                  {formatDateTime(item.timestamp)}
                                </span>
                              </Space>
                            }
                            description={item.comment}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <Empty description="请先选择一个数据资产" />
          )
        ) : (
          <div>
            <Row gutter={16} style={{ marginBottom: 20 }}>
              {['S', 'A', 'B', 'C', 'D'].map((level) => (
                <Col span={4} key={level}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#fafafa', borderRadius: 6 }}>
                    <span className={`level-badge level-${level}`} style={{ fontSize: 18 }}>
                      {level}
                    </span>
                    <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>
                      {levelDistribution[level] || 0}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>项</div>
                  </div>
                </Col>
              ))}
              <Col span={4}>
                <div style={{ textAlign: 'center', padding: 12, background: '#e6f4ff', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>总价值</div>
                  <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: '#1677ff' }}>
                    {formatMoney(totalValue)}
                  </div>
                </div>
              </Col>
            </Row>
            <Table
              columns={summaryColumns}
              dataSource={filteredAssets}
              rowKey="id"
              size="small"
              bordered
              pagination={{ pageSize: 20, showSizeChanger: true }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

export default ReportCenter;
