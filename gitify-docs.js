const mutiny = require('mutiny');
const gh = require('jsdoc-githubify');
const fs = require('fs');

mutiny(
  { outdir: './docs/', transform: [gh], rename: file => `${file}.gh` },
  { root: './docs/', fileFilter: 'module*.html' })
  .on('error', (error) => console.log('error', error))
  .on('data', (d) => fs.renameSync(d.outfile, d.file))
  // .on('end', overwriteFiles);

// overwriteFiles();
