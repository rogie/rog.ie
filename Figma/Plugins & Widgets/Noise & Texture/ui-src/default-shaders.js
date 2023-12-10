// @ts-nocheck
import shaders from './all.glsl';
import resolveLygia from './resolveLygia.js';

const defaultShaders = {
  // see: https://web.archive.org/web/20150826095308/http://webstaff.itn.liu.se/~stegu/TNM022-2005/perlinnoiselinks/perlin-noise-math-faq.html#tile
  global: `
      #ifdef GL_ES
      precision mediump float;
      #endif

      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_time;
      uniform vec3 u_color;
      uniform float u_size;  
      uniform float u_distribution;
      uniform bool u_randomize;
      uniform bool u_random_rotation;
      uniform bool u_multicolor;
      uniform float u_gain;
      uniform float u_lacunarity;
      uniform float u_octaves;
      uniform float u_frequency;
      uniform float u_rotation;
      uniform float u_multiplier;
      uniform float u_smoothness;
      uniform float u_interpolate;
      uniform float u_distance;
      uniform sampler2D u_image;
      uniform vec2 u_image_resolution;
      uniform float u_phase;
      uniform float u_count;
      uniform float u_width;
      uniform float u_jitter;
      uniform float u_factor;
      uniform float u_spread;
      uniform float u_strength;
      uniform float u_random_seed;
      uniform float u_vignette;
      uniform float u_aa_passes;

      #define PI 3.14159265358979323846
      #define TWO_PI 6.28318530718
      #define MAX_OCTAVES 8

      float vignette(float amount){
          vec2 position = (gl_FragCoord.xy / u_resolution) - vec2(0.5);           
          float dist = length(position * vec2(u_resolution.x/u_resolution.y, 1.0));

          float radius = 1.0*amount;
          float softness = 1.0-radius;
          float v = smoothstep(radius, radius - softness, dist);

          return v;
      }

      float aspectScale(inout vec2 st,float xRes, float yRes){
          float aspect = xRes/yRes;
          float diff = (1.0 - aspect)/2.0;
          float vis = 1.0;
          
          if(aspect > 1.){
            st.y *= aspect;
            st.y += diff;
            vis = (1.0 - step(1.0,st.y)) * (step(0.0,st.y)) * (1.0 - step(1.0,st.x)) * (step(0.0,st.x));
          } else {
              st.x *= yRes/xRes;
              st.x += (1.0 - yRes/xRes)/2.0;
              vis = (1.0 - step(1.0,st.x)) *(step(0.0,st.x)) * (1.0 - step(1.0,st.y)) *(step(0.0,st.y));
          }        
          return vis;
      }

      float circle(vec2 st, float radius) {
        vec2 d = st - vec2(0.5);
        return 1.0 - smoothstep(radius,radius+0.005, length(d));
      }
      
      float sdCircle( vec2 p, float r )
      {
          return length(p) - r;
      }

      float sdPentagon( in vec2 p, in float r )
      {
          const vec3 k = vec3(0.809016994,0.587785252,0.726542528); // pi/5: cos, sin, tan
          p.y = -p.y;
          p.x = abs(p.x);
          p -= 2.0*min(dot(vec2(-k.x,k.y),p),0.0)*vec2(-k.x,k.y);
          p -= 2.0*min(dot(vec2( k.x,k.y),p),0.0)*vec2( k.x,k.y);
        p -= vec2(clamp(p.x,-r*k.z,r*k.z),r);    
          return length(p)*sign(p.y);
      }

      float sdHexagon( in vec2 p, in float r )
      {
          const vec3 k = vec3(-0.866025404,0.5,0.577350269);
          p = abs(p);
          p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
          p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
          return length(p)*sign(p.y);
      }

      float ndot(vec2 a, vec2 b ) { return a.x*b.x - a.y*b.y; }
      float sdRhombus( in vec2 p, in vec2 b ) 
      {
          p = abs(p);
          float h = clamp( ndot(b-2.0*p,b)/dot(b,b), -1.0, 1.0 );
          float d = length( p-0.5*b*vec2(1.0-h,1.0+h) );
          return d * sign( p.x*b.y + p.y*b.x - b.x*b.y );
      }

      float sdSegment( in vec2 p, in vec2 a, in vec2 b )
      {
          vec2 pa = p-a, ba = b-a;
          float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
          return length( pa - ba*h );
      }

      float sdTriangleIsosceles( in vec2 p, in vec2 q )
      {
          p.x = abs(p.x);
          vec2 a = p - q*clamp( dot(p,q)/dot(q,q), 0.0, 1.0 );
          vec2 b = p - q*vec2( clamp( p.x/q.x, 0.0, 1.0 ), 1.0 );
          float s = -sign( q.y );
          vec2 d = min( vec2( dot(a,a), s*(p.x*q.y-p.y*q.x) ),
                        vec2( dot(b,b), s*(p.y-q.y)  ));
          return -sqrt(d.x)*sign(d.y);
      }

      float sdBox( in vec2 p, in vec2 b )
      {
          vec2 d = abs(p)-b;
          return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
      }

      float diagonal (vec2 st, float pct, float thickness, float feather){
        return  smoothstep( pct-feather, pct, st.y+thickness) -
                smoothstep( pct, pct+feather, st.y-thickness);
      }

      float blur(float distance, float amount) {
        return smoothstep(0., amount, distance);
      }

      vec2 rotate2D(vec2 _st, float _angle){
          _st -= 0.5;
          _st =  mat2(cos(_angle),-sin(_angle),
                      sin(_angle),cos(_angle)) * _st;
          _st += 0.5;
          return _st;
      }

      highp float rand(vec2 co)
      {
          highp float a = 12.9898;
          highp float b = 78.233;
          highp float c = 43758.5453;
          highp float dt= dot(co.xy ,vec2(a,b));
          highp float sn= mod(dt,3.14);
          return fract(sin(sn) * c);
      }

      mat2 rotate2d(float angle){
          return mat2(cos(angle),-sin(angle),
                      sin(angle),cos(angle));
      }

    `,
  random: (options) => {

    let shapeFragment = ``;

    switch (options.shape) {
      case "square":
        shapeFragment = `
            gl_FragColor = vec4(vec3(color),step(1.0 - distribution,amt) * opacity);`;
        break;
      case "circle":
        shapeFragment = `
            float blurAmount = (u_resolution.x / scale)*0.001; // The higher the blur is the smaller you should make the shape
            float shapeScale = 1.2; // make me bigger to make the shape smaller.  2.0 should fill frame.

            shape = blur(sdCircle ( (st-0.5) * (shapeScale + blurAmount), 0.5), blurAmount);

            gl_FragColor = vec4(vec3(color),step(1.0 - distribution,amt) * opacity * (1.-shape));`;
        break;
      case "triangle":
        shapeFragment = `
            float blurAmount = (u_resolution.x / scale)*0.001; // The higher the blur is the smaller you should make the shape
            float shapeScale = 1.2; // make me bigger to make the shape smaller.  2.0 should fill frame.

            shape = blur(sdTriangleIsosceles(((st-0.5)-vec2(0.0,0.5-blurAmount))*(shapeScale+blurAmount), vec2(.5-blurAmount,-1. + blurAmount)), blurAmount);

            gl_FragColor = vec4(vec3(color),step(1.0 - distribution,amt) * opacity * (1.-shape));`;
        break;
      case "diamond":
        shapeFragment = `
            float blurAmount = (u_resolution.x / scale)*0.001; // The higher the blur is the smaller you should make the shape
            float shapeScale = 1.2; // make me bigger to make the shape smaller.  2.0 should fill frame.

            shape = blur(sdRhombus(((st-0.5)-blurAmount)*(shapeScale+blurAmount), vec2(.5-blurAmount,0.5 + blurAmount)), blurAmount);

            gl_FragColor = vec4(vec3(color),step(1.0 - distribution,amt) * opacity * (1.-shape));`;
        break;
      case "line":
        shapeFragment = `
            float thickness = 0.02;
            float feather = (u_resolution.x / scale)*0.001;
            shape = diagonal(st,st.x,thickness, feather);
            gl_FragColor = vec4(vec3(color),step(1.0 - distribution,amt) * opacity * shape);
          `;
        break;
      case "image":
        shapeFragment = `
                     
            float vis = aspectScale(st, u_image_resolution.x, u_image_resolution.y);

            vec4 image = vec4(1.0);
            image = texture(u_image, st);
            image.a *= step(1.0 - distribution,amt) * vis;

          gl_FragColor = image; `;
        break;
    }

    return `  
        ${shaders}

        void staticNoise(vec3 color, float scale, float distribution, float rotation, bool randomize, bool random_rotation, bool multicolor){
          vec2 st = gl_FragCoord.xy / u_resolution.x;
          st *= u_resolution / scale; // Scale the coordinate system

          vec2 ipos = floor(st);  // get the integer coords
          vec2 fpos = fract(st);  // get the fractional coords
          st = fpos;

          // Use a matrix to rotate the space
          if (random_rotation == true) {
            rotation = rand(ipos);
          }
          st = rotate2D(st, PI * rotation);

          // opacity
          float opacity = 1.0;
          if (randomize == true) {
            opacity = rand(ipos * u_random_seed);
          }

          // amount of visible fragments
          float amt = hash3D(hash3D(ipos).xy).x;

          // vignette
          vec2 center = vec2(u_resolution / scale*0.5 - 0.5);
          float dist = distance(ipos,center);
          float v = (1.0 - (dist/center.x*(u_vignette)));
          opacity *= pow(v,20.);

          // color | multicolor
          if (multicolor == true){
            color = hash3D(ipos);
          }

          // shape
          float shape = 1.;
          ${shapeFragment}
          
        }

          void main() {
            staticNoise(u_color, u_size, u_distribution, u_rotation, u_randomize, u_random_rotation, u_multicolor);
          }
        `;
  },
  get randomStatic() {
    return this.random()
  },
  perlin: (options) => `    
      
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));

        // FBM implementation using Perlin noise, can also be used to create ridges based on the mode used.
        // @param scale Number of tiles, must be  integer for tileable results, range: [2, inf]
        // @param octaves Number of octaves for the fbm, range: [1, inf]
        // @param shift Position shift for each octave, range: [0, inf]
        // @param axialShift Axial or rotational shift for each octave, range: [-inf, inf]
        // @param gain Gain for each fbm octave, range: [0, 2], default: 0.5
        // @param lacunarity Frequency of the fbm, must be integer for tileable results, range: [1, 32]
        // @param mode Mode used in combining the noise for the ocatves, range: [0, 5]
        // @param factor Pow intensity factor, range: [0, 10], default: 1.0
        // @param offset Offsets the value of the noise, range: [-1, 1], default: 0.0
        // @param octaveFactor The octave intensity factor, the lower the more pronounced the lower octaves will be, range: [-1, 1], default: 0.0
        // @param seed Seed to randomize result, range: [0, inf], default: 0.0
        // @return value of the noise, range: [0, inf]
        //float fbmPerlin(vec2 pos, vec2 scale, int octaves, float shift, float axialShift, float gain, float lacunarity, uint mode, float factor, float offset, float octaveFactor, float seed) 
        float value = fbmPerlin(p, scale, int(u_octaves), /*shift*/ u_phase *100., u_phase, u_gain*2., floor(u_lacunarity), 4u, /*factor*/ u_factor, /*offset*/ 0.0, 0.0);
        
        return vec4(u_color,value);
      }
      
      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        vec2 fragCoord = gl_FragCoord.xy;
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+fragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  perlinContour: () => `    
      
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));

        // FBM implementation using Perlin noise, can also be used to create ridges based on the mode used.
        // @param scale Number of tiles, must be  integer for tileable results, range: [2, inf]
        // @param octaves Number of octaves for the fbm, range: [1, inf]
        // @param shift Position shift for each octave, range: [0, inf]
        // @param axialShift Axial or rotational shift for each octave, range: [-inf, inf]
        // @param gain Gain for each fbm octave, range: [0, 2], default: 0.5
        // @param lacunarity Frequency of the fbm, must be integer for tileable results, range: [1, 32]
        // @param mode Mode used in combining the noise for the ocatves, range: [0, 5]
        // @param factor Pow intensity factor, range: [0, 10], default: 1.0
        // @param offset Offsets the value of the noise, range: [-1, 1], default: 0.0
        // @param octaveFactor The octave intensity factor, the lower the more pronounced the lower octaves will be, range: [-1, 1], default: 0.0
        // @param seed Seed to randomize result, range: [0, inf], default: 0.0
        // @return value of the noise, range: [0, inf]
        //float fbmPerlin(vec2 pos, vec2 scale, int octaves, float shift, float axialShift, float gain, float lacunarity, uint mode, float factor, float offset, float octaveFactor, float seed) 
        float value = fbmPerlin(p, scale, int(u_octaves), /*shift*/ u_phase *100., u_phase, u_gain*2., floor(u_lacunarity), 4u, /*factor*/ u_factor, /*offset*/ 0.0, 0.0);

        float f  = fract(value * 10.0);  
        value = step(1.-u_width, f);

        return vec4(u_color,value);
      }
      
      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  perlinWarp: () => `    
      
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));

        // Domain warping using the derivatives of perlin noise.
        // @param scale Number of tiles, must be  integer for tileable results, range: [2, inf]
        // @param strength Controls the warp strength, range: [-1, 1]
        // @param phase Noise phase, range: [-inf, inf]
        // @param spread The gradient spread, range: [0.001, inf], default: 0.001
        // @param factor Pow intensity factor, range: [0, 10]
        float value = perlinNoiseWarp(p, scale, /*strength*/ u_strength, /*phase*/ u_phase, u_factor, 0.001, 0.0);

        return vec4(u_color,value);
      }
      
      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,

  voronoi: () => `    
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));

        // FBM implementation using Voronoi.
        // @param scale Number of tiles, must be  integer for tileable results, range: [2, inf]
        // @param octaves Number of octaves for the fbm, range: [1, inf]
        // @param shift Position shift for each octave, range: [0, inf]
        // @param timeShift Time shift for each octave, range: [-inf, inf]
        // @param gain Gain for each fbm octave, range: [0, 2], default: 0.5
        // @param lacunarity Frequency of the fbm, must be integer for tileable results, range: [1, 32]
        // @param octaveFactor The octave intensity factor, the lower the more pronounced the lower octaves will be, range: [-1, 1], default: 0.0
        // @param jitter Jitter factor for the cells, if zero then it will result in a square grid, range: [0, 1], default: 1.0
        // @param interpolate Interpolate factor between the multiplication mode and normal mode, default: 0.0
        // @param seed Seed to randomize result, range: [0, inf], default: 0.0
        // @return value of the noise, range: [0, inf]
        vec4 value = fbmVoronoi(p, scale, int(u_octaves), /*shift*/ 0., /*timeShift*/ u_phase, /*gain*/ u_gain, /*lacunarity*/ u_lacunarity, /*octaveFactor [-1, 1]*/ u_factor, /*jitter*/ u_jitter, /*interpolate*/ 0., /*seed*/ 0.);

        return vec4(u_color,value.x);
      }

      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  voronoiFlat: () => `    
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));
        
        /* 3d cells */
        //vec3 value = cellularNoised(p, scale, /*jitter:*/ 1.0, /*phase*/ u_phase * 0.5, 23.0).yzx * 0.5 + 0.5;
        //vec2 value = cellularNoise(p, scale, /*jitter:*/ 1.0, /*phase:*/ u_phase * 0.5, /*metric*/ 0u, 0.0) * 0.5 + 0.5;;
        
        // FBM implementation using Voronoi.
        // @param scale Number of tiles, must be  integer for tileable results, range: [2, inf]
        // @param octaves Number of octaves for the fbm, range: [1, inf]
        // @param shift Position shift for each octave, range: [0, inf]
        // @param timeShift Time shift for each octave, range: [-inf, inf]
        // @param gain Gain for each fbm octave, range: [0, 2], default: 0.5
        // @param lacunarity Frequency of the fbm, must be integer for tileable results, range: [1, 32]
        // @param octaveFactor The octave intensity factor, the lower the more pronounced the lower octaves will be, range: [-1, 1], default: 0.0
        // @param jitter Jitter factor for the cells, if zero then it will result in a square grid, range: [0, 1], default: 1.0
        // @param interpolate Interpolate factor between the multiplication mode and normal mode, default: 0.0
        // @param seed Seed to randomize result, range: [0, inf], default: 0.0
        // @return value of the noise, range: [0, inf]
        vec4 value = fbmVoronoi(p, scale, int(u_octaves), /*shift*/ 0., /*timeShift*/ u_phase, /*gain*/ u_gain, /*lacunarity*/ u_lacunarity, /*factor*/ u_factor, /*jitter*/ u_jitter, /*interpolate*/ 0., /*seed*/ 0.);    

        return vec4(u_color,value.y);
      }
      
      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }

    `,
  value: () => `
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));
        
        // Classic FBM implementation using Value noise.
        // @param scale Number of tiles, must be  integer for tileable results, range: [2, inf]
        // @param octaves Number of octaves for the fbm, range: [1, inf]
        // @param shift Position shift for each octave, range: [0, inf]
        // @param timeShift Time shift for each octave, range: [-inf, inf]
        // @param gain Gain for each fbm octave, range: [0, 2], default: 0.5
        // @param lacunarity Frequency of the fbm, must be integer for tileable results, range: [1, 32]
        // @param octaveFactor The octave intensity factor, the lower the more pronounced the lower octaves will be, range: [-1, 1], default: 0.0
        // @param seed Seed to randomize result, range: [0, inf], default: 0.0
        // @return value of the noise, range: [0, inf]
        //float fbm(vec2 pos, vec2 scale, int octaves, float shift, float timeShift, float gain, float lacunarity, float octaveFactor, float seed) 

        float value = fbm(p, scale, int(u_octaves), /*shift*/ 1., /*timeShift*/ u_phase, /*gain*/ u_gain, /*lacunarity*/ u_lacunarity, /*octaveFactor*/ u_factor, /*seed*/ 0.);

        return vec4(u_color,value);
      }

      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  valueGrid: () => `
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));
        
        // FBM implementation using a variation of Value noise.
        // @param scale Number of tiles, must be  integer for tileable results, range: [2, inf]
        // @param octaves Number of octaves for the fbm, range: [1, inf]
        // @param shift Position shift for each octave, range: [0, inf], default: 100.0
        // @param timeShift Time shift for each octave, range: [-inf, inf]
        // @param gain Gain for each fbm octave, range: [0, 2], default: 0.5
        // @param lacunarity Frequency of the fbm, must be integer for tileable results, range: [1, 32]
        // @param translate Translate factors for the value noise , range: [-inf, inf], default: {0.5, -0.25, 0.15}
        // @param warpStrength The warp factor used for domain warping, range: [-10, 10], default: 0.5
        // @param octaveFactor The octave intensity factor, the lower the more pronounced the lower octaves will be, range: [-1, 1], default: 0.0
        // @param seed Seed to randomize result, range: [0, inf], default: 0.0
        // @return value of the noise, range: [0, inf]
        //float fbmGrid(vec2 pos, vec2 scale, int octaves, float shift, float timeShift, float gain, float lacunarity, float warpStrength, float octaveFactor, float seed) 

        float value = fbmGrid(p, scale, int(u_octaves), /*shift*/ 100., /*timeShift*/ u_phase, /*gain*/ u_gain, /*lacunarity*/ u_lacunarity, /*warpStrength*/ 0.5, /*octaveFactor*/ u_factor, /*seed*/ vec2(0.));

        return vec4(u_color,value);
      }

      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  cellular: () => `
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));
        
        vec4 value = fbmCellular(p, scale, int(u_octaves), /*shift*/ 0., /*timeShift*/ u_phase, /*gain*/ u_gain, /*lacunarity*/ u_lacunarity, /*factor*/ u_factor, /*jitter*/ u_jitter, /*interpolate*/ 0.5, /*seed*/ 0.);

        return vec4(u_color,value);
      }

      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  valueMulti: () => `
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));
        
        vec4 n = fbmMulti(p, floor(scale * vec2(0.5, 1.)), u_lacunarity, int(u_octaves), u_phase, 0.0);
        n.xy = n.xz - n.yw;
        vec2 v = 1.0 - pow(abs(n.xy) * 4.0, vec2(0.1));
        float value = pow(1.0 - v.x * v.y, 3.0);

        return vec4(u_color,1.-value);
      }
      
      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  metaBalls: () => `
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));

        //float fbmMetaballs(vec2 pos, vec2 scale, int octaves, float shift, float timeShift, float gain, float lacunarity, float octaveFactor, float jitter, float interpolate, vec2 width, float seed) 
        float value = fbmMetaballs(p, scale, int(u_octaves), 0.0, /*timeShift:*/ u_phase, /*gain*/ u_gain, /*lacunarity*/ u_lacunarity, /*octaveFactor*/ 0.0, /*jitter*/ u_jitter, /*interpolate*/ 0., vec2(u_width, u_width*0.1), 0.0); 
        
        return vec4(u_color,1.-value); 
      }
      
      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  wave: () => `
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));        

        float value = wavePattern(p, scale, u_width, /* float smoothness*/ u_smoothness, u_gain, /* float interpolate*/ u_interpolate);
        
        return vec4(u_color,value); 
      }
      
      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  stairs: () => `
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));    
        
        //float stairsPattern(vec2 pos, vec2 scale, float width, float smoothness, float distance)   

        float value = stairsPattern(p, scale, u_width, /* float smoothness*/ u_smoothness, u_distance);
        
        return vec4(u_color,value); 
      }
      
      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  randomLines: () => `
      ${shaders}

      vec4 fragmentColor(in vec2 fragCoord){
        vec2 uv = fragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));


        //randomLines(vec2 pos, vec2 scale, float count, float width, float jitter, vec2 smoothness, float phase, float seed)
        vec3 value = randomLines(p, scale, /*count*/ u_count, /*width*/ u_width, u_jitter, /*smoothness*/ vec2(u_smoothness), /*phase*/ u_phase * 0.5, /*colorVariation*/ 0., 0.).rgb;
        return vec4(u_color,value);
      }

      void main()
      {
        // Antialiasing code
        vec4 fragColor = vec4(0.0);
        float A = u_aa_passes,  // Change A to define the level of anti-aliasing (1 to 16) ... higher numbers are REALLY slow!
              s = 1./A, x, y;
        for (x=-.5; x<.5; x+=s) for (y=-.5; y<.5; y+=s) fragColor += min ( fragmentColor(vec2(x,y)+gl_FragCoord.xy), 1.0);
            
        fragColor /= A*A;
        
        gl_FragColor = fragColor;
      }
    `,
  warp: () => `
      ${shaders}

      void main()
      {
        vec2 uv = gl_FragCoord.xy / u_resolution.x;
        vec2 p = fract(uv);
        vec2 scale = vec2(int(u_resolution.x / u_size));

        vec2 factors = vec2(1.25);
        vec4 shifts = vec4(123.0, 235.0, 53.0, 511.0);
        float curl = abs(sin(u_phase * 0.5));
        vec2 q;
        vec2 r;

        //float fbmWarp(vec2 pos, vec2 scale, vec2 factors, int octaves, vec4 shifts, float timeShift, float gain, vec2 lacunarity, float slopeness, float octaveFactor, bool negative, float seed, out vec2 q, out vec2 r) 

        float value = fbmWarp(p, scale, factors, int(u_octaves), shifts, u_phase, /*gain*/ u_gain, /*lacunarity*/ vec2(u_lacunarity), /*float slopeness*/ 0.0, /*octaveFactor*/ 1.5, true, 0.0, q, r); 
        float f = value;
        vec3 col;
        col = mix(vec3(0.1,0.4,0.7), vec3(0.6,0.5,0.3), clamp((f * f) * 1.0, 6.0, 3.0));
        col = mix(col, vec3(0.0, 0.1, 0.05), length(q));
        col = mix(col, vec3(0.1), r.x);
        col = mix(col, col * vec3(1.8, 0.4, 0.2), 0.75 * pow(length(r), 10.0)) * 0.95;

        gl_FragColor = vec4(u_color,f);
      }    
    `,
  custom: (fragmentShader) => {
    if (fragmentShader.search('#include "lygia') > -1) {
      return resolveLygia(fragmentShader)
    } else {
      return fragmentShader
    }
  },
  default: () => {
    return `
// UNIFORMS
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform vec3 u_color;
uniform sampler2D u_image;
uniform float u_scale; 
uniform float amount;
    
void main() {
  vec2 st = gl_FragCoord.xy/u_resolution;
  
  //Scale from 
  st *= 1.0 + 1.0/u_scale;      
  st = fract(st);
  
  gl_FragColor = vec4(st.x,st.y,u_time,amount);
}`
  },
  getShader(type = "random", options) {
    if (type === "custom" || type === "default") {
      return this[type](options);
    } else {
      return this.global + this[type](options);
    }
  }
}

export default defaultShaders
