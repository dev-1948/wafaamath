import{c as i,j as e,r as d}from"./index-wdJy3rg8.js";import{k as h}from"./katex-CIi3g1VH.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=i("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=i("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);function k({eyebrow:r,title:t,description:s,action:n}){return e.jsxs("div",{className:"workspace-page-header",children:[e.jsxs("div",{children:[r&&e.jsx("span",{className:"workspace-eyebrow",children:r}),e.jsx("h1",{children:t}),s&&e.jsx("p",{children:s})]}),n&&e.jsx("div",{className:"workspace-header-action",children:n})]})}const p=/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g;function u({value:r=""}){const t=d.useMemo(()=>String(r).split(p),[r]);return e.jsx("span",{className:"math-expression",children:t.map((s,n)=>{const a=s.startsWith("$$")&&s.endsWith("$$"),c=!a&&s.startsWith("$")&&s.endsWith("$");if(!a&&!c)return e.jsx("span",{children:s},n);const o=a?s.slice(2,-2):s.slice(1,-1),l=h.renderToString(o,{displayMode:a,throwOnError:!1,strict:"ignore"});return e.jsx("span",{className:a?"math-display":"math-inline",dir:"ltr",dangerouslySetInnerHTML:{__html:l}},n)})})}export{$ as A,j as C,u as M,k as W};
