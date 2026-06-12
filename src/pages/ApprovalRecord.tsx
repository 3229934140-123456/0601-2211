import { useState } from 'react';
import {
  Card,
  Timeline,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Avatar,
  message,
  Row,
  Col,
  Descriptions,
  Empty,
  Tooltip,
  Divider,
  Select,
  Badge,
  Popover,
} from 'antd';
import {
  DatabaseOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
  EditOutlined,
  MessageOutlined,
  HistoryOutlined,
  EyeOutlined,
  DiffOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import { formatDateTime, approvalActionLabel, statusLabel, statusColor, formatMoney } from '../utils';
import type { ApprovalRecord as ApprovalRecordType } from '../types';

const { TextArea } = Input;
const { Option } = Select;

const actionIcon: Record<string, React.ReactNode> = {
  submit: <SendOutlined style={{ color: '#1677ff' }} />,
  approve: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  reject: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  review: <MessageOutlined style={{ color: '#722ed1' }} />,
  modify: <EditOutlined style={{ color: '#faad14' }} />,
};

const actionColor: Record<string, string> = {
  submit: '#1677ff',
  approve: '#52c41a',
  reject: '#ff4d4f',
  review: '#722ed1',
  modify: '#faad14',
};

function ApprovalRecordPage() {
  const { assets, selectedAssetId, addApprovalRecord, submitForReview, updateAsset } = useAppStore();
  const asset = assets.find((a) => a.id === selectedAssetId);

  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState<ApprovalRecordType | null>(null);
  const [actionForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

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

  const handleSubmit = async () => {
    try {
      const values = await actionForm.validateFields();
      submitForReview(asset.id, values.comment, '产品经理');
      setSubmitModalOpen(false);
      actionForm.resetFields();
      message.success('已提交审核');
    } catch {
      // validation failed
    }
  };

  const handleReview = async () => {
    try {
      const values = await reviewForm.validateFields();
      if (values.action === 'approve') {
        addApprovalRecord(asset.id, {
          assetId: asset.id,
          approver: values.approver || '审核员',
          role: '风控审核员',
          action: 'approve',
          comment: values.comment,
        });
        updateAsset(asset.id, { status: 'approved' });
        message.success('审核通过');
      } else if (values.action === 'reject') {
        addApprovalRecord(asset.id, {
          assetId: asset.id,
          approver: values.approver || '审核员',
          role: '风控审核员',
          action: 'reject',
          comment: values.comment,
        });
        updateAsset(asset.id, { status: 'rejected' });
        message.success('已驳回');
      } else {
        addApprovalRecord(asset.id, {
          assetId: asset.id,
          approver: values.approver || '审核员',
          role: '风控审核员',
          action: 'review',
          comment: values.comment,
        });
        message.success('评审意见已记录');
      }
      setReviewModalOpen(false);
      reviewForm.resetFields();
    } catch {
      // validation failed
    }
  };

  const sortedRecords = [...asset.approvalRecords].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card className="asset-detail-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{asset.name}</span>
                  <Badge status={statusColor[asset.status] as any} text={statusLabel[asset.status]} />
                </div>
                <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>
                  编号: {asset.code} | 负责人: {asset.owner || '未指定'} | 所属部门: {asset.department || '未指定'}
                </div>
              </div>
              <Space>
                {asset.status !== 'pending' && asset.status !== 'approved' && (
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => {
                      actionForm.resetFields();
                      setSubmitModalOpen(true);
                    }}
                  >
                    提交复核
                  </Button>
                )}
                {asset.status === 'pending' && (
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    onClick={() => {
                      reviewForm.resetFields();
                      setReviewModalOpen(true);
                    }}
                  >
                    处理审核
                  </Button>
                )}
              </Space>
            </div>
            <Divider style={{ margin: '16px 0' }} />
            <Descriptions column={4} size="small">
              <Descriptions.Item label="估值等级">
                <span className={`level-badge level-${asset.valuationLevel}`}>{asset.valuationLevel}</span>
              </Descriptions.Item>
              <Descriptions.Item label="综合评分">{asset.totalScore}</Descriptions.Item>
              <Descriptions.Item label="预估价值">{formatMoney(asset.estimatedValue)}</Descriptions.Item>
              <Descriptions.Item label="报价方案">{asset.quoteSchemes.length} 套</Descriptions.Item>
              <Descriptions.Item label="风险项">{asset.risks.length} 项</Descriptions.Item>
              <Descriptions.Item label="应用场景">{asset.applicationScenarios.length} 个</Descriptions.Item>
              <Descriptions.Item label="数据源">{asset.dataSources.length} 个</Descriptions.Item>
              <Descriptions.Item label="历史交易">{asset.historicalPrices.length} 笔</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={8}>
          <Card className="asset-detail-card">
            <div className="form-section-title">审核流程</div>
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: asset.status !== 'draft' ? '#52c41a' : '#d9d9d9',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    fontSize: 14,
                  }}
                >
                  {asset.status !== 'draft' ? <CheckCircleOutlined /> : '1'}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>编制材料</div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>产品经理录入资产信息</div>
                </div>
              </div>
              <div style={{ width: 2, height: 24, background: '#f0f0f0', marginLeft: 15, marginBottom: 8 }} />
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: asset.status === 'pending' ? '#1677ff' : asset.status === 'approved' || asset.status === 'rejected' ? '#52c41a' : '#d9d9d9',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    fontSize: 14,
                  }}
                >
                  {asset.status === 'pending' ? <ClockCircleOutlined /> : asset.status === 'approved' || asset.status === 'rejected' ? <CheckCircleOutlined /> : '2'}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>风控复核</div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>风险合规性和估值合理性审核</div>
                </div>
              </div>
              <div style={{ width: 2, height: 24, background: '#f0f0f0', marginLeft: 15, marginBottom: 8 }} />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: asset.status === 'approved' ? '#52c41a' : asset.status === 'rejected' ? '#ff4d4f' : '#d9d9d9',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    fontSize: 14,
                  }}
                >
                  {asset.status === 'approved' ? <CheckCircleOutlined /> : asset.status === 'rejected' ? <CloseCircleOutlined /> : '3'}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {asset.status === 'approved' ? '审核通过' : asset.status === 'rejected' ? '已驳回' : '完成审批'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                    {asset.status === 'approved' ? '可进入报价和报告环节' : asset.status === 'rejected' ? '需修改后重新提交' : '通过后生成正式估值报告'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        className="asset-detail-card"
        title={
          <span className="form-section-title" style={{ marginBottom: 0 }}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            审批记录与修改痕迹
          </span>
        }
      >
        {sortedRecords.length === 0 ? (
          <Empty description="暂无审批记录，点击上方「提交复核」开始审批流程" style={{ padding: '40px 0' }} />
        ) : (
          <Timeline
            className="timeline-approval"
            mode="left"
            items={sortedRecords.map((record) => ({
              color: actionColor[record.action] || '#d9d9d9',
              dot: actionIcon[record.action],
              label: (
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                  {formatDateTime(record.timestamp)}
                </div>
              ),
              children: (
                <Card size="small" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: actionColor[record.action] }} />
                      <span style={{ fontWeight: 600 }}>{record.approver}</span>
                      <Tag color={actionColor[record.action]}>{record.role}</Tag>
                      <Tag color="blue">{approvalActionLabel[record.action]}</Tag>
                    </Space>
                    <Space>
                      {record.previousSnapshot && (
                        <Popover
                          content={
                            <div style={{ maxWidth: 400 }}>
                              <div style={{ fontWeight: 600, marginBottom: 8 }}>快照版本信息</div>
                              <Descriptions column={1} size="small" bordered>
                                <Descriptions.Item label="资产名称">
                                  {record.previousSnapshot?.name}
                                </Descriptions.Item>
                                <Descriptions.Item label="估值等级">
                                  {record.previousSnapshot?.valuationLevel}
                                </Descriptions.Item>
                                <Descriptions.Item label="综合评分">
                                  {record.previousSnapshot?.totalScore}
                                </Descriptions.Item>
                                <Descriptions.Item label="预估价值">
                                  {record.previousSnapshot?.estimatedValue
                                    ? formatMoney(record.previousSnapshot.estimatedValue)
                                    : '-'}
                                </Descriptions.Item>
                              </Descriptions>
                            </div>
                          }
                          title="修改前快照"
                        >
                          <Tooltip title="查看修改前快照">
                            <Button type="link" size="small" icon={<DiffOutlined />}>
                              版本快照
                            </Button>
                          </Tooltip>
                        </Popover>
                      )}
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => setDiffModalOpen(record)}
                      >
                        查看详情
                      </Button>
                    </Space>
                  </div>
                  {record.comment && (
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#f5f5f5',
                        borderRadius: 6,
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      {record.comment}
                    </div>
                  )}
                </Card>
              ),
            }))}
          />
        )}
      </Card>

      <Modal
        title="提交复核"
        open={submitModalOpen}
        onOk={handleSubmit}
        onCancel={() => setSubmitModalOpen(false)}
        okText="确认提交"
        confirmLoading={false}
      >
        <Form form={actionForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="comment" label="提交说明" rules={[{ required: true, message: '请输入提交说明' }]}>
            <TextArea rows={4} placeholder="请说明已完成的工作和需要审核的重点内容" />
          </Form.Item>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', padding: 12, background: '#e6f4ff', borderRadius: 6 }}>
            提交后将进入风控审核流程，审核通过后方可生成正式估值报告。
          </div>
        </Form>
      </Modal>

      <Modal
        title="处理审核"
        open={reviewModalOpen}
        onOk={handleReview}
        onCancel={() => setReviewModalOpen(false)}
        okText="确认"
      >
        <Form form={reviewForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="action" label="审核结果" rules={[{ required: true, message: '请选择审核结果' }]}>
            <Select placeholder="请选择">
              <Option value="approve">审核通过</Option>
              <Option value="reject">审核驳回</Option>
              <Option value="review">补充评审意见</Option>
            </Select>
          </Form.Item>
          <Form.Item name="approver" label="审核人">
            <Input placeholder="请输入审核人姓名" defaultValue="风控审核员" />
          </Form.Item>
          <Form.Item name="comment" label="审核意见" rules={[{ required: true, message: '请输入审核意见' }]}>
            <TextArea rows={4} placeholder="请详细说明审核意见" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="审批记录详情"
        open={!!diffModalOpen}
        onCancel={() => setDiffModalOpen(null)}
        footer={[
          <Button key="close" onClick={() => setDiffModalOpen(null)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {diffModalOpen && (
          <div>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="操作类型">{approvalActionLabel[diffModalOpen.action]}</Descriptions.Item>
              <Descriptions.Item label="操作人">{diffModalOpen.approver}</Descriptions.Item>
              <Descriptions.Item label="角色">{diffModalOpen.role}</Descriptions.Item>
              <Descriptions.Item label="操作时间">{formatDateTime(diffModalOpen.timestamp)}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>审批意见：</div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 6, lineHeight: 1.6 }}>
              {diffModalOpen.comment || '无'}
            </div>
            {diffModalOpen.previousSnapshot && (
              <>
                <Divider />
                <div style={{ marginBottom: 8, fontWeight: 600 }}>修改前快照（对比参考）：</div>
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="资产名称">{diffModalOpen.previousSnapshot.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="资产编号">{diffModalOpen.previousSnapshot.code || '-'}</Descriptions.Item>
                  <Descriptions.Item label="估值等级">{diffModalOpen.previousSnapshot.valuationLevel || '-'}</Descriptions.Item>
                  <Descriptions.Item label="综合评分">{diffModalOpen.previousSnapshot.totalScore ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="预估价值" span={2}>
                    {diffModalOpen.previousSnapshot.estimatedValue
                      ? formatMoney(diffModalOpen.previousSnapshot.estimatedValue)
                      : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ApprovalRecordPage;
