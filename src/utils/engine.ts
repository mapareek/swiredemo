import { HuntConstraints, PicOSConstraints, OptimizeConstraints, RecommendationResult, RecommendedSKU, IMAGES, ON_AD_DIRECTIVES, OnAdDirective } from "../types";

export function getHuntRecommendation(constraints: HuntConstraints): RecommendationResult {
  const { category, location, priority } = constraints;
  const budget = 500;

  // Check budget threshold
  if (budget < 200) {
    return {
      skus: [],
      totalCost: 0,
      expectedLift: 0,
      explanation: "No physical display can be placed. Minimum viable setup cost is $200. Please increase budget constraint.",
      feasible: false
    };
  }

  // Still + Checkout Lane is an infeasible combo to show empty state
  if (category === "Still" && location === "Checkout Lane") {
    return {
      skus: [],
      totalCost: 0,
      expectedLift: 0,
      explanation: "Empty State: Liberty Coca-Cola has no approved 'Still' category checklist items for Checkout Lanes in Large Store/Grocery format. Try selecting 'Sparkling' or choosing 'Lobby Front' / 'Front Endcap' locations.",
      feasible: false
    };
  }

  let skus: RecommendedSKU[] = [];
  let explanation = "";
  let baseLift = 12;

  // Determine base configuration based on Category and Location
  if (category === "Sparkling") {
    if (location === "Lobby Front") {
      skus = [
        {
          skuId: "SKU-001",
          name: "Coca-Cola Zero Sugar",
          pack: "20oz Bottle 24-Pack",
          price: 32.50,
          expectedSales: 180,
          liftPercent: 22,
          locked: true, // Core brand locked
          image: IMAGES.skuReference
        },
        {
          skuId: "SKU-002",
          name: "Coca-Cola Original Taste",
          pack: "20oz Bottle 24-Pack",
          price: 32.50,
          expectedSales: 220,
          liftPercent: 18,
          locked: true,
          image: IMAGES.skuReference
        },
        {
          skuId: "SKU-003",
          name: "Sprite Zero Sugar",
          pack: "20oz Bottle 24-Pack",
          price: 31.00,
          expectedSales: 110,
          liftPercent: 15,
          locked: false, // Optimizable SKU
          image: IMAGES.glassCoke
        }
      ];
      explanation = "Large-scale lobby display emphasizing Coca-Cola Zero Sugar core and Diet/Sprite extensions.";
      baseLift = 18;
    } else if (location === "Front Endcap") {
      skus = [
        {
          skuId: "SKU-001",
          name: "Coca-Cola Zero Sugar",
          pack: "12oz Can 12-Pack",
          price: 8.99,
          expectedSales: 350,
          liftPercent: 16,
          locked: true,
          image: IMAGES.skuReference
        },
        {
          skuId: "SKU-004",
          name: "Diet Coke Classic",
          pack: "12oz Can 12-Pack",
          price: 8.99,
          expectedSales: 280,
          liftPercent: 12,
          locked: false,
          image: IMAGES.glassCoke
        }
      ];
      explanation = "Front-endcap shelving optimized for high-volume 12-Pack Cans to capture shopper entry momentum.";
      baseLift = 14;
    } else {
      // Aisle Cooler or Checkout
      skus = [
        {
          skuId: "SKU-001",
          name: "Coca-Cola Zero Sugar",
          pack: "20oz Single Bottle",
          price: 2.10,
          expectedSales: 150,
          liftPercent: 12,
          locked: true,
          image: IMAGES.skuReference
        }
      ];
      explanation = "Single cooler/cooler rack optimization focusing on ice-cold immediate consumption SKU.";
      baseLift = 9;
    }
  } else if (category === "Still" || category === "Water") {
    // Water & Still brands
    skus = [
      {
        skuId: "SKU-101",
        name: "Smartwater Glaceau",
        pack: "1L Bottle 15-Pack",
        price: 24.00,
        expectedSales: 130,
        liftPercent: 15,
        locked: true,
        image: IMAGES.skuReference
      },
      {
        skuId: "SKU-102",
        name: "Dasani Purified Water",
        pack: "20oz Bottle 24-Pack",
        price: 18.50,
        expectedSales: 190,
        liftPercent: 11,
        locked: false,
        image: IMAGES.glassCoke
      }
    ];
    explanation = "Hydration center focus featuring premium Smartwater paired with high-volume Dasani cases.";
    baseLift = 13;
  } else {
    // Energy
    skus = [
      {
        skuId: "SKU-201",
        name: "Monster Energy Original",
        pack: "16oz Can 4-Pack",
        price: 9.50,
        expectedSales: 140,
        liftPercent: 25,
        locked: true,
        image: IMAGES.skuReference
      },
      {
        skuId: "SKU-202",
        name: "Monster Ultra Peachy Keen Zero",
        pack: "16oz Can 4-Pack",
        price: 9.50,
        expectedSales: 95,
        liftPercent: 20,
        locked: false,
        image: IMAGES.glassCoke
      }
    ];
    explanation = "High-octane endcap or wing display to capitalize on Monster Energy zero-sugar flavor innovations.";
    baseLift = 22;
  }

  // Filter or adjust SKU count and volume according to budget limit
  // Let's calculate total setup cost: setup cost = sum(price * case_count_multiplier)
  // Let's say we adjust the case quantity multiplier according to budget
  let quantityMultiplier = 1;
  if (budget >= 800) {
    quantityMultiplier = 4;
    explanation += " Budget is abundant: expanded to 4x inventory stock cases for continuous velocity.";
    baseLift += 4;
  } else if (budget >= 500) {
    quantityMultiplier = 3;
    explanation += " Budget accommodates 3x inventory backup layers for peak weekends.";
    baseLift += 2;
  } else if (budget >= 300) {
    quantityMultiplier = 2;
    explanation += " Adjusted cases to 2x layers to fit moderate budget limitations.";
  } else {
    quantityMultiplier = 1;
    explanation += " Constrained to 1x layer of basic stock to respect strict budget limit.";
    baseLift -= 2;
  }

  // Priorities also affect lift and SKU selection order
  if (priority === "Volume") {
    // Boost expected sales for high volume
    skus.forEach(s => s.expectedSales = Math.round(s.expectedSales * 1.25));
    baseLift += 1;
  } else if (priority === "Margin") {
    // Boost premium pricing and lift expectations
    skus.forEach(s => s.price = parseFloat((s.price * 1.15).toFixed(2)));
    baseLift += 2;
  } else if (priority === "Velocity") {
    // High turn rate
    baseLift += 3;
  }

  // Calculate costs
  const totalCost = skus.reduce((sum, s) => sum + (s.price * quantityMultiplier), 0);

  // If cost exceeds budget, we scale down or prune non-locked SKUs
  let finalSkus = [...skus];
  let finalCost = totalCost;

  if (finalCost > budget) {
    // Prune the unlocked SKU if we have more than 1 SKU
    if (finalSkus.length > 1) {
      finalSkus = finalSkus.filter(s => s.locked);
      finalCost = finalSkus.reduce((sum, s) => sum + (s.price * quantityMultiplier), 0);
      explanation = `Adjusted recommendation by removing secondary SKU to fit within reduced budget of $${budget}.`;
      baseLift -= 3;
    }
    // If still over, scale down multiplier
    if (finalCost > budget && quantityMultiplier > 1) {
      quantityMultiplier = 1;
      finalCost = finalSkus.reduce((sum, s) => sum + s.price, 0);
      explanation = `Scaled down display volume to a single-stock layer to comply with strict $${budget} budget limit.`;
    }
  }

  // If even with multiplier = 1, cost exceeds budget, mark infeasible
  if (finalCost > budget) {
    return {
      skus: [],
      totalCost: 0,
      expectedLift: 0,
      explanation: `No feasible layout is possible within budget constraint of $${budget}. Min cost for core SKU is $${finalCost.toFixed(2)}.`,
      feasible: false
    };
  }

  return {
    skus: finalSkus.map(s => ({
      ...s,
      pack: `${quantityMultiplier * 2} Cases / ${s.pack}`
    })),
    totalCost: parseFloat(finalCost.toFixed(2)),
    expectedLift: baseLift,
    explanation,
    feasible: true
  };
}

