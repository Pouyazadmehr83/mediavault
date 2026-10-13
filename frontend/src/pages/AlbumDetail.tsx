import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Globe, Pencil, Plus, SquareStack, Trash2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../lib/api";
import { MediaBrowser } from "../components/MediaBrowser";
import { AlbumForm } from "../components/AlbumForm";
import type { ShellContext } from "../components/AppShell";
import { Button, IconButton } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";

export function AlbumDetail() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pickFiles } = useOutletContext<ShellContext>();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const album = useQuery({ queryKey: ["albums", "detail", id], queryFn: () => api.albums.get(id), enabled: Number.isFinite(id) });

  const remove = useMutation({
    mutationFn: () => api.albums.remove(id),
    onSuccess: () => {
      toast.success("Album deleted");
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      navigate("/albums", { replace: true });
    },
    onError: (e: Error) => toast.error("Couldn't delete album", { description: e.message }),
  });

  if (album.isError)
    return (
      <EmptyState
        icon={<SquareStack />}
        title="Album not found"
        description="It may have been deleted."
        action={<Button variant="secondary" onClick={() => navigate("/albums")}>Back to Albums</Button>}
      />
    );

  const a = album.data;

  return (
    <>
      <MediaBrowser
        scope={{ album: id }}
        empty={{ title: "This album is empty", description: "Upload photos here, or move photos in from your library using the Info panel." }}
        header={(total) => (
          <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-8 md:pt-8">
            <Link to="/albums" className="-ml-1.5 mb-3 inline-flex items-center gap-0.5 rounded-lg py-1 pr-2 text-[15px] font-medium text-accent hover:underline">
              <ChevronLeft className="size-5" /> Albums
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                {a ? (
                  <h1 className="display truncate text-[32px] font-bold sm:text-[40px]">{a.title}</h1>
                ) : (
                  <div className="skeleton h-11 w-64 rounded-lg" />
                )}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] text-fg-2">
                  {total !== undefined && <span>{total} {total === 1 ? "photo" : "photos"}</span>}
                  {a?.is_public && (
                    <span className="inline-flex items-center gap-1 text-accent">
                      · <Globe className="size-3.5" /> Public
                    </span>
                  )}
                </p>
                {a?.description && <p className="mt-2 max-w-2xl text-[15px] text-fg-2">{a.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" icon={<Plus className="size-4" />} onClick={pickFiles}>
                  Add Photos
                </Button>
                <IconButton label="Edit album" onClick={() => setEditing(true)} disabled={!a}>
                  <Pencil className="size-[18px]" />
                </IconButton>
                <IconButton label="Delete album" onClick={() => setDeleting(true)} disabled={!a} className="hover:text-danger!">
                  <Trash2 className="size-[18px]" />
                </IconButton>
              </div>
            </div>
          </div>
        )}
      />

      <AlbumForm open={editing} onClose={() => setEditing(false)} album={a} />
      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete “${a?.title ?? "album"}”?`}
        description="The album will be removed. Its photos stay in your library."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Delete Album</Button>
          </>
        }
      >
        {null}
      </Dialog>
    </>
  );
}
