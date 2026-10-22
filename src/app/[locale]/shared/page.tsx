"use client";

import React, { useState } from "react";
import SharedPlansView from "@/components/shared/SharedPlansView";
import HeatMapView from "@/components/shared/HeatMapView";

// --- Shared Page Component ---
// Render the peer shared roadmaps directory and mount collaborative exploration views.
export default function SharedPage() {
  // --- View Mode State ---
  // Controls whether the main shared directory or the heat map view is visible.
  const [isHeatMapViewOpen, setIsHeatMapViewOpen] = useState(false);
  const [selectedHeatMapUserIds, setSelectedHeatMapUserIds] = useState<string[]>([]);
  const [selectedSharedItems, setSelectedSharedItems] = useState<any[]>([]);

  // Automatically reset HeatMap view and selections when navigating away from the shared page.
  React.useEffect(() => {
    return () => {
      setIsHeatMapViewOpen(false);
      setSelectedHeatMapUserIds([]);
      setSelectedSharedItems([]);
    };
  }, []);

  const handleOpenHeatMap = (userIds: string[], items: any[]) => {
    setSelectedHeatMapUserIds(userIds);
    setSelectedSharedItems(items);
    setIsHeatMapViewOpen(true);
  };

  const handleBackToSharedPlans = () => {
    setIsHeatMapViewOpen(false);
  };

  // --- UI ---
  if (isHeatMapViewOpen) {
    return (
      <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
        <HeatMapView
          onBack={handleBackToSharedPlans}
          selectedUserIds={selectedHeatMapUserIds}
          selectedMembers={selectedSharedItems}
        />
      </div>
    );
  }

  return (
    <SharedPlansView onOpenHeatMap={handleOpenHeatMap} />
  );
}
