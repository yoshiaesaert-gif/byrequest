import PubShell from "@/components/pub-shell";
import SafetyBody from "@/components/safety-body";
import { share } from "@/config/share";

/* /safety for visitors who are not signed in (and link previews): the same content, public and share-safe. */
export const metadata = share({ title: "Safety at ByRequest", description: "Verified adults only, money held until the delivery matches, encrypted chats and checked deliveries. How ByRequest keeps everyone safe.", path: "/safety", index: true });

export default function PublicSafety() {
  return <PubShell><SafetyBody /></PubShell>;
}
