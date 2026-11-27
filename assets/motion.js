/* Superposition motion runtime (GALA-87).

   One file, one easing family, named behaviours, no per-page scripts. A page
   asks for motion in its front matter, which loads this file and the vendored
   GSAP build behind it; the markup then names a behaviour on an element with
   data-motion and this runtime does the rest:

     data-motion="opening"   the home hero, pinned and scrubbed by the scroll
     data-motion="reveal"    a page whose blocks arrive as they are reached
     data-motion="poster"    a campaign poster, assembling as it enters
     data-motion="rail"      an entry, with its reading rail
     data-motion="figure"    a measured figure, drawing itself from its numbers
     data-motion="grow"      a flora drawing, growing from its own paths
     data-motion="station"   the station scene: parallax, docking, one pulse

   It is a presentation layer and nothing else. Every element it moves is in the
   HTML, visible, and laid out where it belongs. A scene is built when its block
   reaches the screen and not before, so nothing is ever left hidden waiting for
   a trigger: an element the reader can see is an element no script has touched
   yet. The one exception is the first frame of the opening, marked by the boot
   snippet in _includes/motion.html and given back by whichever of the runtime or
   its own timer arrives first.

   So:
     - with JavaScript off, the page is the static page;
     - with GSAP missing, this file returns at the first check and the page is
       the static page;
     - with prefers-reduced-motion: reduce, this file returns at the same check,
       the boot snippet never runs, and nothing is registered at all;
     - with motion on, the tokens in assets/tokens.css are the only durations,
       distances and curve, read here by name so JavaScript and CSS cannot
       disagree. docs/motion.md is the spec.

   No behaviour runs a scene longer than a few seconds, none of them autoplays
   past five, and none of them takes the scroll: every timeline is scrubbed by
   the reader's own wheel or finger, or plays once as its block arrives. */