export interface PicOSLayoutItem {
  shelf: number;
  skus: { name: string; share: number; locked: boolean; facings: number }[];
}

export function getPicOSLayout(constraints: PicOSConstraints): {
  layout: PicOSLayoutItem[];
  totalFacingCount: number;
  complianceRating: string;
  explanation: string;
  directiveName: string;
  directiveCode: string;
  skuFacingDistribution: { name: string; minFacings: number; allocatedFacings: number; priority: string; share: number }[];
} {
  const { coolerSize = "2-Door", shelves = 4, directiveId } = constraints;

  // Find the selected directive or default to the first one
  const directive = ON_AD_DIRECTIVES.find(d => d.id === directiveId) || ON_AD_DIRECTIVES[0];

  // Determine available facings per shelf based on door configuration
  let facingsPerShelf = 10;
  if (coolerSize === "1-Door") facingsPerShelf = 5;
  else if (coolerSize === "2-Door") facingsPerShelf = 10;
  else if (coolerSize === "3-Door") facingsPerShelf = 15;

  const totalFacingCount = shelves * facingsPerShelf;

  // Real-time facing optimization algorithm
  // Distribute the total available slots among the directive's SKUs proportionally based on target shares
  const rawFacings = directive.skus.map(s => {
    return {
      name: s.name,
      minFacings: s.minFacings,
      priority: s.priority,
      share: s.share,
      allocated: Math.max(1, Math.round((s.share / 100) * totalFacingCount))
    };
  });

  // Adjust allocation so that the sum matches the exact physical cooler capacity (totalFacingCount)
  let currentSum = rawFacings.reduce((sum, item) => sum + item.allocated, 0);

  if (currentSum !== totalFacingCount) {
    let attempts = 0;
    while (currentSum !== totalFacingCount && attempts < 150) {
      attempts++;
      if (currentSum < totalFacingCount) {
        // Needs more facings. Find the SKU with the greatest positive difference between (share ratio * capacity) and currently allocated
        let bestIndex = -1;
        let maxDeficit = -9999;
        rawFacings.forEach((rf, idx) => {
          const target = (rf.share / 100) * totalFacingCount;
          const deficit = target - rf.allocated;
          if (deficit > maxDeficit) {
            maxDeficit = deficit;
            bestIndex = idx;
          }
        });
        if (bestIndex !== -1) {
          rawFacings[bestIndex].allocated += 1;
          currentSum++;
        }
      } else {
        // Needs fewer facings. Find the SKU with the largest excess (allocated - target share ratio), prioritizing those with allocated > minFacings
        let bestIndex = -1;
        let maxExcess = -9999;
        rawFacings.forEach((rf, idx) => {
          if (rf.allocated > 1) {
            const target = (rf.share / 100) * totalFacingCount;
            const excess = rf.allocated - target;
            if (excess > maxExcess) {
              maxExcess = excess;
              bestIndex = idx;
            }
          }
        });
        if (bestIndex === -1) {
          // Fallback if all are at 1 facing or no clear excess
          let minShare = 9999;
          rawFacings.forEach((rf, idx) => {
            if (rf.allocated > 1 && rf.share < minShare) {
              minShare = rf.share;
              bestIndex = idx;
            }
          });
        }
        if (bestIndex !== -1) {
          rawFacings[bestIndex].allocated -= 1;
          currentSum--;
        }
      }
    }
  }

  // Create array of SKU slots based on allocated facings, sorted by share
  const orderedFacings = [...rawFacings].sort((a, b) => b.share - a.share);
  const slots: string[] = [];
  orderedFacings.forEach(rf => {
    for (let i = 0; i < rf.allocated; i++) {
      slots.push(rf.name);
    }
  });

  // Safe checks for array size
  while (slots.length < totalFacingCount) {
    slots.push(orderedFacings[0]?.name || "Coca-Cola Original");
  }
  if (slots.length > totalFacingCount) {
    slots.length = totalFacingCount;
  }

  // Segment slots into shelves and group adjacent identical items to render as continuous planogram blocks
  const layout: PicOSLayoutItem[] = [];
  for (let s = 1; s <= shelves; s++) {
    const startIndex = (s - 1) * facingsPerShelf;
    const shelfSlots = slots.slice(startIndex, startIndex + facingsPerShelf);

    const shelfSKUs: { name: string; share: number; locked: boolean; facings: number }[] = [];
    let currentSKUName = "";
    let currentCount = 0;

    const flushSKU = () => {
      if (currentCount > 0) {
        const share = Math.round((currentCount / facingsPerShelf) * 100);
        shelfSKUs.push({
          name: currentSKUName,
          share,
          facings: currentCount,
          locked: currentSKUName.toLowerCase().includes("original") || currentSKUName.toLowerCase().includes("zero")
        });
      }
    };

    shelfSlots.forEach(slot => {
      if (slot === currentSKUName) {
        currentCount++;
      } else {
        flushSKU();
        currentSKUName = slot;
        currentCount = 1;
      }
    });
    flushSKU();

    layout.push({
      shelf: s,
      skus: shelfSKUs
    });
  }

  const skuFacingDistribution = rawFacings.map(rf => ({
    name: rf.name,
    minFacings: rf.minFacings,
    allocatedFacings: rf.allocated,
    priority: rf.priority,
    share: rf.share
  }));

  const explanation = `Locked OnAd Playbook '${directive.code}' (${directive.name}). Allocated ${totalFacingCount} total facings proportionally based on regional brand weight. Priority brands locked at eye-level positions.`;

  return {
    layout,
    totalFacingCount,
    complianceRating: "Gold Standard Directive Compliance",
    explanation,
    directiveName: directive.name,
    directiveCode: directive.code,
    skuFacingDistribution
  };
}

