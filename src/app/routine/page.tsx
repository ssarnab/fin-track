import { PageTitle } from "@/components/ui";
import Routine from "@/components/Routine";

export default function RoutinePage() {
  return (
    <div>
      <PageTitle title="Routine" subtitle="How much of today's plan you actually hit, block by block." />
      <Routine />
    </div>
  );
}
