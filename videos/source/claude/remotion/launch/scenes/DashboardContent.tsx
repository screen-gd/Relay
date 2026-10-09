import {
  ArrowRight,
  ChevronDown,
  Clock,
  FolderKanban,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCurrentFrame } from "remotion";
import { countUp, money, reveal } from "../anim";
import { Avatar, MetricLabel, Panel, Progress, StageBadge } from "../app-ui";
import { projects, type SampleProject } from "../data";
import { colors, fonts } from "../theme";

const ledgerColumns = "2.2fr 1.4fr 1.2fr 0.8fr 0.8fr 1fr 44px";

const created: SampleProject = {
  name: "Summer launch film",
  client: "Aperture Coffee",
  stage: "Planned",
  due: "May 5",
  value: 1800,
  progress: 0,
  owner: "AR",
};

/**
 * Relay's Dashboard in the light theme: greeting, metric strip, project ledger,
 * attention queue, and activity. `settled` skips the entrance animation.
 * `newRow` (0 → 1) slides the freshly created project into the top of the ledger.
 * `delay` holds the entrance until the window is on screen.
 */
export const DashboardContent: React.FC<{
  settled?: boolean;
  newRow?: number;
  delay?: number;
}> = ({ settled = false, newRow, delay = 0 }) => {
  const current = useCurrentFrame();
  const frame = settled ? 1000 : current - delay;
  const rows =
    newRow === undefined || newRow <= 0 ? projects : [created, ...projects];

  const metrics = [
    {
      label: "IN MOTION",
      value: String(countUp(frame, 10, 60, 6)),
      note: "of 24 projects",
    },
    {
      label: "DUE WITHIN 7 DAYS",
      value: String(countUp(frame, 12, 62, 3)),
      note: "upcoming handoffs",
    },
    {
      label: "WAITING REVIEWS",
      value: String(countUp(frame, 14, 64, 2)),
      note: "awaiting client action",
    },
    {
      label: "COLLECTED",
      value: money(countUp(frame, 16, 66, 11450)),
      note: "$2,750 due",
    },
  ] as const;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: 32,
        fontFamily: fonts.sans,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", height: 44 }}>
        <div
          style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.035em" }}
        >
          Good to see you, Alex.
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Field
            icon={<Search size={16} />}
            width={300}
            text="Search the project ledger"
          />
          <Field icon={<SlidersHorizontal size={16} />} text="Filters" />
          <Field
            text="Due soon"
            trailing={<ChevronDown size={16} />}
            width={140}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 14,
          marginTop: 20,
        }}
      >
        {metrics.map((metric, index) => (
          <Panel
            key={metric.label}
            style={{
              padding: "18px 18px",
              height: 96,
              opacity: reveal(frame, 4 + index * 3),
            }}
          >
            <MetricLabel>{metric.label}</MetricLabel>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginTop: 12,
              }}
            >
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                }}
              >
                {metric.value}
              </span>
              <span style={{ fontSize: 13, color: colors.muted }}>
                {metric.note}
              </span>
            </div>
          </Panel>
        ))}
        <Panel
          style={{
            padding: "18px 18px",
            height: 96,
            opacity: reveal(frame, 16),
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <MetricLabel>SALARY BATCH</MetricLabel>
            <span
              style={{ fontSize: 12, fontWeight: 600, color: colors.muted }}
            >
              80%
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              marginTop: 10,
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 600 }}>
              {countUp(frame, 16, 50, 4)}
            </span>
            <span style={{ fontSize: 13, color: colors.muted }}>/ 5 edits</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Progress value={reveal(frame, 20, 40) * 80} />
          </div>
        </Panel>
      </div>

      <Panel style={{ marginTop: 16, height: 386, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 600 }}>Project ledger</span>
          <FolderKanban size={16} color={colors.muted} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: 4,
              backgroundColor: colors.canvas,
            }}
          >
            {rows.length}
          </span>
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              color: colors.muted,
            }}
          >
            View all projects <ArrowRight size={15} />
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: ledgerColumns,
            padding: "10px 20px",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            color: colors.muted,
            borderTop: `1px solid ${colors.border}`,
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: "#fafafa",
          }}
        >
          <span>PROJECT</span>
          <span>CLIENT</span>
          <span>STAGE</span>
          <span>DUE</span>
          <span>VALUE</span>
          <span>PROGRESS</span>
          <span />
        </div>
        {rows.map((project, index) => {
          const isNew = project === created;
          const shown = isNew
            ? (newRow ?? 0)
            : reveal(frame, 18 + index * 4, 16);
          return (
            <div
              key={project.name}
              style={{
                display: "grid",
                gridTemplateColumns: ledgerColumns,
                alignItems: "center",
                padding: "0 20px",
                height: isNew ? 47 * shown : 47,
                overflow: "hidden",
                fontSize: 15,
                borderBottom: `1px solid ${colors.border}`,
                opacity: shown,
                translate: isNew
                  ? `0 ${(1 - shown) * -10}px`
                  : `0 ${(1 - shown) * 14}px`,
              }}
            >
              <span style={{ fontWeight: 500 }}>{project.name}</span>
              <span style={{ color: colors.text2 }}>{project.client}</span>
              <span>
                <StageBadge stage={project.stage} />
              </span>
              <span style={{ color: colors.text2 }}>{project.due}</span>
              <span style={{ fontFamily: fonts.mono, fontSize: 14 }}>
                {money(project.value)}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Progress
                  value={project.progress * reveal(frame, 26 + index * 4, 30)}
                  width={90}
                />
                <span style={{ fontSize: 12, color: colors.muted }}>
                  {project.progress}%
                </span>
              </span>
              <Avatar initials={project.owner} size={28} />
            </div>
          );
        })}
      </Panel>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        <Panel style={{ height: 222, padding: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>
            Attention queue
          </div>
          {[
            [
              "Founder story cutdown",
              "Waiting on client for 2 days",
              colors.warning,
            ],
            ["Field Notes episode 12", "Revisions due May 8", colors.danger],
            ["Campaign cutdowns", "Delivered, $1,500 unpaid", colors.info],
          ].map(([title, note, tone], index) => (
            <div
              key={title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderTop: index ? `1px solid ${colors.border}` : "none",
                opacity: reveal(frame, 34 + index * 5),
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: tone,
                }}
              />
              <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 14,
                  color: colors.muted,
                }}
              >
                {note}
              </span>
            </div>
          ))}
        </Panel>
        <Panel style={{ height: 222, padding: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>
            Activity
          </div>
          {[
            ["AR", "Alex moved Podcast episode 31 to Editing", "2m"],
            ["JP", "Jordan left 2 comments on Founder story", "18m"],
            ["SK", "Payment recorded for Spring menu reels", "1h"],
          ].map(([who, text, when], index) => (
            <div
              key={text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "7px 0",
                borderTop: index ? `1px solid ${colors.border}` : "none",
                opacity: reveal(frame, 38 + index * 5),
              }}
            >
              <Avatar initials={who} size={28} />
              <span style={{ fontSize: 15 }}>{text}</span>
              <span
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 13,
                  color: colors.muted,
                }}
              >
                <Clock size={13} />
                {when}
              </span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
};

const Field: React.FC<{
  icon?: React.ReactNode;
  text: string;
  width?: number;
  trailing?: React.ReactNode;
}> = ({ icon, text, width, trailing }) => (
  <div
    style={{
      width,
      height: 40,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 12px",
      border: `1px solid ${colors.strong}`,
      borderRadius: 8,
      backgroundColor: colors.panel,
      fontSize: 15,
      color: icon && width ? colors.muted : colors.ink,
    }}
  >
    {icon}
    {text}
    {trailing && (
      <span style={{ marginLeft: "auto", display: "flex" }}>{trailing}</span>
    )}
  </div>
);
