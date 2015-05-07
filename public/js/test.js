/**
 * T-Distribution two-tailed critical values for 95% confidence
 * http://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm
 */
var tTable = {
  '1':  12.706,'2':  4.303, '3':  3.182, '4':  2.776, '5':  2.571, '6':  2.447,
  '7':  2.365, '8':  2.306, '9':  2.262, '10': 2.228, '11': 2.201, '12': 2.179,
  '13': 2.16,  '14': 2.145, '15': 2.131, '16': 2.12,  '17': 2.11,  '18': 2.101,
  '19': 2.093, '20': 2.086, '21': 2.08,  '22': 2.074, '23': 2.069, '24': 2.064,
  '25': 2.06,  '26': 2.056, '27': 2.052, '28': 2.048, '29': 2.045, '30': 2.042,
  'infinity': 1.96
};
jQuery(function() {
  //FastClick.attach(document.body);
  // Famous module
  var Engine = famous.core.Engine;
  var Modifier = famous.core.Modifier;
  var Transform = famous.core.Transform;
  var View = famous.core.View;
  var RenderController = famous.views.RenderController;
  var Timer = famous.utilities.Timer;
  var ImageSurface = famous.surfaces.ImageSurface;
  var Transitionable = famous.transitions.Transitionable;
  var Easing = famous.transitions.Easing;

  var fpsElem = document.getElementById("fps"),
  button = document.getElementById("start"),
  dotQtyInput = document.getElementById("dotQuantity"),
  durInput = document.getElementById("duration"),
  engineInput = document.getElementById("engine"),
  instructions = document.getElementById("instructions"),
  container = document.getElementById("container"),
  ticker = TweenLite.ticker,
  inProgress = false,
  tests = {},
  centerX, centerY, dots, rawDots, currentTest, startTime, startFrame, prevUpdate, duration, startingCSS, startingCSSObj, fpsActive, samplesLength;

  var DF = 30;

  /* Velocity definition */
  var V;
  if (window.jQuery) {
    V = $.Velocity;
  } else {
    V = Velocity;
  }
  var mainContext, modifiers, transitionables, renderers;
  
  var samples = [];

  /**
   * The goal of this test is to compare how various animation engines perform under pressure, taking relatively common
   * animation tasks and running a lot of them at once to see raw performance. The goal is NOT to figure out the most 
   * efficient way to move dots in a starfield pattern. 
   * 
   * The same code runs everything except the actual tweens themselves. Every test in the "test" 
   * object has 4 properties:
   * 
   * 		- milliseconds [boolean] - true if the duration should be defined in milliseconds
   * 
   * 		- wrapDot [function] - when each dot <img> is created, it is passed to the wrapDot() method
   * 							   and whatever is returned gets stored in the array of dots to tween. This 
   * 							   is useful to improve performance of things like jQuery because 
   * 							   instead of passing the dom element to the tween() method (which would require
     * 							   jQuery to then query the dom and wrap the element in an engine-specific object
     * 							   before calling animate() on it), a native object can be used. Basically it lets you
   * 							   cache the dot's wrapper for better performance.
   * 
   * 		- tween [function] - This is the core of the whole test. tween() is called for each dot, and the dot is
   * 							 passed as a parameter. The tween() function should set the dot's cssText to the
   * 							 startingCSS value (which just places the dot in the middle of the screen and sets its
     * 							 width/height to 1px) and then after a random delay between 0 and the duration of the tween, 
   * 							 it should tween the dot at a random angle, altering the left/top values accordingly as
   * 							 well as the width/height to 32px. Then, after the tween is done, it should call the tween() 
   * 							 method again for that dot. So the same dot will just continuously tween outward from the 
   * 							 center at random angles and at random delay values.
   * 
   * 		- stop [function] - This function is called when the user stops the test. The dot is passed as a parameter.
   * 							The function should immediately stop/kill the tween(s) of that dot (or all dots - that's fine too). 
   * 
   * I don't claim to be an expert at the various other tweening engines out there, so if there are optimizations
   * that could be made to make them run better, please let me know. I tried to keep things as fair as possible.
   * 
   * Also, if anyone knows how to make a more accurate fps counter that works well with transitions, let me know - currently
   * several browsers incorrectly dispatch requestAnimationFrame events even when the screen isn't being refreshed, giving 
   * an artificially high frame rate readout. And some browers don't repaint the screen each time all the elements' styles 
   * are updated, thus motion can appear a bit jerky even when the fps counter says you're getting a good frame rate. 
   **/

  //jQuery
  tests.jquery = {
    milliseconds: true,
    wrapDot: function(dot) {
      return jQuery(dot); //wrap the dot in a jQuery object in order to perform better (that way, we don't need to query the dom each time we tween - we can just call animate() directly on the jQuery object)
    },
    tween: function(dot) {
      dot[0].style.cssText = startingCSS;
      var angle = Math.random() * Math.PI * 2;
      dot.delay(Math.random() * duration).animate({
        left: Math.cos(angle) * radius + centerX,
        top: Math.sin(angle) * radius + centerY, 
        width: 32, 
        height: 32
      }, duration, "cubicIn", function() {
        tests.jquery.tween(dot)
      });
    },
    stop: function(dot) {
      dot.stop(true);
    },
    nativeSize: false
  };

  //jquery.gsap.js plugin
  // You cannot see any differences compared to tests.jquery,
  // Check `toggleTest` to check it out why. :P
  tests.jqueryGSAP = {
    milliseconds: true,
    wrapDot:function(dot) {
      return jQuery(dot); //wrap the dot in a jQuery object in order to perform better (that way, we don't need to query the dom each time we tween - we can just call animate() directly on the jQuery object)
    },
    tween:function(dot) {
      dot[0].style.cssText = startingCSS;
      var angle = Math.random() * Math.PI * 2;
      dot.animate({
        left: Math.cos(angle) * radius + centerX,
        top: Math.sin(angle) * radius + centerY, 
        width: 32, 
        height: 32, 
        delay: Math.random() * duration / 1000
      }, duration, "easeInCubic", function() {
        tests.jqueryGSAP.tween(dot)
      });
    },
    stop: function(dot) {
      dot.stop(true);
    },
    nativeSize: false
  };

  //GSAP (TweenLite) top/left/width/height
  tests.gsap = {
    milliseconds: false,
    wrapDot: function(dot) {
      return dot; //no wrapping necessary
    },
    tween: function(dot) {
      var angle = Math.random() * Math.PI * 2;
      dot.style.cssText = startingCSS;
      TweenLite.to(dot, duration, {
        css: {
          left: Math.cos(angle) * radius + centerX,
          top: Math.sin(angle) * radius + centerY,
          width: 32,
          height: 32
        },
        delay: Math.random() * duration,
        ease: Cubic.easeIn,
        overwrite: "none",
        onComplete: tests.gsap.tween,
        onCompleteParams: [dot]
      });
    },
    stop: function(dot) {
      TweenLite.killTweensOf(dot);
    },
    nativeSize: false
  };

  //GSAP (TweenLite) translateX/translateY/scale
  tests.gsaptransform = {
    milliseconds: false,
    wrapDot: function(dot) {
      return dot; //no wrapping necessary
    },
    tween: function(dot) {
      TweenLite.set(dot, {
        css: {x: 0, y: 0, scale: 0.06}
      });
      var angle = Math.random() * Math.PI * 2;
      TweenLite.to(dot, duration, {
        css: {
          x: (Math.cos(angle) * radius),
          y: (Math.sin(angle) * radius),
          scaleX: 2,
          scaleY: 2
        },
        delay: Math.random() * duration,
        ease: Cubic.easeIn,
        overwrite: "none",
        onComplete: tests.gsaptransform.tween,
        onCompleteParams: [dot]
      });
    },
    stop: function(dot) {
      TweenLite.killTweensOf(dot);
    },
    nativeSize: true
  };

  //GSAP (TweenLite) 3D translateX/translateY/scale
  tests.gsaptransform3d = {
    milliseconds: false,
    wrapDot: function(dot) {
      return dot; //no wrapping necessary
    },
    tween: function(dot) {
      TweenLite.set(dot, {
        css:{x: 0,y: 0, scale: 0.06, force3D: true}
      });
      var angle = Math.random() * Math.PI * 2;
      TweenLite.to(dot, duration, {
        css: {
          x: (Math.cos(angle) * radius),
          y: (Math.sin(angle) * radius),
          scaleX: 2,
          scaleY: 2,
          force3D: true
        },
        delay: Math.random() * duration,
        ease: Cubic.easeIn,
        overwrite: "none",
        onComplete: tests.gsaptransform3d.tween,
        onCompleteParams: [dot]
      });
    },
    stop: function(dot) {
      TweenLite.killTweensOf(dot);
    },
    nativeSize: true
  };

  //Web Animations (Polymer) (UNSTABLE! - GC problems, and very slow)
  // Only supported by Chrome, Opera, Chrome for Android
  tests.webanimations = {
    milliseconds: false,
    wrapDot: function(dot) {
      return dot; //no wrapping necessary
    },
    tween: function(dot) {
      dot.style.cssText = startingCSS; //reset values (move the dot to the center and resize its width/height.
      var angle = Math.random() * Math.PI * 2,
      delay = Math.random() * duration,
      anim = new Animation(dot, [
        {
          //it shouldn't be necessary to reset these values at the beginning (after all, we're setting the element's cssText above), but the animations wouldn't work properly without this.
          left: centerX + "px",
          top: centerY + "px",
          width: "1px",
          height: "1px",
          offset: 0
        },
        {
          left: (Math.cos(angle) * radius + centerX) + "px",
          top: (Math.sin(angle) * radius + centerY) + "px",
          width: "32px",
          height: "32px"
        }
      ], {
        iterationDuration: duration,
        startDelay: delay,
        timingFunction: "cubic-bezier(0.550, 0.055, 0.675, 0.190)"
      });
      anim.onend = function() {
        tests.webanimations.tween(dot);
      };
      dot.anim = anim;
      document.timeline.play(anim);
    },
    stop: function(dot) {
      dot.anim.source = null; //the most effective way to kill the animation
    }
  };

  //MooTools
  tests.mootools = {
    milliseconds: true,
    wrapDot: function(dot) {
      var m = new Fx.Morph(dot, {
        duration: duration,
        transition: Fx.Transitions.Cubic.easeIn,
        onComplete: function() {
          tests.mootools.tween(m); // TODO: remove this?
        }
      });
      return m;
    },
    tween: function(dot) {
      dot.element.style.cssText = startingCSS;
      var angle = Math.random() * Math.PI * 2;
      setTimeout(function() {
        if (inProgress)
          dot.start({ //I couldn't find a way to delay a Morph, so setTimeout was my only option. If anyone knows a better way, please let me know.
          // TODO possible solution here: http://stackoverflow.com/questions/17854283/mootools-wait-with-fx-morph-start
            left: Math.cos(angle) * radius + centerX + "px",
            top: Math.sin(angle) * radius + centerY + "px",
            width: "32px", 
            height: "32px"
          });
      }, Math.random() * duration);
    },
    stop: function(dot) {
      dot.cancel();
    },
    nativeSize: false
  };

  //Dojo
  tests.dojo = {
    milliseconds: true,
    wrapDot: function(dot) {
      return {dot: dot, anim: null}; //must record the animation instance so that we can stop() it later
    },
    tween: function(dot) {
      dot.dot.style.cssText = startingCSS;
      var angle = Math.random() * Math.PI * 2;
      dot.anim = dojo.animateProperty({
        node: dot.dot,
        properties: {
          left: Math.cos(angle) * radius + centerX, 
          top: Math.sin(angle) * radius + centerY, 
          width: 32, 
          height: 32
        }, 
        easing: dojo.fx.easing.cubicIn,
        delay: Math.random() * duration,
        duration: duration
      }).play();
      dot.anim.onEnd = function() { tests.dojo.tween(dot); }
    },
    stop: function(dot) {
      dot.anim.stop();
    },
    nativeSize: false
  };

  //TweenJS
  createjs.CSSPlugin.install();
  createjs.Ticker.timingMode = createjs.Ticker.RAF;
  //Ticker.setFPS(100); //ensures that TweenJS refreshes at the same rate as GSAP for maximum smoothness
  // Ticker provides a centralized tick or heartbeat broadcast at a set interval. Listeners can subscribe to the tick event to be notified when a set time interval has elapsed.
  tests.tweenjs = {
    milliseconds: true,
    wrapDot: function(dot) {
      return dot; //no wrapping necessary
    },
    tween: function(dot) {
      dot.style.cssText = startingCSS;
      var angle = Math.random() * Math.PI * 2;
      createjs.Tween.get(dot).wait( Math.random() * duration ).to({
        left: Math.cos(angle) * radius + centerX,
        top: Math.sin(angle) * radius + centerY,
        width: 32,
        height: 32
      }, duration, createjs.Ease.cubicIn).call(tests.tweenjs.tween, [dot]);
    },
    stop: function(dot) {
      createjs.Tween.removeTweens(dot);
    },
    nativeSize: false
  };

  //Zepto using top/left/width/height (css transitions)
  tests.zepto = {
    milliseconds: true,
    wrapDot: function(dot) {
      return Zepto(dot); //wrap the dot in a jQuery object in order to perform better (that way, we don't need to query the dom each time we tween - we can just call animate() directly on the jQuery object)
    },
    tween: function(dot) {
      dot[0].style.cssText = startingCSS;
      //Zepto's delay feature performs TERRIBLY under pressure, so we use a setTimeout() instead to improve performance.
      setTimeout(function() {
        if (!dot.isKilled) { //Zepto doesn't have a feature that allows us to kill tweens, so we simply set our own "isKilled" property to true when the tween is supposed to be killed and then stop the recursion thereafter which gives us a somewhat similar effect.
          var angle = Math.random() * Math.PI * 2;
          dot.animate({left:Math.cos(angle) * radius + centerX, 
            top: Math.sin(angle) * radius + centerY, 
            width: 32, 
            height: 32
          }, duration, "cubic-bezier(0.550, 0.055, 0.675, 0.190)", function() {
            tests.zepto.tween(dot)
          });
        }
      }, duration * Math.random());
    },
    stop: function(dot) {
      dot.isKilled = true;
    },
    nativeSize: false
  };

  //Zepto using translateX/translateY/scale (css transitions)
  tests.zeptotransform = {
    milliseconds: true,
    wrapDot: function(dot) {
      return Zepto(dot); //wrap the dot in a jQuery object in order to perform better (that way, we don't need to query the dom each time we tween - we can just call animate() directly on the jQuery object)
    },
   
    tween: function(dot) {
      //I couldn't just set the css() reliably with Zepto (it failed), so I was forced to use a zero-duration animate() call. It's fair, though, because we actually do a zero-duration tween for TweenLite too.
      dot.animate({
        translateX: "0px",
        translateY: "0px",
        rotateY: "0rad",
        rotateX: "0rad",
        scale: "0.06,0.06"
      }, 0);
      //Zepto's delay feature performs TERRIBLY under pressure, so we use a setTimeout() instead to improve performance.
      setTimeout(function() {
        if (!dot.isKilled) { //Zepto doesn't have a feature that allows us to kill tweens, so we simply set our own "isKilled" property to true when the tween is supposed to be killed and then stop the recursion thereafter which gives us a somewhat similar effect.
          var angle = Math.random() * Math.PI * 2;
          dot.animate({
            translateX: (Math.cos(angle) * radius) + "px",
            translateY: (Math.sin(angle) * radius) + "px",
            scale: "2,2",
            delay: duration * Math.random()
          }, duration, "cubic-bezier(0.550, 0.055, 0.675, 0.190)", function() {
            tests.zeptotransform.tween(dot)
          });
        }
      }, duration * Math.random());
    },
    stop: function(dot) {
      dot.isKilled = true;
    },
    nativeSize:true
  };

  // WARNING!!! Since Famo.us' stop function force cleanup without cleaning
  // RenderTree, so we shouldn't run any test after running Famo.us test.
  tests.famous = {
    milliseconds: true,
    wrapDot: function(dot) {
      return dot;
    },
    tween: function(transitionable) {
      // Random angle
      // Random latency (duration)
      // CubicIn
      var angle = Math.random() * Math.PI * 2;
      Timer.setTimeout(function() {
        transitionable.set([
          Math.cos(angle) * radius, // x-translation
          Math.sin(angle) * radius, // y-translation
          32,                       // width 
          32                        // height
        ], {
          duration: duration,
          curve: Easing.inCubic
        }, function() {
          transitionable.set([0,0,1,1], { duration: 0 }, function() {
            tests.famous.tween(transitionable); 
          });
        });
      }, Math.random() * duration);
    },
    stop: function(transitionable) {
      transitionable.halt();
      container.innerHTML = ''; // Force cleanup. NOT A GOOD IDEA TODO
    },
    nativeSize: false
  };

  tests.velocity = {
    milliseconds: true,
    wrapDot: function(dot) {
      return dot;
    },
    tween: function(dot) {
      dot.style.cssText = startingCSS;
      /*V.hook(dot, 'left', centerX + 'px');
      V.hook(dot, 'top', centerY + 'px');
      V.hook(dot, 'width', '1px');
      V.hook(dot, 'height', '1px');*/
      /*V(dot, {
        left: centerX,
        top: centerY,
        width: 1,
        height: 1 
      }, { queued: false, duration: 0 });*/
      var angle = Math.random() * Math.PI * 2;
      setTimeout(function() {
      V(dot, {
        left: Math.cos(angle) * radius + centerX,
        top: Math.sin(angle) * radius + centerY,
        width: 32,
        height: 32
      }, {
        duration: duration,
        loop: 1,
        easing: 'inCubic',
        //delay: Math.random() * duration,
        complete: function(dot) {
          tests.velocity.tween(dot[0]);
        },
        mobileHA: false
      });
      }, Math.random() * duration);
    },
    stop: function(dot) {
      V(dot, 'stop', true); // I don't know what the fuck 'true' means
    },
    nativeSize: false
  };
  tests.velocity3d = {
    milliseconds: true,
    wrapDot: function(dot) {
      return dot;
    },
    tween: function(dot) {
      // reset
      V(dot, {
        translateX: '0px',
        translateY: '0px',
      }, { duration: 0, loop: 1 });

      // ANOTHER POSSIBLE SOLUTION
      /*TweenLite.set(dot, {
        css:{x: 0,y: 0, scale: 0.06, force3D: true}
      });*/

      var angle = Math.random() * Math.PI * 2;
      V(dot, {
        translateX: (Math.cos(angle) * radius) + 'px',
        translateY: (Math.sin(angle) * radius) + 'px',
        scaleX: 32,
        scaleY: 32
      }, {
        duration: duration,
        loop: 1,
        easing: 'easeInCubic',
        delay: Math.random() * duration,
        complete: function(dot) {
          tests.velocity3d.tween(dot[0]);
        }
      });
    },
    stop: function(dot) {
      V(dot, 'stop'); // I don't know what the fuck 'true' means
    },
    nativeSize: false
  };

  tests.webanimations = {
    milliseconds: true,
    wrapDot: function(dot) {
      return dot;
    },
    tween: function(dot) {
      var angle = Math.random() * Math.PI * 2;
      var startFrame = startingCSSObj;
      var endFrame = {
        left: Math.cos(angle) * radius + centerX,
        top: Math.sin(angle) * radius + centerY,
        width: 32,
        height: 32
      };
      dot.animation = dot.animate([startFrame, endFrame], {
        duration: duration,
        easing: 'ease-in-cubic',
        delay: Math.random() * duration
      });
      dot.animation.onfinish = function() {
        tests.webanimations.tween(dot);
      };
    },
    stop: function(dot) {
      if (dot.animation)
        dot.animation.cancel();
    },
    nativeSize: false
  };

  tests.webanimations3d = {
    milliseconds: true,
    wrapDot: function(dot) {
      return dot;
    },
    tween: function(dot) {
      var angle = Math.random() * Math.PI * 2;
      var endX = Math.cos(angle) * radius + 'px';
      var endY = Math.sin(angle) * radius + 'px';

      dot.animation = dot.animate([
        { transform: 'translate3d(0px,0px,0px)' },
        { transform: 'translate3d(' + endX + ',' + endY + ',0px) scale(32)' }
      ], {
        duration: duration,
        easing: 'ease-in-cubic',
        delay: Math.random() * duration
      });
      dot.animation.onfinish = function() {
        tests.webanimations.tween(dot);
      };
    },
    stop: function(dot) {
      if (dot.animation)
        dot.animation.cancel();
    },
    nativeSize: false
  };

  function startTest() {
    //alert(inProgress);
    if (!inProgress) {
      toggleTest();
    }
  }
  function toggleTest() {
    inProgress = !inProgress;
    var i, size;
    if (inProgress) { // 开始测试
      currentTest = tests[engineInput.value];
      size = (currentTest.nativeSize ? "16px" : "1px");
      centerX = jQuery(window).width() / 2;
      centerY = (jQuery(window).height() / 2) - 30;
      startingCSS = "position:absolute; left:" + centerX + "px; top:" + centerY + "px; width:" + size + "; height:" + size + ";"; 
      startingCSSObj = {
        left: centerX,
        top: centerY,
        width: size,
        height: size
      };
      radius = Math.sqrt(centerX * centerX + centerY * centerY);
      duration = Number(durInput.value);
      if (currentTest.milliseconds) {
        duration *= 1000;
      }

      if (engineInput.value === 'famous') {
        mainContext = Engine.createContext(container);
        console.log('before creating dots');
        createDots(true);
        i = dots.length;
        console.log('after creating dots');
        while (--i > -1) {
          currentTest.tween(transitionables[i]);
        }
        console.log('tween fired');

      } else {

        // 是否开启GSAP
        if (jQuery.gsap) {
          jQuery.gsap.enabled((engineInput.value === "jqueryGSAP"));
        }

        createDots();
        i = dots.length;
        while (--i > -1) {
          currentTest.tween(dots[i]);
        }
      }
      // 下面两行暂时是木有用的
      //startTime = prevUpdate = ticker.time;
      //startFrame = ticker.frame;
      //ticker.addEventListener("tick", updateFPS, this);

      // 此时不能修改移动的dot数量
      dotQtyInput.disabled = engineInput.disabled = true;

      // 修改显示FPS的style以及隐藏instruction section
      button.innerHTML = " STOP ";
      fpsElem.innerHTML = "-- fps";
      fpsElem.style.backgroundColor = "#FFFFFF";
      fpsElem.style.borderColor = fpsElem.style.color = "#FF0000";
      fpsElem.style.borderWidth = "3px";
      fpsElem.style.paddingTop = fps.style.paddingBottom = "4px";
      TweenLite.to(instructions, 0.7, {css:{autoAlpha:0}, overwrite:"all"});
      TweenLite.delayedCall(1, activateFPS); //wait a little bit to allow the dots to fill the screen before starting to report the FPS

    } else { // 停止测试并刷新页面
      //adjust the fps style and fade in the instructions
      //ticker.removeEventListener("tick", updateFPS);
      fpsElem.style.backgroundColor = "#CCCCCC";
      fpsElem.style.color = "#CC0000";
      fpsElem.style.borderColor = "#000000";
      fpsElem.style.borderWidth = "1px";
      fpsElem.style.paddingTop = fpsElem.style.paddingBottom = "6px";
      button.innerHTML = " START ";
      TweenLite.to(instructions, 0.7, {css:{autoAlpha:1}, delay:0.2});

      dotQtyInput.disabled = engineInput.disabled = false;

      // stop the tweens and remove the dots.
      if (engineInput.value === 'famous') {
        i = dots.length;
        while (--i > -1) {
          currentTest.stop(transitionables[i]);
          //renderers[i].hide();
        }
      } else {
        i = dots.length;
        console.log('!!!');
        while (--i > -1) {
          currentTest.stop(dots[i]);
          container.removeChild(rawDots[i]); //removes dot(s)
        }
      }
      dots = null;
      rawDots = null;
      fpsActive = false;
      samplesLength = 0; 
      TweenLite.killTweensOf(activateFPS);
      //clearInterval(fpsIntervalID);
      
      //console.log(samples);
      var size, mean, variance, sd, sem, df, critical, moe, rme;

      size = samples.length;

      // 样本均值
      mean = _.reduce(samples, function(sum, n) {
        return sum + n;
      }) / size || 0;

      // 自由度
      df = size - 1;
      console.log(df);

      // 样本方差
      variance = _.reduce(samples, function(sum, x) {
        return sum + Math.pow(x - mean, 2);
      }, 0) / df || 0;

      // 样本标准差
      sd = Math.sqrt(variance); 

      // 均值标准误差
      sem = sd / Math.sqrt(size);

      // t分布的critical value
      critical = tTable[Math.round(df) || 1] || tTable.infinity;

      // 误差范围
      moe = sem * critical;

      // 相对误差范围(用相对于样本平均值的百分比表示)
      rme = (moe / mean) * 100 || 0;

      var stats = {
        mean: mean,
        df: df,
        variance: variance,
        sd: sd,
        sem: sem,
        moe: moe,
        rme: rme,
        //samples: samples.join(" ")
      };
      console.log(stats);
      var data = {
        name: engineInput.value,
        mean: mean,
        sem: sem,
        variance: variance,
        moe: moe,
        rme: rme,
        samples: samples.join(","),
        df: df,
        dotSize: dotQtyInput.value - 0 
      };
      jQuery.ajax({
        url: '/records',
        data: data,
        method: 'POST',
        success: function(data, textStatus, xhr) {
          console.log(data);
          console.log(textStatus);
          console.log(xhr);
        }
      });

      samples = [];
      location.reload();
    }
  }

  function createDots(isFamous) {
    var i = Number(dotQtyInput.value), dot, modifier, t, renderer, view;
    dots = [];
    rawDots = [];
    
    modifiers = [];
    renderers = [];
    transitionables = [];
    while (--i > -1) {
      if (isFamous) {
        //renderer = new RenderController();
        //view = new View();
        t = new Transitionable([0, 0, 1, 1]);
        dot = new ImageSurface({
          content: './img/dot.png',
          attributes: {
            id: 'dot' + i
          }
        });

        modifier = new Modifier({
          origin: [.5,.5],
          align: [.5,.5],
          transform: function() {
            var t = transitionables[this.count];
            return Transform.translate(
              t.get()[0],
              t.get()[1],
              0
            );
          },
          size: function() {
            var t = transitionables[this.count];
            return [t.get()[2], t.get()[3]]
          }
        }); 
        modifier.count = i;

        //view.add(modifier).add(dot);
        //renderer.show(view);
        //mainContext.add(renderer);
        mainContext.add(modifier).add(dot);
        //rawDots.push(dot);
        dots.push(currentTest.wrapDot(dot));
        modifiers.push(modifier);
        //renderers.push(renderer);
        transitionables.push(t);

      } else {
        dot = document.createElement("img");
        dot.src = "img/dot.png";
        dot.width = 1;
        dot.height = 1;
        dot.id = "dot" + i;
        dot.style.cssText = startingCSS;
        container.appendChild(dot);
        rawDots.push(dot);
        dots.push(currentTest.wrapDot(dot));
      }
    }
  }

  jQuery("#start").on('touchstart click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    if (e.handled !== true) {
      startTest();

      e.handled = true;
    } else {
      return true;
    }
  });
  jQuery("#checkRecord").on('touchstart click', function() {
    window.location = '/records';
  });

  //jQuery("#start").on({ 'touchend': startTest });
  jQuery("#dotQuantity,#duration,#engine").change(function(e) {
    if (inProgress) {
      toggleTest();
      toggleTest();
    }
  });
  jQuery.easing.cubicIn = $.easing.cubicIn = function( p, n, firstNum, diff ) { //we need to add the standard CubicIn ease to jQuery
    return firstNum + p * p * p * diff;
  }
  jQuery.fx.interval = 10; //ensures that jQuery refreshes at roughly 100fps like GSAP, TweenJS, and most of the others to be more even/fair.
  TweenLite.to(instructions, 0, {css:{opacity:0}, immediateRender:true});
  TweenLite.to(instructions, 0.7, {css:{opacity:1}, delay:0.25});

  //ticker.fps(100);
  //ticker.useRAF(false); //I noticed that requestAnimationFrame didn't provide as much accuracy in terms of counting true frame renders, particularly in Chrome. For example, set it to true and then choose a VERY high number of dots for an engine like jQuery and even though it is so bogged down that it doesn't even get to render a single dot mid-point in its tween, the FPS reports as around 10-16fps in Chrome. Apparently the browser is calling the requestAnimationFrame without even rendering the screen! Maybe there's a minimum threshold. In any case, switching requestAnimationFrame off appears to give the most accurate results. However, the default timing mode in TweenLite does use requestAnimationFrame because it has many other benefits, like throttling down when the browser tab is switched.

  function activateFPS() {
    //var MAX_FRAME_SIZE = 9;
    fpsActive = true;
    frames = 0;
    samplesLength = 0;
    lastUpdate = getTime();
    requestAnimationFrame(updateFPS);
    //fpsIntervalID = setInterval(updateFPS, MAX_FRAME_SIZE);
  }

  var getTime = Date.now || function() {return new Date().getTime();}, 
  lastUpdate, frames, fpsIntervalID;
  function updateFPS() {
    frames++;
    var elapsed = getTime() - lastUpdate;
    //console.log(elapsed);
    // 每隔300ms更新一次显示的FPS的值;
    // 同时重置frame计数
    //if (fpsActive && elapsed > 1000) {
    if (fpsActive && elapsed > 300) {
      var fpsVal = frames / elapsed * 1000;
      samples.push(fpsVal);
      samplesLength++;

      fpsElem.innerHTML = Number(fpsVal).toFixed(1) + " fps";
      lastUpdate += elapsed;
      frames = 0;
    }
    if (fpsActive) {
      if (samplesLength <= DF) {
        requestAnimationFrame(updateFPS);
      }
      else {
        toggleTest();
      }
    }
  }
});
