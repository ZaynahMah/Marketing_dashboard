"use client";
import React from "react";
import { computeTotals } from "@/lib/metrics";
import { fmtCompact, fmtCurrency, fmtPct } from "@/lib/normalize";
import { availability } from "@/lib/period";
import { downloadReport } from "@/lib/reports/excel-reports";
import type { AiNarrativeSection } from "@/lib/reports/excel-reports";
import type { ConsolidatedPost } from "@/lib/schema";
import type { AiMonthlyReport, AiReport, AiWeeklyReport } from "@/lib/ai/types";
import { Card, Eyebrow, Empty, Pill, SectionTitle } from "@/components/ui";
import { useAi } from "@/components/ai/AiProvider";
import { AiControls, AiUsageSection } from "@/components/ai/AiControls";
import { AiPlanner } from "@/components/ai/AiSections";

/* ----------------------------- shared bits ----------------------------- */
function MiniKpis({ posts }: { posts: ConsolidatedPost[] }) {
  const t = computeTotals(posts);
  const cells: [string, string][] = [
    ["Posts", String(t.posts)],
    ["Reach", fmtCompact(t.reach)],
    ["Views", fmtCompact(t.views)],
    ["Engagement", fmtCompact(t.interactions)],
    ["ER% (reach)", fmtPct(t.engagementRate)],
    ["Spend", fmtCurrency(t.spend)],
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
      {cells.map(([k, v]) => (
        <div key={k} className="bg-surface p-4">
          <Eyebrow>{k}</Eyebrow>
          <div className="tabular mt-2 text-[18px] font-medium text-ink">{v}</div>
        </div>
      ))}
    </div>
  );
}

function List({ items, tone }: { items?: string[]; tone?: "win" | "risk" | "accent" }) {
  if (!items?.length) return null;
  const dot = tone === "win" ? "text-positive" : tone === "risk" ? "text-negative" : "text-claret";
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-graphite">
          <span className={dot}>·</span>
          {s}
        </li>
      ))}
    </ul>
  );
}

function NeedsKey() {
  return (
    <Empty
      title="Generate the report to see AI analysis"
      body="The quantitative summary above is always live. Click Generate to author the strategist-level narrative (needs a GEMINI_API_KEY; otherwise this stays quantitative-only)."
    />
  );
}

/* ----------------------------- downloads ----------------------------- */
export function ReportDownloads({ posts, prev }: { posts: ConsolidatedPost[]; prev?: ConsolidatedPost[] }) {
  const { report, reportType, setReportType } = useAi();
  const av = availability(posts);

  function ai(kind: "daily" | "weekly" | "monthly"): AiNarrativeSection[] | undefined {
    if (!report || report.reportType !== kind) return undefined;
    return kind === "weekly" && report.weekly
      ? weeklyToSections(report.weekly, report)
      : kind === "monthly" && report.monthly
      ? monthlyToSections(report.monthly, report)
      : dailyToSections(report);
  }

  const btns: { kind: "daily" | "weekly" | "monthly"; label: string; enabled: boolean; note: string }[] = [
    { kind: "daily", label: "Download Daily Report", enabled: av.daily, note: `${av.daysCovered} day(s) of data` },
    {
      kind: "weekly",
      label: "Download Weekly Report",
      enabled: av.weekly,
      note: av.weeklyComplete ? "full week" : `partial · ${av.daysCovered} day(s)`,
    },
    {
      kind: "monthly",
      label: "Download Monthly Report",
      enabled: av.monthly,
      note: av.monthlyComplete ? "full month" : "month-to-date",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {btns.map((b) => (
        <button
          key={b.kind}
          disabled={!b.enabled}
          onClick={() => downloadReport(b.kind, posts, labelFor(posts), ai(b.kind))}
          title={b.note}
          className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] text-ink hover:border-graphite disabled:cursor-not-allowed disabled:opacity-40"
        >
          {b.label} <span className="text-mist">· {b.note}</span>
        </button>
      ))}
    </div>
  );
}

