"use client";

import React, { useState, Suspense } from "react";
import SharedPlansView from "@/components/page-shared/SharedPlansView";
import HeatMapView from "@/components/page-shared/HeatMapView";
import LoadingSpinner from "@/components/LoadingSpinner";

/**
 * Shared Roadmaps and Collaborative Intelligence Page
 *
 * Facilitates peer exploration, shared roadmap discovery, and cross-profile skill complementarity heat map analysis.
 *
 * Page Requirements:
 * - Authentication: Required inside child components (session cookie validation via Supabase).
 * - Context Dependencies: AuthContext, SharedModalContext.
 * - State Management: Active view mode toggle, multi-user selection for heat map comparisons.
 *
 * Workflow:
 * 1. Initialize view mode and multi-peer selection state.
 * 2. Register cleanup lifecycle to reset selection buffers upon page navigation.
 * 3. Configure interaction handlers for opening and dismissing the heat map comparison.
 * 4. Conditionally route view rendering based on user interaction mode:
 *    - Branch A: Mount multi-peer skill heat map comparison visualization.
 *    - Branch B: Mount peer shared roadmaps directory with asynchronous suspense boundary.
 */
export default function SharedPage() {
  // ==========================================
  // Step 1: Initialize View Mode and Multi-Peer Selection State
  // ==========================================
  const [isHeatMapViewOpen, setIsHeatMapViewOpen] = useState(false);
  const [selectedHeatMapUserIds, setSelectedHeatMapUserIds] = useState<string[]>([]);
  const [selectedSharedItems, setSelectedSharedItems] = useState<any[]>([]);

  // ==========================================
  // Step 2: Register Cleanup Lifecycle to Reset Selection Buffers
  // ==========================================
  // Reset heat map state and selected user identifiers when navigating away from the page.
  React.useEffect(() => {
    const handleHash = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash === "#heatmap" || hash === "#heatmap-view") {
          setIsHeatMapViewOpen(true);
        } else if (hash.includes("select")) {
          setIsHeatMapViewOpen(false);
        }
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      setIsHeatMapViewOpen(false);
      setSelectedHeatMapUserIds([]);
      setSelectedSharedItems([]);
    };
  }, []);

  // ==========================================
  // Step 3: Configure Interaction Handlers for Heat Map Comparison
  // ==========================================
  // Transition into heat map comparison mode with the selected peer user records.
  const handleOpenHeatMap = (userIds: string[], items: any[]) => {
    setSelectedHeatMapUserIds(userIds);
    setSelectedSharedItems(items);
    setIsHeatMapViewOpen(true);
  };

  // Return from the heat map comparison view back to the shared roadmaps directory.
  const handleBackToSharedPlans = () => {
    setIsHeatMapViewOpen(false);
  };

  // ==========================================
  // Step 4: Conditionally Route View Rendering Based on Interaction Mode
  // ==========================================
  if (isHeatMapViewOpen) {
    // ==========================================
    // Branch A: Multi-Peer Skill Heat Map Comparison Visualization
    // ==========================================
    return (
      <div id="heatmap" className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1 scroll-mt-24">
        <HeatMapView
          onBack={handleBackToSharedPlans}
          selectedUserIds={selectedHeatMapUserIds}
          selectedMembers={selectedSharedItems}
        />
      </div>
    );
  }

  // ==========================================
  // Branch B: Peer Shared Roadmaps Directory with Suspense Fallback
  // ==========================================
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center py-20">
          <LoadingSpinner size="md" showProgressBar={false} />
        </div>
      }
    >
      <SharedPlansView onOpenHeatMap={handleOpenHeatMap} />
    </Suspense>
  );
}
