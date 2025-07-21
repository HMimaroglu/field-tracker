'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { adminApi } from '@/lib/api';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

interface Job {
  id: number;
  jobCode: string;
  name: string;
  description?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    jobCode: '',
    name: '',
    description: '',
    tags: [] as string[],
    isActive: true,
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.getJobs({ limit: 1000 });
      
      if (response.success) {
        setJobs(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
      alert('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingJob) {
        const response = await adminApi.updateJob(editingJob.id, formData);
        if (!response.success) {
          throw new Error(response.error || 'Update failed');
        }
      } else {
        const response = await adminApi.createJob(formData);
        if (!response.success) {
          throw new Error(response.error || 'Creation failed');
        }
      }
      
      await loadJobs();
      setShowForm(false);
      setEditingJob(null);
      setFormData({ jobCode: '', name: '', description: '', tags: [], isActive: true });
      setTagInput('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      alert(message);
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      jobCode: job.jobCode,
      name: job.name,
      description: job.description || '',
      tags: job.tags || [],
      isActive: job.isActive,
    });
    setTagInput('');
    setShowForm(true);
  };

  const handleDelete = async (job: Job) => {
    if (!confirm(`Are you sure you want to delete job "${job.name}"?`)) {
      return;
    }
    
    try {
      const response = await adminApi.deleteJob(job.id);
      if (!response.success) {
        throw new Error(response.error || 'Delete failed');
      }
      
      await loadJobs();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      alert(message);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ 
      ...formData, 
      tags: formData.tags.filter(tag => tag !== tagToRemove) 
    });
  };

  const filteredJobs = jobs.filter(job =>
    job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.jobCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600">Manage job codes and assignments for field work</p>
        </div>
        
        <Button onClick={() => setShowForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Job
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
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
              {editingJob ? 'Edit Job' : 'Add New Job'}
            </CardTitle>
            <CardDescription>
              {editingJob ? 'Update job information' : 'Create a new job code for field assignments'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Job Code *</label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    placeholder="e.g., JOB001"
                    value={formData.jobCode}
                    onChange={(e) => setFormData({ ...formData, jobCode: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="label">Job Name *</label>
                  <input
                    type="text"
                    required
                    className="input mt-1"
                    placeholder="e.g., Site Installation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input mt-1"
                  placeholder="Optional job description or notes"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Tags</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input"
                      placeholder="Add tag and press Enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800"
                        >
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-primary-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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
                  Active job (available for time tracking)
                </label>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">
                  {editingJob ? 'Update Job' : 'Create Job'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingJob(null);
                    setFormData({ jobCode: '', name: '', description: '', tags: [], isActive: true });
                    setTagInput('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>All Jobs ({filteredJobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No jobs found matching your search' : 'No jobs found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Job Code</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Tags</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="font-medium">{job.jobCode}</td>
                      <td>{job.name}</td>
                      <td className="text-sm text-gray-600 max-w-xs truncate">
                        {job.description || '-'}
                      </td>
                      <td>
                        {job.tags && job.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {job.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {job.tags.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{job.tags.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${job.isActive ? 'badge-success' : 'badge-error'}`}>
                          {job.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(job)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(job)}
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