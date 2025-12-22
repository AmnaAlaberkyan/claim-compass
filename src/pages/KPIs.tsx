import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { useKPIs } from '@/hooks/useKPIs';
import { TimeframeFilter } from '@/types/audit';
import { Helmet } from 'react-helmet-async';

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: 'success' | 'warning' | 'danger' | 'neutral';
}

function MetricCard({ title, value, subtitle, icon, highlight = 'neutral' }: MetricCardProps) {
  const highlightStyles = {
    success: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    danger: 'border-destructive/20 bg-destructive/5',
    neutral: 'border-border',
  };
  
  const iconStyles = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className={`card-apple p-5 border ${highlightStyles[highlight]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-muted ${iconStyles[highlight]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function KPIs() {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('7d');
  const { metrics, isLoading, eventCount } = useKPIs(timeframe);

  const timeframes: { label: string; value: TimeframeFilter }[] = [
    { label: '24h', value: '24h' },
    { label: '7 days', value: '7d' },
    { label: 'All time', value: 'all' },
  ];

  return (
    <>
      <Helmet>
        <title>KPI Dashboard | Insurance Claims</title>
        <meta name="description" content="View key performance indicators and metrics for claims processing." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">KPI Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Performance metrics derived from {eventCount.toLocaleString()} audit events
                </p>
              </div>
              
              {/* Timeframe Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {timeframes.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      timeframe === tf.value 
                        ? 'bg-card text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="card-apple p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-8 bg-muted rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Overview Section */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Claims Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Claims"
                    value={metrics.totalClaims.toString()}
                    icon={<BarChart3 className="w-5 h-5" />}
                  />
                  <MetricCard
                    title="Approved"
                    value={metrics.totalApproved.toString()}
                    subtitle={metrics.totalClaims > 0 ? formatPercent((metrics.totalApproved / metrics.totalClaims) * 100) : '—'}
                    icon={<CheckCircle className="w-5 h-5" />}
                    highlight="success"
                  />
                  <MetricCard
                    title="Escalated"
                    value={metrics.totalEscalated.toString()}
                    subtitle={metrics.totalClaims > 0 ? formatPercent((metrics.totalEscalated / metrics.totalClaims) * 100) : '—'}
                    icon={<AlertTriangle className="w-5 h-5" />}
                    highlight="warning"
                  />
                  <MetricCard
                    title="Pending"
                    value={metrics.totalPending.toString()}
                    subtitle={metrics.totalClaims > 0 ? formatPercent((metrics.totalPending / metrics.totalClaims) * 100) : '—'}
                    icon={<Clock className="w-5 h-5" />}
                  />
                </div>
              </section>

              {/* Timing Metrics */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Processing Times (Median)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    title="Upload → AI Assessment"
                    value={formatDuration(metrics.medianUploadToAssessment)}
                    subtitle="Time to complete AI analysis"
                    icon={<TrendingUp className="w-5 h-5" />}
                    highlight={
                      metrics.medianUploadToAssessment === null ? 'neutral' :
                      metrics.medianUploadToAssessment < 30 ? 'success' :
                      metrics.medianUploadToAssessment < 120 ? 'warning' : 'danger'
                    }
                  />
                  <MetricCard
                    title="Upload → First Human Action"
                    value={formatDuration(metrics.medianUploadToFirstHuman)}
                    subtitle="Time until adjuster engagement"
                    icon={<Users className="w-5 h-5" />}
                    highlight={
                      metrics.medianUploadToFirstHuman === null ? 'neutral' :
                      metrics.medianUploadToFirstHuman < 3600 ? 'success' :
                      metrics.medianUploadToFirstHuman < 86400 ? 'warning' : 'danger'
                    }
                  />
                  <MetricCard
                    title="First Human → Approval"
                    value={formatDuration(metrics.medianFirstHumanToApproval)}
                    subtitle="Time to final decision"
                    icon={<CheckCircle className="w-5 h-5" />}
                    highlight={
                      metrics.medianFirstHumanToApproval === null ? 'neutral' :
                      metrics.medianFirstHumanToApproval < 300 ? 'success' :
                      metrics.medianFirstHumanToApproval < 3600 ? 'warning' : 'danger'
                    }
                  />
                </div>
              </section>

              {/* Quality Metrics */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Quality Metrics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Retake Rate"
                    value={formatPercent(metrics.retakePercentage)}
                    subtitle="Claims requiring photo retake"
                    icon={<AlertTriangle className="w-5 h-5" />}
                    highlight={
                      metrics.retakePercentage < 5 ? 'success' :
                      metrics.retakePercentage < 15 ? 'warning' : 'danger'
                    }
                  />
                  <MetricCard
                    title="QA Sample Rate"
                    value={formatPercent(metrics.qaPercentage)}
                    subtitle="Claims sampled for QA"
                    icon={<BarChart3 className="w-5 h-5" />}
                  />
                  <MetricCard
                    title="QA Pass Rate"
                    value={metrics.qaPercentage > 0 ? formatPercent(metrics.qaPassRate) : '—'}
                    subtitle="QA reviews passed"
                    icon={<CheckCircle className="w-5 h-5" />}
                    highlight={
                      metrics.qaPercentage === 0 ? 'neutral' :
                      metrics.qaPassRate >= 90 ? 'success' :
                      metrics.qaPassRate >= 70 ? 'warning' : 'danger'
                    }
                  />
                  <div className="col-span-1" />
                </div>
              </section>

              {/* Queue Aging */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Queue Aging (&gt;24h)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard
                    title="Needs Human Review"
                    value={metrics.queueAgingNeedsHuman.toString()}
                    subtitle="Claims waiting >24h for human action"
                    icon={<Users className="w-5 h-5" />}
                    highlight={
                      metrics.queueAgingNeedsHuman === 0 ? 'success' :
                      metrics.queueAgingNeedsHuman < 5 ? 'warning' : 'danger'
                    }
                  />
                  <MetricCard
                    title="QA Review Queue"
                    value={metrics.queueAgingQAReview.toString()}
                    subtitle="Claims waiting >24h for QA"
                    icon={<BarChart3 className="w-5 h-5" />}
                    highlight={
                      metrics.queueAgingQAReview === 0 ? 'success' :
                      metrics.queueAgingQAReview < 3 ? 'warning' : 'danger'
                    }
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
