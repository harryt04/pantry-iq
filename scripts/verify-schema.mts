import * as schema from '../db/schema/index.js'

console.log('✓ All schema modules imported successfully')
console.log('✓ Exported tables:')

const tables = Object.entries(schema)
tables.forEach(([name]) => {
  console.log(`  - ${name}`)
})

console.log(`\nTotal tables exported: ${tables.length}`)
console.log('✓ Schema verification complete')
