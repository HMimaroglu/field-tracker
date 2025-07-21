'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { adminApi } from '@/lib/api';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Worker {
  id: number;
  employeeId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    pin: '',
    isActive: true,
  });

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.getWorkers({ limit: 1000 });
      
      if (response.success) {
        setWorkers(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
      alert('Failed to load workers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingWorker) {
        const response = await adminApi.updateWorker(editingWorker.id, formData);
        if (!response.success) {
          throw new Error(response.error || 'Update failed');
        }
      } else {
        const response = await adminApi.createWorker(formData);
        if (!response.success) {
          throw new Error(response.error || 'Creation failed');
        }
      }
      
      await loadWorkers();
      setShowForm(false);
      setEditingWorker(null);
      setFormData({ employeeId: '', name: '', pin: '', isActive: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      alert(message);
    }
  };

  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      employeeId: worker.employeeId,
      name: worker.name,
      pin: '', // Don't pre-fill PIN for security
      isActive: worker.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (worker: Worker) => {
    if (!confirm(`Are you sure you want to delete ${worker.name}?`)) {
      return;
    }
    
    try {
      const response = await adminApi.deleteWorker(worker.id);
      if (!response.success) {
        throw new Error(response.error || 'Delete failed');
      }
      
      await loadWorkers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      alert(message);
    }
  };

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading workers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
          <p className="text-gray-600">Manage field workers and their credentials</p>
        </div>
        
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Worker
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workers..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingWorker ? 'Edit Worker' : 'Add New Worker'}
            </CardTitle>
            <CardDescription>
              {editingWorker ? 'Update worker information' : 'Create a new field worker account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Employee ID *</label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    placeholder="e.g., EMP001"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    placeholder="e.g., John Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="label">4-Digit PIN *</label>
                <input
                  type="password"
                  required
                  className="input mt-1"
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editingWorker ? 'Leave blank to keep current PIN' : 'Used for mobile app authentication'}
                </p>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Active worker (can log in to mobile app)
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">
                  {editingWorker ? 'Update Worker' : 'Create Worker'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingWorker(null);
                    setFormData({ employeeId: '', name: '', pin: '', isActive: true });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Workers List */}
      <Card>
        <CardHeader>
          <CardTitle>All Workers ({filteredWorkers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWorkers.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No workers found matching your search' : 'No workers found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map((worker) => (
                    <tr key={worker.id}>
                      <td className="font-medium">{worker.employeeId}</td>
                      <td>{worker.name}</td>
                      <td>
                        <span className={`badge ${worker.isActive ? 'badge-success' : 'badge-error'}`}>
                          {worker.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">
                        {new Date(worker.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(worker)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(worker)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}