import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import Button from '../../components/Button';
import { Upload, FileText, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [file, setFile] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchPrescriptions = () => {
    api.get('/customer/prescriptions')
      .then(res => setPrescriptions(res.data || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image or PDF prescription file.');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientName', patientName);
      formData.append('doctorName', doctorName);

      await api.post('/customer/prescriptions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMessage('Prescription uploaded successfully. Queued for pharmacist review.');
      setFile(null);
      setPatientName('');
      setDoctorName('');
      fetchPrescriptions();
    } catch (err) {
      setError(err.message || 'Failed to upload prescription.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Prescription Records</h1>
        <p className="text-xs text-neutral-500 mt-1">
          Upload and manage doctor prescriptions for Schedule H & H1 medications
        </p>
      </div>

      {message && (
        <div className="p-3 bg-semantic-success-tint border border-emerald-200 text-semantic-success text-xs rounded-control flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-semantic-danger-tint border border-red-200 text-semantic-danger text-xs rounded-control flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white rounded-panel border border-neutral-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-brand" />
          <span>Upload New Prescription (JPG, PNG, PDF up to 10 MB)</span>
        </h2>

        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Patient Name</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full px-3 h-9 bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Doctor Name / Clinic</label>
            <input
              type="text"
              placeholder="e.g. Dr. Ashok Sengupta"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full px-3 h-9 bg-white border border-neutral-300 rounded-control focus:border-brand text-neutral-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Prescription File</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full px-2 py-1 text-xs bg-white border border-neutral-300 rounded-control text-neutral-700"
            />
          </div>

          <div className="sm:col-span-3 pt-2">
            <Button type="submit" loading={uploading} size="md">
              <Upload className="w-3.5 h-3.5" />
              Submit to Pharmacist
            </Button>
          </div>
        </form>
      </div>

      {/* Uploaded Prescriptions List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">My Uploaded Prescriptions ({prescriptions.length})</h2>

        {prescriptions.length === 0 ? (
          <div className="bg-white rounded-panel border border-neutral-200 p-8 text-center text-xs text-neutral-500">
            No prescriptions uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prescriptions.map((rx) => (
              <div 
                key={rx.id} 
                className="bg-white rounded-panel border border-neutral-200 p-4 space-y-2 hover:border-neutral-300 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-neutral-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand" />
                    <span>{rx.doctorName || 'Doctor Prescription'}</span>
                  </span>
                  
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono-numbers ${
                    rx.status === 'APPROVED' ? 'bg-semantic-success-tint text-semantic-success' :
                    rx.status === 'REJECTED' ? 'bg-semantic-danger-tint text-semantic-danger' :
                    'bg-semantic-warning-tint text-semantic-warning'
                  }`}>
                    {rx.status}
                  </span>
                </div>

                <div className="text-xs text-neutral-600 space-y-0.5">
                  <div><strong>Patient:</strong> {rx.patientName}</div>
                  <div><strong>Doctor Reg No:</strong> {rx.doctorRegNo || 'Pending verification'}</div>
                  <div className="text-[11px] text-neutral-400">
                    Uploaded on: {new Date(rx.uploadedAt).toLocaleDateString()} • Valid for 6 months
                  </div>
                </div>

                {rx.status === 'REJECTED' && rx.rejectReason && (
                  <div className="p-2 bg-semantic-danger-tint text-semantic-danger text-[11px] rounded-[4px] mt-2 border border-red-200">
                    <strong>Rejection reason:</strong> {rx.rejectReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
