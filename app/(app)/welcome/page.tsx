import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

export default async function WelcomePage() {
  const user = await requireAuth();
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? "Coach";

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <div className="mb-10 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Welcome, {fullName}</h1>
        <p className="text-gray-600">Let's get your playbook set up.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/team/new" className="block">
          <Card className="h-full border-blue-600 ring-1 ring-blue-600 transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Create a team</CardTitle>
              <CardDescription>Recommended</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Start a new team, get an invite code, and build your playbook.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/join" className="block">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Join a team</CardTitle>
              <CardDescription>Have a code?</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Enter an invite code to join an existing team.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
