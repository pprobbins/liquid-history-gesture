export interface LiquidHistoryGestureOptions {
    /** Wave colour, default #18181b. */
    backgroundColor?: string;
    /** Arrow colour, default #C0FF00. */
    arrowColor?: string;
    /** Unavailable wave colour, default #71717a. */
    disabledBackgroundColor?: string;
    /** Unavailable arrow colour, default #d4d4d8. */
    disabledArrowColor?: string;
    /** Active opacity from 0 to 1, default 0.8. */
    opacity?: number;
    /** Unavailable opacity from 0 to 1, default 0.5. */
    disabledOpacity?: number;
    /** Overlay stacking order, default 100. */
    zIndex?: number;
    /** Optional application guard. Return false to show disabled feedback and prevent navigation. */
    canNavigate?: (direction: "back" | "forward") => boolean;
}
export declare function mountLiquidHistoryGesture(options?: LiquidHistoryGestureOptions): { destroy(): void };
