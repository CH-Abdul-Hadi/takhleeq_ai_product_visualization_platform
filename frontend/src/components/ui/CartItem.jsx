import React from "react";
import { Minus, Plus, X } from "lucide-react";

const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  const unitPrice = Number(item.price || 0);
  const formattedPrice = `Rs. ${unitPrice.toLocaleString("en-PK")}`;

  return (
    <div className="flex gap-4 p-4 border-b border-borderColor last:border-b-0">
      {/* Product Image */}
      <div className="w-20 h-20 bg-black border border-borderColor rounded-lg overflow-hidden shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-textColorMain truncate">
          {item.name}
        </h3>

        {/* AI Collection, Size, Material */}
        <div className="text-sm text-textColorMuted space-y-1 mt-1">
          <p>AI Collection: {item.aiCollection || "Premium"}</p>
          <p>
            Size: {item.size || "Medium"} | Material:{" "}
            {item.material || "Canvas"}
          </p>
        </div>

        {/* Price */}
        <p className="font-semibold text-primaryColor mt-2">{formattedPrice}</p>
      </div>

      {/* Quantity and Remove */}
      <div className="flex flex-col items-end gap-2">
        {/* Quantity Selector */}
        <div className="flex items-center gap-1 bg-black border border-borderColor rounded-lg p-1">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="p-1 hover:bg-backgroundColor rounded transition-colors"
            disabled={item.quantity <= 1}
          >
            <Minus size={16} className="text-textColorMain" />
          </button>
          <span className="w-8 text-center text-sm font-medium text-textColorMain">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="p-1 hover:bg-backgroundColor rounded transition-colors"
          >
            <Plus size={16} className="text-textColorMain" />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(item.id)}
          className="p-2 hover:text-primaryColor transition-colors"
          aria-label={`Remove ${item.name} from cart`}
        >
          <X size={20} className="text-textColorMuted" />
        </button>
      </div>
    </div>
  );
};

export default CartItem;
