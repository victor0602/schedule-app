import { Injectable } from "@nestjs/common";
import { RRule, rrulestr } from "rrule";
import type { CourseOccurrence } from "@schedule/shared";

@Injectable()
export class OccurrenceService {
  expand(
    courses: {
      id: string;
      title: string;
      teacher: string | null;
      location: string | null;
      color: string;
      startTime: string;
      endTime: string;
      rrule: string;
      dtstart: Date;
      exdates: string;
    }[],
    fromIso: string,
    toIso: string,
  ): CourseOccurrence[] {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    const result: CourseOccurrence[] = [];

    for (const c of courses) {
      const exdates: string[] = JSON.parse(c.exdates || "[]");
      const exdateSet = new Set(exdates);

      let rule: RRule;
      try {
        const dt = new Date(c.dtstart);
        const [sh, sm] = c.startTime.split(":").map(Number);
        dt.setHours(sh ?? 0, sm ?? 0, 0, 0);
        rule = rrulestr(`DTSTART:${formatDt(dt)}\nRRULE:${c.rrule}`, {
          dtstart: dt,
        });
      } catch {
        continue;
      }

      const [eh, em] = c.endTime.split(":").map(Number);

      const dates = rule.between(from, to, true);
      for (const d of dates) {
        const dateStr = d.toISOString().slice(0, 10);
        if (exdateSet.has(dateStr)) continue;

        const start = new Date(d);
        const end = new Date(d);
        end.setHours(eh ?? 0, em ?? 0, 0, 0);
        if (end <= start) end.setDate(end.getDate() + 1);

        result.push({
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

    result.sort((a, b) => a.start.localeCompare(b.start));
    return result;
  }
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDt(d: Date) {
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}
