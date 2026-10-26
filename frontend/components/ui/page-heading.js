export default function PageHeading({ eyebrow, title, description, action }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p><h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>;
}
