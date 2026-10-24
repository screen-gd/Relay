import ui from "./app-ui.module.css";

export const projectStatuses = [
  "Planned",
  "In Progress",
  "Client Review",
  "Delivered",
] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

/** The record's full-height Properties rail, as rendered by the demo app. */
export default function ProjectProperties({
  status,
  onStatusChange,
  paid,
  onPaidChange,
}: {
  status: ProjectStatus;
  onStatusChange: (status: ProjectStatus) => void;
  paid: boolean;
  onPaidChange: () => void;
}) {
  const progress = Math.round((projectStatuses.indexOf(status) / 3) * 100);
  return (
    <aside className={ui.properties} aria-label="Project details">
      <div className={ui.propertiesHead}>
        <span>Properties</span>
        <span>{progress}% done</span>
      </div>
      <div className={ui.progress}>
        <i style={{ width: `${progress}%` }} />
      </div>
      <dl className={ui.details}>
        <div>
          <dt>Stage</dt>
          <dd>
            <select
              className={ui.input}
              aria-label="Project stage"
              value={status}
              onChange={(event) => {
                const selected = projectStatuses.find(
                  (value) => value === event.target.value
                );
                if (selected) onStatusChange(selected);
              }}
            >
              {projectStatuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd className={ui.paymentProperty}>
            {status === "Delivered" ? (
              <>
                <span>{paid ? "Paid" : "Unpaid"}</span>
                <button
                  type="button"
                  className={ui.switch}
                  role="switch"
                  aria-label="Client payment received"
                  aria-checked={paid}
                  onClick={onPaidChange}
                />
              </>
            ) : (
              "Not billable"
            )}
          </dd>
        </div>
        {[
          ["Client", "Aperture Coffee"],
          ["Due", "Jul 24, 2026"],
          ["Value", "$1,800"],
          ["Work type", "Client Work"],
          ["Group", "None"],
          ["Lead", "Maya Chen"],
          ["Assignees", "No assignees"],
          ["Created", "Jul 18, 12:30 PM"],
        ].map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>Payment tracking starts once the project is delivered.</p>
    </aside>
  );
}
