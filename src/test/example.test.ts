import { describe, expect, it } from "vitest";
import {
  calculateInvoiceOutstanding,
  createDeliveryRecord,
  createSeedState,
  exportRowsToCsv,
  finalizeDeliveryTrackerState,
} from "@/lib/delivery-tracker";
import { getAllowedRoute } from "@/lib/auth";

describe("delivery tracker logic", () => {
  it("calculates invoice outstanding after payments and credits", () => {
    const state = createSeedState();

    expect(
      calculateInvoiceOutstanding(
        "inv-001",
        state.invoiceReferences,
        state.payments,
        state.creditNotes,
      ),
    ).toBe(12000);
  });

  it("creates a delivery record and refreshes the customer ledger", () => {
    const state = createSeedState();
    const nextState = createDeliveryRecord(state, {
      vehicleId: "veh-001",
      customerId: "cust-001",
      location: "Whitefield, Bengaluru",
      arrivalTime: "14:10",
      departureTime: "14:35",
      deliveryStatus: "Delivered",
      goods: [{ productName: "Snack Carton", quantity: 15, deliveryDate: "2026-04-12" }],
      invoiceReference: "INV-EXT-2008",
      invoiceAmount: 15000,
      invoiceDate: "2026-04-12",
      payment: {
        paymentMethod: "Cash",
        amountReceived: 9000,
        paymentDate: "2026-04-12",
      },
      credit: {
        creditAmount: 1000,
        reason: "Promo adjustment",
      },
      proof: null,
    });

    const metroLedger = nextState.customerLedger.find((row) => row.customerId === "cust-001");

    expect(nextState.deliveryStops).toHaveLength(state.deliveryStops.length + 1);
    expect(nextState.invoiceReferences).toHaveLength(state.invoiceReferences.length + 1);
    expect(metroLedger?.totalInvoice).toBe(40000);
    expect(metroLedger?.totalPaid).toBe(21000);
    expect(metroLedger?.creditAmount).toBe(2000);
    expect(metroLedger?.outstandingBalance).toBe(17000);
  });

  it("exports csv rows with headers", () => {
    expect(exportRowsToCsv([{ customer_name: "Metro Retail", outstanding: 12000 }])).toContain(
      "customer_name,outstanding",
    );
  });

  it("rebuilds invoice statuses and ledger totals from a base state", () => {
    const seed = createSeedState();
    const rebuilt = finalizeDeliveryTrackerState({
      vehicles: seed.vehicles,
      customers: seed.customers,
      deliveryStops: seed.deliveryStops,
      goodsDelivered: seed.goodsDelivered,
      invoiceReferences: seed.invoiceReferences.map((invoice) => ({
        ...invoice,
        paymentStatus: "Pending",
      })),
      payments: seed.payments,
      creditNotes: seed.creditNotes,
      deliveryProofs: seed.deliveryProofs,
    });

    expect(rebuilt.invoiceReferences.find((invoice) => invoice.id === "inv-002")?.paymentStatus).toBe("Paid");
    expect(rebuilt.customerLedger).toHaveLength(seed.customers.length);
  });

  it("redirects users to their allowed dashboard route", () => {
    expect(getAllowedRoute("finance", "/admin")).toBe("/finance");
    expect(getAllowedRoute("driver", "/driver")).toBe("/driver");
  });
});
