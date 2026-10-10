import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { REDEMPTION_CODE_LENGTH } from "#shared/constants/domain";
import { PhoneNumberSchema } from "#shared/schemas/phone";
import { generateReadableCode } from "../../common/readable-code";
import { Clock, SystemClock } from "../../common/clock";
import { AccountService } from "../../customer/account/account.service";
import { DrizzleAccountRepository } from "../../customer/account/drizzle-account.repository";
import {
  ledgerEntries,
  loyaltyCards,
  redemptions,
  shops,
} from "../../database/schema";
import { LedgerStore } from "../../ledger/ledger.store";
import { RedemptionLookup } from "../../ledger/redemption-lookup";
import { createTestPii } from "../../test-support/pii";
import {
  neverExpires,
  NO_BONUS_RULES,
  TEST_DATABASE_URL,
  TestDatabase,
  type TestShop,
} from "../../test-support/test-database";
import { CounterRedemptionsService } from "./counter-redemptions.service";
import { CounterService } from "./counter.service";
import { DrizzleCounterRepository } from "./drizzle-counter.repository";

const SLOW = 60_000;

class FixedClock extends Clock {
  constructor(public current: Date) {
    super();
  }
  now(): Date {
    return this.current;
  }
}

describe.skipIf(!TEST_DATABASE_URL)(
  "merchant counter against a real database",
  () => {
    let data: TestDatabase;
    let clock: FixedClock;
    let redemptionsService: CounterRedemptionsService;
    let counter: CounterService;
    let lookup: RedemptionLookup;
    const ledger = new LedgerStore();
    const pii = createTestPii();

    beforeAll(() => {
      data = new TestDatabase(TEST_DATABASE_URL ?? "");
      clock = new FixedClock(new Date());
      lookup = new RedemptionLookup(data.db);
      const repo = new DrizzleCounterRepository(data.db, ledger, pii, lookup);
      redemptionsService = new CounterRedemptionsService(repo, clock);
      counter = new CounterService(repo, clock);
    });

    afterAll(async () => data.close());

    const ownerOf = async (shopId: string): Promise<string> => {
      const [row] = await data.db
        .select({ owner: shops.ownerUserId })
        .from(shops)
        .where(eq(shops.id, shopId));
      if (!row) throw new Error("shop expected");
      return row.owner;
    };

    /** Cartão de 3 que já está pronto, com celular cifrado de verdade (o Balcão decifra para mascarar). */
    async function readyCard(
      shop: TestShop,
      phone = "67991230374",
    ): Promise<{ customer: string; cardId: string }> {
      const customer = await data.createCustomer();
      await data.setPhone(
        customer,
        pii.encrypt(PhoneNumberSchema.parse(phone)),
      );
      await data.db.transaction(async (tx) => {
        const { card } = await ledger.lockOrCreateCard(
          tx,
          { shopId: shop.id, customerId: customer, programId: shop.programId },
          neverExpires(3),
        );
        await ledger.credit(tx, {
          card,
          shopId: shop.id,
          customerId: customer,
          kind: "visit",
          now: clock.now(),
          idempotencyKey: `fill-${customer}`,
          plan: {
            welcomeUnits: 0,
            units: 3,
            appliedBonuses: [],
            balanceAfter: 3,
            rewardExpiresAt: null,
          },
        });
      });
      const [card] = await data.db
        .select()
        .from(loyaltyCards)
        .where(eq(loyaltyCards.customerId, customer));
      if (!card) throw new Error("card expected");
      return { customer, cardId: card.id };
    }

    async function codeFor(
      shop: TestShop,
      cardId: string,
      options: {
        status?: "active" | "redeemed" | "expired";
        createdAt?: Date;
        expiresAt?: Date;
        code?: string;
      } = {},
    ) {
      const createdAt = options.createdAt ?? clock.now();
      const code = options.code ?? generateReadableCode(REDEMPTION_CODE_LENGTH);
      const [row] = await data.db
        .insert(redemptions)
        .values({
          cardId,
          shopId: shop.id,
          rewardTitle: "Prêmio de teste",
          code,
          status: options.status ?? "active",
          createdAt,
          expiresAt:
            options.expiresAt ?? new Date(createdAt.getTime() + 600_000),
        })
        .returning({ id: redemptions.id, code: redemptions.code });
      if (!row) throw new Error("redemption expected");
      return row;
    }

    const shop3 = () =>
      data.createShop({
        rules: { mode: "stamps", target: 3 },
        bonusRules: NO_BONUS_RULES,
      });

    it(
      'CA-09: validates a live code with the masked phone, and answers "not here" for another shop or a typo',
      async () => {
        const [shop, other] = [await shop3(), await shop3()];
        const { cardId } = await readyCard(shop);
        const created = await codeFor(shop, cardId);
        const owner = await ownerOf(shop.id);

        const preview = await redemptionsService.validateRedemption(
          owner,
          created.code,
        );
        expect(preview).toMatchObject({
          ok: true,
          value: {
            redemptionId: created.id,
            rewardTitle: "Prêmio de teste",
            maskedPhone: expect.stringContaining("•"),
          },
        });
        expect(JSON.stringify(preview)).not.toContain("991230374");
        expect(
          await redemptionsService.validateRedemption(
            await ownerOf(other.id),
            created.code,
          ),
        ).toEqual({ ok: false, error: { code: "redemptionInvalid" } });
        expect(
          await redemptionsService.validateRedemption(owner, "ZZZZZZ"),
        ).toEqual({ ok: false, error: { code: "redemptionInvalid" } });
      },
      SLOW,
    );

    it(
      "explains a code that is no longer active (used, expired) for 24 hours, then forgets it",
      async () => {
        const shop = await shop3();
        const { cardId } = await readyCard(shop);
        const owner = await ownerOf(shop.id);
        const now = clock.now();
        const used = await codeFor(shop, cardId, { status: "redeemed" });
        const lapsed = await codeFor(shop, cardId, { status: "expired" });
        const stillActiveButLate = await codeFor(shop, cardId, {
          createdAt: new Date(now.getTime() - 3_600_000),
          expiresAt: new Date(now.getTime() - 3_000_000),
        });
        const old = await codeFor(shop, cardId, {
          status: "redeemed",
          createdAt: new Date(now.getTime() - 25 * 3_600_000),
        });

        expect(
          await redemptionsService.validateRedemption(owner, used.code),
        ).toEqual({ ok: false, error: { code: "redemptionAlreadyUsed" } });
        expect(
          await redemptionsService.validateRedemption(owner, lapsed.code),
        ).toEqual({ ok: false, error: { code: "redemptionExpired" } });
        expect(
          await redemptionsService.validateRedemption(
            owner,
            stillActiveButLate.code,
          ),
        ).toEqual({ ok: false, error: { code: "redemptionExpired" } });
        expect(
          await redemptionsService.validateRedemption(owner, old.code),
        ).toEqual({ ok: false, error: { code: "redemptionInvalid" } });
      },
      SLOW,
    );

    it(
      "prefers the active code when an older line with the same code exists",
      async () => {
        const shop = await shop3();
        const { cardId } = await readyCard(shop);
        const owner = await ownerOf(shop.id);
        await codeFor(shop, cardId, {
          status: "redeemed",
          code: "ACD234",
          createdAt: new Date(clock.now().getTime() - 3_600_000),
        });
        const live = await codeFor(shop, cardId, { code: "ACD234" });
        expect(
          await redemptionsService.validateRedemption(owner, "acd-234"),
        ).toMatchObject({ ok: true, value: { redemptionId: live.id } });
      },
      SLOW,
    );

    it(
      'CA-10: two confirmations at the same time deliver once, debit once, and the loser hears "already used"',
      async () => {
        const shop = await shop3();
        const { cardId } = await readyCard(shop);
        const created = await codeFor(shop, cardId);
        const owner = await ownerOf(shop.id);
        const results = await Promise.all([
          redemptionsService.confirmRedemption(owner, created.id),
          redemptionsService.confirmRedemption(owner, created.id),
        ]);
        expect(results.filter((r) => r.ok)).toHaveLength(1);
        expect(results.filter((r) => !r.ok)).toEqual([
          { ok: false, error: { code: "redemptionAlreadyUsed" } },
        ]);
        const entries = await data.db
          .select()
          .from(ledgerEntries)
          .where(eq(ledgerEntries.cardId, cardId));
        expect(
          entries.filter((entry) => entry.kind === "redemption"),
        ).toHaveLength(1);
        expect(
          (
            await data.db
              .select({ balance: loyaltyCards.balance })
              .from(loyaltyCards)
              .where(eq(loyaltyCards.id, cardId))
          )[0]?.balance,
        ).toBe(0);
      },
      SLOW,
    );

    it(
      "CA-10: a refusal that expires the code (reward no longer ready) is committed, not rolled back",
      async () => {
        const shop = await shop3();
        const { cardId } = await readyCard(shop);
        const created = await codeFor(shop, cardId);
        await data.db
          .update(loyaltyCards)
          .set({ balance: 1 })
          .where(eq(loyaltyCards.id, cardId));
        const owner = await ownerOf(shop.id);
        expect(
          await redemptionsService.confirmRedemption(owner, created.id),
        ).toMatchObject({ ok: false, error: { code: "rewardNotReady" } });
        expect(
          (
            await data.db
              .select({ status: redemptions.status })
              .from(redemptions)
              .where(eq(redemptions.id, created.id))
          )[0]?.status,
        ).toBe("expired");
        expect(
          await redemptionsService.validateRedemption(owner, created.code),
        ).toEqual({ ok: false, error: { code: "redemptionExpired" } });
      },
      SLOW,
    );

    it(
      "the code lookup is served by an index, not a scan of the redemptions table",
      async () => {
        const shop = await shop3();
        const scans = await data.scansWithoutSeqScan(
          lookup.findQuery(data.db, shop.id, "ACD234", clock.now()),
        );
        expect(
          scans
            .filter((scan) => scan.relation === "redemptions")
            .every((scan) => scan.node !== "Seq Scan" && scan.index !== null),
        ).toBe(true);
      },
      SLOW,
    );

    it(
      "CA-03: a merchant cannot confirm a code of another shop",
      async () => {
        const [mine, theirs] = [await shop3(), await shop3()];
        const { cardId } = await readyCard(mine);
        const created = await codeFor(mine, cardId);
        expect(
          await redemptionsService.confirmRedemption(
            await ownerOf(theirs.id),
            created.id,
          ),
        ).toEqual({ ok: false, error: { code: "redemptionInvalid" } });
        expect(
          (
            await data.db
              .select({ status: redemptions.status })
              .from(redemptions)
              .where(eq(redemptions.id, created.id))
          )[0]?.status,
        ).toBe("active");
      },
      SLOW,
    );

    it(
      '"Hoje" starts at local midnight, not at the server midnight',
      async () => {
        const shop = await shop3();
        const { customer, cardId } = await readyCard(shop);
        const owner = await ownerOf(shop.id);
        // 00:30 local de 10/10 = 04:30Z. Uma visita às 22:00 locais de 9/10 (02:00Z de 10/10) é do dia anterior, mesmo já sendo 10/10 em UTC.
        clock.current = new Date("2026-10-10T04:30:00Z");
        try {
          const visitAt = async (iso: string, key: string) => {
            await data.db
              .insert(ledgerEntries)
              .values({
                cardId,
                shopId: shop.id,
                customerId: customer,
                kind: "visit",
                unitsDelta: 1,
                countsAsVisit: true,
                idempotencyKey: key,
                occurredAt: new Date(iso),
              });
          };
          await visitAt("2026-10-10T02:00:00Z", `late-${customer}`);
          await visitAt("2026-10-10T04:10:00Z", `early-${customer}`);
          const today = await counter.listTodayEntries(owner);
          const times = today.ok
            ? today.value.map((entry) => entry.createdAt)
            : [];
          expect(times).toContain("2026-10-10T04:10:00.000Z");
          expect(times).not.toContain("2026-10-10T02:00:00.000Z");
        } finally {
          clock.current = new Date();
        }
      },
      SLOW,
    );

    it(
      "flags the first visit of a person in the shop as new, and only that one",
      async () => {
        const shop = await shop3();
        const customer = await data.createCustomer();
        await data.setPhone(
          customer,
          pii.encrypt(PhoneNumberSchema.parse("67991230375")),
        );
        const owner = await ownerOf(shop.id);
        // Relógio fixo no meio da tarde local: "uma hora atrás" nunca cruza a meia-noite, seja a hora em que o teste rode.
        clock.current = new Date("2026-10-09T19:00:00Z");
        try {
          const first = new Date(clock.now().getTime() - 3_600_000);
          await data.db.transaction(async (tx) => {
            const { card } = await ledger.lockOrCreateCard(
              tx,
              {
                shopId: shop.id,
                customerId: customer,
                programId: shop.programId,
              },
              neverExpires(3),
            );
            const one = await ledger.credit(tx, {
              card,
              shopId: shop.id,
              customerId: customer,
              kind: "visit",
              now: first,
              idempotencyKey: `v1-${customer}`,
              plan: {
                welcomeUnits: 0,
                units: 1,
                appliedBonuses: [],
                balanceAfter: 1,
                rewardExpiresAt: null,
              },
            });
            await ledger.credit(tx, {
              card: { ...card, balance: 1, lastVisitAt: one.recordedAt },
              shopId: shop.id,
              customerId: customer,
              kind: "visit",
              now: clock.now(),
              idempotencyKey: `v2-${customer}`,
              plan: {
                welcomeUnits: 0,
                units: 1,
                appliedBonuses: [],
                balanceAfter: 2,
                rewardExpiresAt: null,
              },
            });
          });
          const today = await counter.listTodayEntries(owner);
          if (!today.ok) throw new Error("entries expected");
          const mine = today.value.filter((entry) => entry.kind === "visit");
          expect(mine.map((entry) => entry.isNewCustomer).sort()).toEqual([
            false,
            true,
          ]);
        } finally {
          clock.current = new Date();
        }
      },
      SLOW,
    );

    it(
      'CA-12: "Hoje" shows a customer whose account was erased as "removed", without decrypting and without a 500',
      async () => {
        const shop = await shop3();
        const { customer } = await readyCard(shop);
        const owner = await ownerOf(shop.id);
        await new AccountService(
          new DrizzleAccountRepository(data.db),
          new SystemClock(),
        ).erase(customer);
        const today = await counter.listTodayEntries(owner);
        expect(today).toMatchObject({
          ok: true,
          value: [expect.objectContaining({ maskedPhone: null })],
        });
      },
      SLOW,
    );
  },
);
