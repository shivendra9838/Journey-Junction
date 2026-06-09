import mongoose from "mongoose";
import { PhaseDestinationModel } from "@workspace/db/src/schema/phase1";
import { TravelPackageModel } from "@workspace/db/src/schema/phase2";
import { connectDB } from "@workspace/db";
import { loadRootEnv } from "./lib/env";

async function run() {
  loadRootEnv();
  await connectDB();
  
  let dummyDest = await PhaseDestinationModel.findOne();
  if (!dummyDest) {
    console.log("Creating dummy destination for package...");
    await mongoose.connection.collection('phasedestinations').insertOne({
      slug: "goa",
      name: "Goa",
      state: "Goa",
      stateSlug: "goa",
      region: "West India",
      country: "India",
      tagline: "Beaches",
      about: "About",
      description: "A beautiful place",
      heroImage: "/images/unsplash-451710d2942a.jpg",
      isPublished: true,
      images: [],
    });
    dummyDest = await PhaseDestinationModel.findOne();
  }

  if (!dummyDest) {
    console.log("No destination found, cannot seed packages.");
    process.exit(1);
  }

  const existingPackages = await TravelPackageModel.countDocuments();
  if (existingPackages === 0) {
    console.log("Seeding travel packages...");
    
    const packagesToSeed = [
      {
        title: "Goa Beach Retreat",
        slug: "goa-beach-retreat",
        destinationId: dummyDest._id,
        duration: "5 Days / 4 Nights",
        price: 25000,
        discountPrice: 20000,
        rating: 4.8,
        coverImage: "/images/unsplash-451710d2942a.jpg",
        gallery: [],
        description: "Experience the ultimate beach getaway in Goa.",
        highlights: ["Beachfront stay", "Water sports", "Nightlife tour"],
        included: ["Accommodation", "Breakfast", "Airport transfer"],
        excluded: ["Flights", "Personal expenses"],
        maxTravellers: 20,
        availableSeats: 15,
        category: "leisure",
        featured: true,
        status: "published" as const,
        viewCount: 120,
        bookingCount: 5,
      },
      {
        title: "Goa Adventure Escape",
        slug: "goa-adventure-escape",
        destinationId: dummyDest._id,
        duration: "3 Days / 2 Nights",
        price: 15000,
        discountPrice: 12000,
        rating: 4.5,
        coverImage: "/images/unsplash-88294ae03d7b.jpg",
        gallery: [],
        description: "Thrilling adventure activities in the heart of Goa.",
        highlights: ["Scuba diving", "Trekking", "Spice plantation tour"],
        included: ["Accommodation", "All meals", "Activity passes"],
        excluded: ["Flights", "Insurance"],
        maxTravellers: 10,
        availableSeats: 8,
        category: "adventure",
        featured: false,
        status: "published" as const,
        viewCount: 45,
        bookingCount: 2,
      },
      {
        title: "Goa Heritage Tour",
        slug: "goa-heritage-tour",
        destinationId: dummyDest._id,
        duration: "4 Days / 3 Nights",
        price: 18000,
        discountPrice: 15000,
        rating: 4.9,
        coverImage: "/images/unsplash-7ad0e26a32dc.jpg",
        gallery: [],
        description: "Discover the rich history and culture of Old Goa.",
        highlights: ["Church tour", "Museum visits", "Authentic cuisine"],
        included: ["Accommodation", "Guided tours", "Breakfast"],
        excluded: ["Flights", "Dinner"],
        maxTravellers: 15,
        availableSeats: 12,
        category: "culture",
        featured: true,
        status: "published" as const,
        viewCount: 300,
        bookingCount: 15,
      }
    ];

    await TravelPackageModel.insertMany(packagesToSeed);
    console.log("Successfully seeded travel packages.");
  } else {
    console.log(`Packages already exist (${existingPackages}).`);
  }

  process.exit(0);
}

run().catch(console.error);
