const hmr = document.createElement("script");
hmr.src = "/modules/dice-pool-spender/@vite/client";
hmr.type = "module";
document.head.prepend(hmr);

const lib = document.createElement("script");
lib.src = "/modules/dice-pool-spender/src/module.js";
lib.type = "module";
document.head.appendChild(lib);
