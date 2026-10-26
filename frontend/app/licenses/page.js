import PageHeading from "@/components/ui/page-heading";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
export default function LicensesPage() { return <><PageHeading eyebrow="Requirements & renewals" title="Licenses" description="Organize license details, renewal dates, and continuing education requirements." action={<Button icon="plus">Add license</Button>}/><EmptyState icon="license" title="No license records yet" description="Add license details to keep renewal dates and requirements visible to your team."/></>; }
