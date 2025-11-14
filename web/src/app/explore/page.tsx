import type { Metadata } from "next";
import { ExploreClient } from "@/components/explore/explore-client";

export const metadata: Metadata = {
  title: "Explore",
};

export default function ExplorePage() {
  return <ExploreClient />;
}


