import Icon from "@/components/ui/icon";
export default function Button({ children, icon, variant = "primary", className = "", type = "button", ...buttonProps }) {
  const style = variant === "secondary"
    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    : "bg-brand-600 text-white hover:bg-brand-700";

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${style} ${className}`}
      {...buttonProps}
    >
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
