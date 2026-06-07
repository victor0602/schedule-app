import { RRule, rrulestr } from "rrule";
import type { Course, CourseOccurrence } from "@schedule/shared";

function toLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDt(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export function expandOccurrences(
  courses: Course[],
  fromDate: Date,
  toDate: Date,
): CourseOccurrence[] {
  const out: CourseOccurrence[] = [];
  for (const c of courses) {
    const exdates = c.exdates ?? [];
    const exdateSet = new Set(exdates);
    const dt = new Date(c.dtstart);
    const [sh = 0, sm = 0] = c.startTime.split(":").map(Number);
    dt.setHours(sh, sm, 0, 0);
    const [eh = 0, em = 0] = c.endTime.split(":").map(Number);

    let rule: RRule;
    try {
      rule = rrulestr(`DTSTART:${formatDt(dt)}\nRRULE:${c.rrule}`, {
        dtstart: dt,
      });
    } catch {
      continue;
    }

    const dates = rule.between(fromDate, toDate, true);
    for (const d of dates) {
      const dateStr = toLocalDate(d);
      if (exdateSet.has(dateStr)) continue;
      const start = new Date(d);
      const end = new Date(d);
      end.setHours(eh, em, 0, 0);
      if (end <= start) end.setDate(end.getDate() + 1);

      out.push({
        courseId: c.id,
        title: c.title,
        teacher: c.teacher,
        location: c.location,
        color: c.color,
        start: start.toISOString(),
        end: end.toISOString(),
        date: dateStr,
      });
    }
  }
  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

export { toLocalDate };