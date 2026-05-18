import React from "react";

// Asset imports
import HeroMockupImage from "../../assets/hero_wall_art.jpeg";
import CustomApparelImage from "../../assets/hero.png";
import WallArtImage from "../../assets/hero.png";
import AccessoriesImage from "../../assets/hero.png";

/**
 * Reusable Card Component for the Bento Grid
 */
const CategoryCard = ({ image, title, subtitle, buttonText, className = "" }) => (
  <div className={`relative overflow-hidden rounded-borderRadiusLg bg-surfaceColor group shadow-boxShadowMedium ${className}`}>
    <img
      src={image}
      alt={title}
      className="absolute inset-0 w-full h-full object-contain p-paddingMedium group-hover:scale-105 transition-transform duration-[var(--transitionDuration)] z-0"
    />
    {/* High-contrast gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-backgroundColor via-backgroundColor/20 to-transparent" />
    
    {/* Text Content */}
    <div className="absolute bottom-0 left-0 p-paddingLarge z-10 w-full space-y-spacingUnit">
      <h3 className="text-textColorMain uppercase">
        {title}
      </h3>
      <p className="text-textColorMuted text-fontSizeXs font-fontWeightMedium uppercase">
        {subtitle}
      </p>
      <button className="bg-primaryColor text-textColorInverse font-fontWeightBold text-fontSizeXs uppercase px-paddingMedium py-paddingSmall rounded-borderRadiusSm hover:bg-accentColor transition-colors">
        {buttonText}
      </button>
    </div>
  </div>
);

const HeroSection = ({ onStartCreating }) => {
  return (
    <section className="bg-backgroundColor text-textColorMain w-full">
      {/* 1. Hero Header Section */}
      <div className="relative w-full min-h-[60vh] md:min-h-[75vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={HeroMockupImage}
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-backgroundColor/40 md:bg-transparent md:bg-gradient-to-r from-backgroundColor via-backgroundColor/80 to-transparent" />
        </div>
 
        <div className="relative z-10 px-paddingLarge md:px-paddingLarge lg:px-paddingLarge w-full max-w-[var(--maxWidthContainer)] mx-auto">
          <div className="max-w-2xl space-y-marginMedium text-center md:text-left flex flex-col items-center md:items-start">
            <h1 className="uppercase text-textColorMain">
              Bring your ideas to life.
              <span className="block text-primaryColor">Create, Print, Customize.</span>
            </h1>
            <p className="text-fontSizeLg md:text-fontSizeXl text-textColorMuted font-fontWeightMedium">
              Takhleeq: The Home of Creation.
            </p>
            <button 
              onClick={onStartCreating}
              className="bg-primaryColor text-textColorInverse font-fontWeightBold text-fontSizeSm md:text-fontSizeBase uppercase px-paddingLarge py-paddingMedium rounded-borderRadiusMd shadow-boxShadowMedium hover:scale-105 transition-transform duration-[var(--transitionDuration)]"
            >
              Start Creating Now
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bento Grid Section
      <div className="px-paddingMedium md:px-paddingLarge py-paddingLarge max-w-[var(--maxWidthContainer)] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-marginMedium lg:gap-marginLarge">
          
          {/* Custom Apparel - Large Tall Card */}
          {/* <CategoryCard 
            className="md:col-span-4 aspect-[4/5] md:aspect-auto md:h-[500px]"
            image={CustomApparelImage}
            title="Custom Apparel"
            subtitle="Premium printed t-shirts"
            buttonText="Start designing"
          /> */}

          {/* Wall Art - Large Tall Card */}
          {/* <CategoryCard 
            className="md:col-span-4 aspect-[4/5] md:aspect-auto md:h-[500px]"
            image={WallArtImage}
            title="Wall Art"
            subtitle="Diverse print formats"
            buttonText="Start designing"
          /> */}

          {/* Right Column - Two Stacked Cards */}
          {/* <div className="md:col-span-4 flex flex-col gap-marginMedium lg:gap-marginLarge h-full"> */}
            {/* Top Right Card */}
            {/* <CategoryCard 
              className="flex-1 aspect-[16/9] md:aspect-auto"
              image={AccessoriesImage}
              title="Accessories"
              subtitle="Custom phone cases"
              buttonText="View options"
            /> */}
            {/* Bottom Right Card */}
            {/* <CategoryCard 
              className="flex-1 aspect-[16/9] md:aspect-auto bg-surfaceColor"
              image={HeroMockupImage} // Placeholder for secondary accessory image
              title="Lifestyle"
              subtitle="Totes & Bags"
              buttonText="View options"
            /> */}
          {/* </div> */}

        {/* </div> */}
      {/* </div> */} 
    </section>
  );
};

export default HeroSection;