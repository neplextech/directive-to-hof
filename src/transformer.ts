import * as parser from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';

// @ts-ignore
const traverse = _traverse.default || _traverse;
// @ts-ignore
const generate = _generate.default || _generate;

const generateRandomString = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

export interface DirectiveTransformerOptions {
  /**
   * The directive to look for in the code.
   */
  directive: string;
  /**
   * The path to the module to import from.
   */
  importPath: string;
  /**
   * The name of the import to use.
   */
  importName: string;
  /**
   * Whether to only allow async functions.
   */
  asyncOnly?: boolean;
}

/**
 * Creates a transformer that looks for a specific directive in the code and rewrites it accordingly by
 * wrapping the function in a call to the imported higher-order function.
 * @param options The options for the transformer.
 * @returns A function that takes the source code and arguments and returns the transformed code.
 */
export function createDirectiveTransformer(
  options: DirectiveTransformerOptions
) {
  const IMPORT_PATH = options.importPath;
  const DIRECTIVE = options.directive;
  const CACHE_IDENTIFIER = options.importName;
  const ASYNC_ONLY = options.asyncOnly ?? true;

  const transformer = async (source: string, args: any) => {
    const ast = parser.parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    let state = {
      needsImport: false,
      hasExistingImport: false,
      cacheIdentifierName: CACHE_IDENTIFIER,
      modifications: [],
    };

    // First pass: check for naming collisions and collect modifications
    traverse(ast, {
      Program: {
        enter(path: any) {
          const binding = path.scope.getBinding(CACHE_IDENTIFIER);
          if (binding) {
            state.cacheIdentifierName = `${CACHE_IDENTIFIER}_${generateRandomString()}`;
          }
        },
      },

      ImportDeclaration(path: any) {
        if (
          path.node.source.value === IMPORT_PATH &&
          path.node.specifiers.some(
            (spec: any) =>
              t.isImportSpecifier(spec) &&
              // @ts-ignore
              spec.imported.name === CACHE_IDENTIFIER
          )
        ) {
          state.hasExistingImport = true;
          if (state.cacheIdentifierName !== CACHE_IDENTIFIER) {
            // @ts-ignore
            state.modifications.push(() => {
              path.node.specifiers.forEach((spec: any) => {
                if (
                  t.isImportSpecifier(spec) &&
                  // @ts-ignore
                  spec.imported.name === CACHE_IDENTIFIER
                ) {
                  spec.local.name = state.cacheIdentifierName;
                }
              });
            });
          }
        }
      },

      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod'(
        path: any
      ) {
        const body = t.isBlockStatement(path.node.body) ? path.node.body : null;
        const hasUseCache = body?.directives?.some(
          (d: any) => d.value.value === DIRECTIVE
        );

        if (!hasUseCache && !t.isBlockStatement(path.node.body)) {
          const parentFunction = path.findParent(
            (p: any) =>
              (p.isFunction() || p.isProgram()) && 'directives' in p.node
          );
          if (
            !parentFunction?.node.directives?.some(
              (d: any) => d.value.value === DIRECTIVE
            )
          ) {
            return;
          }
        }

        if (hasUseCache || !t.isBlockStatement(path.node.body)) {
          // Check if the function is async
          if (ASYNC_ONLY && !path.node.async) {
            throw new Error(
              `"${DIRECTIVE}" directive may only be used in async functions at ${
                args.path
              }\n\n${path.toString()}\n^^^^${'-'.repeat(
                6
              )} This function must be async`
            );
          }

          state.needsImport = true;
          const isDeclaration = t.isFunctionDeclaration(path.node);
          const name = isDeclaration ? path.node.id?.name : undefined;

          // Create a new body without the 'use cache' directive
          const newBody = t.isBlockStatement(path.node.body)
            ? t.blockStatement(
                path.node.body.body,
                path.node.body.directives.filter(
                  (d: any) => d.value.value !== DIRECTIVE
                )
              )
            : path.node.body;

          const wrapped = t.callExpression(
            t.identifier(state.cacheIdentifierName),
            [
              t.arrowFunctionExpression(
                path.node.params,
                newBody,
                path.node.async
              ),
            ]
          );

          // @ts-ignore
          state.modifications.push(() => {
            if (t.isObjectMethod(path.node)) {
              path.replaceWith(
                t.objectProperty(t.identifier(path.node.key.name), wrapped)
              );
            } else if (name) {
              path.replaceWith(
                t.variableDeclaration('const', [
                  t.variableDeclarator(t.identifier(name), wrapped),
                ])
              );
            } else if (!t.isVariableDeclarator(path.parent)) {
              path.replaceWith(wrapped);
            } else {
              path.parent.init = wrapped;
            }
          });
        }
      },
    });

    // Apply all collected modifications
    if (state.modifications.length > 0) {
      // Add import if needed
      if (state.needsImport && !state.hasExistingImport) {
        ast.program.body.unshift(
          t.importDeclaration(
            [
              t.importSpecifier(
                t.identifier(state.cacheIdentifierName),
                t.identifier(CACHE_IDENTIFIER)
              ),
            ],
            t.stringLiteral(IMPORT_PATH)
          )
        );
      }

      // Apply collected modifications
      // @ts-ignore
      state.modifications.forEach((modify) => modify());
    }

    const { code } = generate(ast);

    return {
      contents: code,
      loader: args.path?.split('.').pop(),
    };
  };

  return transformer;
}
