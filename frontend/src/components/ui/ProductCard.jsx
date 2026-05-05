import React, { useState } from "react";
import { Heart, Eye, ShoppingCart, Sparkles } from "lucide-react";

const ProductCard = ({
  image,
  title,
  tags = [],
  description,
  price,
  onAddToCart,
  onViewDetails,
  onOpenStudio,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const formattedPrice = `Rs. ${Number(price || 0).toLocaleString("en-PK")}`;

  return (
    <article
      className="group w-full h-full rounded-2xl border border-borderColor/70 bg-black overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-focusRingColor cursor-pointer"
      onClick={onViewDetails}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && onViewDetails) {
          event.preventDefault();
          onViewDetails();
        }
      }}
      role={onViewDetails ? "button" : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
      aria-label={onViewDetails ? `Open ${title} details` : undefined}
    >
      <div className="relative bg-black p-4">
        <div className="h-[220px] rounded-xl bg-backgroundColor/70 border border-borderColor/40 flex items-center justify-center overflow-hidden">
          {!imageFailed && image ? (
            <img
              src={image}
              alt={title}
              onError={() => setImageFailed(true)}
              className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-black flex flex-col items-center justify-center p-4">
              <span className="text-primaryColor text-2xl mb-2">✦</span>
              <p className="text-textColorMuted text-xs text-center line-clamp-2">
                {title || "Product image unavailable"}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-6 right-6 h-9 w-9 inline-flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            size={16}
            className={`transition-colors ${isFavorite ? "fill-primaryColor text-primaryColor" : "text-white/90"}`}
          />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-textColorMain text-lg font-semibold leading-tight line-clamp-1" title={title}>
            {title}
          </h3>
          <p className="mt-2 text-textColorMuted text-sm leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>

        {!!tags.length && (
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2.5 py-1 rounded-full bg-primaryColor/10 text-primaryColor border border-primaryColor/20 text-[11px] font-medium uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-textColorMuted">Price</p>
            <p className="text-2xl font-bold text-textColorMain mt-1">{formattedPrice}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {onViewDetails ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onViewDetails();
              }}
              className="h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-borderColor text-textColorMain hover:bg-backgroundColor transition-colors text-sm font-medium"
              aria-label={`View ${title} details`}
            >
              <Eye size={16} />
              Details
            </button>
          ) : (
            <div />
          )}
          {onOpenStudio ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onOpenStudio();
              }}
              className="h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-primaryColor/40 text-primaryColor hover:bg-primaryColor/10 transition-colors text-sm font-medium"
              aria-label={`Open ${title} in studio`}
            >
              <Sparkles size={16} />
              Studio
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart();
            }}
            className="h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primaryColor text-black hover:opacity-90 transition text-sm font-semibold"
            aria-label={`Add ${title} to cart`}
          >
            <ShoppingCart size={16} />
            Add
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;