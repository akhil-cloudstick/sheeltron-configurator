# Correlation pipeline scripts

Two scripts that (re)generate everything in `Corelation/`. Paths resolve relative to
this folder, so just run them with Python 3 (no args, no config).

| Script | Reads | Writes |
|---|---|---|
| `build_corr.py` | the `*-stock-*.csv` exports in `../` + datasheets in `<repo>/Servers Data Sheet/` | `../cpus.csv`, `../chassis.csv`, `../ram.csv`, `../storage.csv`, `../socket_map.csv` |
| `build_viz.py` | the four catalog CSVs above | `../compatibility-explorer.html` |

## Usage

```bash
cd Configurator/Corelation/scripts
python build_corr.py     # regenerate the catalog/compatibility CSVs
python build_viz.py      # regenerate the visual explorer from those CSVs
```

Run `build_corr.py` after re-exporting stock from the backend into `../`
(the scripts pick the stock files by prefix, so the `-NNN` count suffix can change).
Then run `build_viz.py` to refresh the explorer. Review any new `needs_review=yes`
rows in the output.

`build_corr.py` prints a coverage summary (CPU/chassis/RAM/storage counts, socket
distribution, datasheet matches, and the rows needing manual review). Requires only
the Python standard library (no third-party packages).