function labelFor(posts: ConsolidatedPost[]): string {
  const av = availability(posts);
  if (av.firstDate && av.lastDate) {
    const f = av.firstDate.toISOString().slice(0, 10);
    const l = av.lastDate.toISOString().slice(0, 10);
    return f === l ? f : `${f}_to_${l}`;
  }
  return "report";
}

/* ----------------------------- WEEKLY VIEW ----------------------------- */
export function WeeklyReport({ posts, prev }: { posts: ConsolidatedPost[]; prev?: ConsolidatedPost[] }) {
  const { report, configured } = useAi();
  const w = report?.reportType === "weekly" ? report.weekly : undefined;
  const av = availability(posts);

  return (
    <div className="fade-in">
      <SectionTitle
        eyebrow={`Weekly Report · ${av.daysCovered} day(s)${av.weeklyComplete ? " · full week" : " · partial"}`}
        title="This week, read by a strategist"
        hint="Tata CLiQ Luxury (TCL). Where the framework applies to Tata CLiQ Fashion (TCF), the AI notes it. Quantitative summary is live; the analysis below is AI-authored and brief-grounded."
      />
      <MiniKpis posts={posts} />
      <div className="mt-6">
        <AiControls />
      </div>

      {!w ? (
        <div className="mt-6">{configured ? <NeedsKey /> : <NeedsKey />}</div>
      ) : (
        <div className="mt-8 space-y-8">
          <Section title="Content Insights">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-l-[3px] border-l-positive p-5">
                <Eyebrow>Best performing</Eyebrow>
                <p className="mt-1.5 text-[13px] leading-relaxed text-graphite">{w.contentInsights.best}</p>
              </Card>
              <Card className="border-l-[3px] border-l-negative p-5">
                <Eyebrow>Worst performing</Eyebrow>
                <p className="mt-1.5 text-[13px] leading-relaxed text-graphite">{w.contentInsights.worst}</p>
              </Card>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <Eyebrow className="mb-2">Themes that worked</Eyebrow>
                <List items={w.contentInsights.themesThatWorked} tone="win" />
              </Card>
              <Card className="p-5">
                <Eyebrow className="mb-2">Themes that didn't resonate</Eyebrow>
                <List items={w.contentInsights.themesThatDidnt} tone="risk" />
              </Card>
            </div>
            <Card className="mt-4 border-l-[3px] border-l-claret p-5">
              <Eyebrow>Direction for next week</Eyebrow>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{w.contentInsights.nextWeekDirection}</p>
            </Card>
          </Section>

          <Section title="Consumer Conversations" note={w.consumerConversations.note}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5"><Eyebrow className="mb-2">Talking about</Eyebrow><List items={w.consumerConversations.talkingAbout} /></Card>
              <Card className="p-5"><Eyebrow className="mb-2">Common questions</Eyebrow><List items={w.consumerConversations.commonQuestions} /></Card>
              <Card className="p-5"><Eyebrow className="mb-2">Interests</Eyebrow><List items={w.consumerConversations.interests} /></Card>
              <Card className="p-5"><Eyebrow className="mb-2">Pain points</Eyebrow><List items={w.consumerConversations.painPoints} tone="risk" /></Card>
            </div>
          </Section>

          <Section title="Trend Watch">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5"><Eyebrow className="mb-2">Fashion</Eyebrow><List items={w.trendWatch.fashion} /></Card>
              <Card className="p-5"><Eyebrow className="mb-2">Cultural</Eyebrow><List items={w.trendWatch.cultural} /></Card>
              <Card className="p-5"><Eyebrow className="mb-2">Platform</Eyebrow><List items={w.trendWatch.platform} /></Card>
              <Card className="p-5"><Eyebrow className="mb-2">Emerging formats</Eyebrow><List items={w.trendWatch.emergingFormats} /></Card>
            </div>
            <Card className="mt-4 border-l-[3px] border-l-claret p-5">
              <Eyebrow>Participate next</Eyebrow>
              <div className="mt-2"><List items={w.trendWatch.participateNext} tone="accent" /></div>
            </Card>
          </Section>

          <Section title="Sentiment" note={w.sentiment.note}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5"><Pill tone="win">Positive</Pill><p className="mt-2 text-[13px] text-graphite">{w.sentiment.positive}</p></Card>
              <Card className="p-5"><Pill>Neutral</Pill><p className="mt-2 text-[13px] text-graphite">{w.sentiment.neutral}</p></Card>
              <Card className="p-5"><Pill tone="risk">Negative</Pill><p className="mt-2 text-[13px] text-graphite">{w.sentiment.negative}</p></Card>
            </div>
            <p className="mt-3 text-[13px] text-ink">
              Direction: <span className="font-medium text-claret">{w.sentiment.direction}</span>
            </p>
          </Section>

          <div className="grid gap-8 lg:grid-cols-2">
            <Section title="Influencer Review" note={w.influencerReview.note}>
              <Card className="p-5"><Eyebrow className="mb-2">Authentic engagement</Eyebrow><List items={w.influencerReview.authentic} tone="win" /></Card>
              <Card className="mt-4 p-5"><Eyebrow className="mb-2">Scale these creators</Eyebrow><List items={w.influencerReview.scale} tone="accent" /></Card>
            </Section>
            <Section title="UGC Review" note={w.ugcReview.note}>
              <Card className="p-5"><Eyebrow className="mb-2">Amplify</Eyebrow><List items={w.ugcReview.amplify} tone="accent" /></Card>
            </Section>
          </div>

          <Section title="Campaign Learnings">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5"><Pill tone="win">Scale</Pill><div className="mt-2"><List items={w.campaignLearnings.scale} tone="win" /></div></Card>
              <Card className="p-5"><Pill tone="risk">Stop</Pill><div className="mt-2"><List items={w.campaignLearnings.stop} tone="risk" /></div></Card>
              <Card className="p-5"><Pill tone="accent">Optimize</Pill><div className="mt-2"><List items={w.campaignLearnings.optimize} tone="accent" /></div></Card>
            </div>
          </Section>

          <div className="grid gap-8 lg:grid-cols-2">
            <Section title="Brand Health" note={w.brandHealth.note}>
              <div className="space-y-2.5">
                {w.brandHealth.reads?.map((r, i) => (
                  <div key={i}>
                    <div className="mb-1 flex justify-between text-[12px]"><span className="text-ink">{r.attribute}</span><span className="tabular text-slate">{r.strength}</span></div>
                    <div className="h-1.5 w-full rounded-full bg-veil"><div className="h-full rounded-full bg-claret" style={{ width: `${Math.max(0, Math.min(100, r.strength))}%` }} /></div>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Business-Level Analysis">
              <Card className="p-5"><Eyebrow className="mb-2">Top categories</Eyebrow><List items={w.businessLevel.topCategories} /></Card>
              <Card className="mt-4 p-5"><Eyebrow className="mb-2">Focus next</Eyebrow><List items={w.businessLevel.focusNext} tone="accent" /></Card>
            </Section>
          </div>

          <Section title="Audience Intelligence" note={w.audienceIntelligence.note}>
            <Card className="p-5"><List items={w.audienceIntelligence.patterns} /></Card>
          </Section>

          <AiUsageSection />
        </div>
      )}
    </div>
  );
}

/* ----------------------------- MONTHLY VIEW ----------------------------- */
export function MonthlyReport({ posts }: { posts: ConsolidatedPost[] }) {
  const { report } = useAi();
  const m = report?.reportType === "monthly" ? report.monthly : undefined;
  const av = availability(posts);

  return (
    <div className="fade-in">
      <SectionTitle
        eyebrow={`Monthly Audit${av.monthlyComplete ? " · full month" : " · month-to-date"}`}
        title="Instagram handle audit"
        hint="Tata CLiQ Luxury (TCL), with TCF notes and competitor benchmarking (Myntra, AJIO, Nykaa) via live research. Numbers are computed; the audit narrative is AI-authored."
      />
      <MiniKpis posts={posts} />
      <div className="mt-6"><AiControls /></div>

      {!m ? (
        <div className="mt-6"><NeedsKey /></div>
      ) : (
        <div className="mt-8 space-y-8">
          <Card className="border-l-[3px] border-l-claret p-5">
            <Eyebrow>Performance overview</Eyebrow>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{m.performanceOverview}</p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5"><Eyebrow className="mb-2">Key wins</Eyebrow><List items={m.keyWins} tone="win" /></Card>
            <Card className="p-5"><Eyebrow className="mb-2">Red flags</Eyebrow><List items={m.redFlags} tone="risk" /></Card>
          </div>

          <Section title="Content Performance">
            <Card className="p-5">
              <p className="text-[13px] leading-relaxed text-graphite">{m.formatAnalysis.note}</p>
              <div className="mt-3"><Eyebrow className="mb-1.5">Increase</Eyebrow><List items={m.formatAnalysis.increase} tone="accent" /></div>
              <p className="mt-3 text-[12px] italic text-claret">{m.formatAnalysis.luxuryBenchmark}</p>
            </Card>
          </Section>

          <Section title="Content Patterns">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-5">
                <Eyebrow className="mb-2">Top patterns</Eyebrow>
                <div className="space-y-3">
                  {m.contentPatterns.topPatterns?.map((p, i) => (
                    <div key={i}><div className="text-[13px] font-medium text-ink">{p.pattern}</div><p className="text-[12px] text-slate">{p.why}</p></div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <Eyebrow className="mb-2">Poor patterns</Eyebrow>
                <div className="space-y-3">
                  {m.contentPatterns.poorPatterns?.map((p, i) => (
                    <div key={i}><div className="text-[13px] font-medium text-ink">{p.pattern}</div><p className="text-[12px] text-slate">{p.why}</p></div>
                  ))}
                </div>
              </Card>
            </div>
          </Section>

          <Section title="Audience Insights">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5"><Eyebrow>Saves</Eyebrow><p className="mt-1.5 text-[13px] text-graphite">{m.audienceInsights.saveBehaviour}</p></Card>
              <Card className="p-5"><Eyebrow>Shares</Eyebrow><p className="mt-1.5 text-[13px] text-graphite">{m.audienceInsights.shareBehaviour}</p></Card>
              <Card className="p-5"><Eyebrow>Engagement</Eyebrow><p className="mt-1.5 text-[13px] text-graphite">{m.audienceInsights.engagementBehaviour}</p></Card>
            </div>
          </Section>

          <Section title="Content Bucket Analysis">
            <Card className="overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="border-b border-line">
                  <th className="px-4 py-3"><Eyebrow>Bucket</Eyebrow></th>
                  <th className="px-4 py-3"><Eyebrow>Performance</Eyebrow></th>
                  <th className="px-4 py-3"><Eyebrow>Recommendation</Eyebrow></th>
                </tr></thead>
                <tbody>
                  {m.contentBuckets?.map((b, i) => (
                    <tr key={i} className="border-b border-hairline last:border-0 align-top">
                      <td className="px-4 py-3 text-[13px] font-medium text-ink">{b.bucket}</td>
                      <td className="px-4 py-3 text-[12px] text-graphite">{b.performance}</td>
                      <td className="px-4 py-3 text-[12px] text-claret">{b.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Section>

          <Section title="Brand Position Audit">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5"><Eyebrow>What worked</Eyebrow><p className="mt-1.5 text-[13px] text-graphite">{m.brandPositionAudit.worked}</p></Card>
              <Card className="p-5"><Eyebrow>What didn't</Eyebrow><p className="mt-1.5 text-[13px] text-graphite">{m.brandPositionAudit.didnt}</p></Card>
              <Card className="p-5"><Eyebrow>Positioning match</Eyebrow><p className="mt-1.5 text-[13px] text-graphite">{m.brandPositionAudit.positioningMatch}</p></Card>
            </div>
          </Section>

          <Section title="Competitive Intelligence" note="Qualitative comparison via live research — no fabricated competitor metrics.">
            <div className="space-y-3">
              {m.competitiveIntelligence?.map((c, i) => (
                <Card key={i} className="p-5">
                  <div className="mb-2 flex items-center gap-2"><Pill tone="accent">{c.competitor}</Pill></div>
                  <div className="grid gap-3 sm:grid-cols-3 text-[12px]">
                    <div><span className="text-mist">They do better · </span><span className="text-graphite">{c.theyDoBetter}</span></div>
                    <div><span className="text-mist">We do better · </span><span className="text-graphite">{c.weDoBetter}</span></div>
                    <div><span className="text-mist">Opportunity · </span><span className="text-claret">{c.opportunity}</span></div>
                  </div>
                </Card>
              ))}
            </div>
          </Section>

          <Section title="White Space">
            <Card className="p-5"><List items={m.whiteSpace} tone="accent" /></Card>
          </Section>

          <Section title="Strategic Recommendations">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5"><Pill tone="risk">Stop doing</Pill><div className="mt-2"><List items={m.strategicRecommendations.stopDoing} tone="risk" /></div></Card>
              <Card className="p-5"><Pill tone="win">Continue doing</Pill><div className="mt-2"><List items={m.strategicRecommendations.continueDoing} tone="win" /></div></Card>
              <Card className="p-5"><Pill tone="accent">Start doing</Pill><div className="mt-2"><List items={m.strategicRecommendations.startDoing} tone="accent" /></div></Card>
            </div>
          </Section>

          <Section title="30-Day Content Plan">
            <AiPlanner posts={posts} />
          </Section>

          <AiUsageSection />
        </div>
      )}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="display text-[19px] font-medium text-ink">{title}</h2>
        {note && <p className="mt-0.5 text-[12px] text-slate">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/* -------------------- AI → Excel narrative section mappers -------------------- */
function dailyToSections(r: AiReport): AiNarrativeSection[] {
  const s: AiNarrativeSection[] = [];
  if (r.executiveSummary) s.push({ heading: "Executive Summary", lines: [r.executiveSummary] });
  if (r.strategicRecommendations.length)
    s.push({ heading: "Strategic Recommendations", lines: r.strategicRecommendations.map((x) => `[${x.priority}] ${x.headline} — ${x.rationale}`) });
  if (r.budgetAllocation.length) s.push({ heading: "Budget Allocation", lines: r.budgetAllocation.map((b) => `${b.move}: ${b.target} — ${b.rationale}`) });
  if (r.emergingOpportunities.length) s.push({ heading: "Emerging Opportunities", lines: r.emergingOpportunities.map((o) => `${o.title} (${o.source}) — ${o.angle}`) });
  return s;
}
function weeklyToSections(w: AiWeeklyReport, r: AiReport): AiNarrativeSection[] {
  return [
    { heading: "Content Insights", lines: [`Best: ${w.contentInsights.best}`, `Worst: ${w.contentInsights.worst}`, `Next week: ${w.contentInsights.nextWeekDirection}`] },
    { heading: "Trend Watch — participate next", lines: w.trendWatch.participateNext },
    { heading: "Sentiment", lines: [`Direction: ${w.sentiment.direction}`, w.sentiment.note] },
    { heading: "Campaign Learnings", lines: [`Scale: ${w.campaignLearnings.scale.join("; ")}`, `Stop: ${w.campaignLearnings.stop.join("; ")}`, `Optimize: ${w.campaignLearnings.optimize.join("; ")}`] },
    { heading: "Business focus next", lines: w.businessLevel.focusNext },
  ];
}
function monthlyToSections(m: AiMonthlyReport, r: AiReport): AiNarrativeSection[] {
  return [
    { heading: "Performance Overview", lines: [m.performanceOverview] },
    { heading: "Key Wins", lines: m.keyWins },
    { heading: "Red Flags", lines: m.redFlags },
    { heading: "White Space", lines: m.whiteSpace },
    { heading: "Stop Doing", lines: m.strategicRecommendations.stopDoing },
    { heading: "Continue Doing", lines: m.strategicRecommendations.continueDoing },
    { heading: "Start Doing", lines: m.strategicRecommendations.startDoing },
  ];
}
