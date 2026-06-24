import { readFileSync } from 'fs'

const content = readFileSync('src/app/(app)/escribiendo/page.tsx', 'utf8')
// Find TENSES
const match = content.match(/const TENSES = (\[[\s\S]*?\] as const)/)
if (match) {
    console.log("Found TENSES")
} else {
    console.log("Could not find TENSES")
}
