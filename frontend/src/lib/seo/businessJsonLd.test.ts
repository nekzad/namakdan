import { buildBusinessJsonLd } from "./businessJsonLd";

const business = {
  name: "Test Biz",
  logo: "",
  description: "",
  phone: "+15550001111",
  address: { street: "1 Main St", city: "Springfield" },
  operating_hours: [
    { day_of_week: 1, open_time: "09:00", close_time: "17:00", is_closed: false },
    { day_of_week: 2, open_time: "09:00", close_time: "17:00", is_closed: true },
  ],
} as any;

describe("buildBusinessJsonLd", () => {
  it("links the on-page menu and maps open days to OpeningHoursSpecification", () => {
    const ld = buildBusinessJsonLd(business, "test-biz", "https://example.test");
    expect(ld.hasMenu).toBe("https://example.test/b/test-biz#menu");
    expect(ld.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Monday",
        opens: "09:00",
        closes: "17:00",
      },
    ]);
  });

  it("falls back to the Namakdan OG image when the business has no logo", () => {
    const ld = buildBusinessJsonLd(business, "test-biz", "https://example.test");
    expect(ld.image).toBe("https://example.test/share-card.png");
  });

  it("prefers a banner image over the generic OG fallback (#864)", () => {
    const withBanner = {
      ...business,
      banner_images: JSON.stringify(["https://cdn.example/banner.jpg"]),
    };
    const ld = buildBusinessJsonLd(
      withBanner,
      "test-biz",
      "https://example.test",
    );
    expect(ld.image).toBe("https://cdn.example/banner.jpg");
  });

  it("self-canonicalizes Restaurant url on localized storefronts (#864)", () => {
    const ld = buildBusinessJsonLd(
      business,
      "parrilla-quebracho-azul",
      "https://example.test",
      { locale: "es" },
    );
    expect(ld.url).toBe("https://example.test/es/b/parrilla-quebracho-azul");
    expect(ld.hasMenu).toBe("https://example.test/es/b/parrilla-quebracho-azul#menu");
  });

  it("exposes a menu URL pointing at the menu tab alongside hasMenu", () => {
    const ld = buildBusinessJsonLd(business, "test-biz", "https://example.test");
    expect(ld.hasMenu).toBe("https://example.test/b/test-biz#menu");
    expect(ld.menu).toBe("https://example.test/b/test-biz?tab=menu");
    expect(ld.url).toBe("https://example.test/b/test-biz");
  });

  it("adds aggregateRating only when rating and review count are both known", () => {
    const rated = buildBusinessJsonLd(
      business,
      "test-biz",
      "https://example.test",
      { googleRating: { ratingValue: 4.7, reviewCount: 213 } },
    );
    expect(rated.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.7,
      reviewCount: 213,
    });

    const noCount = buildBusinessJsonLd(business, "test-biz", "https://example.test", {
      googleRating: { ratingValue: 4.7, reviewCount: 0 },
    });
    expect(noCount.aggregateRating).toBeUndefined();

    const none = buildBusinessJsonLd(business, "test-biz", "https://example.test");
    expect(none.aggregateRating).toBeUndefined();
  });

  it("emits acceptsReservations only when the flag is passed", () => {
    const withReservations = buildBusinessJsonLd(
      business,
      "test-biz",
      "https://example.test",
      { acceptsReservations: true },
    );
    expect(withReservations.acceptsReservations).toBe("True");

    const without = buildBusinessJsonLd(business, "test-biz", "https://example.test");
    expect(without.acceptsReservations).toBeUndefined();
  });

  it("emits potentialAction Order/Reserve actions only for known targets", () => {
    const ld = buildBusinessJsonLd(business, "test-biz", "https://example.test", {
      orderActionTarget: "https://example.test/b/test-biz?tab=menu",
      reserveActionTarget: "https://example.test/b/test-biz?tab=reservations",
    });
    const actions = ld.potentialAction as Array<Record<string, any>>;
    expect(actions).toHaveLength(2);
    expect(actions[0]["@type"]).toBe("OrderAction");
    expect(actions[0].target.urlTemplate).toContain("tab=menu");
    expect(actions[1]["@type"]).toBe("ReserveAction");
    expect(actions[1].target.urlTemplate).toContain("tab=reservations");

    const none = buildBusinessJsonLd(business, "test-biz", "https://example.test");
    expect(none.potentialAction).toBeUndefined();
  });
});
