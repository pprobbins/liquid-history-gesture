const HISTORY_KEY = "__livefitGestureIndex";
const MAX_KEY = "livefitGestureHistoryMax";
/** Mount once after the document body exists; destroy when leaving the host layout. */
export function mountLiquidHistoryGesture(options = {}) {
    if (typeof document === "undefined" || !document.body) {
        throw new Error("Mount liquid history gestures after the document body exists.");
    }
    const settings = {
        backgroundColor: "#18181b", arrowColor: "#C0FF00",
        disabledBackgroundColor: "#71717a", disabledArrowColor: "#d4d4d8",
        opacity: 0.8, disabledOpacity: 0.5, zIndex: 100, ...options,
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const wave = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.setAttribute("aria-hidden", "true");
    Object.assign(svg.style, {
        pointerEvents: "none", position: "fixed", top: "0", height: "100dvh",
        width: "120px", zIndex: String(settings.zIndex), visibility: "hidden",
        opacity: String(settings.opacity),
    });
    wave.setAttribute("fill", settings.backgroundColor);
    arrow.setAttribute("stroke", settings.arrowColor);
    arrow.setAttribute("stroke-width", "3");
    arrow.setAttribute("stroke-linecap", "round");
    arrow.setAttribute("stroke-linejoin", "round");
    arrow.setAttribute("fill", "none");
    arrowPath.setAttribute("d", "M -8 0 H 8 M 1 -7 L 8 0 L 1 7");
    arrow.appendChild(arrowPath);
    svg.appendChild(wave);
    svg.appendChild(arrow);
    document.body.appendChild(svg);
    const navigation = window.navigation;
    const history = window.history;
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    let index = Number.isInteger(history.state?.[HISTORY_KEY]) ? history.state[HISTORY_KEY] : 0;
    let maximum = index;
    try {
        maximum = Math.max(index, Number(sessionStorage.getItem(MAX_KEY)) || 0);
    }
    catch { /* Storage may be unavailable. */ }
    const saveMaximum = () => {
        try {
            sessionStorage.setItem(MAX_KEY, String(maximum));
        }
        catch { /* History still works without storage. */ }
    };
    // Older browsers lack the Navigation API. Track only known entries, preserving Next's state.
    const trackedPush = function (data, unused, url) {
        const nextIndex = index + 1;
        originalPush.call(history, { ...data, [HISTORY_KEY]: nextIndex }, unused, url);
        index = nextIndex;
        maximum = index;
        saveMaximum();
    };
    const trackedReplace = function (data, unused, url) {
        originalReplace.call(history, { ...data, [HISTORY_KEY]: index }, unused, url);
    };
    if (!navigation) {
        // Start a fresh known stack if this entry has not previously been tracked.
        if (!Number.isInteger(history.state?.[HISTORY_KEY]))
            maximum = 0;
        originalReplace.call(history, { ...history.state, [HISTORY_KEY]: index }, "");
        saveMaximum();
        history.pushState = trackedPush;
        history.replaceState = trackedReplace;
    }
    const available = (direction) => {
        const exists = navigation
            ? (direction === "back" ? navigation.canGoBack : navigation.canGoForward)
            : (direction === "back" ? index > 0 : index < maximum);
        return exists && (settings.canNavigate ? settings.canNavigate(direction) : true);
    };
    let gesture = null;
    let depth = 0;
    let frame = 0;
    let settling = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const draw = (value, y, direction) => {
        depth = value;
        const enabled = available(direction);
        svg.style.opacity = String(enabled ? settings.opacity : settings.disabledOpacity);
        wave.setAttribute("fill", enabled ? settings.backgroundColor : settings.disabledBackgroundColor);
        arrow.setAttribute("stroke", enabled ? settings.arrowColor : settings.disabledArrowColor);
        const height = window.innerHeight;
        const radius = Math.min(230, height * 0.3);
        svg.setAttribute("viewBox", `0 0 120 ${height}`);
        svg.style.left = direction === "back" ? "0" : "auto";
        svg.style.right = direction === "forward" ? "0" : "auto";
        svg.style.transform = direction === "forward" ? "scaleX(-1)" : "none";
        // Two tangent curves form a liquid bulge with no persistent edge strip.
        wave.setAttribute("d", `M 0 ${y - radius} C 0 ${y - radius * 0.45} ${value} ${y - radius * 0.4} ${value} ${y} C ${value} ${y + radius * 0.4} 0 ${y + radius * 0.45} 0 ${y + radius} Z`);
        arrow.setAttribute("transform", `translate(${Math.max(0, value * 0.58)}, ${y}) scale(-1 1)`);
        arrow.style.opacity = String(Math.min(1, Math.max(0, (value - 15) / 25)));
        svg.style.visibility = value > 0.1 ? "visible" : "hidden";
    };
    const retract = (navigate = false) => {
        const current = gesture;
        gesture = null;
        if (!current)
            return;
        cancelAnimationFrame(frame);
        settling = true;
        let value = depth;
        let previous = performance.now();
        const animate = (now) => {
            const elapsed = Math.min(32, now - previous);
            previous = now;
            value *= Math.exp(-elapsed / 55);
            draw(value, current.y, current.direction);
            if (value > 0.3 && !reducedMotion.matches)
                frame = requestAnimationFrame(animate);
            else {
                draw(0, current.y, current.direction);
                settling = false;
                if (navigate && available(current.direction)) {
                    if (current.direction === "back")
                        history.back();
                    else
                        history.forward();
                }
            }
        };
        frame = requestAnimationFrame(animate);
    };
    const start = (event) => {
        if (gesture)
            retract();
        if (settling || event.touches.length !== 1 || !window.matchMedia("(any-pointer: coarse)").matches)
            return;
        const target = event.target;
        if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [data-edge-gesture="off"]'))
            return;
        const touch = event.touches[0];
        const direction = touch.clientX <= 20 ? "back" : touch.clientX >= window.innerWidth - 20 ? "forward" : null;
        if (!direction)
            return;
        gesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY, direction, claimed: false, navigable: false };
    };
    const move = (event) => {
        if (!gesture)
            return;
        const touch = Array.from(event.touches).find(item => item.identifier === gesture?.id);
        if (!touch || event.touches.length !== 1) {
            retract();
            return;
        }
        const distance = (touch.clientX - gesture.x) * (gesture.direction === "back" ? 1 : -1);
        const vertical = Math.abs(touch.clientY - gesture.y);
        if (!gesture.claimed) {
            if (vertical > 10 && vertical > Math.abs(distance)) {
                retract();
                return;
            }
            if (distance < -10) {
                retract();
                return;
            }
            if (distance < 10 || distance < vertical * 1.3)
                return;
            // The unavailable wave is feedback only, so it can still appear when
            // the browser owns the swipe. Only navigate when we can claim it.
            gesture.navigable = event.cancelable && available(gesture.direction);
            gesture.claimed = true;
        }
        if (event.cancelable)
            event.preventDefault();
        gesture.y = touch.clientY;
        draw(Math.min(96, Math.max(0, distance) * 0.65), gesture.y, gesture.direction);
    };
    const end = () => retract(!!gesture?.claimed && gesture.navigable && depth >= 58);
    const cancel = () => retract();
    const pop = () => {
        index = Number.isInteger(history.state?.[HISTORY_KEY]) ? history.state[HISTORY_KEY] : 0;
        cancel();
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", cancel);
    window.addEventListener("popstate", pop);
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    let destroyed = false;
    return { destroy() {
            if (destroyed)
                return;
            destroyed = true;
            cancelAnimationFrame(frame);
            svg.remove();
            document.removeEventListener("touchstart", start);
            document.removeEventListener("touchmove", move);
            document.removeEventListener("touchend", end);
            document.removeEventListener("touchcancel", cancel);
            window.removeEventListener("popstate", pop);
            window.removeEventListener("blur", cancel);
            window.removeEventListener("resize", cancel);
            if (history.pushState === trackedPush)
                history.pushState = originalPush;
            if (history.replaceState === trackedReplace)
                history.replaceState = originalReplace;
        } };
}
