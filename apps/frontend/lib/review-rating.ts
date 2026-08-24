import type { Prisma } from "@woyab/database";

export async function recalculatePublicBusinessRating(
  tx: Prisma.TransactionClient,
  businessId: string,
) {
  const [aggregate, count] = await Promise.all([
    tx.review.aggregate({
      where: { businessId, status: "APPROVED" },
      _avg: { rating: true },
    }),
    tx.review.count({ where: { businessId, status: "APPROVED" } }),
  ]);

  await tx.business.update({
    where: { id: businessId },
    data: {
      averageRating: aggregate._avg.rating ?? 0,
      reviewCount: count,
    },
  });
}
