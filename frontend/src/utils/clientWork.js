const normalizePart = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const displayPart = (value) => String(value ?? "").trim();

export const getClientGroupKey = (work, scope = "admin") => {
  const client = work?.clientDetails || {};
  const parts =
    scope === "associate"
      ? [work?.associate?._id || work?.associate, client.clientName, client.mobileNumber, client.email, client.address]
      : [work?.associate?._id || work?.associate, client.clientName, client.mobileNumber, client.email, client.address];

  return parts.map(normalizePart).join("|");
};

export const groupWorksByClient = (works = [], scope = "admin") => {
  const groups = new Map();

  works.forEach((work) => {
    const client = work?.clientDetails || {};
    const clientKey = getClientGroupKey(work, scope);
    const workUpdatedAt = new Date(work?.updatedAt || work?.createdAt || 0).getTime();

    if (!groups.has(clientKey)) {
      groups.set(clientKey, {
        clientKey,
        clientName: displayPart(client.clientName) || "Unnamed client",
        mobileNumber: displayPart(client.mobileNumber),
        email: displayPart(client.email),
        address: displayPart(client.address),
        associateId: displayPart(work?.associate?._id || work?.associate),
        associateName: displayPart(work?.associate?.name),
        associates: [],
        works: [],
        services: [],
        latestUpdatedAt: work?.updatedAt || work?.createdAt || null,
        latestStatus: work?.status || "",
        latestWorkId: work?.workId || "",
      });
    }

    const group = groups.get(clientKey);
    group.works.push(work);

    const serviceId = displayPart(work?.service?._id);
    const serviceName = displayPart(work?.service?.name);
    if (serviceName && !group.services.some((service) => service.name === serviceName)) {
      group.services.push({ id: serviceId, name: serviceName });
    }

    const associateId = displayPart(work?.associate?._id || work?.associate);
    const associateName = displayPart(work?.associate?.name);
    if (scope === "admin" && associateId && !group.associates.some((associate) => associate.id === associateId)) {
      group.associates.push({ id: associateId, name: associateName || "Associate" });
    }

    const currentLatest = new Date(group.latestUpdatedAt || 0).getTime();
    if (workUpdatedAt >= currentLatest) {
      group.latestUpdatedAt = work?.updatedAt || work?.createdAt || null;
      group.latestStatus = work?.status || "";
      group.latestWorkId = work?.workId || "";
    }
  });

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.latestUpdatedAt || 0).getTime() - new Date(a.latestUpdatedAt || 0).getTime()
  );
};

export const buildClientRoute = (role, clientKey) => {
  const prefix = role === "admin" ? "/admin" : "/associate";
  return `${prefix}/clients/${encodeURIComponent(clientKey || "")}`;
};
