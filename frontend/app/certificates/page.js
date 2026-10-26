import PageHeading from "@/components/ui/page-heading";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
export default function CertificatesPage() { return <><PageHeading eyebrow="Completion records" title="Certificates" description="Store course completion records and certificates submitted by your team." action={<Button icon="plus">Add certificate</Button>}/><EmptyState icon="certificate" title="No certificates uploaded" description="Uploaded completion records will be listed here for convenient reference."/><p className="mt-5 text-center text-xs text-slate-400">Records shown here are provided by workspace users and are not independently verified.</p></>; }
