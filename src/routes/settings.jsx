import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader, Input, PageHeader } from "@/components/ui";
import { profileStore } from "@/store/localStore";
import { config, isAiConfigured } from "@/config/app";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Meridian" },
      { name: "description", content: "Profile, data source and AI configuration for Meridian." },
      { property: "og:title", content: "Settings — Meridian" },
      { property: "og:description", content: "Configure Meridian." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const profile = profileStore.useStore();
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader eyebrow="Preferences" title="Settings" />
      <Card>
        <CardHeader eyebrow="Profile" title="Your name" />
        <Input value={profile.name} onChange={(e) => profileStore.set({ ...profile, name: e.target.value || "Investor" })} />
      </Card>
      <Card>
        <CardHeader eyebrow="System" title="Data & intelligence" />
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Data source</dt><dd>{config.dataMode === "mock" ? "Sample NSE data (development)" : `Local dataset · ${config.dataApiUrl}`}</dd>
          <dt className="text-muted-foreground">AI model</dt><dd>{config.aiModel}</dd>
          <dt className="text-muted-foreground">AI status</dt><dd>{isAiConfigured() ? "Connected" : "Preview mode — not yet connected"}</dd>
        </dl>
      </Card>
    </div>
  );
}
