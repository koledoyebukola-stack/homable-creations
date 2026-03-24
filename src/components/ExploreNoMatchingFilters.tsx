/** Shown when explore scenes exist but none match the current room and/or price filters. */
export default function ExploreNoMatchingFilters() {
  return (
    <div className="text-center py-12 md:py-14 px-4 rounded-2xl border border-[#e5e5e5] bg-white max-w-xl mx-auto">
      <p className="text-[#111111] text-lg font-semibold mb-2">No rooms match these filters yet.</p>
      <p className="text-[#555555] text-sm leading-relaxed">
        Try another room type or budget. New home setups are added often, so check back soon if you do not see
        what you need today.
      </p>
    </div>
  );
}
