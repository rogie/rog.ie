var i=((e)=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(s,g)=>(typeof require<"u"?require:s)[g]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});/*!
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/var n,o,u;function t(){return typeof window<"u"&&typeof document<"u"&&typeof customElements<"u"}function r(){if(!t())return Promise.resolve();return n??=import("./fig.js").then(()=>{}),n}function f(){if(!t())return Promise.resolve();return o??=r().then(()=>import("./fig-editor.js")).then(()=>{}),o}function l(){if(!t())return Promise.resolve();return u??=r().then(()=>import("./fig-lab.js")).then(()=>{}),u}async function c(e={}){if(!t())return;await r(),await Promise.all([e.editor?f():null,e.lab?l():null])}export{r as registerFigUI,l as registerFigLab,f as registerFigEditor,c as register};
