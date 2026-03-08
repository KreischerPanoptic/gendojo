import {
  Box,
  Flex,
  NavLink,
  Tooltip,
  Text,
  ActionIcon,
  Divider,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconLayoutSidebar,
  IconSettings,
  IconLogout,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import {
  useMenuOpened,
  useMenuOpen,
  useMenuClose,
} from "@stores/navigationStore";
import { useLogout } from "@services/auth";
import { useSystemSnapshot } from "@services/system";
import type { RecursiveNavLinkProps, SideMenuProps } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSED_W = 52; // px — icon-only
const EXPANDED_W = 280; // px — labels visible

// ─────────────────────────────────────────────────────────────────────────────
// System stats strip — shown at the bottom of the sidebar
// ─────────────────────────────────────────────────────────────────────────────

function SystemStats({ expanded }: { expanded: boolean }) {
  const { data, isError } = useSystemSnapshot();

  // DEV: log actual response shape once to verify field names
  if (import.meta.env.DEV && data) {
    console.log(
      "[SystemStats] snapshot shape:",
      JSON.stringify(Object.keys(data)),
    );
    console.log("[SystemStats] gpus field:", data.gpus);
  }

  // Color based on utilization
  const color = (pct: number) =>
    pct >= 90
      ? "var(--mantine-color-red-5)"
      : pct >= 70
        ? "var(--mantine-color-yellow-5)"
        : "var(--mantine-color-teal-5)";

  // Guard first — data may be undefined on first render or loading state.
  // gpu assignment moved below intentionally (was crashing before this check).
  if (isError || !data) {
    return (
      <Tooltip
        label="System stats unavailable"
        position="right"
        withArrow
        disabled={expanded}
      >
        <Flex
          align="center"
          gap={6}
          px={expanded ? "sm" : 0}
          justify={expanded ? "flex-start" : "center"}
          style={{ opacity: 0.4 }}
        >
          <IconAlertTriangle size={16} />
          {expanded && (
            <Text
              size="xs"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}
            >
              unavailable
            </Text>
          )}
        </Flex>
      </Tooltip>
    );
  }

  // Safe: data is guaranteed non-null below this point
  // gpu may still be undefined if the server has no GPU (valid state)
  const gpu = Array.isArray(data.gpus) ? data.gpus[0] : undefined;

  if (!expanded) {
    // Collapsed: just a colored GPU % dot
    const pct = gpu?.utilization.gpuPercent ?? 0;
    return (
      <Tooltip
        label={
          gpu
            ? `GPU ${pct}% · ${(gpu.vram.usedMiB / 1024).toFixed(1)}/${(gpu.vram.totalMiB / 1024).toFixed(1)} GB · ${gpu.temperatureCelsius}°C`
            : "No GPU"
        }
        position="right"
        withArrow
      >
        <Flex justify="center" align="center" style={{ height: 32 }}>
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: gpu ? color(pct) : "var(--mantine-color-gray-6)",
            }}
          />
        </Flex>
      </Tooltip>
    );
  }

  // Expanded: one compact row
  return (
    <Flex direction="column" gap={4} px="sm">
      <Text
        size="xs"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.6rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--mantine-color-dimmed)",
        }}
      >
        system
      </Text>
      {gpu ? (
        <>
          <Flex justify="space-between">
            <Text
              size="xs"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                color: "var(--mantine-color-dimmed)",
              }}
            >
              GPU
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: color(gpu.utilization.gpuPercent),
              }}
            >
              {gpu.utilization.gpuPercent}%
            </Text>
          </Flex>
          <Flex justify="space-between">
            <Text
              size="xs"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                color: "var(--mantine-color-dimmed)",
              }}
            >
              VRAM
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: color((gpu.vram.usedMiB / gpu.vram.totalMiB) * 100),
              }}
            >
              {(gpu.vram.usedMiB / 1024).toFixed(1)}/
              {(gpu.vram.totalMiB / 1024).toFixed(0)} GB
            </Text>
          </Flex>
          <Flex justify="space-between">
            <Text
              size="xs"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                color: "var(--mantine-color-dimmed)",
              }}
            >
              TEMP
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                fontWeight: 600,
                color:
                  gpu.temperatureCelsius >= 85
                    ? "var(--mantine-color-red-5)"
                    : undefined,
              }}
            >
              {gpu.temperatureCelsius}°C
            </Text>
          </Flex>
        </>
      ) : (
        <Text
          size="xs"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            color: "var(--mantine-color-dimmed)",
          }}
        >
          No GPU detected
        </Text>
      )}
      {/* <Flex justify="space-between" mt={2}>
        <Text size="xs" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--mantine-color-dimmed)' }}>
          Disk free
        </Text>
        <Text size="xs" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
          {(data.disks.freeBytes / 1024 ** 3).toFixed(0)} GB
        </Text>
      </Flex> */}
    </Flex>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recursive nav item
