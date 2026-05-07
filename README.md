# Check My Data

Statistical forensics for tabular research data. Browser-based, no
account, no upload ¡X your data stays on your machine.

**[Try it now ¡÷](https://[username].github.io/check-my-data/)**

---

## What it is

Check My Data runs a battery of statistical tests for fabrication
signatures on tabular research datasets. It detects patterns that are
difficult or impossible to manufacture by hand ¡X terminal-digit
anomalies, value-frequency spikes, unusual variance structures, block
copying, near-duplication across conditions, Carlisle-style
over-balancing, and others.

The tool is aimed at:

- **Research integrity officers** evaluating data submitted as part
  of an investigation
- **Journal editors and peer reviewers** vetting datasets attached
  to manuscripts under review
- **Editorial-office staff** running first-pass checks on
  supplementary data
- **Forensic consultants** building cases that need statistical
  evidence
- **Researchers** sanity-checking their own datasets before
  submission, or evaluating data they've inherited

It runs entirely in your browser. The dataset is read locally,
analysed locally, and never leaves your machine. There is no
server-side processing, no analytics, no telemetry, and no account
system. Closing the tab clears all state.

## How to use it

1. Open the [tool URL](https://[username].github.io/check-my-data/)
2. Drop a CSV or Excel file into the import zone (or click to
   browse)
3. Confirm the column roles the tool inferred (which columns are
   measurements, which are condition labels, which are identifiers)
4. Click Run Analysis
5. Read the report

A report has three layers:

- **Summary** ¡X overall severity tier (0¡V3), with the headline
  finding
- **Forensics** ¡X the test battery, organised by what each test
  measures, with severity per test
- **Investigation** ¡X per-test detail, with the underlying evidence
  surfaced (excerpts of the data, what's anomalous, why)

Severity tiers describe how strong the multi-channel evidence is.
Severity 3 means convergent evidence across multiple independent
test families; severity 0 means clean. The tool is explicit about
its uncertainty ¡X every test reports its statistical evidence in
plain language with the underlying p-values surfaced.

## What it doesn't do

Check My Data is not a verdict tool. It surfaces statistical
patterns that warrant human investigation. A high severity tier
means the data shows fabrication signatures; it does not prove the
data was fabricated. Genuine biological, experimental, or
acquisition-pipeline phenomena can produce some of the same
signatures. Interpretation of findings requires domain expertise.

The tool also does not analyse:

- Image data (microscopy, gel images, etc.) ¡X different forensic
  domain, different tools
- Free-text qualitative data
- Data with fewer than ~30 rows per condition (statistical power
  is too low to make defensible claims)

## Methodology

The statistical methods are documented in
[METHODOLOGY.md](docs/shared/METHODOLOGY.md). A companion review
paper covering the methodology with case studies is in preparation.

## Privacy and data handling

The tool runs entirely client-side. Specifically:

- No fetch calls or network requests at runtime ¡X verified at
  source
- No analytics, error reporting, or telemetry
- No account system or identification
- No data persistence between sessions (closing the tab clears
  everything)

You can verify these claims by reading the source. The deployed
build is generated from the `main` branch via GitHub Actions; the
build artefact is the same code you can inspect.

## Running it locally

```bash
git clone https://github.com/[username]/check-my-data.git
cd check-my-data
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`. To produce a
production build, run `npm run build`; the output is in `dist/`.

## Status

Current release is a public beta. The tool is functionally complete
for v1.0 use cases; UI polish, additional test coverage, and an AI
screening mode are queued for v1.x. Bug reports and methodology
feedback are welcome via GitHub Issues.

## License

MIT. See [LICENSE](LICENSE).