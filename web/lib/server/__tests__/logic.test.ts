import { describe, expect, it } from "vitest";
import { classify, inferExperienceLevel, inferMinYears, inferRemote } from "../classifier";
import { buildQuery } from "../filters";
import { scoreJob } from "../matcher";

describe("classifier", () => {
  it.each([
    ["Software Engineering Intern", "internship"],
    ["Senior Backend Engineer", "senior"],
    ["Sr. Data Analyst", "senior"],
    ["Staff Engineer", "principal"],
    ["Engineering Manager", "lead"],
    ["Software Engineer II", "mid"],
    ["Junior Developer", "entry"],
    ["Director of Engineering", "executive"],
  ])("title %s -> %s", (title, level) => {
    expect(inferExperienceLevel(title, null)).toBe(level);
  });

  it("falls back to years in the description", () => {
    expect(inferExperienceLevel("Software Engineer", "Requires 5+ years of experience")).toBe("senior");
    expect(inferExperienceLevel("Software Engineer", "2-4 yrs preferred")).toBe("mid");
    expect(inferExperienceLevel("Software Engineer", null)).toBeNull();
  });

  it("takes the smallest plausible years value", () => {
    expect(inferMinYears("3+ years Python, 5 years total, founded 150 years ago")).toBe(3);
    expect(inferMinYears("no numbers here")).toBeNull();
  });

  it("detects remote from title, location or description", () => {
    expect(inferRemote("Engineer", "Remote - India", null)).toBe(true);
    expect(inferRemote("Engineer", "Pune", "This role is fully remote")).toBe(true);
    expect(inferRemote("Engineer", "Pune", "We have remote-friendly Fridays")).toBe(false);
  });

  it("classify returns all derived fields", () => {
    expect(classify({ title: "Senior Engineer", location: "Remote", description: "4 years" })).toEqual({
      experience_level: "senior",
      min_years_experience: 4,
      is_remote: true,
    });
  });
});

describe("matcher", () => {
  const profile = { skills: ["python", "aws"], target_titles: ["backend engineer"] };

  it("scores title matches double and caps at 1", () => {
    expect(scoreJob({ title: "Backend Engineer", description: "python aws" }, profile)).toBe(1);
    expect(scoreJob({ title: "Frontend Engineer", description: "python" }, profile)).toBe(0.25);
  });

  it("is 0 with an empty profile", () => {
    expect(scoreJob({ title: "Anything" }, { skills: [], target_titles: [] })).toBe(0);
  });
});

describe("filters.buildQuery", () => {
  const q = (s: string) => buildQuery(new URLSearchParams(s));

  it("returns an empty query with no known params", () => {
    expect(q("sort=match&limit=5&unknown=x")).toEqual({});
  });

  it("builds any-term regex filters and escapes regex characters", () => {
    expect(q("role=c%2B%2B,go")).toEqual({
      $and: [{ $or: [{ title: { $regex: "c\\+\\+", $options: "i" } }, { title: { $regex: "go", $options: "i" } }] }],
    });
  });

  it("requires every JD term", () => {
    const clause = (q("jd=python,aws").$and as unknown[])[0] as { $and: unknown[] };
    expect(clause.$and).toHaveLength(2);
  });

  it("combines multiselect, boolean and number filters", () => {
    expect(q("experience_level=entry&experience_level=mid&remote=true&min_score=40")).toEqual({
      $and: [
        { experience_level: { $in: ["entry", "mid"] } },
        { is_remote: true },
        { match_score: { $gte: 0.4 } },
      ],
    });
  });

  it("ignores empty or invalid values", () => {
    expect(q("role=&max_years=abc&remote=false")).toEqual({});
  });
});
