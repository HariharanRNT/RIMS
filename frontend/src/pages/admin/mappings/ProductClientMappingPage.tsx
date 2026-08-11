import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { Link2, Trash2, Package, UserCheck } from 'lucide-react';

interface Option {
  id: number;
  name?: string;
  code?: string;
  companyName?: string;
  customerName?: string;
}

interface Mapping {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  clientId: number;
  clientCompanyName: string;
  clientCustomerName: string;
}

export const ProductClientMappingPage: React.FC = () => {
  const [products, setProducts] = useState<Option[]>([]);
  const [clients, setClients] = useState<Option[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    try {
      const [prodRes, clientRes, mapRes] = await Promise.all([
        apiClient.get('/products'),
        apiClient.get('/clients'),
        apiClient.get('/mappings'),
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (clientRes.data.success) setClients(clientRes.data.data);
      if (mapRes.data.success) setMappings(mapRes.data.data);
    } catch {
      setError('Failed to load mapping data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedClientId) return;

    setError('');
    setSuccessMsg('');

    try {
      const res = await apiClient.post('/mappings', {
        productId: Number(selectedProductId),
        clientId: Number(selectedClientId),
      });

      if (res.data.success) {
        setSuccessMsg('Product mapped to Client successfully.');
        setSelectedProductId('');
        setSelectedClientId('');
        fetchData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to map product to client.');
    }
  };

  const handleRemoveMapping = async (id: number) => {
    if (window.confirm('Are you sure you want to remove this mapping?')) {
      try {
        await apiClient.delete(`/mappings/${id}`);
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to remove mapping.');
      }
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2>Product-Client Mapping</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Associate products to clients for task assignment
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--success)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
        }}>
          {successMsg}
        </div>
      )}

      {/* Two-Column Mapping Selection UI */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Map Product to Client</h3>

        <form onSubmit={handleCreateMapping} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Package size={16} />
              <span>Select Product</span>
            </label>
            <select
              className="form-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserCheck size={16} />
              <span>Select Client</span>
            </label>
            <select
              className="form-select"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">-- Choose Client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.customerName})
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.2rem' }}>
            <Link2 size={18} />
            <span>Map Selected</span>
          </button>
        </form>
      </div>

      {/* Existing Mappings Table */}
      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Mapped Product-Client Relationships</h3>
      <div className="glass-card table-container" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Code</th>
              <th>Product Name</th>
              <th>Client Company</th>
              <th>Customer Name</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading mappings...</td></tr>
            ) : mappings.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No mappings created yet.</td></tr>
            ) : (
              mappings.map((m) => (
                <tr key={m.id}>
                  <td>#{m.id}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{m.productCode}</td>
                  <td>{m.productName}</td>
                  <td style={{ fontWeight: 600 }}>{m.clientCompanyName}</td>
                  <td>{m.clientCustomerName}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMapping(m.id)}>
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
