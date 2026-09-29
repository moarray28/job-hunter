"use client";

import { useEffect, useState } from "react";
import { api, Profile } from "@/lib/api";

const toList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.profile.get().then(setProfile);
  }, []);

  if (!profile) return <p>Loading...</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.profile.update(profile!);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const input = "bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full";

  return (
    <form onSubmit={save} className="grid gap-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-sm text-slate-400">
        Skills and target titles are used to compute the match score on newly scraped jobs.
      </p>
      <label className="grid gap-1">
        Full name
        <input
          className={input}
          value={profile.full_name || ""}
          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
        />
      </label>
      <label className="grid gap-1">
        Target titles (comma-separated)
        <input
          className={input}
          defaultValue={profile.target_titles.join(", ")}
          onBlur={(e) => setProfile({ ...profile, target_titles: toList(e.target.value) })}
        />
      </label>
      <label className="grid gap-1">
        Skills (comma-separated)
        <input
          className={input}
          defaultValue={profile.skills.join(", ")}
          onBlur={(e) => setProfile({ ...profile, skills: toList(e.target.value) })}
        />
      </label>
      <label className="grid gap-1">
        Preferred locations (comma-separated)
        <input
          className={input}
          defaultValue={profile.locations.join(", ")}
          onBlur={(e) => setProfile({ ...profile, locations: toList(e.target.value) })}
        />
      </label>
      <label className="grid gap-1">
        Minimum salary
        <input
          type="number"
          className={input}
          value={profile.min_salary ?? ""}
          onChange={(e) =>
            setProfile({ ...profile, min_salary: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </label>
      <label className="grid gap-1">
        Resume text
        <textarea
          className={input}
          rows={10}
          value={profile.resume_text || ""}
          onChange={(e) => setProfile({ ...profile, resume_text: e.target.value })}
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-2">
          Save profile
        </button>
        {saved && <span className="text-green-400 text-sm">Saved</span>}
      </div>
    </form>
  );
}
