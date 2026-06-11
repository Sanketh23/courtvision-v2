"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, useAuth } from "@/features/auth";
import { findTeamByCode, joinTeamByCode } from "@/features/team";
import { INVITE_CODE_LENGTH, isValidInviteCode } from "@/features/team/invite-code";

export default function JoinPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [code, setCode] = useState("");
  const [teamName, setTeamName] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced code validation against find_team_by_code.
  useEffect(() => {
    setTeamName(null);
    setCodeError(null);

    if (!isValidInviteCode(code)) return;

    setValidating(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const team = await findTeamByCode(code);
      setValidating(false);
      if (team) {
        setTeamName(team.name);
      } else {
        setCodeError("Code not found. Check with your coach.");
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code]);

  function handleCodeChange(value: string) {
    const cleaned = value.toUpperCase().slice(0, INVITE_CODE_LENGTH);
    setCode(cleaned);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    // Authenticated user: skip account creation, just join.
    if (user) {
      const { error } = await joinTeamByCode(code);
      if (error) {
        setSubmitError(error);
        setSubmitting(false);
        return;
      }
      router.push("/playbook");
      router.refresh();
      return;
    }

    // Unauthenticated: create account, then join.
    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      setSubmitting(false);
      return;
    }

    const signUpResult = await signUp({ fullName, email, password });
    if (signUpResult.error) {
      setSubmitError(signUpResult.error);
      setSubmitting(false);
      return;
    }

    const { error } = await joinTeamByCode(code);
    if (error) {
      setSubmitError(error);
      setSubmitting(false);
      return;
    }
    router.push("/playbook");
    router.refresh();
  }

  const showStageTwo = teamName !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a team</CardTitle>
        <CardDescription>Enter the code your coach gave you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Team code</Label>
            <Input
              id="code"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABC234"
              className="text-center text-2xl tracking-[0.5em] font-mono uppercase"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
            />
            {validating && <p className="text-sm text-gray-500">Checking…</p>}
            {teamName && <p className="text-sm text-green-700">Joining {teamName}</p>}
            {codeError && <p className="text-sm text-red-600">{codeError}</p>}
          </div>

          {showStageTwo && !user && (
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <Button type="submit" className="w-full" disabled={!showStageTwo || submitting}>
            {submitting ? "Joining…" : "Join team"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Have an account?{" "}
          <Link href="/sign-in" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
