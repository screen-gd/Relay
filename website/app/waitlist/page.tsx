import { permanentRedirect } from "next/navigation";

// Keep existing bookmarks and search results working after the open launch.
export default function WaitlistPage() {
  permanentRedirect("https://relay-app.cc.cd/");
}
