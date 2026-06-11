"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeam, generateInviteCode } from "@/features/team";

const LEVELS = ["Youth", "High school", "AAU", "College", "Other"];

/** Current academic year, e.g. "2025–2026" (Aug–Jul boundary). */
function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 7 ? year : year - 1; // month 7 = August
  return `${startYear}–${startYear + 1}`;
}

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [season, setSeason] = useState(currentAcademicYear());
  const [level, setLevel] = useState("");
  const [inviteCode, setInviteCode] = useState(() => generateInviteCode());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await createTeam({
      name,
      season,
      level: level || undefined,
      inviteCode,
    });
    if (error) {
      setError(error);
      setSubmitting(false);
      return;
    }

    router.push("/playbook");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Create a team</CardTitle>
          <CardDescription>You'll be the coach. Players join with a code.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Team name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lincoln Eagles"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="season">Season</Label>
              <Input
                id="season"
                required
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="level">Level (optional)</Label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <option value="">Select…</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 rounded-md border border-gray-200 bg-gray-50 p-4">
              <Label>Invite code</Label>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-mono text-2xl tracking-[0.3em] text-gray-900">
                  {inviteCode}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInviteCode(generateInviteCode())}
                >
                  Regenerate
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Share this with your players so they can join.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create team"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
