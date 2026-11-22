/* ---------------------------------------------------------------
   PRITI'S COUNTDOWN — standalone, India-time-safe and always visible
   --------------------------------------------------------------- */
(() => {
    'use strict';
    const rootSelector = '[data-countdown-root]';
    const numberFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric'
    });
    const indiaParts = date => {
        const parts = numberFormatter.formatToParts(date);
        const values = {};
        for (const part of parts) if (part.type !== 'literal') values[part.type] = Number(part.value);
        return values;
    };
    // Midnight on 26 November in India is 18:30 UTC on 25 November.
    const indiaMidnightEpoch = (year, monthIndex, day) => Date.UTC(year, monthIndex, day - 1, 18, 30, 0, 0);
    const pad = value => String(value).padStart(2, '0');
    const update = () => {
        const roots = document.querySelectorAll(rootSelector);
        if (!roots.length) return;
        const now = new Date();
        const india = indiaParts(now);
        const birthdayToday = india.month === 11 && india.day === 26;
        let target = indiaMidnightEpoch(india.year, 10, 26);
        if (!birthdayToday && now.getTime() >= target) target = indiaMidnightEpoch(india.year + 1, 10, 26);
        const secondsLeft = birthdayToday ? 0 : Math.max(0, Math.floor((target - now.getTime()) / 1000));
        const values = {
            days: Math.floor(secondsLeft / 86400),
            hours: Math.floor((secondsLeft % 86400) / 3600),
            minutes: Math.floor((secondsLeft % 3600) / 60),
            seconds: secondsLeft % 60
        };
        roots.forEach(root => {
            root.querySelectorAll('[data-countdown-unit]').forEach(node => {
                const unit = node.getAttribute('data-countdown-unit');
                if (Object.prototype.hasOwnProperty.call(values, unit)) node.textContent = pad(values[unit]);
            });
            root.querySelectorAll('[data-countdown-message]').forEach(node => {
                node.textContent = birthdayToday ? 'the day is finally here, priti ♡' : 'counting down to your day';
            });
            root.classList.toggle('is-birthday-today', birthdayToday);
            root.setAttribute('data-countdown-state', birthdayToday ? 'birthday' : 'counting');
        });
    };
    update();
    const timer = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
    window.addEventListener('pagehide', () => window.clearInterval(timer), { once: true });
})();

/* ================================================================
   for priti — a birthday written in the stars
   interactive experience matched to index.html and style.css
   ================================================================ */
