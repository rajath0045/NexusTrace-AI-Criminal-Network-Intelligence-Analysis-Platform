"use client";

import Link from "next/link";
import { TrianglesFallingBackground } from "@/features/hero";

export default function HomePage() {
  return (
    <main className="nexus-minimal-hero">
      {/* Black & Blue 3D Falling Triangles Background */}
      <TrianglesFallingBackground />

      {/* Focused Hero Content: Only Heading, Description, and CTA */}
      <section className="nexus-hero-content" aria-labelledby="product-title">
        <h1 id="product-title" className="nexus-hero-title">
          NexusAI
        </h1>
        <p className="nexus-hero-description">
          A unified environment for tracing people, cases, evidence, and verified
          relationships across complex investigations and international criminal networks.
        </p>
        <Link className="nexus-hero-cta" href="/login">
          Enter workspace
        </Link>
      </section>
    </main>
  );
}
