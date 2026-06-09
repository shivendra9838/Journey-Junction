export type PricingInput = {
  basePrice: number;
  date: Date;
  demand: number;
  occupancy: number;
  holiday: boolean;
  rule?: {
    seasonMultiplier?: number;
    demandMultiplier?: number;
    occupancyMultiplier?: number;
    holidayMultiplier?: number;
    weekendMultiplier?: number;
  } | null;
};

export function calculateDynamicPrice(input: PricingInput) {
  const isWeekend = [0, 6].includes(input.date.getDay());
  const season = input.rule?.seasonMultiplier ?? 1;
  const demand = 1 + input.demand * ((input.rule?.demandMultiplier ?? 1) - 1);
  const occupancy = 1 + input.occupancy * ((input.rule?.occupancyMultiplier ?? 1) - 1);
  const holiday = input.holiday ? (input.rule?.holidayMultiplier ?? 1.15) : 1;
  const weekend = isWeekend ? (input.rule?.weekendMultiplier ?? 1.1) : 1;
  return {
    basePrice: input.basePrice,
    finalPrice: Math.round(input.basePrice * season * demand * occupancy * holiday * weekend),
    factors: { season, demand, occupancy, holiday, weekend },
  };
}
