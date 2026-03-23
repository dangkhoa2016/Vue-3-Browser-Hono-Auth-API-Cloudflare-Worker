export const DEFAULT_ADMIN_PAGE_SIZE = 20;
export const DEFAULT_ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50];

export const resolveAdminPageSize = (value, fallback = DEFAULT_ADMIN_PAGE_SIZE) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const stringifyAdminPageSize = (value, fallback = DEFAULT_ADMIN_PAGE_SIZE) => String(resolveAdminPageSize(value, fallback));

export const buildAdminPageSizeOptions = (...groups) => {
	const normalized = groups
		.flat()
		.map((value) => Number.parseInt(value, 10))
		.filter((value) => Number.isFinite(value) && value > 0);

	const unique = Array.from(new Set(normalized)).sort((left, right) => left - right);
	return unique.length ? unique : [...DEFAULT_ADMIN_PAGE_SIZE_OPTIONS];
};
