import { describe, it, expect } from "vitest";
import {
  arenaWeekSlot,
  buildDefaultArenaEvents,
  rolloverArenaWeek,
  type RolloverPrisma,
} from "./prediction-arena-rollover";
import { selectWeeklyEventKinds } from "./arena-resolution";
import en from "../../messages/en.json";

const MON = new Date("2026-06-22T09:00:00Z"); // a Monday

describe("arenaWeekSlot", () => {
  it("anchors to Monday 00:00 UTC with Tuesday 23:00 deadline and Sunday end", () => {
    const s = arenaWeekSlot(MON);
    expect(s.weekStart.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    expect(s.deadline.toISOString()).toBe("2026-06-23T23:00:00.000Z");
    expect(s.weekEnd.toISOString()).toBe("2026-06-28T23:59:59.999Z");
  });

  it("uses the current week's Monday even when called mid-week", () => {
    const s = arenaWeekSlot(new Date("2026-06-25T12:00:00Z")); // Thursday
    expect(s.weekStart.toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });
});

describe("buildDefaultArenaEvents", () => {
  it("builds the rotated 6 events (with kind) for the given week", () => {
    const events = buildDefaultArenaEvents(en, 5);
    expect(events).toHaveLength(6);
    expect(events.map((e) => e.kind)).toEqual(selectWeeklyEventKinds(5));
    expect(events[0].orderIndex).toBe(1);
    for (const e of events) {
      expect(e.title).toBeTruthy();
      expect(e.description).toBeTruthy();
      expect(e.emoji).toBeTruthy();
      expect(e.kind).toBeTruthy();
    }
  });
});

// Minimal in-memory fake of the Prisma delegate the rollover touches.
function fakePrisma(
  weeks: {
    id: string;
    weekNumber: number;
    status: string;
    weekStart: Date;
    weekEnd: Date;
    deadline: Date;
    events?: unknown[];
  }[],
): RolloverPrisma & { weeks: typeof weeks } {
  return {
    weeks,
    weeklyHitsWeek: {
      async findUnique({ where: { weekStart } }) {
        return weeks.find((w) => w.weekStart.getTime() === weekStart.getTime()) ?? null;
      },
      async count() {
        return weeks.length;
      },
      async create({ data }) {
        const row = {
          id: `w${weeks.length + 1}`,
          weekNumber: data.weekNumber,
          status: data.status,
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          deadline: data.deadline,
          events: data.events.create,
        };
        weeks.push(row);
        return { id: row.id, weekNumber: row.weekNumber };
      },
      async update({ where: { id }, data }) {
        const w = weeks.find((x) => x.id === id)!;
        Object.assign(w, data);
        return w;
      },
    },
  };
}

describe("rolloverArenaWeek", () => {
  it("creates a new OPEN week when the slot is free", async () => {
    const db = fakePrisma([]);
    const res = await rolloverArenaWeek(db, en, MON);
    expect(res.action).toBe("created");
    expect(db.weeks).toHaveLength(1);
    expect(db.weeks[0].status).toBe("OPEN");
    expect(db.weeks[0].weekNumber).toBe(1);
    expect((db.weeks[0].events as { kind: string }[]).map((e) => e.kind)).toEqual(
      selectWeeklyEventKinds(1),
    );
  });

  it("is idempotent: skips when an OPEN week already occupies the slot", async () => {
    const db = fakePrisma([
      {
        id: "w1",
        weekNumber: 1,
        status: "OPEN",
        weekStart: new Date("2026-06-22T00:00:00Z"),
        weekEnd: new Date("2026-06-28T23:59:59.999Z"),
        deadline: new Date("2026-06-23T23:00:00Z"),
      },
    ]);
    const res = await rolloverArenaWeek(db, en, MON);
    expect(res.action).toBe("skipped");
    expect(db.weeks).toHaveLength(1);
  });

  it("shifts a RESOLVED week that mis-occupies the slot back 7d, then creates", async () => {
    const db = fakePrisma([
      {
        id: "w1",
        weekNumber: 1,
        status: "RESOLVED",
        weekStart: new Date("2026-06-22T00:00:00Z"),
        weekEnd: new Date("2026-06-28T23:59:59.999Z"),
        deadline: new Date("2026-06-23T23:00:00Z"),
      },
    ]);
    const res = await rolloverArenaWeek(db, en, MON);
    expect(res.action).toBe("created");
    // The resolved week moved back to the prior Monday.
    const shifted = db.weeks.find((w) => w.id === "w1")!;
    expect(shifted.weekStart.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    // A brand-new OPEN week now sits in this week's slot.
    const created = db.weeks.find((w) => w.status === "OPEN")!;
    expect(created.weekStart.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    expect(db.weeks).toHaveLength(2);
  });

  it("throws rather than overwrite if shifting would collide with an existing week", async () => {
    const db = fakePrisma([
      {
        id: "w0",
        weekNumber: 1,
        status: "RESOLVED",
        weekStart: new Date("2026-06-15T00:00:00Z"),
        weekEnd: new Date("2026-06-21T23:59:59.999Z"),
        deadline: new Date("2026-06-16T23:00:00Z"),
      },
      {
        id: "w1",
        weekNumber: 2,
        status: "RESOLVED",
        weekStart: new Date("2026-06-22T00:00:00Z"),
        weekEnd: new Date("2026-06-28T23:59:59.999Z"),
        deadline: new Date("2026-06-23T23:00:00Z"),
      },
    ]);
    await expect(rolloverArenaWeek(db, en, MON)).rejects.toThrow(/collide|exists/i);
  });
});
