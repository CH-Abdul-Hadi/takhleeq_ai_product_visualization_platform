import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import ProductCard from "../ui/ProductCard";
import ProductCardSkeleton from "../ui/ProductCardSkeleton";
import { productService } from "../../services/productService";
import { aiDesignService } from "../../services/aiDesignService";

const FALLBACK_PRODUCTS = [
  {
    product_id: 1,
    Product_name: "AI T-Shirt",
    price: 2999,
    product_image: null,
    category: "Cotton",
    Product_details: "Premium organic cotton with AI prints.",
  },
  {
    product_id: 2,
    Product_name: "Heavy Hoodie",
    price: 5499,
    product_image: null,
    category: "Winter",
    Product_details: "Heavyweight fleece for bold designs.",
  },
  {
    product_id: 3,
    Product_name: "Ceramic Mug",
    price: 1850,
    product_image: null,
    category: "White",
    Product_details: "Dishwasher safe custom ceramic mugs.",
  },
];

const PRODUCTS_BASE_URL = import.meta.env.VITE_PRODUCTS_API_URL || 'http://localhost:8000';

const getBase64Src = (b64String) => {
  if (!b64String) return "";
  if (b64String.startsWith("data:") || b64String.startsWith("http")) return b64String;
  return `data:image/png;base64,${b64String}`;
};

const getProductImageUrl = (product) => {
  if (product.product_image) {
    return getBase64Src(product.product_image);
  }
  return `${PRODUCTS_BASE_URL}/product/${product.product_id}/image`;
};

const getProductId = (product) => product?.product_id ?? product?.Product_id ?? product?.id;
const getProductName = (product) =>
  product?.Product_name ?? product?.product_name ?? product?.name ?? "Unnamed Product";
const getProductDescription = (product) =>
  product?.Product_details ?? product?.product_details ?? product?.description ?? "No description available.";
const getProductPrice = (product) => Number(product?.price ?? product?.Price ?? 0);
const getProductCategory = (product) => product?.category ?? product?.Category ?? "";
const isCustomDesign = (product) => product?.itemType === "custom-design";
const getCatalogItemKey = (product) =>
  isCustomDesign(product) ? product.id : getProductId(product);

const CategoriesPage = () => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setError(null);
        const [productsData, designsData] = await Promise.all([
          productService.getAllProducts(),
          aiDesignService.getAllAICenterRecords(),
        ]);
        const baseProducts = Array.isArray(productsData) ? productsData : [];
        const productsById = baseProducts.reduce((acc, product) => {
          const productId = getProductId(product);
          if (productId) {
            acc[productId] = product;
          }
          return acc;
        }, {});
        const publicDesigns = (Array.isArray(designsData) ? designsData : [])
          .filter((design) => design.status === "approved" && (design.final_product || design.design_from_gemini))
          .map((design) => {
            const baseProduct = productsById[design.product_id];
            return {
              ...design,
              itemType: "custom-design",
              id: `custom-design-${design.id}`,
              product_id: design.product_id,
              design_id: design.id,
              Product_name: `${baseProduct?.Product_name || "Custom Product"} - AI Design`,
              Product_details: design.user_idea || "Custom AI generated design.",
              price: Number(baseProduct?.price || 0),
              category: "AI Designs",
              product_image: design.final_product || design.design_from_gemini,
            };
          });

        const catalogItems = [...publicDesigns, ...baseProducts];
        if (catalogItems.length > 0) {
          setProducts(catalogItems);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.warn("Failed to load products.", err);
        setError("Failed to load products. Please try again.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = (product) => {
    const productId = getProductId(product);
    const image = getProductImageUrl(product);
    addToCart({
      id: isCustomDesign(product) ? product.id : productId,
      productId,
      designId: product.design_id,
      name: getProductName(product),
      price: getProductPrice(product),
      image,
      customProductName: isCustomDesign(product) ? getProductName(product) : undefined,
      customProductImage: isCustomDesign(product) ? image : undefined,
      aiCollection: isCustomDesign(product) ? "AI Design Lab" : undefined,
      quantity: 1,
    });
  };

  const availableCategories = [
    "All",
    ...new Set(
      products
        .map((product) => getProductCategory(product))
        .filter((category) => typeof category === "string" && category.trim())
    ),
  ];

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((product) => getProductCategory(product) === selectedCategory);

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="relative bg-black border-b border-borderColor py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Explore Categories
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Discover our curated collection of AI-generated artwork across various styles and themes
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories Grid (commented: static/non-backend section) */}
        {/*
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-textColorMain mb-8">
            Browse by Category
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES_UI.map((category) => (
              <div
                key={category.id}
                className="group block bg-surfaceColor rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                {/* Gradient placeholder instead of broken placeholder images */}
              {/* <div className={`relative h-48 bg-linear-to-br ${category.colorFrom} ${category.colorTo}`}>
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-semibold mb-1">{category.name}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-textColorMuted text-sm line-clamp-2">
                    {category.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        */}

        {/* Featured Products */}
        <div>
          <h2 className="text-3xl font-bold text-textColorMain mb-8">
            Featured Products
          </h2>

          <div className="mb-8 flex flex-wrap gap-3">
            {availableCategories.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full border text-sm transition ${
                    isActive
                      ? "bg-primaryColor text-black border-primaryColor"
                      : "bg-black text-textColorMuted border-borderColor hover:border-primaryColor/50 hover:text-primaryColor"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={`categories-product-skeleton-${index}`} />
              ))
            ) : error ? (
              <div className="col-span-full text-center py-12 text-primaryColor">
                {error}
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductCard
                  key={getCatalogItemKey(product)}
                  image={getProductImageUrl(product)}
                  title={getProductName(product)}
                  tags={getProductCategory(product) ? [getProductCategory(product)] : ["Featured"]}
                  description={getProductDescription(product)}
                  price={getProductPrice(product)}
                  onViewDetails={
                    isCustomDesign(product)
                      ? undefined
                      : () => navigate(`/products/${getProductId(product)}`)
                  }
                  onOpenStudio={
                    isCustomDesign(product)
                      ? undefined
                      : () =>
                          navigate(`/studio?product=${getProductId(product)}`, {
                            state: { selectedProductId: getProductId(product) },
                          })
                  }
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-textColorMuted">
                No products found in this category
              </div>
            )}
          </div>
        </div>

        {/* Call to Action (commented: static/non-backend section) */}
        {/*
        <div className="mt-16 bg-surfaceColor rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-textColorMain mb-4">
            Can't find what you're looking for?
          </h2>
          <p className="text-textColorMuted mb-6 max-w-2xl mx-auto">
            Try our AI Studio to create custom artwork tailored to your preferences
          </p>
          <Link
            to="/studio"
            className="inline-block bg-primaryColor text-white px-6 py-3 rounded-lg font-semibold hover:bg-primaryColor/90 transition-colors"
          >
            Visit AI Studio
          </Link>
        </div>
        */}
      </div>
    </div>
  );
};

export default CategoriesPage;
