import PageHeading from "@/components/ui/page-heading";
import EmptyState from "@/components/ui/empty-state";
export default function AuditLogsPage() { return <><PageHeading eyebrow="Workspace history" title="Audit logs" description="Review a timeline of changes made to records in your workspace."/><EmptyState icon="audit" title="No activity to show yet" description="Workspace changes will appear here as your team starts managing records."/></>; }
