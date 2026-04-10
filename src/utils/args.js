import { Command } from 'commander'

export function parseArgs(argv) {
  const program = new Command()
  program
    .name('prospect')
    .description('ProspecTeam — bot de outreach via WhatsApp')
    .option('--city <city>', 'cidade para buscar negocios', process.env.PROSPECT_CITY)
    .option('--category <category>', 'categoria de negocio', process.env.PROSPECT_CATEGORY)
    .addHelpText('after', '\nExemplo:\n  node bin/prospect.js --city "Campinas" --category "academia"\n  (ou defina PROSPECT_CITY e PROSPECT_CATEGORY no .env)')
    .exitOverride()

  program.parse(argv)
  const opts = program.opts()

  if (!opts.city) throw Object.assign(new Error('PROSPECT_CITY not set'), { code: 'commander.missingArgument' })
  if (!opts.category) throw Object.assign(new Error('PROSPECT_CATEGORY not set'), { code: 'commander.missingArgument' })

  return { city: opts.city, category: opts.category }
}
