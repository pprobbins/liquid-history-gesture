import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mountLiquidHistoryGesture } from './index.mjs';

function browser(t, { navigation = { canGoBack: true, canGoForward: false } } = {}) {
    const originals = new Map();
    const install = (name, value) => {
        originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    };
    const listeners = new Map();
    const events = prefix => ({
        addEventListener(name, handler) { listeners.set(`${prefix}:${name}`, handler); },
        removeEventListener(name, handler) {
            if (listeners.get(`${prefix}:${name}`) === handler) listeners.delete(`${prefix}:${name}`);
        },
    });
    class Element {
        style = {};
        attributes = {};
        children = [];
        parent = null;
        setAttribute(name, value) { this.attributes[name] = value; }
        appendChild(child) { this.children.push(child); child.parent = this; }
        remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
        closest() { return null; }
    }
    const frames = new Map();
    let nextFrame = 0, time = 0, forwardCount = 0, backCount = 0;
    const history = {
        state: { framework: 'preserved' },
        pushState(state) { this.state = state; },
        replaceState(state) { this.state = state; },
        forward() { forwardCount++; },
        back() { backCount++; },
    };
    const document = { ...events('document'), body: new Element(), createElementNS: () => new Element() };
    const window = {
        ...events('window'), navigation, history, innerWidth: 320, innerHeight: 800,
        matchMedia: query => ({ matches: query.includes('coarse') }),
    };
    install('Element', Element);
    install('document', document);
    install('window', window);
    install('sessionStorage', { getItem: () => null, setItem() {} });
    install('performance', { now: () => time });
    install('requestAnimationFrame', callback => { frames.set(++nextFrame, callback); return nextFrame; });
    install('cancelAnimationFrame', id => frames.delete(id));
    t.after(() => {
        for (const [name, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
    });
    const fire = (name, x, { y = 400, cancelable = true, target = new Element() } = {}) => {
        const event = {
            touches: [{ identifier: 1, clientX: x, clientY: y }], target, cancelable,
            preventDefault() { assert.ok(cancelable); },
        };
        listeners.get(`document:${name}`)?.(event);
    };
    const flush = () => {
        for (let i = 0; frames.size && i < 100; i++) {
            const pending = [...frames.values()];
            frames.clear(); time += 16;
            pending.forEach(callback => callback(time));
        }
        assert.equal(frames.size, 0);
    };
    return { document, window, history, listeners, frames, fire, flush,
        counts: () => ({ forward: forwardCount, back: backCount }) };
}

test('custom colours, opacity, unavailable feedback and both history directions', t => {
    const env = browser(t);
    const gesture = mountLiquidHistoryGesture({
        backgroundColor: 'navy', arrowColor: 'white', disabledBackgroundColor: 'grey',
        disabledArrowColor: 'silver', opacity: 0.7, disabledOpacity: 0.3, zIndex: 500,
    });
    const svg = env.document.body.children[0];
    const [wave, arrow] = svg.children;
    assert.equal(svg.style.visibility, 'hidden');
    assert.equal(svg.style.zIndex, '500');
    env.fire('touchstart', 319);
    env.fire('touchmove', 200, { cancelable: false });
    assert.equal(svg.style.visibility, 'visible');
    assert.equal(wave.attributes.fill, 'grey');
    assert.equal(svg.style.right, '0');
    assert.equal(svg.style.transform, 'scaleX(-1)');
    assert.match(arrow.attributes.transform, /scale\(-1 1\)/);
    assert.equal(arrow.attributes.stroke, 'silver');
    assert.equal(svg.style.opacity, '0.3');
    env.fire('touchend', 200); env.flush();
    assert.deepEqual(env.counts(), { forward: 0, back: 0 });
    assert.equal(svg.style.visibility, 'hidden');

    env.window.navigation.canGoForward = true;
    env.fire('touchstart', 319); env.fire('touchmove', 200);
    assert.equal(wave.attributes.fill, 'navy');
    assert.equal(arrow.attributes.stroke, 'white');
    assert.equal(svg.style.opacity, '0.7');
    env.fire('touchend', 200); env.flush();
    env.fire('touchstart', 0); env.fire('touchmove', 120);
    assert.equal(svg.style.transform, 'none');
    env.fire('touchend', 120); env.flush();
    assert.deepEqual(env.counts(), { forward: 1, back: 1 });
    gesture.destroy();
    assert.equal(env.document.body.children.length, 0);
    assert.equal(env.listeners.size, 0);
});

test('unavailable back history shows disabled feedback without navigating', t => {
    const env = browser(t, { navigation: { canGoBack: false, canGoForward: false } });
    const gesture = mountLiquidHistoryGesture();
    const svg = env.document.body.children[0];
    const [wave, arrow] = svg.children;
    for (const cancelable of [true, false]) {
        env.fire('touchstart', 0);
        env.fire('touchmove', 120, { cancelable });
        assert.equal(svg.style.visibility, 'visible');
        assert.equal(svg.style.left, '0');
        assert.equal(svg.style.transform, 'none');
        assert.equal(wave.attributes.fill, '#71717a');
        assert.equal(arrow.attributes.stroke, '#d4d4d8');
        assert.equal(svg.style.opacity, '0.5');
        env.fire('touchend', 120); env.flush();
        assert.equal(svg.style.visibility, 'hidden');
        assert.deepEqual(env.counts(), { forward: 0, back: 0 });
    }
    gesture.destroy();
});

test('application guard disables destinations even when browser history exists', t => {
    const env = browser(t, { navigation: { canGoBack: true, canGoForward: true } });
    const gesture = mountLiquidHistoryGesture({ canNavigate: direction => direction === 'forward' });
    const svg = env.document.body.children[0];
    env.fire('touchstart', 0); env.fire('touchmove', 120);
    assert.equal(svg.children[0].attributes.fill, '#71717a');
    assert.equal(svg.style.opacity, '0.5');
    env.fire('touchend', 120); env.flush();
    assert.deepEqual(env.counts(), { forward: 0, back: 0 });
    env.fire('touchstart', 319); env.fire('touchmove', 200); env.fire('touchend', 200); env.flush();
    assert.deepEqual(env.counts(), { forward: 1, back: 0 });
    gesture.destroy();
});

test('short, cancelled, vertical and excluded gestures never navigate', t => {
    const env = browser(t);
    const gesture = mountLiquidHistoryGesture();
    env.fire('touchstart', 0); env.fire('touchmove', 29); env.fire('touchend', 29); env.flush();
    env.fire('touchstart', 0); env.fire('touchmove', 120); env.fire('touchcancel', 120); env.flush();
    env.fire('touchstart', 0); env.fire('touchmove', 4, { y: 450 }); env.fire('touchend', 4); env.flush();
    const excluded = new Element(); excluded.closest = () => excluded;
    env.fire('touchstart', 0, { target: excluded }); env.fire('touchmove', 120); env.fire('touchend', 120); env.flush();
    assert.deepEqual(env.counts(), { forward: 0, back: 0 });
    gesture.destroy();
});

test('fallback tracks known history, preserves state and restores methods on removal', t => {
    const env = browser(t, { navigation: null });
    const originalPush = env.history.pushState;
    const originalReplace = env.history.replaceState;
    const gesture = mountLiquidHistoryGesture();
    assert.equal(env.history.state.framework, 'preserved');
    const initial = env.history.state;
    env.history.pushState({ framework: 'next page' }, '', '/next');
    env.history.state = initial;
    env.listeners.get('window:popstate')();
    env.fire('touchstart', 319); env.fire('touchmove', 200); env.fire('touchend', 200); env.flush();
    assert.deepEqual(env.counts(), { forward: 1, back: 0 });
    // Removing during a pending release must prevent navigation afterwards.
    env.fire('touchstart', 319); env.fire('touchmove', 200); env.fire('touchend', 200);
    gesture.destroy(); gesture.destroy(); env.flush();
    assert.deepEqual(env.counts(), { forward: 1, back: 0 });
    assert.equal(env.history.pushState, originalPush);
    assert.equal(env.history.replaceState, originalReplace);
    assert.equal(env.listeners.size, 0);
});
