import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, api } from "../lib/api";
import type { Album } from "../lib/types";
import { Dialog } from "./ui/Dialog";
import { Field, TextArea } from "./ui/Field";
import { Switch } from "./ui/Switch";
import { Button } from "./ui/Button";

interface AlbumFormProps {
  open: boolean;
  onClose: () => void;
  album?: Album;
  onSaved?: (album: Album) => void;
}

export function AlbumForm({ open, onClose, album, onSaved }: AlbumFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) return;
    setTitle(album?.title ?? "");
    setDescription(album?.description ?? "");
    setIsPublic(album?.is_public ?? false);
    setError(undefined);
  }, [open, album]);

  const save = useMutation({
    mutationFn: () => {
      const body = { title: title.trim(), description: description.trim(), is_public: isPublic };
      return album ? api.albums.update(album.id, body) : api.albums.create(body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["albums"] });
      toast.success(album ? "Album updated" : `Created “${saved.title}”`);
      onSaved?.(saved);
      onClose();
    },
    onError: (e: Error) => setError(e instanceof ApiError ? (e.fields.title ?? e.message) : e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give your album a name.");
    save.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} title={album ? "Edit album" : "New album"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" value={title} onChange={(e) => { setTitle(e.target.value); setError(undefined); }} placeholder="Summer 2026" error={error} maxLength={255} />
        <TextArea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this album about?" />
        <div className="rounded-xl bg-surface-2 px-4 py-3">
          <Switch checked={isPublic} onChange={setIsPublic} label="Public album" description="Mark this album as public" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {album ? "Save" : "Create album"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
