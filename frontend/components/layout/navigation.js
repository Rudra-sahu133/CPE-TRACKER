export const navigation = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Professionals", href: "/professionals", icon: "people" },
  { label: "Courses", href: "/courses", icon: "courses" },
  { label: "Licenses", href: "/licenses", icon: "license" },
  { label: "Certificates", href: "/certificates", icon: "certificate" },
  { label: "Admin Panel", href: "/admin", icon: "dashboard", roles: ["admin", "operations"] },
  { label: "Audit Logs", href: "/audit-logs", icon: "audit", roles: ["admin"] },
];
