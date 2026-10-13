import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./providers/auth";
import { UploadsProvider } from "./providers/uploads";
import { AppShell } from "./components/AppShell";
import { Logo } from "./components/Logo";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Library } from "./pages/Library";
import { Albums } from "./pages/Albums";
import { AlbumDetail } from "./pages/AlbumDetail";
import { Shared } from "./pages/Shared";
import { PublicShare } from "./pages/PublicShare";
import { NotFound } from "./pages/NotFound";

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Logo className="size-12 animate-pulse" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <Splash />;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <UploadsProvider>{children}</UploadsProvider>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return <Splash />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/s/:token" element={<PublicShare />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Library />} />
        <Route path="albums" element={<Albums />} />
        <Route path="albums/:id" element={<AlbumDetail />} />
        <Route path="shared" element={<Shared />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
