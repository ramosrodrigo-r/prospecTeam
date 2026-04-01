import { Command } from 'commander'

export function parseArgs(argv) {
  const program = new Command()
  program
    .name('prospect')
    .description('ProspecTeam — bot de outreach via WhatsApp e email')
    .requiredOption('--city <city>', 'cidade para buscar negocios')
    .requiredOption('--category <category>', 'categoria de negocio')
    .addHelpText('after', '\nExemplo:\n  node bin/prospect.js --city "Campinas" --category "academia"')
    .exitOverride()

  program.parse(argv)
  const opts = program.opts()
  return { city: opts.city, category: opts.category }
}
