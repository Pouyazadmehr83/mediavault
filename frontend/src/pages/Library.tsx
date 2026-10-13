import { useState } from "react";
import { MediaBrowser } from "../components/MediaBrowser";
import { Segmented } from "../components/ui/Segmented";

type Filter = "all" | "unsorted";

export function Library() {
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <MediaBrowser
      scope={filter === "unsorted" ? { no_album: true } : {}}
      filters={
        <Segmented
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All Photos" },
            { value: "unsorted", label: "Not in Album" },
          ]}
        />
      }
      empty={
        filter === "unsorted"
          ? { title: "Everything's organized", description: "Every photo is in an album. Nice work." }
          : { title: "Your library is empty", description: "Upload photos, or drag them anywhere onto this window." }
      }
      header={(total) => (
        <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-8 md:pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="display text-[32px] font-bold sm:text-[40px]">Library</h1>
              <p className="mt-1 h-6 text-[15px] text-fg-2">
                {total !== undefined && `${total.toLocaleString()} ${total === 1 ? "photo" : "photos"}`}
              </p>
            </div>
          </div>
        </div>
      )}
    />
  );
}
