import { readdir, readFile } from "node:fs/promises"
import { relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))
const sourceRoot = resolve(repositoryRoot, "src")

const sourceExtensionPattern = /\.[cm]?[jt]sx?$/
const muiImportPattern =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s*)["'](@(?:mui|emotion)\/[^"']+)["']/g

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return listSourceFiles(path)
      return sourceExtensionPattern.test(entry.name) ? [path] : []
    })
  )

  return files.flat()
}

function toRepositoryPath(path) {
  return relative(repositoryRoot, path).replaceAll("\\", "/")
}

function findDirectImports(source) {
  return Array.from(source.matchAll(muiImportPattern), (match) => ({
    line: source.slice(0, match.index).split(/\r?\n/).length,
    specifier: match[1],
  }))
}

const files = await listSourceFiles(sourceRoot)
const violations = []

for (const file of files) {
  const repositoryPath = toRepositoryPath(file)
  const source = await readFile(file, "utf8")
  const directImports = findDirectImports(source)

  if (directImports.length === 0) continue

  for (const directImport of directImports) {
    violations.push(
      `${repositoryPath}:${directImport.line} imports ${directImport.specifier}`
    )
  }
}

if (violations.length > 0) {
  console.error("Direct MUI/Emotion imports are not allowed in application source:")
  for (const violation of violations) {
    console.error(`  - ${violation}`)
  }
  process.exit(1)
}

console.log("MUI dependency check passed: 0 direct imports.")
