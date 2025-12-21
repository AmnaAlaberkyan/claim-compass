import { useState } from 'react';
import { ClaimFormData } from '@/types/claims';
import { Calendar, Car, FileText, User } from 'lucide-react';

interface ClaimFormProps {
  onSubmit: (data: ClaimFormData) => void;
  isLoading?: boolean;
}

export function ClaimForm({ onSubmit, isLoading }: ClaimFormProps) {
  const [formData, setFormData] = useState<ClaimFormData>({
    policy_number: '',
    claimant_name: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    incident_date: new Date().toISOString().split('T')[0],
    incident_description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof ClaimFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Policy Number
          </label>
          <input
            type="text"
            value={formData.policy_number}
            onChange={(e) => handleChange('policy_number', e.target.value)}
            placeholder="e.g., POL-2024-001234"
            className="input-apple w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Claimant Name
          </label>
          <input
            type="text"
            value={formData.claimant_name}
            onChange={(e) => handleChange('claimant_name', e.target.value)}
            placeholder="Full name"
            className="input-apple w-full"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <Car className="w-4 h-4 inline mr-2" />
              Make
            </label>
            <input
              type="text"
              value={formData.vehicle_make}
              onChange={(e) => handleChange('vehicle_make', e.target.value)}
              placeholder="Toyota"
              className="input-apple w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Model
            </label>
            <input
              type="text"
              value={formData.vehicle_model}
              onChange={(e) => handleChange('vehicle_model', e.target.value)}
              placeholder="Camry"
              className="input-apple w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Year
            </label>
            <input
              type="number"
              value={formData.vehicle_year}
              onChange={(e) => handleChange('vehicle_year', parseInt(e.target.value))}
              min="1990"
              max={new Date().getFullYear() + 1}
              className="input-apple w-full"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />
            Incident Date
          </label>
          <input
            type="date"
            value={formData.incident_date}
            onChange={(e) => handleChange('incident_date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="input-apple w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description of Incident
          </label>
          <textarea
            value={formData.incident_description}
            onChange={(e) => handleChange('incident_description', e.target.value)}
            placeholder="Describe what happened..."
            rows={4}
            className="input-apple w-full h-auto py-3 resize-none"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? 'Processing...' : 'Continue'}
      </button>
    </form>
  );
}
