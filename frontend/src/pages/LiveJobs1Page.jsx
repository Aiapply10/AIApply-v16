import { DashboardLayout } from '../components/DashboardLayout';
import { LiveJobsCore } from '../components/LiveJobsCore';

export function LiveJobs1Page() {
  return (
    <DashboardLayout>
      <LiveJobsCore 
        variant="premium"
        pageTitle="Live Jobs 1"
        pageDescription="Premium job listings powered by RapidAPI"
      />
    </DashboardLayout>
  );
}

export default LiveJobs1Page;
