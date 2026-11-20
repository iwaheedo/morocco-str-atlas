// Morocco short-term rental snapshot.
// All money values are Moroccan dirhams (MAD). Figures transcribed from AirROI's
// published market pages (updated 5 Nov 2026) and checked against the page text.
// Map coordinates are approximate town centres added by hand, not from AirROI.
window.STR_DATA = {
  meta: {
    snapshot: "18 Nov 2026",
    period: "Nov 2025 – Oct 2026",
    sourceUpdated: "5 Nov 2026",
    fallbackRates: { MAD: 1, GBP: 0.076447, USD: 0.100382, EUR: 0.091388 },
    fallbackRatesDate: "20 Nov 2026",
    links: {
      airroiRabat: "https://www.airroi.com/airbnb-data/morocco/rabat-sal%C3%A9-k%C3%A9nitra/rabat",
      airroiMorocco: "https://www.airroi.com/airbnb-data/morocco",
      airroiAtlas: "https://www.airroi.com/atlas/map?country-code=MA&state=Rabat%5C-Sal%C3%A9%5C-K%C3%A9nitra&city=Rabat",
      airroiApi: "https://www.airroi.com/api",
      airbticsRabat: "https://airbtics.com/annual-airbnb-revenue-in-rabat-morocco",
      airbticsApp: "https://app.airbtics.com/airbnb-data/morocco/0/rabata,%20morocco?market_id=129793&section=overview&tab=map",
      fx: "https://www.exchangerate-api.com"
    }
  },

  rabat: {
    kpi: {
      revenue: 85738, revenueYoY: 16.0, regionRevenue: 74123, moroccoRevenue: 107000,
      occupancy: 37.5, regionOccupancy: 36, moroccoOccupancy: 36,
      adr: 940, regionAdr: 900, moroccoAdr: 1140,
      revpar: 356,
      listings: 2030, listingsYoY: 68,
      leadTime: 24, stay: 5.6, bookingsPerListing: 17, totalBookings: 34700,
      rating: 4.74, guestFavorite: 29, superhosts: 42.7,
      medianMonthly: 9240, peakMonth: "July", lowMonth: "March"
    },

    // Second source, read from Airbtics' free public Rabat page.
    crossCheck: [
      { metric: "Active listings", airroi: "2,030", airbtics: "2,087", note: "Oct 2026 / 16 Oct 2026" },
      { metric: "Occupancy", airroi: "37.5%", airbtics: "51%", note: "AirROI: average of all active listings. Airbtics: median." },
      { metric: "Nightly rate", airroiMAD: 940, airbticsMAD: 799, note: "Average daily rate" },
      { metric: "Annual revenue per listing", airroiMAD: 85738, airbticsMAD: 151000, note: "AirROI: mean, including part-year listings. Airbtics: its headline figure." },
      { metric: "Period", airroi: "Nov 2025 – Oct 2026", airbtics: "Sep 2025 – Aug 2026", note: "" }
    ],

    // Latest 12 months, averages per listing active in that month.
    monthly: [
      { m: "Oct 2025", revenue: 11222, occ: 43.6, adr: 912,  revpar: 362, lead: 22, los: 4.9 },
      { m: "Nov 2025", revenue: 9695,  occ: 39.4, adr: 906,  revpar: 323, lead: 20, los: 5.0 },
      { m: "Dec 2025", revenue: 14845, occ: 45.2, adr: 1010, revpar: 479, lead: 41, los: 5.5 },
      { m: "Jan 2026", revenue: 11981, occ: 39.1, adr: 1044, revpar: 386, lead: 25, los: 4.5 },
      { m: "Feb 2026", revenue: 7326,  occ: 31.9, adr: 864,  revpar: 262, lead: 17, los: 4.6 },
      { m: "Mar 2026", revenue: 8171,  occ: 32.1, adr: 855,  revpar: 264, lead: 15, los: 4.6 },
      { m: "Apr 2026", revenue: 11108, occ: 41.2, adr: 881,  revpar: 370, lead: 20, los: 4.7 },
      { m: "May 2026", revenue: 11843, occ: 41.3, adr: 898,  revpar: 382, lead: 22, los: 5.1 },
      { m: "Jun 2026", revenue: 11228, occ: 40.7, adr: 909,  revpar: 374, lead: 20, los: 5.8 },
      { m: "Jul 2026", revenue: 16944, occ: 47.0, adr: 945,  revpar: 547, lead: 29, los: 8.2 },
      { m: "Aug 2026", revenue: 15270, occ: 48.0, adr: 951,  revpar: 493, lead: 29, los: 5.3 },
      { m: "Sep 2026", revenue: 11282, occ: 44.8, adr: 877,  revpar: 376, lead: 16, los: 4.4 }
    ],

    // Typical year: each calendar month averaged over the past two years.
    seasonality: [
      { m: "Jan", revenue: 12000, season: "Shoulder" },
      { m: "Feb", revenue: 7720,  season: "Low" },
      { m: "Mar", revenue: 7330,  season: "Low" },
      { m: "Apr", revenue: 10300, season: "Shoulder" },
      { m: "May", revenue: 10300, season: "Shoulder" },
      { m: "Jun", revenue: 10300, season: "Shoulder" },
      { m: "Jul", revenue: 15400, season: "High" },
      { m: "Aug", revenue: 14100, season: "High" },
      { m: "Sep", revenue: 10600, season: "Shoulder" },
      { m: "Oct", revenue: 11200, season: "Shoulder" },
      { m: "Nov", revenue: 9700,  season: "Low" },
      { m: "Dec", revenue: 14800, season: "High" }
    ],
    seasons: [
      { name: "High",     months: "Jul–Aug, Dec",           revenue: 14800, occ: 47, adr: 964 },
      { name: "Shoulder", months: "Jan, Apr–Jun, Sep–Oct",  revenue: 10800, occ: 42, adr: 920 },
      { name: "Low",      months: "Feb–Mar, Nov",           revenue: 8250,  occ: 37, adr: 870 }
    ],

    // Spread across listings. Revenue is per month for listings active in that month.
    spread: [
      { metric: "Monthly revenue", type: "money", p25: 4320, p50: 9240, p75: 15800, p90: 24000 },
      { metric: "Occupancy",       type: "pct",   p25: 19,   p50: 38,   p75: 62,    p90: 78 },
      { metric: "Nightly rate",    type: "money", p25: 535,  p50: 760,  p75: 1080,  p90: 1515 },
      { metric: "RevPAR",          type: "money", p25: 165,  p50: 299,  p75: 454,   p90: 650 }
    ],

    // Entire homes with a bedroom count on file (1,750 listings).
    bedrooms: [
      { size: "Studio",      listings: 227, share: 13.0, median: 52800,  avg: 65700,  adr: 639,  occ: 39 },
      { size: "1 bedroom",   listings: 618, share: 35.4, median: 67400,  avg: 81300,  adr: 791,  occ: 40 },
      { size: "2 bedrooms",  listings: 641, share: 36.7, median: 75500,  avg: 101000, adr: 1052, occ: 38 },
      { size: "3 bedrooms",  listings: 219, share: 12.5, median: 81600,  avg: 121000, adr: 1373, occ: 36 },
      { size: "4 bedrooms",  listings: 27,  share: 1.5,  median: 133000, avg: 179000, adr: 2460, occ: 35 },
      { size: "5+ bedrooms", listings: 16,  share: 0.9,  median: 195000, avg: 294000, adr: 6217, occ: 27 }
    ],

    // AirROI's running-cost model for a self-run Rabat listing, as shares of gross bookings.
    costs: {
      airbnbFee: 0.1367, cleaning: 0.0348, utilities: 0.05, supplies: 0.02, upkeep: 0.03,
      fixed: 1290 // short-term rental insurance MAD 860 + permit/registration MAD 430
    },

    roomTypes: [
      { label: "Entire home",  share: 86.8, n: 1762 },
      { label: "Private room", share: 13.1, n: 265 },
      { label: "Shared room",  share: 0.1,  n: 3 }
    ],
    propertyTypes: [
      { label: "Apartment / condo", share: 85.4, n: 1734 },
      { label: "House",             share: 8.1,  n: 164 },
      { label: "Hotel / boutique",  share: 4.3,  n: 88 },
      { label: "Unique stay",       share: 2.0,  n: 40 },
      { label: "Cabin / outdoor",   share: 0.1,  n: 2 },
      { label: "Other",             share: 0.1,  n: 2 }
    ],
    capacity: [
      { label: "1 guest",   share: 0.3,  n: 5 },
      { label: "2 guests",  share: 21.3, n: 381 },
      { label: "3 guests",  share: 15.4, n: 276 },
      { label: "4 guests",  share: 27.9, n: 498 },
      { label: "5 guests",  share: 13.8, n: 247 },
      { label: "6 guests",  share: 13.9, n: 248 },
      { label: "7 guests",  share: 3.0,  n: 54 },
      { label: "8+ guests", share: 4.4,  n: 79 }
    ],
    minStay: [
      { label: "1 night",     share: 51, n: 1033 },
      { label: "2 nights",    share: 34, n: 698 },
      { label: "3 nights",    share: 9,  n: 181 },
      { label: "4–6 nights",  share: 5,  n: 96 },
      { label: "7–29 nights", share: 1,  n: 21 },
      { label: "30+ nights",  share: 0.05, n: 1 }
    ],
    cancellation: [
      { label: "Flexible", share: 40, n: 814 },
      { label: "Moderate", share: 26, n: 525 },
      { label: "Limited",  share: 10, n: 196 },
      { label: "Firm",     share: 22, n: 442 },
      { label: "Strict",   share: 3,  n: 52 }
    ],
    openDays: [
      { label: "271–366 days", share: 57.2, n: 1161 },
      { label: "181–270 days", share: 27.9, n: 567 },
      { label: "91–180 days",  share: 13.3, n: 270 },
      { label: "31–90 days",   share: 1.6,  n: 32 }
    ],
    bookedDays: [
      { label: "271–366 days", share: 1.9,  n: 38 },
      { label: "181–270 days", share: 13.6, n: 276 },
      { label: "91–180 days",  share: 28.7, n: 583 },
      { label: "31–90 days",   share: 29.2, n: 592 },
      { label: "1–30 days",    share: 26.7, n: 541 }
    ],
    amenities: [
      { label: "Kitchen", share: 94 }, { label: "TV", share: 91 }, { label: "Hot water", share: 83 },
      { label: "Washer", share: 81 }, { label: "Cooking basics", share: 74 },
      { label: "Dishes and silverware", share: 70 }, { label: "Refrigerator", share: 69 },
      { label: "Bed linens", share: 69 }, { label: "Air conditioning", share: 67 }
    ],
    amenityGap: [
      { label: "Air conditioning",   have: 67,  withRev: 106000, withoutRev: 44400, gap: 139 },
      { label: "Gym",                have: 5,   withRev: 173000, withoutRev: 81300, gap: 113 },
      { label: "Pool view",          have: 0.7, withRev: 180000, withoutRev: 85000, gap: 111 },
      { label: "Pool",               have: 7,   withRev: 162000, withoutRev: 80200, gap: 102 },
      { label: "Outdoor playground", have: 3,   withRev: 165000, withoutRev: 83200, gap: 98 },
      { label: "Sun loungers",       have: 2,   withRev: 157000, withoutRev: 83900, gap: 87 },
      { label: "Fire pit",           have: 1,   withRev: 158000, withoutRev: 84700, gap: 86 },
      { label: "Resort access",      have: 1,   withRev: 154000, withoutRev: 85000, gap: 81 },
      { label: "Outdoor furniture",  have: 17,  withRev: 132000, withoutRev: 76400, gap: 73 },
      { label: "Ocean view",         have: 2,   withRev: 145000, withoutRev: 84300, gap: 72 }
    ],
    cleaning: { median: 157, average: 186, charging: 63.3 },
    hostStats: { superhosts: 42.7, cohosted: 33.6, instantBook: 27.8, simplifiedPricing: 85.3, exactLocation: 46 },

    guestCountries: [
      { label: "France", share: 37.5 }, { label: "Morocco", share: 11.9 }, { label: "United States", share: 7.1 },
      { label: "United Kingdom", share: 6.8 }, { label: "Germany", share: 5.7 }
    ],
    guestLanguages: [
      { label: "English", share: 33.8 }, { label: "French", share: 26.6 }, { label: "Arabic", share: 15.5 },
      { label: "Spanish", share: 8.4 }, { label: "German", share: 4.7 }
    ],
    ratings: [
      { label: "Communication", score: 4.85 }, { label: "Check-in", score: 4.82 }, { label: "Location", score: 4.81 },
      { label: "Accuracy", score: 4.75 }, { label: "Cleanliness", score: 4.72 }, { label: "Value", score: 4.66 }
    ],
    areas: ["Agdal", "Old Medina", "Hay Riad", "Chellah", "L'Océan", "Rabat Ville", "Boulevard Mohammed V"],

    topListings: [
      { name: "Dar Rabiaa: Authentic Riad with Pool",                 beds: 6, rating: 4.87, revenue: 1010000, occ: 54.7, adr: 5110 },
      { name: "Authentic and Luxurious Riad Center Medina Rabat",     beds: 7, rating: 4.90, revenue: 708146,  occ: 44.0, adr: 6157 },
      { name: "Peaceful Villa with Garden in Hay Riad",               beds: 4, rating: 4.78, revenue: 596938,  occ: 73.5, adr: 2149 },
      { name: "Luxury Apartment with a Stunning Sea View • Rabat",    beds: 2, rating: 5.00, revenue: 592783,  occ: 59.1, adr: 3340 },
      { name: "Cozy Ryad in the heart of the Medina",                 beds: 5, rating: 4.70, revenue: 536383,  occ: 49.0, adr: 2972 },
      { name: "Agdal Center · 4 BR with Terrace, BBQ & Pool Table",   beds: 4, rating: 4.83, revenue: 498696,  occ: 56.0, adr: 2302 }
    ],
    topHosts: [
      { name: "Goodmove",            listings: 32, revenue: 5763172, per: 180099, rating: 4.75 },
      { name: "Yann",                listings: 40, revenue: 4256995, per: 106425, rating: 4.82 },
      { name: "Tarik",               listings: 48, revenue: 4183334, per: 87153,  rating: 4.60 },
      { name: "Mehdi",               listings: 9,  revenue: 2093444, per: 232605, rating: 4.64 },
      { name: "Anas YourPlace",      listings: 9,  revenue: 1985919, per: 220658, rating: 4.67 },
      { name: "Mohammed Amine",      listings: 7,  revenue: 1946095, per: 278014, rating: 4.95 },
      { name: "Tiguemmi Properties", listings: 17, revenue: 1846206, per: 108600, rating: 4.70 },
      { name: "Jamel",               listings: 16, revenue: 1723068, per: 107692, rating: 4.75 },
      { name: "Hicham",              listings: 9,  revenue: 1569861, per: 174429, rating: 4.80 },
      { name: "Othmane",             listings: 10, revenue: 1307713, per: 130771, rating: 4.76 }
    ]
  },

  morocco: {
    totals: { markets: 139, ranked: 53, listings: 42600, revenue: 107000, occupancy: 36, adr: 1140, typicalChange: 6 },
    // rank = AirROI's blended ranking of the 53 markets with 100+ listings. slow = weakest
    // month's revenue as % of the best month. yoy = change in revenue per listing (null = no
    // comparable year). km = distance from Rabat where AirROI lists the market as nearby.
    markets: [
      { rank: 1,  name: "Marrakesh",        region: "Marrakech-Safi",             revenue: 164193, occ: 40, adr: 1535, slow: 66, yoy: 1,    listings: 11901, lat: 31.630, lng: -7.990 },
      { rank: 2,  name: "Taghazout",        region: "Souss-Massa",                revenue: 139899, occ: 45, adr: 1056, slow: 48, yoy: 16,   listings: 674,   lat: 30.545, lng: -9.709 },
      { rank: 3,  name: "Essaouira",        region: "Marrakech-Safi",             revenue: 124322, occ: 39, adr: 1098, slow: 50, yoy: 10,   listings: 1872,  lat: 31.513, lng: -9.770 },
      { rank: 4,  name: "Rabat",            region: "Rabat-Salé-Kénitra",         revenue: 85738,  occ: 38, adr: 940,  slow: 48, yoy: 16,   listings: 2030,  lat: 34.013, lng: -6.840, km: 0 },
      { rank: 5,  name: "Mechouar Kasbah",  region: "Marrakech-Safi",             revenue: 223749, occ: 37, adr: 2312, slow: 58, yoy: 8,    listings: 284,   lat: 31.612, lng: -7.988 },
      { rank: 6,  name: "Aourir",           region: "Souss-Massa",                revenue: 94290,  occ: 38, adr: 939,  slow: 39, yoy: 13,   listings: 671,   lat: 30.492, lng: -9.635 },
      { rank: 7,  name: "Agadir",           region: "Souss-Massa",                revenue: 86358,  occ: 39, adr: 832,  slow: 45, yoy: 6,    listings: 2763,  lat: 30.421, lng: -9.583 },
      { rank: 8,  name: "Tassoultante",     region: "Marrakech-Safi",             revenue: 305582, occ: 35, adr: 2963, slow: 40, yoy: 9,    listings: 377,   lat: 31.560, lng: -7.960 },
      { rank: 9,  name: "Al Ouidane",       region: "Marrakech-Safi",             revenue: 538447, occ: 37, adr: 5094, slow: 45, yoy: 5,    listings: 234,   lat: 31.660, lng: -7.870 },
      { rank: 10, name: "Tangier",          region: "Tanger-Tétouan-Al Hoceïma",  revenue: 87404,  occ: 36, adr: 974,  slow: 31, yoy: 4,    listings: 3951,  lat: 35.767, lng: -5.800 },
      { rank: 11, name: "Tamraght",         region: "Souss-Massa",                revenue: 69450,  occ: 42, adr: 635,  slow: 42, yoy: null, listings: 436,   lat: 30.512, lng: -9.678 },
      { rank: 12, name: "Casablanca",       region: "Casablanca-Settat",          revenue: 63008,  occ: 35, adr: 754,  slow: 54, yoy: null, listings: 3446,  lat: 33.573, lng: -7.590 },
      { rank: 13, name: "Sidi Belyout (Casablanca)", region: "Casablanca-Settat", revenue: 74577,  occ: 34, adr: 823,  slow: 58, yoy: -2,   listings: 358,   lat: 33.597, lng: -7.615 },
      { rank: 14, name: "Fez",              region: "Fès-Meknès",                 revenue: 66867,  occ: 31, adr: 753,  slow: 61, yoy: 19,   listings: 715,   lat: 34.034, lng: -5.000 },
      { rank: 15, name: "Cabo Negro",       region: "Tanger-Tétouan-Al Hoceïma",  revenue: 87987,  occ: 41, adr: 1127, slow: 12, yoy: null, listings: 235,   lat: 35.668, lng: -5.290 },
      { rank: 16, name: "Salé",             region: "Rabat-Salé-Kénitra",         revenue: 60019,  occ: 35, adr: 751,  slow: 45, yoy: 23,   listings: 308,   lat: 34.053, lng: -6.798, km: 8 },
      { rank: 17, name: "Tamri",            region: "Souss-Massa",                revenue: 87025,  occ: 33, adr: 937,  slow: 32, yoy: 18,   listings: 170,   lat: 30.700, lng: -9.830 },
      { rank: 18, name: "Mohammedia",       region: "Casablanca-Settat",          revenue: 53198,  occ: 35, adr: 739,  slow: 34, yoy: 14,   listings: 366,   lat: 33.687, lng: -7.383 },
      { rank: 19, name: "Sidi Kaouki",      region: "Marrakech-Safi",             revenue: 118483, occ: 32, adr: 1298, slow: 38, yoy: 0,    listings: 187,   lat: 31.353, lng: -9.795 },
      { rank: 20, name: "Tamaris",          region: "Casablanca-Settat",          revenue: 70995,  occ: 36, adr: 1078, slow: 28, yoy: null, listings: 129,   lat: 33.527, lng: -7.840 },
      { rank: 21, name: "Anfa (Casablanca)", region: "Casablanca-Settat",         revenue: 67052,  occ: 32, adr: 836,  slow: 47, yoy: -4,   listings: 275,   lat: 33.588, lng: -7.655 },
      { rank: 22, name: "M'diq",            region: "Tanger-Tétouan-Al Hoceïma",  revenue: 62481,  occ: 35, adr: 1041, slow: 16, yoy: 0,    listings: 446,   lat: 35.685, lng: -5.325 },
      { rank: 23, name: "Martil",           region: "Tanger-Tétouan-Al Hoceïma",  revenue: 45738,  occ: 38, adr: 687,  slow: 20, yoy: 1,    listings: 838,   lat: 35.617, lng: -5.275 },
      { rank: 24, name: "Temara",           region: "Rabat-Salé-Kénitra",         revenue: 59510,  occ: 34, adr: 893,  slow: 32, yoy: null, listings: 297,   lat: 33.928, lng: -6.907, km: 12 },
      { rank: 25, name: "Fes (second AirROI entry)", region: "Fès-Meknès",        revenue: 47635,  occ: 32, adr: 694,  slow: 45, yoy: null, listings: 600,   lat: 34.060, lng: -4.975 },
      { rank: 26, name: "Mirleft",          region: "Guelmim-Oued Noun",          revenue: 66682,  occ: 32, adr: 760,  slow: 42, yoy: 10,   listings: 211,   lat: 29.580, lng: -10.040 },
      { rank: 27, name: "Imsouane",         region: "Souss-Massa",                revenue: 53596,  occ: 32, adr: 651,  slow: 61, yoy: -1,   listings: 327,   lat: 30.840, lng: -9.820 },
      { rank: 28, name: "Asilah",           region: "Tanger-Tétouan-Al Hoceïma",  revenue: 66988,  occ: 31, adr: 892,  slow: 25, yoy: 20,   listings: 238,   lat: 35.465, lng: -6.035 },
      { rank: 29, name: "Hay Hassani (Casablanca)", region: "Casablanca-Settat",  revenue: 62869,  occ: 33, adr: 786,  slow: 50, yoy: -7,   listings: 156,   lat: 33.560, lng: -7.680 },
      { rank: 30, name: "Kenitra",          region: "Rabat-Salé-Kénitra",         revenue: 42027,  occ: 33, adr: 627,  slow: 41, yoy: null, listings: 416,   lat: 34.261, lng: -6.580 },
      { rank: 31, name: "Taroudant",        region: "Souss-Massa",                revenue: 84572,  occ: 29, adr: 1191, slow: 41, yoy: 1,    listings: 132,   lat: 30.470, lng: -8.877 },
      { rank: 32, name: "Bouznika",         region: "Casablanca-Settat",          revenue: 61490,  occ: 31, adr: 1025, slow: 26, yoy: null, listings: 327,   lat: 33.789, lng: -7.160 },
      { rank: 33, name: "Tétouan",          region: "Tanger-Tétouan-Al Hoceïma",  revenue: 50458,  occ: 33, adr: 674,  slow: 30, yoy: 0,    listings: 328,   lat: 35.578, lng: -5.368 },
      { rank: 34, name: "Dar Bouazza",      region: "Casablanca-Settat",          revenue: 71365,  occ: 29, adr: 1333, slow: 27, yoy: 9,    listings: 129,   lat: 33.515, lng: -7.815 },
      { rank: 35, name: "Anza",             region: "Souss-Massa",                revenue: 47201,  occ: 36, adr: 571,  slow: 31, yoy: null, listings: 108,   lat: 30.447, lng: -9.655 },
      { rank: 36, name: "Skhirat",          region: "Rabat-Salé-Kénitra",         revenue: 67802,  occ: 30, adr: 1238, slow: 21, yoy: 6,    listings: 132,   lat: 33.853, lng: -7.030, km: 24 },
      { rank: 37, name: "Allyene",          region: "Tanger-Tétouan-Al Hoceïma",  revenue: 75419,  occ: 32, adr: 1553, slow: 12, yoy: -9,   listings: 118,   lat: 35.755, lng: -5.345 },
      { rank: 38, name: "Nador",            region: "Oriental",                   revenue: 45211,  occ: 34, adr: 663,  slow: 25, yoy: 8,    listings: 210,   lat: 35.168, lng: -2.933 },
      { rank: 39, name: "Fnideq",           region: "Tanger-Tétouan-Al Hoceïma",  revenue: 52078,  occ: 33, adr: 1057, slow: 11, yoy: 11,   listings: 189,   lat: 35.849, lng: -5.357 },
      { rank: 40, name: "El Mansouria",     region: "Casablanca-Settat",          revenue: 40889,  occ: 32, adr: 817,  slow: 26, yoy: 22,   listings: 247,   lat: 33.748, lng: -7.300 },
      { rank: 41, name: "Meknes",           region: "Fès-Meknès",                 revenue: 37659,  occ: 29, adr: 590,  slow: 47, yoy: 21,   listings: 265,   lat: 33.895, lng: -5.555 },
      { rank: 42, name: "Cherrat",          region: "Casablanca-Settat",          revenue: 79371,  occ: 28, adr: 1426, slow: 22, yoy: 5,    listings: 102,   lat: 33.820, lng: -7.105, km: 34 },
      { rank: 43, name: "Ifrane",           region: "Fès-Meknès",                 revenue: 45127,  occ: 26, adr: 861,  slow: 52, yoy: 23,   listings: 115,   lat: 33.527, lng: -5.110 },
      { rank: 44, name: "Chefchaouen",      region: "Tanger-Tétouan-Al Hoceïma",  revenue: 44489,  occ: 26, adr: 696,  slow: 47, yoy: -6,   listings: 335,   lat: 35.169, lng: -5.264 },
      { rank: 45, name: "Saïdia",           region: "Oriental",                   revenue: 36363,  occ: 34, adr: 867,  slow: 18, yoy: -6,   listings: 406,   lat: 35.085, lng: -2.240 },
      { rank: 46, name: "Al Hoceima",       region: "Tanger-Tétouan-Al Hoceïma",  revenue: 33438,  occ: 33, adr: 704,  slow: 15, yoy: 21,   listings: 294,   lat: 35.251, lng: -3.937 },
      { rank: 47, name: "El Jadida",        region: "Casablanca-Settat",          revenue: 37659,  occ: 30, adr: 591,  slow: 33, yoy: 18,   listings: 199,   lat: 33.254, lng: -8.506 },
      { rank: 48, name: "Ouarzazate",       region: "Drâa-Tafilalet",             revenue: 45664,  occ: 29, adr: 652,  slow: 55, yoy: -9,   listings: 101,   lat: 30.920, lng: -6.893 },
      { rank: 49, name: "Nouaceur",         region: "Casablanca-Settat",          revenue: 44526,  occ: 29, adr: 652,  slow: 39, yoy: 6,    listings: 123,   lat: 33.367, lng: -7.583 },
      { rank: 50, name: "Assilah (second AirROI entry)", region: "Tanger-Tétouan-Al Hoceïma", revenue: 41175, occ: 34, adr: 777, slow: 5, yoy: null, listings: 127, lat: 35.478, lng: -6.020 },
      { rank: 51, name: "Oued Laou",        region: "Tanger-Tétouan-Al Hoceïma",  revenue: 35002,  occ: 34, adr: 695,  slow: 17, yoy: 6,    listings: 108,   lat: 35.448, lng: -5.093 },
      { rank: 52, name: "Oujda",            region: "Oriental",                   revenue: 38455,  occ: 29, adr: 606,  slow: 32, yoy: -7,   listings: 173,   lat: 34.681, lng: -1.908 },
      { rank: 53, name: "Sidi Rahal Chatai", region: "Casablanca-Settat",         revenue: 33697,  occ: 30, adr: 952,  slow: 20, yoy: -13,  listings: 192,   lat: 33.472, lng: -7.965 },
      // Under 100 listings, so unranked. From AirROI's "nearby markets" table on the Rabat page.
      { rank: null, name: "Harhoura",       region: "Rabat-Salé-Kénitra",         revenue: 102277, occ: 33, adr: 1170, slow: null, yoy: null, listings: 98,  lat: 33.930, lng: -6.960, km: 14 },
      { rank: null, name: "Bouknadel",      region: "Rabat-Salé-Kénitra",         revenue: 72559,  occ: 35, adr: 1116, slow: null, yoy: null, listings: 57,  lat: 34.125, lng: -6.737, km: 19 },
      { rank: null, name: "Ameur",          region: "Rabat-Salé-Kénitra",         revenue: 87978,  occ: 32, adr: 1362, slow: null, yoy: null, listings: 51,  lat: 34.090, lng: -6.700, km: 19 },
      { rank: null, name: "Mehdya",         region: "Rabat-Salé-Kénitra",         revenue: 46867,  occ: 28, adr: 725,  slow: null, yoy: null, listings: 83,  lat: 34.257, lng: -6.650, km: 32 }
    ]
  }
};
