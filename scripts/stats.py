#!/usr/bin/env python3
"""
Download stats for the 626Labs plugin ecosystem.

Queries the public npm registry API for download counts on every 626Labs
plugin, prints a combined report. Runs without credentials.

Usage:
    python scripts/stats.py
    python scripts/stats.py --json        # machine-readable JSON output
    python scripts/stats.py --period day  # last-day / last-week / last-month / last-year

API docs: https://github.com/npm/registry/blob/master/docs/download-counts.md
"""
import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime

# Force UTF-8 stdout on Windows so box-drawing chars and emoji render correctly
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# The 626Labs plugin ecosystem. Add new plugins here as they ship.
PACKAGES = [
    ("@esthernandez/vibe-cartographer", "🗺️  Vibe Cartographer"),
    ("@esthernandez/vibe-doc", "📖  Vibe Doc"),
]

DEFAULT_PERIOD = "last-week"
VALID_PERIODS = {"last-day", "last-week", "last-month", "last-year"}


def fetch_downloads(package: str, period: str) -> dict:
    """Call the npm registry download API. Returns empty dict on any failure."""
    # URL-encode the @ in scoped packages
    safe_package = package.replace("@", "%40").replace("/", "%2F") if package.startswith("@") else package
    url = f"https://api.npmjs.org/downloads/point/{period}/{safe_package}"
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"error": "package not found or no download history yet", "downloads": 0}
        return {"error": f"HTTP {e.code}", "downloads": 0}
    except Exception as e:
        return {"error": str(e), "downloads": 0}


def fetch_latest_version(package: str) -> str:
    """Fetch the latest published version from the npm registry."""
    safe_package = package.replace("/", "%2F") if package.startswith("@") else package
    url = f"https://registry.npmjs.org/{safe_package}/latest"
    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            return json.loads(response.read().decode("utf-8")).get("version", "unknown")
    except Exception:
        return "unknown"


def format_number(n: int) -> str:
    """Format an integer with thousands separators and emoji indicator."""
    if n == 0:
        return "0"
    if n < 100:
        return f"{n:,}"
    if n < 1000:
        return f"{n:,} 📈"
    return f"{n:,} 🚀"


def main() -> int:
    parser = argparse.ArgumentParser(description="626Labs plugin ecosystem download stats")
    parser.add_argument(
        "--period",
        default=DEFAULT_PERIOD,
        choices=sorted(VALID_PERIODS),
        help=f"Time window for download counts (default: {DEFAULT_PERIOD})",
    )
    parser.add_argument("--json", action="store_true", help="Machine-readable JSON output")
    args = parser.parse_args()

    results = []
    for package, display_name in PACKAGES:
        version = fetch_latest_version(package)
        stats = fetch_downloads(package, args.period)
        results.append({
            "package": package,
            "display_name": display_name,
            "version": version,
            "downloads": stats.get("downloads", 0),
            "start": stats.get("start"),
            "end": stats.get("end"),
            "error": stats.get("error"),
        })

    if args.json:
        print(json.dumps({
            "period": args.period,
            "fetched_at": datetime.now().isoformat(timespec="seconds"),
            "packages": results,
        }, indent=2))
        return 0

    # Human-readable report
    print()
    print("═══════════════════════════════════════════════════════════════")
    print(f"  626Labs Plugin Ecosystem · Downloads ({args.period.replace('-', ' ')})")
    print("═══════════════════════════════════════════════════════════════")
    print()

    total = 0
    for r in results:
        name = r["display_name"]
        version = r["version"]
        downloads = r["downloads"]
        total += downloads
        line = f"  {name}"
        print(f"{line:<32} v{version}")
        if r.get("error"):
            print(f"  ↳ {format_number(downloads)} downloads  ({r['error']})")
        else:
            print(f"  ↳ {format_number(downloads)} downloads")
        if r.get("start") and r.get("end"):
            print(f"  ↳ {r['start']} → {r['end']}")
        print(f"  ↳ https://www.npmjs.com/package/{r['package']}")
        print()

    print("─" * 63)
    print(f"  Ecosystem total: {format_number(total)} downloads")
    print(f"  Fetched: {datetime.now().strftime('%Y-%m-%d %H:%M %Z').strip()}")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
