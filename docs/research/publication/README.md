# Samrey Research Publication Package

This directory contains submission bundles prepared for academic archives, preprint servers, and open-access repositories.

## Directory Structure

```
docs/research/publication/
├── arxiv/               # LaTeX (.tex), SVG figures, and BibTeX (.bib) for arXiv submission
├── zenodo/              # Pre-compiled PDF and metadata (zenodo.json) for DOI minting
├── researchgate/        # Standalone PDF for research profile sharing
└── institutional/       # PDF and DOCX for university / enterprise institutional repositories
```

## How to Submit

1. **For arXiv (cs.SE / cs.PL):**
   - Review authors and affiliations in `docs/research/publication/arxiv/SAMREY_RESEARCH_PAPER.tex`.
   - Compress the `arxiv/` folder into `arxiv_upload.tar.gz`.
   - Upload to [arXiv.org](https://arxiv.org/submit).

2. **For Zenodo (Open Science DOI):**
   - Log in to [Zenodo.org](https://zenodo.org/).
   - Upload `docs/research/publication/zenodo/SAMREY_RESEARCH_PAPER.pdf`.
   - Fill metadata using `zenodo.json`.
   - Publish to receive an immutable DOI.

3. **For Conferences & Journals (IEEE / ACM):**
   - Submit `docs/research/SAMREY_RESEARCH_PAPER.pdf` or compile `SAMREY_RESEARCH_PAPER.tex` using the conference's provided template style.
