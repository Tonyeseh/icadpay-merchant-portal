import type { BankAccount, Payout } from "@/types";
import { int, pseudoRandom } from "./names";

pseudoRandom(99);

const now = Date.now();
function isoDaysAgo(days: number) {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export const initialBankAccounts: BankAccount[] = [
  {
    id: "ba_01",
    bankName: "Guaranty Trust Bank",
    bankCode: "058",
    accountNumber: "0123456789",
    accountName: "LAGOS THREADWORKS LIMITED",
    isPrimary: true,
    addedAt: isoDaysAgo(180),
  },
  {
    id: "ba_02",
    bankName: "Stanbic IBTC Bank",
    bankCode: "221",
    accountNumber: "9876543210",
    accountName: "LAGOS THREADWORKS LIMITED",
    isPrimary: false,
    addedAt: isoDaysAgo(45),
  },
];

export const payouts: Payout[] = Array.from({ length: 11 }, (_, i) => {
  const days = i * int(1, 4) + int(0, 2);
  const status = i === 0 ? "processing" : i === 6 ? "failed" : "paid";
  const amount = int(120_000, 2_400_000) * 100;
  return {
    id: `po_${(2000 + i).toString(36).toUpperCase()}`,
    amount,
    status,
    bankAccountId: i % 4 === 3 ? "ba_02" : "ba_01",
    createdAt: isoDaysAgo(days),
    settledAt: status === "paid" ? isoDaysAgo(days - 1) : undefined,
    reference: `PO_${Date.now().toString(36).slice(-6).toUpperCase()}${i}`,
    transactionCount: int(8, 84),
  };
});
