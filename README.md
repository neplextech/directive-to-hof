!["no runtime magic"](https://img.shields.io/badge/runtime-magic--free-success?style=flat-square)
!["compiles like a boss"](https://img.shields.io/badge/compiles-like%20a%20boss-blueviolet?style=flat-square)
!["pragmas are code too"](https://img.shields.io/badge/%22use%20once%22-actually%20means%20something-yellow?style=flat-square)

# directive-to-hof

Transform directives into a higher order function.

# Installation

```sh
$ npm i directive-to-hof
```

# Features

- **No runtime magic**: The directive is transformed into a higher order function call.
- **Compiles like a boss**: The directive is transformed into a higher order function call at build time.
- **Pragmas are code too**: Treat directives as code. This means you can use them in any context where you would use a function call.

# Usage

## Vite/Rollup Plugin

```ts
import { vite as viteDirective } from 'directive-to-hof';

export default defineConfig({
  plugins: [
    viteDirective({
      directive: 'use once', // the directive to look for
      importPath: './use-once-function.js', // lib name/path to import the higher order function from
      importName: 'useOnce', // the higher order function name to import
      asyncOnly: false, // only allow async functions
    }),
  ],
});
```

> import `rollup` for rollup

## esbuild

```ts
import { esbuild } from 'directive-to-hof';

// plugins array
plugins: [
  esbuild({
    directive: 'use once', // the directive to look for
    importPath: './use-once-function.js', // lib name/path to import the higher order function from
    importName: 'useOnce', // the higher order function name to import
    asyncOnly: false, // only allow async functions
  }),
];
```

## API

```js
// use-once-function.js
export function useOnce(fn) {
  let result;

  return (...args) => {
    if (result !== undefined) return result;
    return (result = fn(...args));
  };
}
```

```ts
import { createDirectiveTransformer } from 'directive-to-hof';

const transformer = createDirectiveTransformer({
  directive: 'use once', // the directive to look for
  importPath: './use-once-function.js', // lib name/path to import the higher order function from
  importName: 'useOnce', // the higher order function name to import
  asyncOnly: false, // only allow async functions
});

const code = `
let count = 0;
function increment() {
  'use once';
  return ++count;
}
`;

const { contents } = await transformer(code, { path: import.meta.filename });

console.log(contents);
/*
import { useOnce } from "./use-once-function.js"
let count = 0;

const increment = useOnce(() => {
  return ++count;
});
*/
```
