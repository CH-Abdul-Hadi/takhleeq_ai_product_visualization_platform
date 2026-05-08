import React, { useState, useEffect } from "react";
import { Download, Check, X, Loader2 } from "lucide-react";
import { aiDesignService } from "../../services/aiDesignService";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const getBase64Src = (b64String) => {
  if (!b64String) return null;
  if (b64String.startsWith("data:")) return b64String;
  return `data:image/png;base64,${b64String}`;
};

const StatusBadge = ({ status }) => {
  const map = {
    pending:  { bg: "bg-yellow-500/20",  text: "text-yellow-400",  label: "Pending" },
    approved: { bg: "bg-green-500/20",   text: "text-green-400",   label: "Approved" },
    rejected: { bg: "bg-red-500/20",     text: "text-red-400",     label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

const MyDesignsPage = () => {
  const user = useSelector((state) => state.auth.user);
  const [myDesigns, setMyDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // id of design being actioned

  useEffect(() => {
    fetchDesigns();
  }, [user?.id]);

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user?.id) {
        setMyDesigns([]);
        return;
      }
      const data = await aiDesignService.getAICenterRecordsByUser(user.id);
      setMyDesigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch designs", err);
      setError("Failed to load your designs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await aiDesignService.approveDesign(id);
      await fetchDesigns();
    } catch (err) {
      console.error("Failed to approve", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await aiDesignService.rejectDesign(id);
      await fetchDesigns();
    } catch (err) {
      console.error("Failed to reject", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = (design) => {
    const src = getBase64Src(design.final_product || design.design_from_gemini);
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = `design-${design.id}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-backgroundColor p-paddingLarge">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-marginLarge gap-4">
          <div>
            <h1 className="text-3xl font-fontWeightBold text-textColorMain mb-2">My Designs &amp; Lab</h1>
            <p className="text-textColorMuted">Manage, view, and organize all your creative masterpieces and review pending AI jobs.</p>
          </div>
          <Link
            to="/studio"
            className="bg-primaryColor text-white px-6 py-2.5 rounded-borderRadiusMd hover:bg-primaryColor/90 transition-all shadow-md shadow-primaryColor/20 font-fontWeightMedium"
          >
            Create New Design
          </Link>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primaryColor" />
          </div>
        ) : error ? (
          <div className="text-center py-24 text-red-500">{error}</div>
        ) : myDesigns.length === 0 ? (
          <div className="text-center py-24 text-textColorMuted">
            <p className="text-lg mb-4">No designs found in your Lab.</p>
            <Link
              to="/studio"
              className="inline-block bg-primaryColor text-white px-6 py-3 rounded-borderRadiusMd hover:bg-primaryColor/90 transition-all font-fontWeightMedium"
            >
              Create Your First Design
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myDesigns.map((design) => {
              const imageSrc = getBase64Src(design.final_product || design.design_from_gemini);
              const designId = design.id;
              const isActioning = actionLoading === designId;

              return (
                <div
                  key={designId}
                  className="group relative rounded-borderRadiusLg overflow-hidden bg-surfaceColor border border-borderColor shadow-sm hover:shadow-xl transition-all duration-300"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-borderColor border-b border-borderColor">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={design.user_idea || "AI Design"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-primaryColor/20 to-accentColor/20 flex items-center justify-center">
                        <span className="text-textColorMuted text-fontSizeXs text-center px-4">
                          {design.status === "pending" ? "Generating..." : "No Image"}
                        </span>
                      </div>
                    )}

                    {/* Hover Action Bar */}
                    {design.status === "pending" && (
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <div className="flex items-center justify-between gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(designId)}
                              disabled={isActioning}
                              title="Approve"
                              className="w-10 h-10 rounded-full bg-white/20 hover:bg-green-500 flex items-center justify-center text-white backdrop-blur-md transition-colors disabled:opacity-50"
                            >
                              {isActioning ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                            </button>
                            <button
                              onClick={() => handleReject(designId)}
                              disabled={isActioning}
                              title="Reject"
                              className="w-10 h-10 rounded-full bg-white/20 hover:bg-red-500 flex items-center justify-center text-white backdrop-blur-md transition-colors disabled:opacity-50"
                            >
                              {isActioning ? <Loader2 size={16} className="animate-spin" /> : <X size={18} />}
                            </button>
                          </div>
                          {imageSrc && (
                            <button
                              onClick={() => handleDownload(design)}
                              title="Download"
                              className="w-10 h-10 rounded-full bg-white/20 hover:bg-primaryColor flex items-center justify-center text-white backdrop-blur-md transition-colors"
                            >
                              <Download size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-textColorMain font-fontWeightBold text-fontSizeLg truncate pr-2">
                        {design.user_idea || "Design Request"}
                      </h3>
                      <StatusBadge status={design.status} />
                    </div>
                    <div className="flex justify-between items-center text-fontSizeSm text-textColorMuted mt-2">
                      <span>Product #{design.product_id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDesignsPage;
