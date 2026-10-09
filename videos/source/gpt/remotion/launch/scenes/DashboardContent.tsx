import {
  ArrowRight,
  ChevronDown,
  Clock,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { countUp, money } from "../anim";
import { Avatar, MetricLabel, Panel, Progress, StageBadge } from "../app-ui";
import { createdProject, projects } from "../data";
import { colors, fonts } from "../theme";

/** The current dashboard order: toolbar, metrics, attention, project ledger with inspector, activity. */
export const DashboardContent: React.FC<{
  settled?: boolean;
  newRow?: number;
  delay?: number;
}> = ({ settled = false, newRow, delay = 0 }) => {
  const current = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = settled ? 1000 : current - delay;
  const rows =
    newRow === undefined || newRow <= 0
      ? projects
      : [createdProject, ...projects];
  const metrics = [
    {
      label: "Active",
      value: countUp(frame, 0, Math.round(0.65 * fps), newRow ? 6 : 5),
      note: "of 24 projects",
    },
    {
      label: "Due this week",
      value: countUp(frame, 0, Math.round(0.65 * fps), 3),
      note: "to deliver",
    },
    {
      label: "In review",
      value: countUp(frame, 0, Math.round(0.65 * fps), 2),
      note: "Reviews and revisions",
    },
    {
      label: "Paid",
      value: money(countUp(frame, 0, Math.round(0.65 * fps), 11450)),
      note: "$2,750 unpaid",
    },
  ];
  const columns = "2.1fr 1.3fr 1.25fr .7fr .8fr";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: 32,
        fontFamily: fonts.sans,
      }}
    >
      <div
        style={{ height: 40, display: "flex", alignItems: "center", gap: 10 }}
      >
        <Field width={300} icon={<Search size={17} />} text="Search projects" />
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Field icon={<SlidersHorizontal size={16} />} text="Filters" />
          <Field
            width={138}
            text="Due soon"
            trailing={<ChevronDown size={16} />}
          />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: 12,
          marginTop: 18,
        }}
      >
        {metrics.map((m) => (
          <Panel
            key={m.label}
            style={{ padding: 18, height: 110, boxSizing: "border-box" }}
          >
            <MetricLabel>{m.label}</MetricLabel>
            <div
              style={{
                fontSize: 34,
                fontWeight: 600,
                letterSpacing: "-.035em",
                marginTop: 7,
              }}
            >
              {m.value}
            </div>
            <div style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
              {m.note}
            </div>
          </Panel>
        ))}
        <Panel style={{ padding: 18, height: 110, boxSizing: "border-box" }}>
          <MetricLabel>Salary batch</MetricLabel>
          <div style={{ fontSize: 30, fontWeight: 600, marginTop: 8 }}>
            {countUp(frame, 0, Math.round(0.65 * fps), 4)}{" "}
            <span
              style={{ fontSize: 14, fontWeight: 400, color: colors.muted }}
            >
              / 5 edits
            </span>
          </div>
          <div style={{ marginTop: 9 }}>
            <Progress value={frame < 0 ? 0 : 80} />
          </div>
        </Panel>
      </div>
      <Panel
        style={{
          marginTop: 16,
          padding: "16px 20px",
          height: 152,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 12 }}>
          Needs attention
        </div>
        {[
          [
            "Founder story cutdown",
            "Collect client review notes",
            colors.warning,
          ],
          ["Campaign cutdowns", "Delivered, $1,500 unpaid", colors.info],
        ].map(([name, note, tone], i) => (
          <div
            key={name}
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderTop: i ? `1px solid ${colors.border}` : undefined,
              fontSize: 16,
            }}
          >
            <span
              style={{ width: 8, height: 8, borderRadius: 2, background: tone }}
            />
            {name}
            <span
              style={{ marginLeft: "auto", fontSize: 15, color: colors.muted }}
            >
              {note}
            </span>
          </div>
        ))}
      </Panel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 16,
          marginTop: 16,
        }}
      >
        <Panel style={{ height: 376, overflow: "hidden" }}>
          <div
            style={{
              height: 52,
              padding: "0 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 19, fontWeight: 600 }}>Projects</span>
            <span
              style={{
                fontSize: 13,
                padding: "3px 6px",
                borderRadius: 4,
                background: colors.canvas,
              }}
            >
              {rows.length}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              View all projects
              <ArrowRight size={15} />
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: columns,
              padding: "11px 20px",
              background: "#fafafa",
              fontSize: 13,
              color: colors.muted,
              borderBlock: `1px solid ${colors.border}`,
            }}
          >
            {["Project", "Client", "Stage", "Due", "Value"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          {rows.slice(0, 7).map((project) => {
            const shown = project === createdProject ? (newRow ?? 0) : 1;
            return (
              <div
                key={project.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: columns,
                  alignItems: "center",
                  height: project === createdProject ? 40 * shown : 40,
                  padding: "0 20px",
                  fontSize: 15,
                  overflow: "hidden",
                  borderBottom: `1px solid ${colors.border}`,
                  opacity: shown,
                }}
              >
                <span style={{ fontWeight: 500 }}>{project.name}</span>
                <span style={{ color: colors.text2 }}>{project.client}</span>
                <span>
                  <StageBadge stage={project.stage} />
                </span>
                <span>{project.due}</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 14 }}>
                  {money(project.value)}
                </span>
              </div>
            );
          })}
        </Panel>
        <Panel style={{ padding: 20, height: 376, boxSizing: "border-box" }}>
          <div style={{ fontSize: 19, fontWeight: 600 }}>Project details</div>
          <div
            style={{
              marginTop: 24,
              fontSize: 22,
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            Founder story cutdown
          </div>
          <div style={{ marginTop: 10, fontSize: 16, color: colors.muted }}>
            Orbit Labs
          </div>
          <div style={{ marginTop: 18 }}>
            <StageBadge stage="Client Review" size={15} />
          </div>
          <div style={{ marginTop: 26, fontSize: 15, color: colors.muted }}>
            Due
          </div>
          <div style={{ marginTop: 5, fontSize: 18 }}>May 7</div>
          <div style={{ marginTop: 22, fontSize: 15, color: colors.muted }}>
            Project value
          </div>
          <div style={{ marginTop: 5, fontSize: 24, fontWeight: 600 }}>
            $950
          </div>
          <div style={{ marginTop: 22 }}>
            <Progress value={72} />
          </div>
        </Panel>
      </div>
      <Panel
        style={{
          marginTop: 16,
          padding: "14px 20px",
          height: 112,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 600 }}>Activity</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 15,
            fontSize: 15,
          }}
        >
          <Avatar initials="SK" size={27} />
          <span>Podcast episode 31 moved to Editing</span>
          <span
            style={{
              marginLeft: "auto",
              color: colors.muted,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <Clock size={14} />
            2m ago
          </span>
        </div>
      </Panel>
    </div>
  );
};
/** Search and filter controls retain the app's square control shape. */
const Field: React.FC<{
  text: string;
  width?: number;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}> = ({ text, width = 112, icon, trailing }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      width,
      height: 40,
      padding: "0 12px",
      boxSizing: "border-box",
      border: `1px solid ${colors.strong}`,
      borderRadius: 6,
      background: colors.panel,
      fontSize: 15,
      color: colors.muted,
    }}
  >
    {icon}
    {text}
    <span style={{ marginLeft: "auto", display: "flex" }}>{trailing}</span>
  </div>
);
