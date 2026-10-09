import {
  BarChart3,
  Bell,
  CalendarDays,
  ChartGantt,
  FileText,
  FolderKanban,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  Library,
  Lock,
  MessageSquare,
  MessagesSquare,
  Plug,
  Plus,
  Search,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { RelayMark } from "./primitives";
import {
  colors,
  CONTENT,
  fonts,
  stageColor,
  WINDOW,
  type StageName,
} from "./theme";

// Rail order and groups follow `src/components/workspace-shell.tsx`.
const nav = [
  [
    { id: "dashboard", icon: LayoutDashboard },
    { id: "calendar", icon: CalendarDays },
    { id: "timeline", icon: ChartGantt },
  ],
  [
    { id: "projects", icon: FolderKanban },
    { id: "clients", icon: UsersRound },
    { id: "reviews", icon: MessageSquare },
    { id: "files", icon: FileText },
    { id: "media", icon: Images },
    { id: "templates", icon: LayoutTemplate },
  ],
  [
    { id: "resources", icon: Library },
    { id: "integrations", icon: Plug },
    { id: "reports", icon: BarChart3 },
  ],
  [
    { id: "team", icon: Users },
    { id: "chat", icon: MessagesSquare },
    { id: "settings", icon: Settings },
  ],
] as const satisfies readonly (readonly { id: string; icon: LucideIcon }[])[];

export type NavId = (typeof nav)[number][number]["id"];

/** Window x of the "Quick create" button centre, used as a cursor target. */
export const QUICK_CREATE = {
  x: 1418,
  y: WINDOW.chrome + WINDOW.header / 2,
} as const;

/**
 * A browser window showing the Relay workspace in its light theme.
 * `children` fill the content area; `overlay` is positioned in window coordinates.
 */
export const AppWindow: React.FC<{
  url: string;
  page: string;
  active: NavId;
  children: ReactNode;
  overlay?: ReactNode;
  quickCreatePressed?: boolean;
  chromeless?: boolean;
}> = ({
  url,
  page,
  active,
  children,
  overlay,
  quickCreatePressed = false,
  chromeless = false,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.panel,
      border: `1px solid ${colors.strong}`,
      boxShadow:
        "0 70px 140px -50px rgba(24,24,27,0.32), 0 30px 60px -36px rgba(24,24,27,0.22)",
      fontFamily: fonts.sans,
      color: colors.ink,
    }}
  >
    <BrowserBar url={url} />
    {chromeless ? (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: WINDOW.chrome,
          right: 0,
          bottom: 0,
          backgroundColor: colors.canvas,
        }}
      >
        {children}
      </div>
    ) : (
      <>
        <AppHeader page={page} pressed={quickCreatePressed} />
        <Rail active={active} />
        <div
          style={{
            position: "absolute",
            left: CONTENT.x,
            top: CONTENT.y,
            width: CONTENT.width,
            height: CONTENT.height,
            backgroundColor: colors.canvas,
            borderTopLeftRadius: 14,
            borderLeft: `1px solid ${colors.border}`,
            borderTop: `1px solid ${colors.border}`,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </>
    )}
    {overlay}
  </div>
);

const BrowserBar: React.FC<{ url: string }> = ({ url }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: WINDOW.chrome,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 18px",
      backgroundColor: "#ececec",
      borderBottom: `1px solid ${colors.border}`,
    }}
  >
    {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
      <div
        key={color}
        style={{
          width: 13,
          height: 13,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
    ))}
    <div
      style={{
        marginLeft: 420,
        width: 520,
        height: 28,
        borderRadius: 7,
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: 14,
        color: colors.muted,
      }}
    >
      <Lock size={12} strokeWidth={2.4} />
      {url}
    </div>
  </div>
);

const AppHeader: React.FC<{ page: string; pressed: boolean }> = ({
  page,
  pressed,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: WINDOW.chrome,
      height: WINDOW.header,
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      backgroundColor: colors.panel,
    }}
  >
    <RelayMark size={26} />
    <span style={{ marginLeft: 26, fontSize: 15, color: colors.muted }}>
      Relay
    </span>
    <span style={{ margin: "0 10px", fontSize: 15, color: colors.strong }}>
      /
    </span>
    <span style={{ fontSize: 15, fontWeight: 600 }}>{page}</span>
    <div
      style={{
        position: "absolute",
        left: WINDOW.width / 2 - 190,
        width: 380,
        height: 36,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px",
        fontSize: 15,
        color: colors.muted,
      }}
    >
      <Search size={16} />
      Quick search
      <span
        style={{ marginLeft: "auto", fontFamily: fonts.mono, fontSize: 12 }}
      >
        Ctrl K
      </span>
    </div>
    <div
      style={{
        position: "absolute",
        left: QUICK_CREATE.x - 76,
        width: 152,
        height: 38,
        borderRadius: 8,
        backgroundColor: colors.ink,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: 15,
        fontWeight: 500,
        scale: pressed ? "0.94" : "1",
      }}
    >
      <Plus size={17} strokeWidth={2.4} />
      Quick create
    </div>
    <Bell size={20} style={{ position: "absolute", left: 1514 }} />
    <Avatar
      initials="AR"
      size={34}
      style={{ position: "absolute", left: 1548 }}
      tone="#e4e4e7"
    />
  </div>
);

const Rail: React.FC<{ active: NavId }> = ({ active }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: CONTENT.y,
      width: WINDOW.rail,
      bottom: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 14,
      backgroundColor: colors.panel,
    }}
  >
    {nav.map((group, index) => (
      <div
        key={group[0].id}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          paddingBottom: 12,
          marginBottom: 12,
          borderBottom:
            index < nav.length - 1 ? `1px solid ${colors.border}` : "none",
        }}
      >
        {group.map(({ id, icon: Icon }) => (
          <div
            key={id}
            style={{
              width: 40,
              height: 38,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: id === active ? colors.selected : "transparent",
              color: id === active ? colors.ink : colors.muted,
            }}
          >
            <Icon size={19} strokeWidth={id === active ? 2.3 : 1.8} />
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const Panel: React.FC<{
  children: ReactNode;
  style?: CSSProperties;
}> = ({ children, style }) => (
  <div
    style={{
      backgroundColor: colors.panel,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Small square stage badge with a colour dot. Badges are never pills in Relay. */
export const StageBadge: React.FC<{ stage: StageName; size?: number }> = ({
  stage,
  size = 13,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 7px",
      borderRadius: 4,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.panel,
      fontSize: size,
      fontWeight: 500,
      whiteSpace: "nowrap",
      color: colors.text2,
    }}
  >
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: 2,
        backgroundColor: stageColor(stage),
      }}
    />
    {stage}
  </span>
);

export const Avatar: React.FC<{
  initials: string;
  size?: number;
  tone?: string;
  style?: CSSProperties;
}> = ({ initials, size = 28, tone = colors.selected, style }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: tone,
      border: `1px solid ${colors.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.38,
      fontWeight: 600,
      color: colors.ink,
      flexShrink: 0,
      ...style,
    }}
  >
    {initials}
  </div>
);

export const Progress: React.FC<{
  value: number;
  width?: number | string;
  color?: string;
  height?: number;
}> = ({ value, width = "100%", color = colors.ink, height = 6 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${Math.min(100, Math.max(0, value))}%`,
        height: "100%",
        backgroundColor: color,
      }}
    />
  </div>
);

/** Uppercase label used on Relay's metric cards. */
export const MetricLabel: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.08em",
      color: colors.muted,
    }}
  >
    {children}
  </div>
);
