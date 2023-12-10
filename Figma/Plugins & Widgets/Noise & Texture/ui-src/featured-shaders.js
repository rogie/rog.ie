// Thumbnails
import auraPng from "./images/aura.png";
import meshPng from "./images/mesh.png";
import mountainsPng from "./images/mountains.png";
import planePng from "./images/plane.png";
import spherePng from "./images/sphere.png";
import stripePng from "./images/stripe.png";
import cloudsPng from "./images/clouds.png";
import godRaysPng from "./images/god-rays.png";
import flowPng from "./images/flow.png";
import vijayPng from "./images/vijay.png";

const featuredShaders = [
    {
        name: "Flow",
        thumbnail: flowPng,
        data: {
            value: "custom",
            label: "Flow",
            uuid: "flow",
            "options": {
                "u_phase": 0.5,
                "u_scale": 0.66,
                "u_glow": 0.524,
                "u_distort_scale": 0.5,
                "u_power": 0.482,
                "u_speed": 0.2,
                "u_iterations": 4,
                "u_brightness": 0.5,
                "shader": "// Fragment shader\n\n// Uniforms\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform float u_time;\nuniform float u_phase; //units:%\nuniform float u_scale; //units:%\nuniform float u_glow; //units:%\nuniform float u_distort_scale; //units:%\nuniform float u_power; //units:%\nuniform float u_speed; //units:%\nuniform int u_iterations; //max:20\nuniform float u_brightness; //units:%\n    \n#define power 1.\n#define zoomOut 10.\n#define rot 1.\n#define huePower 0.7\n#define Speed 1.5\n#define WaveSpeed 2.\n#define Brightness 2.\n\nvoid main()\n{\n  // Normalized pixel coordinates (from 0 to 1)\n  vec2 uv = gl_FragCoord.xy/u_resolution.xy;\n\n\tvec2 XYScale = vec2(1.0,1.0);\n\tvec2 XYMove = vec2(0.0,0.0);\n\t\n\t//Centered pixel coordinates\n  uv -= vec2(0.5,0.5);\n  \n  float t = u_time;\n  \n  //Phase\n  float phase = (u_phase * 10.) * u_speed * sin(t);\n  \n  //Scaling\n  uv *= zoomOut*(1.0-u_scale);\n\tuv.xy = uv.xy * XYScale;\n\tuv.xy = uv.xy + XYMove;\n\tvec4 finalCol = vec4(0.);\n\tfloat halfDistort = u_distort_scale / 0.5;\n\tfloat distortsc2 = u_distort_scale / u_distort_scale + halfDistort;\n    \n\tfor(float i = 1.0; i < float(u_iterations); i++){\n\t\tuv.x += u_power / i * sin(i * u_distort_scale * uv.y - phase);\n\t\tuv.y += u_power / i * sin(i * distortsc2 * uv.x + phase);\n\t}\n    \n\tvec4 col = vec4(vec4(u_glow)/sin((t*WaveSpeed*u_speed)-length(uv.yx) - uv.y));\n\t\n\tfinalCol = vec4(col*col);\n  \n  vec4 Color = vec4(1.) * Brightness*u_brightness;\n\tColor = Color*Color * 0.5 + 0.5*cos(phase+uv.xyxy +vec4(0,2,4,1.0)) * huePower;\n\n  // Output to screen\n  gl_FragColor = finalCol * Color * power;\n  \n}",
                "vertex": "// Vertex shader\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}"
            }
        }
    },
    {
        name: "Vijay",
        thumbnail: vijayPng,
        data: {
            value: "custom",
            label: "Vijay",
            uuid: "vijay",
            "options": {
                "u_scale": 0.25,
                "u_spread": 0.5,
                "u_density": 0.5,
                "u_speed": 0.5,
                "u_brightness": 0.621,
                "u_particles": 51,
                "u_rotate": true,
                "shader": "/// Fragment shader\n\n// Uniforms\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform float u_time;\n\n// Custom uniforms\nuniform float u_scale; //units:%\nuniform float u_spread; //units:%\nuniform float u_density; //units:%\nuniform float u_speed; //units:%\nuniform float u_brightness; //units:%\nuniform int u_particles; //max: 100\nuniform bool u_rotate;\n\nvec3 hsv2rgb(vec3 c) {\n    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);\n    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);\n    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);\n}\n\nvec2 rotateUV(vec2 uv, float rotation)\n{\n    float mid = 0.5;\n    return vec2(\n        cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,\n        cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid\n    );\n}\n\nvec2 rotateUV(vec2 uv, float rotation, vec2 mid)\n{\n    return vec2(\n      cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,\n      cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y\n    );\n}\n\nvec2 rotateUV(vec2 uv, float rotation, float mid)\n{\n    return vec2(\n      cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,\n      cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid\n    );\n}\n\nvoid main() {\n\n    float t = u_time*u_speed+5.;\n        \n    // vars\n    float z =  (1.0 - (u_scale*0.95)) * 2.0;\n    float u_duration = u_spread + 0.1;\n    const int n = 100; // particle count\n    \n    vec3 startColor = normalize(vec3(0.,0.,0.));\n    \n    float startRadius = 0.01;\n    float endRadius = 0.08;\n    \n    float power = 0.1 + u_speed;\n\n    vec2 s = u_resolution.xy;\n    vec2 v = z*(2.*gl_FragCoord.xy-s)/s.y;\n    if(u_rotate){\n      v = rotateUV(v,u_time*0.1*u_speed,0.);\n    }\n\n    vec4 col = vec4(0.);\n    \n    vec2 pm = v.yx*1.2;\n    \n    float dMax = u_duration;\n    \n    float mb = 0.;\n    float mbRadius = 0.;\n    float sum = 0.;\n    \n    for(int i=0;i<u_particles;i++)\n    {\n      float d = fract(t*power+48934.4238*sin(float(i)*692.7398))*u_duration;\n    float a = 6.28*float(i)/float(n);\n         \n      float x = d*cos(a);\n      float y = d*sin(a);\n        \n        float distRatio = d/dMax;\n        \n        mbRadius = mix(startRadius, endRadius, distRatio); \n        \n        v = mod(v,pm) - 0.5*pm;\n        \n        vec2 p = v - vec2(x,y);\n    \n        p = mod(p,pm) - u_density*pm;\n        \n        mb = mbRadius/dot(p,p);\n    \n        sum += mb;\n        \n      // Define a harmonious color scheme (analogous colors)\n    float hue = fract(float(i) / float(n) + u_time); // Use time to animate the colors\n    vec4 analogousColor1 = vec4(hsv2rgb(vec3(hue, 1.0, 1.0)),1.); // One color\n    vec4 analogousColor2 = vec4(hsv2rgb(vec3(hue + 0.05, 1.0, 1.0)),1.); // Adjacent color\n    vec4 analogousColor3 = vec4(hsv2rgb(vec3(hue + 0.1, 1.0, 1.0)),1.); // Another adjacent color\n\n    // Mix the analogous colors based on distance ratio\n    col = mix(col, analogousColor1, mb / sum);\n    col = mix(col, analogousColor2, mb / sum);\n    col = mix(col, analogousColor3, mb / sum);\n\n    }\n  \n   sum /= float(n);\n    \n    col = normalize(col) * sum;\n    \n    sum = clamp(sum, 1.2, 0.4);\n    \n    vec4 tex = vec4(1.0);\n     \n    col *= smoothstep(tex, vec4(0.), vec4(sum));\n\n    float brightness = 1.5 * (u_brightness +0.1);  // Adjust this value for desired brightness\n    col *= brightness;\n    \n    // Output final color\n    gl_FragColor = col;\n    \n}",
                "vertex": "// Vertex shader\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}"
            }
        }
    },
    {
        name: "God rays",
        thumbnail: godRaysPng,
        data: {
            value: "custom",
            label: "God rays",
            uuid: "587dca6c-ec15-410f-a06a-7e63234ed576",
            "options": {
                "u_colors": [
                    "#9f00ff",
                    "#5660ff"
                ],
                "u_intensity": 0.946,
                "u_rays": 0.094,
                "u_reach": 0.211,
                "u_noise": false,
                "u_noise_color": "#ffffffbf",
                "shader": "// Fragment shader\n\n// Uniforms\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform float u_time;\nuniform vec4 u_colors[2];\nuniform float u_intensity;\nuniform float u_rays;\nuniform float u_reach;\nuniform bool u_noise;\nuniform vec4 u_noise_color;\n\n#include \"lygia/generative/pnoise.glsl\";\n#include \"lygia/generative/random.glsl\";\n#include \"lygia/color/mixOklab.glsl\";\n    \nfloat rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed)\n{\n\tvec2 sourceToCoord = coord - raySource;\n\tfloat cosAngle = dot(normalize(sourceToCoord), rayRefDirection);\n\t\n\treturn clamp(\n\t\t(.45 + 0.15 * sin(cosAngle * seedA + u_time * speed)) +\n\t\t(0.3 + 0.2 * cos(-cosAngle * seedB + u_time * speed)),\n\t\tu_reach, 1.0) *\n\t\tclamp((u_resolution.x - length(sourceToCoord)) / u_resolution.x, u_reach, 1.0);\n}\n\nvoid main()\n{\n\tvec2 uv = gl_FragCoord.xy / u_resolution.xy;\n\tuv.y = 1.0 - uv.y;\n\tvec2 coord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);\n\tfloat speed = u_rays * 10.0;\n\t\n\t// Set the parameters of the sun rays\n\tvec2 rayPos1 = vec2(u_resolution.x * 0.7, u_resolution.y * -0.4);\n\tvec2 rayRefDir1 = normalize(vec2(1.0, -0.116));\n\tfloat raySeedA1 = 36.2214*speed;\n\tfloat raySeedB1 = 21.11349*speed;\n\tfloat raySpeed1 = 1.5*speed;\n\t\n\tvec2 rayPos2 = vec2(u_resolution.x * 0.8, u_resolution.y * -0.6);\n\tvec2 rayRefDir2 = normalize(vec2(1.0, 0.241));\n\tfloat raySeedA2 = 22.39910*speed;\n\tfloat raySeedB2 = 18.0234*speed;\n\tfloat raySpeed2 = 1.1*speed;\n\t\n\t// Calculate the colour of the sun rays on the current fragment\n\tvec4 rays1 =\n\t\tvec4(0.,0.,0., .0) +\n\t\trayStrength(rayPos1, rayRefDir1, coord, raySeedA1, raySeedB1, raySpeed1) * u_colors[0];\n\t \n\tvec4 rays2 =\n\t\tvec4(0.,0.,0., .0) +\n\t\trayStrength(rayPos2, rayRefDir2, coord, raySeedA2, raySeedB2, raySpeed2) * u_colors[1];\n\t\n\tvec4 fragColor = (rays1) + (rays2);\n\t\n\t// Attenuate brightness towards the bottom, simulating light-loss due to depth.\n\tfloat brightness = 1.0*u_reach - (coord.y / u_resolution.y);\n\tfragColor *= (brightness + (0.5+ u_intensity));\n\t//fragColor = pow(fragColor,u_brightness*10.0);\n\tif(u_noise == true){\n    \n    // animate noise with vUv/static with st\n    float noise = random(uv*sin(u_time));\n    vec4 noiseColored = vec4(u_noise_color.rgb,noise*u_noise_color.a);\n    //color = mixOklab(color,noiseColored,0.1);\n    fragColor *= noiseColored;\n  }\n\t\n\t\n\tgl_FragColor = fragColor;\n}\n",
                "vertex": "// Vertex shader\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}"
            }
        }
    },
    {
        data: {
            value: "custom",
            label: "Mesh",
            "options": {
                "u_colors": [
                    "#00ff8f",
                    "#ffdf00",
                    "#cf4ad8",
                    "#ff5e5e"
                ],
                "u_blur": 0.646,
                "u_animate": true,
                "u_animate_speed": 1,
                "u_frequency": 0.5,
                "shader": "// Fragment shader\n\n// Uniforms\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform float u_time;\nuniform vec4 u_colors[4];\nuniform float u_blur; \nuniform bool u_animate;\nuniform float u_animate_speed;\nuniform float u_frequency;\n    \n#define S(a,b,t) smoothstep(a,b,t)\n#include \"lygia/color/mixOklab.glsl\"\n\nmat2 Rot(float a)\n{\n    float s = sin(a);\n    float c = cos(a);\n    return mat2(c, -s, s, c);\n}\n\n\n// Created by inigo quilez - iq/2014\n// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.\nvec2 hash( vec2 p )\n{\n    p = vec2( dot(p,vec2(2127.1,81.17)), dot(p,vec2(1269.5,283.37)) );\n\treturn fract(sin(p)*43758.5453);\n}\n\nfloat noise( in vec2 p )\n{\n    vec2 i = floor( p );\n    vec2 f = fract( p );\n\t\n\tvec2 u = f*f*(3.0-2.0*f);\n\n    float n = mix( mix( dot( -1.0+2.0*hash( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ), \n                        dot( -1.0+2.0*hash( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),\n                   mix( dot( -1.0+2.0*hash( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ), \n                        dot( -1.0+2.0*hash( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);\n\treturn 0.5 + 0.5*n;\n}\n\nvoid main(){\n  \n    vec2 uv = gl_FragCoord.xy/u_resolution.xy;\n    float ratio = u_resolution.x / u_resolution.y;\n\n    vec2 tuv = uv;\n    tuv -= .5;\n    \n    //animation\n    float speed = u_time * 10. * u_animate_speed;\n    if(u_animate == false){\n      speed = 0.0;\n    }\n\n    // rotate with Noise\n    float degree = noise(vec2(speed/100.0, tuv.x*tuv.y));\n\n    tuv.y *= 1./ratio;\n    tuv *= Rot(radians((degree-.5)*720.+180.));\n\ttuv.y *= ratio;\n    \n    // Wave warp with sin\n    float frequency = 20. * u_frequency;\n    float amplitude = 30. * (10.*(0.01+u_blur));\n    \n    tuv.x += sin(tuv.y*frequency+speed)/amplitude;\n   \ttuv.y += sin(tuv.x*frequency*1.5+speed)/(amplitude*.5);\n    \n    \n    // draw the image\n    vec4 layer1 = mixOklab(u_colors[0], u_colors[1], S(-.3, .2, (tuv*Rot(radians(-5.))).x));\n    vec4 layer2 = mixOklab(u_colors[2], u_colors[3], S(-.3, .2, (tuv*Rot(radians(-5.))).x));\n    \n    vec4 finalComp = mixOklab(layer1, layer2, S(.5, -.3, tuv.y));\n    \n    \n    gl_FragColor = finalComp;\n    \n}",
                "vertex": "// Vertex shader\n\nvoid main() {\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}"
            },
            uuid: "c7be487e-9db0-4b59-bd7a-f0e39314bd37"
        },
        name: "Mesh",
        thumbnail: meshPng
    },
    {
        data: {
            value: "custom",
            label: "Stripe",
            options: {
                u_intensity: 0.242,
                u_colors: ["#9a36a8", "#3000ff"],
                u_speed: 0.318,
                u_scale: 0.632,
                u_noise: true,
                u_noise_color: "#ff0000",
                shader: "// Fragment shader\n\n// Uniforms\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform float u_time;\nuniform float u_intensity;\nuniform vec4 u_colors[2];\nuniform float u_speed;\nuniform float u_scale;\nuniform bool u_noise;\nuniform vec3 u_noise_color;\n\nvarying vec2 vUv;\nvarying float vDisplacement;\nvarying vec3 pos;\n\n#include \"lygia/generative/pnoise.glsl\";\n#include \"lygia/generative/random.glsl\";\n#include \"lygia/color/mixOklab.glsl\";\n\n\nvoid main() {\n  vec2 pixel = 1.0/u_resolution.xy;\n  vec2 st = gl_FragCoord.xy * pixel;\n    \n  float distort = vDisplacement * u_intensity;\n  vec2 val = abs(vUv - 0.5) * 3.0  * (1.0 - distort);\n  \n  vec4 color = vec4(vec3(val,u_colors[0].b),1.0);\n  color = mixOklab(u_colors[0], u_colors[1], vDisplacement);\n  \n  //float frequency = 100.0;\n  //float stripes = frequency * pos.y;\n  //float rounded = floor(stripes);\n  \n  if(u_noise == true){\n    \n    // animate noise with vUv/static with st\n    float noise = random(st*vDisplacement) * 0.5;\n    vec4 noiseColored = vec4(u_noise_color*noise,noise);\n    //color = mixOklab(color,noiseColored,0.1);\n    color += noiseColored;\n  }\n  \n  //if (mod(rounded, 4.0) == 0.0){\n  //  color -= 0.2;\n  //}\n  \n  gl_FragColor = color;\n}",
                vertex: "//Geometry: plane\n//OrbitControls: false\n//Geometry-args: [3,1,2048]\n//Mesh-scale: 1.5\n//Mesh-rotation: [-0.75,0.25,-0.25]\n//camera-position: [0.0, 0.0, 2.0]\n//shader-wireframe: false \n\nuniform float u_intensity;\nuniform float u_time;\nuniform float u_speed;\nuniform bool u_rotate;\nuniform float u_scale;\n\nvarying vec2 vUv;\nvarying float vDisplacement;\nvarying vec3 pos;\n\n#include \"lygia/generative/cnoise.glsl\";\n#include \"lygia/generative/gnoise.glsl\";\n#include \"lygia/generative/psrdnoise.glsl\";\n#include \"lygia/generative/worley.glsl\";\n#include \"lygia/generative/snoise.glsl\";\n#include \"lygia/generative/fbm.glsl\";\n\n\nvoid main() {\n  vUv = uv;\n  pos = position;\n  \n  vDisplacement = cnoise(position*(0.0 + 1.0/u_scale) + vec3(u_time*u_speed));\n  \n  float frequency = 4.0;\n  float stripes = frequency * position.y;\n  float rounded = floor(stripes);\n  \n  if (mod(rounded, 2.0) == 0.0){\n    vDisplacement *= 2.2;\n  }\n  \n  vec3 newPosition = position + normal * vDisplacement*u_intensity;\n  \n  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);\n  vec4 viewPosition = viewMatrix * modelPosition;\n  vec4 projectedPosition = projectionMatrix * viewPosition;\n\n  gl_Position = projectedPosition;\n  \n  //gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  \n}"
            },
            uuid: "4b262dcd-d75f-46f5-97aa-18909f1d10a3"
        },
        name: "Stripe",
        thumbnail: stripePng
    },
    {
        data: {
            value: "custom",
            label: "Rolling plane",
            uuid: "587dca6c-ec15-410f-a06a-7e63234ed999",
            options: {
                u_intensity: 0.062,
                u_colors: ["#9978ff", "#70ff00"],
                u_speed: 0.25,
                u_scale: 0.2,
                shader: `// Fragment shader

// Uniforms
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_intensity;
uniform vec4 u_colors[2];
uniform float u_speed;
uniform float u_scale;

varying vec2 vUv;
varying float vDisplacement;

#include "lygia/generative/pnoise.glsl";
#include "lygia/generative/random.glsl";
#include "lygia/color/mixOklab.glsl";
    
void main() {
  float distort = vDisplacement * u_intensity;
  vec2 val = abs(vUv - 0.5) * 3.0  * (1.0 - distort);
  
  vec4 color = vec4(vec3(val,u_colors[0].b),1.0);
  color = mixOklab(u_colors[0], u_colors[1], vDisplacement);
  
  
  gl_FragColor = color;
}`,
                vertex: `//Geometry: plane
//OrbitControls: false
//Geometry-args: [1,1, 1024, 1024]
//Mesh-scale: 26
//Mesh-rotation: [-0.8,0,0]
//camera-position: [0.0, 0.0, 2.0]
//camera-fov: 90
//camera-far: 2000
//camera-near: 0.01

uniform float u_intensity;
uniform float u_time;
uniform float u_speed;
uniform bool u_rotate;
uniform float u_scale;

varying vec2 vUv;
varying float vDisplacement;

#include "lygia/generative/cnoise.glsl";
#include "lygia/generative/gnoise.glsl";
#include "lygia/generative/psrdnoise.glsl";
#include "lygia/generative/worley.glsl";
#include "lygia/generative/snoise.glsl";
#include "lygia/generative/fbm.glsl";


void main() {
  vUv = uv;
  
  vDisplacement = fbm(position*(0.0 + 1.0/u_scale) + vec3(u_time*u_speed/4.));
  

  vec3 newPosition = position + normal * vDisplacement*u_intensity;
  
  float frequency = 400.0;
  float stripes = frequency * position.y;
  float rounded = floor(stripes);
  vDisplacement *= 3.2;
  
  
  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;  
}`
            }
        },
        name: "Rolling plane",
        thumbnail: planePng
    },
    {
        id: 64,
        created_at: "2023-04-07T16:59:04.82538+00:00",
        data: {
            value: "custom",
            label: "Spherical",
            options: {
                u_intensity: 0.764,
                u_speed: 0.056,
                u_colors: ["#002fff", "#20ff00"],
                u_noise: true,
                u_noise_color: "#ff0000",
                u_rotate: true,
                shader: `
// UNIFORMS
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_intensity;
uniform float u_speed;
uniform vec4 u_colors[2];
uniform bool u_noise;
uniform vec3 u_noise_color;
uniform bool u_rotate;
    
varying vec2 vUv;
varying float vDisplacement;

#include "lygia/generative/pnoise.glsl";
#include "lygia/generative/random.glsl";


void main() {
  float distort = vDisplacement * u_intensity;
  vec2 val = abs(vUv - 0.5) * 3.0  * (1.0 - distort);
  
  vec4 color = vec4(vec3(val,u_colors[0].b),1.0);
  color = mix(u_colors[0], u_colors[1], vDisplacement);
  
  
  if(u_noise == true){
    vec2 pixel = 1.0/u_resolution.xy;
    vec2 st = gl_FragCoord.xy * pixel;
    
    // animate noise with vUv/static with st
    float noise = random(st) * 0.15;
    vec4 noiseColored = vec4(u_noise_color*noise,noise);
    color += noiseColored;
  }
  
  gl_FragColor = color;
}`,
                vertex: `//Geometry: sphere
//Geometry-args: [4, 1024, 1024]
//OrbitControls: false  
//Mesh-position: [0, 0, 0]
//Mesh-rotation: [-1.5707963267948966, 0, -1.5]
//Mesh-scale: 5
//camera-position: [0.0, 0.0, 32.0]

uniform float u_intensity;
uniform float u_time;
uniform float u_speed;
uniform bool u_rotate;

varying vec2 vUv;
varying float vDisplacement;

#include "lygia/generative/cnoise.glsl";
#include "lygia/generative/gnoise.glsl";
#include "lygia/generative/psrdnoise.glsl";

mat4 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

mat3 rotAxis(vec3 axis, float a) {
  float s=sin(a);
  float c=cos(a);
  float oc=1.0-c;
  vec3 as=axis*s;
  mat3 p=mat3(axis.x*axis,axis.y*axis,axis.z*axis);
  mat3 q=mat3(c,-as.z,as.y,as.z,c,-as.x,-as.y,as.x,c);
  return p*oc+q;
}

vec3 rotateAxis(vec3 p, vec3 axis, float angle) {
  return mix(dot(axis, p)*axis, p, cos(angle)) + cross(axis,p)*sin(angle);
}

void main() {
  vUv = uv;

  vDisplacement = psrdnoise(position + vec3((u_speed*1.0)*u_time));

  vec3 newPosition = position + normal * vDisplacement*u_intensity;
  
  if(u_rotate == true){
    newPosition = rotateAxis(newPosition,vec3(0.,1.,0.5), u_time*u_speed*0.25);
  }
  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;
}`
            },
            uuid: "f0f2359e-351e-40fa-ab84-cf59a942bcb8",
        },
        name: "Spherical",
        thumbnail: spherePng
    },
    {
        data: {
            value: "custom",
            label: "Mountains",
            options: {
                u_intensity: 0.404,
                u_colors: ["#8181d2", "#ffffff"],
                u_speed: 0.029,
                u_scale: 0.334,
                shader: "// Fragment shader\n\n// Uniforms\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform float u_time;\nuniform float u_intensity;\nuniform vec4 u_colors[2];\nuniform float u_speed;\nuniform float u_scale;\n\nvarying vec2 vUv;\nvarying float vDisplacement;\n\n#include \"lygia/generative/pnoise.glsl\";\n#include \"lygia/generative/random.glsl\";\n    \nvoid main() {\n  float distort = vDisplacement * u_intensity;\n  vec2 val = abs(vUv - 0.5) * 3.0  * (1.0 - distort);\n  \n  vec4 color = vec4(vec3(val,u_colors[0].b),1.0);\n  color = mix(u_colors[0], u_colors[1], vDisplacement);\n  \n  \n  gl_FragColor = color;\n}",
                vertex: "//Geometry: plane\n//OrbitControls: false\n//Geometry-args: [1,1, 1024, 1024]\n//Mesh-scale: 50\n//camera-position: [0.0, 0.0, 24.0]\n\nuniform float u_intensity;\nuniform float u_time;\nuniform float u_speed;\nuniform bool u_rotate;\nuniform float u_scale;\n\nvarying vec2 vUv;\nvarying float vDisplacement;\n\n#include \"lygia/generative/cnoise.glsl\";\n#include \"lygia/generative/gnoise.glsl\";\n#include \"lygia/generative/psrdnoise.glsl\";\n#include \"lygia/generative/worley.glsl\";\n#include \"lygia/generative/snoise.glsl\";\n#include \"lygia/generative/fbm.glsl\";\n\n\nvoid main() {\n  vUv = uv;\n  \n  vDisplacement = fbm(position*(0.0 + 1.0/u_scale) + vec3(u_time*u_speed));\n  \n\n  vec3 newPosition = position + normal * vDisplacement*u_intensity;\n  \n  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);\n  vec4 viewPosition = viewMatrix * modelPosition;\n  vec4 projectedPosition = projectionMatrix * viewPosition;\n\n  gl_Position = projectedPosition;\n  \n  //gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n  \n}"
            },
            uuid: "6dc5ebb3-9b53-4801-864f-5fd36df8ccdd"
        },
        name: "Mountains",
        updated_at: "2023-04-05T16:28:46.959+00:00",
        thumbnail: mountainsPng
    },
    {
        data: {
            value: "custom",
            label: "Aura",
            options: {
                u_color: "#5000ff",
                u_background: "#000000",
                u_speed: 0.1,
                u_detail: 0.1,
                shader: `uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;
uniform vec4 u_background;
uniform float u_speed;
uniform float u_detail;

/*
* @author Hazsi (kinda)
*/
mat2 m(float a) {
    float c=cos(a), s=sin(a);
    return mat2(c,-s,s,c);
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float luma(vec4 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}


float map(vec3 p) {
    float t = u_time * u_speed;
    p.xz *= m(t * 0.4);p.xy*= m(t * 0.1);
    vec3 q = p * 2.0 + t;
    return length(p+vec3(sin((t*u_speed) * 0.1))) * log(length(p) + 0.9) + cos(q.x + sin(q.z + cos(q.y))) * 0.5 - 1.0;
}

void main() {
    vec2 a = gl_FragCoord.xy / u_resolution.x - vec2(0.5, 0.5);
    vec3 cl = vec3(0.0);
    float d = 2.5;

    for (float i = 0.; i <= (1. + 20. * u_detail); i++) {
        vec3 p = vec3(0, 0, 4.0) + normalize(vec3(a, -1.0)) * d;
        float rz = map(p);
        float f =  clamp((rz - map(p + 0.1)) * 0.5, -0.1, 1.0);
        vec3 l = vec3(0.1, 0.3, 0.4) + vec3(5.0, 2.5, 3.0) * f;
        cl = cl * l + smoothstep(2.5, 0.0, rz) * 0.6 * l;
        d += min(rz, 1.0);
    }
    
    vec4 color = vec4(min(u_color, cl),1.0);
    //color = min(u_background, u_color);
    color.r = max(u_background.r,color.r);
    color.g = max(u_background.g,color.g);
    color.b = max(u_background.b,color.b);
    

    gl_FragColor = color;
}`
            },
            uuid: "66ac8579-e118-4691-bbeb-893278fa87d5"
        },
        name: "Aura",
        thumbnail: auraPng
    },
    {
        name: "Clouds",
        thumbnail: cloudsPng,
        data: {
            "value": "custom",
            "label": "Clouds",
            "options": {
                "u_speed": 0.196,
                "u_scale": 0,
                "u_colors": ["#ffffff00", "#00000000"],
                "light": 0.5,
                "shadow": 0.5,
                "tint": 0.596,
                "coverage": 0.276,
                "alpha": 1,
                "shader": "#ifdef GL_ES\n  precision mediump float;\n#endif\n\n// UNIFORMS\nuniform vec2 u_resolution;\nuniform vec2 u_mouse;\nuniform vec4 u_colors[2];\nuniform float u_speed;\nuniform float u_time;\nuniform float u_scale; \nuniform float light;\nuniform float shadow;\nuniform float tint;\nuniform float coverage;\nuniform float alpha;\n    \nconst float cloudalpha = 20.;\nconst mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );\n\nvec2 hash( vec2 p ) {\n\tp = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));\n\treturn -1.0 + 2.0*fract(sin(p)*43758.5453123);\n}\n\nfloat noise( in vec2 p ) {\n    const float K1 = 0.366025404; // (sqrt(3)-1)/2;\n    const float K2 = 0.211324865; // (3-sqrt(3))/6;\n\tvec2 i = floor(p + (p.x+p.y)*K1);\t\n    vec2 a = p - i + (i.x+i.y)*K2;\n    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0); //vec2 of = 0.5 + 0.5*vec2(sign(a.x-a.y), sign(a.y-a.x));\n    vec2 b = a - o + K2;\n\tvec2 c = a - 1.0 + 2.0*K2;\n    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );\n\tvec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));\n    return dot(n, vec3(70.0));\t\n}\n\nfloat fbm(vec2 n) {\n\tfloat total = 0.0, amplitude = 0.1;\n\tfor (int i = 0; i < 7; i++) {\n\t\ttotal += noise(n) * amplitude;\n\t\tn = m * n;\n\t\tamplitude *= 0.4;\n\t}\n\treturn total;\n}\n\n// -----------------------------------------------\n\nvoid main( ) {\n    vec2 p = gl_FragCoord.xy / u_resolution.xy;\n\tvec2 uv = p*vec2(u_resolution.x/u_resolution.y,1.0);    \n\t  float speed = u_speed * 0.1;\n    float time = u_time * speed;\n    float scale = (1. - u_scale);\n    float q = fbm(uv * scale * 0.5);\n    \n    \n    \n    //ridged noise shape\n\tfloat r = 0.0;\n\tuv *= scale;\n    uv -= q - time;\n    float weight = 0.8;\n    for (int i=0; i<8; i++){\n\t\tr += abs(weight*noise( uv ));\n        uv = m*uv + time;\n\t\tweight *= 0.7;\n    }\n    \n    //noise shape\n\tfloat f = 0.0;\n    uv = p*vec2(u_resolution.x/u_resolution.y,1.0);\n\tuv *= scale;\n    uv -= q - time;\n    weight = 0.7;\n    for (int i=0; i<8; i++){\n\t\tf += weight*noise( uv );\n        uv = m*uv + time;\n\t\tweight *= 0.6;\n    }\n    \n    f *= r + f;\n    \n    //noise colour\n    float c = 0.0;\n    time = u_time * speed * 2.0;\n    uv = p*vec2(u_resolution.x/u_resolution.y,1.0);\n\tuv *= scale*2.0;\n    uv -= q - time;\n    weight = 0.4;\n    for (int i=0; i<7; i++){\n\t\tc += weight*noise( uv );\n        uv = m*uv + time;\n\t\tweight *= 0.6;\n    }\n    \n    //noise ridge colour\n    float c1 = 0.0;\n    time = u_time * speed * 3.0;\n    uv = p*vec2(u_resolution.x/u_resolution.y,1.0);\n\tuv *= scale*3.0;\n    uv -= q - time;\n    weight = 0.4;\n    for (int i=0; i<7; i++){\n\t\tc1 += abs(weight*noise( uv ));\n        uv = m*uv + time;\n\t\tweight *= 0.6;\n    }\n\t\n    c += c1;\n    \n    vec4 skycolour = mix(u_colors[1], u_colors[0], p.y);\n    vec4 cloudcolour = vec4(1.0, 1.0, 1.0,1.0) * clamp(((1.0-shadow) + light*c), 0.0, 1.0);\n   \n    f = coverage + cloudalpha*alpha*f*r;\n    \n    vec4 result = mix(skycolour, clamp(tint * skycolour + cloudcolour, 0.0, 1.0), clamp(f + c, 0.0, 1.0));\n    \n\t  gl_FragColor = result;\n\t\n}"
            },
            uuid: "6dc5ebb3-9b53-4801-864f-5fd36df8AABB"
        }
    }
]

export default featuredShaders