import { readFile } from 'node:fs/promises';
import {
  createDirectiveTransformer,
  type DirectiveTransformerOptions,
} from './transformer.js';

export function esbuild(options: DirectiveTransformerOptions) {
  return {
    name: 'directive-to-hof',
    async setup(build: any) {
      const fileFilter = /\.(c|m|d)?(j|t)sx?$/;
      const transformer = createDirectiveTransformer(options);

      build.onLoad({ filter: fileFilter }, async (args: any) => {
        const content = await readFile(args.path, 'utf-8');
        const transformed = await transformer(content, args.path);
        return transformed;
      });
    },
  };
}

export function rollup(options: DirectiveTransformerOptions) {
  const transformer = createDirectiveTransformer(options);

  return {
    name: 'directive-to-hof',
    async transform(code: string, id: string) {
      const result = await transformer(code, { path: id });

      return {
        code: result.contents,
        map: null,
      };
    },
  };
}

export { rollup as vite };

export * from './transformer.js';
