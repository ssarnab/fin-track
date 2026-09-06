import { PageTitle } from "@/components/ui";
import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  return (
    <div>
      <PageTitle title="Dashboard" subtitle="Net worth, cash flow and where the money goes." />
      <Dashboard />
    </div>
  );
}
