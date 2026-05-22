import { MenuCategory, MenuItem } from "@/types";
import ItemCard from "@/components/ItemCard";

interface MenuSectionProps {
  category: MenuCategory;
  isOpen: boolean;
  onOpenModal: (item: MenuItem) => void;
  isActive: boolean;
}

export default function MenuSection({
  category,
  isOpen,
  onOpenModal,
  isActive,
}: MenuSectionProps) {
  return (
    <section id={`category-${category.id}`} className="scroll-mt-28">
      {/* Category Header */}
      <div className="mb-4 border-b border-[#E8E8E8] pb-3 flex items-center gap-2">
        <h2 className="text-xl font-bold text-[#1A1A1A] md:text-2xl">
          {category.name}
        </h2>
        {isActive && (
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-950 animate-flash-dot shadow-[0_0_8px_rgba(0,0,0,0.15)] shrink-0"
            title="Active Category"
          />
        )}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {category.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isOpen={isOpen}
            onOpenModal={onOpenModal}
          />
        ))}
      </div>
    </section>
  );
}
