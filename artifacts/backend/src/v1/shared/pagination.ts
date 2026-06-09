export type PaginationInput = {
  page?: unknown;
  limit?: unknown;
};

export function getPagination(query: PaginationInput) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 12)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paged<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
