import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Spin, Progress, Card, Row, Col, Alert, Table, Tag } from 'antd';

export default function CropDetailPage() {
  const { cropId } = useParams();
  const [activeTab, setActiveTab] = useState('Decision Matrix');
  const [data, setData] = useState<any>(null);
  const [regionalData, setRegionalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/crops/${cropId}/scientific-data`).then(r => r.json()),
      fetch(`/api/crops/${cropId}/regional-profile?region=Gaziantep`).then(r => r.json())
    ])
    .then(([scData, rgData]) => {
      setData(scData);
      setRegionalData(rgData);
      setLoading(false);
    })
    .catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [cropId]);

  if (loading) return <div className="p-6"><Spin /> Yükleniyor...</div>;

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link to="/tarim-ai" className="text-blue-500 hover:underline">← AI Analiz'e Dön</Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">Ürün Detayı: {cropId}</h1>
      
      <div className="border-b border-gray-200 mb-4">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
          {['General', 'Decision Matrix', 'Regional Profile', 'Climate', 'Soil', 'Water', 'Terrain', 'Phenology', 'Production Calendar', 'Critical Constraints', 'Sources', 'Version History'].map(tab => (
            <li className="mr-2" key={tab}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
                className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === tab ? 'text-blue-600 border-blue-600' : 'border-transparent hover:text-gray-600 hover:border-gray-300'}`}
              >
                {tab}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Completion Metrics Header */}
      {data?.completion && (
        <Card size="small" className="mb-6" title="Veri Tamamlama Oranları (Completion)">
          <Row gutter={16}>
            <Col span={4}><Progress type="circle" percent={data.completion.profile} size={60} /> <div className="mt-2 text-xs text-center">Genel Profil</div></Col>
            <Col span={4}><Progress type="circle" percent={data.completion.climate} size={60} /> <div className="mt-2 text-xs text-center">İklim (Climate)</div></Col>
            <Col span={4}><Progress type="circle" percent={data.completion.soil} size={60} /> <div className="mt-2 text-xs text-center">Toprak (Soil)</div></Col>
            <Col span={4}><Progress type="circle" percent={data.completion.water} size={60} /> <div className="mt-2 text-xs text-center">Su (Water)</div></Col>
            <Col span={4}><Progress type="circle" percent={data.completion.production} size={60} /> <div className="mt-2 text-xs text-center">Üretim (Production)</div></Col>
            <Col span={4}><Progress type="circle" percent={data.completion.phenology} size={60} /> <div className="mt-2 text-xs text-center">Fenoloji (Phenology)</div></Col>
          </Row>
        </Card>
      )}

      {activeTab === 'Decision Matrix' ? (
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Scientific Values (Explainability)</h2>
          <Table 
            size="small"
            dataSource={data?.scientific_values || []}
            rowKey="id"
            columns={[
              { title: 'Kriter', dataIndex: 'field_name', key: 'field_name' },
              { title: 'Değer', dataIndex: 'normalized_value', key: 'normalized_value' },
              { title: 'Sağlayıcı (Provider)', dataIndex: 'provider', key: 'provider' },
              { title: 'Alınma Tarihi', dataIndex: 'retrieved_at', key: 'retrieved_at', render: (val: string) => new Date(val).toLocaleDateString() },
              { title: 'Durum', dataIndex: 'review_status', key: 'review_status', render: (val: string) => <Tag color="green">{val}</Tag> }
            ]}
          />
        </div>
      ) : activeTab === 'Regional Profile' ? (
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Gaziantep Bölgesel Üretim Katmanı</h2>
          {!regionalData || regionalData.error ? (
            <Alert type="warning" message="Bu ürün için Gaziantep bölgesel profili bulunamadı." />
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Üretim Senaryoları</h3>
                <Table 
                  size="small"
                  dataSource={regionalData.scenarios || []}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: 'Senaryo Adı', dataIndex: 'scenario_name', key: 'scenario_name' },
                    { title: 'Yetiştirme Tipi', dataIndex: 'growing_type', key: 'growing_type' },
                    { title: 'Su Rejimi', dataIndex: 'water_regime', key: 'water_regime' }
                  ]}
                />
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Yerel Notlar</h3>
                <ul>
                  {(regionalData.notes || []).map((n: any) => (
                    <li key={n.id}><strong>{n.note_type}:</strong> {n.note_content}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Bölgesel Kaynaklar</h3>
                <Table 
                  size="small"
                  dataSource={regionalData.sources || []}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: 'Kaynak Tipi', dataIndex: 'source_type', key: 'source_type' },
                    { title: 'Kaynak Adı', dataIndex: 'source_name', key: 'source_name' },
                    { title: 'Durum', dataIndex: 'review_status', key: 'review_status', render: (val: string) => <Tag color="blue">{val}</Tag> }
                  ]}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-500">{activeTab} tab is under construction.</p>
        </div>
      )}
    </div>
  );
}
