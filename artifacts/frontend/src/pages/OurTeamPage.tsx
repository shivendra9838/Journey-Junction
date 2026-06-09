import { motion } from "framer-motion";
import { Link } from "wouter";

const teamMembers = [
  {
    name: "Shivendra Tiwari",
    role: "Founder & CEO",
    description:
      "Visionary entrepreneur and travel enthusiast leading Journey Junction's mission to transform the way people discover, plan, and experience travel.",
    skills: ["Leadership", "Product Strategy", "Travel Innovation"],
    image: "/photo.png",
  },
  {
    name: "Shivendra Tiwari",
    role: "Product Manager",
    description:
      "Focused on building intuitive travel experiences, managing product development, and ensuring every feature delivers exceptional value to travelers.",
    skills: ["Product Development", "User Experience", "Innovation"],
    image: "/photo.png",
  },
  {
    name: "Shivendra Tiwari",
    role: "Travel Expert",
    description:
      "Researches destinations, travel trends, and unique experiences to help travelers create memorable journeys and personalized itineraries.",
    skills: ["Destination Research", "Travel Planning", "Local Insights"],
    image: "/photo.png",
  },
  {
    name: "Shivendra Tiwari",
    role: "Customer Support Lead",
    description:
      "Dedicated to helping travelers at every step of their journey by providing reliable assistance and ensuring a seamless experience.",
    skills: ["Customer Success", "Problem Solving", "Communication"],
    image: "/photo.png",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

function TeamCard({ member, index }: { member: (typeof teamMembers)[number]; index: number }) {
  return (
    <motion.article
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.24 }}
      variants={cardVariants}
      whileHover={{ y: -10, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_34px_90px_rgba(20,184,166,0.22)]"
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-teal-300 to-transparent" />
      <div className="relative overflow-hidden rounded-[20px] bg-slate-100">
        <img
          src={member.image}
          alt={`${member.name}, ${member.role}`}
          loading="lazy"
          className="h-60 w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-slate-900 shadow-lg backdrop-blur">
          {member.role}
        </span>
      </div>

      <div className="p-2 pt-5">
        <h3 className="text-xl font-black text-slate-950">{member.name}</h3>
        <p className="mt-3 min-h-[96px] text-sm leading-7 text-slate-600">{member.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {member.skills.map(skill => (
            <span
              key={skill}
              className="min-h-11 rounded-full border border-teal-100 bg-teal-50 px-3.5 py-2.5 text-xs font-bold text-teal-700"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export default function OurTeamPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
      <section className="relative px-5 py-6 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(20,184,166,0.16),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(79,70,229,0.12),transparent_28%),linear-gradient(180deg,#ffffff_0%,#F8FAFC_72%)]" />
        <div className="relative mx-auto max-w-7xl">
          <nav className="flex min-h-20 items-center justify-between">
            <Link href="/" className="flex min-h-20 min-w-20 items-center justify-center rounded-full p-1">
              <img src="/logo.png" alt="Journey Junction" className="h-20 w-20 rounded-full object-contain sm:h-24 sm:w-24" />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
            >
              Back Home
            </Link>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl pb-12 pt-16 text-center sm:pt-20 lg:pb-16"
          >
            <span className="inline-flex min-h-11 items-center rounded-full border border-teal-100 bg-white/80 px-5 text-sm font-black text-teal-700 shadow-sm backdrop-blur">
              👥 Meet The Team
            </span>
            <h1 className="mt-7 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              The People Behind Journey Junction
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#475569] sm:text-lg">
              Passionate about travel, technology, and creating unforgettable experiences for travelers around the world.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="relative px-5 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teamMembers.map((member, index) => (
            <TeamCard key={`${member.role}-${index}`} member={member} index={index} />
          ))}
        </div>
      </section>

      <section id="mission" className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
            className="rounded-[24px] border border-white/70 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
          >
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-600">Our Mission</p>
            <p className="mt-4 text-2xl font-black leading-snug text-slate-950">
              To make travel planning simple, personalized, and accessible through innovative technology and trusted travel experiences.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="rounded-[24px] border border-white/70 bg-gradient-to-br from-slate-950 to-slate-800 p-7 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
          >
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-300">Our Vision</p>
            <p className="mt-4 text-2xl font-black leading-snug">
              To become the most trusted travel companion for explorers worldwide.
            </p>
          </motion.div>
          <motion.div
            id="careers"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-7 shadow-[0_24px_70px_rgba(20,184,166,0.12)]"
          >
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Careers</p>
            <p className="mt-4 text-2xl font-black leading-snug text-slate-950">
              Build the future of travel with a team that cares about elegant products and real traveler joy.
            </p>
            <a
              href="mailto:careers@journeyjunction.com"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-teal-500 px-5 text-sm font-black text-white shadow-lg shadow-teal-500/20 transition hover:bg-teal-600"
            >
              careers@journeyjunction.com
            </a>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
