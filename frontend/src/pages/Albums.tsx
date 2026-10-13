import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { FolderPlus, Globe, Images, SearchX, SquareStack, TriangleAlert } from "lucide-react";
import { api } from "../lib/api";
import type { Album } from "../lib/types";
import { useDebounced } from "../hooks/useDebounced";
import { PageHeader } from "../components/PageHeader";
import { SearchField } from "../components/SearchField";
import { AlbumForm } from "../components/AlbumForm";
import { EmptyState } from "../components/ui/EmptyState";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { spring } from "../lib/motion";

export function Albums() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search.trim());

  const query = useInfiniteQuery({
    queryKey: ["albums", "list", debounced],
    queryFn: ({ pageParam }) => api.albums.list({ page: pageParam, page_size: 48, search: debounced || undefined }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  const albums = query.data?.pages.flatMap((p) => p.results) ?? [];
  const total = query.data?.pages[0]?.count;

  return (
    <>
      <PageHeader
        title="Albums"
        subtitle={total !== undefined ? `${total} ${total === 1 ? "album" : "albums"}` : " "}
        actions={
          <Button icon={<FolderPlus className="size-4" />} onClick={() => setCreating(true)}>
            <span className="hidden sm:inline">New Album</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
        toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search albums" />}
      />

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8">
        {query.isPending ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-6">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i}>
                <div className="skeleton aspect-square rounded-2xl" />
                <div className="skeleton mt-3 h-4 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState icon={<TriangleAlert />} title="Couldn't load albums" description={query.error.message} action={<Button variant="secondary" onClick={() => query.refetch()}>Try again</Button>} />
        ) : !albums.length && debounced ? (
          <EmptyState icon={<SearchX />} title="No albums found" description={`No album matches “${debounced}”.`} />
        ) : !albums.length ? (
          <EmptyState
            icon={<SquareStack />}
            title="No albums yet"
            description="Albums keep related photos together: trips, projects, people."
            action={<Button icon={<FolderPlus className="size-4" />} onClick={() => setCreating(true)}>Create an album</Button>}
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-6">
              {albums.map((album, i) => (
                <AlbumCard key={album.id} album={album} index={i} />
              ))}
            </ul>
            {query.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
        {query.isFetching && !query.isPending && !query.isFetchingNextPage && (
          <div className="fixed top-4 right-4 text-fg-3"><Spinner className="size-4" /></div>
        )}
      </div>

      <AlbumForm open={creating} onClose={() => setCreating(false)} onSaved={(a) => navigate(`/albums/${a.id}`)} />
    </>
  );
}

function AlbumCard({ album, index }: { album: Album; index: number }) {
  return (
    <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: Math.min(index, 12) * 0.03 }}>
      <Link to={`/albums/${album.id}`} className="group block rounded-2xl">
        <div className="pressable relative aspect-square overflow-hidden rounded-2xl bg-surface-2 shadow-card">
          {album.cover_url ? (
            <img src={album.cover_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-surface-2 to-line text-fg-3">
              <Images className="size-10" strokeWidth={1.5} />
            </div>
          )}
          {album.is_public && (
            <span className="material absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-fg">
              <Globe className="size-3" /> Public
            </span>
          )}
        </div>
        <p className="mt-2.5 truncate text-[15px] font-semibold group-hover:text-accent">{album.title}</p>
        <p className="text-[13px] text-fg-2">
          {album.media_count} {album.media_count === 1 ? "photo" : "photos"}
        </p>
      </Link>
    </motion.li>
  );
}
