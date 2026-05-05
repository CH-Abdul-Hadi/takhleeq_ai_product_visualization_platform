import React from "react";

const EqualizerLoader = ({ size = "md" }) => {
  const lineWidth =
    size === "sm" ? "w-20" : size === "lg" ? "w-24" : "w-24";

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-4 bg-backgroundColor/40 rounded-2xl">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`relative h-2 ${lineWidth} overflow-hidden rounded-full bg-primaryColor/20`}
          style={{
            boxShadow: "0 0 14px rgba(235,185,36,0.25)",
          }}
        >
          <span
            className="absolute inset-y-0 left-[-45%] w-[45%] rounded-full bg-linear-to-r from-transparent via-primaryColor to-transparent"
            style={{
              animation: "loaderSweep 1.6s ease-in-out infinite",
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes loaderSweep {
          0% { transform: translateX(0%); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(320%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default EqualizerLoader;

