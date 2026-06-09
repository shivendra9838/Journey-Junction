import mongoose from "mongoose";
import { UserAccountModel, PhaseDestinationModel, PhaseReviewModel } from "@workspace/db/src/schema/phase1";
import { connectDB } from "@workspace/db";
import { loadRootEnv } from "./lib/env";

async function run() {
  loadRootEnv();
  await connectDB();
  
  let dummyUser = await UserAccountModel.findOne({ role: "admin" }) || await UserAccountModel.findOne();
  if (!dummyUser) {
    console.log("Creating dummy user...");
    dummyUser = await UserAccountModel.create({
      email: "traveller@wandr.com",
      password: "dummy",
      role: "user",
      name: "Happy Traveller",
    });
  }

  let dummyDest = await PhaseDestinationModel.findOne();
  if (!dummyDest) {
    console.log("Creating dummy destination...");
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

  const moments = [
    { user: "Aarav Sharma", destination: "Goa", image: "/images/unsplash-451710d2942a.jpg", tag: "Beach", reviewText: "Absolutely magical experience! The sunsets were breathtaking and the local food was divine. Highly recommend this destination to anyone looking for a perfect getaway." },
    { user: "Meera Iyer", destination: "Kerala", image: "/images/unsplash-88294ae03d7b.jpg", tag: "Backwaters", reviewText: "The backwaters are serene and peaceful. A completely rejuvenating trip." },
    { user: "Riya Kapoor", destination: "Kashmir", image: "/images/unsplash-67cfe84b31d8.png", tag: "Mountains", reviewText: "Paradise on Earth! The mountains, the lakes, everything is just perfect." },
    { user: "Kabir Khan", destination: "Rajasthan", image: "/images/unsplash-7ad0e26a32dc.jpg", tag: "Heritage", reviewText: "Rich heritage and culture. The forts are majestic and the desert camp was an unforgettable experience." },
    { user: "Nisha Rao", destination: "Rishikesh", image: "/images/unsplash-43236e822084.jpg", tag: "Adventure", reviewText: "Thrilling adventure sports and peaceful ashrams. A perfect blend!" },
  ];

  for (const m of moments) {
    let dest = await PhaseDestinationModel.findOne({ name: new RegExp(m.destination, "i") });
    if (!dest) {
       dest = await PhaseDestinationModel.findOne();
    }
    if (!dest) {
      console.log("No destinations found in DB.");
      continue;
    }

    await PhaseReviewModel.create({
      userId: dummyUser._id,
      destinationId: dest._id,
      rating: 5,
      title: m.tag,
      review: m.reviewText,
      images: [m.image],
      status: "approved",
      isFeatured: true
    } as any);
  }
  console.log("Seeding complete");
  process.exit(0);
}

run().catch(console.error);
