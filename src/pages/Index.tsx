import { useState } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { NewClaimWizard } from '@/components/NewClaimWizard';
import { ClaimDetail } from '@/components/ClaimDetail';
import { Claim } from '@/types/claims';
import { Helmet } from 'react-helmet-async';

type View = 'dashboard' | 'new-claim' | 'claim-detail';

const Index = () => {
  const [view, setView] = useState<View>('dashboard');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewClaim = () => {
    setView('new-claim');
  };

  const handleSelectClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setView('claim-detail');
  };

  const handleBack = () => {
    setView('dashboard');
    setSelectedClaim(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1);
    handleBack();
  };

  return (
    <>
      <Helmet>
        <title>Insurance Claims | AI-Powered Damage Assessment</title>
        <meta name="description" content="Process vehicle insurance claims with AI-powered damage assessment. Fast, accurate, and transparent claim processing." />
      </Helmet>

      {view === 'dashboard' && (
        <Dashboard 
          key={refreshKey}
          onNewClaim={handleNewClaim} 
          onSelectClaim={handleSelectClaim} 
        />
      )}

      {view === 'new-claim' && (
        <NewClaimWizard 
          onBack={handleBack} 
          onComplete={handleUpdate} 
        />
      )}

      {view === 'claim-detail' && selectedClaim && (
        <ClaimDetail 
          claim={selectedClaim} 
          onBack={handleBack}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
};

export default Index;
