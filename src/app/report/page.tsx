import { PageTitle } from "@/components/ui";
import Report from "@/components/Report";

export default function ReportPage() {
  return (
    <div>
      <div className="no-print">
        <PageTitle title="Report" subtitle="Filter your transactions, then print or export them." />
      </div>
      <Report />
    </div>
  );
}
