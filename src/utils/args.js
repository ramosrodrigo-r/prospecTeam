export function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--city' && i + 1 < argv.length) {
      args.city = argv[i + 1]
    } else if (argv[i] === '--category' && i + 1 < argv.length) {
      args.category = argv[i + 1]
    }
  }
  return args
}