(function () {
  'use strict';

  var root = document.documentElement;
  var show = function () { root.classList.remove('motion-boot'); };
  var gsap = window.gsap;
  var media = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  if (!gsap || (media && media.matches)) {
    show();
    return;
  }

  var ScrollTrigger = window.ScrollTrigger;
  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  /* ---------------------------------------------------------------- tokens ---- */

  var computed = window.getComputedStyle(root);
  var read = function (name, fallback) {
    var value = (computed.getPropertyValue(name) || '').trim();
    return value || fallback;
  };
  var seconds = function (name, fallback) {
    var value = read(name, fallback);
    var number = parseFloat(value);
    if (!isFinite(number)) return 0.4;
    return /ms$/.test(value) ? number / 1000 : number;
  };
  var pixels = function (name, fallback) {
    var value = parseFloat(read(name, fallback));
    return isFinite(value) ? value : fallback;
  };

  var time = {
    quick: seconds('--dur-quick', '160ms'),
    rise: seconds('--dur-rise', '420ms'),
    settle: seconds('--dur-settle', '720ms'),
    scene: seconds('--dur-scene', '900ms'),
    step: seconds('--stagger-step', '70ms')
  };
  var rise = pixels('--rise-distance', 18);

  /* The pin's length is a token written the way CSS would write it (100svh), so
     the runtime resolves the unit itself rather than keeping a second number. */
  var pin = function () {
    var value = read('--scene-pin', '100svh');
    var amount = parseFloat(value);
    if (!isFinite(amount)) return window.innerHeight;
    if (/svh|vh/.test(value)) return Math.round(window.innerHeight * amount / 100);
    return amount;
  };

  /* One curve. --ease-move is a CSS cubic-bezier and GSAP wants a function, so
     the curve is solved here rather than written down twice. */
  var curve = function (value) {
    var found = /cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/.exec(value);
    if (!found) return null;
    var x1 = +found[1], y1 = +found[2], x2 = +found[3], y2 = +found[4];
    var axis = function (a, b, t) {
      var u = 1 - t;
      return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
    };
    return function (progress) {
      if (progress <= 0) return 0;
      if (progress >= 1) return 1;
      var low = 0, high = 1, t = progress, x = 0, i;
      for (i = 0; i < 24; i++) {
        x = axis(x1, x2, t);
        if (Math.abs(x - progress) < 1e-4) break;
        if (x < progress) low = t; else high = t;
        t = (low + high) / 2;
      }
      return axis(y1, y2, t);
    };
  };
  var move = curve(read('--ease-move', '')) || gsap.parseEase('power2.out');

  /* ------------------------------------------------------------- utilities ---- */

  var each = function (nodes, run) {
    for (var i = 0; i < nodes.length; i++) run(nodes[i], i);
  };

  /* A scene plays when its block is on the screen, and its start state does not
     exist until then: the animation is built at that moment rather than parked
     in a hidden state, so a block that is never reached — a trigger that never
     fires, a resize that moves it, a scene that throws — leaves the page as it
     was instead of leaving a hole in it. */
  var pending = [];

  var play = function (entry) {
    if (entry.done) return;
    entry.done = true;
    entry.build();
  };

  var onScreen = function (element, build, start) {
    var entry = { element: element, build: build, done: false };
    pending.push(entry);
    if (!ScrollTrigger) return entry;
    var fire = function () { play(entry); };
    ScrollTrigger.create({
      trigger: element,
      start: start || 'top 92%',
      once: true,
      onEnter: fire,
      onEnterBack: fire
    });
    return entry;
  };

  /* A block whose start boundary is already above the fold never crosses it, so
     it would sit waiting for a crossing that cannot happen. The sweep plays
     everything that is on the screen: once when the scenes are built, again when
     the page has loaded, and again after every ScrollTrigger refresh. */
  var sweep = function () {
    var limit = (window.innerHeight || 800) * 0.92;
    for (var i = 0; i < pending.length; i++) {
      var entry = pending[i];
      if (entry.done) continue;
      if (entry.element.getBoundingClientRect().top < limit) play(entry);
    }
  };

  /* A number that is already in the page, counting up to itself. */
  var count = function (element) {
    var text = element.getAttribute('data-count');
    var target = parseFloat(text);
    if (!isFinite(target) || target === 0) return null;
    var places = (text.split('.')[1] || '').length;
    var box = { value: 0 };
    return gsap.to(box, {
      value: target,
      duration: time.settle,
      ease: move,
      onUpdate: function () { element.textContent = box.value.toFixed(places); },
      onComplete: function () { element.textContent = target.toFixed(places); }
    });
  };

  /* ------------------------------------------------------------ behaviours ---- */

  /* The home opening. One viewport of scroll, pinned: the photograph steps back,
     the statement settles out of its crawl, the wordmark resolves letter by
     letter, the standfirst rises, and then the hero releases into the page.
     Scrubbed, so it runs at the reader's speed and runs backwards when they
     scroll back.

     Every start state is applied when the timeline is built, not when the reader
     reaches that step: a from() tween placed later in a scrubbed timeline would
     otherwise snap its element to the start state mid-scroll. None of these
     states hides anything — the hero is legible at rest, at partial opacity and
     a step out of place, and the scroll brings it home. */
  var opening = function (scope) {
    var hero = scope.querySelector('.hero');
    if (!hero) return;

    var shot = hero.querySelector('img');
    var statement = hero.querySelector('.crawl .lede');
    var title = hero.querySelector('h1');
    var support = hero.querySelectorAll('.crawl-hold, .topic-list');

    /* The statement's drift loop is the no-JavaScript performance, and the Hold
       switch exists to pause it. Here the scroll moves the statement, so the
       loop stops and the switch — which would now pause nothing — steps out. */
    if (statement) statement.style.animation = 'none';

    if (!ScrollTrigger) return;

    var total = time.rise * 2 + time.settle;
    var timeline = gsap.timeline({
      defaults: { ease: move },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: function () { return '+=' + pin(); },
        pin: hero,
        anticipatePin: 1,
        scrub: 0.6,
        invalidateOnRefresh: true
      }
    });

    if (shot) timeline.fromTo(shot, { scale: 1.06 }, { scale: 1, duration: total, ease: 'none' }, 0);

    if (statement) {
      timeline.fromTo(
        statement,
        { y: pixels('--crawl-travel', 26), opacity: 0.35 },
        { y: 0, opacity: 1, duration: time.rise },
        0
      );
    }

    if (title) {
      var split = null;
      if (window.SplitText) {
        try {
          split = window.SplitText.create(title, { type: 'chars,words', aria: 'auto' });
        } catch (error) {
          split = null;
        }
      }
      if (split && split.chars && split.chars.length) {
        timeline.from(
          split.chars,
          { y: rise * 1.4, opacity: 0.35, duration: time.settle, stagger: time.step, immediateRender: true },
          time.rise * 0.4
        );
      } else {
        timeline.from(title, { y: rise, opacity: 0.35, duration: time.settle, immediateRender: true }, time.rise * 0.4);
      }
    }

    if (support.length) {
      timeline.from(
        support,
        { y: rise, opacity: 0.4, duration: time.rise, stagger: time.step, immediateRender: true },
        time.rise + time.settle * 0.55
      );
    }
  };

  /* A page whose blocks arrive as the reader reaches them. The layout marks the
     head with data-reveal; the prose needs no marking at all, because a figure
     or an aside in it is the block that carries something. */
  var reveal = function (scope) {
    each(scope.querySelectorAll('[data-reveal]'), function (element) {
      var kind = element.getAttribute('data-reveal');
      if (kind === 'list') {
        onScreen(element, function () {
          gsap.from(element.children, { y: rise, opacity: 0, duration: time.rise, stagger: time.step, ease: move });
        }, 'top 88%');
      } else if (kind === 'wipe') {
        onScreen(element, function () {
          gsap.from(element, { yPercent: 10, opacity: 0, duration: time.settle, ease: move });
        }, 'top 90%');
      } else {
        onScreen(element, function () {
          gsap.from(element, { y: rise, opacity: 0, duration: time.rise, ease: move });
        });
      }
    });

    each(scope.querySelectorAll('figure, aside'), function (element) {
      if (element.hasAttribute('data-motion')) return;
      onScreen(element, function () {
        gsap.from(element, { y: rise, opacity: 0, duration: time.rise, ease: move });
      }, 'top 95%');
    });

    each(scope.querySelectorAll('[data-count]'), function (element) {
      onScreen(element, function () { count(element); }, 'top 95%');
    });
  };

  /* A campaign poster: the still arrives, the title assembles under it, and the
     film line, the logline and the credit follow in the order a poster is read.
     Subtle by budget — this is a library page, not a trailer. */
  var poster = function (scope) {
    onScreen(scope, function () {
      var still = scope.querySelector('.poster-art img');
      var genre = scope.querySelector('.poster-genre');
      var title = scope.querySelector('.poster-title');
      var film = scope.querySelector('.poster-film');
      var logline = scope.querySelector('.poster-logline');
      var cast = scope.querySelector('.poster-cast');
      var number = scope.querySelector('.poster-no');

      var timeline = gsap.timeline({ defaults: { ease: move, immediateRender: true } });
      if (still) timeline.from(still, { scale: 1.05, opacity: 0, duration: time.settle }, 0);
      if (number) timeline.from(number, { opacity: 0, duration: time.rise }, 0);
      if (genre) timeline.from(genre, { y: rise * 0.6, opacity: 0, duration: time.rise }, 0);
      if (title) timeline.from(title, { yPercent: 14, opacity: 0, duration: time.settle }, time.rise * 0.4);
      if (film) timeline.from(film, { opacity: 0, duration: time.rise }, time.settle * 0.6);
      if (logline) timeline.from(logline, { y: rise * 0.5, opacity: 0, duration: time.rise }, time.settle * 0.8);
      if (cast) timeline.from(cast, { opacity: 0, duration: time.rise }, time.settle);
    }, 'top 85%');
  };

  /* An entry, with the rail that says how much of it is left. The rail is a
     two-pixel rule the stylesheet draws only while a scene is running; the
     progress is written as a scale on the fill, and the entry's own geometry is
     the measurement, so it stays true when the reader resizes or the page
     finishes loading its images. */
  var rail = function (scope) {
    var fill = document.querySelector('.reading-rail span');
    if (!fill || !ScrollTrigger) return;
    ScrollTrigger.create({
      trigger: scope,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: function (self) {
        fill.style.setProperty('--progress', self.progress.toFixed(4));
      }
    });
  };

  /* A measured figure. The bars are drawn in the HTML at their real widths and
     the numbers are printed at their real values; the scene grows the bars out
     of nothing and counts the numbers up to themselves, so the reading is the
     same at either end of it. */
  var figure = function (scope) {
    onScreen(scope, function () {
      var bars = scope.querySelectorAll('[data-bar]');
      var values = scope.querySelectorAll('[data-value]');
      var timeline = gsap.timeline({ defaults: { ease: move } });

      if (bars.length) {
        timeline.from(bars, { scaleX: 0, duration: time.settle, stagger: time.step, transformOrigin: '0 50%' }, 0);
      }

      each(values, function (element, index) {
        var text = element.getAttribute('data-value');
        var target = parseFloat(text);
        if (!isFinite(target)) return;
        var places = (text.split('.')[1] || '').length;
        var box = { value: 0 };
        timeline.to(box, {
          value: target,
          duration: time.settle,
          onUpdate: function () { element.textContent = box.value.toFixed(places); },
          onComplete: function () { element.textContent = target.toFixed(places); }
        }, time.step * index);
      });
    }, 'top 85%');
  };

  /* A flora drawing, as the flora thread builds it: an inline SVG with #stem,
     #leaves, #bud, #petals and #spores, marking what grows with data-grow and
     what blooms with data-bloom. Stems draw along their own length, leaves and
     buds open from where they are attached, petals and spores follow. The
     contract is in docs/motion.md. */
  var grow = function (scope) {
    var svg = scope.tagName.toLowerCase() === 'svg' ? scope : scope.querySelector('svg');
    if (!svg) return;

    onScreen(scope, function () {
      var timeline = gsap.timeline({ defaults: { ease: move, immediateRender: true } });

      each(svg.querySelectorAll('#stem path, [data-grow="stem"]'), function (path) {
        if (!path.getTotalLength) return;
        var length = path.getTotalLength();
        if (!length) return;
        timeline.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: time.scene * 1.6, ease: 'none' },
          0
        );
      });

      each(svg.querySelectorAll('#leaves [data-grow], #bud [data-grow], [data-grow="leaf"], [data-grow="bud"]'), function (element) {
        timeline.from(
          element,
          { scale: 0, opacity: 0, duration: time.settle, transformOrigin: element.getAttribute('data-origin') || '50% 100%' },
          time.scene * 0.55
        );
      });

      each(svg.querySelectorAll('#petals [data-bloom], [data-bloom="petal"]'), function (element) {
        timeline.from(
          element,
          { scale: 0.2, opacity: 0, duration: time.settle, transformOrigin: '50% 50%', stagger: time.step },
          time.scene
        );
      });

      each(svg.querySelectorAll('#spores [data-bloom], [data-bloom="spore"]'), function (element) {
        timeline.from(
          element,
          { y: rise, opacity: 0, duration: time.settle, stagger: time.step * 2 },
          time.scene * 1.1
        );
      });
    }, 'top 80%');
  };

  /* The station scene, as the scene thread is building it: a wrapper with named
     layers, a shuttle that docks along the scroll, and one signal that pulses
     when it is on screen and rests when it is not. The layers drift against
     each other by depth, so parallax says which of them is further away; the
     shuttle's two positions are markers in the drawing, so the path it takes is
     the composition's, not a number invented here. */
  var station = function (scope) {
    if (!ScrollTrigger) return;

    var depths = { city: -6, station: -14, traffic: -22 };

    each(scope.querySelectorAll('[data-layer]'), function (layer) {
      var name = layer.getAttribute('data-layer');
      var depth = parseFloat(layer.getAttribute('data-depth'));
      if (!isFinite(depth)) depth = depths[name] || -10;
      gsap.fromTo(
        layer,
        { yPercent: depth / 2 },
        {
          yPercent: -depth / 2,
          ease: 'none',
          scrollTrigger: { trigger: scope, start: 'top bottom', end: 'bottom top', scrub: true }
        }
      );
    });

    var shuttle = scope.querySelector('[data-shuttle]');
    var from = scope.querySelector('[data-marker="dock-a"]');
    var to = scope.querySelector('[data-marker="dock-b"]');
    if (shuttle && from && to && from.getBBox && to.getBBox) {
      var middle = function (element) {
        var box = element.getBBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };
      var here = middle(shuttle);
      var start = middle(from);
      var dock = middle(to);
      gsap.fromTo(
        shuttle,
        { x: start.x - here.x, y: start.y - here.y },
        {
          x: dock.x - here.x,
          y: dock.y - here.y,
          ease: 'none',
          scrollTrigger: { trigger: scope, start: 'top 75%', end: 'bottom 25%', scrub: true }
        }
      );
    }

    /* One pulse, four cycles, then it rests: under five seconds, so it needs no
       pause control, and it does not run while the scene is off screen. */
    var signal = scope.querySelector('[data-signal]');
    if (signal) {
      onScreen(signal, function () {
        gsap.to(signal, { opacity: 0.35, duration: 1.2, repeat: 3, yoyo: true, ease: 'sine.inOut' });
      }, 'top bottom');
    }
  };

  var behaviours = {
    opening: opening,
    reveal: reveal,
    poster: poster,
    rail: rail,
    figure: figure,
    grow: grow,
    station: station
  };

  /* ---------------------------------------------------------------- start ---- */

  var scopes = document.querySelectorAll('[data-motion]');
  var ran = 0;

  /* html.motion is what the stylesheet scopes every scene rule to, and it is set
     before the timelines are built: the opening's pin is a wrapper GSAP inserts,
     and a ScrollTrigger built against a page that has not been marked yet would
     measure a different page. */
  root.classList.add('motion');

  try {
    each(scopes, function (scope) {
      var run = behaviours[scope.getAttribute('data-motion')];
      if (!run) return;
      run(scope);
      ran += 1;
    });
  } catch (error) {
    root.classList.remove('motion');
    show();
    return;
  }

  if (!ran) root.classList.remove('motion');
  sweep();
  show();

  if (ScrollTrigger) {
    ScrollTrigger.addEventListener('refresh', sweep);
    /* The hero's height is set in em on a webfont: without this the opening
       would be measured against the fallback face and its release would land
       early. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); sweep(); });
    }
    window.addEventListener('load', function () { ScrollTrigger.refresh(); sweep(); });
  }

  /* A reader who turns reduced motion on while reading gets the static page:
     one reload, and the next load takes the first check above. */
  if (media && media.addEventListener) {
    media.addEventListener('change', function (event) {
      if (!event.matches) return;
      root.classList.remove('motion');
      show();
      window.location.reload();
    });
  }
}());
