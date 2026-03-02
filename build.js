const fs = require('fs');
const path = require('path');
const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');
const CleanCSS = require('clean-css');

const SRC = path.join(__dirname, 'src');
const OUTPUT = path.join(__dirname, 'connectivity-check.html');

async function build() {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');

  const minCSS = new CleanCSS({ level: 2 }).minify(css).styles;
  const minJSResult = await minifyJS(js, { compress: true, mangle: true });
  const minJSCode = minJSResult.code;

  let combined = html
    .replace('/* __STYLES__ */', minCSS)
    .replace('/* __SCRIPT__ */', minJSCode);

  combined = await minifyHTML(combined, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: false,
    minifyJS: false,
  });

  // Append build hash if provided via env var
  const commitHash = process.env.COMMIT_SHA || '';
  if (commitHash) {
    combined += `\n<!-- build: ${commitHash} -->`;
  }

  fs.writeFileSync(OUTPUT, combined, 'utf8');

  const size = fs.statSync(OUTPUT).size;
  console.log(`Built ${OUTPUT} (${(size / 1024).toFixed(1)} KB)`);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
