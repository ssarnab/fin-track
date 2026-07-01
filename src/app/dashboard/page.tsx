import { PageTitle } from "@/components/ui";
import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  return (
    <div>
      <PageTitle title="Dashboard" subtitle="Your money at a glance — net worth, cash flow and spending." />
      <Dashboard />
    </div>
  );
}
