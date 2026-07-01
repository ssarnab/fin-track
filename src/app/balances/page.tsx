import { PageTitle } from "@/components/ui";
import Balances from "@/components/Balances";

export default function BalancesPage() {
  return (
    <div>
      <PageTitle title="Balances" subtitle="Current balance of every account, grouped by category." />
      <Balances />
    </div>
  );
}
