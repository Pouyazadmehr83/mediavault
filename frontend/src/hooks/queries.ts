import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api, type FileQuery } from "../lib/api";

const PAGE_SIZE = 60;

export function useFiles(params: Omit<FileQuery, "page" | "page_size">) {
  const query = useInfiniteQuery({
    queryKey: ["files", params],
    queryFn: ({ pageParam }) => api.files.list({ ...params, page: pageParam, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  const files = query.data?.pages.flatMap((p) => p.results) ?? [];
  const total = query.data?.pages[0]?.count ?? 0;
  return { ...query, files, total };
}

export function useAllAlbums() {
  return useQuery({
    queryKey: ["albums", "all"],
    queryFn: () => api.albums.list({ page_size: 100, ordering: "title" }),
    select: (d) => d.results,
  });
}
