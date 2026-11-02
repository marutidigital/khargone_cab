const fs = require('node:fs')
const ts = require('typescript')
const source = fs.readFileSync(`${process.cwd()}/scripts/send-test-whatsapp.ts`, 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 },
}).outputText
new Function('process', 'fetch', 'console', output)(process, fetch, console)
