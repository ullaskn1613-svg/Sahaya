/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Single Configuration File for Illustrative Demo Pricing (HACKNOVA-26 Judge Demonstration)
 *
 * NOTE: These are purely illustrative demo parameters for hackathon evaluation.
 * They are NOT live quotes. Actual ride prices in Bengaluru depend on real-time traffic,
 * peak-hour surge pricing, platform fees, night fares, waiting charges, and driver availability.
 */

export interface TransportModeConfig {
  id: 'bmtc' | 'auto' | 'bike_taxi' | 'cab';
  name: string;
  category: 'public_transit' | 'intermediate_transit' | 'micro_mobility' | 'private_hire';
  icon: string;
  isPublicTransit: boolean;
  whyChoose: string;
  carbonEmissionPerKmGrams: number; // for eco comparison
  // Live mode configuration
  liveStatus: {
    isConnected: boolean;
    providerName: string;
    statusText: string;
    fareDataAvailableText: string;
  };
  // Illustrative Demo Mode configuration
  demoParameters: {
    baseFareInr: number;
    baseKmIncluded: number;
    perKmRateInr: number;
    minimumFareInr: number;
    bookingFeeInr: number;
    averageSpeedKmh: number; // For traffic-adjusted time calculation in Bengaluru
    rateCardDescription: string;
  };
}

export const DEMO_PRICING_CONFIG: {
  disclaimer: {
    bannerTitle: string;
    bannerNotice: string;
    actualPriceNote: string;
    judgeExplanation: string;
  };
  modes: Record<'bmtc' | 'auto' | 'bike_taxi' | 'cab', TransportModeConfig>;
} = {
  disclaimer: {
    bannerTitle: 'ILLUSTRATIVE DEMO — NOT LIVE PRICES',
    bannerNotice:
      'Live ride-hail pricing requires supported provider API integration. The figures shown in Demo Comparison Mode are sample illustrative estimates based on standard Bengaluru rate cards for judge review and testing.',
    actualPriceNote:
      'Actual prices depend on road distance, live traffic, time of day, provider surge multipliers, tolls, and applicable platform charges.',
    judgeExplanation:
      'Sahaya compares public transport with alternative travel modes. Live fares require supported provider data; demo values are illustrative and are not real quotes.',
  },
  modes: {
    bmtc: {
      id: 'bmtc',
      name: 'BMTC Bus',
      category: 'public_transit',
      icon: 'Bus',
      isPublicTransit: true,
      whyChoose:
        'Most economical and sustainable transit in Bengaluru. Zero cost for women under Karnataka Shakti Scheme, with access to bus priority lanes along major corridors.',
      carbonEmissionPerKmGrams: 28, // Per passenger km on shared bus
      liveStatus: {
        isConnected: true, // Connected via GTFS stage fare table
        providerName: 'BMTC Official Stage Fare Table / GTFS',
        statusText: 'Verified BMTC stage fare schedule',
        fareDataAvailableText: 'Verified Fare Stages',
      },
      demoParameters: {
        baseFareInr: 6,
        baseKmIncluded: 2,
        perKmRateInr: 1.4,
        minimumFareInr: 6,
        bookingFeeInr: 0,
        averageSpeedKmh: 20, // 18-22 km/h corridor speed
        rateCardDescription: 'Official BMTC Stage Fare: ₹6 for Stage 1 up to ₹35 max for ordinary services.',
      },
    },
    auto: {
      id: 'auto',
      name: 'Auto-rickshaw',
      category: 'intermediate_transit',
      icon: 'Car',
      isPublicTransit: false,
      whyChoose:
        'Point-to-point last-mile connectivity without transfers. Maneuverable in tight Bengaluru cross streets.',
      carbonEmissionPerKmGrams: 85,
      liveStatus: {
        isConnected: false,
        providerName: 'Metered Auto / Mobility Aggregators',
        statusText: 'Live price unavailable — connect a supported pricing source.',
        fareDataAvailableText: 'Pricing Source Disconnected',
      },
      demoParameters: {
        baseFareInr: 30, // Official Karnataka Govt Auto Base (first 2 km)
        baseKmIncluded: 2.0,
        perKmRateInr: 15, // Standard ₹15/km post 2km
        minimumFareInr: 30,
        bookingFeeInr: 5,
        averageSpeedKmh: 24, // Typical auto city speed
        rateCardDescription:
          'Illustrative: Karnataka Govt prescribed auto meter minimum ₹30 (first 2km) + ₹15/km thereafter.',
      },
    },
    bike_taxi: {
      id: 'bike_taxi',
      name: 'Bike Taxi',
      category: 'micro_mobility',
      icon: 'Bike',
      isPublicTransit: false,
      whyChoose:
        'Fastest travel time in heavy peak-hour Bengaluru congestion for solo commuters. Highly cost-effective for short to mid-range trips.',
      carbonEmissionPerKmGrams: 55,
      liveStatus: {
        isConnected: false,
        providerName: 'Two-Wheeler Mobility Aggregators',
        statusText: 'Live price unavailable — connect a supported pricing source.',
        fareDataAvailableText: 'Pricing Source Disconnected',
      },
      demoParameters: {
        baseFareInr: 25,
        baseKmIncluded: 2.0,
        perKmRateInr: 10,
        minimumFareInr: 25,
        bookingFeeInr: 4,
        averageSpeedKmh: 28, // Highest speed due to filter capability
        rateCardDescription:
          'Illustrative: Base ₹25 (first 2km) + ₹10/km thereafter + platform access fee.',
      },
    },
    cab: {
      id: 'cab',
      name: 'Cab / Taxi',
      category: 'private_hire',
      icon: 'CarTaxi',
      isPublicTransit: false,
      whyChoose:
        'Maximum comfort with air conditioning and private cabin space. Best suited for groups, airport journeys, luggage, or monsoon downpours.',
      carbonEmissionPerKmGrams: 165,
      liveStatus: {
        isConnected: false,
        providerName: 'Four-Wheeler On-Demand Cab Aggregators',
        statusText: 'Live price unavailable — connect a supported pricing source.',
        fareDataAvailableText: 'Pricing Source Disconnected',
      },
      demoParameters: {
        baseFareInr: 100, // Hatchback / Sedan base
        baseKmIncluded: 4.0,
        perKmRateInr: 20,
        minimumFareInr: 100,
        bookingFeeInr: 25,
        averageSpeedKmh: 22, // Often delayed in traffic
        rateCardDescription:
          'Illustrative: City hatchback/sedan base ₹100 (first 4km) + ₹20/km + platform convenience fee.',
      },
    },
  },
};
