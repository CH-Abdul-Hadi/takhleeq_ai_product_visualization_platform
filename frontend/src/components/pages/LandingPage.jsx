import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../ui/ProductCard";
import ProductCardSkeleton from "../ui/ProductCardSkeleton";
import HeroSection from "../ui/Hero";
import EqualizerLoader from "../ui/EqualizerLoader";
import { productService } from "../../services/productService";
import { useCart } from "../../hooks/useCart";

const PRODUCTS_BASE_URL =
  import.meta.env.VITE_PRODUCTS_API_URL || "http://localhost:8000";

const getProductImageUrl = (product) => {
  if (product.product_image) {
    return `data:image/png;base64,${product.product_image}`;
  }
  return `${PRODUCTS_BASE_URL}/product/${product.product_id}/image`;
};

const getProductId = (product) =>
  product?.product_id ?? product?.Product_id ?? product?.id;
const getProductName = (product) =>
  product?.Product_name ??
  product?.product_name ??
  product?.name ??
  "Unnamed Product";
const getProductDescription = (product) =>
  product?.Product_details ??
  product?.product_details ??
  product?.description ??
  "No description available.";
const getProductPrice = (product) =>
  Number(product?.price ?? product?.Price ?? 0);
const getProductCategory = (product) =>
  product?.category ?? product?.Category ?? "";

const LandingPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIntroLoader, setShowIntroLoader] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getAllProducts();
        if (data && Array.isArray(data) && data.length > 0) {
          setProducts(data);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.warn("Failed to fetch products from Product API.", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntroLoader(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const handleAddToCart = (product) => {
    const productId = getProductId(product);
    addToCart({
      id: productId,
      name: getProductName(product),
      price: getProductPrice(product),
      image: getProductImageUrl(product),
      quantity: 1,
    });
  };

  if (loading || showIntroLoader) {
    return (
      <div className="fixed inset-0 z-50 bg-backgroundColor flex flex-col items-center justify-center px-paddingLarge">
        <EqualizerLoader size="lg" />
      </div>
    );
  }

  return (
    <>
      <HeroSection onStartCreating={() => navigate("/studio")} />
      <div className="flex flex-col w-full pb-paddingLarge bg-backgroundColor">
        {/* Section 1: Pre-made Designs (commented: static/non-backend section) */}
        {/*
        <section className="py-paddingLarge px-paddingLarge max-w-[var(--maxWidthContainer)] mx-auto w-full">
          <div className="flex justify-between items-end mb-marginLarge">
            <h2 className="text-textColorMain">Pre-made Designs</h2>
            <button className="text-primaryColor font-fontWeightMedium text-fontSizeSm uppercase flex items-center gap-spacingUnit hover:underline">
              View Gallery <ArrowRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-marginMedium">
            {products.slice(0, 4).map((product) => (
              <div
                key={product.product_id}
                className="aspect-square rounded-borderRadiusLg bg-surfaceColor border border-borderColor overflow-hidden"
              >
                {product.product_image ? (
                  <img
                    src={`data:image/png;base64,${product.product_image}`}
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                    alt={product.Product_name}
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-primaryColor/20 to-accentColor/20 flex items-center justify-center">
                    <span className="text-textColorMuted text-fontSizeXs text-center px-2">
                      {product.Product_name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        */}

        {/* Section 2: Promo Banner (commented: static/non-backend section) */}
        {/*
        <section className="px-paddingLarge mb-marginLarge max-w-[var(--maxWidthContainer)] mx-auto w-full">
          <div className="bg-primaryColor rounded-borderRadiusLg p-paddingLarge flex flex-col items-start gap-marginMedium shadow-boxShadowMedium">
            <span className="bg-textColorInverse text-textColorMain text-fontSizeXs font-fontWeightMedium px-paddingMedium py-paddingSmall rounded-borderRadiusFull uppercase tracking-wide">Limited Offer</span>
            <h2 className="text-textColorInverse">
              Get 20% OFF <br /> Your AI Creation
            </h2>
            <button className="bg-textColorInverse text-textColorMain px-paddingLarge py-paddingMedium rounded-borderRadiusMd font-fontWeightMedium uppercase text-fontSizeSm mt-marginSmall transition-transform active:scale-95 hover:bg-surfaceColor shadow-boxShadowLow">Claim Now</button>
          </div>
        </section>
        */}

        {/* Section 3: Print Your Reality Grid */}
        <section className="px-paddingLarge py-paddingLarge bg-backgroundColor w-full shadow-boxShadowMedium">
          <div className="max-w-(--maxWidthContainer) mx-auto">
            <div className="mb-marginLarge">
              <h2 className="text-textColorMain">
                Print Your <span className="text-primaryColor">Reality</span>
              </h2>
              <p className="text-textColorMuted text-fontSizeLg mt-marginSmall font-fontWeightLight">
                High-quality mockups of what you can create.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-paddingLarge">
              {loading || showIntroLoader ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12">
                  <EqualizerLoader size="lg" />
                  <p className="mt-4 text-textColorMuted text-sm uppercase tracking-[0.2em]">
                    Loading products...
                  </p>
                </div>
              ) : (
                products.map((product) => (
                  <ProductCard
                    key={getProductId(product)}
                    image={getProductImageUrl(product)}
                    title={getProductName(product)}
                    tags={
                      getProductCategory(product)
                        ? [getProductCategory(product)]
                        : []
                    }
                    description={getProductDescription(product)}
                    price={getProductPrice(product)}
                    onViewDetails={() =>
                      navigate(`/products/${getProductId(product)}`)
                    }
                    onOpenStudio={() =>
                      navigate(`/studio?product=${getProductId(product)}`, {
                        state: { selectedProductId: getProductId(product) },
                      })
                    }
                    onAddToCart={() => handleAddToCart(product)}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Testimonials (commented: static/non-backend section) */}
        {/*
        <section className="px-paddingLarge py-paddingLarge max-w-[var(--maxWidthContainer)] mx-auto w-full">
          <div className="mb-marginLarge text-center md:text-left">
            <h2 className="text-textColorMain">Hear from our Creators</h2>
            <p className="text-textColorMuted text-fontSizeLg mt-marginSmall font-fontWeightLight">See what visionaries are building on Takhleeq.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-marginLarge">
            <TestimonialCard
              quote="The 3D mockup generator completely revolutionized how I prototype my streetwear brand. I don't need inventory anymore, just this AI."
              author="Alex Rivers"
              role="Founder, Void Studios"
            />
            <TestimonialCard
              quote="I generated an entire concept album's worth of merchandise, and the print quality matches the digital fidelity flawlessly."
              author="Sarah Chen"
              role="Digital Artist"
            />
          </div>
        </section>
        */}
      </div>
    </>
  );
};

export default LandingPage;
