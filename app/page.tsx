import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold text-blue-600 mb-4">CourtVision</h1>
          <p className="text-xl text-gray-600 mb-8">Animated Basketball Playbooks</p>
          <p className="text-base text-gray-500 mb-12 leading-relaxed">
            Design, visualize, and share basketball plays with smooth motion animation. Built for
            coaches to create and players to study.
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
            Get Started
          </Button>
        </div>
      </section>

      {/* Design Tokens Showcase */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Design System</h2>

          {/* Color Palette */}
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Primary", color: "bg-blue-600" },
                { name: "Success", color: "bg-green-600" },
                { name: "Warning", color: "bg-amber-500" },
                { name: "Danger", color: "bg-red-600" },
                { name: "Gray 100", color: "bg-gray-100" },
                { name: "Gray 500", color: "bg-gray-500" },
                { name: "Gray 900", color: "bg-gray-900" },
                { name: "White", color: "bg-white border border-gray-300" },
              ].map((item) => (
                <div key={item.name} className="text-center">
                  <div className={`${item.color} h-24 rounded-lg mb-2`} />
                  <p className="text-sm font-medium text-gray-700">{item.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Typography</h3>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">Heading 3XL</p>
                <p className="text-sm text-gray-500">text-3xl font-bold</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Heading 2XL</p>
                <p className="text-sm text-gray-500">text-2xl font-bold</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">Heading XL</p>
                <p className="text-sm text-gray-500">text-xl font-semibold</p>
              </div>
              <div>
                <p className="text-base text-gray-900">Body text regular</p>
                <p className="text-sm text-gray-500">text-base</p>
              </div>
            </div>
          </div>

          {/* Components */}
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Components</h3>
            <div className="flex flex-wrap gap-4">
              <Button>Primary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button size="sm">Small Button</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Status */}
      <section className="px-6 py-12 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Status:</span> M0 Foundation • v2 Alpha
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Next.js 15 • TypeScript • Tailwind CSS v4 • Supabase
          </p>
        </div>
      </section>
    </main>
  );
}
