"use client";

import { useState, type DragEvent } from "react";

/** Shared drag-to-reorder wiring for the routine lists. Dragging is armed
 * only from a row's grip — a row that is draggable everywhere turns every
 * stray swipe over the list into a reorder — so rows spread `rowProps` and
 * the grip spreads `gripProps`. */
export function useDragList(onMove: (from: number, to: number) => void) {
  const [armed, setArmed] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function reset() {
    setArmed(null);
    setDragIndex(null);
    setOverIndex(null);
  }

  return {
    dragIndex,
    gripProps(index: number) {
      return {
        onPointerDown: () => setArmed(index),
        onPointerUp: () => setArmed(null),
      };
    },
    rowProps(index: number) {
      return {
        draggable: armed === index,
        onDragStart: (e: DragEvent<HTMLElement>) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(index));
          setDragIndex(index);
        },
        onDragOver: (e: DragEvent<HTMLElement>) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOverIndex(index);
        },
        onDrop: (e: DragEvent<HTMLElement>) => {
          e.preventDefault();
          if (dragIndex !== null) onMove(dragIndex, index);
          reset();
        },
        onDragEnd: reset,
      };
    },
    /** Which edge of row `index` the insertion line belongs on, if any. */
    dropEdge(index: number): "top" | "bottom" | null {
      if (overIndex !== index || dragIndex === null || dragIndex === index) return null;
      return dragIndex > index ? "top" : "bottom";
    },
  };
}