// ─────────────────────────────────────────────────────────────────────────────

function RecursiveNavLink({
  block,
  path,
  depth,
  expandedItems,
  onToggle,
  sidebarOpened,
}: RecursiveNavLinkProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const hasChildren = Boolean(block.children?.length);
  const isExpanded = expandedItems.has(path);

  const isActive = block.link
    ? hasChildren
      ? pathname.startsWith(block.link)
      : pathname === block.link
    : false;

  // Для collapsed-родителя: светимся если любой дочерний роут активен
  const isChildActive = hasChildren
    ? (block.children?.some((c) => c.link && pathname.startsWith(c.link)) ??
      false)
    : false;

  const showActiveIndicator =
    !sidebarOpened && depth === 0 && (isActive || isChildActive);

  const handleClick = () => {
    if (!sidebarOpened && hasChildren && block.link) {
      navigate({ to: block.link });
      return;
    }
    onToggle(path, hasChildren);
  };

  const navLink = (
    // Оборачиваем в Box для right-border индикатора
    <Box style={{ position: "relative" }}>
      {showActiveIndicator && (
        <>
          {/* Градиент-шлейф */}
          <Box
            style={{
              position: "absolute",
              right: -7,
              top: "50%",
              transform: "translateY(-50%)",
              width: 52, // на всю ширину collapsed сайдбара
              height: 40,
              background:
                "linear-gradient(to left, rgba(249, 115, 22, 0.12), transparent)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          {/* Линия */}
          <Box
            style={{
              position: "absolute",
              right: -7,
              top: "50%",
              transform: "translateY(-50%)",
              width: 3,
              height: 44,
              borderRadius: "3px 0 0 3px",
              background: "var(--gd-accent)",
              zIndex: 101,
              pointerEvents: "none",
            }}
          />
        </>
      )}
      <NavLink
        component={!hasChildren && block.link ? Link : undefined}
        to={!hasChildren && block.link ? block.link : undefined}
        activeOptions={{ exact: true }}
        href={undefined}
        label={
          sidebarOpened ? block.label : depth === 0 ? undefined : block.label
        }
        leftSection={block.icon}
        childrenOffset={depth === 0 ? COLLAPSED_W - 4 : 24}
        disabled={block.disabled}
        opened={isExpanded}
        active={isActive && !hasChildren}
        onClick={handleClick}
        styles={{
          root: {
            height: 40,
            borderRadius: 6,
            transition: "background 120ms ease",
            // Подсвечиваем фон иконки если мы внутри этой секции
            // background: showActiveIndicator
            //   ? "var(--gd-accent-dim)"
            //   : undefined,
          },
          label: {
            fontSize: "0.875rem",
            fontWeight: isActive ? 600 : 400,
          },
        }}
      >
        {sidebarOpened &&
          block.children?.map((child, idx) => (
            <RecursiveNavLink
              key={idx}
              block={child}
              path={`${path}-${idx}`}
              depth={depth + 1}
              expandedItems={expandedItems}
              onToggle={onToggle}
              sidebarOpened={sidebarOpened}
              hoverClass=""
            />
          ))}
      </NavLink>
    </Box>
  );

  if (depth === 0 && !sidebarOpened) {
    return (
      <Tooltip
        label={block.disabled ? `${block.label} (coming soon)` : block.label}
        position="right"
        withArrow
        offset={8}
      >
        <div>{navLink}</div>
      </Tooltip>
    );
  }

  return navLink;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SideMenu
// ─────────────────────────────────────────────────────────────────────────────

export function SideMenu({ blocks }: SideMenuProps) {
  const opened = useMenuOpened();
  const openMenu = useMenuOpen();
  const closeMenu = useMenuClose();
  const logoutMutation = useLogout();

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Collapse all when sidebar closes
  useEffect(() => {
    if (!opened) return;

    blocks.forEach((block, idx) => {
      const hasActiveChild = block.children?.some(
        (c) => c.link && pathname.startsWith(c.link),
      );
      if (hasActiveChild) {
        setExpandedItems((prev) => {
          const next = new Set(prev);
          next.add(String(idx));
          return next;
        });
      }
    });
  }, [opened]);

  const handleToggle = useCallback(
    (path: string, hasChildren: boolean) => {
      if (!hasChildren) return; // лист — навигацию сделает сам Link

      if (!opened) openMenu();

      setExpandedItems((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          for (const key of next) {
            if (key === path || key.startsWith(`${path}-`)) next.delete(key);
          }
        } else {
          next.add(path);
        }
        return next;
      });
    },
    [opened, openMenu], // closeMenu больше не нужен
  );

  const w = opened ? EXPANDED_W : COLLAPSED_W;

  return (
    <Box
      component="nav"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: w,
        background: "var(--gd-surface)",
        borderRight: "1px solid var(--gd-border)",
        transition: "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Toggle button ───────────────────────────────────────────── */}
      <Flex
        align="center"
        justify={opened ? "space-between" : "center"}
        px={opened ? "sm" : 0}
        style={{
          height: 52,
          flexShrink: 0,
          borderBottom: "1px solid var(--gd-border-sub)",
        }}
      >
        {opened && (
          <Text
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "var(--gd-accent)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            GenDojo
          </Text>
        )}
        <Tooltip
          label={opened ? "Collapse" : "Expand"}
          position="right"
          withArrow
          disabled={opened}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={opened ? closeMenu : openMenu}
            aria-label="Toggle sidebar"
          >
            {opened ? (
              <IconChevronLeft size={16} />
            ) : (
              <IconLayoutSidebar size={16} />
            )}
          </ActionIcon>
        </Tooltip>
      </Flex>

      {/* ── Primary nav ─────────────────────────────────────────────── */}
      <Flex
        direction="column"
        gap={2}
        p={6}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        {blocks.map((block, idx) => (
          <RecursiveNavLink
            key={idx}
            block={block}
            path={String(idx)}
            depth={0}
            expandedItems={expandedItems}
            onToggle={handleToggle}
            sidebarOpened={opened}
            hoverClass=""
          />
        ))}
      </Flex>

      {/* ── Bottom section ───────────────────────────────────────────── */}
      <Flex
        direction="column"
        gap={8}
        py="sm"
        style={{ borderTop: "1px solid var(--gd-border-sub)", flexShrink: 0 }}
      >
        {/* System stats */}
        <SystemStats expanded={opened} />

        <Divider mx={opened ? "sm" : "xs"} />

        {/* Settings */}
        <Flex direction="column" gap={2} px={6}>
          <Tooltip
            label="Settings"
            position="right"
            withArrow
            disabled={opened}
          >
            <div>
              <NavLink
                component={Link}
                to="/settings"
                label={opened ? "Settings" : undefined}
                leftSection={<IconSettings size={17} stroke={1.5} />}
                styles={{
                  root: {
                    height: 36,
                    borderRadius: 6,
                    // paddingLeft: opened ? 12 : 0,
                    // justifyContent: !opened ? 'center' : undefined,
                  },
                  label: { fontSize: "0.875rem" },
                }}
              />
            </div>
          </Tooltip>

          {/* Logout */}
          <Tooltip
            label="Sign out"
            position="right"
            withArrow
            disabled={opened}
          >
            <div>
              <NavLink
                label={opened ? "Sign out" : undefined}
                leftSection={<IconLogout size={17} stroke={1.5} />}
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                styles={{
                  root: {
                    height: 36,
                    borderRadius: 6,
                    // paddingLeft: opened ? 12 : 0,
                    // justifyContent: !opened ? 'center' : undefined,
                    color: "var(--mantine-color-red-6)",
                  },
                  label: {
                    fontSize: "0.875rem",
                    color: "var(--mantine-color-red-6)",
                  },
                }}
              />
            </div>
          </Tooltip>
        </Flex>
      </Flex>
    </Box>
  );
}
