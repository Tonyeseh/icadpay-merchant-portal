export interface PaginatedResult<TItem> {
  items: TItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
