const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getProfessionalStatus(expiryDate) {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const expiryUtc = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());

  if (expiryUtc < todayUtc) return "Expired";
  if (expiryUtc <= todayUtc + (90 * DAY_IN_MS)) return "Expiring soon";
  return "Active";
}

export function serializeProfessional(professional) {
  return {
    id: professional._id.toString(),
    name: professional.name,
    email: professional.email,
    profession: professional.profession,
    state: professional.state,
    licenseExpiry: new Date(professional.licenseExpiry).toISOString().slice(0, 10),
    status: getProfessionalStatus(professional.licenseExpiry),
    createdAt: professional.createdAt,
    updatedAt: professional.updatedAt,
  };
}
