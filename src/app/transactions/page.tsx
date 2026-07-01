import { PageTitle } from "@/components/ui";
import Transactions from "@/components/Transactions";

export default function TransactionsPage() {
  return (
    <div>
      <PageTitle title="Transactions" subtitle="Your latest entries. In ← Out." />
      <Transactions />
    </div>
  );
}
