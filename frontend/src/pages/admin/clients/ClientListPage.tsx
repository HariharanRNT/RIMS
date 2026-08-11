import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Client {
  id: number;
  companyName: string;
  customerName: string;
  addressLine1?: string;
  addressLine2?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  pan?: string;
  gstNo?: string;
  hsn?: string;
  cin?: string;
  isActive: boolean;
}

export const ClientListPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [pan, setPan] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [hsn, setHsn] = useState('');
  const [cin, setCin] = useState('');
  const [error, setError] = useState('');

  const fetchClients = async () => {
    try {
      const res = await apiClient.get('/clients');
      if (res.data.success) setClients(res.data.data);
    } catch {
      setError('Failed to load clients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingId(c.id);
    setCompanyName(c.companyName);
    setCustomerName(c.customerName);
    setAddressLine1(c.addressLine1 || '');
    setAddressLine2(c.addressLine2 || '');
    setCity(c.city || '');
    setState(c.state || '');
    setCountry(c.country || '');
    setPincode(c.pincode || '');
    setPan(c.pan || '');
    setGstNo(c.gstNo || '');
    setHsn(c.hsn || '');
    setCin(c.cin || '');
    setError('');
    setShowModal(true);
  };

  const resetForm = () => {
    setCompanyName('');
    setCustomerName('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setCountry('');
    setPincode('');
    setPan('');
    setGstNo('');
    setHsn('');
    setCin('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      companyName,
      customerName,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      pincode,
      pan: pan ? pan.toUpperCase() : null,
      gstNo: gstNo ? gstNo.toUpperCase() : null,
      hsn,
      cin: cin ? cin.toUpperCase() : null,
    };

    try {
      if (editingId) {
        await apiClient.put(`/clients/${editingId}`, payload);
      } else {
        await apiClient.post('/clients', payload);
      }
      setShowModal(false);
      fetchClients();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save client.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to deactivate this client?')) {
      try {
        await apiClient.delete(`/clients/${id}`);
        fetchClients();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete client.');
      }
    }
  };

  return (
    <div>
      <div className="header">
        <div>
          <h2>Client Master</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage client organization profiles & statutory details
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={18} />
          <span>New Client</span>
        </button>
      </div>

      <div className="glass-card table-container" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Company Name</th>
              <th>Customer Name</th>
              <th>PAN / GST</th>
              <th>City / Country</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading clients...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No clients found.</td></tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td style={{ fontWeight: 600 }}>{c.companyName}</td>
                  <td>{c.customerName}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {c.pan && <div>PAN: {c.pan}</div>}
                    {c.gstNo && <div>GST: {c.gstNo}</div>}
                  </td>
                  <td>{[c.city, c.country].filter(Boolean).join(', ')}</td>
                  <td>
                    <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(c)} style={{ marginRight: '0.5rem' }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <h3 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit Client' : 'New Client'}</h3>

            {error && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Section 1: Company Info */}
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Company Info</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contact Person"
                    required
                  />
                </div>
              </div>

              {/* Section 2: Address */}
              <h4 style={{ color: 'var(--accent-primary)', margin: '1rem 0 0.75rem', fontSize: '0.9rem' }}>Address</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Address Line 1</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 2</label>
                  <input
                    type="text"
                    className="form-input"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" className="form-input" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input type="text" className="form-input" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input type="text" className="form-input" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                </div>
              </div>

              {/* Section 3: Statutory IDs */}
              <h4 style={{ color: 'var(--accent-primary)', margin: '1rem 0 0.75rem', fontSize: '0.9rem' }}>Statutory Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">PAN (10 Chars)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GST No (15 Chars)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={gstNo}
                    onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">HSN</label>
                  <input type="text" className="form-input" value={hsn} onChange={(e) => setHsn(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">CIN</label>
                  <input type="text" className="form-input" value={cin} onChange={(e) => setCin(e.target.value.toUpperCase())} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
