describe("phase4 pricing rules", () => {
  it("calculates dynamic pricing from season, demand, occupancy and weekend factors", async () => {
    const { calculateDynamicPrice } = await import("./pricing.engine");
    const quote = calculateDynamicPrice({
      basePrice: 1000,
      date: new Date("2026-06-06T00:00:00.000Z"),
      demand: 0.5,
      occupancy: 0.5,
      holiday: false,
      rule: {
        seasonMultiplier: 1.2,
        demandMultiplier: 1.4,
        occupancyMultiplier: 1.2,
        weekendMultiplier: 1.1,
      },
    });
    expect(quote.finalPrice).toBe(1742);
    expect(quote.factors.weekend).toBe(1.1);
  });

  it("uses safe defaults when no rule is configured", async () => {
    const { calculateDynamicPrice } = await import("./pricing.engine");
    const quote = calculateDynamicPrice({
      basePrice: 2000,
      date: new Date("2026-06-03T00:00:00.000Z"),
      demand: 0.3,
      occupancy: 0.4,
      holiday: false,
      rule: null,
    });
    expect(quote.finalPrice).toBe(2000);
    expect(quote.factors.weekend).toBe(1);
  });

  it("applies the default holiday multiplier", async () => {
    const { calculateDynamicPrice } = await import("./pricing.engine");
    const quote = calculateDynamicPrice({
      basePrice: 1000,
      date: new Date("2026-06-04T00:00:00.000Z"),
      demand: 0,
      occupancy: 0,
      holiday: true,
      rule: {},
    });
    expect(quote.finalPrice).toBe(1150);
    expect(quote.factors.holiday).toBe(1.15);
  });
});
