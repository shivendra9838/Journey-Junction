import { connectDB, CustomDestModel } from "@workspace/db";
import { DESTINATIONS } from "../src/data/destinations";
import { loadRootEnv } from "../src/lib/env";

async function seed() {
  loadRootEnv();
  console.log("Connecting to DB...");
  await connectDB();
  
  console.log(`Found ${DESTINATIONS.length} static destinations to seed.`);

  for (const dest of DESTINATIONS) {
    // Convert id to slug, since the static destinations use `id`
    const slug = dest.id;
    const stateSlug = dest.state.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const doc = {
      slug,
      name: dest.name,
      city: dest.name, // static ones don't have separate city, they use name as city
      state: dest.state,
      stateSlug,
      country: dest.country,
      region: dest.region,
      heroImage: dest.heroImage,
      images: dest.gallery || [],
      photos: dest.gallery || [],
      gallery: dest.gallery || [],
      tagline: dest.tagline,
      rating: dest.rating,
      reviewCount: dest.reviews,
      reviews: dest.reviews,
      climateLabel: dest.climateLabel,
      climate: dest.climateLabel,
      tags: dest.about?.tags || [],
      about: dest.about || "",
      isPublished: true,

      highlights: dest.highlights,
      activities: dest.activities,
      hotels: dest.hotels,
      flights: dest.flights,
      flightIntro: dest.flightIntro,
      flightTip: dest.flightTip,
      trains: dest.trains,
      trainIntro: dest.trainIntro,
      trainTip: dest.trainTip,
      transfers: dest.transfers,
      transferIntro: dest.transferIntro,
      transferTip: dest.transferTip,
      airportName: dest.airportName,
      airportCode: dest.airportCode,
      mapPoints: dest.mapPoints,
      weatherData: dest.weatherData,
      seasons: dest.seasons,
      reviewsData: dest.reviewsData,
      communityPhotos: dest.communityPhotos,
      quickAdds: dest.quickAdds,
      botReplies: dest.botReplies,
    };

    console.log(`Upserting ${doc.name}...`);
    await CustomDestModel.updateOne(
      { slug },
      { $set: doc },
      { upsert: true }
    );
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
