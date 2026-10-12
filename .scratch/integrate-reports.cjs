const fs = require("node:fs");
const path = "src/components/precision-workspaces.tsx";
let source = fs.readFileSync(path, "utf8");
const start = source.indexOf(
  "                    <ResponsiveContainer",
  source.indexOf("export function PrecisionReports")
);
const end =
  source.indexOf("                    </ResponsiveContainer>", start) +
  "                    </ResponsiveContainer>".length;
source =
  source.slice(0, start) +
  `                    <AreaChart
                      data={trendData}
                      config={{ earned: { label: "Earned", color: "blue" } }}
                      animate={!reduceMotion}
                      animationDuration={420}
                      bloom="off"
                    >
                      <Grid />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <ChartTooltip labelKey="label" valueFormatter={(value) => money(value, settings.currencyCode)} />
                      <Area dataKey="earned" variant="gradient" />
                    </AreaChart>` +
  source.slice(end);
const pieStart = source.indexOf(
  "                  <ResponsiveContainer",
  source.indexOf("Work mix</h2>", start)
);
const pieEnd =
  source.indexOf("                  </ResponsiveContainer>", pieStart) +
  "                  </ResponsiveContainer>".length;
source =
  source.slice(0, pieStart) +
  `                  <PieChart
                    data={mixData}
                    config={mixConfig}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={0.65}
                    animate={!reduceMotion}
                    animationDuration={420}
                    bloom="off"
                  >
                    <Pie variant="gradient" />
                    <ChartTooltip labelKey="name" />
                  </PieChart>` +
  source.slice(pieEnd);
source = source.replace(
  "style={{ background: colors[index % colors.length] }}",
  "style={{ background: rgb(PALETTE[colors[index % colors.length]].fill) }}"
);
for (const title of ["Client totals", "Invoice drafts"]) {
  const titleAt = source.indexOf(
    `          title="${title}"`,
    source.indexOf("export function PrecisionReports")
  );
  const sectionStart = source.lastIndexOf("        <ContentSection", titleAt);
  const sectionEnd =
    source.indexOf("        </ContentSection>", titleAt) +
    "        </ContentSection>".length;
  source =
    source.slice(0, sectionStart) +
    "        {advancedReports ? (\n" +
    source.slice(sectionStart, sectionEnd) +
    "\n        ) : null}" +
    source.slice(sectionEnd);
}
const summaryTitle = source.indexOf('              title="Editor Summary"');
const summaryStart = source.lastIndexOf("        <SplitPane", summaryTitle);
const summaryEnd =
  source.indexOf("        />", summaryTitle) + "        />".length;
source =
  source.slice(0, summaryStart) +
  "        {advancedReports ? (\n" +
  source.slice(summaryStart, summaryEnd) +
  "\n        ) : null}" +
  source.slice(summaryEnd);
source = source.replace(
  "                        onClick={() =>\n                          onUpdateBatchPayment",
  "                        disabled={!canManageFinance}\n                        onClick={() =>\n                          onUpdateBatchPayment"
);
fs.writeFileSync(path, source);
