import { PageTitle } from "@/components/ui";
import AccountsTree from "@/components/AccountsTree";

export default function AccountsPage() {
  return (
    <div>
      <PageTitle
        title="Accounts"
        subtitle="Categories → groups → accounts. Hover a row to rename or delete."
      />
      <AccountsTree />
    </div>
  );
}
