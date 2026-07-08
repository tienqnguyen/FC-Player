const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('import * as cheerio')) {
  code = code.replace('import express from "express";', 'import express from "express";\nimport * as cheerio from "cheerio";');
}

code = code.replace("const cheerio = require('cheerio');", "");

fs.writeFileSync('server.ts', code);
