

let planes;
let curtainsP;


function projfunc (smoothScroll) {
    let useNativeScroll;
    let scrollEffect = 0;
    let canvasclick;
    var planesDeformations = 0
	let d = document;


    function lerp(start, end, amt) {
        return (1 - amt) * start + amt * end * 0.5;
      }

    // set up our WebGL context and append the canvas to our wrapper
    curtainsP = new Curtains({
        container: document.getElementById("canvas"),
        watchScroll: useNativeScroll,
        pixelRatio: Math.min(1.5, window.devicePixelRatio), 
        autoRender: false, 
    });


  curtainsP.onRender(() => {
    if(useNativeScroll) {
        // update our planes deformation
        // increase/decrease the effect
        planesDeformations = lerp(planesDeformations, 0, 0.00);
        scrollEffect = lerp(scrollEffect, 5, 0.0);
    }
}).onScroll(() => {
    // get scroll deltas to apply the effect on scroll
    const delta = curtainsP.getScrollDeltas();

    // invert value for the effect
    delta.x = -delta.x;

    // threshold
    if(delta.x > 60) {
        delta.x = 60;
    }
    else if(delta.x < -60) {
        delta.x = -60;
    }
    if(Math.abs(delta.x) > Math.abs(planesDeformations)) {
        planesDeformations = lerp(planesDeformations, delta.x, 0.5);
    }
  
    if(Math.abs(delta.x) > Math.abs(scrollEffect)) {
        scrollEffect = lerp(scrollEffect, delta.x, 0.5);
    }

}).onError(() => {
    // we will add a class to the document body to display original images
    document.body.classList.add("no-curtains", "planes-loaded");
        plane.remove();
  
}).onContextLost(() => {
    // on context lost, try to restore the context
    curtainsP.restoreContext();
});

function updateScroll(xOffset, yOffset) {
    // update our scroll manager values
    curtainsP.updateScrollValues(xOffset, yOffset);
}

// custom scroll event
if(!useNativeScroll) {
    // we'll render only while lerping the scroll
    curtainsP.disableDrawing();
    smoothScroll.on('scroll', (obj) => {
        updateScroll(obj.scroll.x, obj.scroll.y);

        // render scene
        curtainsP.needRender();
    });
}

    ///// SMOOTH SCROLL END////

    
    const mouse = new Vec2();
    const lastMouse = mouse.clone();
    const velocity = new Vec2();


    // use gsap ticker to render our scene
    // gsap ticker handles different monitor refresh rates
    // besides for performance we'll want to have only one request animation frame loop running
    gsap.ticker.add(curtainsP.render.bind(curtainsP));

    // we will keep track of all our planes in an array
    planes = [];


    // get our planes elements
    var planeElements = document.getElementsByClassName("plane");

    const vs = `
        precision mediump float;

        // default mandatory variables
        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;

        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;

        uniform mat4 planeTextureMatrix;

        // custom variables
        varying vec3 vVertexPosition;
        varying vec2 vTextureCoord;
        
        uniform vec2 uMousePosition;
        uniform float uTime;
        uniform float uTransition;

        uniform float uPlaneDeformation;

        void main() {
            vec3 vertexPosition = aVertexPosition;
            
            // convert uTransition from [0,1] to [0,1,0]
            float transition = 1.0 - abs((uTransition * 2.0) - 1.0);
            
            //vertexPosition.x *= (1 + transition * 2.25);
            
            // get the distance between our vertex and the mouse position
            float distanceFromMouse = distance(uMousePosition, vec2(vertexPosition.x, vertexPosition.y));

            // calculate our wave effect
            float waveSinusoid = cos(5.0 * (distanceFromMouse - (uTime / 30.0)));

            // attenuate the effect based on mouse distance
            float distanceStrength = (0.4 / (distanceFromMouse + 0.4));

            // calculate our distortion effect
            float distortionEffect = distanceStrength * waveSinusoid * 0.33;

            // apply it to our vertex position
            vertexPosition.z +=  distortionEffect * -transition;
            vertexPosition.x +=  (distortionEffect * transition * (uMousePosition.x - vertexPosition.x));


    vertexPosition.x += sin(((vertexPosition.x * vertexPosition.y + 1.0) / 2.0) * 3.141592) * (sin(uPlaneDeformation / 200.0))/1.8;



            gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

            // varyings
            vVertexPosition = vertexPosition;
            vTextureCoord = (planeTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
        }
    `;

    const fs = `
        precision highp float;

        varying vec3 vVertexPosition;
        varying vec2 vTextureCoord;

        uniform sampler2D planeTexture;

        void main( void ) {
            // apply our texture
            vec4 finalColor = texture2D(planeTexture, vTextureCoord);
            
            // fake shadows based on vertex position along Z axis
            finalColor.rgb += clamp(vVertexPosition.z, -1.0, 0.0) * 0.75;
            // fake lights based on vertex position along Z axis
            finalColor.rgb += clamp(vVertexPosition.z, 0.0, 1.0) * 0.75;
        
            // just display our texture
            gl_FragColor = finalColor;
        }
    `;

    const params = {
        sampler: "uTexture",
        vertexShader: vs,
        fragmentShader: fs,
        shareProgram: true, // share planes program to improve plane creation speed

        widthSegments: 20,
        heightSegments: 20,
        autoloadSources: true,
        uniforms: {
            planeDeformation: {
                name: "uPlaneDeformation",
                type: "1f",
                value: 0,
            },
            time: {
                name: "uTime",
                type: "1f",
                value: 0,
            },
            fullscreenTransition: {
                name: "uTransition",
                type: "1f",
                value: 0,
            },
            mousePosition: {
                name: "uMousePosition",
                type: "2f",
                value: mouse,
            }
        }
    };

    // add our planes and handle them
    for(let i = 0; i < planeElements.length; i++) {
        const plane = new Plane(curtainsP, planeElements[i], params);
        plane.onError(() => {
            plane.remove();
        });
        planes.push(plane);

        handlePlanes(i);
    }
    function handlePlanes(index) {
        const plane = planes[index];
       
        plane.onReady(() => {
            plane.textures[0].setScale(new Vec2(1, 1));


            // once everything is ready, display everything
            if(index === planes.length - 1) {
                document.body.classList.add("planes-loaded");
            }

            plane.htmlElement.addEventListener("click", (e) => {
  

                onPlaneClick(e, plane,);
                gsap.to(".smooth-scroll", {
                    opacity: 0,
                    duration: 1.65,
                    ease: "power4.inOut"
                });

            });

        }).onAfterResize(() => {
            // if plane is displayed fullscreen, update its scale and translations
            if(plane.userData.isFullscreen) {
                const planeBoundingRect = plane.getBoundingRect();
                const curtainBoundingRect = curtainsP.getBoundingRect();

                plane.setScale(new Vec2(
                    curtainBoundingRect.width / planeBoundingRect.width,
                    curtainBoundingRect.height / planeBoundingRect.height
                ));

                plane.setRelativeTranslation(new Vec3(
                    -1 * planeBoundingRect.left / curtainsP.pixelRatio,
                    -1 * planeBoundingRect.top / curtainsP.pixelRatio,
                    0
                ));
            }

          
        }).onRender(() => {
            plane.uniforms.time.value++;
            plane.uniforms.planeDeformation.value = planesDeformations;
            plane.setRenderTarget(rgbTarget);
        });


        
        plane.onError(() => {
            plane.remove();
        });
    }



    /*** GALLERY ***/
 

    const galleryState = {
        fullscreenThumb: false, // is actually displaying a fullscreen image
        closeButtonEl: document.getElementById("close-button"), // close button element
     
        openTween: null, // opening tween
        closeTween: null, // closing tween
    };

    // on closing a fullscreen image
    galleryState.closeButtonEl.addEventListener("click", () => {
        const fullScreenPlane = curtainsP.planes.find(plane => plane.userData.isFullscreen);
   
        // if there's a plane actually displayed fullscreen, we'll be shrinking it back to normal
        if(fullScreenPlane && galleryState.fullscreenThumb) {
            // reset fullscreen state
            galleryState.fullscreenThumb = false;
            document.body.classList.remove("is-fullscreen");

            fullScreenPlane.userData.isFullscreen = false;

            // hide close button again
            galleryState.closeButtonEl.style.display = "none";

            // force mouse position to be at the center of the plane
            fullScreenPlane.uniforms.mousePosition.value.set(0, 0);
            // reset timer for the animation
            fullScreenPlane.uniforms.time.value = 0;

            // draw all other planes again
            const allOtherPlanes = curtainsP.planes.filter(el => el.uuid !== fullScreenPlane.uuid && el.type !== "PingPongPlane");
            allOtherPlanes.forEach(el => {
                el.visible = true;
            });

            // object that will be tweened
            let animation = {
                // current scale and translation values
                scaleX: fullScreenPlane.scale.x,
                scaleY: fullScreenPlane.scale.y,
                translationX: fullScreenPlane.relativeTranslation.x,
                translationY: fullScreenPlane.relativeTranslation.y,
                // transition effect back 0 from to 1
                transition: 1,
                // texture scale back from 1 to 1.5
                textureScale: 1,
            };

            // create vectors only once and use them later on during tween onUpdate callback
            const newScale = new Vec2();
            const newTranslation = new Vec3();

            // kill tween
            if(galleryState.closeTween) {
                galleryState.closeTween.kill();
            }

            galleryState.closeTween = gsap.to(animation, 2, {
                scaleX: 1,
                scaleY: 1,
                translationX: 0,
                translationY: 0,
                transition: 0,
                textureScale: 1,
                ease: Power3.easeInOut,
                onUpdate: function() {
                    // plane scale
                    newScale.set(animation.scaleX, animation.scaleY);
                    fullScreenPlane.setScale(newScale);

                    // plane translation
                    newTranslation.set(animation.translationX, animation.translationY, 0);
                    fullScreenPlane.setRelativeTranslation(newTranslation);

                    // texture scale
                    newScale.set(animation.textureScale, animation.textureScale);
                    fullScreenPlane.textures[0].setScale(newScale);

                    // transition
                    fullScreenPlane.uniforms.fullscreenTransition.value = animation.transition;

                },
                onComplete: function() {
                    // reset the plane renderOrder to 0 (we could have ommit the parameter)
                    fullScreenPlane.setRenderOrder(0);

                    // clear tween
                    galleryState.closeTween = null;
                }
            });
        }
    });

    function onPlaneClick(event, plane) {
        smoothScroll.stop();
        smoothScroll.destroy();

        smoothScroll.init();
        console.log(smoothScroll)
        canvasclick = document.getElementById("canvas"); // close button element
      
        // if no planes are already displayed fullscreen
        if(!galleryState.fullscreenThumb) {
            // set fullscreen state
            galleryState.fullscreenThumb = true;
            document.body.classList.add("is-fullscreen");
      

            // flag this plane
            plane.userData.isFullscreen = true;

            // put plane in front
            plane.setRenderOrder(1);

            // start ripple effect from mouse position, and tween it to center
            const startMousePostion = plane.mouseToPlaneCoords(mouse);
            plane.uniforms.mousePosition.value.copy(startMousePostion);
            plane.uniforms.time.value = 0;
     


            // we'll be using bounding rect values to tween scale and translation values
            const planeBoundingRect = plane.getBoundingRect();
            const curtainBoundingRect = curtainsP.getBoundingRect();

            // starting values
            let animation = {
                scaleX: 1,
                scaleY: 1,
                translationX: 0,
                translationY: 0,
                transition: 0,
                textureScale: 1,
                mouseX: startMousePostion.x,
                mouseY: startMousePostion.y,
            
            };


            // create vectors only once and use them later on during tween onUpdate callback
            const newScale = new Vec2();
            const newTranslation = new Vec3();

            // kill tween
            if(galleryState.openTween) {
                galleryState.openTween.kill();
            }

            // we want to take top left corner as our plane transform origin
          

            galleryState.openTween = gsap.to(animation, 2, {
                scaleX: curtainBoundingRect.width / planeBoundingRect.width,
                scaleY: curtainBoundingRect.height / planeBoundingRect.height,
                translationX: -1 * planeBoundingRect.left / curtainsP.pixelRatio,
                translationY: -1 * planeBoundingRect.top / curtainsP.pixelRatio,
                transition: 1,
                textureScale: 1,
                mouseX: 0,
                mouseY: 0,
                ease: Power3.easeInOut,
                
                
                onUpdate: function() {
                    // plane scale
                    newScale.set(animation.scaleX, animation.scaleY);
                    plane.setScale(newScale);

                    // plane translation
                    newTranslation.set(animation.translationX, animation.translationY, 0);
                    plane.setRelativeTranslation(newTranslation);

                    // texture scale
                    newScale.set(animation.textureScale, animation.textureScale);
                    plane.textures[0].setScale(newScale);

                    // transition value
                    plane.uniforms.fullscreenTransition.value = animation.transition;

                  

                    // tween mouse position back to center
                    plane.uniforms.mousePosition.value.set(animation.mouseX, animation.mouseY);
                    
                },
                onComplete: function() {
                    
                    // do not draw all other planes since animation is complete and they are hidden
                    const nonClickedPlanes = curtainsP.planes.filter(el => el.uuid !== plane.uuid && el.type !== "PingPongPlane");

                    nonClickedPlanes.forEach(el => {
                        el.visible = false;
                    });

                    // display close button
                    galleryState.closeButtonEl.style.display = "inline-block";

                    // clear tween
                    galleryState.openTween = null;

                }
            });
            plane.setTransformOrigin(newTranslation);
            
        }
    }

    /*** POST PROCESSING ***/
    // we'll be adding a flowmap rgb shift effect and fxaapass

    var rgbFs = `
    precision mediump float;

    varying vec3 vVertexPosition;
    varying vec2 vTextureCoord;
  
    uniform sampler2D uRenderTexture;
  
    uniform float uScrollEffect;
  
    void main() {
        vec2 textureCoords = vTextureCoord;
  
        vec2 redTextCoords = vec2(vTextureCoord.xy  + uScrollEffect / 4000.0);
        vec2 greenTextCoords = vec2(vTextureCoord.xy + uScrollEffect / 30000.0);
        vec2 blueTextCoords = vec2(vTextureCoord.xy+ uScrollEffect / 30000.0);
  
        vec4 red = texture2D(uRenderTexture, redTextCoords);
        vec4 green = texture2D(uRenderTexture, greenTextCoords);
        vec4 blue = texture2D(uRenderTexture, blueTextCoords);
  
        vec4 finalColor = vec4(red.r, green.g, blue.b, min(1.0, red.a * blue.a * green.a));
        gl_FragColor = finalColor;
    }
`;

    var rgbTarget = new RenderTarget(curtainsP);

    var rgbPass = new ShaderPass(curtainsP, {
      fragmentShader: rgbFs,
      renderTarget: rgbTarget,
      depthTest: false, // we need to disable the depth test to display that shader pass on top of the first one
      uniforms: {
        scrollEffect: {
          name: "uScrollEffect",
          type: "1f",
          value: 0,
        },
      },
    });

    if (rgbPass) {
      rgbPass.onRender(function () {
        // update the uniform
        rgbPass.uniforms.scrollEffect.value = scrollEffect;
      });
    }


    
}



function destroyPlaneP() {

  }
export { curtainsP, projfunc, destroyPlaneP };
