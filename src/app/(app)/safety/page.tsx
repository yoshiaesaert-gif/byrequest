import { requireUser } from "@/server/auth";
import SafetyBody from "@/components/safety-body";
import { share } from "@/config/share";

export const metadata = share({ title: "Safety at ByRequest", description: "Verified adults only, money held until the delivery matches, encrypted chats and checked deliveries. How ByRequest keeps everyone safe.", path: "/safety", index: true });

export default async function Safety() {
  await requireUser();
  return <SafetyBody />;
}
