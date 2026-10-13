import { useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Images, Link2, LogOut, Monitor, Moon, Plus, Sun, SquareStack } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../providers/auth";
import { useTheme, type ThemePreference } from "../providers/theme";
import { useUploads } from "../providers/uploads";
import { ALLOWED_EXTENSIONS } from "../lib/api";
import { initials } from "../lib/format";
import { springFast } from "../lib/motion";
import { Logo } from "./Logo";
import { UploadPanel } from "./UploadPanel";
import { DropZone } from "./DropZone";
import { Button } from "./ui/Button";

const NAV = [
  { to: "/", label: "Library", icon: Images, end: true },
  { to: "/albums", label: "Albums", icon: SquareStack, end: false },
  { to: "/shared", label: "Shared Links", icon: Link2, end: false },
];

export function AppShell() {
  const albumMatch = useMatch("/albums/:id");
  const album = albumMatch ? Number(albumMatch.params.id) : null;
  const { upload } = useUploads();
  const input = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const pickFiles = () => input.current?.click();

  return (
    <div className="min-h-dvh md:pl-[248px]">
      <Sidebar onUpload={pickFiles} />

      <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Outlet context={{ pickFiles }} />
          </motion.div>
        </AnimatePresence>
      </main>

      <TabBar onUpload={pickFiles} />

      <input
        ref={input}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files, album);
          e.target.value = "";
        }}
      />
      <DropZone album={album} />
      <UploadPanel />
    </div>
  );
}

export interface ShellContext {
  pickFiles: () => void;
}

function Sidebar({ onUpload }: { onUpload: () => void }) {
  const { user, logout } = useAuth();

  return (
    <aside className="material-sidebar fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line md:flex">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <Logo className="size-8" />
        <span className="title text-[17px] font-semibold">MediaVault</span>
      </div>

      <div className="px-3">
        <Button className="w-full" icon={<Plus className="size-4" />} onClick={onUpload}>
          Upload
        </Button>
      </div>

      <nav aria-label="Main" className="mt-5 flex flex-col gap-0.5 px-3">
        <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-fg-3 uppercase">Vault</p>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="group relative rounded-lg">
            {({ isActive }) => (
              <span
                className={clsx(
                  "pressable relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                  isActive ? "text-accent" : "text-fg hover:bg-line",
                )}
              >
                {isActive && (
                  <motion.span layoutId="nav-active" transition={springFast} className="absolute inset-0 rounded-lg bg-accent-soft" />
                )}
                <Icon className="relative size-[18px]" />
                <span className="relative">{label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-line p-3">
        <ThemeSwitcher />
        {user && (
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-[13px] font-semibold text-white">
              {initials(user.first_name, user.last_name, user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">
                {[user.first_name, user.last_name].filter(Boolean).join(" ") || "Your vault"}
              </p>
              <p className="truncate text-xs text-fg-2">{user.email}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="pressable flex size-8 cursor-pointer items-center justify-center rounded-full text-fg-2 hover:bg-line hover:text-fg"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
];

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 rounded-[10px] bg-line p-0.5">
      {THEMES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={clsx(
            "relative flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors",
            theme === value ? "text-fg" : "text-fg-2 hover:text-fg",
          )}
        >
          {theme === value && (
            <motion.span layoutId="theme-active" transition={springFast} className="absolute inset-0 rounded-lg bg-surface shadow-card" />
          )}
          <Icon className="relative size-3.5" />
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function TabBar({ onUpload }: { onUpload: () => void }) {
  const { logout } = useAuth();
  const [confirm, setConfirm] = useState(false);
  return (
    <nav
      aria-label="Main"
      className="material fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            clsx("pressable flex min-w-16 flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium", isActive ? "text-accent" : "text-fg-2")
          }
        >
          <Icon className="size-6" strokeWidth={1.75} />
          {label.split(" ")[0]}
        </NavLink>
      ))}
      <button onClick={onUpload} className="pressable flex min-w-16 flex-1 cursor-pointer flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium text-fg-2">
        <Plus className="size-6" strokeWidth={1.75} />
        Upload
      </button>
      <button
        onClick={() => (confirm ? logout() : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        className={clsx("pressable flex min-w-16 flex-1 cursor-pointer flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium", confirm ? "text-danger" : "text-fg-2")}
      >
        <LogOut className="size-6" strokeWidth={1.75} />
        {confirm ? "Confirm" : "Sign out"}
      </button>
    </nav>
  );
}
