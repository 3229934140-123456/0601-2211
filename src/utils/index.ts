import dayjs from 'dayjs';
import { UpdateFrequency, ValuationLevel, RiskLevel, AssetStatus } from '../types';

export const formatMoney = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatDate = (dateStr: string, format = 'YYYY-MM-DD'): string => {
  return dayjs(dateStr).format(format);
};

export const formatDateTime = (dateStr: string): string => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
};

export const frequencyLabel: Record<UpdateFrequency, string> = {
  realtime: '实时',
  hourly: '每小时',
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  quarterly: '每季度',
  yearly: '每年',
};

export const levelColorMap: Record<ValuationLevel, { bg: string; text: string; border: string }> = {
  S: { bg: '#fff1f0', text: '#cf1322', border: '#ffa39e' },
  A: { bg: '#fff7e6', text: '#d46b08', border: '#ffd591' },
  B: { bg: '#e6f4ff', text: '#0958d9', border: '#91caff' },
  C: { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
  D: { bg: '#f5f5f5', text: '#595959', border: '#d9d9d9' },
};

export const levelDescription: Record<ValuationLevel, string> = {
  S: '极高价值资产，市场稀缺性强，应用场景广泛，数据质量优秀',
  A: '高价值资产，具有较强的市场竞争力和应用价值',
  B: '中等价值资产，具备基本的市场价值和应用场景',
  C: '较低价值资产，价值有限，需结合特定场景使用',
  D: '低价值资产，建议谨慎评估使用场景',
};

export const riskLevelLabel: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

export const riskTypeLabel: Record<string, string> = {
  ownership: '权属风险',
  compliance: '合规风险',
  quality: '质量风险',
  security: '安全风险',
};

export const statusLabel: Record<AssetStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

export const statusColor: Record<AssetStatus, string> = {
  draft: 'default',
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
};

export const approvalActionLabel: Record<string, string> = {
  submit: '提交审核',
  approve: '审核通过',
  reject: '审核驳回',
  review: '评审意见',
  modify: '修改记录',
};

export const getLevelProgressColor = (score: number): string => {
  if (score >= 90) return '#cf1322';
  if (score >= 80) return '#d46b08';
  if (score >= 70) return '#0958d9';
  if (score >= 60) return '#389e0d';
  return '#8c8c8c';
};

export const exportToJSON = (data: unknown, filename: string) => {
  const content = JSON.stringify(data, null, 2);
  if ((window as any).electronAPI) {
    (window as any).electronAPI.saveFile(content, filename, 'json');
  } else {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export const importFromJSON = async (): Promise<unknown | null> => {
  if ((window as any).electronAPI) {
    const result = await (window as any).electronAPI.openFile([
      { name: 'JSON', extensions: ['json'] },
    ]);
    if (result.success) {
      return JSON.parse(result.content);
    }
    return null;
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            resolve(JSON.parse(evt.target?.result as string));
          } catch {
            resolve(null);
          }
        };
        reader.readAsText(file);
      } else {
        resolve(null);
      }
    };
    input.click();
  });
};

declare global {
  interface Window {
    electronAPI: {
      saveFile: (content: string, filename: string, type: string) => Promise<{ success: boolean; path?: string }>;
      openFile: (filters: { name: string; extensions: string[] }[]) => Promise<{ success: boolean; path?: string; content?: string }>;
      exportPdf: (buffer: ArrayBuffer, filename: string) => Promise<{ success: boolean; path?: string }>;
    };
  }
}
