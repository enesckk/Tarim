// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Layout, Typography, Table, Tag, Space, Select, Card, Spin } from 'antd';

const { Title } = Typography;
const { Option } = Select;

interface CriteriaCatalog {
  id: string;
  code: string;
  name: string;
  category: string;
}

interface DecisionRule {
  id: string;
  crop_knowledge_id: string;
  criterion_id: string;
  decision_role: string;
  importance: string;
  missing_data_behavior: string;
  review_status: string;
  version: number;
  criterion?: CriteriaCatalog;
  source_priorities?: any[];
}

export const CropDecisionMatrixAdminPage: React.FC = () => {
  const [rules, setRules] = useState<DecisionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  // Note: For a real app we'd fetch all rules from all crops across the database.
  // For now we mock it or fetch a single list if the backend supports it.

  useEffect(() => {
    // We would fetch all decision rules here from an admin endpoint
    setLoading(false);
  }, []);

  const columns = [
    {
      title: 'Kategori',
      dataIndex: ['criterion', 'category'],
      key: 'category',
      render: (cat: string) => <Tag color="blue">{cat}</Tag>
    },
    {
      title: 'Kriter',
      dataIndex: ['criterion', 'name'],
      key: 'name',
    },
    {
      title: 'Rol (Role)',
      dataIndex: 'decision_role',
      key: 'decision_role',
      render: (val: string) => <Tag color="purple">{val}</Tag>
    },
    {
      title: 'Önem (Importance)',
      dataIndex: 'importance',
      key: 'importance',
    },
    {
      title: 'Eksik Veri (Missing Data)',
      dataIndex: 'missing_data_behavior',
      key: 'missing_data_behavior',
    },
    {
      title: 'Kaynak Sayısı',
      key: 'sources',
      render: (row: DecisionRule) => row.source_priorities?.length || 0,
    },
    {
      title: 'Status',
      dataIndex: 'review_status',
      key: 'review_status',
      render: (val: string) => <Tag color={val === 'Approved' ? 'green' : 'orange'}>{val}</Tag>
    }
  ];

  return (
    <Layout style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={2}>Bilimsel Karar Matrisi Yönetimi (Decision Matrix)</Title>

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Select value={categoryFilter} onChange={setCategoryFilter} style={{ width: 200 }}>
              <Option value="All">Tüm Kategoriler</Option>
              <Option value="Climate">İklim (Climate)</Option>
              <Option value="Soil">Toprak (Soil)</Option>
              <Option value="Water">Su (Water)</Option>
              <Option value="Terrain">Arazi (Terrain)</Option>
            </Select>
          </Space>
          
          <Table 
            columns={columns} 
            dataSource={rules} 
            rowKey="id"
            loading={loading}
          />
        </Card>
      </Space>
    </Layout>
  );
};
