import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState";

export function NotFound() {
  return (
    <EmptyState
      icon={<Compass />}
      title="Page not found"
      description="This page doesn't exist."
      action={<Link to="/" className="font-medium text-accent hover:underline">Go to Library</Link>}
    />
  );
}
