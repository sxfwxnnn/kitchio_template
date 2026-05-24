"use client";

interface DietaryFilterProps {
  selectedDietary: string | null;
  setSelectedDietary: (dietary: string | null) => void;
}

export default function DietaryFilter({
  selectedDietary,
  setSelectedDietary,
}: DietaryFilterProps) {
  
  const filters = [
    { value: null, label: "All Menu", emoji: "", activeClass: "bg-[#FF5C1A] text-white border-[#FF5C1A]" },
    { value: "vegan", label: "Vegan", emoji: "🌱", activeClass: "bg-emerald-500 text-white border-emerald-500" },
    { value: "vegetarian", label: "Vegetarian", emoji: "🥬", activeClass: "bg-emerald-500 text-white border-emerald-500" },
    { value: "gluten-free", label: "Gluten-Free", emoji: "🌾", activeClass: "bg-amber-500 text-white border-amber-500" },
    { value: "halal", label: "Halal", emoji: "🥩", activeClass: "bg-rose-500 text-white border-rose-500" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-3 lg:px-6 flex flex-wrap gap-2.5 items-center">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#717171] mr-1">
        DIETARY FILTERS:
      </span>
      {filters.map((filter) => {
        const isActive = selectedDietary === filter.value;
        return (
          <button
            key={filter.value || "all"}
            onClick={() => setSelectedDietary(filter.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer border flex items-center gap-1.5 select-none active:scale-95 shadow-sm ${
              isActive
                ? filter.activeClass
                : "bg-white border-[#E8E8E8] text-[#717171] hover:border-[#717171]/35 hover:text-[#1A1A1A]"
            }`}
          >
            {filter.emoji && <span>{filter.emoji}</span>}
            <span>{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
}
