import { createFileRoute } from "@tanstack/react-router";
import { Workbench } from "@/components/editor/Workbench";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Workbench />;
}
