import { type Plugin } from 'vitest/config';

export function trimSvg(): Plugin {
  return {
    name: 'minify-svg-whitespace',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const fileName in bundle) {
        if (fileName.endsWith('.svg') && bundle[fileName].type === 'asset') {
          const originalSource = bundle[fileName].source.toString();
          const minifiedSource = originalSource
            .replace(/>\s+</g, '><')
            .replace(/\s+/g, ' ')
            .trim();
          bundle[fileName].source = minifiedSource;
        }
      }
    },
  };
}
