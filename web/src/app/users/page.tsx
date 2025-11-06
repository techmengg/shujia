import { prisma } from "@/lib/prisma";
import { UsersList, type UserItemDto } from "@/components/users/users-list";

export const metadata = {
  title: "Shujia | Users",
};

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-12 pt-10 sm:px-6 lg:px-10">
      <header className="space-y-3 border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold text-white">All users</h1>
        <p className="max-w-2xl text-sm text-white/65">
          Browse accounts on Shujia. Click a user to view their profile.
        </p>
      </header>
      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-sm text-white/60">
          No users yet.
        </p>
      ) : (
        <UsersList
          users={users.map((u) => ({
            id: u.id,
            username: u.username,
            name: u.name,
            avatarUrl: u.avatarUrl,
            createdAt: u.createdAt.toISOString(),
          })) as UserItemDto[]}
        />
      )}
    </main>
  );
}
