# Research Paper Submission Checklist

This document details the automated readiness state and the remaining manual actions for formal publication and repository deposit.

---

## 1. Automated Artifact Preparation State

- [x] **Primary Research Paper (.md):** `docs/research/SAMREY_RESEARCH_PAPER.md` (Complete ~10,000-word academic text).
- [x] **LaTeX Source (.tex):** `docs/research/SAMREY_RESEARCH_PAPER.tex` (IEEEtran format).
- [x] **Printable PDF:** `docs/research/SAMREY_RESEARCH_PAPER.pdf`.
- [x] **Word Document (.docx):** `docs/research/SAMREY_RESEARCH_PAPER.docx`.
- [x] **Abstract & Keywords:** `docs/research/ABSTRACT.md`, `docs/research/KEYWORDS.md`.
- [x] **Verified Bibliography:** `docs/research/REFERENCES.md` (Real IEEE citations).
- [x] **10 Architectural Figures:** `docs/research/FIGURES/Figure[1-10]_*.svg` + `.md`.
- [x] **10 Empirical Tables:** `docs/research/TABLES/Table[1-10]_*.md`.
- [x] **Reproducibility Instructions:** `docs/research/REPRODUCIBILITY.md`.
- [x] **Evidence Map:** `docs/research/EVIDENCE_MAP.md`.
- [x] **Claims & Evidence Audit:** `docs/research/CLAIMS_AND_EVIDENCE.md`.
- [x] **Software Citation Metadata:** `CITATION.cff`, `codemeta.json`.

---

## 2. Platform-Specific Submission Guidelines

### 2.1 arXiv Submission (Computer Science: cs.SE / cs.PL)
- Target Directory: `docs/research/publication/arxiv/`
- Required Files:
  1. `SAMREY_RESEARCH_PAPER.tex`
  2. Figure SVGs/PDFs
  3. `references.bib`
- Action: Compress contents into `arxiv_submission.tar.gz` and upload to arXiv.org.

### 2.2 Zenodo Research Artifact Deposit
- Target Directory: `docs/research/publication/zenodo/`
- Required Files:
  1. `SAMREY_RESEARCH_PAPER.pdf`
  2. Source code snapshot (`samrey-v1.0.0-artifact.zip`)
  3. `zenodo.json` metadata
- Action: Upload archive to Zenodo to mint an immutable Digital Object Identifier (DOI).

### 2.3 ResearchGate / Institutional Repository
- Target Directory: `docs/research/publication/institutional/`
- Upload `SAMREY_RESEARCH_PAPER.pdf` with metadata from `docs/research/RESEARCH_METADATA.md`.

---

## 3. Very Small List of Remaining Manual Actions (Author Responsibility)

Because AI systems cannot legally act as human author agents or hold payment credentials, the user/author is responsible ONLY for the following final manual administrative steps:

1. **Author Identification:** Replace `[Author Name Placeholder]`, `[Affiliation Placeholder]`, `[Email Placeholder]`, and `[ORCID Placeholder]` in:
   - `docs/research/SAMREY_RESEARCH_PAPER.md`
   - `docs/research/SAMREY_RESEARCH_PAPER.tex`
   - `CITATION.cff`
   - `codemeta.json`
2. **Account Sign-In:** Log in to your respective accounts on arXiv, Zenodo, or conference submission portals (e.g. HotCRP / EasyChair).
3. **Terms Acceptance:** Review and accept the publisher's copyright terms (or select Creative Commons CC-BY 4.0 / Open Access).
4. **Payment (if applicable):** Provide payment details if submitting to an Open Access journal requiring an Article Processing Charge (APC).
5. **Final Click to Submit:** Upload the prepared submission package and click "Submit".
