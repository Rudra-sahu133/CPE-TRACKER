import Icon from "@/components/ui/icon";
export default function EmptyState({ icon, title, description }) {
  return <section className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon name={icon} size={22}/></div><h2 className="text-sm font-semibold text-ink">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p></section>;
}
