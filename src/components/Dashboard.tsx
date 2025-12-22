import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Claim } from '@/types/claims';
import { ClaimCard } from './ClaimCard';
import { Plus, Filter } from 'lucide-react';

interface DashboardProps {
  onNewClaim: () => void;
  onSelectClaim: (claim: Claim) => void;
}

type FilterStatus = 'all' | 'pending' | 'escalated' | 'approved' | 'human_requested';

export function Dashboard({ onNewClaim, onSelectClaim }: DashboardProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
    } else {
      // Transform the data to match our Claim type
      const transformedClaims: Claim[] = (data || []).map(item => ({
        id: item.id,
        policy_number: item.policy_number,
        claimant_name: item.claimant_name,
        vehicle_make: item.vehicle_make,
        vehicle_model: item.vehicle_model,
        vehicle_year: item.vehicle_year,
        incident_date: item.incident_date,
        incident_description: item.incident_description,
        status: item.status as Claim['status'],
        photo_url: item.photo_url || undefined,
        quality_score: item.quality_score || undefined,
        quality_issues: item.quality_issues as unknown as Claim['quality_issues'] || undefined,
        damage_assessment: item.damage_assessment as unknown as Claim['damage_assessment'] || undefined,
        ai_summary: item.ai_summary || undefined,
        ai_recommendation: item.ai_recommendation || undefined,
        severity_score: item.severity_score || undefined,
        confidence_score: item.confidence_score || undefined,
        cost_low: item.cost_low ? Number(item.cost_low) : undefined,
        cost_high: item.cost_high ? Number(item.cost_high) : undefined,
        safety_concerns: item.safety_concerns || undefined,
        fraud_indicators: item.fraud_indicators || undefined,
        adjuster_decision: item.adjuster_decision || undefined,
        adjuster_notes: item.adjuster_notes || undefined,
        human_review_requested: (item as any).human_review_requested ?? false,
        human_review_reason: (item as any).human_review_reason || undefined,
        intake_preference: ((item as any).intake_preference || 'ai_first') as Claim['intake_preference'],
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      setClaims(transformedClaims);
    }
    setIsLoading(false);
  };

  const filteredClaims = claims.filter(claim => {
    if (filter === 'all') return true;
    if (filter === 'human_requested') return claim.human_review_requested;
    if (filter === 'pending') return (claim.status === 'pending' || claim.status === 'processing' || claim.status === 'review') && !claim.human_review_requested;
    return claim.status === filter;
  });

  const humanRequestedCount = claims.filter(c => c.human_review_requested && c.status !== 'approved').length;

  const filters: { label: string; value: FilterStatus; count?: number }[] = [
    { label: 'All', value: 'all' },
    { label: 'Human Requested', value: 'human_requested', count: humanRequestedCount },
    { label: 'Pending', value: 'pending' },
    { label: 'Escalated', value: 'escalated' },
    { label: 'Approved', value: 'approved' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">IC</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Insurance Claims</h1>
          </div>
          <button onClick={onNewClaim} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Claim
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                filter === f.value
                  ? f.value === 'human_requested' ? 'bg-warning text-warning-foreground' : 'bg-primary text-primary-foreground'
                  : f.value === 'human_requested' && f.count && f.count > 0 ? 'bg-warning/20 text-warning hover:bg-warning/30' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === f.value ? 'bg-white/20' : 'bg-warning/30'
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Claims Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-apple p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No claims found</h3>
            <p className="text-muted-foreground mb-6">
              {filter === 'all' 
                ? 'Start by creating a new claim.' 
                : `No ${filter} claims at the moment.`}
            </p>
            {filter === 'all' && (
              <button onClick={onNewClaim} className="btn-primary">
                Create First Claim
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClaims.map(claim => (
              <ClaimCard 
                key={claim.id} 
                claim={claim} 
                onClick={() => onSelectClaim(claim)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