export interface OptimizedSKURec {
  sku: string;
  beforeShare: number; // in percent
  afterShare: number;  // in percent
  lift: number;        // in percent
  locked: boolean;
  salesDelta: number;
}

export function getOptimizeRecommendation(constraints: OptimizeConstraints): {
  skus: OptimizedSKURec[];
  beforeScore: number;
  afterScore: number;
  liftPercent: number;
  explanation: string;
} {
  const { focus, maxSkus, brandFocus } = constraints;

  // We will build a dynamic optimization list
  const allPossibleSKUs = [
    { sku: "Coca-Cola Original 20oz", category: "Sparkling", brand: "Coca-Cola", isSugar: true, baseSales: 450, margin: 0.32, velocity: 90 },
    { sku: "Coke Zero Sugar 20oz", category: "Sparkling", brand: "Coca-Cola", isSugar: false, baseSales: 380, margin: 0.35, velocity: 85 },
    { sku: "Diet Coke 20oz", category: "Sparkling", brand: "Coca-Cola", isSugar: false, baseSales: 310, margin: 0.33, velocity: 78 },
    { sku: "Sprite 20oz", category: "Sparkling", brand: "Sprite", isSugar: true, baseSales: 280, margin: 0.30, velocity: 72 },
    { sku: "Sprite Zero 20oz", category: "Sparkling", brand: "Sprite", isSugar: false, baseSales: 190, margin: 0.34, velocity: 65 },
    { sku: "Monster Energy 16oz", category: "Energy", brand: "Monster", isSugar: true, baseSales: 390, margin: 0.42, velocity: 80 },
    { sku: "Monster Ultra Peachy Keen 16oz", category: "Energy", brand: "Monster", isSugar: false, baseSales: 290, margin: 0.44, velocity: 74 },
    { sku: "Smartwater 1L", category: "Water", brand: "Smartwater", isSugar: false, baseSales: 320, margin: 0.48, velocity: 70 },
    { sku: "Dasani 20oz", category: "Water", brand: "Smartwater", isSugar: false, baseSales: 260, margin: 0.28, velocity: 82 }
  ];

  // Locked SKU is always determined by brandFocus
  let lockedSku = allPossibleSKUs.find(s => s.brand === brandFocus) || allPossibleSKUs[0];

  // Sort candidate SKUs according to optimization Focus
  let candidateSKUs = [...allPossibleSKUs];

  if (focus === "Low Sugar") {
    // Place all zero sugar / water items first
    candidateSKUs.sort((a, b) => {
      if (a.isSugar !== b.isSugar) {
        return a.isSugar ? 1 : -1; // sugar-free first
      }
      return b.baseSales - a.baseSales; // then higher sales
    });
  } else if (focus === "Maximize Margin") {
    // Sort by margin
    candidateSKUs.sort((a, b) => b.margin - a.margin);
  } else {
    // Fastest velocity
    candidateSKUs.sort((a, b) => b.velocity - a.velocity);
  }

  // Ensure the brandFocus locked SKU is always placed first and marked locked
  candidateSKUs = candidateSKUs.filter(s => s.sku !== lockedSku.sku);
  candidateSKUs.unshift(lockedSku);

  // Prune down to maxSkus count
  const selectedSKUs = candidateSKUs.slice(0, maxSkus);

  // Distribute shares (must sum to 100)
  // Before share represents a generic sub-optimal mix (e.g. mostly sugary drinks or scattered)
  // Let's calculate the share distributions
  const totalSlots = selectedSKUs.length;
  const skus: OptimizedSKURec[] = selectedSKUs.map((s, idx) => {
    // Share calculation
    const shareStep = 100 / totalSlots;
    const afterShare = Math.round(idx === 0 ? shareStep + (100 % totalSlots) : shareStep);

    // Mock generic "before share"
    let beforeShare = 15;
    if (s.sku.includes("Original") || s.sku.includes("Monster Energy")) {
      beforeShare = 35; // high sugar before
    } else if (s.sku.includes("Smartwater") || s.sku.includes("Zero")) {
      beforeShare = 5;  // neglected categories before
    }

    // Lift and sales impact based on optimization
    let lift = 10;
    if (focus === "Low Sugar" && !s.isSugar) lift += 12;
    if (focus === "Maximize Margin" && s.margin > 0.40) lift += 15;
    if (focus === "Fastest Velocity" && s.velocity > 75) lift += 10;

    const locked = s.sku === lockedSku.sku;
    const salesDelta = Math.round(s.baseSales * (lift / 100));

    return {
      sku: s.sku,
      beforeShare,
      afterShare,
      lift,
      locked,
      salesDelta
    };
  });

  // Calculate before and after scores out of 100
  const beforeScore = 52;
  const liftPercent = Math.round(skus.reduce((sum, s) => sum + s.lift, 0) / skus.length);
  const afterScore = beforeScore + Math.round(liftPercent * 0.8);

  const explanation = `Optimized SKU spacing by locking ${brandFocus} core anchors. Substituted sub-performing flavors to favor a ${focus} profile, yielding +${liftPercent}% overall display velocity.`;

  return {
    skus,
    beforeScore,
    afterScore,
    liftPercent,
    explanation
  };
}
