import { PageTitle } from "@/components/ui";
import Reports from "@/components/Reports";

export default function ReportsPage() {
  return (
    <div>
      <PageTitle title="Reports" subtitle="Your money at a glance — net worth, cash flow and spending." />
      <Reports />
    </div>
  );
}
