export function managedLimaDiagnostics(): string {
  return [
    "echo 'Resources'",
    "printf 'CPUs: '; nproc",
    'free -h',
    'df -h /',
    'swapon --show',
    "echo 'Listening workflow ports'",
    "ss -ltnp | grep -E ':(3000|4200|5432|6379|65432)\\b' || true",
    "echo 'Recent kernel failures'",
    "dmesg | grep -Ei 'out of memory|oom-killer|killed process|segfault|fatal' | tail -80 || true",
  ].join('\n');
}
