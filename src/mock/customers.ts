import type { Customer } from "@/types";
import { fakeEmail, fakeName, fakePhone, int, pseudoRandom } from "./names";

pseudoRandom(7);

const now = Date.now();
function isoDaysAgo(days: number) {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export const customers: Customer[] = Array.from({ length: 18 }, (_, i) => {
  const name = fakeName();
  return {
    id: `cus_${(1000 + i).toString(36).toUpperCase()}`,
    name,
    email: fakeEmail(name),
    phone: fakePhone(),
    createdAt: isoDaysAgo(int(1, 240)),
    totalSpend: int(5_000, 1_500_000) * 100, // kobo
    transactionCount: int(1, 32),
    status: i === 17 ? "blacklisted" : "active",
  };
});
