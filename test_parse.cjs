const esbuild = require('esbuild');
try {
  esbuild.buildSync({
    entryPoints: ['src/App.tsx'],
    bundle: false,
    outfile: 'out.js',
  });
  console.log('Build succeeded');
} catch (e) {
  console.error(e.errors);
}
