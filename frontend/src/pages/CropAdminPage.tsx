import { useEffect, useState } from 'react';

export default function CropAdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/crops/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Crop Management Dashboard</h1>
      {stats ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white border rounded shadow">
            <h3 className="font-semibold text-gray-500">Toplam Ürün</h3>
            <p className="text-2xl">{stats.total}</p>
          </div>
          <div className="p-4 bg-white border rounded shadow">
            <h3 className="font-semibold text-gray-500">Onaylı (Approved)</h3>
            <p className="text-2xl">{stats.approved}</p>
          </div>
          <div className="p-4 bg-white border rounded shadow">
            <h3 className="font-semibold text-gray-500">Eksik Profil (Identity Only)</h3>
            <p className="text-2xl">{stats.missingProfile}</p>
          </div>
          <div className="p-4 bg-white border rounded shadow">
            <h3 className="font-semibold text-gray-500">Seasonal / Perennial</h3>
            <p className="text-2xl">{stats.seasonal} / {stats.perennial}</p>
          </div>
        </div>
      ) : (
        <p>Yükleniyor...</p>
      )}
    </div>
  );
}
