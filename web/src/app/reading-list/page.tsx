import { ReadingListClient } from "@/components/reading-list/reading-list-client";
import type { Metadata } from "next";

export default function ReadingListPage() {
  return (
    <ReadingListClient />
  );
}

export const metadata: Metadata = {
  title: "Shujia | Reading List",
};
