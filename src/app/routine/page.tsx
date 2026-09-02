import { PageTitle } from "@/components/ui";
import Routine from "@/components/Routine";

export default function RoutinePage() {
  return (
    <div>
      <PageTitle title="Routine" subtitle="Your daily checklist — tick it off, don't break the streak." />
      <Routine />
    </div>
  );
}
