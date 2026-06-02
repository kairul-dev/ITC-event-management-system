"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type RoleNavItem = {
  href: string;
  label: string;
  section?: string;
  icon: React.ReactNode;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  count: number;
  type: "paperwork" | "certificate";
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

export default function RoleDashboardShell({
  title,
  roleLabel,
  navItems,
  children,
  onLogout,
}: {
  title: string;
  roleLabel: string;
  navItems: RoleNavItem[];
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentSearch, setCurrentSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [displayName, setDisplayName] = useState(roleLabel);
  const [avatarUrl, setAvatarUrl] = useState("");
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarWidth = "16rem";
  const profileHref =
    navItems.find((item) => item.label.toLowerCase() === "profile")?.href ??
    navItems.find((item) => item.section?.toLowerCase() === "account")?.href ??
    navItems[0]?.href ??
    "/";
  const roleInitial = displayName.trim().charAt(0).toUpperCase() || roleLabel.trim().charAt(0).toUpperCase() || "U";
  const totalNotificationCount = notificationItems.reduce(
    (total, item) => total + item.count,
    0
  );
  const unreadCount = notificationsRead ? 0 : totalNotificationCount;
  const isAdminShell = roleLabel.toLowerCase() === "admin";
  const sidebarVisible = isDesktop ? !desktopSidebarCollapsed : sidebarOpen;

  const getNotificationHref = (item: NotificationItem) => {
    if (item.type === "certificate") {
      if (pathname.startsWith("/admin")) return "/admin/certificates";
      if (pathname.startsWith("/club-advisor")) return "/club-advisor/certificates";
      if (pathname.startsWith("/high-council")) return "/high-council/certificates";
      return "/student/certificates";
    }

    if (pathname.startsWith("/admin")) return "/admin/approval-status";
    if (pathname.startsWith("/high-council")) return "/high-council/events";
    if (pathname.startsWith("/club-advisor")) return "/club-advisor/events";
    return navItems.find((item) => item.label.toLowerCase().includes("event"))?.href ?? "/";
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentSearch(window.location.search);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncLayout = () => {
      setIsDesktop(media.matches);
      if (media.matches) {
        setSidebarOpen(false);
      }
    };

    syncLayout();
    media.addEventListener("change", syncLayout);
    return () => media.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setNotificationItems([]);
          setNotificationsRead(false);
          return;
        }

        const response = await fetch("/api/notifications/summary", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          setNotificationItems([]);
          return;
        }

        const result = (await response.json()) as {
          items?: NotificationItem[];
        };

        setNotificationItems(Array.isArray(result.items) ? result.items : []);
        setNotificationsRead(false);
      } finally {
        setNotificationsLoading(false);
      }
    };

    loadNotifications();
  }, [pathname]);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(data?.name || user.email || roleLabel);
      setAvatarUrl(
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : ""
      );
    };

    void loadProfile();
  }, [roleLabel]);

  useEffect(() => {
    const handleProfileImageUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ avatarUrl?: string }>).detail;
      if (detail?.avatarUrl !== undefined) {
        setAvatarUrl(detail.avatarUrl);
      }
    };

    window.addEventListener("profile-avatar-updated", handleProfileImageUpdate);
    return () => window.removeEventListener("profile-avatar-updated", handleProfileImageUpdate);
  }, []);

  const isActive = (href: string) => {
    const [path, queryAndHash] = href.split("?");
    if (pathname !== path) return false;
    if (!queryAndHash) return true;

    const expectedParams = new URLSearchParams(queryAndHash.split("#")[0]);
    const currentParams = new URLSearchParams(currentSearch);
    for (const [key, value] of expectedParams.entries()) {
      if (currentParams.get(key) !== value) return false;
    }

    return true;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 antialiased">
      {!isDesktop && sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-slate-950/55 backdrop-blur-[1px] lg:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className="fixed inset-y-0 left-0 z-30 flex h-dvh w-[78vw] min-w-56 max-w-64 flex-col border-r border-slate-200 bg-white text-slate-950 shadow-none transition-transform duration-200 no-print sm:w-72 lg:w-64"
        style={{
          width: isDesktop ? sidebarWidth : undefined,
          transform: sidebarVisible ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-700 text-sm font-black text-white shadow-sm sm:h-11 sm:w-11">
            ITC
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-lg font-black tracking-tight text-slate-950">ITC</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Event Management System</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
            title="Close menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto bg-white px-2.5 pb-4 pt-3 text-sm sm:px-3">
          {navItems.map((item, index) => (
            <div key={`${item.href}-${item.label}`}>
              {item.section && (
                <p className={`${index === 1 ? "mt-3" : "mt-5"} mb-2 px-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-400`}>
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 font-semibold transition ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "text-slate-700 hover:bg-slate-100 hover:text-blue-700"
                }`}
              >
                <Icon>{item.icon}</Icon>
                <span>{item.label}</span>
              </Link>
            </div>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-slate-100 bg-white px-3 py-3">
          <Link
            href={profileHref}
            onClick={() => setSidebarOpen(false)}
            className="mb-2 flex items-center gap-3 rounded-md px-3 py-2.5 transition hover:bg-slate-50"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${displayName} profile`}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700 ring-1 ring-blue-100">
                {roleInitial}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-950">{displayName}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">ITC {roleLabel}</span>
            </span>
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50"
            title="Logout"
          >
            <Icon>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17l5-5-5-5M20 12H9m2 8H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" />
            </Icon>
            Logout
          </button>
        </div>
      </aside>

      <div
        className="dashboard-shell-content min-w-0 transition-[padding] duration-200 print:!pl-0"
        style={{ paddingLeft: isDesktop && !desktopSidebarCollapsed ? sidebarWidth : 0 }}
      >
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur no-print sm:px-5 lg:h-16 lg:px-6 lg:py-0">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4 lg:gap-5">
            <button
              onClick={() => {
                if (isDesktop) {
                  setDesktopSidebarCollapsed((collapsed) => !collapsed);
                  return;
                }

                setSidebarOpen((open) => !open);
              }}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
              title={sidebarVisible ? "Close sidebar" : "Open sidebar"}
              aria-label={sidebarVisible ? "Close sidebar" : "Open sidebar"}
              aria-expanded={sidebarVisible}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-3"
              title="Go back"
              aria-label="Go back to previous page"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19 8 12l7-7" />
              </svg>
            </button>
            <h1 className="min-w-0 max-w-[9.5rem] truncate text-base font-black leading-tight text-slate-950 sm:max-w-none sm:text-lg">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 lg:gap-5">
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setUserMenuOpen(false);
                }}
                className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
                title="Notifications"
                aria-haspopup="menu"
                aria-expanded={notificationsOpen}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  role="menu"
                  className="fixed inset-x-3 top-[4.75rem] z-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-950/10 sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">Notifications</p>
                      <p className="text-xs font-medium text-slate-500">
                        {notificationsLoading
                          ? "Checking notifications"
                          : unreadCount > 0
                          ? `${unreadCount} ${unreadCount === 1 ? "alert" : "alerts"}`
                          : "All caught up"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsRead(true)}
                      disabled={unreadCount === 0}
                      className="rounded-lg px-2.5 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                    >
                      Read all
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto py-1">
                    {notificationsLoading ? (
                      <div className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                        Loading notifications...
                      </div>
                    ) : notificationItems.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm font-bold text-slate-950">
                          {isAdminShell ? "No admin alerts right now" : "No approvals waiting"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {isAdminShell
                            ? "Rejected paperwork and workflow issues will appear here."
                            : "Paperwork that needs your action will appear here."}
                        </p>
                      </div>
                    ) : (
                      notificationItems.map((item) => (
                        <Link
                          key={item.id}
                          href={getNotificationHref(item)}
                          role="menuitem"
                          onClick={() => setNotificationsOpen(false)}
                          className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notificationsRead ? "bg-slate-300" : "bg-blue-600"}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-slate-950">{item.title}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-600">{item.message}</span>
                            <span className="mt-1 block text-xs font-semibold text-slate-400">
                              {item.count} pending
                            </span>
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                title="Account menu"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${displayName} profile`}
                    className="h-9 w-9 rounded-full border-2 border-blue-50 object-cover shadow-sm sm:h-10 sm:w-10"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-50 bg-blue-100 text-sm font-extrabold text-blue-700 shadow-sm sm:h-10 sm:w-10">
                    {roleInitial}
                  </div>
                )}
                <div className="hidden leading-tight sm:block">
                  <p className="text-sm font-bold leading-5 text-slate-950">{displayName}</p>
                  <p className="text-xs font-medium leading-5 text-slate-500">ITC {roleLabel}</p>
                </div>
                <svg className={`h-4 w-4 text-slate-500 transition ${userMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-2 shadow-xl shadow-slate-950/10"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-bold text-slate-950">{displayName}</p>
                    <p className="text-xs font-medium text-slate-500">ITC {roleLabel}</p>
                  </div>
                  <Link
                    href={profileHref}
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Icon>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />
                    </Icon>
                    Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Icon>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17l5-5-5-5M20 12H9m2 8H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" />
                    </Icon>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="dashboard-shell-main min-w-0 px-4 py-5 print:!px-0 print:!py-0 print:bg-white sm:px-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