(() => {
    'use strict';

    /* ------------------------------------------------------------
       01. small utilities and shared state
       ------------------------------------------------------------ */

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const byId = id => document.getElementById(id);
    const reducedMotion = Boolean(
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    const setStatus = (id, message) => {
        const element = byId(id);
        if (element) element.textContent = message;
    };

    const showElement = element => {
        if (element) element.hidden = false;
    };

    const hideElement = element => {
        if (element) element.hidden = true;
    };

    const markMediaEmpty = (element, empty = true) => {
        if (!element) return;
        element.classList.toggle('is-empty', empty);
        element.classList.toggle('has-media', !empty);
    };

    let toastTimer = null;
    const toast = message => {
        const box = byId('website-toast');
        const label = byId('website-toast-message');
        if (!box || !label) return;

        label.textContent = message;
        box.hidden = false;
        box.classList.remove('is-visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            box.hidden = true;
        }, 3200);
    };

    const downloadBlob = (blob, filename) => {
        if (!(blob instanceof Blob)) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    const downloadText = (content, filename, type = 'text/plain;charset=utf-8') => {
        downloadBlob(new Blob([content], { type }), filename);
    };

    const sleep = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
    const randomBetween = (minimum, maximum) => minimum + Math.random() * (maximum - minimum);

    /* ------------------------------------------------------------
       02. loading screen and opening gift sequence
       ------------------------------------------------------------ */

    const loadingScreen = byId('loading-screen');
    const mainSite = byId('main-website');
    const celebration = byId('celebration-overlay');
    const giftButton = byId('open-gift-button');
    const whistleStage = byId('whistle-stage');

    let loadingHidden = false;
    let giftOpened = false;
    let celebrationStarted = false;
    let whistleInProgress = false;

    const hideLoading = () => {
        if (!loadingScreen || loadingHidden) return;
        loadingHidden = true;
        loadingScreen.classList.add('is-hidden');
        window.setTimeout(() => {
            loadingScreen.hidden = true;
        }, 700);
    };

    window.addEventListener('load', () => window.setTimeout(hideLoading, 300), { once: true });
    // Do not make the greeting wait for external font or image requests to finish.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.setTimeout(hideLoading, 420), { once: true });
    } else {
        window.setTimeout(hideLoading, 420);
    }
    window.setTimeout(hideLoading, 4200);

    giftButton?.addEventListener('click', () => {
        if (giftOpened) return;
        giftOpened = true;

        giftButton.classList.add('is-open', 'open');
        giftButton.setAttribute('aria-expanded', 'true');

        const instruction = byId('gift-instruction');
        if (instruction) instruction.textContent = 'your little surprise is ready ♡';

        if (whistleStage) {
            whistleStage.hidden = false;
            whistleStage.scrollIntoView({
                behavior: reducedMotion ? 'auto' : 'smooth',
                block: 'center'
            });
        }

        toast('a little surprise, made just for you ♡');
    });

    /* ------------------------------------------------------------
       03. fireworks canvas
       ------------------------------------------------------------ */

    const activeFireworks = new WeakMap();

    function launchFireworks(canvas, duration = 5200) {
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const previous = activeFireworks.get(canvas);
        if (previous) {
            window.cancelAnimationFrame(previous.frame);
            window.removeEventListener('resize', previous.resize);
            if (previous.timer) window.clearTimeout(previous.timer);
        }

        const colours = ['#f5c9dc', '#e6a3c0', '#ffffff', '#c77a9e', '#d9b5ee'];
        const particles = [];
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        let frameId = 0;
        let lastBurst = 0;
        let running = true;

        const resize = () => {
            const bounds = canvas.getBoundingClientRect();
            const width = Math.max(1, bounds.width);
            const height = Math.max(1, bounds.height);
            canvas.width = Math.round(width * pixelRatio);
            canvas.height = Math.round(height * pixelRatio);
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        };

        const task = { frame: 0, resize, timer: null };

        const burst = () => {
            const bounds = canvas.getBoundingClientRect();
            const x = randomBetween(35, Math.max(36, bounds.width - 35));
            const y = randomBetween(30, Math.max(31, bounds.height * 0.58));
            const colour = colours[Math.floor(Math.random() * colours.length)];
            const count = reducedMotion ? 22 : 48;

            for (let index = 0; index < count; index += 1) {
                const angle = (Math.PI * 2 * index) / count;
                const speed = randomBetween(0.9, reducedMotion ? 2 : 3.5);
                particles.push({
                    x,
                    y,
                    velocityX: Math.cos(angle) * speed,
                    velocityY: Math.sin(angle) * speed,
                    life: randomBetween(48, 88),
                    maximumLife: 90,
                    colour,
                    size: randomBetween(1, 3)
                });
            }
        };

        const drawParticles = () => {
            const bounds = canvas.getBoundingClientRect();
            context.clearRect(0, 0, bounds.width, bounds.height);

            for (let index = particles.length - 1; index >= 0; index -= 1) {
                const particle = particles[index];
                particle.x += particle.velocityX;
                particle.y += particle.velocityY;
                particle.velocityY += 0.024;
                particle.velocityX *= 0.992;
                particle.life -= 1;

                context.globalAlpha = Math.max(0, particle.life / particle.maximumLife);
                context.fillStyle = particle.colour;
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();

                if (particle.life <= 0) particles.splice(index, 1);
            }

            context.globalAlpha = 1;
        };

        const finish = () => {
            running = false;
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('resize', resize);
            context.clearRect(0, 0, canvas.width / pixelRatio, canvas.height / pixelRatio);
            activeFireworks.delete(canvas);
        };

        resize();
        window.addEventListener('resize', resize);
        activeFireworks.set(canvas, task);

        if (reducedMotion) {
            burst();
            drawParticles();
            task.timer = window.setTimeout(finish, 1150);
            return;
        }

        const endAt = performance.now() + duration;
        const animate = now => {
            if (!running) return;

            if (now - lastBurst > 520 && now < endAt) {
                burst();
                lastBurst = now;
            }

            drawParticles();

            if (now < endAt || particles.length > 0) {
                frameId = window.requestAnimationFrame(animate);
                task.frame = frameId;
            } else {
                finish();
            }
        };

        frameId = window.requestAnimationFrame(animate);
        task.frame = frameId;
    }

    function makeDecorativeBalloon(container, options = {}) {
        if (!container) return null;
        const balloon = document.createElement('span');
        balloon.className = options.className || 'ambient-balloon';
        balloon.setAttribute('aria-hidden', 'true');
        balloon.textContent = options.symbol || ['♡', '✧', 'ღ', '✦'][Math.floor(Math.random() * 4)];
        const palette = ['#e9a9c5', '#c98ab7', '#f0c5d7', '#b78abf', '#f2d6df', '#d99ab7'];
        balloon.style.left = `${randomBetween(2, 96)}%`;
        balloon.style.setProperty('--balloon-tint', palette[Math.floor(Math.random() * palette.length)]);
        balloon.style.setProperty('--balloon-size', `${randomBetween(0.72, 1.22).toFixed(2)}`);
        balloon.style.setProperty('--balloon-drift', `${randomBetween(-55, 55).toFixed(0)}px`);
        balloon.style.animationDuration = `${randomBetween(options.minDuration || 13, options.maxDuration || 23).toFixed(1)}s`;
        balloon.style.animationDelay = `${randomBetween(-3, 0).toFixed(1)}s`;
        container.appendChild(balloon);
        balloon.addEventListener('animationend', () => balloon.remove(), { once: true });
        window.setTimeout(() => balloon.remove(), 26000);
        return balloon;
    }

    function seedIntroAtmosphere() {
        const garden = byId('intro-balloon-garden');
        const petals = byId('intro-petal-garden');
        if (garden && !garden.dataset.seeded) {
            garden.dataset.seeded = 'true';
            for (let index = 0; index < 21; index += 1) {
                const balloon = makeDecorativeBalloon(garden, { minDuration: 14, maxDuration: 24 });
                if (balloon) balloon.style.animationDelay = `${randomBetween(-22, 0).toFixed(1)}s`;
            }
        }
        if (petals && !petals.dataset.seeded) {
            petals.dataset.seeded = 'true';
            for (let index = 0; index < 17; index += 1) {
                const petal = document.createElement('span');
                petal.className = 'intro-floating-petal';
                petal.setAttribute('aria-hidden', 'true');
                petal.textContent = ['✧', '·', '♡', '❀'][index % 4];
                petal.style.left = `${randomBetween(1, 98)}%`;
                petal.style.animationDuration = `${randomBetween(13, 24).toFixed(1)}s`;
                petal.style.animationDelay = `${randomBetween(-22, 0).toFixed(1)}s`;
                petals.appendChild(petal);
            }
        }
    }

    function createCelebrationBalloons() {
        const layer = byId('celebration-balloon-container');
        if (!layer) return;
        layer.replaceChildren();
        for (let index = 0; index < 30; index += 1) {
            const balloon = makeDecorativeBalloon(layer, {
                className: 'celebration-balloon', minDuration: 8, maxDuration: 15
            });
            if (balloon) {
                balloon.style.animationDelay = `${randomBetween(-13, 0).toFixed(1)}s`;
                balloon.style.left = `${(index * 3.5 + randomBetween(0, 7)) % 100}%`;
            }
        }
        // A second, smaller wave arrives after the birthday message appears.
        window.setTimeout(() => {
            if (!celebration?.hidden) {
                for (let index = 0; index < 12; index += 1) {
                    makeDecorativeBalloon(layer, { className: 'celebration-balloon', minDuration: 9, maxDuration: 16 });
                }
            }
        }, 1700);
    }

    async function playWhistle() {
        if (celebrationStarted || whistleInProgress) return;
        whistleInProgress = true;

        const status = byId('whistle-status');
        const button = byId('blow-whistle-button');
        const microphoneButton = byId('microphone-whistle-button');

        if (button) button.disabled = true;
        if (microphoneButton) microphoneButton.disabled = true;
        if (status) status.textContent = 'your surprise is opening... ♡';

        await sleep(900);

        celebrationStarted = true;
        window.clearTimeout(toastTimer);
        hideElement(byId('website-toast'));
        showElement(celebration);
        createCelebrationBalloons();
        launchFireworks(byId('fireworks-canvas'), 6500);

        if (status) status.textContent = 'happy birthday, priti ♡';
        if (button) button.disabled = false;
        if (microphoneButton) microphoneButton.disabled = false;
    }

    byId('blow-whistle-button')?.addEventListener('click', playWhistle);

    /* ------------------------------------------------------------
       04. optional microphone detection for the whistle and candles
       ------------------------------------------------------------ */

    async function listenForSound({
        button,
        statusId,
        mode,
        timeoutMessage,
        onDetected,
        timeoutMilliseconds = 8500
    }) {
        if (!button || button.disabled) return;

        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus(statusId, 'microphone is not available here — use the button instead');
            return;
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            setStatus(statusId, 'microphone sound detection is not supported here — use the button instead');
            return;
        }

        let stream = null;
        let audioContext = null;
        let animationFrame = 0;
        let active = true;
        let consecutiveHits = 0;
        let cleanedUp = false;

        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            active = false;
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            if (stream) stream.getTracks().forEach(track => track.stop());
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close().catch(() => {});
            }
            button.disabled = false;
        };

        button.disabled = true;

        try {
            setStatus(
                statusId,
                mode === 'whistle'
                    ? 'listening for your little whistle...'
                    : 'listening... blow gently towards your microphone'
            );

            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new AudioContextClass();
            await audioContext.resume().catch(() => {});

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 1024;
            audioContext.createMediaStreamSource(stream).connect(analyser);

            const samples = new Uint8Array(analyser.frequencyBinCount);
            const startedAt = performance.now();

            const measureSound = () => {
                if (mode === 'whistle') {
                    analyser.getByteFrequencyData(samples);
                    let total = 0;
                    let count = 0;
                    const firstBin = Math.floor(samples.length * 0.045);
                    const lastBin = Math.floor(samples.length * 0.22);

                    for (let index = firstBin; index < lastBin; index += 1) {
                        total += samples[index];
                        count += 1;
                    }

                    return count ? total / count : 0;
                }

                analyser.getByteTimeDomainData(samples);
                let total = 0;
                for (const sample of samples) total += Math.abs(sample - 128);
                return total / samples.length;
            };

            const threshold = mode === 'whistle' ? 17 : 10.5;
            const check = () => {
                if (!active) return;

                if (document.hidden) {
                    cleanup();
                    setStatus(statusId, 'microphone check paused — tap the button again or use the button below');
                    return;
                }

                if (measureSound() >= threshold) consecutiveHits += 1;
                else consecutiveHits = Math.max(0, consecutiveHits - 1);

                if (consecutiveHits >= 3) {
                    cleanup();
                    onDetected();
                    return;
                }

                if (performance.now() - startedAt >= timeoutMilliseconds) {
                    cleanup();
                    setStatus(statusId, timeoutMessage);
                    return;
                }

                animationFrame = window.requestAnimationFrame(check);
            };

            animationFrame = window.requestAnimationFrame(check);
        } catch (error) {
            cleanup();
            const message = error?.name === 'NotAllowedError'
                ? 'microphone permission was not granted — use the button instead'
                : 'could not access the microphone — use the button instead';
            setStatus(statusId, message);
        }
    }

    byId('microphone-whistle-button')?.addEventListener('click', event => {
        listenForSound({
            button: event.currentTarget,
            statusId: 'whistle-status',
            mode: 'whistle',
            timeoutMilliseconds: 9000,
            timeoutMessage: 'we did not catch a whistle — tap the blow whistle button instead',
            onDetected: playWhistle
        });
    });

    /* The opening and hero countdowns are synchronized by the standalone engine above. */

    byId('continue-to-website-button')?.addEventListener('click', () => {
        hideElement(celebration);
        showElement(mainSite);
        hideLoading();
        byId('home')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
        startFloatingBalloons();
        updateScrollUI();
    });

    /* ------------------------------------------------------------
       05. navigation, mobile menu and scroll states
       ------------------------------------------------------------ */

    const menuButton = byId('mobile-menu-toggle');
    const navigation = byId('main-navigation');
    const topButton = byId('back-to-top-button');

    const closeNavigation = () => {
        menuButton?.setAttribute('aria-expanded', 'false');
        menuButton?.setAttribute('aria-label', 'open navigation menu');
        navigation?.classList.remove('is-open', 'open');
    };

    menuButton?.addEventListener('click', () => {
        const open = menuButton.getAttribute('aria-expanded') !== 'true';
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'close navigation menu' : 'open navigation menu');
        navigation?.classList.toggle('is-open', open);
        navigation?.classList.toggle('open', open);
    });

    $$('.navigation-link, .site-logo').forEach(link => {
        link.addEventListener('click', closeNavigation);
    });

    function updateScrollUI() {
        topButton?.classList.toggle('is-visible', window.scrollY > 550);
    }

    window.addEventListener('scroll', updateScrollUI, { passive: true });
    updateScrollUI();

    const navigationSections = ['home', 'memories', 'videos', 'starlight-game', 'birthday-letter', 'birthday-celebration', 'little-studio']
        .map(byId)
        .filter(Boolean);

    /* Four explored chapters unlock a final note. It is optional and can be replayed. */
    const secretMilestones = new Set(['memories', 'videos', 'birthday-letter', 'birthday-celebration']);
    const visitedMilestones = new Set();
    const secretTrigger = byId('secret-star-trigger');
    const secretButton = byId('secret-star-button');
    const secretOverlay = byId('secret-surprise-overlay');
    const secretCloseButton = byId('secret-surprise-close');
    const secretFinishButton = byId('secret-surprise-finish');
    const secretLines = $$('.secret-note-line', secretOverlay || document);
    let secretIsUnlocked = false;
    let secretReturnFocus = null;
    let secretRevealTimers = [];
    let secretCloseTimer = null;

    const markMilestoneVisited = id => {
        if (!secretMilestones.has(id) || visitedMilestones.has(id)) return;
        visitedMilestones.add(id);
        if (!secretIsUnlocked && visitedMilestones.size === secretMilestones.size) {
            secretIsUnlocked = true;
            showElement(secretTrigger);
            secretTrigger?.classList.add('is-unlocked');
            toast('you found all four little stars — one last surprise has appeared ✨');
        }
    };

    const openSecretSurprise = () => {
        if (!secretIsUnlocked || !secretOverlay) return;
        secretReturnFocus = document.activeElement;
        window.clearTimeout(secretCloseTimer);
        secretRevealTimers.forEach(window.clearTimeout);
        secretRevealTimers = [];
        secretLines.forEach(line => line.classList.remove('is-visible'));
        secretOverlay.hidden = false;
        secretOverlay.classList.remove('is-visible');
        window.requestAnimationFrame(() => secretOverlay.classList.add('is-visible'));
        secretLines.forEach((line, index) => {
            const delay = reducedMotion ? 0 : 520 + index * 760;
            secretRevealTimers.push(window.setTimeout(() => line.classList.add('is-visible'), delay));
        });
        secretCloseButton?.focus();
    };

    const closeSecretSurprise = () => {
        if (!secretOverlay || secretOverlay.hidden) return;
        secretOverlay.classList.remove('is-visible');
        window.clearTimeout(secretCloseTimer);
        secretCloseTimer = window.setTimeout(() => { secretOverlay.hidden = true; }, reducedMotion ? 0 : 240);
        secretRevealTimers.forEach(window.clearTimeout);
        secretRevealTimers = [];
        if (secretReturnFocus && typeof secretReturnFocus.focus === 'function') secretReturnFocus.focus();
    };

    secretButton?.addEventListener('click', openSecretSurprise);
    secretCloseButton?.addEventListener('click', closeSecretSurprise);
    secretFinishButton?.addEventListener('click', closeSecretSurprise);
    secretOverlay?.addEventListener('click', event => {
        if (event.target === secretOverlay) closeSecretSurprise();
    });
    document.addEventListener('keydown', event => {
        if (!secretOverlay || secretOverlay.hidden) return;
        if (event.key === 'Escape') {
            closeSecretSurprise();
        } else if (event.key === 'Tab') {
            const focusable = $$('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])', secretOverlay)
                .filter(element => !element.hidden);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    if ('IntersectionObserver' in window && navigationSections.length) {
        const sectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                markMilestoneVisited(entry.target.id);
                const hash = `#${entry.target.id}`;
                $$('.navigation-link').forEach(link => {
                    const active = link.getAttribute('href') === hash;
                    link.classList.toggle('active', active);
                    if (active) link.setAttribute('aria-current', 'location');
                    else link.removeAttribute('aria-current');
                });
            });
        }, { rootMargin: '-28% 0px -58% 0px', threshold: 0 });

        navigationSections.forEach(section => sectionObserver.observe(section));
    } else {
        const checkVisibleMilestones = () => {
            secretMilestones.forEach(id => {
                const section = byId(id);
                if (!section) return;
                const bounds = section.getBoundingClientRect();
                if (bounds.top < window.innerHeight * 0.72 && bounds.bottom > window.innerHeight * 0.24) {
                    markMilestoneVisited(id);
                }
            });
        };
        window.addEventListener('scroll', checkVisibleMilestones, { passive: true });
        checkVisibleMilestones();
    }

    /* ------------------------------------------------------------
       05b. one-minute birthday mini-game — Catch the Starlight
       ------------------------------------------------------------ */

    const starlightGame = (() => {
        const playfield = byId('starlight-playfield');
        const targetLayer = byId('starlight-target-layer');
        const startButton = byId('starlight-start-button');
        const replayButton = byId('starlight-replay-button');
        const pauseButton = byId('starlight-pause-button');
        const readyOverlay = byId('starlight-ready-overlay');
        const resultOverlay = byId('starlight-result-overlay');
        if (!playfield || !targetLayer || !startButton || !pauseButton) return null;

        const GOAL = 26;
        const ROUND_MS = 60_000;
        const BEST_KEY = 'priti-starlight-best-v1';
        const ui = {
            time: byId('starlight-time'),
            score: byId('starlight-score'),
            streak: byId('starlight-streak'),
            best: byId('starlight-best'),
            progress: byId('starlight-progress'),
            progressFill: byId('starlight-progress-fill'),
            progressLabel: byId('starlight-progress-label'),
            status: byId('starlight-game-status'),
            skyName: byId('starlight-sky-name'),
            resultKicker: byId('starlight-result-kicker'),
            resultTitle: byId('starlight-result-title'),
            resultMessage: byId('starlight-result-message'),
            resultOrnament: byId('starlight-result-ornament')
        };

        const skies = [
            { file: 'starlight-garden.jpg', name: 'rose starlight garden' },
            { file: 'rose-moonlight.jpg', name: 'rose moonlight' },
            { file: 'lavender-dream.jpg', name: 'lavender dream' },
            { file: 'blush-comets.jpg', name: 'blush comet sky' },
            { file: 'pearl-galaxy.jpg', name: 'pearl galaxy' },
            { file: 'orchid-night.jpg', name: 'orchid midnight' },
            { file: 'rose-gold-dawn.jpg', name: 'rose-gold dawn' },
            { file: 'starlight-victory.jpg', name: 'the birthday constellation' }
        ];

        const state = {
            mode: 'ready',
            skyIndex: -1,
            score: 0,
            streak: 0,
            best: 0,
            remainingMs: ROUND_MS,
            deadline: 0,
            tickTimer: null,
            spawnTimer: null,
            targetTimers: new Set()
        };

        try {
            const saved = Number(window.localStorage.getItem(BEST_KEY));
            state.best = Number.isFinite(saved) && saved > 0 ? Math.min(999, saved) : 0;
        } catch (_) {
            state.best = 0;
        }

        const updateStats = () => {
            const seconds = Math.ceil(state.remainingMs / 1000);
            if (ui.time) ui.time.textContent = String(Math.max(0, seconds)).padStart(2, '0');
            if (ui.score) ui.score.textContent = String(state.score);
            if (ui.streak) ui.streak.textContent = String(state.streak);
            if (ui.best) ui.best.textContent = String(state.best);
            if (ui.progressLabel) ui.progressLabel.textContent = `${Math.min(state.score, GOAL)} / ${GOAL}`;
            if (ui.progressFill) ui.progressFill.style.width = `${Math.min(100, state.score / GOAL * 100)}%`;
            if (ui.progress) ui.progress.setAttribute('aria-valuenow', String(Math.min(GOAL, state.score)));
            playfield.classList.toggle('is-urgent', state.mode === 'playing' && seconds <= 10);
        };

        const setStatus = message => {
            if (ui.status) ui.status.textContent = message;
        };

        const clearTargetTimers = () => {
            state.targetTimers.forEach(timer => window.clearTimeout(timer));
            state.targetTimers.clear();
        };

        const clearTargets = () => {
            clearTargetTimers();
            targetLayer.replaceChildren();
        };

        const stopClocks = () => {
            window.clearInterval(state.tickTimer);
            window.clearInterval(state.spawnTimer);
            state.tickTimer = null;
            state.spawnTimer = null;
        };

        const saveBest = () => {
            if (state.score <= state.best) return;
            state.best = state.score;
            try { window.localStorage.setItem(BEST_KEY, String(state.best)); } catch (_) { /* private browsing can disable storage */ }
        };

        const updateResult = won => {
            if (ui.resultKicker) ui.resultKicker.textContent = won ? 'the sky is celebrating you' : 'a little more starlight next time';
            if (ui.resultTitle) ui.resultTitle.textContent = won ? 'you caught the starlight!' : 'the stars are still waiting';
            if (ui.resultMessage) {
                ui.resultMessage.textContent = won
                    ? `26 points, one beautiful minute, and a little sky gathered just for you, priti. happy birthday ♡`
                    : `you collected ${state.score} points this time. every try makes the next constellation brighter — give it another go ♡`;
            }
            if (ui.resultOrnament) ui.resultOrnament.textContent = won ? '✧ ♡ ✧' : '☾ ✧ ♡';
            showElement(resultOverlay);
            if (readyOverlay) hideElement(readyOverlay);
        };

        const finishRound = won => {
            if (state.mode !== 'playing' && state.mode !== 'paused') return;
            stopClocks();
            state.mode = won ? 'won' : 'finished';
            state.remainingMs = won ? state.remainingMs : 0;
            saveBest();
            updateStats();
            clearTargets();
            pauseButton.disabled = true;
            pauseButton.textContent = 'pause';
            updateResult(won);
            setStatus(won ? 'you did it — 26 little points for priti! ✨' : 'time is up — your little constellation is still lovely ♡');
            if (won) {
                playfield.classList.add('is-won');
                launchFireworks(byId('starlight-game-fireworks'), 3600);
                toast('you caught the starlight for priti ✨');
            } else {
                playfield.classList.remove('is-won');
            }
        };

        const removeTarget = target => {
            if (!target || !target.isConnected) return;
            target.classList.add('is-fading');
            window.setTimeout(() => target.remove(), reducedMotion ? 0 : 160);
        };

        const spawnTarget = () => {
            if (state.mode !== 'playing') return;
            const active = targetLayer.querySelectorAll('.starlight-target:not(.is-fading)');
            if (active.length >= 7) removeTarget(active[0]);

            const roll = Math.random();
            const kind = roll < 0.70 ? 'star' : roll < 0.91 ? 'heart' : 'cloud';
            const symbols = { star: '✦', heart: '♡', cloud: '☁' };
            const names = { star: 'golden star, one point', heart: 'bonus heart, three points', cloud: 'sleepy cloud, avoid this one' };
            const target = document.createElement('button');
            target.type = 'button';
            target.className = `starlight-target starlight-target-${kind}`;
            target.dataset.kind = kind;
            target.setAttribute('aria-label', names[kind]);
            target.textContent = symbols[kind];
            const left = randomBetween(9, 91);
            const top = randomBetween(20, 83);
            target.style.left = `${left}%`;
            target.style.top = `${top}%`;
            target.style.setProperty('--target-drift', `${randomBetween(-14, 14).toFixed(1)}px`);
            target.style.setProperty('--target-delay', `${randomBetween(0, 1.2).toFixed(2)}s`);
            targetLayer.appendChild(target);

            const timer = window.setTimeout(() => {
                state.targetTimers.delete(timer);
                if (target.isConnected) removeTarget(target);
            }, randomBetween(1700, 2350));
            state.targetTimers.add(timer);
        };

        const startClocks = () => {
            state.deadline = Date.now() + state.remainingMs;
            state.tickTimer = window.setInterval(() => {
                state.remainingMs = Math.max(0, state.deadline - Date.now());
                updateStats();
                if (state.remainingMs <= 0) finishRound(false);
            }, 100);
            state.spawnTimer = window.setInterval(spawnTarget, 620);
            spawnTarget();
        };

        const beginRound = () => {
            stopClocks();
            clearTargets();
            state.score = 0;
            state.streak = 0;
            state.remainingMs = ROUND_MS;
            state.mode = 'playing';
            state.skyIndex = (state.skyIndex + 1) % skies.length;
            const selectedSky = skies[state.skyIndex];
            const gameArt = $('.starlight-game-art', playfield);
            if (gameArt) gameArt.src = `assets/images/${selectedSky.file}`;
            if (ui.skyName) ui.skyName.textContent = selectedSky.name;
            playfield.classList.remove('is-won', 'is-urgent');
            hideElement(resultOverlay);
            hideElement(readyOverlay);
            pauseButton.disabled = false;
            pauseButton.textContent = 'pause';
            updateStats();
            setStatus('the sky is open — catch those little stars!');
            startClocks();
        };

        const togglePause = () => {
            if (state.mode === 'playing') {
                state.remainingMs = Math.max(0, state.deadline - Date.now());
                stopClocks();
                state.mode = 'paused';
                clearTargets();
                pauseButton.textContent = 'resume';
                setStatus('time paused — take a breath, then return to your little sky');
                updateStats();
                return;
            }
            if (state.mode === 'paused') {
                state.mode = 'playing';
                pauseButton.textContent = 'pause';
                setStatus('back to the stars — you have this!');
                startClocks();
            }
        };

        targetLayer.addEventListener('click', event => {
            const target = event.target.closest('.starlight-target');
            if (!target || state.mode !== 'playing' || !target.isConnected) return;
            const kind = target.dataset.kind;
            target.disabled = true;
            if (kind === 'cloud') {
                state.score = Math.max(0, state.score - 2);
                state.streak = 0;
                setStatus('oops, a sleepy cloud! minus 2 — find a golden star or heart ♡');
                target.classList.add('is-cloud-hit');
            } else {
                const points = kind === 'heart' ? 3 : 1;
                state.score += points;
                state.streak += 1;
                const combo = state.streak > 0 && state.streak % 5 === 0;
                if (combo) state.score += 2;
                setStatus(combo
                    ? `beautiful streak of ${state.streak}! a +2 constellation bonus ✨`
                    : kind === 'heart' ? '+3 bonus points — a little heart found you ♡' : '+1 point — keep gathering the stars ✦');
                target.classList.add('is-caught');
            }
            removeTarget(target);
            if (state.score > state.best) saveBest();
            updateStats();
            if (state.score >= GOAL) finishRound(true);
        });

        startButton.addEventListener('click', beginRound);
        replayButton?.addEventListener('click', beginRound);
        pauseButton.addEventListener('click', togglePause);
        updateStats();
        return { beginRound, getState: () => ({ mode: state.mode, score: state.score, best: state.best }) };
    })();

    /* ------------------------------------------------------------
       06. birthday music player
       ------------------------------------------------------------ */

    const audio = byId('birthday-audio');
    const playButton = byId('music-play-button');
    const progress = byId('music-progress-bar');
    const currentTimeLabel = byId('music-current-time');
    const durationLabel = byId('music-duration');
    const volume = byId('music-volume-bar');
    const musicPlayer = byId('floating-music-player');
    const musicContent = byId('music-player-content');
    const minimizeButton = byId('music-player-minimize');
    const musicCover = byId('music-cover-image');
    const musicAlbumArt = musicCover?.closest('.music-album-art');
    if (musicCover && musicAlbumArt) {
        musicAlbumArt.classList.add('is-empty');
        const syncMusicCover = () => markMediaEmpty(musicAlbumArt, !(musicCover.complete && musicCover.naturalWidth > 0));
        musicCover.addEventListener('load', syncMusicCover);
        musicCover.addEventListener('error', syncMusicCover);
        if (musicCover.complete) syncMusicCover();
    }

    const formatTime = seconds => {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const updateMusicButton = playing => {
        if (playButton) {
            playButton.setAttribute('aria-pressed', String(playing));
            playButton.setAttribute('aria-label', playing ? 'pause birthday music' : 'play birthday music');

            const playIcon = $('.music-play-icon', playButton);
            const pauseIcon = $('.music-pause-icon', playButton);
            if (playIcon) playIcon.hidden = playing;
            if (pauseIcon) pauseIcon.hidden = !playing;
        }

        byId('music-vinyl-decoration')?.classList.toggle('is-playing', playing);
        musicPlayer?.classList.toggle('is-playing', playing);
    };

    const seekAudio = value => {
        if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = (audio.duration * Number(value)) / 100;
    };

    playButton?.addEventListener('click', async () => {
        if (!audio) return;

        if (audio.paused) {
            try {
                await audio.play();
                updateMusicButton(true);
            } catch {
                toast('add your birthday-song.mp3 file to the music folder first');
                updateMusicButton(false);
            }
        } else {
            audio.pause();
            updateMusicButton(false);
        }
    });

    audio?.addEventListener('play', () => updateMusicButton(true));
    audio?.addEventListener('pause', () => updateMusicButton(false));
    audio?.addEventListener('ended', () => updateMusicButton(false));

    audio?.addEventListener('loadedmetadata', () => {
        if (durationLabel) durationLabel.textContent = formatTime(audio.duration);
        if (currentTimeLabel) currentTimeLabel.textContent = formatTime(audio.currentTime);
    });

    audio?.addEventListener('timeupdate', () => {
        if (progress && Number.isFinite(audio.duration) && audio.duration > 0) {
            progress.value = String((audio.currentTime / audio.duration) * 100);
        }
        if (currentTimeLabel) currentTimeLabel.textContent = formatTime(audio.currentTime);
    });

    audio?.addEventListener('error', () => {
        updateMusicButton(false);
        setStatus('music-track-title', 'your birthday song goes here');
        setStatus('music-track-artist', 'add birthday-song.mp3 to assets/music');
    });

    progress?.addEventListener('input', () => seekAudio(progress.value));

    if (audio && volume) {
        audio.volume = Math.min(1, Math.max(0, Number(volume.value)));
        volume.addEventListener('input', () => {
            audio.volume = Math.min(1, Math.max(0, Number(volume.value)));
        });
    }

    minimizeButton?.addEventListener('click', () => {
        const expanded = minimizeButton.getAttribute('aria-expanded') !== 'false';
        const minimized = expanded;

        minimizeButton.setAttribute('aria-expanded', String(!minimized));
        minimizeButton.setAttribute('aria-label', minimized ? 'expand music player' : 'minimize music player');
        minimizeButton.textContent = minimized ? '+' : '−';
        musicPlayer?.classList.toggle('is-minimized', minimized);
        if (musicContent) musicContent.hidden = minimized;
    });

    // The supplied HTML contains one song, so previous and next restart that song.
    ['music-previous-button', 'music-next-button'].forEach(id => {
        const button = byId(id);
        if (button) {
            button.setAttribute('aria-label', 'restart birthday music');
            button.title = 'restart birthday music';
        }
        button?.addEventListener('click', async () => {
            if (!audio) return;
            try {
                audio.currentTime = 0;
                await audio.play();
            } catch {
                toast('add your birthday-song.mp3 file to assets/music first');
            }
        });
    });

    /* ------------------------------------------------------------
       07. floating compliment balloons
       ------------------------------------------------------------ */

    const compliments = [
        'you make ordinary moments feel special ♡',
        'your smile deserves its own sunshine',
        'you are a little piece of magic',
        'the world is brighter with you in it',
        'you deserve every beautiful thing coming your way',
        'never stop being wonderfully you',
        'your kindness is a kind of beauty',
        'you are more loved than words can say',
        'keep shining, birthday girl ✧',
        'you make memories worth keeping',
        'your laugh is a lovely little melody',
        'you are someone worth celebrating every day',
        'may your dreams always find their way to you',
        'you are beautiful in your own way ♡',
        'you bring warmth wherever you go',
        'there is nobody quite like you',
        'you deserve a day filled with little wonders',
        'your presence makes the ordinary feel golden',
        'may today be as lovely as your heart',
        'you are allowed to take up space and shine',
        'your story is still becoming something beautiful',
        'you make the world a softer place',
        'may every new chapter be kind to you',
        'you are a reason to celebrate today and always'
    ];

    const popup = byId('compliment-popup');
    const popupMessage = byId('compliment-popup-message');
    let balloonsStarted = false;
    let nextBalloonTimer = null;

    const showCompliment = () => {
        if (popupMessage) {
            popupMessage.textContent = compliments[Math.floor(Math.random() * compliments.length)];
        }
        if (popup) {
            popup.hidden = false;
            popup.classList.remove('is-visible');
            window.requestAnimationFrame(() => popup.classList.add('is-visible'));
        }
    };

    byId('compliment-close-button')?.addEventListener('click', () => hideElement(popup));

    function spawnFloatingBalloon() {
        const layer = byId('floating-balloon-layer');
        if (!layer || document.hidden) return;
        while (layer.children.length >= 34) layer.firstElementChild?.remove();

        const balloon = document.createElement('button');
        balloon.type = 'button';
        balloon.className = 'floating-balloon';
        balloon.setAttribute('aria-label', 'pop a balloon for a compliment');
        balloon.textContent = ['♡', '✧', 'ღ', '✦'][Math.floor(Math.random() * 4)];
        balloon.style.left = `${randomBetween(1, 97)}%`;
        balloon.style.setProperty('--balloon-tint', ['#e9a9c5', '#c98ab7', '#f0c5d7', '#b78abf', '#f2d6df'][Math.floor(Math.random() * 5)]);
        balloon.style.setProperty('--balloon-size', randomBetween(0.76, 1.24).toFixed(2));
        balloon.style.setProperty('--balloon-drift', `${randomBetween(-60, 60).toFixed(0)}px`);

        if (reducedMotion) {
            balloon.style.animation = 'none';
            balloon.style.bottom = `${randomBetween(18, 34)}%`;
        } else {
            balloon.style.animationDuration = `${randomBetween(12, 19)}s`;
        }

        balloon.addEventListener('click', () => {
            showCompliment();
            if (typeof balloon.animate === 'function' && !reducedMotion) {
                balloon.animate(
                    [
                        { opacity: 1, transform: 'scale(1)' },
                        { opacity: 0, transform: 'scale(1.35)' }
                    ],
                    { duration: 230, easing: 'ease-out', fill: 'forwards' }
                ).finished.finally(() => balloon.remove());
            } else {
                balloon.remove();
            }
        }, { once: true });

        balloon.addEventListener('animationend', () => balloon.remove(), { once: true });
        layer.appendChild(balloon);
        window.setTimeout(() => balloon.remove(), reducedMotion ? 7000 : 22000);
    }

    function scheduleNextBalloon() {
        if (!balloonsStarted || document.hidden) return;
        window.clearTimeout(nextBalloonTimer);
        nextBalloonTimer = window.setTimeout(() => {
            spawnFloatingBalloon();
            scheduleNextBalloon();
        }, reducedMotion ? 7000 : randomBetween(720, 1320));
    }

    function startFloatingBalloons() {
        if (balloonsStarted) return;
        balloonsStarted = true;

        for (let index = 0; index < 16; index += 1) {
            window.setTimeout(spawnFloatingBalloon, index * 180);
        }

        scheduleNextBalloon();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            window.clearTimeout(nextBalloonTimer);
        } else if (balloonsStarted) {
            scheduleNextBalloon();
        }
    });

    /* ------------------------------------------------------------
       08. photograph lightbox and resilient image placeholders
       ------------------------------------------------------------ */

    const mediaImagePairs = [
        ...$$('.hero-main-photo').map(image => [image, image.closest('.hero-image-inner')]),
        ...$$('.memory-photo-border img').map(image => [image, image.closest('.memory-photo-border')]),
        ...$$('.birthday-feature-image').map(image => [image, image.closest('.birthday-feature-image-button')])
    ];

    mediaImagePairs.forEach(([image, wrapper]) => {
        if (!image || !wrapper) return;
        const syncImageState = () => {
            const loaded = image.complete && image.naturalWidth > 0;
            markMediaEmpty(wrapper, !loaded);
        };
        wrapper.classList.add('is-empty');
        image.addEventListener('load', syncImageState);
        image.addEventListener('error', syncImageState);
        if (image.complete) syncImageState();
    });

    const photoButtons = $$('[data-lightbox]');
    const getAvailablePhotoButtons = () => photoButtons.filter(button => {
        const image = $('img', button);
        return Boolean(image && image.complete && image.naturalWidth > 0 && button.dataset.lightbox);
    });
    let activePhotoButtons = [];
    const lightbox = byId('photo-lightbox');
    const lightboxImage = byId('lightbox-image');
    const lightboxCaption = byId('lightbox-caption');
    const lightboxCloseButton = byId('lightbox-close-button');
    let photoIndex = 0;
    let lastPhotoTrigger = null;
    let previousBodyOverflow = '';

    const showPhoto = index => {
        if (!activePhotoButtons.length || !lightboxImage) return;

        photoIndex = (index + activePhotoButtons.length) % activePhotoButtons.length;
        const button = activePhotoButtons[photoIndex];
        const image = $('img', button);
        if (!image) return;

        lightboxImage.src = button.dataset.lightbox;
        lightboxImage.alt = image.alt || `birthday memory ${photoIndex + 1}`;
        lightboxImage.parentElement?.classList.remove('is-empty');

        if (lightboxCaption) {
            const description = button.getAttribute('aria-label') || image.alt || 'a little memory';
            lightboxCaption.textContent = `${description} · ${String(photoIndex + 1).padStart(2, '0')} of ${String(activePhotoButtons.length).padStart(2, '0')}`;
        }
    };

    const openLightbox = button => {
        if (!lightbox) return;
        const clickedImage = $('img', button);
        if (!clickedImage || !clickedImage.complete || !clickedImage.naturalWidth) {
            toast(clickedImage?.complete ? 'this photograph is not in the photos folder yet' : 'this photograph is still loading — tap it again in a moment');
            return;
        }

        activePhotoButtons = getAvailablePhotoButtons();
        const selectedIndex = activePhotoButtons.indexOf(button);
        if (selectedIndex < 0) return;

        lastPhotoTrigger = document.activeElement;
        showPhoto(selectedIndex);
        lightbox.hidden = false;
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        lightboxCloseButton?.focus();
    };

    const closeLightbox = () => {
        if (!lightbox || lightbox.hidden) return;
        lightbox.hidden = true;
        document.body.style.overflow = previousBodyOverflow;
        if (lastPhotoTrigger && typeof lastPhotoTrigger.focus === 'function') lastPhotoTrigger.focus();
    };

    photoButtons.forEach(button => {
        button.addEventListener('click', () => openLightbox(button));
    });

    lightboxCloseButton?.addEventListener('click', closeLightbox);
    lightboxImage?.addEventListener('error', () => {
        lightboxImage.parentElement?.classList.add('is-empty');
        if (lightboxCaption) lightboxCaption.textContent = 'add this photograph to assets/photos to view it here';
    });
    byId('lightbox-previous-button')?.addEventListener('click', () => showPhoto(photoIndex - 1));
    byId('lightbox-next-button')?.addEventListener('click', () => showPhoto(photoIndex + 1));

    lightbox?.addEventListener('click', event => {
        if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', event => {
        if (!lightbox || lightbox.hidden) return;

        if (event.key === 'Escape') {
            closeLightbox();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            showPhoto(photoIndex - 1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            showPhoto(photoIndex + 1);
        } else if (event.key === 'Tab') {
            const focusable = $$('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])', lightbox)
                .filter(element => !element.hidden);
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    /* ------------------------------------------------------------
       09. the three birthday videos
       ------------------------------------------------------------ */

    const videos = $$('.birthday-video');

    const pauseOtherVideos = activeVideo => {
        videos.forEach(video => {
            if (video !== activeVideo) video.pause();
        });
    };

    const syncVideoState = video => {
        const card = video.closest('.video-card');
        const frame = video.closest('.video-frame');
        const toggle = card ? $('[data-video-toggle]', card) : null;
        const playing = !video.paused && !video.ended;

        card?.classList.toggle('is-playing', playing);
        frame?.classList.toggle('is-playing', playing);

        if (toggle) {
            toggle.setAttribute('aria-label', playing ? 'pause birthday video' : 'play birthday video');
            toggle.setAttribute('aria-pressed', String(playing));
        }
    };

    $$('[data-video-toggle]').forEach(button => {
        button.addEventListener('click', async () => {
            const video = byId(button.dataset.videoToggle);
            if (!video) return;

            if (video.paused) {
                pauseOtherVideos(video);
                try {
                    await video.play();
                } catch {
                    markMediaEmpty(video.closest('.video-frame'), true);
                    markMediaEmpty(video.closest('.video-card'), true);
                    toast('add the matching video file inside assets/videos');
                }
            } else {
                video.pause();
            }
        });
    });

    videos.forEach(video => {
        const frame = video.closest('.video-frame');
        const card = video.closest('.video-card');
        const markVideoEmpty = () => {
            markMediaEmpty(frame, true);
            markMediaEmpty(card, true);
        };
        const markVideoReady = () => {
            markMediaEmpty(frame, false);
            markMediaEmpty(card, false);
        };

        ['play', 'pause', 'ended'].forEach(eventName => {
            video.addEventListener(eventName, () => syncVideoState(video));
        });
        video.addEventListener('loadedmetadata', markVideoReady);
        video.addEventListener('error', () => {
            markVideoEmpty();
            const placeholderText = frame ? $('.video-placeholder small', frame) : null;
            if (placeholderText) placeholderText.textContent = `add ${video.id}.mp4 to assets/videos`;
        });
        if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) markVideoEmpty();
    });

    $$('[data-video-restart]').forEach(button => {
        button.addEventListener('click', async () => {
            const video = byId(button.dataset.videoRestart);
            if (!video) return;

            pauseOtherVideos(video);
            try {
                video.currentTime = 0;
                await video.play();
            } catch {
                markMediaEmpty(video.closest('.video-frame'), true);
                markMediaEmpty(video.closest('.video-card'), true);
                toast('add the matching video file inside assets/videos');
            }
        });
    });

    $$('[data-video-fullscreen]').forEach(button => {
        button.addEventListener('click', async () => {
            const video = byId(button.dataset.videoFullscreen);
            if (!video) return;

            try {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                } else if (video.requestFullscreen) {
                    await video.requestFullscreen();
                } else if (video.webkitEnterFullscreen) {
                    video.webkitEnterFullscreen();
                } else {
                    toast('full screen is not available in this browser');
                }
            } catch {
                toast('full screen is not available in this browser');
            }
        });
    });

    /* ------------------------------------------------------------
       10. open the birthday letter envelope
       ------------------------------------------------------------ */

    byId('open-envelope-button')?.addEventListener('click', () => {
        const envelope = byId('birthday-envelope');
        const paper = byId('birthday-letter-paper');
        const button = byId('open-envelope-button');

        envelope?.classList.add('is-open', 'open');

        if (button) {
            button.disabled = true;
            button.textContent = 'your letter is open ♡';
            button.setAttribute('aria-expanded', 'true');
        }

        if (paper) {
            paper.hidden = false;
            paper.classList.add('is-visible');
            paper.scrollIntoView({
                behavior: reducedMotion ? 'auto' : 'smooth',
                block: 'center'
            });
        }
    });

    /* ------------------------------------------------------------
       11. private birthday wish
       ------------------------------------------------------------ */

    byId('release-wish-button')?.addEventListener('click', () => {
        const confirmation = byId('wish-confirmation');
        showElement(confirmation);
        confirmation?.classList.add('is-visible');
        // Keep the typed wish visible; it stays in this page and is never uploaded.
        toast('your wish is yours to keep — may it come true ✧');
    });

    /* ------------------------------------------------------------
       12. candle blowing and cake cutting
       ------------------------------------------------------------ */

    const candleFlames = [
        'candle-flame-one',
        'candle-flame-two',
        'candle-flame-three',
        'candle-flame-four',
        'candle-flame-five'
    ].map(byId).filter(Boolean);

    const candleGroup = byId('birthday-candles');
    const cakeCuttingStage = byId('cake-cutting-stage');
    const cutCakeButton = byId('cut-cake-button');
    let candlesBlown = false;
    let cakeHasBeenCut = false;

    const releaseBirthdayBalloonShower = (count = 14) => {
        for (let index = 0; index < count; index += 1) {
            window.setTimeout(() => spawnFloatingBalloon(), index * 105);
        }
    };

    if (cutCakeButton) cutCakeButton.disabled = true;
    hideElement(cakeCuttingStage);

    const extinguishCandles = () => {
        if (candlesBlown) return;
        candlesBlown = true;

        candleGroup?.classList.add('candles-out');
        candleFlames.forEach((flame, index) => {
            window.setTimeout(() => {
                flame.classList.add('is-out');
                flame.closest('.birthday-candle')?.classList.add('is-blown-out');
            }, index * 145);
        });

        const microphoneButton = byId('blow-candles-microphone-button');
        const manualButton = byId('blow-candles-button');
        if (microphoneButton) microphoneButton.disabled = true;
        if (manualButton) manualButton.disabled = true;

        setStatus('candle-status-message', 'you did it — all your candles are out ♡');
        showElement(byId('candles-out-message'));
        showElement(cakeCuttingStage);
        cakeCuttingStage?.classList.add('is-visible');

        if (cutCakeButton) cutCakeButton.disabled = false;
        releaseBirthdayBalloonShower(12);
        toast('make a wish, birthday girl — look at all those wishes ✨');
    };

    byId('blow-candles-button')?.addEventListener('click', extinguishCandles);

    byId('blow-candles-microphone-button')?.addEventListener('click', event => {
        if (candlesBlown) return;
        listenForSound({
            button: event.currentTarget,
            statusId: 'candle-status-message',
            mode: 'blow',
            timeoutMilliseconds: 7500,
            timeoutMessage: 'we did not catch your blow — tap the blow out the candles button instead',
            onDetected: extinguishCandles
        });
    });

    cutCakeButton?.addEventListener('click', () => {
        if (!candlesBlown) {
            setStatus('cake-cutting-status', 'first, blow out all five candles ♡');
            return;
        }
        if (cakeHasBeenCut) return;
        cakeHasBeenCut = true;

        const visual = byId('cake-cutting-visual');
        const slice = visual ? $('.cake-slice-illustration', visual) : null;

        if (slice && typeof slice.animate === 'function' && !reducedMotion) {
            slice.animate(
                [
                    { transform: 'rotate(-4deg) translateX(0) translateY(0)' },
                    { transform: 'rotate(2deg) translateX(8px) translateY(-3px)' },
                    { transform: 'rotate(8deg) translateX(26px) translateY(-11px)' }
                ],
                {
                    duration: 850,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'forwards'
                }
            );
        }

        cutCakeButton.disabled = true;
        cutCakeButton.setAttribute('aria-label', 'cake cut with love');
        setStatus('cake-cutting-status', 'the cake is ready — happy birthday, priti!');
        showElement(byId('cake-cutting-celebration'));
        releaseBirthdayBalloonShower(20);
        toast('a whole sky of wishes, just for you ♡');
    });

    /* ------------------------------------------------------------
       13. drawing studio: brush, eraser, undo, redo and png download
       ------------------------------------------------------------ */

    const drawingCanvas = byId('birthday-drawing-canvas');

    if (drawingCanvas) {
        const drawingContext = drawingCanvas.getContext('2d', { willReadFrequently: true });
        const placeholder = byId('drawing-canvas-placeholder');
        const colourInput = byId('drawing-color');
        const sizeInput = byId('drawing-brush-size');
        const sizeOutput = byId('drawing-brush-size-value');
        const undoButton = byId('drawing-undo-button');
        const redoButton = byId('drawing-redo-button');

        if (drawingContext) {
            let drawing = false;
            let erasing = false;
            let lastPoint = null;
            let hasDrawing = false;
            let history = [];
            let historyIndex = -1;

            const updateHistoryButtons = () => {
                if (undoButton) undoButton.disabled = historyIndex <= 0;
                if (redoButton) redoButton.disabled = historyIndex < 0 || historyIndex >= history.length - 1;
            };

            const saveHistory = () => {
                try {
                    if (historyIndex < history.length - 1) {
                        history = history.slice(0, historyIndex + 1);
                    }

                    history.push({
                        image: drawingContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height),
                        hasDrawing
                    });

                    if (history.length > 40) history.shift();
                    historyIndex = history.length - 1;
                    updateHistoryButtons();
                } catch {
                    setStatus('drawing-status-message', 'drawing history is unavailable in this browser');
                }
            };

            const restoreHistory = index => {
                const entry = history[index];
                if (!entry) return;

                drawingContext.putImageData(entry.image, 0, 0);
                historyIndex = index;
                hasDrawing = entry.hasDrawing;
                if (placeholder) placeholder.hidden = hasDrawing;
                updateHistoryButtons();
            };

            const pointFromEvent = event => {
                const bounds = drawingCanvas.getBoundingClientRect();
                if (!bounds.width || !bounds.height) return null;

                return {
                    x: ((event.clientX - bounds.left) * drawingCanvas.width) / bounds.width,
                    y: ((event.clientY - bounds.top) * drawingCanvas.height) / bounds.height
                };
            };

            const startDrawing = event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;

                const point = pointFromEvent(event);
                if (!point) return;

                drawing = true;
                lastPoint = point;
                drawingCanvas.setPointerCapture?.(event.pointerId);

                drawingContext.beginPath();
                drawingContext.moveTo(point.x, point.y);
                drawingContext.lineCap = 'round';
                drawingContext.lineJoin = 'round';
                drawingContext.strokeStyle = colourInput?.value || '#e6a3c0';
                drawingContext.lineWidth = Number(sizeInput?.value || 5)
                    * (drawingCanvas.width / Math.max(1, drawingCanvas.getBoundingClientRect().width));
                drawingContext.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
                drawingContext.lineTo(point.x + 0.01, point.y + 0.01);
                drawingContext.stroke();

                hasDrawing = true;
                if (placeholder) placeholder.hidden = true;
                event.preventDefault();
            };

            const continueDrawing = event => {
                if (!drawing || !lastPoint) return;
                const point = pointFromEvent(event);
                if (!point) return;

                drawingContext.beginPath();
                drawingContext.moveTo(lastPoint.x, lastPoint.y);
                drawingContext.lineTo(point.x, point.y);
                drawingContext.stroke();
                lastPoint = point;
                event.preventDefault();
            };

            const finishDrawing = () => {
                if (!drawing) return;
                drawing = false;
                lastPoint = null;
                drawingContext.globalCompositeOperation = 'source-over';
                saveHistory();
                setStatus('drawing-status-message', 'your little masterpiece is taking shape ♡');
            };

            drawingCanvas.addEventListener('pointerdown', startDrawing);
            drawingCanvas.addEventListener('pointermove', continueDrawing);
            ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(eventName => {
                drawingCanvas.addEventListener(eventName, finishDrawing);
            });

            sizeInput?.addEventListener('input', () => {
                if (sizeOutput) {
                    sizeOutput.value = sizeInput.value;
                    sizeOutput.textContent = sizeInput.value;
                }
            });

            const setDrawingTool = useEraser => {
                erasing = useEraser;
                const brushButton = byId('drawing-brush-button');
                const eraserButton = byId('drawing-eraser-button');

                brushButton?.classList.toggle('active', !useEraser);
                eraserButton?.classList.toggle('active', useEraser);
                brushButton?.setAttribute('aria-pressed', String(!useEraser));
                eraserButton?.setAttribute('aria-pressed', String(useEraser));
            };

            byId('drawing-brush-button')?.addEventListener('click', () => setDrawingTool(false));
            byId('drawing-eraser-button')?.addEventListener('click', () => setDrawingTool(true));

            undoButton?.addEventListener('click', () => {
                if (historyIndex > 0) restoreHistory(historyIndex - 1);
            });

            redoButton?.addEventListener('click', () => {
                if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
            });

            byId('drawing-clear-button')?.addEventListener('click', () => {
                drawingContext.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                hasDrawing = false;
                if (placeholder) placeholder.hidden = false;
                saveHistory();
                setStatus('drawing-status-message', 'a fresh canvas, ready for a new little masterpiece');
            });

            byId('drawing-download-button')?.addEventListener('click', () => {
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = drawingCanvas.width;
                exportCanvas.height = drawingCanvas.height;

                const exportContext = exportCanvas.getContext('2d');
                if (!exportContext) {
                    setStatus('drawing-status-message', 'could not create the image — please try again');
                    return;
                }

                exportContext.fillStyle = '#fffafd';
                exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                exportContext.drawImage(drawingCanvas, 0, 0);

                exportCanvas.toBlob(blob => {
                    if (blob) {
                        downloadBlob(blob, 'priti-birthday-drawing.png');
                        setStatus('drawing-status-message', 'your drawing has been downloaded ♡');
                    } else {
                        setStatus('drawing-status-message', 'could not create the image — please try again');
                    }
                }, 'image/png');
            });

            updateHistoryButtons();
            saveHistory();
        }
    }

    /* ------------------------------------------------------------
       14. personal letter box and text download
       ------------------------------------------------------------ */

    const personalLetterDate = byId('personal-letter-date');
    const personalLetterTitle = byId('personal-letter-name');
    const personalLetterMessage = byId('personal-letter-message');

    if (personalLetterDate) {
        personalLetterDate.textContent = new Intl.DateTimeFormat('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date());
    }

    byId('personal-letter-clear-button')?.addEventListener('click', () => {
        if (personalLetterTitle) personalLetterTitle.value = '';
        if (personalLetterMessage) personalLetterMessage.value = '';
        setStatus('personal-letter-status', 'your letter box is ready for new words');
        personalLetterTitle?.focus();
    });

    byId('personal-letter-download-button')?.addEventListener('click', () => {
        const title = personalLetterTitle?.value.trim() || 'a little letter';
        const message = personalLetterMessage?.value.trim() || '';

        if (!message) {
            setStatus('personal-letter-status', 'write a few words first, then download your letter ♡');
            personalLetterMessage?.focus();
            return;
        }

        const date = personalLetterDate?.textContent || new Date().toLocaleDateString('en-IN');
        const contents = `${title}\n${date}\n\n${message}\n\n♡\n`;
        downloadText(contents, 'my-little-letter.txt');
        setStatus('personal-letter-status', 'your letter has been downloaded and stays yours ♡');
    });

    /* ------------------------------------------------------------
       15. birthday selfie booth
       ------------------------------------------------------------ */

    let cameraStream = null;
    const cameraPreview = byId('selfie-camera-preview');
    const capturedImage = byId('selfie-captured-image');
    const captureCanvas = byId('selfie-capture-canvas');
    const previewFrame = $('.selfie-preview-frame');
    const previewPlaceholder = byId('selfie-preview-placeholder');
    const startCameraButton = byId('selfie-start-camera-button');
    const captureButton = byId('selfie-capture-button');
    const retakeButton = byId('selfie-retake-button');
    const selfieDownloadButton = byId('selfie-download-button');

    const stopCamera = () => {
        if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        if (cameraPreview) cameraPreview.srcObject = null;
        previewFrame?.classList.remove('is-live');
    };

    const startCamera = async () => {
        if (!startCameraButton) return;

        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus('selfie-status-message', 'camera access needs a supported browser and a secure connection (HTTPS)');
            return;
        }

        startCameraButton.disabled = true;
        setStatus('selfie-status-message', 'opening your little photo booth...');

        try {
            stopCamera();
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 960 }
                },
                audio: false
            });

            if (!cameraPreview) throw new Error('camera preview is unavailable');

            cameraPreview.srcObject = cameraStream;
            cameraPreview.hidden = false;
            await cameraPreview.play().catch(() => {});

            if (capturedImage) {
                capturedImage.hidden = true;
                capturedImage.removeAttribute('src');
            }

            previewFrame?.classList.remove('has-capture');
            previewFrame?.classList.add('is-live');
            hideElement(captureCanvas);
            hideElement(previewPlaceholder);

            if (captureButton) captureButton.disabled = false;
            if (retakeButton) retakeButton.disabled = true;
            if (selfieDownloadButton) selfieDownloadButton.disabled = true;

            setStatus('selfie-status-message', 'camera is ready — capture your birthday moment ♡');
        } catch (error) {
            stopCamera();
            setStatus(
                'selfie-status-message',
                error?.name === 'NotAllowedError'
                    ? 'camera permission was not granted — you can allow it in your browser settings'
                    : 'could not start the camera; check that no other app is using it'
            );
        } finally {
            startCameraButton.disabled = false;
        }
    };

    startCameraButton?.addEventListener('click', startCamera);

    captureButton?.addEventListener('click', () => {
        if (!cameraPreview || !captureCanvas || !cameraPreview.videoWidth || !cameraPreview.videoHeight) {
            setStatus('selfie-status-message', 'start the camera and wait for the preview first');
            return;
        }

        const width = cameraPreview.videoWidth;
        const height = cameraPreview.videoHeight;
        captureCanvas.width = width;
        captureCanvas.height = height;

        const context = captureCanvas.getContext('2d');
        if (!context) {
            setStatus('selfie-status-message', 'could not capture the photograph — please try again');
            return;
        }

        context.save();
        context.translate(width, 0);
        context.scale(-1, 1);
        context.drawImage(cameraPreview, 0, 0, width, height);
        context.restore();

        if (capturedImage) {
            capturedImage.src = captureCanvas.toDataURL('image/jpeg', 0.94);
            capturedImage.hidden = false;
        }

        cameraPreview.hidden = true;
        stopCamera();
        previewFrame?.classList.remove('is-live');
        previewFrame?.classList.add('has-capture');
        hideElement(previewPlaceholder);

        captureButton.disabled = true;
        if (retakeButton) retakeButton.disabled = false;
        if (selfieDownloadButton) selfieDownloadButton.disabled = false;

        setStatus('selfie-status-message', 'your birthday selfie is ready to download ♡');
    });

    retakeButton?.addEventListener('click', async () => {
        if (capturedImage) {
            capturedImage.hidden = true;
            capturedImage.removeAttribute('src');
        }

        previewFrame?.classList.remove('has-capture', 'is-live');
        showElement(previewPlaceholder);
        if (retakeButton) retakeButton.disabled = true;
        if (selfieDownloadButton) selfieDownloadButton.disabled = true;
        if (captureButton) captureButton.disabled = true;

        await startCamera();
    });

    selfieDownloadButton?.addEventListener('click', () => {
        if (!captureCanvas || !captureCanvas.width || !captureCanvas.height) {
            setStatus('selfie-status-message', 'take your selfie first, then download it ♡');
            return;
        }

        captureCanvas.toBlob(blob => {
            if (blob) {
                downloadBlob(blob, 'priti-birthday-selfie.jpg');
                setStatus('selfie-status-message', 'your selfie has been saved to your device ♡');
            } else {
                setStatus('selfie-status-message', 'could not save the photograph — please try again');
            }
        }, 'image/jpeg', 0.94);
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden || !cameraStream) return;

        stopCamera();
        if (captureButton) captureButton.disabled = true;
        setStatus('selfie-status-message', 'camera paused while you were away — start it again when ready');
        if (!capturedImage || capturedImage.hidden) showElement(previewPlaceholder);
    });

    window.addEventListener('pagehide', stopCamera);
    window.addEventListener('beforeunload', stopCamera);

    /* ------------------------------------------------------------
       16. final celebration fireworks
       ------------------------------------------------------------ */

    byId('final-fireworks-button')?.addEventListener('click', () => {
        launchFireworks(byId('final-fireworks-canvas'), 6500);
        toast('one more celebration for priti ✨');
    });

    /* ------------------------------------------------------------
       17. gentle reveal animations
       ------------------------------------------------------------ */

    const revealTargets = $$(
        '.memory-card, .video-card, .wish-card, .personal-letter-card, .selfie-booth-card, .drawing-studio-card, .section-heading'
    );

    if ('IntersectionObserver' in window && !reducedMotion && typeof Element.prototype.animate === 'function') {
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                entry.target.animate(
                    [
                        { opacity: 0.35, transform: 'translateY(16px)' },
                        { opacity: 1, transform: 'translateY(0)' }
                    ],
                    {
                        duration: 620,
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        fill: 'both'
                    }
                );

                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

        revealTargets.forEach(target => revealObserver.observe(target));
    }

    /* Keep the opening screen alive before the gift interaction begins. */
    seedIntroAtmosphere();
    const introGarden = byId('intro-balloon-garden');
    if (introGarden && !reducedMotion) {
        window.setInterval(() => {
            if (introGarden.children.length < 24) makeDecorativeBalloon(introGarden, { minDuration: 15, maxDuration: 25 });
        }, 1650);
    }

    /* ------------------------------------------------------------
       18. reliable initial and cleanup states
       ------------------------------------------------------------ */

    hideElement(celebration);
    hideElement(mainSite);
    hideElement(whistleStage);
    hideElement(cakeCuttingStage);
    hideElement(byId('birthday-letter-paper'));
    hideElement(byId('wish-confirmation'));
    hideElement(byId('candles-out-message'));
    hideElement(byId('cake-cutting-celebration'));

    if (menuButton) {
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'open navigation menu');
    }

    if (lightbox) lightbox.hidden = true;
    if (popup) popup.hidden = true;
    if (cameraPreview) cameraPreview.hidden = true;
    hideElement(secretTrigger);
    if (secretOverlay) secretOverlay.hidden = true;
    updateMusicButton(Boolean(audio && !audio.paused));
    updateScrollUI();
})();