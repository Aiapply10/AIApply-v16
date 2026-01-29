import { DashboardLayout } from '../components/DashboardLayout';
import { LiveJobsCore } from '../components/LiveJobsCore';

export function LiveJobsPage() {
  return (
    <DashboardLayout>
      <LiveJobsCore 
        variant="free"
        pageTitle="Live Jobs"
        pageDescription="Discover job opportunities from multiple free sources"
      />
    </DashboardLayout>
  );
}

export default LiveJobsPage;
