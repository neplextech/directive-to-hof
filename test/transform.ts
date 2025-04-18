import { createDirectiveTransformer } from '../src/index';
import { readFile, writeFile } from 'node:fs/promises';

const path = `${import.meta.dirname}/code.pre.js`;

const transformer = createDirectiveTransformer({
  directive: 'use once', // the directive to look for
  importPath: './use-once-function.js', // lib name/path to import the higher order function from
  importName: 'useOnce', // the higher order function name to import
  asyncOnly: false, // only allow async functions
});

const code = await readFile(path, 'utf-8');

const { contents } = await transformer(code, { path });

await writeFile('./code.post.js', `// Auto generated code\n${contents}`);
